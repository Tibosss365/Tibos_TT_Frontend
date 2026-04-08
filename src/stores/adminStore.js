import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../api/client'
import { DEFAULT_AGENTS, DEFAULT_SLA, DEFAULT_EMAIL_CONFIG, DEFAULT_EMAIL_TRIGGERS, DEFAULT_INBOUND_EMAIL, DEFAULT_EMAIL_LOG, DEFAULT_CATEGORIES, DEFAULT_TICKET_SETTINGS, DEFAULT_EMAIL_TEMPLATES, DEFAULT_GROUPS } from '../data/seedData'

export const useAdminStore = create(
  persist(
    (set, get) => ({
      companyProfile: {
        name: 'HelpdeskPro',
        website: '',
        phone: '',
        address: '',
        logo: null,
      },

      updateCompanyProfile: (changes) => {
        set(s => ({ companyProfile: { ...s.companyProfile, ...changes } }))
      },

      groups: DEFAULT_GROUPS,
      ticketSettings: DEFAULT_TICKET_SETTINGS,
      emailTemplates: DEFAULT_EMAIL_TEMPLATES,

      addGroup: (group) => {
        const id = 'grp-' + Date.now()
        set(s => ({ groups: [...s.groups, { ...group, id, isBuiltin: false }] }))
      },
      updateGroup: (id, changes) => {
        set(s => ({ groups: s.groups.map(g => g.id === id ? { ...g, ...changes } : g) }))
      },
      deleteGroup: (id) => {
        set(s => ({ groups: s.groups.filter(g => g.id !== id || g.isBuiltin) }))
      },
      getGroupById:  (id) => get().groups.find(g => g.id === id),
      getGroupName:  (id) => { const g = get().groups.find(g => g.id === id); return g ? g.name : '—' },

      updateTicketSettings: (changes) => {
        set(s => ({ ticketSettings: { ...s.ticketSettings, ...changes } }))
      },

      updateEmailTemplate: (key, changes) => {
        set(s => ({
          emailTemplates: {
            ...s.emailTemplates,
            [key]: { ...s.emailTemplates[key], ...changes },
          },
        }))
      },

        agents: DEFAULT_AGENTS,
      slaSettings: DEFAULT_SLA,
      emailConfig: DEFAULT_EMAIL_CONFIG,
      emailTriggers: DEFAULT_EMAIL_TRIGGERS,
      inboundEmail: DEFAULT_INBOUND_EMAIL,
      emailLog: DEFAULT_EMAIL_LOG,
      categories: DEFAULT_CATEGORIES,

  fetchAgents: async () => {
    try {
      const data = await api.get('/agents')
      set({ agents: data })
    } catch (e) {
      console.error('fetchAgents error', e)
    }
  },

  fetchSla: async () => {
    try {
      const data = await api.get('/admin/sla')
      set({
        slaSettings: {
          critical:      data.critical_hours,
          high:          data.high_hours,
          medium:        data.medium_hours,
          low:           data.low_hours,
          timerStart:    data.timer_start    || 'on_creation',
          countdownMode: data.countdown_mode || '24_7',
          workDays:      data.work_days      || [0,1,2,3,4],
          workStart:     data.work_start     || '09:00',
          workEnd:       data.work_end       || '20:00',
          pauseOn:       data.pause_on       || ['on-hold'],
        },
      })
    } catch (e) {
      console.error('fetchSla error', e)
    }
  },

  fetchEmailConfig: async () => {
    try {
      const data = await api.get('/admin/email')
      set({ emailConfig: data })
    } catch (e) {
      console.error('fetchEmailConfig error', e)
    }
  },

  fetchCategories: async () => {
    try {
      const data = await api.get('/categories')
      const cats = data.map((c, i) => ({
        id:          c.slug,
        name:        c.name,
        color:       c.color || '#6B7280',
        description: c.description || '',
        isBuiltin:   c.is_builtin,
        sortOrder:   c.sort_order ?? (i + 1) * 10,
        groupId:     c.group_id || null,
      }))
      set({ categories: cats })
    } catch (e) {
      console.error('fetchCategories error', e)
    }
  },

  fetchGroups: async () => {
    try {
      const data = await api.get('/groups')
      if (!Array.isArray(data) || data.length === 0) return
      const grps = data.map(g => ({
        id:          String(g.id),          // use the backend numeric ID as string
        name:        g.name,
        description: g.description || '',
        color:       g.color || '#6B7280',
        isBuiltin:   g.is_builtin ?? true,
      }))
      set({ groups: grps })
    } catch (e) {
      // Non-fatal: fall back to DEFAULT_GROUPS already in state
      console.error('fetchGroups error', e)
    }
  },

  addAgent: async (agentData) => {
    const initials = agentData.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    const body = {
      name:      agentData.name,
      initials,
      group:     agentData.group,
      username:  agentData.username,
      password:  agentData.password,
      role:      agentData.role || 'technician',
    }
    const data = await api.post('/agents', body)
    set(s => ({ agents: [...s.agents, data] }))
    return data
  },

  updateAgent: async (id, changes) => {
    const data = await api.patch(`/agents/${id}`, changes)
    set(s => ({ agents: s.agents.map(a => String(a.id) === String(id) ? { ...a, ...data } : a) }))
    return data
  },

  deleteAgent: async (id) => {
    await api.delete(`/agents/${id}`)
    set(s => ({ agents: s.agents.filter(a => String(a.id) !== String(id)) }))
  },

  updateSla: async (slaValues) => {
    const body = {
      critical_hours:  Number(slaValues.critical),
      high_hours:      Number(slaValues.high),
      medium_hours:    Number(slaValues.medium),
      low_hours:       Number(slaValues.low),
      timer_start:     slaValues.timerStart    || 'on_creation',
      countdown_mode:  slaValues.countdownMode || '24_7',
      work_days:       slaValues.workDays      || [0,1,2,3,4],
      work_start:      slaValues.workStart     || '09:00',
      work_end:        slaValues.workEnd       || '20:00',
      pause_on:        slaValues.pauseOn       || ['on-hold'],
    }
    const data = await api.put('/admin/sla', body)
    set({
      slaSettings: {
        critical:      data.critical_hours,
        high:          data.high_hours,
        medium:        data.medium_hours,
        low:           data.low_hours,
        timerStart:    data.timer_start    || 'on_creation',
        countdownMode: data.countdown_mode || '24_7',
        workDays:      data.work_days      || [0,1,2,3,4],
        workStart:     data.work_start     || '09:00',
        workEnd:       data.work_end       || '20:00',
        pauseOn:       data.pause_on       || ['on-hold'],
      },
    })
  },

  updateEmailConfig: async (payload) => {
    const data = await api.put('/admin/email', payload)
    set({ emailConfig: data })
  },

      updateEmailTriggers: (changes) => {
        set(s => ({ emailTriggers: { ...s.emailTriggers, ...changes } }))
      },

      updateInboundEmail: (changes) => {
        set(s => ({ inboundEmail: { ...s.inboundEmail, ...changes } }))
      },

      addEmailLogEntry: (entry) => {
        set(s => ({ emailLog: [entry, ...s.emailLog].slice(0, 100) }))
      },

      clearEmailLog: () => set({ emailLog: [] }),

      // ── Category actions ──────────────────────────────────────────────
      addCategory: (cat) => {
        const id = cat.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        const maxOrder = get().categories.reduce((m, c) => Math.max(m, c.sortOrder), 0)
        set(s => ({
          categories: [
            ...s.categories,
            { ...cat, id, isBuiltin: false, sortOrder: maxOrder + 10 }
          ]
        }))
        return id
      },

      updateCategory: (id, changes) => {
        set(s => ({
          categories: s.categories.map(c => c.id === id ? { ...c, ...changes } : c)
        }))
      },

      deleteCategory: (id) => {
        set(s => ({
          categories: s.categories.filter(c => c.id !== id || c.isBuiltin)
        }))
      },

      getCategoryById: (id) => get().categories.find(c => c.id === id),
      getCategoryName: (id) => {
        const c = get().categories.find(cat => cat.id === id)
        return c ? c.name : id
      },

      resetAgents: () => set({ agents: DEFAULT_AGENTS }),

      getAgentById: (id) => get().agents.find(a => String(a.id) === String(id)),
      getAgentName: (id) => {
        if (!id || id === 'unassigned') return '—'
        const a = get().agents.find(ag => String(ag.id) === String(id))
        return a ? a.name : '—'
      },
    }),
    { name: 'helpdesk-admin' }
  )
)
