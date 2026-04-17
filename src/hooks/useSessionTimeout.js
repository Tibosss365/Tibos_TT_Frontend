/**
 * useSessionTimeout
 *
 * Tracks user activity and auto-logs-out after `sessionTimeoutMinutes`
 * minutes of inactivity.  A value of 0 means "Never" — no timer is set.
 *
 * Attach once in App.jsx (inside the router, so it runs on all routes).
 */
import { useEffect, useRef, useCallback } from 'react'
import { useAdminStore } from '../stores/adminStore'
import { useUserStore }  from '../stores/userStore'

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']

export function useSessionTimeout() {
  const sessionTimeoutMinutes = useAdminStore(s => s.systemSettings?.sessionTimeoutMinutes ?? 480)
  const isLoggedIn            = useUserStore(s => s.isLoggedIn)
  const timerRef              = useRef(null)

  const forceLogout = useCallback(() => {
    localStorage.removeItem('helpdesk-user')
    localStorage.removeItem('helpdesk-tickets')
    localStorage.removeItem('helpdesk-admin')
    window.location.href = '/login'
  }, [])

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!isLoggedIn || sessionTimeoutMinutes === 0) return
    timerRef.current = setTimeout(forceLogout, sessionTimeoutMinutes * 60 * 1000)
  }, [isLoggedIn, sessionTimeoutMinutes, forceLogout])

  useEffect(() => {
    if (!isLoggedIn || sessionTimeoutMinutes === 0) {
      if (timerRef.current) clearTimeout(timerRef.current)
      return
    }

    // Start timer immediately
    resetTimer()

    // Restart on any user interaction
    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, resetTimer, { passive: true }))

    return () => {
      ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, resetTimer))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isLoggedIn, sessionTimeoutMinutes, resetTimer])
}
