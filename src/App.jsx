import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AllTickets from './pages/AllTickets'
import MyTickets from './pages/MyTickets'
import NewTicket from './pages/NewTicket'
import Admin from './pages/Admin'
import Analytics from './pages/Analytics'
import { useUiStore } from './stores/uiStore'

export default function App() {
  const { isDark } = useUiStore()

  // Keep <html class="dark"> in sync with Zustand state (including on first load)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"    element={<Dashboard />} />
        <Route path="/tickets"      element={<AllTickets />} />
        <Route path="/tickets/mine" element={<MyTickets />} />
        <Route path="/tickets/new"  element={<NewTicket />} />
        <Route path="/admin"        element={<Admin />} />
        <Route path="/analytics"    element={<Analytics />} />
        <Route path="*"             element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}
