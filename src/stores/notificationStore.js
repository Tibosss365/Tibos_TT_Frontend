import { create } from 'zustand'
import { api } from '../api/client'

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  pendingApprovals: [],

  // ── Approval requests (notification-bar "Approval Requests" tab) ────────────
  fetchPendingApprovals: async () => {
    try {
      const data = await api.get('/tickets/approvals/pending')
      set({ pendingApprovals: Array.isArray(data) ? data : [] })
    } catch (e) {
      console.error('fetchPendingApprovals error', e)
    }
  },

  decideApproval: async (ticketUuid, approvalId, status) => {
    try {
      await api.post(`/tickets/${ticketUuid}/approvals/${approvalId}/decision`, { status })
      // Remove the resolved request from the list immediately.
      set(s => ({ pendingApprovals: s.pendingApprovals.filter(a => a.approval_id !== approvalId) }))
    } catch (e) {
      console.error('decideApproval error', e)
      throw e
    }
  },

  fetchNotifications: async () => {
    try {
      const data = await api.get('/notifications')
      set({
        notifications: (data.items || []).map(n => ({
          id:   String(n.id),
          text: n.text,
          time: n.created_at,
          read: n.read,
          type: n.type,
          isApproval: !!n.is_approval,
        })),
        unreadCount: data.unread_count,
      })
    } catch (e) {
      console.error('fetchNotifications error', e)
    }
  },

  addNotification: (text, type = 'info', isApproval = false) => {
    const notif = { id: `local-${Date.now()}`, text, time: new Date().toISOString(), read: false, type, isApproval }
    set(s => ({
      // Keep approval requests pinned at the top of the list.
      notifications: isApproval
        ? [notif, ...s.notifications]
        : [...s.notifications.filter(n => n.isApproval), notif, ...s.notifications.filter(n => !n.isApproval)],
      unreadCount: s.unreadCount + 1,
    }))
  },

  markRead: async (id) => {
    if (String(id).startsWith('local-')) {
      set(s => ({
        notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
        unreadCount: Math.max(0, s.unreadCount - 1),
      }))
      return
    }
    try {
      await api.patch(`/notifications/${id}/read`, {})
      set(s => ({
        notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
        unreadCount: Math.max(0, s.unreadCount - 1),
      }))
    } catch (e) {
      console.error('markRead error', e)
    }
  },

  markAllRead: async () => {
    try {
      await api.patch('/notifications/read-all', {})
      set(s => ({
        notifications: s.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0,
      }))
    } catch (e) {
      console.error('markAllRead error', e)
    }
  },

  // Clears regular notifications only — approval requests stay pinned.
  clearAll: async () => {
    try {
      await api.delete('/notifications')
      set(s => {
        const kept = s.notifications.filter(n => n.isApproval)
        return { notifications: kept, unreadCount: kept.filter(n => !n.read).length }
      })
    } catch (e) {
      console.error('clearAll error', e)
    }
  },
}))
