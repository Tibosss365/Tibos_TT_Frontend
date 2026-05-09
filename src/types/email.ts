// ── Enums / unions ────────────────────────────────────────────────────────────

export type EmailProtocol    = 'imap_smtp' | 'graph_api'
export type MessageDirection = 'inbound' | 'outbound'
export type MessageType      = 'reply' | 'internal_note' | 'forward' | 'original'
export type DeliveryStatus   = 'pending' | 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced'
export type AISentiment      = 'positive' | 'neutral' | 'negative'
export type RoutingLogic     = 'AND' | 'OR'
export type TrackingEvent    = 'open' | 'click'

// ── Recipient ─────────────────────────────────────────────────────────────────

export interface Recipient {
  email: string
  name?: string
}

// ── Email Account ─────────────────────────────────────────────────────────────

export interface EmailAccount {
  id: string
  name: string
  email_address: string
  display_name?: string
  protocol: EmailProtocol
  is_active: boolean
  is_default: boolean
  auto_create_tickets: boolean
  default_ticket_priority: string
  last_fetched_at?: string
  created_at: string
  updated_at: string
}

export interface EmailAccountCreate {
  name: string
  email_address: string
  display_name?: string
  protocol: EmailProtocol
  imap_host?: string
  imap_port?: number
  imap_use_ssl?: boolean
  imap_username?: string
  imap_password?: string
  smtp_host?: string
  smtp_port?: number
  smtp_use_tls?: boolean
  smtp_username?: string
  smtp_password?: string
  graph_tenant_id?: string
  graph_client_id?: string
  graph_client_secret?: string
  graph_user_id?: string
  auto_create_tickets?: boolean
  default_ticket_priority?: string
  default_assign_team_id?: string
}

export interface EmailAccountUpdate {
  name?: string
  display_name?: string
  is_active?: boolean
  is_default?: boolean
  auto_create_tickets?: boolean
  default_ticket_priority?: string
  imap_password?: string
  smtp_password?: string
  graph_client_secret?: string
}

// ── Email Thread ──────────────────────────────────────────────────────────────

export interface EmailThread {
  id: string
  account_id: string
  ticket_id?: string
  subject: string
  snippet?: string
  participant_emails: string[]
  is_read: boolean
  is_starred: boolean
  is_archived: boolean
  is_spam: boolean
  message_count: number
  unread_count: number
  has_attachments: boolean
  last_message_at: string
  created_at: string
  updated_at: string
}

export interface EmailThreadUpdate {
  is_read?: boolean
  is_starred?: boolean
  is_archived?: boolean
  is_spam?: boolean
  ticket_id?: string | null
}

export interface PaginatedThreads {
  items: EmailThread[]
  total: number
  page: number
  pages: number
}

// ── Email Attachment ──────────────────────────────────────────────────────────

export interface EmailAttachment {
  id: string
  filename: string
  content_type: string
  size_bytes: number
  content_id?: string
  is_inline: boolean
  storage_path?: string
}

// ── Email Message ─────────────────────────────────────────────────────────────

export interface EmailMessage {
  id: string
  thread_id: string
  account_id: string
  direction: MessageDirection
  message_type: MessageType
  from_email: string
  from_name?: string
  sent_by_agent_id?: string
  to_recipients: Recipient[]
  cc_recipients: Recipient[]
  bcc_recipients: Recipient[]
  subject?: string
  body_html?: string
  body_text?: string
  body_stripped?: string
  delivery_status: DeliveryStatus
  delivery_error?: string
  sent_at?: string
  is_read: boolean
  read_at?: string
  is_opened: boolean
  open_count: number
  first_opened_at?: string
  ai_summary?: string
  ai_suggested_reply?: string
  ai_sentiment?: AISentiment
  received_at: string
  attachments: EmailAttachment[]
}

// ── Send / Forward ────────────────────────────────────────────────────────────

export interface SendEmailRequest {
  thread_id?: string
  account_id: string
  to: Recipient[]
  cc?: Recipient[]
  bcc?: Recipient[]
  subject: string
  body_html: string
  body_text?: string
  message_type?: MessageType
  in_reply_to_message_id?: string
  signature_id?: string
  template_id?: string
}

export interface ForwardRequest {
  to: Recipient[]
  cc?: Recipient[]
  additional_note?: string
}

// ── Template ──────────────────────────────────────────────────────────────────

export interface TemplateVariable {
  name: string
  description?: string
  default?: string
}

export interface EmailTemplate {
  id: string
  name: string
  category: string
  subject: string
  body_html: string
  body_text?: string
  variables: TemplateVariable[]
  is_active: boolean
  is_shared: boolean
  use_count: number
  created_by_id?: string
  created_at: string
  updated_at: string
}

export interface EmailTemplateCreate {
  name: string
  category?: string
  subject: string
  body_html: string
  body_text?: string
  variables?: TemplateVariable[]
  is_shared?: boolean
}

export interface EmailTemplateUpdate {
  name?: string
  category?: string
  subject?: string
  body_html?: string
  variables?: TemplateVariable[]
  is_active?: boolean
  is_shared?: boolean
}

// ── Signature ─────────────────────────────────────────────────────────────────

export interface EmailSignature {
  id: string
  agent_id: string
  name: string
  body_html: string
  body_text?: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface EmailSignatureCreate {
  name: string
  body_html: string
  body_text?: string
  is_default?: boolean
}

export interface EmailSignatureUpdate {
  name?: string
  body_html?: string
  is_default?: boolean
}

// ── Routing Rule ──────────────────────────────────────────────────────────────

export interface RoutingCondition {
  field: string
  operator: string
  value: string
}

export interface RoutingAction {
  type: string
  params: Record<string, any>
}

export interface EmailRoutingRule {
  id: string
  account_id?: string
  name: string
  priority: number
  is_active: boolean
  conditions: RoutingCondition[]
  condition_logic: RoutingLogic
  actions: RoutingAction[]
  created_at: string
  updated_at: string
}

// ── AI ────────────────────────────────────────────────────────────────────────

export interface AISuggestRequest {
  message_id: string
  tone?: string
  language?: string
  max_length?: number
}

export interface AISuggestOut {
  suggestion: string
  tone: string
}

export interface AISummarizeOut {
  summary: string
  sentiment?: AISentiment
  key_points: string[]
}

// ── Filters ───────────────────────────────────────────────────────────────────

export interface ThreadFilters {
  account_id?: string
  page?: number
  page_size?: number
  is_read?: boolean
  is_starred?: boolean
  is_archived?: boolean
  is_spam?: boolean
  ticket_id?: string
  search?: string
}

// ── UI meta ───────────────────────────────────────────────────────────────────

export const DELIVERY_META: Record<DeliveryStatus, { label: string; cls: string }> = {
  pending:   { label: 'Pending',   cls: 'text-slate-400' },
  queued:    { label: 'Queued',    cls: 'text-amber-400' },
  sent:      { label: 'Sent',      cls: 'text-blue-400' },
  delivered: { label: 'Delivered', cls: 'text-emerald-400' },
  failed:    { label: 'Failed',    cls: 'text-rose-400' },
  bounced:   { label: 'Bounced',   cls: 'text-orange-400' },
}

export const SENTIMENT_META: Record<AISentiment, { label: string; cls: string }> = {
  positive: { label: 'Positive', cls: 'text-emerald-400' },
  neutral:  { label: 'Neutral',  cls: 'text-slate-400' },
  negative: { label: 'Negative', cls: 'text-rose-400' },
}
