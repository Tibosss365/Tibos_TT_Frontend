import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, normalizeTicket } from '../api/client'

export const useTicketStore = create(
  persist(
    (set, get) => ({
      tickets: [],
      myRequests: [],
      deletedTickets: [],
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
          subject:           formData.subject,
          category:          formData.category,
          priority:          formData.priority,
          submitter_name:    formData.contactName || formData.submitter || '',
          company:           formData.company || '',
          contact_name:      formData.contactName || '',
          email:             formData.email || '',
          phone:             formData.phone || null,
          asset:             formData.asset || null,
          description:       formData.description,
          assignee_id:       formData.assignee || null,
          group_id:          formData.group_id || null,
          source:            formData.source || 'portal',
          tags:              formData.tags || [],
          custom_field_data: formData.customFieldData || {},
          due_date:          formData.dueDate || null,
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
        if (changes.assignee     !== undefined) {
          body.assignee_id = changes.assignee || null
        }
        if (changes.company      !== undefined) body.company      = changes.company
        if (changes.submitter    !== undefined) body.contact_name = changes.submitter
        if (changes.email        !== undefined) body.email        = changes.email
        if (changes.asset        !== undefined) body.asset        = changes.asset
        if (changes.description  !== undefined) body.description  = changes.description
        if (changes.resolution   !== undefined) body.resolution   = changes.resolution
        if (changes.holdReason   !== undefined) body.hold_reason  = changes.holdReason
        if (changes.group        !== undefined) body.group_id          = changes.group || null
        if (changes.source       !== undefined) body.source            = changes.source
        if (changes.tags         !== undefined) body.tags              = changes.tags
        if (changes.customFieldData !== undefined) body.custom_field_data = changes.customFieldData
        if (changes.dueDate      !== undefined) body.due_date          = changes.dueDate || null
        const data = await api.patch(`/tickets/${uuid}`, body)
        const updated = normalizeTicket(data)
        // Preserve attachments already loaded in the store — PATCH response returns [] for attachments
        set(s => {
          const existing = s.tickets.find(t => t._uuid === uuid)
          const merged = { ...updated, attachments: existing?.attachments?.length ? existing.attachments : updated.attachments }
          return { tickets: s.tickets.map(t => t._uuid === uuid ? merged : t) }
        })
        return updated
      },

      deleteTicket: async (uuid) => {
        await api.delete(`/tickets/${uuid}`)
        set(s => ({ tickets: s.tickets.filter(t => t._uuid !== uuid) }))
      },

      // ── Recycle Bin (server-backed soft delete) ───────────────────────────────
      fetchDeletedTickets: async () => {
        try {
          const data = await api.get('/tickets/deleted?page_size=100')
          const items = (data.items || []).map(normalizeTicket)
          set({ deletedTickets: items })
        } catch (e) {
          console.error('fetchDeletedTickets error', e)
        }
      },

      softDelete: async (uuid) => {
        await api.delete(`/tickets/${uuid}`)
        set(s => ({ tickets: s.tickets.filter(t => t._uuid !== uuid) }))
      },

      softBulkDelete: async (uuids) => {
        await api.post('/tickets/bulk', { ticket_ids: uuids, action: 'delete' })
        set(s => ({
          tickets: s.tickets.filter(t => !uuids.includes(t._uuid)),
          selectedIds: [],
        }))
      },

      restoreTicket: async (uuid) => {
        await api.post(`/tickets/${uuid}/restore`, {})
        set(s => ({ deletedTickets: s.deletedTickets.filter(t => t._uuid !== uuid) }))
      },

      permanentDelete: async (uuid) => {
        await api.delete(`/tickets/${uuid}/permanent`)
        set(s => ({ deletedTickets: s.deletedTickets.filter(t => t._uuid !== uuid) }))
      },

      permanentBulkDelete: async (uuids) => {
        await Promise.allSettled(uuids.map(uuid => api.delete(`/tickets/${uuid}/permanent`)))
        set(s => ({ deletedTickets: s.deletedTickets.filter(t => !uuids.includes(t._uuid)) }))
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

      // ── CSAT Rating ───────────────────────────────────────────────────────────
      // Public survey uses /csat/{token} — this is for agents viewing a rating
      submitCsatRating: async (uuid, rating, comment = '') => {
        set(s => ({
          myRequests: s.myRequests.map(t =>
            t._uuid === uuid ? { ...t, csatRating: rating } : t
          ),
          tickets: s.tickets.map(t =>
            t._uuid === uuid ? { ...t, csatRating: rating } : t
          ),
        }))
      },

      // Export filtered tickets as PDF (downloads via blob)
      exportPdf: async (filters = {}) => {
        const params = new URLSearchParams()
        if (filters.search)   params.set('search', filters.search)
        if (filters.status)   params.set('status', filters.status)
        if (filters.priority) params.set('priority', filters.priority)
        if (filters.category) params.set('category', filters.category)
        if (filters.dateFrom) params.set('date_from', filters.dateFrom)
        if (filters.dateTo)   params.set('date_to', filters.dateTo)
        const qs = params.toString()
        const url = `/tickets/export-pdf${qs ? '?' + qs : ''}`
        // Use raw fetch so we get a blob
        const { API_BASE, BASE } = await import('../api/client')
        const base = API_BASE || BASE
        const rawToken = localStorage.getItem('helpdesk-user')
        const token = rawToken ? (JSON.parse(rawToken)?.state?.token ?? null) : null
        const resp = await fetch(`${base}${url}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!resp.ok) throw new Error('PDF export failed')
        const blob = await resp.blob()
        const objUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = objUrl
        a.download = 'tickets.pdf'
        a.click()
        URL.revokeObjectURL(objUrl)
      },

      addTimelineEvent: async (uuid, event) => {
        const data = await api.post(`/tickets/${uuid}/comments`, {
          text: event.text,
          send_to_customer: event.sendToCustomer ?? false,
        })
        const updated = normalizeTicket(data)
        // Preserve attachments — comment POST response returns [] for attachments
        set(s => {
          const existing = s.tickets.find(t => t._uuid === uuid)
          const merged = { ...updated, attachments: existing?.attachments?.length ? existing.attachments : updated.attachments }
          return { tickets: s.tickets.map(t => t._uuid === uuid ? merged : t) }
        })
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

      // ── Helper: push updated ticket from API response into store ───────────
      _mergeTicket: (uuid, updated) => {
        set(s => ({ tickets: s.tickets.map(t => t._uuid === uuid ? { ...t, ...updated } : t) }))
      },

      // ── Tasks (persisted to backend) ───────────────────────────────────────
      addTask: async (ticketId, task) => {
        const existing = get().tickets.find(t => t.id === ticketId)
        const id = 'task-' + Date.now()
        const newTask = { ...task, id, done: false, createdAt: new Date().toISOString() }
        const items = [...(existing?.tasks || []), newTask]
        const data = await api.put(`/tickets/${existing?._uuid}/tasks`, { items })
        get()._mergeTicket(existing?._uuid, normalizeTicket(data))
      },
      toggleTask: async (ticketId, taskId) => {
        const existing = get().tickets.find(t => t.id === ticketId)
        const items = (existing?.tasks || []).map(tk => tk.id === taskId ? { ...tk, done: !tk.done } : tk)
        const data = await api.put(`/tickets/${existing?._uuid}/tasks`, { items })
        get()._mergeTicket(existing?._uuid, normalizeTicket(data))
      },
      deleteTask: async (ticketId, taskId) => {
        const existing = get().tickets.find(t => t.id === ticketId)
        const items = (existing?.tasks || []).filter(tk => tk.id !== taskId)
        const data = await api.put(`/tickets/${existing?._uuid}/tasks`, { items })
        get()._mergeTicket(existing?._uuid, normalizeTicket(data))
      },

      // ── Work Log (persisted to backend) ───────────────────────────────────
      addWorkLog: async (ticketId, entry) => {
        const existing = get().tickets.find(t => t.id === ticketId)
        const id = 'wl-' + Date.now()
        const items = [...(existing?.workLog || []), { ...entry, id, ts: new Date().toISOString() }]
        const data = await api.put(`/tickets/${existing?._uuid}/work-log`, { items })
        get()._mergeTicket(existing?._uuid, normalizeTicket(data))
      },
      deleteWorkLog: async (ticketId, entryId) => {
        const existing = get().tickets.find(t => t.id === ticketId)
        const items = (existing?.workLog || []).filter(w => w.id !== entryId)
        const data = await api.put(`/tickets/${existing?._uuid}/work-log`, { items })
        get()._mergeTicket(existing?._uuid, normalizeTicket(data))
      },

      // ── Reminders (persisted to backend) ──────────────────────────────────
      addReminder: async (ticketId, reminder) => {
        const existing = get().tickets.find(t => t.id === ticketId)
        const id = 'rem-' + Date.now()
        const items = [...(existing?.reminders || []), { ...reminder, id, done: false }]
        const data = await api.put(`/tickets/${existing?._uuid}/reminders`, { items })
        get()._mergeTicket(existing?._uuid, normalizeTicket(data))
      },
      toggleReminder: async (ticketId, remId) => {
        const existing = get().tickets.find(t => t.id === ticketId)
        const items = (existing?.reminders || []).map(r => r.id === remId ? { ...r, done: !r.done } : r)
        const data = await api.put(`/tickets/${existing?._uuid}/reminders`, { items })
        get()._mergeTicket(existing?._uuid, normalizeTicket(data))
      },
      deleteReminder: async (ticketId, remId) => {
        const existing = get().tickets.find(t => t.id === ticketId)
        const items = (existing?.reminders || []).filter(r => r.id !== remId)
        const data = await api.put(`/tickets/${existing?._uuid}/reminders`, { items })
        get()._mergeTicket(existing?._uuid, normalizeTicket(data))
      },

      // ── Approvals (persisted to backend) ──────────────────────────────────
      addApproval: async (ticketId, approval) => {
        const existing = get().tickets.find(t => t.id === ticketId)
        const id = 'appr-' + Date.now()
        const items = [...(existing?.approvals || []), { ...approval, id, status: 'pending', ts: new Date().toISOString() }]
        const data = await api.put(`/tickets/${existing?._uuid}/approvals`, { items })
        get()._mergeTicket(existing?._uuid, normalizeTicket(data))
      },
      updateApprovalStatus: async (ticketId, approvalId, status) => {
        const existing = get().tickets.find(t => t.id === ticketId)
        const items = (existing?.approvals || []).map(a => a.id === approvalId ? { ...a, status, resolvedAt: new Date().toISOString() } : a)
        const data = await api.put(`/tickets/${existing?._uuid}/approvals`, { items })
        get()._mergeTicket(existing?._uuid, normalizeTicket(data))
      },

      // ── Linked Tickets ─────────────────────────────────────────────────────
      linkedTickets: {},

      addLink: (uuid, link) => set(s => ({
        linkedTickets: {
          ...s.linkedTickets,
          [uuid]: [...(s.linkedTickets[uuid] || []), { ...link, id: 'lnk-' + Date.now() }],
        },
      })),

      removeLink: (uuid, linkId) => set(s => ({
        linkedTickets: {
          ...s.linkedTickets,
          [uuid]: (s.linkedTickets[uuid] || []).filter(l => l.id !== linkId),
        },
      })),

      mergeTickets: async (primaryUuid, secondaryUuid, currentUserName) => {
        const { tickets, addTimelineEvent, softDelete } = get()
        const secondary = tickets.find(t => t._uuid === secondaryUuid)
        if (!secondary) return
        await addTimelineEvent(primaryUuid, {
          type: 'comment',
          text: `Merged with ticket <strong>${secondary.id}</strong>: "${secondary.subject}"`,
          author: currentUserName || 'System',
        })
        softDelete(secondaryUuid)
      },

      splitTicket: async (uuid, splitData) => {
        const { tickets, addTicket, addLink } = get()
        const primary = tickets.find(t => t._uuid === uuid)
        const newTicket = await addTicket(splitData)
        addLink(uuid, { linkedUuid: newTicket._uuid, linkedId: newTicket.id, type: 'related' })
        addLink(newTicket._uuid, { linkedUuid: uuid, linkedId: primary?.id, type: 'related' })
        return newTicket
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
    {
      name: 'helpdesk-tickets',
      partialize: (s) => {
        // eslint-disable-next-line no-unused-vars
        const { deletedTickets, ...rest } = s
        return rest
      },
    }
  )
)
