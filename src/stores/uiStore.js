import { create } from 'zustand'
import { persist } from 'zustand/middleware'

let toastId = 0

export const useUiStore = create(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      isDark: true,
      toasts: [],
      activeModal: null,   // { type: 'ticket', data: ticketObj }

      toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),

      toggleTheme: () => {
        const next = !get().isDark
        document.documentElement.classList.toggle('dark', next)
        set({ isDark: next })
      },

      openModal: (type, data = null) => set({ activeModal: { type, data } }),
      closeModal: () => set({ activeModal: null }),

      addToast: (message, type = 'success') => {
        const id = ++toastId
        set(s => ({ toasts: [...s.toasts, { id, message, type }] }))
        setTimeout(() => {
          set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
        }, 4000)
      },

      removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
    }),
    {
      name: 'helpdesk-ui',
      partialize: (state) => ({ sidebarOpen: state.sidebarOpen, isDark: state.isDark }),
    }
  )
)
