import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../api/client'

export const useUserStore = create(
  persist(
    (set) => ({
      currentUser: null,
      token: null,
      isLoggedIn: false,

      login: async (username, password) => {
        try {
          const data = await api.post('/auth/login', { username, password })
          set({ currentUser: data.user, token: data.access_token, isLoggedIn: true })
          return { success: true }
        } catch (e) {
          return { success: false, error: e.message }
        }
      },

      logout: () => {
        set({ currentUser: null, token: null, isLoggedIn: false })
      },

      // Called after a successful SSO callback — token + user come from URL params
      setFromSSO: (token, user) => {
        set({ token, currentUser: user, isLoggedIn: true })
      },
    }),
    {
      name: 'helpdesk-user',
      partialize: (s) => ({ token: s.token, currentUser: s.currentUser, isLoggedIn: s.isLoggedIn }),
    }
  )
)
