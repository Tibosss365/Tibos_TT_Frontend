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
        set(s => ({ groups: s.groups.filter(g => g.id !== id) }))
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
      // Normalize flat backend response → nested frontend structure
      const normalized = {
        type: data.type || 'smtp',
        smtp: {
          host:     data.smtp_host     || '',
          port:     data.smtp_port     || '587',
          security: data.smtp_security || 'tls',
          from:     data.smtp_from     || '',
          user:     data.smtp_user     || '',
          pass:     '',  // password never returned from backend
        },
        m365: {
          tenantId:     data.m365_tenant_id || '',
          clientId:     data.m365_client_id || '',
          clientSecret: '',  // secret never returned from backend
          from:         data.m365_from      || '',
        },
        oauth: {
          provider:      data.oauth_provider      || 'google',
          clientId:      data.oauth_client_id     || '',
          clientSecret:  '',
          redirectUri:   data.oauth_redirect_uri  || '',
          scopes:        data.oauth_scopes        || '',
          authEndpoint:  data.oauth_auth_endpoint  || '',
          tokenEndpoint: data.oauth_token_endpoint || '',
          from:          data.oauth_from           || '',
          connected:     !!(data.oauth_token_expiry),
          connectedEmail: data.oauth_from          || '',
          tokenExpiry:   data.oauth_token_expiry   || null,
        },
      }
      set({
        emailConfig: normalized,
        emailTriggers: {
          new:     data.trigger_new     ?? false,
          assign:  data.trigger_assign  ?? false,
          resolve: data.trigger_resolve ?? false,
        },
      })
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
        groupId:     c.group_id ?? null,
      }))
      set({ categories: cats })
    } catch (e) {
      console.error('fetchCategories error', e)
    }
  },

  fetchGroups: async () => {
    try {
      const data = await api.get('/groups')
      if (!Array.isArray(data) || data.length === 0) {
        set({ groups: DEFAULT_GROUPS })
        return
      }
      const grps = data.map(g => ({
        id:          String(g.id),
        name:        g.name,
        description: g.description || '',
        color:       g.color || '#6B7280',
        isBuiltin:   g.is_builtin ?? true,
      }))
      set({ groups: grps })
    } catch {
      // No groups backend yet — always reset to current defaults so group IDs
      // match the group_id values that fetchCategories returns from the backend.
      set({ groups: DEFAULT_GROUPS })
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
    // Normalize flat backend response → nested frontend structure
    const normalized = {
      type: data.type || 'smtp',
      smtp: {
        host:     data.smtp_host     || '',
        port:     data.smtp_port     || '587',
        security: data.smtp_security || 'tls',
        from:     data.smtp_from     || '',
        user:     data.smtp_user     || '',
        pass:     payload.smtp?.password || '',  // keep what was sent (not returned by backend)
      },
      m365: {
        tenantId:     data.m365_tenant_id || '',
        clientId:     data.m365_client_id || '',
        clientSecret: payload.m365?.client_secret || '',
        from:         data.m365_from      || '',
      },
      oauth: {
        provider:      data.oauth_provider      || 'google',
        clientId:      data.oauth_client_id     || '',
        clientSecret:  payload.oauth?.client_secret || '',
        redirectUri:   data.oauth_redirect_uri  || '',
        scopes:        data.oauth_scopes        || '',
        authEndpoint:  data.oauth_auth_endpoint  || '',
        tokenEndpoint: data.oauth_token_endpoint || '',
        from:          data.oauth_from           || '',
        connected:     !!(data.oauth_token_expiry),
        connectedEmail: data.oauth_from          || '',
        tokenExpiry:   data.oauth_token_expiry   || null,
      },
    }
    set({
      emailConfig: normalized,
      emailTriggers: {
        new:     data.trigger_new     ?? false,
        assign:  data.trigger_assign  ?? false,
        resolve: data.trigger_resolve ?? false,
      },
    })
  },

      updateEmailTriggers: (changes) => {
        set(s => ({ emailTriggers: { ...s.emailTriggers, ...changes } }))
      },

      updateInboundEmail: (changes) => {
        set(s => ({ inboundEmail: { ...s.inboundEmail, ...changes } }))
      },

      // ── Inbound email — backend API actions ──────────────────────────────
      fetchInboundConfig: async () => {
        try {
          const data = await api.get('/inbound-email')
          set({
            inboundEmail: {
              enabled:             data.enabled            ?? false,
              authType:            data.auth_type          || 'basic',
              imapHost:            data.imap_host          || '',
              imapPort:            String(data.imap_port   || 993),
              imapSsl:             data.imap_ssl           ?? true,
              imapUser:            data.imap_user          || '',
              imapPass:            '',                        // never returned
              imapFolder:          data.imap_folder        || 'INBOX',
              graphMailbox:        data.graph_mailbox      || '',
              defaultCategory:     data.default_category   || 'email',
              defaultPriority:     data.default_priority   || 'medium',
              defaultAssignee:     data.default_assignee_id
                                     ? String(data.default_assignee_id)
                                     : 'unassigned',
              pollIntervalMinutes: data.poll_interval_minutes || 5,
              markSeen:            data.mark_seen          ?? true,
              moveToFolder:        data.move_to_folder     || '',
              lastPolledAt:        data.last_polled_at     || null,
              processedCount:      data.processed_count    || 0,
            },
          })
        } catch (e) {
          console.error('fetchInboundConfig error', e)
        }
      },

      saveInboundConfig: async (inboundState) => {
        const body = {
          enabled:              inboundState.enabled,
          auth_type:            inboundState.authType,
          imap_host:            inboundState.imapHost            || null,
          imap_port:            Number(inboundState.imapPort)    || 993,
          imap_ssl:             inboundState.imapSsl             ?? true,
          imap_user:            inboundState.imapUser            || null,
          imap_folder:          inboundState.imapFolder          || 'INBOX',
          graph_mailbox:        inboundState.graphMailbox        || null,
          default_category:     inboundState.defaultCategory     || 'email',
          default_priority:     inboundState.defaultPriority     || 'medium',
          default_assignee_id:  inboundState.defaultAssignee !== 'unassigned'
                                  ? inboundState.defaultAssignee
                                  : null,
          poll_interval_minutes: Number(inboundState.pollIntervalMinutes) || 5,
          mark_seen:            inboundState.markSeen            ?? true,
          move_to_folder:       inboundState.moveToFolder        || null,
        }
        // Only include password if the user actually typed one
        if (inboundState.imapPass) body.imap_pass = inboundState.imapPass

        const data = await api.put('/inbound-email', body)
        // Sync local state with confirmed backend values
        set(s => ({
          inboundEmail: {
            ...s.inboundEmail,
            enabled:             data.enabled,
            auth_type:           data.auth_type,
            lastPolledAt:        data.last_polled_at  || null,
            processedCount:      data.processed_count || 0,
          },
        }))
        return data
      },

      pollInbound: async () => {
        const data = await api.post('/inbound-email/poll', {})
        // Update last-polled stats
        set(s => ({
          inboundEmail: {
            ...s.inboundEmail,
            lastPolledAt:   data.polled_at,
            processedCount: (s.inboundEmail.processedCount || 0) + (data.processed || 0),
          },
        }))
        return data   // { polled_at, processed, error, duration_ms }
      },

      fetchInboundLogs: async (page = 1) => {
        const data = await api.get(`/inbound-email/logs?page=${page}&page_size=50`)
        // Normalise snake_case → camelCase for the log table
        const items = (data.items || []).map(e => ({
          id:           String(e.id),
          messageId:    e.message_id,
          fromEmail:    e.from_email,
          fromName:     e.from_name,
          subject:      e.subject,
          status:       e.status,
          ticketId:     e.ticket_number || null,
          errorMessage: e.error_message || null,
          processedAt:  e.processed_at,
        }))
        set({ emailLog: items })
        return { items, total: data.total }
      },

      clearInboundLogs: async () => {
        await api.delete('/inbound-email/logs')
        set({ emailLog: [] })
      },

      addEmailLogEntry: (entry) => {
        set(s => ({ emailLog: [entry, ...s.emailLog].slice(0, 100) }))
      },

      clearEmailLog: () => set({ emailLog: [] }),

      // ── Category actions ──────────────────────────────────────────────
      addCategory: async (cat) => {
        const maxOrder = get().categories.reduce((m, c) => Math.max(m, c.sortOrder), 0)
        const body = {
          name:        cat.name,
          color:       cat.color || '#6B7280',
          description: cat.description || null,
          sort_order:  maxOrder + 10,
          group_id:    cat.groupId || null,
        }
        try {
          const data = await api.post('/categories', body)
          const newCat = {
            id:          data.slug,
            name:        data.name,
            color:       data.color,
            description: data.description || '',
            isBuiltin:   data.is_builtin,
            sortOrder:   data.sort_order,
            groupId:     data.group_id ?? null,
          }
          set(s => ({ categories: [...s.categories, newCat] }))
          return newCat.id
        } catch (e) {
          console.error('addCategory error', e)
          // Optimistic local fallback
          const id = cat.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
          set(s => ({
            categories: [...s.categories, { ...cat, id, isBuiltin: false, sortOrder: maxOrder + 10 }]
          }))
          return id
        }
      },

      updateCategory: (id, changes) => {
        set(s => ({
          categories: s.categories.map(c => c.id === id ? { ...c, ...changes } : c)
        }))
      },

      deleteCategory: async (id) => {
        try {
          await api.delete('/categories/' + id)
        } catch (e) {
          console.error('deleteCategory error', e)
        }
        set(s => ({ categories: s.categories.filter(c => c.id !== id) }))
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
    {
      name: 'helpdesk-admin',
      // categories and groups come from the backend / DEFAULT_GROUPS on every
      // login — never persist them so stale data can't block fresh data.
      partialize: (state) => {
        const { categories, groups, ...rest } = state
        return rest
      },
    }
  )
)
