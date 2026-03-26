import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useAdminStore } from './adminStore'

export const useUserStore = create(
  persist(
    (set) => ({
      currentUser: null,
      isLoggedIn: false,

      login: (username, password) => {
        const agents = useAdminStore.getState().agents
        const user = agents.find(
          a => a.username && a.username === username && a.password === password
        )
        if (user) {
          set({ currentUser: user, isLoggedIn: true })
          return { success: true }
        }
        return { success: false, error: 'Invalid username or password' }
      },

      logout: () => {
        set({ currentUser: null, isLoggedIn: false })
      },
    }),
    { name: 'helpdesk-user' }
  )
)
