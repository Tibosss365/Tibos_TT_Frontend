import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, normalizeTicket } from '../api/client'

// Clean up legacy bloated tickets payload from localStorage to immediately free storage quota
try {
  const legacy = localStorage.getItem('helpdesk-tickets')
  if (legacy && (legacy.includes('"tickets"') || legacy.length > 5000)) {
    localStorage.removeItem('helpdesk-tickets')
  }
} catch (_) {}

const safeTicketStorage = {
  getItem: (name) => {
    try {
      const raw = localStorage.getItem(name)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, JSON.stringify(value))
    } catch (e) {
      console.warn('[ticketStore] Storage quota exceeded or unavailable:', e)
      try {
        localStorage.removeItem(name)
      } catch (_) {}
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name)
    } catch (_) {}
  },
}

const TICKET_CACHE_TTL = 12 * 60 * 60 * 1000

function ticketCacheKey() {
  try {
    const userState = JSON.parse(localStorage.getItem('helpdesk-user') || '{}')?.state
    const userId = userState?.currentUser?.id || 'anonymous'
    return `helpdesk-ticket-snapshot:${userId}`
  } catch {
    return 'helpdesk-ticket-snapshot:anonymous'
  }
}

function readTicketSnapshot() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(ticketCacheKey()) || 'null')
    if (!cached || Date.now() - cached.savedAt > TICKET_CACHE_TTL || !Array.isArray(cached.items)) return []
    return cached.items.map(normalizeTicket)
  } catch {
    return []
  }
}

function saveTicketSnapshot(tickets) {
  try {
    const sorted = [...tickets].sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0))
    for (let size = Math.min(75, sorted.length); size > 0; size = Math.floor(size / 2)) {
      const items = sorted.slice(0, size).map(ticket => ({
        ...ticket,
        description: (ticket.description || '').slice(0, 1500),
        attachments: [],
      }))
      try {
        sessionStorage.setItem(ticketCacheKey(), JSON.stringify({ savedAt: Date.now(), items }))
        return
      } catch {
        // Reduce the snapshot until it fits the browser's session storage quota.
      }
    }
  } catch {
    // Caching is optional; live API loading continues if browser storage is unavailable.
  }
}

// Share an in-flight full refresh so bursts of live events do not start
// several identical paginated downloads at once.
let ticketsFetchPromise = null
let ticketsRefreshQueued = false

export const useTicketStore = create(
  persist(
    (set, get) => ({
      tickets: readTicketSnapshot(),
      myRequests: [],
      deletedTickets: [],
      loading: false,
      ticketsLoaded: false,
      ticketsLoadError: null,
      filters: { status: '', priority: '', category: '', group: '', type: '', sort: 'newest', search: '', assignee: '', dateFrom: '', dateTo: '', dateField: 'created', dashboardCard: '', dashboardSla: '' },
      selectedIds: [],

      // ── API Methods ────────────────────────────────────────────────────────

      fetchTickets: async () => {
        if (ticketsFetchPromise) {
          ticketsRefreshQueued = true
          return ticketsFetchPromise
        }

        const fetchAllPages = async () => {
          // Keep the cached snapshot visible until the first live page arrives,
          // then build the visible list from the server pages. Preserve only
          // local changes created while this refresh is in flight.
          const hasExistingTickets = get().tickets.length > 0
          const refreshStartedAt = Date.now()
          const initialTicketIds = new Set(get().tickets.map(ticket => String(ticket._uuid)))
          set({ loading: !hasExistingTickets, ticketsLoaded: false, ticketsLoadError: null })
          try {
            const firstPage = await api.get('/tickets?page=1&page_size=500')
            const pages = Math.max(1, Number(firstPage.pages) || 1)
            const pageData = [firstPage]
            const loadedTickets = new Map((firstPage.items || []).map(item => {
              const ticket = normalizeTicket(item)
              return [ticket._uuid, ticket]
            }))
            const publishLoadedPages = () => {
              const deletedIds = new Set(get().deletedTickets.map(ticket => ticket._uuid))
              const merged = new Map(loadedTickets)
              const changedDuringRefresh = get().tickets.filter(ticket => {
                const id = String(ticket._uuid)
                const changedAt = new Date(ticket.updated || ticket.created || 0).getTime()
                return !initialTicketIds.has(id) || changedAt > refreshStartedAt
              })
              changedDuringRefresh.forEach(ticket => {
                const id = String(ticket._uuid)
                if (deletedIds.has(id)) return
                const serverTicket = merged.get(id)
                const localUpdatedAt = new Date(ticket.updated || ticket.created || 0).getTime()
                const serverUpdatedAt = new Date(serverTicket?.updated || serverTicket?.created || 0).getTime()
                if (!serverTicket || localUpdatedAt > serverUpdatedAt) merged.set(id, ticket)
              })
              deletedIds.forEach(id => merged.delete(String(id)))
              const visibleTickets = [...merged.values()].sort(
                (a, b) => new Date(b.created || 0) - new Date(a.created || 0)
              )
              set({ tickets: visibleTickets, loading: false })
            }
            publishLoadedPages()

            // Fetch at most four pages concurrently to reduce latency without
            // flooding the API when an account has a large ticket history.
            for (let start = 2; start <= pages; start += 4) {
              const end = Math.min(start + 3, pages)
              const batch = await Promise.all(
                Array.from({ length: end - start + 1 }, (_, index) =>
                  api.get(`/tickets?page=${start + index}&page_size=500`)
                )
              )
              pageData.push(...batch)
              batch.flatMap(data => data.items || []).forEach(item => {
                const ticket = normalizeTicket(item)
                loadedTickets.set(ticket._uuid, ticket)
              })
              publishLoadedPages()
            }

            const deletedIds = new Set(get().deletedTickets.map(ticket => String(ticket._uuid)))
            const allTicketMap = new Map(
              pageData
                .flatMap(data => (data.items || []).map(normalizeTicket))
                .filter(ticket => !deletedIds.has(String(ticket._uuid)))
                .map(ticket => [String(ticket._uuid), ticket])
            )
            get().tickets.forEach(ticket => {
              const id = String(ticket._uuid)
              const changedAt = new Date(ticket.updated || ticket.created || 0).getTime()
              if (deletedIds.has(id) || (initialTicketIds.has(id) && changedAt <= refreshStartedAt)) return
              const serverTicket = allTicketMap.get(id)
              const serverUpdatedAt = new Date(serverTicket?.updated || serverTicket?.created || 0).getTime()
              if (!serverTicket || changedAt > serverUpdatedAt) allTicketMap.set(id, ticket)
            })
            const allTickets = [...allTicketMap.values()].sort(
              (a, b) => new Date(b.created || 0) - new Date(a.created || 0)
            )
            set({ tickets: allTickets, loading: false, ticketsLoaded: true, ticketsLoadError: null })
            saveTicketSnapshot(allTickets)
          } catch (e) {
            console.error('fetchTickets error', e)
            set({ loading: false, ticketsLoaded: true, ticketsLoadError: e?.message || 'Could not load ticket history.' })
          }
        }

        ticketsFetchPromise = fetchAllPages()
        try {
          await ticketsFetchPromise
        } finally {
          ticketsFetchPromise = null
          if (ticketsRefreshQueued) {
            ticketsRefreshQueued = false
            void get().fetchTickets()
          }
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
          type:              formData.type || 'request',
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
          // Only send owners when explicitly set on the form; omit otherwise so
          // the backend still auto-fills them from the company registry.
          ...(formData.owners && formData.owners.length ? { owners: formData.owners } : {}),
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
        if (changes.type         !== undefined) body.type         = changes.type
        if (changes.category     !== undefined) body.category     = changes.category
        if (changes.priority     !== undefined) body.priority     = changes.priority
        if (changes.status       !== undefined) body.status       = changes.status
        if (changes.assignee     !== undefined) {
          body.assignee_id = changes.assignee || null
        }
        if (changes.company      !== undefined) body.company      = changes.company
        if (changes.submitter    !== undefined) {
          body.contact_name = changes.submitter
          body.submitter_name = changes.submitter
        }
        if (changes.email        !== undefined) body.email        = changes.email
        if (changes.asset        !== undefined) body.asset        = changes.asset
        if (changes.description  !== undefined) body.description  = changes.description
        if (changes.resolution   !== undefined) body.resolution   = changes.resolution
        if (changes.holdReason   !== undefined) body.hold_reason  = changes.holdReason
        if (changes.resolutionCode !== undefined) body.resolution_code = changes.resolutionCode
        if (changes.group        !== undefined) body.group_id          = changes.group || null
        if (changes.source       !== undefined) body.source            = changes.source
        if (changes.tags         !== undefined) body.tags              = changes.tags
        if (changes.customFieldData !== undefined) body.custom_field_data = changes.customFieldData
        if (changes.dueDate      !== undefined) body.due_date          = changes.dueDate || null
        if (changes.owners       !== undefined) body.owners            = changes.owners || []
        const fields = {
          subject: 'subject', type: 'type', category: 'category', priority: 'priority',
          status: 'status', assignee: 'assignee', company: 'company', submitter: 'contactName',
          email: 'email', asset: 'asset', description: 'description', resolution: 'resolution',
          holdReason: 'holdReason', resolutionCode: 'resolutionCode', group: 'group', source: 'source',
          tags: 'tags', customFieldData: 'customFieldData', dueDate: 'dueDate', owners: 'owners',
        }
        const optimistic = Object.fromEntries(Object.entries(fields)
          .filter(([key]) => changes[key] !== undefined)
          .map(([key, field]) => [field, changes[key]]))
        if (changes.status === 'resolved' || changes.status === 'closed') optimistic.resolvedAt = new Date().toISOString()
        optimistic.updated = new Date().toISOString()
        const previous = get().tickets.find(t => t._uuid === uuid) || get().myRequests.find(t => t._uuid === uuid)
        const patchLists = transform => ({
          tickets: transform('tickets'),
          myRequests: transform('myRequests'),
        })
        set(s => patchLists(key => s[key].map(t => t._uuid === uuid ? { ...t, ...optimistic } : t)))
        try {
          const data = await api.patch(`/tickets/${uuid}`, body)
          const updated = normalizeTicket(data)
          // Preserve attachments already loaded in the store — PATCH response returns [] for attachments.
          set(s => patchLists(key => s[key].map(t => t._uuid === uuid
            ? { ...updated, attachments: t.attachments?.length ? t.attachments : updated.attachments }
            : t)))
          return updated
        } catch (error) {
          if (previous) {
            const rollback = Object.fromEntries(Object.keys(optimistic).map(key => [key, previous[key]]))
            set(s => patchLists(key => s[key].map(t => t._uuid === uuid ? { ...t, ...rollback } : t)))
          }
          throw error
        }
      },

      deleteTicket: async (uuid) => {
        await api.delete(`/tickets/${uuid}`)
        set(s => ({ tickets: s.tickets.filter(t => t._uuid !== uuid) }))
      },

      // ── Recycle Bin (server-backed soft delete) ───────────────────────────────
      applyRemoteDelete: (uuids, deletedAt = new Date().toISOString(), deleteReason = null) => {
        const ids = new Set((uuids || []).map(String))
        if (!ids.size) return
        set(s => {
          const moved = s.tickets.filter(ticket => ids.has(String(ticket._uuid)))
            .map(ticket => ({ ...ticket, isDeleted: true, deletedAt, deleteReason: deleteReason ?? ticket.deleteReason ?? '' }))
          const existing = new Map(s.deletedTickets.map(ticket => [String(ticket._uuid), ticket]))
          moved.forEach(ticket => existing.set(String(ticket._uuid), ticket))
          return {
            tickets: s.tickets.filter(ticket => !ids.has(String(ticket._uuid))),
            deletedTickets: [...existing.values()].sort((a, b) => new Date(b.deletedAt || 0) - new Date(a.deletedAt || 0)),
            selectedIds: s.selectedIds.filter(id => !ids.has(String(id))),
          }
        })
      },

      applyRemoteRestore: (uuids) => {
        const ids = new Set((uuids || []).map(String))
        if (!ids.size) return
        set(s => {
          const restored = s.deletedTickets.filter(ticket => ids.has(String(ticket._uuid)))
            .map(ticket => ({ ...ticket, isDeleted: false, deletedAt: null, deleteReason: '' }))
          const active = new Map(s.tickets.map(ticket => [String(ticket._uuid), ticket]))
          restored.forEach(ticket => active.set(String(ticket._uuid), ticket))
          return {
            tickets: [...active.values()],
            deletedTickets: s.deletedTickets.filter(ticket => !ids.has(String(ticket._uuid))),
          }
        })
      },

      fetchDeletedTickets: async () => {
        try {
          const data = await api.get('/tickets/deleted?page_size=100')
          const items = (data.items || []).map(normalizeTicket)
          set({ deletedTickets: items })
        } catch (e) {
          console.error('fetchDeletedTickets error', e)
        }
      },

      softDelete: async (uuid, reason = '') => {
        const ticket = get().tickets.find(t => t._uuid === uuid)
        const deletedAt = new Date().toISOString()
        get().applyRemoteDelete([uuid], deletedAt, reason)
        try {
          const query = reason ? '?reason=' + encodeURIComponent(reason) : ''
          await api.delete('/tickets/' + uuid + query)
        } catch (error) {
          if (ticket) set(s => ({
            tickets: [ticket, ...s.tickets.filter(t => t._uuid !== uuid)],
            deletedTickets: s.deletedTickets.filter(t => t._uuid !== uuid),
          }))
          throw error
        }
      },

      softBulkDelete: async (uuids, reason = '') => {
        const tickets = get().tickets.filter(t => uuids.includes(t._uuid))
        const deletedAt = new Date().toISOString()
        get().applyRemoteDelete(uuids, deletedAt, reason)
        try {
          await api.post('/tickets/bulk', { ticket_ids: uuids, action: 'delete', delete_reason: reason || undefined })
        } catch (error) {
          set(s => ({
            tickets: [...tickets, ...s.tickets.filter(t => !uuids.includes(t._uuid))],
            deletedTickets: s.deletedTickets.filter(t => !uuids.includes(t._uuid)),
          }))
          throw error
        }
      },

      restoreTicket: async (uuid) => {
        await api.post('/tickets/' + uuid + '/restore', {})
        get().applyRemoteRestore([uuid])
      },

      permanentDelete: async (uuid) => {
        await api.delete(`/tickets/${uuid}/permanent`)
        set(s => ({ deletedTickets: s.deletedTickets.filter(t => t._uuid !== uuid) }))
      },

      permanentBulkDelete: async (uuids) => {
        const results = await Promise.allSettled(
          uuids.map(uuid => api.delete(`/tickets/${uuid}/permanent`))
        )
        const deleted = uuids.filter((_, index) => results[index].status === 'fulfilled')
        const failedCount = results.length - deleted.length
        set(s => ({ deletedTickets: s.deletedTickets.filter(t => !deleted.includes(t._uuid)) }))
        if (failedCount) {
          throw new Error(`${failedCount} ticket${failedCount !== 1 ? 's' : ''} could not be permanently deleted.`)
        }
      },

      fetchTicket: async (uuid) => {
        try {
          const data = await api.get(`/tickets/${uuid}`)
          const updated = normalizeTicket(data)
          set(s => {
            const existing = s.tickets.find(t => t._uuid === uuid)
            const merged = { ...existing, ...updated, attachments: existing?.attachments?.length ? existing.attachments : updated.attachments }
            return {
              tickets: existing
                ? s.tickets.map(t => t._uuid === uuid ? merged : t)
                : [merged, ...s.tickets],
              myRequests: s.myRequests.map(t => t._uuid === uuid ? { ...t, ...updated } : t),
            }
          })
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
          cc: event.cc || undefined,
          bcc: event.bcc || undefined,
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
        await api.post('/tickets/bulk', {
          ticket_ids: uuids, action,
          ...(action === 'resolve' ? { resolution: changes.resolution, resolution_code: changes.resolutionCode || undefined } : {}),
        })
        const ids = new Set(uuids.map(String))
        const now = new Date().toISOString()
        set(s => ({
          tickets: s.tickets.map(t => ids.has(String(t._uuid)) ? {
            ...t,
            status: changes.status,
            updated: now,
            resolvedAt: now,
            ...(action === 'resolve' ? { resolution: changes.resolution, resolutionCode: changes.resolutionCode || '' } : {}),
          } : t),
          myRequests: s.myRequests.map(t => ids.has(String(t._uuid)) ? {
            ...t,
            status: changes.status,
            updated: now,
            resolvedAt: now,
            ...(action === 'resolve' ? { resolution: changes.resolution, resolutionCode: changes.resolutionCode || '' } : {}),
          } : t),
          selectedIds: [],
        }))
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
        set({ filters: { status: '', priority: '', category: '', group: '', type: '', sort: 'newest', search: '', assignee: '', dateFrom: '', dateTo: '', dateField: 'created', dashboardCard: '', dashboardSla: '' } })
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
        if (filters.assignee === 'unassigned') result = result.filter(t => !t.assignee)
        else if (filters.assignee) result = result.filter(t => String(t.assignee) === String(filters.assignee))
        const dashboardCardStatus = { open: 'open', 'in-progress': 'in-progress', 'on-hold': 'on-hold', resolved: 'resolved' }
        if (dashboardCardStatus[filters.dashboardCard]) result = result.filter(t => t.status === dashboardCardStatus[filters.dashboardCard])
        if (filters.dashboardCard === 'unassigned') result = result.filter(t => !t.assignee && t.status !== 'resolved' && t.status !== 'closed')
        if (filters.dashboardCard === 'reopened') result = result.filter(t => (t.reopenCount || 0) > 0)
        if (filters.dashboardCard === 'critical') result = result.filter(t => t.priority === 'critical')
        if (filters.dashboardCard === 'sla-overdue' || filters.dashboardSla === 'overdue') {
          let ignoredIds = {}
          try { ignoredIds = JSON.parse(localStorage.getItem('sla-ignored-ids') || '{}') } catch (_) {}
          const now = Date.now()
          result = result.filter(t => {
            const overdue = t.slaStatus === 'overdue' || (t.slaStatus === 'active' && t.slaDueTime && new Date(t.slaDueTime).getTime() < now)
            return overdue && !ignoredIds[t.id]
          })
        }
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
      storage: safeTicketStorage,
      // Never persist server-backed ticket lists to localStorage to prevent QuotaExceededError
      partialize: (s) => ({
        filters: s.filters,
      }),
    }
  )
)
