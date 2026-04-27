import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Ticket, PlusCircle, Settings, BarChart3,
  ChevronLeft, ChevronRight, LogOut, Zap, List
} from 'lucide-react'
import { useUserStore }  from '../../stores/userStore'
import { useUiStore }    from '../../stores/uiStore'
import { useAdminStore } from '../../stores/adminStore'
import { useT }          from '../../utils/i18n'

const NAV_KEYS = [
  { to: '/dashboard',    icon: LayoutDashboard, key: 'dashboard',  staffOnly: true },
  { to: '/tickets',      icon: List,            key: 'allTickets', staffOnly: true },
  { to: '/tickets/mine', icon: Ticket,          key: 'myTickets',  staffOnly: true },
]
const ACTION_KEYS = [
  { to: '/tickets/new',      icon: PlusCircle, key: 'submitTicket' },
  { to: '/tickets/my-portal', icon: Ticket,    key: 'myTickets',   userOnly: true },
  { to: '/analytics',        icon: BarChart3,  key: 'analytics',   staffOnly: true },
  { to: '/admin',            icon: Settings,   key: 'admin',       adminOnly: true },
]

export function Sidebar() {
  const { currentUser, logout } = useUserStore()
  const { sidebarOpen, toggleSidebar } = useUiStore()
  const { companyProfile } = useAdminStore()
  const navigate = useNavigate()
  const t = useT()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isAdmin   = currentUser?.role === 'admin'
  const isEndUser = currentUser?.role === 'user'
  const isStaff   = !isEndUser

  return (
    <aside
      // On mobile: always w-60 (overlay panel).
      // On desktop (lg+): w-60 when open, w-16 when collapsed.
      className={`flex flex-col h-full relative transition-all duration-300 ${
        sidebarOpen ? 'w-60' : 'w-60 lg:w-16'
      }`}
      style={{
        background: 'var(--c-sidebar-bg)',
        borderRight: '1px solid var(--c-border)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 h-16 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--c-border)' }}
      >
        {companyProfile?.logo ? (
          <img
            src={companyProfile.logo}
            alt="logo"
            className="w-8 h-8 rounded-xl object-contain flex-shrink-0 bg-white/10 p-0.5"
          />
        ) : (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-glow-indigo">
            <Zap size={16} className="text-white" />
          </div>
        )}
        {sidebarOpen && (
          <div className="overflow-hidden">
            <div className="text-sm font-bold leading-none t-main truncate">
              {companyProfile?.name || 'HelpdeskPro'}
            </div>
            <div className="text-[10px] mt-0.5 t-muted opacity-80">
              IT Support
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {sidebarOpen && isStaff && (
          <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest t-sub opacity-70">
            {t('navigation')}
          </div>
        )}
        {NAV_KEYS.filter(n => !n.staffOnly || isStaff).map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) => isActive ? 'nav-item-active' : 'nav-item'}
            title={!sidebarOpen ? t(key) : undefined}
          >
            <Icon size={16} className="flex-shrink-0" />
            {sidebarOpen && <span>{t(key)}</span>}
          </NavLink>
        ))}

        {sidebarOpen && (
          <div className="px-2 pt-4 mb-2 text-[10px] font-semibold uppercase tracking-widest t-sub opacity-70">
            {t('actions')}
          </div>
        )}
        {!sidebarOpen && <div className="my-2" style={{ borderTop: '1px solid var(--c-border)' }} />}
        {ACTION_KEYS.filter(a =>
          (!a.adminOnly || isAdmin) &&
          (!a.staffOnly || isStaff) &&
          (!a.userOnly  || isEndUser)
        ).map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => isActive ? 'nav-item-active' : 'nav-item'}
            title={!sidebarOpen ? t(key) : undefined}
          >
            <Icon size={16} className="flex-shrink-0" />
            {sidebarOpen && <span>{t(key)}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User card */}
      {currentUser && (
        <div className="p-2 flex-shrink-0" style={{ borderTop: '1px solid var(--c-border)' }}>
          <div
            className="flex items-center gap-3 p-2 rounded-lg transition-all cursor-default"
            style={{ '--hover-bg': 'var(--c-hover)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--c-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
              {currentUser.initials}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate t-main">
                  {currentUser.name}
                </div>
                <div className="text-[10px] truncate capitalize t-muted opacity-80">
                  {currentUser.role}
                </div>
              </div>
            )}
            {sidebarOpen && (
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg transition-all hover:bg-rose-500/20 hover:text-rose-500 dark:hover:text-rose-400 t-sub"
                title={t('logout')}
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Collapse toggle — desktop only */}
      <button
        onClick={toggleSidebar}
        className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 rounded-full items-center justify-center transition-all z-10 hover:bg-indigo-600 hover:text-white"
        style={{
          background: 'var(--c-card-bg)',
          border: '1px solid var(--c-border)',
          color: 'var(--c-text-40)',
          boxShadow: 'var(--c-card-shadow)',
        }}
      >
        {sidebarOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>
    </aside>
  )
}
