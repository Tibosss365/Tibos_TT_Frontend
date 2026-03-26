import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_AGENTS, DEFAULT_SLA, DEFAULT_EMAIL_CONFIG, DEFAULT_EMAIL_TRIGGERS } from '../data/seedData'

export const useAdminStore = create(
  persist(
    (set, get) => ({
      agents: DEFAULT_AGENTS,
      slaSettings: DEFAULT_SLA,
      emailConfig: DEFAULT_EMAIL_CONFIG,
      emailTriggers: DEFAULT_EMAIL_TRIGGERS,

      addAgent: (agent) => {
        const id = 'agent-' + Date.now()
        const initials = agent.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        set(s => ({
          agents: [...s.agents.filter(a => a.id !== 'unassigned'), { ...agent, id, initials }, s.agents.find(a => a.id === 'unassigned')].filter(Boolean)
        }))
      },

      deleteAgent: (id) => {
        set(s => ({ agents: s.agents.filter(a => a.id !== id) }))
      },

      updateSla: (priority, hours) => {
        set(s => ({ slaSettings: { ...s.slaSettings, [priority]: Number(hours) } }))
      },

      updateEmailConfig: (changes) => {
        set(s => ({ emailConfig: { ...s.emailConfig, ...changes } }))
      },

      updateEmailTriggers: (changes) => {
        set(s => ({ emailTriggers: { ...s.emailTriggers, ...changes } }))
      },

      resetAgents: () => set({ agents: DEFAULT_AGENTS }),

      getAgentById: (id) => get().agents.find(a => a.id === id),
      getAgentName: (id) => {
        const a = get().agents.find(ag => ag.id === id)
        return a ? a.name : '—'
      },
    }),
    { name: 'helpdesk-admin' }
  )
)
