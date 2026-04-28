import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Eye, EyeOff, Lock, User, Shield } from 'lucide-react'
import { useUserStore } from '../stores/userStore'
import { fetchSSOPublic, redirectToSSOLogin } from '../api/client'

export default function Login() {
  const [form, setForm]       = useState({ username: '', password: '' })
  const [showPw, setShowPw]   = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [ssoInfo, setSsoInfo] = useState(null)   // { enabled, provider, label }
  const [ssoLoading, setSsoLoading] = useState(false)

  const { login, setFromSSO } = useUserStore()
  const navigate = useNavigate()

  // ── On mount: load SSO config + handle callback token ─────────────────────
  useEffect(() => {
    // 1. Fetch whether SSO is enabled
    fetchSSOPublic().then(setSsoInfo)

    // 2. Handle SSO callback — backend redirects back with ?sso_token=...
    const params = new URLSearchParams(window.location.search)
    const ssoToken = params.get('sso_token')
    const ssoUser  = params.get('sso_user')
    const ssoError = params.get('sso_error')

    if (ssoError) {
      const messages = {
        sso_disabled:          'Single sign-on is not enabled.',
        user_not_provisioned:  'Your account is not provisioned. Contact your administrator.',
        account_disabled:      'Your account has been disabled.',
        invalid_state:         'Login session expired — please try again.',
        token_exchange_failed: 'Could not complete sign-in. Try again.',
        invalid_id_token:      'Identity verification failed. Contact your administrator.',
        missing_oid:           'Your account is missing required identity claims.',
        missing_params:        'Incomplete response from identity provider.',
      }
      setError(messages[ssoError] || `SSO error: ${ssoError}`)
      // Clean URL
      window.history.replaceState({}, '', '/login')
      return
    }

    if (ssoToken && ssoUser) {
      try {
        const user = JSON.parse(atob(ssoUser))
        setFromSSO(ssoToken, user)
        // Clean URL before redirecting
        window.history.replaceState({}, '', '/')
        navigate(user.role === 'user' ? '/tickets/my-portal' : '/dashboard', { replace: true })
      } catch {
        setError('SSO login failed — invalid session data.')
        window.history.replaceState({}, '', '/login')
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username || !form.password) { setError('Please enter your credentials'); return }
    setLoading(true)
    setError('')
    const result = await login(form.username, form.password)
    setLoading(false)
    if (result.success) navigate('/dashboard')
    else setError(result.error)
  }

  const handleSSOLogin = () => {
    setSsoLoading(true)
    redirectToSSOLogin()  // triggers full browser redirect to Azure AD
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-app">

      {/* Background glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-600/10 dark:bg-indigo-600/5 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-violet-600/10 dark:bg-violet-600/5 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-cyan-500/5 blur-3xl" />

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]"
        style={{ backgroundImage: 'linear-gradient(rgba(99,102,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Login card */}
      <div className="relative w-full max-w-md mx-3 sm:mx-4 animate-slide-up">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-glow-indigo mb-4 animate-pulse-glow">
            <Zap size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold t-main mb-1">HelpdeskPro</h1>
          <p className="text-sm t-muted">IT Support Ticketing System</p>
        </div>

        {/* Card */}
        <div className="glass-card shadow-glass-lg p-5 sm:p-8">
          <h2 className="text-lg font-semibold t-main mb-1">Welcome back</h2>
          <p className="text-xs t-muted mb-6">Sign in to your account to continue</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-sm">
              {error}
            </div>
          )}

          {/* ── SSO Button (shown when enabled) ── */}
          {ssoInfo?.enabled && (
            <div className="mb-5">
              <button
                type="button"
                onClick={handleSSOLogin}
                disabled={ssoLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl
                  border border-[#2672D8]/40 bg-[#2672D8]/10 hover:bg-[#2672D8]/20
                  text-[#2672D8] dark:text-[#60a5fa] font-semibold text-sm
                  transition-all disabled:opacity-50"
              >
                {ssoLoading ? (
                  <span className="w-4 h-4 border-2 border-[#2672D8]/40 border-t-[#2672D8] rounded-full animate-spin" />
                ) : (
                  /* Microsoft logo SVG */
                  <svg width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                    <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                    <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                    <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                  </svg>
                )}
                {ssoLoading ? 'Redirecting…' : (ssoInfo.label || 'Sign in with Microsoft')}
              </button>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
                <span className="text-[10px] t-sub font-medium uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
              </div>
            </div>
          )}

          {/* ── Username / Password form ── */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium t-muted mb-1.5">Username</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 t-sub" />
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  className="glass-input w-full pl-9"
                  placeholder="Enter username"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium t-muted mb-1.5">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 t-sub" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="glass-input w-full pl-9 pr-10"
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 t-sub hover:t-main transition-colors">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3 mt-2 rounded-xl text-sm disabled:opacity-50">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-glass">
            <p className="text-xs t-sub text-center mb-2 font-medium opacity-60">Demo credentials</p>
            <div className="grid grid-cols-2 gap-2">
              {[['admin', 'admin', 'Admin'], ['siva', 'siva', 'Technician']].map(([u, p, label]) => (
                <button key={u} type="button"
                  onClick={() => setForm({ username: u, password: p })}
                  className="px-3 py-2 rounded-lg bg-indigo-50/50 dark:bg-white/5 hover:bg-indigo-100/50 dark:hover:bg-white/10 border border-indigo-100 dark:border-white/10 text-xs t-muted hover:t-main transition-all text-left">
                  <div className="font-semibold text-indigo-600 dark:text-inherit">{label}</div>
                  <div className="t-sub font-mono text-[10px] mt-0.5">{u} / {p}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
