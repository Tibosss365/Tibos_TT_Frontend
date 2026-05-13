import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
        // Prepend new session and drop anything older than 30 days
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

      // Mark sessions with no logout older than 24 h as inactive
      // AND hard-delete anything beyond 30 days
      purgeStale: () => {
        const staleCutoff  = Date.now() - 24 * 60 * 60 * 1000
        set(s => ({
          sessions: s.sessions
            .filter(sess => isWithin30Days(sess.loginAt))          // hard-delete >30 days
            .map(sess =>
              (sess.active && new Date(sess.loginAt).getTime() < staleCutoff)
                ? { ...sess, active: false }                       // mark stale as inactive
                : sess
            ),
        }))
      },
    }),
    { name: 'helpdesk-activity' }
  )
)
