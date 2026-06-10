import { useState, useEffect, useCallback } from 'react'
import {
  Activity, LogIn, RefreshCw, Search, X,
  MessageSquare, CheckCircle2, UserCheck, Send, MailOpen,
  ChevronLeft, ChevronRight, LogOut, KeyRound, ShieldAlert,
  AlertTriangle, CheckCircle,
} from 'lucide-react'
import { useActivityStore } from '../stores/activityStore'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { fmtDateTime, timeAgo } from '../utils/ticketUtils'

const TABS = [
  { id: 'login',    label: 'Login History',       icon: LogIn },
  { id: 'activity', label: 'Modification History', icon: Activity },
]

const ROLE_COLOR = {
  admin:      'bg-rose-500/15 text-rose-500 border-rose-500/30',
  technician: 'bg-violet-500/15 text-violet-500 border-violet-500/30',
  supervisor: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  user:       'bg-slate-500/10 text-slate-400 border-slate-500/25',
}

const ACTION_META = {
  comment:   { label: 'Comment',     color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/25',   Icon: MessageSquare },
  assign:    { label: 'Assigned',    color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/25',   Icon: UserCheck },
  status:    { label: 'Status',      color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/25',     Icon: Activity },
  resolved:  { label: 'Resolved',    color: 'text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/25', Icon: CheckCircle2 },
  created:   { label: 'Created',     color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/25',       Icon: Activity },
  email_out: { label: 'Email Sent',  color: 'text-sky-400',    bg: 'bg-sky-500/10 border-sky-500/25',         Icon: Send },
  email_in:  { label: 'Email Recv',  color: 'text-teal-400',   bg: 'bg-teal-500/10 border-teal-500/25',       Icon: MailOpen },
}

function sessionDuration(loginAt, logoutAt) {
  const ms = (logoutAt ? new Date(logoutAt) : new Date()).getTime() - new Date(loginAt).getTime()
  const totalSecs = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-glass">
      <span className="text-[11px] t-muted">Page {page} of {pages}</span>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 t-muted"
        >
          <ChevronLeft size={14} />
        </button>
        {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
          const p = i + 1
          return (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${
                p === page
                  ? 'bg-indigo-600 text-white'
                  : 't-muted hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {p}
            </button>
          )
        })}
        <button
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 t-muted"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

const inputCls = 'glass-input text-sm h-8 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500/50'

export default function ActivityLog() {
  const [activeTab, setActiveTab] = useState('login')

  // ── Login filter state ─────────────────────────────────────────────────
  const [loginSearch, setLoginSearch]     = useState('')
  const [loginRole, setLoginRole]         = useState('')
  const [loginActiveOnly, setLoginActiveOnly] = useState(false)
  const [loginPage, setLoginPage]         = useState(1)

  // ── Modification filter state ──────────────────────────────────────────
  const [modSearch, setModSearch]         = useState('')
  const [modAction, setModAction]         = useState('')
  const [modAgent, setModAgent]           = useState('')
  const [modPage, setModPage]             = useState(1)

  // ── Session action state ───────────────────────────────────────────────
  const [confirmAction, setConfirmAction] = useState(null) // { type:'kill'|'reset', sess }
  const [actionBusy, setActionBusy]       = useState(null) // session id being acted on
  const [actionFeedback, setActionFeedback] = useState(null) // { ok, msg }

  const {
    loginHistory, loginTotal, loginLoading, loginError, loginFromLocal,
    modifications, modTotal, modLoading, modError,
    agentSummary,
    fetchLoginHistory, fetchModifications, fetchAgentSummary,
    revokeSession, forcePasswordReset,
    purgeStale,
  } = useActivityStore()

  // ── Derived pages ──────────────────────────────────────────────────────
  const loginPages = Math.ceil(loginTotal / 50) || 1
  const modPages   = Math.ceil(modTotal   / 50) || 1

  // ── Session security actions ───────────────────────────────────────────
  const showFeedback = (ok, msg) => {
    setActionFeedback({ ok, msg })
    setTimeout(() => setActionFeedback(null), 4000)
  }

  const executeAction = async () => {
    if (!confirmAction) return
    const { type, sess } = confirmAction
    setConfirmAction(null)
    setActionBusy(sess.id)
    try {
      if (type === 'kill') {
        await revokeSession(sess.id)
        showFeedback(true, `Session for ${sess.user_name || 'user'} has been terminated.`)
        loadLogins()
      } else {
        const uid = sess.user_id || sess.userId || sess.id
        await forcePasswordReset(uid)
        showFeedback(true, `Password reset forced for ${sess.user_name || 'user'}. They must change it on next login.`)
      }
    } catch (e) {
      showFeedback(false, e.message || 'Action failed — check if the backend supports this endpoint.')
    } finally {
      setActionBusy(null)
    }
  }

  // ── Fetch helpers ──────────────────────────────────────────────────────
  const loadLogins = useCallback(() => {
    fetchLoginHistory({
      page: loginPage,
      pageSize: 50,
      search: loginSearch,
      role: loginRole,
      activeOnly: loginActiveOnly,
    })
  }, [fetchLoginHistory, loginPage, loginSearch, loginRole, loginActiveOnly])

  const loadMods = useCallback(() => {
    fetchModifications({
      page: modPage,
      pageSize: 50,
      search: modSearch,
      action: modAction,
      agentName: modAgent,
    })
  }, [fetchModifications, modPage, modSearch, modAction, modAgent])

  // Initial load + re-fetch on filter/page change
  useEffect(() => {
    purgeStale()
    if (activeTab === 'login') {
      loadLogins()
    }
  }, [activeTab, loadLogins, purgeStale])

  useEffect(() => {
    if (activeTab === 'activity') {
      loadMods()
      fetchAgentSummary()
    }
  }, [activeTab, loadMods, fetchAgentSummary])

  const switchTab = (id) => {
    setActiveTab(id)
    setLoginSearch(''); setLoginRole(''); setLoginActiveOnly(false); setLoginPage(1)
    setModSearch('');   setModAction('');  setModAgent('');           setModPage(1)
  }

  // ── Stats ──────────────────────────────────────────────────────────────
  const activeCount = loginHistory.filter(s => s.is_active).length
  const todayCount  = loginHistory.filter(s =>
    new Date(s.logged_in_at).toDateString() === new Date().toDateString()
  ).length

  // Unique agents for modifier dropdown
  const uniqueAgents = [...new Set(modifications.map(m => m.author_name).filter(Boolean))].sort()

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold t-main">Activity Log</h1>
          <p className="text-sm t-muted mt-0.5">Login sessions and ticket modification history</p>
        </div>
        <Button
          variant="ghost" size="sm"
          onClick={activeTab === 'login' ? loadLogins : loadMods}
          disabled={activeTab === 'login' ? loginLoading : modLoading}
        >
          <RefreshCw size={14} className={(loginLoading || modLoading) ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {/* Global action feedback */}
      {actionFeedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-xs font-medium ${
          actionFeedback.ok
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
            : 'border-red-500/30 bg-red-500/10 text-red-400'
        }`}>
          {actionFeedback.ok ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
          {actionFeedback.msg}
        </div>
      )}

      {/* Confirm dialog */}
      {confirmAction && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-red-500/40 bg-red-500/10">
          <div className="flex items-center gap-2 text-xs text-red-400">
            <ShieldAlert size={14} />
            {confirmAction.type === 'kill'
              ? `Force sign out "${confirmAction.sess.user_name || 'this user'}"? Their session will end immediately.`
              : `Force password reset for "${confirmAction.sess.user_name || 'this user'}"? They must change it on next login.`}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={executeAction}
              className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmAction(null)}
              className="px-3 py-1 rounded-lg text-xs font-semibold border border-glass t-muted hover:t-main transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex border-b border-glass">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => switchTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              activeTab === id
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent t-muted hover:t-main'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ══ LOGIN HISTORY ══════════════════════════════════════════════════════ */}
      {activeTab === 'login' && (
        <div className="space-y-4">

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Sessions',   value: loginTotal,  color: 'text-indigo-400' },
              { label: 'Active Now',        value: activeCount, color: 'text-emerald-400' },
              { label: 'Today',             value: todayCount,  color: 'text-amber-400' },
            ].map(s => (
              <Card key={s.label}>
                <div className="text-[10px] font-bold t-sub uppercase tracking-wider mb-1">{s.label}</div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 t-muted" />
              <input
                className={`${inputCls} pl-7 w-52`}
                placeholder="Search user, IP…"
                value={loginSearch}
                onChange={e => { setLoginSearch(e.target.value); setLoginPage(1) }}
              />
              {loginSearch && (
                <button onClick={() => { setLoginSearch(''); setLoginPage(1) }} className="absolute right-2 top-1/2 -translate-y-1/2 t-muted hover:t-main">
                  <X size={11} />
                </button>
              )}
            </div>
            <select
              className={`${inputCls} w-36`}
              value={loginRole}
              onChange={e => { setLoginRole(e.target.value); setLoginPage(1) }}
            >
              <option value="">All Roles</option>
              {['admin','technician','supervisor','user'].map(r => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-xs t-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={loginActiveOnly}
                onChange={e => { setLoginActiveOnly(e.target.checked); setLoginPage(1) }}
                className="rounded"
              />
              Active only
            </label>
            <Button variant="ghost" size="sm" onClick={loadLogins} disabled={loginLoading}>
              <Search size={12} /> Apply
            </Button>
          </div>

          {/* Notices — only show red error when fallback has no data either */}
          {loginError && loginHistory.length === 0 && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs">
              <span className="font-semibold shrink-0">Server unavailable:</span>
              <span>{loginError}</span>
            </div>
          )}
          {loginFromLocal && loginHistory.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs">
              <AlertTriangle size={12} />
              Showing this browser's sessions only — server history endpoint not yet available.
            </div>
          )}

          {/* Table */}
          <Card>
            {loginLoading ? (
              <div className="flex items-center justify-center py-16 gap-3 t-muted">
                <RefreshCw size={20} className="animate-spin" />
                <span className="text-sm">Loading login history…</span>
              </div>
            ) : loginHistory.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-3 t-muted">
                <LogIn size={36} className="opacity-25" />
                <p className="text-sm">
                  {loginError
                    ? 'Could not reach server. No local sessions found either.'
                    : loginTotal === 0
                      ? 'No login sessions recorded yet. Sessions are recorded on next login.'
                      : 'No sessions match your filters.'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--c-border)' }}>
                        {['User', 'Role', 'Browser', 'OS', 'IP Address', 'Login Time', 'Logout Time', 'Duration', 'Status', 'Actions'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold t-sub uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loginHistory.map(sess => (
                        <tr key={sess.id} className="border-b transition-colors hover:bg-black/3 dark:hover:bg-white/3" style={{ borderColor: 'var(--c-border)' }}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                                {(sess.user_name || '?').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-xs font-semibold t-main">{sess.user_name || '—'}</div>
                                {sess.user_email && <div className="text-[10px] t-muted">{sess.user_email}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${ROLE_COLOR[sess.user_role] || ROLE_COLOR.user}`}>
                              {sess.user_role || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs t-main whitespace-nowrap">{sess.browser || '—'}</td>
                          <td className="px-4 py-3 text-xs t-main whitespace-nowrap">{sess.os || '—'}</td>
                          <td className="px-4 py-3 font-mono text-xs t-muted whitespace-nowrap">{sess.ip_address || '—'}</td>
                          <td className="px-4 py-3 text-xs t-muted whitespace-nowrap">
                            <div>{fmtDateTime(sess.logged_in_at)}</div>
                            <div className="text-[10px] t-sub">{timeAgo(sess.logged_in_at)}</div>
                          </td>
                          <td className="px-4 py-3 text-xs t-muted whitespace-nowrap">
                            {sess.logged_out_at ? fmtDateTime(sess.logged_out_at) : <span className="opacity-40">—</span>}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs t-muted whitespace-nowrap">
                            {sessionDuration(sess.logged_in_at, sess.logged_out_at)}
                          </td>
                          <td className="px-4 py-3">
                            {sess.is_active
                              ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/25">
                                  Ended
                                </span>
                              )
                            }
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {sess.is_active && (
                                <button
                                  title="Force sign out this session immediately"
                                  disabled={actionBusy === sess.id}
                                  onClick={() => setConfirmAction({ type: 'kill', sess })}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/25 hover:bg-red-500/20 disabled:opacity-40 transition-colors whitespace-nowrap"
                                >
                                  {actionBusy === sess.id
                                    ? <RefreshCw size={9} className="animate-spin" />
                                    : <LogOut size={9} />}
                                  Kill Session
                                </button>
                              )}
                              <button
                                title="Force this user to reset their password on next login"
                                disabled={actionBusy === sess.id}
                                onClick={() => setConfirmAction({ type: 'reset', sess })}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/25 hover:bg-orange-500/20 disabled:opacity-40 transition-colors whitespace-nowrap"
                              >
                                <KeyRound size={9} />
                                Reset PW
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={loginPage} pages={loginPages} onPage={p => { setLoginPage(p); fetchLoginHistory({ page: p, pageSize: 50, search: loginSearch, role: loginRole, activeOnly: loginActiveOnly }) }} />
                <div className="px-4 py-2 text-[11px] t-muted">{loginTotal} total session{loginTotal !== 1 ? 's' : ''}</div>
              </>
            )}
          </Card>
        </div>
      )}

      {/* ══ MODIFICATION HISTORY ══════════════════════════════════════════════ */}
      {activeTab === 'activity' && (
        <div className="space-y-4">

          {/* Agent summary cards */}
          {agentSummary.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {agentSummary.slice(0, 8).map(a => (
                <Card key={a.agent_id}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {(a.agent_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="text-xs font-bold t-main truncate">{a.agent_name}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-center">
                    <div>
                      <div className="text-lg font-bold text-indigo-400">{a.total}</div>
                      <div className="text-[9px] t-muted uppercase tracking-wider">Actions</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-emerald-400">{a.resolved}</div>
                      <div className="text-[9px] t-muted uppercase tracking-wider">Resolved</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-violet-400">{a.comments}</div>
                      <div className="text-[9px] t-muted uppercase tracking-wider">Comments</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 t-muted" />
              <input
                className={`${inputCls} pl-7 w-52`}
                placeholder="Search agent, ticket…"
                value={modSearch}
                onChange={e => { setModSearch(e.target.value); setModPage(1) }}
              />
              {modSearch && (
                <button onClick={() => { setModSearch(''); setModPage(1) }} className="absolute right-2 top-1/2 -translate-y-1/2 t-muted hover:t-main">
                  <X size={11} />
                </button>
              )}
            </div>
            <select
              className={`${inputCls} w-40`}
              value={modAgent}
              onChange={e => { setModAgent(e.target.value); setModPage(1) }}
            >
              <option value="">All Agents</option>
              {uniqueAgents.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select
              className={`${inputCls} w-36`}
              value={modAction}
              onChange={e => { setModAction(e.target.value); setModPage(1) }}
            >
              <option value="">All Actions</option>
              {Object.entries(ACTION_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <Button variant="ghost" size="sm" onClick={loadMods} disabled={modLoading}>
              <Search size={12} /> Apply
            </Button>
          </div>

          {/* Error notice */}
          {modError && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs">
              <span className="font-semibold shrink-0">API Error:</span>
              <span>{modError}</span>
            </div>
          )}

          {/* Table */}
          <Card>
            {modLoading ? (
              <div className="flex items-center justify-center py-16 gap-3 t-muted">
                <RefreshCw size={20} className="animate-spin" />
                <span className="text-sm">Loading modification history…</span>
              </div>
            ) : modifications.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-3 t-muted">
                <Activity size={36} className="opacity-25" />
                <p className="text-sm">
                  {modError
                    ? 'Could not reach server — check API error above.'
                    : modTotal === 0
                      ? 'No modification history found.'
                      : 'No activity matches your filters.'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--c-border)' }}>
                        {['Agent', 'Action', 'Ticket', 'Details', 'Time'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold t-sub uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {modifications.map(act => {
                        const meta = ACTION_META[act.action] || { label: act.action, color: 't-muted', bg: 'bg-slate-500/10 border-slate-500/25', Icon: Activity }
                        const MetaIcon = meta.Icon
                        return (
                          <tr key={act.id} className="border-b transition-colors hover:bg-black/3 dark:hover:bg-white/3" style={{ borderColor: 'var(--c-border)' }}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                                  {(act.author_name || '?').charAt(0).toUpperCase()}
                                </div>
                                <span className="text-xs font-medium t-main whitespace-nowrap">{act.author_name || 'System'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.bg} ${meta.color}`}>
                                <MetaIcon size={10} /> {meta.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="font-mono text-xs text-indigo-400 font-semibold">{act.ticket_id}</div>
                              <div className="text-[10px] t-muted truncate max-w-[180px]">{act.ticket_subject}</div>
                            </td>
                            <td className="px-4 py-3 max-w-xs">
                              <span className="text-xs t-muted line-clamp-1">{act.text || <span className="opacity-40">—</span>}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-xs t-muted">{timeAgo(act.ts)}</div>
                              <div className="text-[10px] t-sub">{fmtDateTime(act.ts)}</div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination page={modPage} pages={modPages} onPage={p => { setModPage(p); fetchModifications({ page: p, pageSize: 50, search: modSearch, action: modAction, agentName: modAgent }) }} />
                <div className="px-4 py-2 text-[11px] t-muted">{modTotal} total action{modTotal !== 1 ? 's' : ''}</div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
