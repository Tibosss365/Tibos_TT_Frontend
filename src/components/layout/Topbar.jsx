import { useState } from 'react'
import { Search, Bell, X, Sun, Moon } from 'lucide-react'
import { useNotificationStore } from '../../stores/notificationStore'
import { useTicketStore } from '../../stores/ticketStore'
import { useUiStore } from '../../stores/uiStore'
import { timeAgo } from '../../utils/ticketUtils'

export function Topbar() {
  const { notifications, markAllRead, unreadCount } = useNotificationStore()
  const { setFilter } = useTicketStore()
  const { isDark, toggleTheme } = useUiStore()
  const [notifOpen, setNotifOpen] = useState(false)
  const [searchVal, setSearchVal] = useState('')

  const unread = unreadCount()

  const handleSearch = (val) => {
    setSearchVal(val)
    setFilter('search', val)
  }

  const notifTypeColor = {
    critical: 'text-rose-400',
    warning:  'text-amber-400',
    success:  'text-emerald-400',
    info:     'text-blue-400',
  }

  return (
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
        {/* Animated icon container */}
        <div className="relative w-[18px] h-[18px] overflow-hidden">
          {/* Moon — visible in dark mode */}
          <Moon
            size={18}
            className="absolute inset-0 transition-all duration-300"
            style={{
              color: '#a5b4fc',
              opacity: isDark ? 1 : 0,
              transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0.5)',
            }}
          />
          {/* Sun — visible in light mode */}
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

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen && unread > 0) markAllRead() }}
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

        {notifOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
            <div
              className="absolute right-0 top-full mt-2 w-80 z-40 animate-slide-up overflow-hidden rounded-xl"
              style={{
                background: 'var(--c-card-bg)',
                border: '1px solid var(--c-card-border)',
                boxShadow: 'var(--c-card-shadow)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--c-border)' }}
              >
                <span className="text-sm font-semibold t-main">
                  Notifications
                </span>
                <button
                  onClick={markAllRead}
                  className="text-xs text-indigo-500 hover:text-indigo-400 font-medium transition-colors"
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--c-text-30)' }}>
                    No notifications
                  </div>
                ) : notifications.map(n => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 transition-all ${n.read ? 'opacity-50' : ''}`}
                    style={{ borderBottom: '1px solid var(--c-border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--c-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div className={`text-xs font-semibold mb-1 ${notifTypeColor[n.type] || 't-main'}`}>
                      {n.text}
                    </div>
                    <div className="text-[10px] t-sub">
                      {timeAgo(n.time)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
