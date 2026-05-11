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

      login: async (username, password) => {
        try {
          const data = await api.post('/auth/login', { username, password })
          if (!data?.access_token) throw new Error('Invalid response from server')
          set({ currentUser: data.user, token: data.access_token, isLoggedIn: true })
          // Record login session (client_ip comes from backend if provided)
          const sessionId = useActivityStore.getState().recordLogin(
            data.user,
            data.client_ip || null
          )
          set({ loginSessionId: sessionId })
          return { success: true, role: data.user?.role }
        } catch (e) {
          return { success: false, error: e.message }
        }
      },

      logout: () => {
        const { loginSessionId } = get()
        useActivityStore.getState().recordLogout(loginSessionId)
        set({ currentUser: null, token: null, isLoggedIn: false, loginSessionId: null })
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
      }),
    }
  )
)
