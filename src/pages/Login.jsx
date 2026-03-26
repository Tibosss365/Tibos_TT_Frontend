import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Eye, EyeOff, Lock, User } from 'lucide-react'
import { useUserStore } from '../stores/userStore'

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useUserStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username || !form.password) { setError('Please enter your credentials'); return }
    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 600))
    const result = login(form.username, form.password)
    setLoading(false)
    if (result.success) navigate('/dashboard')
    else setError(result.error)
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
      <div className="relative w-full max-w-md mx-4 animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-glow-indigo mb-4 animate-pulse-glow">
            <Zap size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold t-main mb-1">HelpdeskPro</h1>
          <p className="text-sm t-muted">IT Support Ticketing System</p>
        </div>

        {/* Card */}
        <div className="glass-card shadow-glass-lg p-8">
          <h2 className="text-lg font-semibold t-main mb-1">Welcome back</h2>
          <p className="text-xs t-muted mb-6">Sign in to your account to continue</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-sm">
              {error}
            </div>
          )}

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
              {[['admin', 'admin', 'Admin'], ['sarah', 'sarah123', 'Technician']].map(([u, p, label]) => (
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
