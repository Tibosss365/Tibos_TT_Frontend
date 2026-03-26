import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SEED_TICKETS } from '../data/seedData'
import { genId } from '../utils/ticketUtils'

export const useTicketStore = create(
  persist(
    (set, get) => ({
      tickets: SEED_TICKETS,
      filters: { status: '', priority: '', category: '', sort: 'newest', search: '' },
      selectedIds: [],

      addTicket: (data) => {
        const tickets = get().tickets
        const now = new Date().toISOString()
        const ticket = {
          ...data,
          id: genId(tickets),
          created: now,
          updated: now,
          timeline: [
            { type: 'created', text: `Ticket submitted by <strong>${data.contactName}</strong>`, ts: now },
          ],
        }
        set({ tickets: [ticket, ...tickets] })
        return ticket
      },

      updateTicket: (id, changes) => {
        set(state => ({
          tickets: state.tickets.map(t =>
            t.id === id ? { ...t, ...changes, updated: new Date().toISOString() } : t
          ),
        }))
      },

      addTimelineEvent: (id, event) => {
        set(state => ({
          tickets: state.tickets.map(t =>
            t.id === id
              ? { ...t, timeline: [...(t.timeline || []), { ...event, ts: new Date().toISOString() }], updated: new Date().toISOString() }
              : t
          ),
        }))
      },

      deleteTicket: (id) => {
        set(state => ({ tickets: state.tickets.filter(t => t.id !== id) }))
      },

      bulkUpdate: (ids, changes) => {
        const now = new Date().toISOString()
        set(state => ({
          tickets: state.tickets.map(t =>
            ids.includes(t.id) ? { ...t, ...changes, updated: now } : t
          ),
          selectedIds: [],
        }))
      },

      bulkDelete: (ids) => {
        set(state => ({
          tickets: state.tickets.filter(t => !ids.includes(t.id)),
          selectedIds: [],
        }))
      },

      setFilter: (key, value) => {
        set(state => ({ filters: { ...state.filters, [key]: value } }))
      },

      resetFilters: () => {
        set({ filters: { status: '', priority: '', category: '', sort: 'newest', search: '' } })
      },

      toggleSelect: (id) => {
        set(state => ({
          selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter(i => i !== id)
            : [...state.selectedIds, id],
        }))
      },

      selectAll: (ids) => set({ selectedIds: ids }),
      clearSelection: () => set({ selectedIds: [] }),

      resetToSeed: () => set({ tickets: SEED_TICKETS, selectedIds: [] }),

      getFilteredTickets: () => {
        const { tickets, filters } = get()
        let result = [...tickets]
        if (filters.status)   result = result.filter(t => t.status === filters.status)
        if (filters.priority) result = result.filter(t => t.priority === filters.priority)
        if (filters.category) result = result.filter(t => t.category === filters.category)
        if (filters.search) {
          const q = filters.search.toLowerCase()
          result = result.filter(t =>
            t.subject.toLowerCase().includes(q) ||
            t.id.toLowerCase().includes(q) ||
            t.submitter.toLowerCase().includes(q) ||
            t.category.toLowerCase().includes(q)
          )
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
