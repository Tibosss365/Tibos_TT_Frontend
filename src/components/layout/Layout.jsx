import { useEffect, useRef } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { ToastContainer } from '../ui/Toast'
import { useUserStore } from '../../stores/userStore'
import { useTicketStore } from '../../stores/ticketStore'
import { useAdminStore } from '../../stores/adminStore'
import { useNotificationStore } from '../../stores/notificationStore'
import { useUiStore } from '../../stores/uiStore'
import { TicketDetailModal } from '../tickets/TicketDetailModal'

export function Layout() {
  const { isLoggedIn, token } = useUserStore()
  const { fetchTickets } = useTicketStore()
  const {
    fetchAgents, fetchSla, fetchEmailConfig, fetchCategories, fetchGroups,
    fetchInboundConfig, fetchInboundLogs, fetchTicketSettings,
  } = useAdminStore()
  const { fetchNotifications, addNotification } = useNotificationStore()
  const { activeModal, closeModal, sidebarOpen, toggleSidebar } = useUiStore()
  const sseRef = useRef(null)
  const location = useLocation()

  // Close mobile sidebar on route change
  useEffect(() => {
    if (window.innerWidth < 1024 && sidebarOpen) {
      toggleSidebar()
    }
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isLoggedIn || !token) return

    // Load all data on mount
    fetchTickets()
    fetchAgents()
    fetchSla()
    fetchEmailConfig()
    fetchInboundConfig()
    fetchInboundLogs()
    fetchCategories()
    fetchGroups()
    fetchTicketSettings()
    fetchNotifications()

    // Open SSE connection
    const es = new EventSource(`/api/events?token=${encodeURIComponent(token)}`)
    sseRef.current = es

    const handleTicketEvent = () => {
      fetchTickets()
      fetchNotifications()
    }

    es.addEventListener('ticket_created',      handleTicketEvent)
    es.addEventListener('ticket_updated',      handleTicketEvent)
    es.addEventListener('ticket_deleted',      handleTicketEvent)
    es.addEventListener('tickets_bulk_updated', handleTicketEvent)
    es.addEventListener('ticket_comment',      handleTicketEvent)

    es.addEventListener('notification', (e) => {
      try {
        const payload = JSON.parse(e.data)
        addNotification(payload.text || 'New notification', payload.type || 'info')
      } catch {
        // ignore malformed SSE data
      }
    })

    es.onerror = () => {
      // SSE will auto-reconnect; no action needed
    }

    return () => {
      es.close()
      sseRef.current = null
    }
  }, [isLoggedIn, token]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isLoggedIn) return <Navigate to="/login" replace />

  return (
    <div
      className="flex h-screen overflow-hidden transition-colors duration-300 relative"
      style={{ background: 'var(--c-app-bg)' }}
    >
      {/* ── Mobile backdrop (closes sidebar on tap outside) ──────────────────── */}
      <div
        className={`fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity duration-300 ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={toggleSidebar}
      />

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      {/* On mobile: fixed overlay, hidden with translateX.
          On desktop (lg+): static in flow, always visible. */}
      <div
        className={`
          fixed inset-y-0 left-0 z-30 h-full
          lg:relative lg:z-auto lg:translate-x-0
          transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar />
      </div>

      {/* ── Main area ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-5 lg:p-6">
          <Outlet />
        </main>
      </div>

      <ToastContainer />

      {activeModal?.type === 'ticket' && activeModal.data && (
        <TicketDetailModal ticket={activeModal.data} onClose={closeModal} />
      )}
    </div>
  )
}
