import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AllTickets from './pages/AllTickets'
import MyTickets from './pages/MyTickets'
import UserPortal from './pages/UserPortal'
import NewTicket from './pages/NewTicket'
import Admin from './pages/Admin'
import Analytics from './pages/Analytics'
import { useUiStore } from './stores/uiStore'
import { useAdminStore } from './stores/adminStore'
import { useUserStore } from './stores/userStore'
import { useSessionTimeout } from './hooks/useSessionTimeout'
import { LANGUAGES } from './locales/translations'

function DefaultRedirect() {
  const role = useUserStore(s => s.currentUser?.role)
  return <Navigate to={role === 'user' ? '/tickets/my-portal' : '/dashboard'} replace />
}

function StaffOnly({ children }) {
  const role = useUserStore(s => s.currentUser?.role)
  if (role === 'user') return <Navigate to="/tickets/my-portal" replace />
  return children
}

export default function App() {
  const { isDark } = useUiStore()
  const language = useAdminStore(s => s.systemSettings?.language || 'en')

  // Session idle-timeout auto-logout
  useSessionTimeout()

  // Keep <html class="dark"> in sync with Zustand state (including on first load)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  // Set text direction + lang attribute for the active language
  useEffect(() => {
    const langMeta = LANGUAGES.find(l => l.code === language)
    document.documentElement.setAttribute('lang', language)
    document.documentElement.setAttribute('dir', langMeta?.dir || 'ltr')
  }, [language])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route index element={<DefaultRedirect />} />
        <Route path="/dashboard"         element={<StaffOnly><Dashboard /></StaffOnly>} />
        <Route path="/tickets"           element={<StaffOnly><AllTickets /></StaffOnly>} />
        <Route path="/tickets/mine"      element={<StaffOnly><MyTickets /></StaffOnly>} />
        <Route path="/tickets/my-portal" element={<UserPortal />} />
        <Route path="/tickets/new"       element={<NewTicket />} />
        <Route path="/admin"             element={<StaffOnly><Admin /></StaffOnly>} />
        <Route path="/analytics"         element={<StaffOnly><Analytics /></StaffOnly>} />
        <Route path="*"                  element={<DefaultRedirect />} />
      </Route>
    </Routes>
  )
}
