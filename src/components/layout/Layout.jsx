import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { ToastContainer } from '../ui/Toast'
import { useUserStore } from '../../stores/userStore'

export function Layout() {
  const { isLoggedIn } = useUserStore()
  if (!isLoggedIn) return <Navigate to="/login" replace />

  return (
    <div
      className="flex h-screen overflow-hidden transition-colors duration-300"
      style={{ background: 'var(--c-app-bg)' }}
    >
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}
