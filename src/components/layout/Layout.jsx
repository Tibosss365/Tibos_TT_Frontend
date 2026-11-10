import { lazy, Suspense, useEffect, useRef } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { ToastContainer } from '../ui/Toast'
import { useUserStore } from '../../stores/userStore'
import { BASE } from '../../api/client'
import { useTicketStore } from '../../stores/ticketStore'
import { useAdminStore } from '../../stores/adminStore'
import { useNotificationStore } from '../../stores/notificationStore'
import { useUiStore } from '../../stores/uiStore'
const TicketDetailModal = lazy(() => import('../tickets/TicketDetailModal').then(module => ({ default: module.TicketDetailModal })))
const TICKET_DATA_PATHS = new Set(['/dashboard', '/tickets', '/tickets/mine', '/companies'])

export function Layout() {
  const { isLoggedIn, token } = useUserStore()
  const { fetchTickets, fetchDeletedTickets, ticketsLoaded } = useTicketStore()
  const {
    fetchAgents, fetchSla, fetchEmailConfig, fetchCategories, fetchGroups,
    fetchInboundConfig, fetchInboundLogs, fetchTicketSettings,
    fetchOnHoldReasons, fetchResolutionCodes, fetchCannedResponses,
    fetchCompanySettings,
  } = useAdminStore()
  const { fetchNotifications, addNotification, fetchPendingApprovals } = useNotificationStore()
  const { activeModal, closeModal, sidebarOpen, toggleSidebar } = useUiStore()
  const sseRef = useRef(null)
  const location = useLocation()
  const pathRef = useRef(location.pathname)
  pathRef.current = location.pathname

  // Close mobile sidebar on route change
  useEffect(() => {
    if (window.innerWidth < 1024 && sidebarOpen) {
      toggleSidebar()
    }
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isLoggedIn || !token) return

    // Keep only small shell-wide data here. Page data is loaded on demand below
    // so email/admin/trash requests don't delay unrelated pages.
    fetchNotifications()
    fetchPendingApprovals()
    fetchCompanySettings()

    // Open SSE connection
    const es = new EventSource(`${BASE}/events?token=${encodeURIComponent(token)}`)
    sseRef.current = es

    let refreshTimer = null
    let refreshDeletedTickets = false
    const scheduleLiveRefresh = (includeDeleted = false) => {
      refreshDeletedTickets = refreshDeletedTickets || includeDeleted
      if (refreshTimer) clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => {
        refreshTimer = null
        if (TICKET_DATA_PATHS.has(pathRef.current)) fetchTickets()
        fetchNotifications()
        fetchPendingApprovals()
        if (refreshDeletedTickets && pathRef.current === '/deleted') fetchDeletedTickets()
        refreshDeletedTickets = false
      }, 400)
    }

    const handleTicketEvent = () => scheduleLiveRefresh()
    const handleDeleteEvent = () => scheduleLiveRefresh(true)

    es.addEventListener('ticket_created',      handleTicketEvent)
    es.addEventListener('ticket_updated',      handleTicketEvent)
    es.addEventListener('ticket_deleted',      handleDeleteEvent)
    es.addEventListener('ticket_restored',     handleDeleteEvent)
    es.addEventListener('tickets_bulk_updated', handleDeleteEvent)
    es.addEventListener('ticket_comment',      handleTicketEvent)

    es.addEventListener('notification', (e) => {
      try {
        const payload = JSON.parse(e.data)
        addNotification(payload.text || 'New notification', payload.type || 'info', !!payload.is_approval)
      } catch {
        // ignore malformed SSE data
      }
    })

    es.onerror = () => {
      // SSE will auto-reconnect; no action needed
    }

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer)
      es.close()
      sseRef.current = null
    }
  }, [isLoggedIn, token]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load data only for the route that consumes it. This avoids opening a dozen
  // database requests plus a full ticket-history download on every page visit.
  useEffect(() => {
    if (!isLoggedIn || !token) return

    const path = location.pathname
    const needsTicketData = TICKET_DATA_PATHS.has(path)
    const needsReferenceData = ['/dashboard', '/tickets', '/tickets/mine', '/tickets/new'].includes(path)
    if (needsTicketData && !ticketsLoaded) fetchTickets()
    if (needsReferenceData) {
      fetchAgents()
      fetchCategories()
      fetchGroups()
    }
    if (path === '/tickets/new') {
      fetchSla()
      fetchTicketSettings()
    }
    if (path === '/admin') {
      fetchAgents()
      fetchSla()
      fetchEmailConfig()
      fetchInboundConfig()
      fetchInboundLogs()
      fetchCategories()
      fetchGroups()
      fetchTicketSettings()
      fetchOnHoldReasons()
      fetchResolutionCodes()
      fetchCannedResponses()
    }
  }, [location.pathname, isLoggedIn, token]) // eslint-disable-line react-hooks/exhaustive-deps

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
          <Suspense fallback={<div className="py-8 text-center text-sm t-muted">Loading module…</div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <ToastContainer />

      {activeModal?.type === 'ticket' && activeModal.data && (
        <Suspense fallback={null}><TicketDetailModal ticket={activeModal.data} onClose={closeModal} /></Suspense>
      )}
    </div>
  )
}
