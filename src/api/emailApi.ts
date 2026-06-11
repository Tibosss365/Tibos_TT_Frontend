import type {
  AISuggestOut, AISummarizeOut, AISuggestRequest,
  EmailAccount, EmailAccountCreate, EmailAccountUpdate,
  EmailMessage, EmailRoutingRule, EmailRoutingRuleCreate, EmailRoutingRuleUpdate,
  EmailSignature, EmailSignatureCreate, EmailSignatureUpdate,
  EmailTemplate, EmailTemplateCreate, EmailTemplateUpdate,
  EmailThread, EmailThreadUpdate, ForwardRequest,
  PaginatedThreads, SendEmailRequest, ThreadFilters,
} from '../types/email'

import { BASE as API_BASE } from './client'

const BASE = `${API_BASE}/email`

function getToken(): string | null {
  try {
    const raw = localStorage.getItem('helpdesk-user')
    if (!raw) return null
    return JSON.parse(raw)?.state?.token ?? null
  } catch {
    return null
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    const detail = err.detail
    throw new Error(
      typeof detail === 'string' ? detail : detail ? JSON.stringify(detail) : 'Request failed',
    )
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// ── Accounts ──────────────────────────────────────────────────────────────────

export const emailAccountApi = {
  list: () =>
    request<EmailAccount[]>('/accounts'),
  create: (data: EmailAccountCreate) =>
    request<EmailAccount>('/accounts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: EmailAccountUpdate) =>
    request<EmailAccount>(`/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/accounts/${id}`, { method: 'DELETE' }),
  triggerFetch: (id: string) =>
    request<{ fetched: number }>(`/accounts/${id}/fetch`, { method: 'POST' }),
}

// ── Threads ───────────────────────────────────────────────────────────────────

export const emailThreadApi = {
  list: (filters: ThreadFilters = {}) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.set(k, String(v))
    })
    return request<PaginatedThreads>(`/threads?${params}`)
  },
  get: (id: string) =>
    request<EmailThread>(`/threads/${id}`),
  getMessages: (id: string) =>
    request<EmailMessage[]>(`/threads/${id}/messages`),
  update: (id: string, data: EmailThreadUpdate) =>
    request<EmailThread>(`/threads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  linkTicket: (id: string, ticketId: string | null) =>
    request<EmailThread>(`/threads/${id}/link-ticket`, {
      method: 'POST',
      body: JSON.stringify(ticketId ? { ticket_id: ticketId } : {}),
    }),
  markRead: (threadId: string, messageIds: string[], isRead: boolean) =>
    request<void>(`/threads/${threadId}/mark-read`, {
      method: 'POST',
      body: JSON.stringify({ message_ids: messageIds, is_read: isRead }),
    }),
}

// ── Messages ──────────────────────────────────────────────────────────────────

export const emailMessageApi = {
  send: (data: SendEmailRequest) =>
    request<EmailMessage>('/messages/send', { method: 'POST', body: JSON.stringify(data) }),
  forward: (messageId: string, data: ForwardRequest) =>
    request<EmailMessage>(`/messages/${messageId}/forward`, { method: 'POST', body: JSON.stringify(data) }),
  get: (id: string) =>
    request<EmailMessage>(`/messages/${id}`),
}

// ── Templates ─────────────────────────────────────────────────────────────────

export const emailTemplateApi = {
  list: (category?: string) =>
    request<EmailTemplate[]>(`/templates${category ? `?category=${category}` : ''}`),
  create: (data: EmailTemplateCreate) =>
    request<EmailTemplate>('/templates', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: EmailTemplateUpdate) =>
    request<EmailTemplate>(`/templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/templates/${id}`, { method: 'DELETE' }),
  render: (templateId: string, variables: Record<string, string>) =>
    request<{ subject: string; body_html: string; body_text?: string }>('/templates/render', {
      method: 'POST',
      body: JSON.stringify({ template_id: templateId, variables }),
    }),
}

// ── Signatures ────────────────────────────────────────────────────────────────

export const emailSignatureApi = {
  list: () =>
    request<EmailSignature[]>('/signatures'),
  create: (data: EmailSignatureCreate) =>
    request<EmailSignature>('/signatures', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: EmailSignatureUpdate) =>
    request<EmailSignature>(`/signatures/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/signatures/${id}`, { method: 'DELETE' }),
}

// ── Routing Rules ─────────────────────────────────────────────────────────────

export const emailRoutingApi = {
  list: () =>
    request<EmailRoutingRule[]>('/routing-rules'),
  create: (data: EmailRoutingRuleCreate) =>
    request<EmailRoutingRule>('/routing-rules', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: EmailRoutingRuleUpdate) =>
    request<EmailRoutingRule>(`/routing-rules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/routing-rules/${id}`, { method: 'DELETE' }),
}

// ── AI ────────────────────────────────────────────────────────────────────────

export const emailAIApi = {
  suggestReply: (data: AISuggestRequest) =>
    request<AISuggestOut>('/ai/suggest-reply', { method: 'POST', body: JSON.stringify(data) }),
  summarize: (threadId: string, maxLength?: number) =>
    request<AISummarizeOut>('/ai/summarize', {
      method: 'POST',
      body: JSON.stringify({ thread_id: threadId, max_length: maxLength }),
    }),
}
