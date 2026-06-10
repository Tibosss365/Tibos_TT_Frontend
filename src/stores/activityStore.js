/**
 * activityStore — login sessions + modification history.
 *
 * Login sessions are stored in both:
 *   1. The backend DB (persistent, cross-device, admin-visible)
 *   2. localStorage (kept as a fallback for the current browser)
 *
 * Modification history is fetched directly from the backend API
 * (/activity/modifications) — no local derivation needed.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../api/client'

const RETENTION_DAYS = 30

function parseBrowser(ua) {
  if (/Edg\//.test(ua))               return 'Edge'
  if (/OPR\/|Opera\//.test(ua))       return 'Opera'
  if (/Chrome\//.test(ua))            return 'Chrome'
  if (/Firefox\//.test(ua))           return 'Firefox'
  if (/Safari\//.test(ua))            return 'Safari'
  return 'Browser'
}

function parseOS(ua) {
  if (/Windows NT 1[01]/.test(ua))    return 'Windows 10/11'
  if (/Windows NT/.test(ua))          return 'Windows'
  if (/Mac OS X/.test(ua))            return 'macOS'
  if (/Android/.test(ua))             return 'Android'
  if (/iPhone|iPad/.test(ua))         return 'iOS'
  if (/Linux/.test(ua))               return 'Linux'
  return 'Unknown OS'
}

function isWithin30Days(isoString) {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000
  return new Date(isoString).getTime() >= cutoff
}

export const useActivityStore = create(
  persist(
    (set, get) => ({
      // ── Local session cache (current browser) ──────────────────────────
      sessions: [],

      // ── API-backed state ──────────────────────────────────────────────
      loginHistory: [],      // fetched from /activity/logins
      loginTotal: 0,
      loginPage: 1,
      loginLoading: false,
      loginError: null,
      loginFromLocal: false, // true when data came from localStorage fallback

      modifications: [],     // fetched from /activity/modifications
      modTotal: 0,
      modPage: 1,
      modLoading: false,
      modError: null,

      agentSummary: [],      // fetched from /activity/agent-summary

      // ── Local session helpers (kept for backward compat) ───────────────

      recordLogin: (user, ip = null) => {
        const ua = navigator.userAgent
        const sessionId = 'sess-' + Date.now()
        const session = {
          id: sessionId,
          userId: String(user.id || ''),
          userName: user.name || user.username || 'Unknown',
          userRole: user.role || 'user',
          email: user.email || user.username || '',
          loginAt: new Date().toISOString(),
          logoutAt: null,
          browser: parseBrowser(ua),
          os: parseOS(ua),
          ip: ip || null,
          active: true,
        }
        set(s => ({
          sessions: [session, ...s.sessions].filter(sess => isWithin30Days(sess.loginAt))
        }))
        return sessionId
      },

      recordLogout: (sessionId) => {
        if (!sessionId) return
        set(s => ({
          sessions: s.sessions.map(sess =>
            sess.id === sessionId
              ? { ...sess, logoutAt: new Date().toISOString(), active: false }
              : sess
          ),
        }))
      },

      purgeStale: () => {
        const staleCutoff = Date.now() - 24 * 60 * 60 * 1000
        set(s => ({
          sessions: s.sessions
            .filter(sess => isWithin30Days(sess.loginAt))
            .map(sess =>
              (sess.active && new Date(sess.loginAt).getTime() < staleCutoff)
                ? { ...sess, active: false }
                : sess
            ),
        }))
      },

      // ── API fetch methods ─────────────────────────────────────────────

      fetchLoginHistory: async (opts = {}) => {
        const { page = 1, pageSize = 50, search = '', role = '', activeOnly = false } = opts
        set({ loginLoading: true, loginError: null })
        try {
          const params = new URLSearchParams({ page, page_size: pageSize })
          if (search) params.set('search', search)
          if (role) params.set('role', role)
          if (activeOnly) params.set('active_only', 'true')

          const data = await api.get(`/activity/logins?${params}`)
          // Support both { items, total, page } and a plain array response
          const items = Array.isArray(data) ? data : (data?.items || data?.sessions || [])
          const total = Array.isArray(data) ? data.length : (data?.total ?? items.length)
          set({
            loginHistory: items,
            loginTotal: total,
            loginPage: Array.isArray(data) ? 1 : (data?.page || 1),
            loginLoading: false,
            loginFromLocal: false,
          })
        } catch (e) {
          console.error('fetchLoginHistory error', e)
          // Fall back to local sessions persisted in this browser
          const localSessions = get().sessions
          const normalized = localSessions.map(s => ({
            id:            s.id,
            user_name:     s.userName,
            user_email:    s.email,
            user_role:     s.userRole,
            browser:       s.browser,
            os:            s.os,
            ip_address:    s.ip,
            logged_in_at:  s.loginAt,
            logged_out_at: s.logoutAt,
            is_active:     s.active,
          }))
          set({
            loginLoading: false,
            loginError: e.message || 'Failed to load login history from server',
            loginHistory: normalized,
            loginTotal: normalized.length,
            loginPage: 1,
            loginFromLocal: true,
          })
        }
      },

      fetchModifications: async (opts = {}) => {
        const { page = 1, pageSize = 50, search = '', action = '', agentName = '' } = opts
        set({ modLoading: true, modError: null })
        try {
          const params = new URLSearchParams({ page, page_size: pageSize })
          if (search) params.set('search', search)
          if (action) params.set('action', action)
          if (agentName) params.set('agent_name', agentName)

          const data = await api.get(`/activity/modifications?${params}`)
          // Support both { items, total, page } and a plain array response
          const items = Array.isArray(data) ? data : (data?.items || data?.activities || data?.history || [])
          const total = Array.isArray(data) ? data.length : (data?.total ?? items.length)
          set({
            modifications: items,
            modTotal: total,
            modPage: Array.isArray(data) ? 1 : (data?.page || 1),
            modLoading: false,
          })
        } catch (e) {
          console.error('fetchModifications error', e)
          set({
            modLoading: false,
            modError: e.message || 'Failed to load modification history from server',
          })
        }
      },

      fetchAgentSummary: async () => {
        try {
          const data = await api.get('/activity/agent-summary')
          set({ agentSummary: Array.isArray(data) ? data : [] })
        } catch (e) {
          console.error('fetchAgentSummary error', e)
        }
      },
    }),
    {
      name: 'helpdesk-activity',
      // Only persist the local session list — API data is always fresh
      partialize: (s) => ({ sessions: s.sessions }),
    }
  )
)
