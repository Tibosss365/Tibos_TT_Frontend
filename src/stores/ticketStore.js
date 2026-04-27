import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, normalizeTicket } from '../api/client'

export const useTicketStore = create(
  persist(
    (set, get) => ({
      tickets: [],
      myRequests: [],
      loading: false,
      filters: { status: '', priority: '', category: '', group: '', type: '', sort: 'newest', search: '', assignee: '', dateFrom: '', dateTo: '', dateField: 'created' },
      selectedIds: [],

      // ── API Methods ────────────────────────────────────────────────────────

      fetchTickets: async () => {
        set({ loading: true })
        try {
          let allTickets = []
          let page = 1
          while (true) {
            const data = await api.get(`/tickets?page=${page}&page_size=100`)
            const items = (data.items || []).map(normalizeTicket)
            allTickets = [...allTickets, ...items]
            if (page >= (data.pages || 1) || items.length === 0) break
            page++
          }
          set({ tickets: allTickets, loading: false })
        } catch (e) {
          console.error('fetchTickets error', e)
          set({ loading: false })
        }
      },

      fetchMyRequests: async () => {
        set({ loading: true })
        try {
          const data = await api.get('/tickets/my-requests?page_size=100')
          const items = (data.items || []).map(normalizeTicket)
          set({ myRequests: items, loading: false })
        } catch (e) {
          console.error('fetchMyRequests error', e)
          set({ loading: false })
        }
      },

      addTicket: async (formData) => {
        const body = {
          subject:        formData.subject,
          category:       formData.category,
          priority:       formData.priority,
          submitter_name: formData.contactName || formData.submitter || '',
          company:        formData.company || '',
          contact_name:   formData.contactName || '',
          email:          formData.email || '',
          phone:          formData.phone || null,
          asset:          formData.asset || null,
          description:    formData.description,
          assignee_id:    formData.assignee || null,
          group_id:       formData.group_id || null
        }
        const data = await api.post('/tickets', body)
        const ticket = normalizeTicket(data)
        // For end-users, add to myRequests; for agents add to tickets
        set(s => ({
          tickets: [ticket, ...s.tickets],
          myRequests: [ticket, ...s.myRequests],
        }))
        return ticket
      },

      updateTicket: async (uuid, changes) => {
        const body = {}
        if (changes.subject      !== undefined) body.subject      = changes.subject
        if (changes.category     !== undefined) body.category     = changes.category
        if (changes.priority     !== undefined) body.priority     = changes.priority
        if (changes.status       !== undefined) body.status       = changes.status
        if (changes.assignee     !== undefined) body.assignee_id  = changes.assignee || null
        if (changes.company      !== undefined) body.company      = changes.company
        if (changes.submitter    !== undefined) body.contact_name = changes.submitter
        if (changes.email        !== undefined) body.email        = changes.email
        if (changes.asset        !== undefined) body.asset        = changes.asset
        if (changes.description  !== undefined) body.description  = changes.description
        if (changes.resolution   !== undefined) body.resolution   = changes.resolution
        if (changes.group        !== undefined) body.group_id     = changes.group || null
        const data = await api.patch(`/tickets/${uuid}`, body)
        const updated = normalizeTicket(data)
        set(s => ({ tickets: s.tickets.map(t => t._uuid === uuid ? updated : t) }))
        return updated
      },

      deleteTicket: async (uuid) => {
        await api.delete(`/tickets/${uuid}`)
        set(s => ({ tickets: s.tickets.filter(t => t._uuid !== uuid) }))
      },

      fetchTicket: async (uuid) => {
        try {
          const data = await api.get(`/tickets/${uuid}`)
          const updated = normalizeTicket(data)
          set(s => ({ tickets: s.tickets.map(t => t._uuid === uuid ? { ...t, ...updated } : t) }))
          return updated
        } catch (e) {
          console.error('fetchTicket error', e)
        }
      },

      addTimelineEvent: async (uuid, event) => {
        const data = await api.post(`/tickets/${uuid}/comments`, {
          text: event.text,
          send_to_customer: event.sendToCustomer ?? false,
        })
        const updated = normalizeTicket(data)
        set(s => ({ tickets: s.tickets.map(t => t._uuid === uuid ? updated : t) }))
        return updated
      },

      bulkUpdate: async (uuids, changes) => {
        const action = changes.status === 'resolved' ? 'resolve' : 'close'
        await api.post('/tickets/bulk', { ticket_ids: uuids, action })
        await get().fetchTickets()
        set({ selectedIds: [] })
      },

      bulkDelete: async (uuids) => {
        await api.post('/tickets/bulk', { ticket_ids: uuids, action: 'delete' })
        set(s => ({ tickets: s.tickets.filter(t => !uuids.includes(t._uuid)), selectedIds: [] }))
      },

      // ── Tasks ──────────────────────────────────────────────────────────────
      addTask: (ticketId, task) => {
        const id = 'task-' + Date.now()
        set(s => ({ tickets: s.tickets.map(t => t.id === ticketId
          ? { ...t, tasks: [...(t.tasks||[]), { ...task, id, done: false, createdAt: new Date().toISOString() }], updated: new Date().toISOString() }
          : t) }))
      },
      toggleTask: (ticketId, taskId) => {
        set(s => ({ tickets: s.tickets.map(t => t.id === ticketId
          ? { ...t, tasks: (t.tasks||[]).map(tk => tk.id === taskId ? { ...tk, done: !tk.done } : tk), updated: new Date().toISOString() }
          : t) }))
      },
      deleteTask: (ticketId, taskId) => {
        set(s => ({ tickets: s.tickets.map(t => t.id === ticketId
          ? { ...t, tasks: (t.tasks||[]).filter(tk => tk.id !== taskId), updated: new Date().toISOString() }
          : t) }))
      },

      // ── Work Log ───────────────────────────────────────────────────────────
      addWorkLog: (ticketId, entry) => {
        const id = 'wl-' + Date.now()
        set(s => ({ tickets: s.tickets.map(t => t.id === ticketId
          ? { ...t, workLog: [...(t.workLog||[]), { ...entry, id, ts: new Date().toISOString() }], updated: new Date().toISOString() }
          : t) }))
      },
      deleteWorkLog: (ticketId, entryId) => {
        set(s => ({ tickets: s.tickets.map(t => t.id === ticketId
          ? { ...t, workLog: (t.workLog||[]).filter(w => w.id !== entryId), updated: new Date().toISOString() }
          : t) }))
      },

      // ── Reminders ──────────────────────────────────────────────────────────
      addReminder: (ticketId, reminder) => {
        const id = 'rem-' + Date.now()
        set(s => ({ tickets: s.tickets.map(t => t.id === ticketId
          ? { ...t, reminders: [...(t.reminders||[]), { ...reminder, id, done: false }], updated: new Date().toISOString() }
          : t) }))
      },
      toggleReminder: (ticketId, remId) => {
        set(s => ({ tickets: s.tickets.map(t => t.id === ticketId
          ? { ...t, reminders: (t.reminders||[]).map(r => r.id === remId ? { ...r, done: !r.done } : r), updated: new Date().toISOString() }
          : t) }))
      },
      deleteReminder: (ticketId, remId) => {
        set(s => ({ tickets: s.tickets.map(t => t.id === ticketId
          ? { ...t, reminders: (t.reminders||[]).filter(r => r.id !== remId), updated: new Date().toISOString() }
          : t) }))
      },

      // ── Approvals ──────────────────────────────────────────────────────────
      addApproval: (ticketId, approval) => {
        const id = 'appr-' + Date.now()
        set(s => ({ tickets: s.tickets.map(t => t.id === ticketId
          ? { ...t, approvals: [...(t.approvals||[]), { ...approval, id, status: 'pending', ts: new Date().toISOString() }], updated: new Date().toISOString() }
          : t) }))
      },
      updateApprovalStatus: (ticketId, approvalId, status) => {
        set(s => ({ tickets: s.tickets.map(t => t.id === ticketId
          ? { ...t, approvals: (t.approvals||[]).map(a => a.id === approvalId ? { ...a, status, resolvedAt: new Date().toISOString() } : a), updated: new Date().toISOString() }
          : t) }))
      },

      // ── Filters & Selection ────────────────────────────────────────────────
      setFilter: (key, value) => {
        set(s => ({ filters: { ...s.filters, [key]: value } }))
      },

      resetFilters: () => {
        set({ filters: { status: '', priority: '', category: '', group: '', type: '', sort: 'newest', search: '', assignee: '', dateFrom: '', dateTo: '', dateField: 'created' } })
      },

      toggleSelect: (uuid) => {
        set(s => ({
          selectedIds: s.selectedIds.includes(uuid)
            ? s.selectedIds.filter(i => i !== uuid)
            : [...s.selectedIds, uuid],
        }))
      },

      selectAll: (uuids) => set({ selectedIds: uuids }),
      clearSelection: () => set({ selectedIds: [] }),

      getFilteredTickets: () => {
        const { tickets, filters } = get()
        let result = [...tickets]
        if (filters.status)   result = result.filter(t => t.status === filters.status)
        if (filters.priority) result = result.filter(t => t.priority === filters.priority)
        if (filters.category) result = result.filter(t => t.category === filters.category)
        if (filters.group)    result = result.filter(t => t.group === filters.group)
        if (filters.type)     result = result.filter(t => t.type === filters.type)
        if (filters.search) {
          const q = filters.search.toLowerCase()
          result = result.filter(t =>
            (t.subject || '').toLowerCase().includes(q) ||
            (t.id || '').toLowerCase().includes(q) ||
            (t.submitter || '').toLowerCase().includes(q) ||
            (t.category || '').toLowerCase().includes(q)
          )
        }
        if (filters.assignee) result = result.filter(t => t.assignee === filters.assignee)
        if (filters.dateFrom || filters.dateTo) {
          const field = filters.dateField || 'created'
          const from = filters.dateFrom ? new Date(filters.dateFrom) : null
          const to   = filters.dateTo   ? new Date(filters.dateTo + 'T23:59:59') : null
          result = result.filter(t => {
            const d = new Date(t[field])
            if (from && d < from) return false
            if (to   && d > to)   return false
            return true
          })
        }
        switch (filters.sort) {
          case 'oldest':   result.sort((a, b) => new Date(a.created) - new Date(b.created)); break
          case 'priority': result.sort((a, b) => ['critical','high','medium','low'].indexOf(a.priority) - ['critical','high','medium','low'].indexOf(b.priority)); break
          case 'updated':  result.sort((a, b) => new Date(b.updated) - new Date(a.updated)); break
          default:         result.sort((a, b) => new Date(b.created) - new Date(a.created))
        }
        return result
      },
    }),
    { name: 'helpdesk-tickets' }
  )
)
