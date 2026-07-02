/**
 * featureStore — manages state for the feature entities backed by migration 031/032.
 *   • Custom Fields
 *   • Ticket Templates (backend-backed)
 *   • Automation Rules
 *   • Webhook Configs
 *   • Notification Channels
 *   • Assets
 *   • Escalation Rules
 *   • Recurring Ticket Templates
 *   • Portal Branding
 */
import { create } from 'zustand'
import { api } from '../api/client'

export const useFeatureStore = create((set, get) => ({

  // ── Custom Fields ──────────────────────────────────────────────────────────
  customFields: [],
  customFieldsLoading: false,

  fetchCustomFields: async () => {
    set({ customFieldsLoading: true })
    try {
      const data = await api.get('/admin/custom-fields')
      set({ customFields: data || [] })
    } catch (e) {
      console.error('fetchCustomFields error', e)
    } finally {
      set({ customFieldsLoading: false })
    }
  },

  createCustomField: async (body) => {
    const data = await api.post('/admin/custom-fields', body)
    set(s => ({ customFields: [...s.customFields, data] }))
    return data
  },

  updateCustomField: async (id, changes) => {
    const data = await api.put(`/admin/custom-fields/${id}`, changes)
    set(s => ({ customFields: s.customFields.map(f => f.id === id ? data : f) }))
    return data
  },

  deleteCustomField: async (id) => {
    await api.delete(`/admin/custom-fields/${id}`)
    set(s => ({ customFields: s.customFields.filter(f => f.id !== id) }))
  },

  // ── Ticket Templates ───────────────────────────────────────────────────────
  ticketTemplates: [],
  ticketTemplatesLoading: false,

  fetchTicketTemplates: async () => {
    set({ ticketTemplatesLoading: true })
    try {
      const data = await api.get('/admin/ticket-templates')
      set({ ticketTemplates: data || [] })
    } catch (e) {
      console.error('fetchTicketTemplates error', e)
    } finally {
      set({ ticketTemplatesLoading: false })
    }
  },

  createTicketTemplate: async (body) => {
    const data = await api.post('/admin/ticket-templates', body)
    set(s => ({ ticketTemplates: [...s.ticketTemplates, data] }))
    return data
  },

  updateTicketTemplate: async (id, changes) => {
    const data = await api.put(`/admin/ticket-templates/${id}`, changes)
    set(s => ({ ticketTemplates: s.ticketTemplates.map(t => t.id === id ? data : t) }))
    return data
  },

  deleteTicketTemplate: async (id) => {
    await api.delete(`/admin/ticket-templates/${id}`)
    set(s => ({ ticketTemplates: s.ticketTemplates.filter(t => t.id !== id) }))
  },

  // ── Automation Rules ───────────────────────────────────────────────────────
  automationRules: [],
  automationLoading: false,

  fetchAutomationRules: async () => {
    set({ automationLoading: true })
    try {
      const data = await api.get('/admin/automation-rules')
      set({ automationRules: data || [] })
    } catch (e) {
      console.error('fetchAutomationRules error', e)
    } finally {
      set({ automationLoading: false })
    }
  },

  createAutomationRule: async (body) => {
    const data = await api.post('/admin/automation-rules', body)
    set(s => ({ automationRules: [...s.automationRules, data] }))
    return data
  },

  updateAutomationRule: async (id, changes) => {
    const data = await api.put(`/admin/automation-rules/${id}`, changes)
    set(s => ({ automationRules: s.automationRules.map(r => r.id === id ? data : r) }))
    return data
  },

  deleteAutomationRule: async (id) => {
    await api.delete(`/admin/automation-rules/${id}`)
    set(s => ({ automationRules: s.automationRules.filter(r => r.id !== id) }))
  },

  toggleAutomationRule: async (id) => {
    const rule = get().automationRules.find(r => r.id === id)
    if (!rule) return
    await get().updateAutomationRule(id, { is_active: !rule.is_active })
  },

  // ── Webhook Configs ────────────────────────────────────────────────────────
  webhooks: [],
  webhooksLoading: false,

  fetchWebhooks: async () => {
    set({ webhooksLoading: true })
    try {
      const data = await api.get('/admin/webhooks')
      set({ webhooks: data || [] })
    } catch (e) {
      console.error('fetchWebhooks error', e)
    } finally {
      set({ webhooksLoading: false })
    }
  },

  createWebhook: async (body) => {
    const data = await api.post('/admin/webhooks', body)
    set(s => ({ webhooks: [...s.webhooks, data] }))
    return data
  },

  updateWebhook: async (id, changes) => {
    const data = await api.put(`/admin/webhooks/${id}`, changes)
    set(s => ({ webhooks: s.webhooks.map(w => w.id === id ? data : w) }))
    return data
  },

  deleteWebhook: async (id) => {
    await api.delete(`/admin/webhooks/${id}`)
    set(s => ({ webhooks: s.webhooks.filter(w => w.id !== id) }))
  },

  // ── Notification Channels ──────────────────────────────────────────────────
  notificationChannels: [],
  notificationChannelsLoading: false,

  fetchNotificationChannels: async () => {
    set({ notificationChannelsLoading: true })
    try {
      const data = await api.get('/admin/notification-channels')
      set({ notificationChannels: data || [] })
    } catch (e) {
      console.error('fetchNotificationChannels error', e)
    } finally {
      set({ notificationChannelsLoading: false })
    }
  },

  createNotificationChannel: async (body) => {
    const data = await api.post('/admin/notification-channels', body)
    set(s => ({ notificationChannels: [...s.notificationChannels, data] }))
    return data
  },

  updateNotificationChannel: async (id, changes) => {
    const data = await api.put(`/admin/notification-channels/${id}`, changes)
    set(s => ({ notificationChannels: s.notificationChannels.map(c => c.id === id ? data : c) }))
    return data
  },

  deleteNotificationChannel: async (id) => {
    await api.delete(`/admin/notification-channels/${id}`)
    set(s => ({ notificationChannels: s.notificationChannels.filter(c => c.id !== id) }))
  },

  // ── Assets ────────────────────────────────────────────────────────────────
  assets: [],
  assetsLoading: false,

  fetchAssets: async () => {
    set({ assetsLoading: true })
    try {
      const data = await api.get('/admin/assets')
      set({ assets: data || [] })
    } catch (e) {
      console.error('fetchAssets error', e)
    } finally {
      set({ assetsLoading: false })
    }
  },

  createAsset: async (body) => {
    const data = await api.post('/admin/assets', body)
    set(s => ({ assets: [...s.assets, data] }))
    return data
  },

  updateAsset: async (id, changes) => {
    const data = await api.put(`/admin/assets/${id}`, changes)
    set(s => ({ assets: s.assets.map(a => a.id === id ? data : a) }))
    return data
  },

  deleteAsset: async (id, reason) => {
    const q = reason ? `?reason=${encodeURIComponent(reason)}` : ''
    await api.delete(`/admin/assets/${id}${q}`)
    set(s => ({ assets: s.assets.filter(a => a.id !== id) }))
  },

  fetchAssetHistory: async (id) => {
    return await api.get(`/admin/assets/${id}/history`)
  },

  // Global history across all assets (created/assigned/reassigned/unassigned/deleted).
  fetchAllAssetHistory: async () => {
    return await api.get('/admin/assets/history')
  },

  // ── Escalation Rules ───────────────────────────────────────────────────────
  escalationRules: [],
  escalationLoading: false,

  fetchEscalationRules: async () => {
    set({ escalationLoading: true })
    try {
      const data = await api.get('/admin/escalation-rules')
      set({ escalationRules: data || [] })
    } catch (e) {
      console.error('fetchEscalationRules error', e)
    } finally {
      set({ escalationLoading: false })
    }
  },

  createEscalationRule: async (body) => {
    const data = await api.post('/admin/escalation-rules', body)
    set(s => ({ escalationRules: [...s.escalationRules, data] }))
    return data
  },

  updateEscalationRule: async (id, changes) => {
    const data = await api.put(`/admin/escalation-rules/${id}`, changes)
    set(s => ({ escalationRules: s.escalationRules.map(r => r.id === id ? data : r) }))
    return data
  },

  deleteEscalationRule: async (id) => {
    await api.delete(`/admin/escalation-rules/${id}`)
    set(s => ({ escalationRules: s.escalationRules.filter(r => r.id !== id) }))
  },

  // ── Recurring Ticket Templates ─────────────────────────────────────────────
  recurringTemplates: [],
  recurringLoading: false,

  fetchRecurringTemplates: async () => {
    set({ recurringLoading: true })
    try {
      const data = await api.get('/admin/recurring-templates')
      set({ recurringTemplates: data || [] })
    } catch (e) {
      console.error('fetchRecurringTemplates error', e)
    } finally {
      set({ recurringLoading: false })
    }
  },

  createRecurringTemplate: async (body) => {
    const data = await api.post('/admin/recurring-templates', body)
    set(s => ({ recurringTemplates: [...s.recurringTemplates, data] }))
    return data
  },

  updateRecurringTemplate: async (id, changes) => {
    const data = await api.put(`/admin/recurring-templates/${id}`, changes)
    set(s => ({ recurringTemplates: s.recurringTemplates.map(t => t.id === id ? data : t) }))
    return data
  },

  deleteRecurringTemplate: async (id) => {
    await api.delete(`/admin/recurring-templates/${id}`)
    set(s => ({ recurringTemplates: s.recurringTemplates.filter(t => t.id !== id) }))
  },

  // ── Portal Branding ────────────────────────────────────────────────────────
  branding: null,
  brandingLoading: false,

  fetchBranding: async () => {
    set({ brandingLoading: true })
    try {
      const data = await api.get('/admin/branding')
      set({ branding: data || null })
    } catch (e) {
      console.error('fetchBranding error', e)
    } finally {
      set({ brandingLoading: false })
    }
  },

  saveBranding: async (body) => {
    const data = await api.put('/admin/branding', body)
    set({ branding: data })
    return data
  },

  // ── TOTP / 2FA ─────────────────────────────────────────────────────────────
  totpSetup: null,   // { provisioning_uri, secret } — shown once during setup
  totpEnabled: false,

  initTotpSetup: async () => {
    const data = await api.post('/auth/totp/setup', {})
    set({ totpSetup: data })
    return data
  },

  verifyTotp: async (code) => {
    const data = await api.post('/auth/totp/verify', { code })
    set({ totpEnabled: true, totpSetup: null })
    return data  // { backup_codes }
  },

  disableTotp: async (code) => {
    await api.post('/auth/totp/disable', { code })
    set({ totpEnabled: false })
  },

  // ── User Settings (self-service) ───────────────────────────────────────────
  updateOwnSettings: async (body) => {
    const data = await api.put('/auth/settings', body)
    return data
  },

  // ── Duplicate Detection ────────────────────────────────────────────────────
  duplicates: [],
  checkDuplicate: async (subject) => {
    try {
      const data = await api.post('/tickets/check-duplicate', { subject })
      set({ duplicates: data || [] })
      return data
    } catch {
      set({ duplicates: [] })
      return []
    }
  },
  clearDuplicates: () => set({ duplicates: [] }),
}))
