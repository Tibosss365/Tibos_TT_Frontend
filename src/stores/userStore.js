import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../api/client'
import { useActivityStore } from './activityStore'

export const useUserStore = create(
  persist(
    (set, get) => ({
      currentUser:    null,
      token:          null,
      isLoggedIn:     false,
      loginSessionId: null,
      dbSessionId:    null,

      login: async (username, password) => {
        try {
          const data = await api.post('/auth/login', { username, password })
          if (!data?.access_token) throw new Error('Invalid response from server')
          set({ currentUser: data.user, token: data.access_token, isLoggedIn: true })
          // Record login session in localStorage (for local tab tracking)
          const sessionId = useActivityStore.getState().recordLogin(
            data.user,
            data.client_ip || null
          )
          // Also persist the DB session ID so logout can mark it ended
          set({ loginSessionId: sessionId, dbSessionId: data.session_id || null })
          return { success: true, role: data.user?.role }
        } catch (e) {
          return { success: false, error: e.message }
        }
      },

      logout: async () => {
        const { loginSessionId, dbSessionId } = get()
        // Mark local (browser) session ended
        useActivityStore.getState().recordLogout(loginSessionId)
        // Mark DB session ended (best-effort, don't block logout if it fails)
        try {
          await api.post('/auth/logout', { session_id: dbSessionId || null })
        } catch (_) { /* ignore */ }
        set({ currentUser: null, token: null, isLoggedIn: false, loginSessionId: null, dbSessionId: null })
      },

      // Called after a successful SSO callback — token + user come from URL params
      setFromSSO: (token, user) => {
        set({ token, currentUser: user, isLoggedIn: true })
        const sessionId = useActivityStore.getState().recordLogin(user)
        set({ loginSessionId: sessionId })
      },
    }),
    {
      name: 'helpdesk-user',
      partialize: (s) => ({
        token:          s.token,
        currentUser:    s.currentUser,
        isLoggedIn:     s.isLoggedIn,
        loginSessionId: s.loginSessionId,
        dbSessionId:    s.dbSessionId,
      }),
    }
  )
)
