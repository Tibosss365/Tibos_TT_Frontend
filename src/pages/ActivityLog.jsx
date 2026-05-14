import { useState, useMemo, useEffect } from 'react'
import {
  Activity, LogIn, RefreshCw, Search, X,
  MessageSquare, CheckCircle2, UserCheck, Send, MailOpen,
} from 'lucide-react'
import { useActivityStore } from '../stores/activityStore'
import { useTicketStore } from '../stores/ticketStore'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { fmtDateTime, timeAgo } from '../utils/ticketUtils'

const TABS = [
  { id: 'login',    label: 'Login History',      icon: LogIn },
  { id: 'activity', label: 'Modification History', icon: Activity },
]

const ROLE_COLOR = {
  admin:      'bg-rose-500/15 text-rose-500 border-rose-500/30',
  technician: 'bg-violet-500/15 text-violet-500 border-violet-500/30',
  supervisor: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  user:       'bg-slate-500/10 text-slate-400 border-slate-500/25',
}

const ACTION_META = {
  comment:   { label: 'Comment',    color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/25',  Icon: MessageSquare },
  assign:    { label: 'Assigned',   color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/25',  Icon: UserCheck },
  status:    { label: 'Status',     color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/25',    Icon: Activity },
  resolved:  { label: 'Resolved',   color: 'text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/25',Icon: CheckCircle2 },
  created:   { label: 'Created',    color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/25',      Icon: Activity },
  email_out: { label: 'Email Sent', color: 'text-sky-400',    bg: 'bg-sky-500/10 border-sky-500/25',        Icon: Send },
  email_in:  { label: 'Email Recv', color: 'text-teal-400',   bg: 'bg-teal-500/10 border-teal-500/25',      Icon: MailOpen },
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

const inputCls = 'glass-input text-sm h-8 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500/50'

export default function ActivityLog() {
  const [activeTab, setActiveTab] = useState('login')
  const [search, setSearch]       = useState('')
  const [roleFilter, setRoleFilter]     = useState('')
  const [agentFilter, setAgentFilter]   = useState('')
  const [actionFilter, setActionFilter] = useState('')

  const { sessions, purgeStale }            = useActivityStore()
  const { tickets, fetchTickets, loading }  = useTicketStore()

  useEffect(() => {
    if (activeTab === 'activity' && tickets.length === 0) {
      fetchTickets()
    }
  }, [activeTab, tickets.length, fetchTickets])

  useEffect(() => { purgeStale() }, []) // eslint-disable-line

  // ── Login History ─────────────────────────────────────────────────────────
  const filteredSessions = useMemo(() => {
    let s = [...sessions]
    if (roleFilter) s = s.filter(sess => sess.userRole === roleFilter)
    if (search) {
      const q = search.toLowerCase()
      s = s.filter(sess =>
        (sess.userName || '').toLowerCase().includes(q) ||
        (sess.email    || '').toLowerCase().includes(q) ||
        (sess.ip       || '').includes(q) ||
        (sess.browser  || '').toLowerCase().includes(q)
      )
    }
    return s
  }, [sessions, search, roleFilter])

  const loginStats = useMemo(() => ({
    total:  sessions.length,
    active: sessions.filter(s => s.active).length,
    today:  sessions.filter(s =>
      new Date(s.loginAt).toDateString() === new Date().toDateString()
    ).length,
  }), [sessions])

  // ── Agent Activity (derived from ticket timelines) ────────────────────────
  const agentActions = useMemo(() => {
    const actions = []
    tickets.forEach(ticket => {
      ;(ticket.timeline || []).forEach(ev => {
        if (!ev.author) return
        actions.push({
          id: `${ticket._uuid}-${ev.ts}-${ev.type}`,
          agentName:     ev.author,
          ticketId:      ticket.id,
          ticketSubject: ticket.subject,
          action:        ev.type,
          text:          (ev.text || '').replace(/<[^>]+>/g, '').slice(0, 150),
          ts:            ev.ts,
        })
      })
    })
    return actions.sort((a, b) => new Date(b.ts) - new Date(a.ts))
  }, [tickets])

  const filteredActions = useMemo(() => {
    let a = [...agentActions]
    if (agentFilter)  a = a.filter(act => act.agentName === agentFilter)
    if (actionFilter) a = a.filter(act => act.action === actionFilter)
    if (search) {
      const q = search.toLowerCase()
      a = a.filter(act =>
        (act.agentName     || '').toLowerCase().includes(q) ||
        (act.ticketId      || '').toLowerCase().includes(q) ||
        (act.ticketSubject || '').toLowerCase().includes(q)
      )
    }
    return a
  }, [agentActions, agentFilter, actionFilter, search])

  const uniqueAgents = [...new Set(agentActions.map(a => a.agentName))].filter(Boolean).sort()

  const agentStats = useMemo(() => {
    const map = {}
    agentActions.forEach(act => {
      if (!map[act.agentName]) map[act.agentName] = { name: act.agentName, total: 0, comments: 0, resolved: 0, assigned: 0 }
      map[act.agentName].total++
      if (act.action === 'comment')  map[act.agentName].comments++
      if (act.action === 'resolved') map[act.agentName].resolved++
      if (act.action === 'assign')   map[act.agentName].assigned++
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [agentActions])

  const switchTab = (id) => {
    setActiveTab(id)
    setSearch(''); setRoleFilter(''); setAgentFilter(''); setActionFilter('')
  }

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold t-main">Activity Log</h1>
          <p className="text-sm t-muted mt-0.5">Login sessions and ticket modification history</p>
        </div>
        {activeTab === 'activity' && (
          <Button variant="ghost" size="sm" onClick={() => fetchTickets()} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </Button>
        )}
      </div>

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

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Sessions', value: loginStats.total,  color: 'text-indigo-400' },
              { label: 'Active Now',     value: loginStats.active, color: 'text-emerald-400' },
              { label: 'Today',          value: loginStats.today,  color: 'text-amber-400' },
            ].map(s => (
              <Card key={s.label}>
                <div className="text-[10px] font-bold t-sub uppercase tracking-wider mb-1">{s.label}</div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 t-muted" />
              <input
                className={`${inputCls} pl-7 w-52`}
                placeholder="Search user, browser, IP…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 t-muted hover:t-main">
                  <X size={11} />
                </button>
              )}
            </div>
            <select className={`${inputCls} w-36`} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="">All Roles</option>
              {['admin','technician','supervisor','user'].map(r => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <Card>
            {filteredSessions.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-3 t-muted">
                <LogIn size={36} className="opacity-25" />
                <p className="text-sm">
                  {sessions.length === 0
                    ? 'No login sessions recorded yet.'
                    : 'No sessions match your filters.'}
                </p>
                {sessions.length === 0 && (
                  <p className="text-xs opacity-60">Sessions will appear after the next login.</p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--c-border)' }}>
                      {['User', 'Role', 'Browser', 'OS', 'IP Address', 'Login Time', 'Logout Time', 'Duration', 'Status'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold t-sub uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map(sess => (
                      <tr key={sess.id} className="border-b transition-colors hover:bg-black/3 dark:hover:bg-white/3" style={{ borderColor: 'var(--c-border)' }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                              {(sess.userName || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-semibold t-main">{sess.userName}</div>
                              {sess.email && <div className="text-[10px] t-muted">{sess.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${ROLE_COLOR[sess.userRole] || ROLE_COLOR.user}`}>
                            {sess.userRole}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs t-main whitespace-nowrap">{sess.browser || '—'}</td>
                        <td className="px-4 py-3 text-xs t-main whitespace-nowrap">{sess.os || '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs t-muted whitespace-nowrap">{sess.ip || '—'}</td>
                        <td className="px-4 py-3 text-xs t-muted whitespace-nowrap">
                          <div>{fmtDateTime(sess.loginAt)}</div>
                          <div className="text-[10px] t-sub">{timeAgo(sess.loginAt)}</div>
                        </td>
                        <td className="px-4 py-3 text-xs t-muted whitespace-nowrap">
                          {sess.logoutAt ? fmtDateTime(sess.logoutAt) : <span className="opacity-40">—</span>}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs t-muted whitespace-nowrap">
                          {sessionDuration(sess.loginAt, sess.logoutAt)}
                        </td>
                        <td className="px-4 py-3">
                          {sess.active
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
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-2 border-t border-glass text-[11px] t-muted">
                  {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''} shown
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ══ AGENT ACTIVITY ════════════════════════════════════════════════════ */}
      {activeTab === 'activity' && (
        <div className="space-y-4">

          {/* Agent summary cards */}
          {agentStats.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {agentStats.slice(0, 8).map(a => (
                <Card key={a.name}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {a.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-xs font-bold t-main truncate">{a.name}</div>
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

          {/* Filters and view mode */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-3 flex-wrap">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 t-muted" />
                <input
                  className={`${inputCls} pl-7 w-52`}
                  placeholder="Search agent, ticket ID…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 t-muted hover:t-main">
                    <X size={11} />
                  </button>
                )}
              </div>
              <select className={`${inputCls} w-40`} value={agentFilter} onChange={e => setAgentFilter(e.target.value)}>
                <option value="">All Agents</option>
                {uniqueAgents.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <select className={`${inputCls} w-36`} value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
                <option value="">All Actions</option>
                {Object.entries(ACTION_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <Card>
            {filteredActions.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-3 t-muted">
                <Activity size={36} className="opacity-25" />
                <p className="text-sm">
                  {agentActions.length === 0
                    ? 'No ticket modification history found. Click Refresh to load ticket data.'
                    : 'No activity matches your filters.'}
                </p>
              </div>
            ) : (
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
                    {filteredActions.map(act => {
                      const meta = ACTION_META[act.action] || { label: act.action, color: 't-muted', bg: 'bg-slate-500/10 border-slate-500/25', Icon: Activity }
                      const MetaIcon = meta.Icon
                      return (
                        <tr key={act.id} className="border-b transition-colors hover:bg-black/3 dark:hover:bg-white/3" style={{ borderColor: 'var(--c-border)' }}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                                {(act.agentName || '?').charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs font-medium t-main whitespace-nowrap">{act.agentName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.bg} ${meta.color}`}>
                              <MetaIcon size={10} /> {meta.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-mono text-xs text-indigo-400 font-semibold">{act.ticketId}</div>
                            <div className="text-[10px] t-muted truncate max-w-[180px]">{act.ticketSubject}</div>
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
                <div className="px-4 py-2 border-t border-glass text-[11px] t-muted">
                  {filteredActions.length} action{filteredActions.length !== 1 ? 's' : ''} shown
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
