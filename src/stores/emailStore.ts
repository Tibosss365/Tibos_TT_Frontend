import { create } from 'zustand'
import {
  emailAccountApi, emailAIApi, emailMessageApi,
  emailSignatureApi, emailTemplateApi, emailThreadApi,
} from '../api/emailApi'
import type {
  AISuggestOut, AISummarizeOut,
  EmailAccount, EmailAccountCreate, EmailAccountUpdate,
  EmailMessage, EmailSignature, EmailSignatureCreate, EmailSignatureUpdate,
  EmailTemplate, EmailTemplateCreate, EmailTemplateUpdate,
  EmailThread, EmailThreadUpdate,
  ForwardRequest, PaginatedThreads, SendEmailRequest, ThreadFilters,
} from '../types/email'

interface EmailState {
  // Accounts
  accounts: EmailAccount[]
  accountsLoading: boolean

  // Threads
  threads: PaginatedThreads
  threadsLoading: boolean
  activeThread: EmailThread | null
  activeMessages: EmailMessage[]
  messagesLoading: boolean

  // Compose
  composerOpen: boolean
  replyToMessage: EmailMessage | null

  // Templates
  templates: EmailTemplate[]
  templatesLoading: boolean

  // Signatures
  signatures: EmailSignature[]
  signaturesLoading: boolean

  // AI
  aiSuggestion: AISuggestOut | null
  aiSummary: AISummarizeOut | null
  aiLoading: boolean

  // Error
  error: string | null

  // ── Actions ───────────────────────────────────────────────────────────────

  // Accounts
  fetchAccounts: () => Promise<void>
  createAccount: (data: EmailAccountCreate) => Promise<void>
  updateAccount: (id: string, data: EmailAccountUpdate) => Promise<void>
  deleteAccount: (id: string) => Promise<void>
  triggerFetch: (id: string) => Promise<number>

  // Threads
  fetchThreads: (filters?: ThreadFilters) => Promise<void>
  selectThread: (thread: EmailThread) => Promise<void>
  updateThread: (id: string, data: EmailThreadUpdate) => Promise<void>

  // Messages
  sendMessage: (data: SendEmailRequest) => Promise<EmailMessage>
  forwardMessage: (messageId: string, data: ForwardRequest) => Promise<EmailMessage>

  // Composer
  openComposer: (replyTo?: EmailMessage) => void
  closeComposer: () => void

  // Templates
  fetchTemplates: (category?: string) => Promise<void>
  createTemplate: (data: EmailTemplateCreate) => Promise<void>
  updateTemplate: (id: string, data: EmailTemplateUpdate) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>

  // Signatures
  fetchSignatures: () => Promise<void>
  createSignature: (data: EmailSignatureCreate) => Promise<void>
  updateSignature: (id: string, data: EmailSignatureUpdate) => Promise<void>
  deleteSignature: (id: string) => Promise<void>

  // AI
  suggestReply: (messageId: string, tone?: string) => Promise<void>
  summarizeThread: (threadId: string) => Promise<void>

  clearError: () => void
}

const emptyPaginated: PaginatedThreads = { items: [], total: 0, page: 1, pages: 1 }

export const useEmailStore = create<EmailState>((set, get) => ({
  accounts: [],
  accountsLoading: false,
  threads: emptyPaginated,
  threadsLoading: false,
  activeThread: null,
  activeMessages: [],
  messagesLoading: false,
  composerOpen: false,
  replyToMessage: null,
  templates: [],
  templatesLoading: false,
  signatures: [],
  signaturesLoading: false,
  aiSuggestion: null,
  aiSummary: null,
  aiLoading: false,
  error: null,

  // ── Accounts ──────────────────────────────────────────────────────────────

  fetchAccounts: async () => {
    set({ accountsLoading: true, error: null })
    try {
      const accounts = await emailAccountApi.list()
      set({ accounts })
    } catch (e: any) {
      set({ error: e.message })
    } finally {
      set({ accountsLoading: false })
    }
  },

  createAccount: async (data) => {
    const acct = await emailAccountApi.create(data)
    set((s) => ({ accounts: [...s.accounts, acct] }))
  },

  updateAccount: async (id, data) => {
    const updated = await emailAccountApi.update(id, data)
    set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? updated : a)) }))
  },

  deleteAccount: async (id) => {
    await emailAccountApi.delete(id)
    set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) }))
  },

  triggerFetch: async (id) => {
    const res = await emailAccountApi.triggerFetch(id)
    return res.fetched
  },

  // ── Threads ───────────────────────────────────────────────────────────────

  fetchThreads: async (filters = {}) => {
    set({ threadsLoading: true, error: null })
    try {
      const threads = await emailThreadApi.list(filters)
      set({ threads })
    } catch (e: any) {
      set({ error: e.message })
    } finally {
      set({ threadsLoading: false })
    }
  },

  selectThread: async (thread) => {
    set({ activeThread: thread, activeMessages: [], messagesLoading: true })
    try {
      const messages = await emailThreadApi.getMessages(thread.id)
      set({ activeMessages: messages })
      // Mark unread inbound messages as read
      const unreadIds = messages
        .filter((m) => !m.is_read && m.direction === 'inbound')
        .map((m) => m.id)
      if (unreadIds.length) {
        await emailThreadApi.markRead(thread.id, unreadIds, true)
        set((s) => ({
          activeThread: s.activeThread ? { ...s.activeThread, is_read: true, unread_count: 0 } : null,
          threads: {
            ...s.threads,
            items: s.threads.items.map((t) =>
              t.id === thread.id ? { ...t, is_read: true, unread_count: 0 } : t
            ),
          },
        }))
      }
    } catch (e: any) {
      set({ error: e.message })
    } finally {
      set({ messagesLoading: false })
    }
  },

  updateThread: async (id, data) => {
    const updated = await emailThreadApi.update(id, data)
    set((s) => ({
      threads: {
        ...s.threads,
        items: s.threads.items.map((t) => (t.id === id ? updated : t)),
      },
      activeThread: s.activeThread?.id === id ? updated : s.activeThread,
    }))
  },

  // ── Messages ──────────────────────────────────────────────────────────────

  sendMessage: async (data) => {
    const msg = await emailMessageApi.send(data)
    set((s) => ({
      activeMessages: [...s.activeMessages, msg],
      composerOpen: false,
      replyToMessage: null,
    }))
    return msg
  },

  forwardMessage: async (messageId, data) => {
    const msg = await emailMessageApi.forward(messageId, data)
    set((s) => ({ activeMessages: [...s.activeMessages, msg] }))
    return msg
  },

  // ── Composer ──────────────────────────────────────────────────────────────

  openComposer: (replyTo) => set({ composerOpen: true, replyToMessage: replyTo ?? null }),
  closeComposer: () => set({ composerOpen: false, replyToMessage: null }),

  // ── Templates ─────────────────────────────────────────────────────────────

  fetchTemplates: async (category) => {
    set({ templatesLoading: true })
    try {
      const templates = await emailTemplateApi.list(category)
      set({ templates })
    } finally {
      set({ templatesLoading: false })
    }
  },

  createTemplate: async (data) => {
    const t = await emailTemplateApi.create(data)
    set((s) => ({ templates: [t, ...s.templates] }))
  },

  updateTemplate: async (id, data) => {
    const t = await emailTemplateApi.update(id, data)
    set((s) => ({ templates: s.templates.map((x) => (x.id === id ? t : x)) }))
  },

  deleteTemplate: async (id) => {
    await emailTemplateApi.delete(id)
    set((s) => ({ templates: s.templates.filter((x) => x.id !== id) }))
  },

  // ── Signatures ────────────────────────────────────────────────────────────

  fetchSignatures: async () => {
    set({ signaturesLoading: true })
    try {
      const signatures = await emailSignatureApi.list()
      set({ signatures })
    } finally {
      set({ signaturesLoading: false })
    }
  },

  createSignature: async (data) => {
    const s = await emailSignatureApi.create(data)
    set((st) => ({ signatures: [...st.signatures, s] }))
  },

  updateSignature: async (id, data) => {
    const s = await emailSignatureApi.update(id, data)
    set((st) => ({ signatures: st.signatures.map((x) => (x.id === id ? s : x)) }))
  },

  deleteSignature: async (id) => {
    await emailSignatureApi.delete(id)
    set((s) => ({ signatures: s.signatures.filter((x) => x.id !== id) }))
  },

  // ── AI ────────────────────────────────────────────────────────────────────

  suggestReply: async (messageId, tone = 'professional') => {
    set({ aiLoading: true, aiSuggestion: null })
    try {
      const result = await emailAIApi.suggestReply({ message_id: messageId, tone })
      set({ aiSuggestion: result })
    } catch (e: any) {
      set({ error: e.message })
    } finally {
      set({ aiLoading: false })
    }
  },

  summarizeThread: async (threadId) => {
    set({ aiLoading: true, aiSummary: null })
    try {
      const result = await emailAIApi.summarize(threadId)
      set({ aiSummary: result })
    } catch (e: any) {
      set({ error: e.message })
    } finally {
      set({ aiLoading: false })
    }
  },

  clearError: () => set({ error: null }),
}))
