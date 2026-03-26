import { create } from 'zustand'
import { persist } from 'zustand/middleware'

let notifId = 100

export const useNotificationStore = create(
  persist(
    (set, get) => ({
      notifications: [
        { id: 1, text: 'TKT-0004 — Ransomware alert: critical ticket opened', time: new Date().toISOString(), read: false, type: 'critical' },
        { id: 2, text: 'TKT-0014 — Phishing email reported by Paul Zhang', time: new Date(Date.now() - 7200000).toISOString(), read: false, type: 'warning' },
        { id: 3, text: 'TKT-0010 — Password reset resolved by Tom Bradley', time: new Date(Date.now() - 10800000).toISOString(), read: true, type: 'success' },
      ],

      addNotification: (text, type = 'info') => {
        const notif = { id: ++notifId, text, time: new Date().toISOString(), read: false, type }
        set(s => ({ notifications: [notif, ...s.notifications] }))
      },

      markRead: (id) => {
        set(s => ({
          notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n)
        }))
      },

      markAllRead: () => {
        set(s => ({ notifications: s.notifications.map(n => ({ ...n, read: true })) }))
      },

      clearAll: () => set({ notifications: [] }),

      unreadCount: () => get().notifications.filter(n => !n.read).length,
    }),
    { name: 'helpdesk-notifications' }
  )
)
