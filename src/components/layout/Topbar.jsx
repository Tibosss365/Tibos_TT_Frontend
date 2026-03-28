import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Bell, X, Sun, Moon, CheckCheck, AlertCircle, AlertTriangle, Info, CheckCircle2, ArrowRight } from 'lucide-react'
import { useNotificationStore } from '../../stores/notificationStore'
import { useTicketStore } from '../../stores/ticketStore'
import { useUiStore } from '../../stores/uiStore'
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
<<<<<<< HEAD
  const { notifications, markAllRead, unreadCount: unread } = useNotificationStore()
=======
  const navigate = useNavigate()
  const { notifications, markAllRead, markRead, unreadCount } = useNotificationStore()
  const { tickets } = useTicketStore()
>>>>>>> 0a149504f5e5b1b820fda2607973e200e942d5a3
  const { setFilter } = useTicketStore()
  const { isDark, toggleTheme } = useUiStore()
  const [notifOpen, setNotifOpen] = useState(false)
  const [searchVal, setSearchVal] = useState('')

  const handleSearch = (val) => {
    setSearchVal(val)
    setFilter('search', val)
  }

  const openPanel = () => setNotifOpen(true)
  const closePanel = () => { setNotifOpen(false); markAllRead() }

  const handleNotifClick = (n) => {
    markRead(n.id)
    const ticketId = extractTicketId(n.text)
    if (ticketId) {
      setNotifOpen(false)
      // Navigate to All Tickets and pass the ticket id so it auto-opens
      navigate('/tickets', { state: { openTicketId: ticketId } })
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
        {/* Search */}
        <div className="flex-1 max-w-md relative">
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
              ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.12))'
              : 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(249,115,22,0.1))',
            border: isDark
              ? '1px solid rgba(99,102,241,0.3)'
              : '1px solid rgba(251,191,36,0.4)',
            boxShadow: isDark
              ? '0 0 14px rgba(99,102,241,0.18), inset 0 1px 0 rgba(255,255,255,0.06)'
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
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          )}
        </button>
      </header>

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
          width: '360px',
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
            <div>
              <div className="text-sm font-bold t-main">Notifications</div>
              {unread > 0 && (
                <div className="text-[10px] t-sub">{unread} unread</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {notifications.some(n => !n.read) && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 text-[11px] text-indigo-500 hover:text-indigo-400 font-medium transition-colors px-2 py-1 rounded-lg hover:bg-indigo-500/10"
              >
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
            <button
              onClick={closePanel}
              className="p-1.5 rounded-lg transition-all t-sub hover:t-main"
              style={{ ':hover': { background: 'var(--c-hover)' } }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--c-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
              <div className="w-14 h-14 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center">
                <Bell size={24} className="t-sub" />
              </div>
              <div className="text-sm font-medium t-sub">All caught up!</div>
              <div className="text-xs t-sub opacity-60">No notifications yet</div>
            </div>
          ) : (
            <div className="py-2">
              {notifications.map((n, i) => {
                const cfg = NOTIF_ICON[n.type] || NOTIF_ICON.info
                const Icon = cfg.icon
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className="group flex items-start gap-3 px-5 py-3.5 cursor-pointer transition-all relative"
                    style={{
                      borderBottom: i < notifications.length - 1 ? '1px solid var(--c-border)' : 'none',
                      opacity: n.read ? 0.55 : 1,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--c-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Type icon */}
                    <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5 ${cfg.bg}`}>
                      <Icon size={15} className={cfg.cls} />
                    </div>

                    {/* Content */}
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

                    {/* Unread dot */}
                    {!n.read && (
                      <span className="absolute right-5 top-4 w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div
            className="px-5 py-3 flex-shrink-0"
            style={{ borderTop: '1px solid var(--c-border)' }}
          >
            <div className="text-[10px] t-sub text-center">
              {notifications.length} total notification{notifications.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
