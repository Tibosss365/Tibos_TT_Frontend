import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const CompanyDashboard = lazy(() => import('./pages/CompanyDashboard'))
const AllTickets = lazy(() => import('./pages/AllTickets'))
const MyTickets = lazy(() => import('./pages/MyTickets'))
const UserPortal = lazy(() => import('./pages/UserPortal'))
const NewTicket = lazy(() => import('./pages/NewTicket'))
const Admin = lazy(() => import('./pages/Admin'))
const Analytics = lazy(() => import('./pages/Analytics'))
const DeletedItems = lazy(() => import('./pages/DeletedItems'))
const Knowledge = lazy(() => import('./pages/Knowledge'))
const ArticleDetail = lazy(() => import('./pages/Knowledge/ArticleDetail'))
const EmailPage = lazy(() => import('./pages/Email'))
const EmailLog = lazy(() => import('./pages/EmailLog'))
const ActivityLog = lazy(() => import('./pages/ActivityLog'))
const CsatSurvey = lazy(() => import('./pages/CsatSurvey'))
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
    <Suspense fallback={<div className="p-8 text-center text-sm t-muted">Loading page…</div>}>
    <Routes>
      {/* Public — no auth required */}
      <Route path="/csat/:token" element={<CsatSurvey />} />
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route index element={<DefaultRedirect />} />
        <Route path="/dashboard"         element={<StaffOnly><Dashboard /></StaffOnly>} />
        <Route path="/companies"         element={<StaffOnly><CompanyDashboard /></StaffOnly>} />
        <Route path="/tickets"           element={<StaffOnly><AllTickets /></StaffOnly>} />
        <Route path="/tickets/mine"      element={<StaffOnly><MyTickets /></StaffOnly>} />
        <Route path="/tickets/my-portal" element={<UserPortal />} />
        <Route path="/tickets/new"       element={<NewTicket />} />
        <Route path="/admin"             element={<StaffOnly><Admin /></StaffOnly>} />
        <Route path="/analytics"         element={<StaffOnly><Analytics /></StaffOnly>} />
        <Route path="/deleted"           element={<StaffOnly><DeletedItems /></StaffOnly>} />
        {/* Knowledge base is readable by everyone, incl. end-users — both pages
            internally gate authoring/admin actions to staff via role checks. */}
        <Route path="/knowledge"         element={<Knowledge />} />
        <Route path="/knowledge/article/:slug" element={<ArticleDetail />} />
        <Route path="/email"             element={<StaffOnly><EmailPage /></StaffOnly>} />
        <Route path="/email-log"         element={<StaffOnly><EmailLog /></StaffOnly>} />
        <Route path="/activity"          element={<StaffOnly><ActivityLog /></StaffOnly>} />
        <Route path="*"                  element={<DefaultRedirect />} />
      </Route>
    </Routes>
    </Suspense>
  )
}
