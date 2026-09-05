import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../api/client'
import { DEFAULT_AGENTS, DEFAULT_SLA, DEFAULT_EMAIL_CONFIG, DEFAULT_EMAIL_TRIGGERS, DEFAULT_INBOUND_EMAIL, DEFAULT_EMAIL_LOG, DEFAULT_CATEGORIES, DEFAULT_TICKET_SETTINGS, DEFAULT_EMAIL_TEMPLATES, DEFAULT_GROUPS, DEFAULT_ALERT_SETTINGS } from '../data/seedData'

export const useAdminStore = create(
  persist(
    (set, get) => ({
      // ── System / General settings + Company profile ─────────────────────────
      // Both live in one backend row (/admin/company-settings) — shared across
      // every admin/browser. (Used to be Zustand-persist-only, i.e. private to
      // one browser's localStorage, which is why it looked like it kept
      // "resetting": every fresh browser/profile just saw these hardcoded
      // defaults, never anything actually saved.)
      systemSettings: {
        language:               'en',           // default: English
        timezone:               'Asia/Kolkata', // default: IST
        sessionTimeoutMinutes:  480,            // default: 8 hours (0 = Never)
      },
      companyProfile: {
        name: 'HelpdeskPro',
        website: '',
        phone: '',
        address: '',
        logo: null,
      },

      fetchCompanySettings: async () => {
        try {
          const data = await api.get('/admin/company-settings')
          set({
            systemSettings: {
              language: data.language,
              timezone: data.timezone,
              sessionTimeoutMinutes: data.session_timeout_minutes,
            },
            companyProfile: {
              name: data.name || 'HelpdeskPro',
              website: data.website || '',
              phone: data.phone || '',
              address: data.address || '',
              logo: data.logo || null,
            },
          })
        } catch (e) {
          console.error('fetchCompanySettings error', e)
        }
      },

      updateSystemSettings: async (changes) => {
        const body = {}
        if (changes.language              !== undefined) body.language = changes.language
        if (changes.timezone              !== undefined) body.timezone = changes.timezone
        if (changes.sessionTimeoutMinutes !== undefined) body.session_timeout_minutes = changes.sessionTimeoutMinutes
        await api.put('/admin/company-settings', body)
        set(s => ({ systemSettings: { ...s.systemSettings, ...changes } }))
      },

      updateCompanyProfile: async (changes) => {
        const body = {}
        if (changes.name    !== undefined) body.name    = changes.name
        if (changes.website !== undefined) body.website = changes.website
        if (changes.phone   !== undefined) body.phone   = changes.phone
        if (changes.address !== undefined) body.address = changes.address
        if (changes.logo    !== undefined) body.logo    = changes.logo
        await api.put('/admin/company-settings', body)
        set(s => ({ companyProfile: { ...s.companyProfile, ...changes } }))
      },

      groups: DEFAULT_GROUPS,
      ticketSettings: DEFAULT_TICKET_SETTINGS,
      emailTemplates: DEFAULT_EMAIL_TEMPLATES,

      addGroup: async (group) => {
        try {
          const data = await api.post('/groups', {
            name:        group.name,
            description: group.description || null,
            color:       group.color || '#6B7280',
          })
          const newGroup = {
            id:          data.id,
            name:        data.name,
            description: data.description || '',
            color:       data.color,
            isBuiltin:   data.is_builtin ?? false,
          }
          set(s => ({ groups: [...s.groups, newGroup] }))
          return newGroup
        } catch (e) {
          console.error('addGroup error', e)
          // Optimistic local fallback
          const id = group.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
          const newGroup = { ...group, id, isBuiltin: false }
          set(s => ({ groups: [...s.groups, newGroup] }))
          return newGroup
        }
      },

      updateGroup: async (id, changes) => {
        // Optimistic update first
        set(s => ({ groups: s.groups.map(g => g.id === id ? { ...g, ...changes } : g) }))
        try {
          await api.patch(`/groups/${id}`, {
            name:        changes.name,
            description: changes.description ?? null,
            color:       changes.color,
          })
        } catch (e) {
          console.error('updateGroup error', e)
        }
      },

      deleteGroup: async (id) => {
        // Optimistic remove first
        set(s => ({ groups: s.groups.filter(g => g.id !== id) }))
        try {
          await api.delete(`/groups/${id}`)
        } catch (e) {
          console.error('deleteGroup error', e)
        }
      },

      getGroupById:  (id) => get().groups.find(g => g.id === id),
      getGroupName:  (id) => { const g = get().groups.find(g => g.id === id); return g ? g.name : '—' },

      // Persist ticket settings to backend AND local store
      updateTicketSettings: async (changes) => {
        set(s => ({ ticketSettings: { ...s.ticketSettings, ...changes } }))
        try {
          const current = { ...get().ticketSettings, ...changes }
          await api.put('/admin/ticket-settings', {
            number_prefix:    current.numberPrefix,
            number_digits:    current.numberDigits,
            default_status:   current.defaultStatus,
            default_priority: current.defaultPriority,
          })
        } catch (e) {
          console.error('updateTicketSettings backend error', e)
        }
      },

      fetchTicketSettings: async () => {
        try {
          const data = await api.get('/admin/ticket-settings')
          set(s => ({
            ticketSettings: {
              ...s.ticketSettings,
              numberPrefix:    data.number_prefix    || 'TKT',
              numberDigits:    data.number_digits    || 4,
              defaultStatus:   data.default_status   || 'open',
              defaultPriority: data.default_priority || 'medium',
            },
          }))
        } catch (e) {
          console.error('fetchTicketSettings error', e)
        }
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
          timezone: data.trigger_timezone || 'UTC',
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
        // Backend returned nothing — keep current state (don't wipe user's groups)
        return
      }
      const grps = data.map(g => ({
        id:          String(g.id),
        name:        g.name,
        description: g.description || '',
        color:       g.color || '#6B7280',
        isBuiltin:   g.is_builtin ?? false,
      }))
      set({ groups: grps })
    } catch {
      // Backend unavailable — fall back to seed defaults so group_id values
      // on categories/tickets still resolve to a name.
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
    const raw = await api.put('/admin/email', payload)
    // Backend may return 204 No Content — refetch to sync state
    if (!raw) {
      await get().fetchEmailConfig()
      return
    }
    const data = raw
    // Normalize flat backend response → nested frontend structure
    const normalized = {
      type: data.type || payload.type || 'smtp',
      smtp: {
        host:     data.smtp_host     || '',
        port:     data.smtp_port     || '587',
        security: data.smtp_security || 'tls',
        from:     data.smtp_from     || '',
        user:     data.smtp_user     || '',
        pass:     payload.smtp?.password || '',
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
        new:     data.trigger_new     ?? get().emailTriggers.new     ?? false,
        assign:  data.trigger_assign  ?? get().emailTriggers.assign  ?? false,
        resolve: data.trigger_resolve ?? get().emailTriggers.resolve ?? false,
        timezone: data.trigger_timezone || get().emailTriggers.timezone || 'UTC',
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
              pollIntervalMinutes: data.poll_interval_minutes ?? 5,
              markSeen:            data.mark_seen          ?? true,
              moveToFolder:        data.move_to_folder     || '',
              filterRules:         data.filter_rules       || [],
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
          poll_interval_minutes: inboundState.pollIntervalMinutes == null
                                   ? 5
                                   : Number(inboundState.pollIntervalMinutes),
          mark_seen:            inboundState.markSeen            ?? true,
          move_to_folder:       inboundState.moveToFolder        || null,
          filter_rules:         inboundState.filterRules         || [],
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
            filterRules:         data.filter_rules    || [],
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
          ticketUuid:   e.ticket_id || null,   // null = no live ticket (never converted, or the ticket was since deleted)
          errorMessage: e.error_message || null,
          processedAt:  e.processed_at,
          hasBody:      !!e.has_body,
        }))
        set({ emailLog: items })
        return { items, total: data.total }
      },

      // Single-entry fetch, including the actual email body (omitted from the list).
      fetchEmailLogDetail: async (logId) => {
        const e = await api.get(`/inbound-email/logs/${logId}`)
        return {
          id:           String(e.id),
          fromEmail:    e.from_email,
          fromName:     e.from_name,
          subject:      e.subject,
          status:       e.status,
          ticketId:     e.ticket_number || null,
          ticketUuid:   e.ticket_id || null,
          errorMessage: e.error_message || null,
          processedAt:  e.processed_at,
          body:         e.body || '',
        }
      },

      // Manually turn a filtered/duplicate/error/orphaned log entry into a ticket.
      convertEmailLogToTicket: async (logId) => {
        const data = await api.post(`/inbound-email/logs/${logId}/convert`, {})
        set(s => ({
          emailLog: s.emailLog.map(e => e.id === String(logId) ? {
            ...e,
            status: data.status,
            ticketId: data.ticket_number || null,
            ticketUuid: data.ticket_id || null,
            errorMessage: null,
          } : e),
        }))
        return data
      },

      clearInboundLogs: async () => {
        await api.delete('/inbound-email/logs')
        set({ emailLog: [] })
      },

      addEmailLogEntry: (entry) => {
        set(s => ({ emailLog: [entry, ...s.emailLog].slice(0, 100) }))
      },

      clearEmailLog: () => set({ emailLog: [] }),

      // ── Alert Settings ────────────────────────────────────────────────────
      alertSettings: DEFAULT_ALERT_SETTINGS,

      fetchAlertSettings: async () => {
        try {
          const data = await api.get('/admin/alerts')
          set({ alertSettings: data })
        } catch (e) {
          // Backend not yet deployed — use local defaults silently
        }
      },

      saveAlertSettings: async (settings) => {
        // Optimistic local save first
        set({ alertSettings: settings })
        try {
          const data = await api.put('/admin/alerts', settings)
          if (data) set({ alertSettings: data })
        } catch (e) {
          // Settings already saved locally; backend sync optional
          console.error('saveAlertSettings backend error', e)
        }
      },

      sendTestAlert: async () => {
        return await api.post('/admin/alerts/test', {})
      },

      // ── SSO / OIDC config ─────────────────────────────────────────────────
      ssoConfig: null,

      fetchSSOConfig: async () => {
        try {
          const data = await api.get('/admin/sso')
          set({ ssoConfig: data })
        } catch (e) {
          console.error('fetchSSOConfig error', e)
        }
      },

      saveSSOConfig: async (body) => {
        const data = await api.put('/admin/sso', body)
        set({ ssoConfig: data })
        return data
      },

      testSSOConfig: async () => {
        return await api.post('/admin/sso/test', {})
      },

      // ── Microsoft Teams two-way chat (Azure Bot) config ─────────────────────
      teamsConfig: null,

      fetchTeamsConfig: async () => {
        try {
          const data = await api.get('/admin/teams')
          set({ teamsConfig: data })
        } catch (e) {
          console.error('fetchTeamsConfig error', e)
        }
      },

      saveTeamsConfig: async (body) => {
        const data = await api.put('/admin/teams', body)
        set({ teamsConfig: data })
        return data
      },

      testTeamsConfig: async () => {
        return await api.post('/admin/teams/test', {})
      },

      // ── Graph instant-delivery webhook (Microsoft Graph change notifications) ──
      getWebhookStatus:  async () => await api.get('/inbound-email/webhook-status'),
      enableWebhook:     async () => await api.post('/inbound-email/enable-webhook', {}),
      disableWebhook:    async () => await api.post('/inbound-email/disable-webhook', {}),

      // Upload the IdP (Azure AD) federation metadata XML — backend extracts the
      // signing cert + SSO URL and saves them, then we refresh the config.
      uploadSamlMetadata: async (xml) => {
        const result = await api.post('/admin/sso/upload-saml-metadata', { xml })
        try { const data = await api.get('/admin/sso'); set({ ssoConfig: data }) } catch {}
        return result
      },

      // Import all Microsoft 365 tenant users into the tool via Graph.
      syncM365Users: async () => {
        const result = await api.post('/admin/sso/sync-users', {})
        try { await get().fetchAgents?.() } catch {}
        return result
      },

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

      updateCategory: async (id, changes) => {
        // Optimistic update first so the UI feels instant
        set(s => ({
          categories: s.categories.map(c => c.id === id ? { ...c, ...changes } : c)
        }))
        try {
          await api.patch(`/categories/${id}`, {
            name:        changes.name,
            color:       changes.color,
            description: changes.description ?? null,
          })
        } catch (e) {
          console.error('updateCategory error', e)
        }
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

      // ── Canned Responses (backend-backed, shared across all agents) ───────
      cannedResponses: [],
      fetchCannedResponses: async () => {
        try {
          const data = await api.get('/admin/canned-responses')
          set({ cannedResponses: (data || []).map(r => ({ id: r.id, title: r.label, body: r.body || '' })) })
        } catch (e) { console.error('fetchCannedResponses error', e) }
      },
      addCannedResponse: async (data) => {
        const r = await api.post('/admin/canned-responses', { label: data.title, body: data.body })
        set(s => ({ cannedResponses: [...s.cannedResponses, { id: r.id, title: r.label, body: r.body || '' }] }))
      },
      updateCannedResponse: async (id, changes) => {
        const body = {}
        if (changes.title !== undefined) body.label = changes.title
        if (changes.body !== undefined) body.body = changes.body
        const r = await api.put(`/admin/canned-responses/${id}`, body)
        set(s => ({ cannedResponses: s.cannedResponses.map(x => x.id === id ? { id: r.id, title: r.label, body: r.body || '' } : x) }))
      },
      deleteCannedResponse: async (id) => {
        await api.delete(`/admin/canned-responses/${id}`)
        set(s => ({ cannedResponses: s.cannedResponses.filter(r => r.id !== id) }))
      },

      // ── Ticket Templates ──────────────────────────────────────────────────
      ticketTemplates: [
        { id: 'tpl-1', name: 'New Employee Onboarding', subject: 'New Employee Setup – [Name]', description: 'Please set up the following for the new employee:\n\n☐ Email account\n☐ Laptop / Computer\n☐ Software licenses\n☐ Access permissions\n☐ Phone / Desk setup\n\nStart Date:\nDepartment:\nManager:', category: '', priority: 'medium', type: 'request' },
        { id: 'tpl-2', name: 'Software Installation Request', subject: 'Software Installation Request', description: 'Software name:\nVersion:\nBusiness justification:\nTarget device(s):\nRequired by date:', category: '', priority: 'low', type: 'request' },
        { id: 'tpl-3', name: 'Network / VPN Issue', subject: 'Network Connectivity Issue', description: 'Cannot connect to:\n☐ Internet\n☐ VPN\n☐ Internal network drive\n☐ Specific server\n\nError message:\nDevice affected:\nLocation:', category: '', priority: 'high', type: 'incident' },
      ],
      addTicketTemplate: (data) => set(s => ({ ticketTemplates: [...s.ticketTemplates, { ...data, id: 'tpl-' + Date.now() }] })),
      updateTicketTemplate: (id, changes) => set(s => ({ ticketTemplates: s.ticketTemplates.map(t => t.id === id ? { ...t, ...changes } : t) })),
      deleteTicketTemplate: (id) => set(s => ({ ticketTemplates: s.ticketTemplates.filter(t => t.id !== id) })),

      // ── Custom Fields per Category ────────────────────────────────────────
      customFields: {},
      addCustomField: (categoryId, field) => set(s => ({
        customFields: { ...s.customFields, [categoryId]: [...(s.customFields[categoryId] || []), { ...field, id: 'cf-' + Date.now() }] }
      })),
      updateCustomField: (categoryId, fieldId, changes) => set(s => ({
        customFields: { ...s.customFields, [categoryId]: (s.customFields[categoryId] || []).map(f => f.id === fieldId ? { ...f, ...changes } : f) }
      })),
      deleteCustomField: (categoryId, fieldId) => set(s => ({
        customFields: { ...s.customFields, [categoryId]: (s.customFields[categoryId] || []).filter(f => f.id !== fieldId) }
      })),

      // ── Resolution Codes (backend-backed, shared across all agents) ───────
      resolutionCodes: [],
      fetchResolutionCodes: async () => {
        try {
          const data = await api.get('/admin/resolution-codes')
          set({ resolutionCodes: (data || []).map(r => ({ id: r.id, label: r.label })) })
        } catch (e) { console.error('fetchResolutionCodes error', e) }
      },
      addResolutionCode: async (label) => {
        const r = await api.post('/admin/resolution-codes', { label })
        set(s => ({ resolutionCodes: [...s.resolutionCodes, { id: r.id, label: r.label }] }))
      },
      updateResolutionCode: async (id, label) => {
        const r = await api.put(`/admin/resolution-codes/${id}`, { label })
        set(s => ({ resolutionCodes: s.resolutionCodes.map(x => x.id === id ? { id: r.id, label: r.label } : x) }))
      },
      deleteResolutionCode: async (id) => {
        await api.delete(`/admin/resolution-codes/${id}`)
        set(s => ({ resolutionCodes: s.resolutionCodes.filter(r => r.id !== id) }))
      },

      // ── On-Hold Reasons (backend-backed, shared across all agents) ────────
      onHoldReasons: [],
      fetchOnHoldReasons: async () => {
        try {
          const data = await api.get('/admin/hold-reasons')
          set({ onHoldReasons: (data || []).map(r => ({ id: r.id, label: r.label })) })
        } catch (e) { console.error('fetchOnHoldReasons error', e) }
      },
      addOnHoldReason: async (label) => {
        const r = await api.post('/admin/hold-reasons', { label })
        set(s => ({ onHoldReasons: [...s.onHoldReasons, { id: r.id, label: r.label }] }))
      },
      updateOnHoldReason: async (id, label) => {
        const r = await api.put(`/admin/hold-reasons/${id}`, { label })
        set(s => ({ onHoldReasons: s.onHoldReasons.map(x => x.id === id ? { id: r.id, label: r.label } : x) }))
      },
      deleteOnHoldReason: async (id) => {
        await api.delete(`/admin/hold-reasons/${id}`)
        set(s => ({ onHoldReasons: s.onHoldReasons.filter(r => r.id !== id) }))
      },

      // ── Domain Companies ──────────────────────────────────────────────────
      domainCompanies: [],

      fetchDomainCompanies: async () => {
        try {
          const data = await api.get('/admin/domain-companies')
          set({ domainCompanies: data || [] })
        } catch (e) {
          console.error('fetchDomainCompanies error', e)
        }
      },

      addDomainCompany: async (payload) => {
        const data = await api.post('/admin/domain-companies', payload)
        set(s => ({ domainCompanies: [...s.domainCompanies, data] }))
        return data
      },

      updateDomainCompany: async (id, changes) => {
        const data = await api.patch(`/admin/domain-companies/${id}`, changes)
        set(s => ({ domainCompanies: s.domainCompanies.map(d => d.id === id ? data : d) }))
        return data
      },

      deleteDomainCompany: async (id) => {
        await api.delete(`/admin/domain-companies/${id}`)
        set(s => ({ domainCompanies: s.domainCompanies.filter(d => d.id !== id) }))
      },

      lookupDomain: async (domain) => {
        return await api.get(`/admin/domain-companies/lookup?domain=${encodeURIComponent(domain)}`)
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
        // Never persist server-backed lists — always load fresh from the API so
        // stale localStorage can't hide or override shared data.
        const {
          categories, groups, alertSettings, domainCompanies,
          onHoldReasons, resolutionCodes, cannedResponses,
          systemSettings, companyProfile, ...rest
        } = state
        return rest
      },
    }
  )
)
