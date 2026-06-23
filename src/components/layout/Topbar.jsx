import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Bell, X, Sun, Moon, CheckCheck, AlertCircle, AlertTriangle, Info, CheckCircle2, ArrowRight, Menu, Settings, ThumbsUp, ThumbsDown, Trash2 } from 'lucide-react'
import { useNotificationStore } from '../../stores/notificationStore'
import { useTicketStore } from '../../stores/ticketStore'
import { useUiStore } from '../../stores/uiStore'
import { useUserStore } from '../../stores/userStore'
import UserSettingsModal from './UserSettingsModal'
import { timeAgo } from '../../utils/ticketUtils'

const NOTIF_ICON = {
  critical: { icon: AlertCircle,   cls: 'text-rose-500',    bg: 'bg-rose-500/10' },
  warning:  { icon: AlertTriangle, cls: 'text-amber-500',   bg: 'bg-amber-500/10' },
  success:  { icon: CheckCircle2,  cls: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  info:     { icon: Info,          cls: 'text-blue-500',    bg: 'bg-blue-500/10' },
}

// Extract ticket ID like "TKT-0004" from notification text
function extractTicketId(text) {
  const m = text.match(/[A-Z]+-\d+/)
  return m ? m[0] : null
}

export function Topbar() {
  const navigate = useNavigate()
  const { notifications, markAllRead, markRead, unreadCount, clearAll,
          pendingApprovals, fetchPendingApprovals, decideApproval } = useNotificationStore()
  const { tickets } = useTicketStore()
  const { setFilter } = useTicketStore()
  const { isDark, toggleTheme, openModal, toggleSidebar } = useUiStore()
  const currentUser = useUserStore(s => s.currentUser)
  const [notifOpen, setNotifOpen] = useState(false)
  const [drawerTab, setDrawerTab] = useState('approvals')  // 'approvals' | 'notifications'
  const [searchVal, setSearchVal] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  // Regular notifications only — approval requests live in their own tab.
  const plainNotifs = notifications.filter(n => !n.isApproval)

  const handleSearch = (val) => {
    setSearchVal(val)
    setFilter('search', val)
  }

  const openPanel = () => {
    setNotifOpen(true)
    fetchPendingApprovals()
    setDrawerTab(pendingApprovals.length > 0 ? 'approvals' : 'notifications')
  }
  const closePanel = () => { setNotifOpen(false); markAllRead() }

  const handleDecision = async (appr, status) => {
    try { await decideApproval(appr.ticket_uuid, appr.approval_id, status) }
    catch { /* store logs the error */ }
  }

  const handleNotifClick = (n) => {
    markRead(n.id)
    const ticketId = extractTicketId(n.text)
    if (ticketId) {
      setNotifOpen(false)
      const ticket = tickets.find(t => t.id === ticketId)
      if (ticket) {
        openModal('ticket', ticket)
      } else {
        navigate('/tickets', { state: { openTicketId: ticketId } })
      }
    }
  }

  return (
    <>
      <header
        className="h-16 flex items-center gap-4 px-6 flex-shrink-0"
        style={{
          borderBottom: '1px solid var(--c-border)',
          background: 'var(--c-topbar-bg)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {/* ── Mobile hamburger ── */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-lg flex-shrink-0 transition-all"
          style={{ color: 'var(--c-text-40)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-hover)'; e.currentTarget.style.color = 'var(--c-text)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--c-text-40)' }}
          title="Toggle menu"
        >
          <Menu size={20} />
        </button>

        {/* Search */}
        <div className="flex-1 min-w-0 max-w-md relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-30)' }} />
          <input
            type="text"
            placeholder="Search tickets… (Ctrl+K)"
            value={searchVal}
            onChange={e => handleSearch(e.target.value)}
            className="glass-input w-full pl-9 pr-4 py-2 text-sm"
          />
          {searchVal && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: 'var(--c-text-30)' }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* ─── Day / Night Toggle ─── */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="relative p-2.5 rounded-xl transition-all duration-300 group"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, rgba(14,165,233,0.15), rgba(37,99,235,0.12))'
              : 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(249,115,22,0.1))',
            border: isDark
              ? '1px solid rgba(14,165,233,0.3)'
              : '1px solid rgba(251,191,36,0.4)',
            boxShadow: isDark
              ? '0 0 14px rgba(14,165,233,0.18), inset 0 1px 0 rgba(255,255,255,0.06)'
              : '0 0 14px rgba(251,191,36,0.22), inset 0 1px 0 rgba(255,255,255,0.4)',
          }}
        >
          <div className="relative w-[18px] h-[18px] overflow-hidden">
            <Moon
              size={18}
              className="absolute inset-0 transition-all duration-300"
              style={{
                color: '#a5b4fc',
                opacity: isDark ? 1 : 0,
                transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0.5)',
              }}
            />
            <Sun
              size={18}
              className="absolute inset-0 transition-all duration-300"
              style={{
                color: '#f59e0b',
                opacity: isDark ? 0 : 1,
                transform: isDark ? 'rotate(-90deg) scale(0.5)' : 'rotate(0deg) scale(1)',
              }}
            />
          </div>
        </button>

        {/* Bell button */}
        <button
          onClick={openPanel}
          title="Notifications"
          className="relative p-2 rounded-lg transition-all"
          style={{ color: 'var(--c-text-40)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-hover)'; e.currentTarget.style.color = 'var(--c-text)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--c-text-40)' }}
        >
          <Bell size={18} />
          {(unreadCount > 0 || pendingApprovals.length > 0) && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          )}
        </button>

        {/* User avatar / settings */}
        {currentUser && (
          <button
            onClick={() => setShowSettings(true)}
            title="My Settings"
            className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold text-white flex-shrink-0 transition-all ring-2 ring-transparent hover:ring-indigo-500/60"
            style={{ background: 'linear-gradient(135deg,#0ea5e9,#2563eb)' }}
          >
            {(currentUser.initials || currentUser.name?.slice(0,2) || 'U').toUpperCase()}
          </button>
        )}
      </header>

      {/* User Settings Modal */}
      {showSettings && (
        <UserSettingsModal
          user={currentUser}
          onClose={() => setShowSettings(false)}
          onSaved={() => setShowSettings(false)}
        />
      )}

      {/* ── Notification Drawer ───────────────────────────────────────────────── */}
      {/* Backdrop */}
      <div
        onClick={closePanel}
        className="fixed inset-0 z-40 transition-all duration-300"
        style={{
          background: 'rgba(0,0,0,0.25)',
          backdropFilter: notifOpen ? 'blur(2px)' : 'none',
          opacity: notifOpen ? 1 : 0,
          pointerEvents: notifOpen ? 'auto' : 'none',
        }}
      />

      {/* Drawer Panel */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col"
        style={{
          width: 'min(360px, 100vw)',
          background: 'var(--c-card-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderLeft: '1px solid var(--c-card-border)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.18)',
          transform: notifOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--c-border)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
              <Bell size={15} className="text-indigo-500" />
            </div>
            <div className="text-sm font-bold t-main">Inbox</div>
          </div>
          <button
            onClick={closePanel}
            className="p-1.5 rounded-lg transition-all t-sub hover:t-main"
            onMouseEnter={e => e.currentTarget.style.background = 'var(--c-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab switcher: Approval Requests | Notifications */}
        <div className="flex px-3 pt-3 gap-2 flex-shrink-0">
          {[
            { id: 'approvals',     label: 'Approval Requests', count: pendingApprovals.length },
            { id: 'notifications', label: 'Notifications',      count: plainNotifs.filter(n => !n.read).length },
          ].map(tab => {
            const active = drawerTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setDrawerTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-semibold transition-all border ${
                  active
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent t-muted hover:t-main hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center ${
                    tab.id === 'approvals' ? 'bg-violet-500 text-white' : 'bg-indigo-500 text-white'
                  }`}>{tab.count}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Approval Requests tab ─────────────────────────────────────────── */}
        {drawerTab === 'approvals' && (
          <div className="flex-1 overflow-y-auto py-2 mt-1">
            {pendingApprovals.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                  <ThumbsUp size={24} className="text-violet-500" />
                </div>
                <div className="text-sm font-medium t-sub">No pending approvals</div>
                <div className="text-xs t-sub opacity-60">You're all caught up</div>
              </div>
            ) : (
              pendingApprovals.map(appr => (
                <div
                  key={appr.approval_id}
                  className="px-5 py-3.5"
                  style={{ borderBottom: '1px solid var(--c-border)', borderLeft: '3px solid rgb(139,92,246)', background: 'rgba(139,92,246,0.04)' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 text-[9px] font-bold uppercase tracking-wider">
                      <ThumbsUp size={8} /> Approval
                    </span>
                    <span className="text-indigo-500 font-bold text-xs">{appr.ticket_id}</span>
                  </div>
                  <div className="text-xs font-semibold t-main leading-snug">{appr.subject}</div>
                  {appr.note && <div className="text-[11px] t-muted mt-1">"{appr.note}"</div>}
                  <div className="text-[10px] t-sub mt-1">
                    Requested by {appr.requested_by || '—'}{appr.ts ? ` · ${timeAgo(appr.ts)}` : ''}
                  </div>
                  <div className="flex items-center gap-2 mt-2.5">
                    <button
                      onClick={() => handleDecision(appr, 'approved')}
                      className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30 transition-all border border-emerald-500/25"
                    >
                      <ThumbsUp size={11} /> Approve
                    </button>
                    <button
                      onClick={() => handleDecision(appr, 'rejected')}
                      className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/30 transition-all border border-rose-500/25"
                    >
                      <ThumbsDown size={11} /> Reject
                    </button>
                    <button
                      onClick={() => { setNotifOpen(false); const tk = tickets.find(t => t.id === appr.ticket_id); if (tk) openModal('ticket', tk); else navigate('/tickets', { state: { openTicketId: appr.ticket_id } }) }}
                      className="ml-auto flex items-center gap-0.5 text-[10px] text-indigo-500 hover:text-indigo-400 font-medium"
                    >
                      View ticket <ArrowRight size={9} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Notifications tab ─────────────────────────────────────────────── */}
        {drawerTab === 'notifications' && (
          <>
            {plainNotifs.length > 0 && (
              <div className="flex items-center justify-end gap-2 px-5 pt-2 flex-shrink-0">
                {plainNotifs.some(n => !n.read) && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1.5 text-[11px] text-indigo-500 hover:text-indigo-400 font-medium transition-colors px-2 py-1 rounded-lg hover:bg-indigo-500/10"
                  >
                    <CheckCheck size={12} /> Mark all read
                  </button>
                )}
                <button
                  onClick={clearAll}
                  title="Clear notifications (approval requests are kept)"
                  className="flex items-center gap-1.5 text-[11px] text-rose-500 hover:text-rose-400 font-medium transition-colors px-2 py-1 rounded-lg hover:bg-rose-500/10"
                >
                  <Trash2 size={12} /> Clear
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">
              {plainNotifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
                  <div className="w-14 h-14 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center">
                    <Bell size={24} className="t-sub" />
                  </div>
                  <div className="text-sm font-medium t-sub">All caught up!</div>
                  <div className="text-xs t-sub opacity-60">No notifications yet</div>
                </div>
              ) : (
                <div className="py-2">
                  {plainNotifs.map((n, i) => {
                    const cfg = NOTIF_ICON[n.type] || NOTIF_ICON.info
                    const Icon = cfg.icon
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className="group flex items-start gap-3 px-5 py-3.5 cursor-pointer transition-all relative"
                        style={{
                          borderBottom: i < plainNotifs.length - 1 ? '1px solid var(--c-border)' : 'none',
                          opacity: n.read ? 0.55 : 1,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--c-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5 ${cfg.bg}`}>
                          <Icon size={15} className={cfg.cls} />
                        </div>
                        <div className="flex-1 min-w-0 pr-5">
                          <div className={`text-xs font-semibold leading-snug ${!n.read ? 't-main' : 't-sub'}`}>
                            {(() => {
                              const ticketId = extractTicketId(n.text)
                              if (!ticketId) return n.text
                              const [prefix, ...rest] = n.text.split(' — ')
                              return (
                                <>
                                  <span className="text-indigo-500 font-bold">{prefix}</span>
                                  {rest.length > 0 && <span className="t-main font-normal"> — {rest.join(' — ')}</span>}
                                </>
                              )
                            })()}
                          </div>
                          <div className="text-[10px] t-sub mt-1 flex items-center gap-1.5">
                            {timeAgo(n.time)}
                            {extractTicketId(n.text) && (
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500 flex items-center gap-0.5 font-medium">
                                · View ticket <ArrowRight size={9} />
                              </span>
                            )}
                          </div>
                        </div>
                        {!n.read && (
                          <span className="absolute right-5 top-4 w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
