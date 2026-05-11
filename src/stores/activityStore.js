import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

export const useActivityStore = create(
  persist(
    (set, get) => ({
      sessions: [],

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
        set(s => ({ sessions: [session, ...s.sessions].slice(0, 1000) }))
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

      // Sessions with no logout older than 24 h are considered expired
      purgeStale: () => {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000
        set(s => ({
          sessions: s.sessions.map(sess =>
            (sess.active && new Date(sess.loginAt).getTime() < cutoff)
              ? { ...sess, active: false }
              : sess
          ),
        }))
      },
    }),
    { name: 'helpdesk-activity' }
  )
)
