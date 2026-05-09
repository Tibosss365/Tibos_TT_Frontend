from __future__ import annotations
from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ── Shared ────────────────────────────────────────────────────────────────────

class Recipient(BaseModel):
    email: str
    name: Optional[str] = None


# ── Email Account ─────────────────────────────────────────────────────────────

class EmailAccountCreate(BaseModel):
    name: str
    email_address: str
    display_name: Optional[str] = None
    protocol: str = "imap_smtp"  # imap_smtp | graph_api

    # IMAP/SMTP
    imap_host: Optional[str] = None
    imap_port: Optional[int] = 993
    imap_use_ssl: bool = True
    imap_username: Optional[str] = None
    imap_password: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = 587
    smtp_use_tls: bool = True
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None

    # Graph API
    graph_tenant_id: Optional[str] = None
    graph_client_id: Optional[str] = None
    graph_client_secret: Optional[str] = None
    graph_user_id: Optional[str] = None

    auto_create_tickets: bool = False
    default_ticket_priority: str = "medium"
    default_assign_team_id: Optional[UUID] = None


class EmailAccountUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    auto_create_tickets: Optional[bool] = None
    default_ticket_priority: Optional[str] = None
    default_assign_team_id: Optional[UUID] = None
    imap_password: Optional[str] = None
    smtp_password: Optional[str] = None
    graph_client_secret: Optional[str] = None


class EmailAccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email_address: str
    display_name: Optional[str]
    protocol: str
    is_active: bool
    is_default: bool
    auto_create_tickets: bool
    default_ticket_priority: str
    last_fetched_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


# ── Email Thread ──────────────────────────────────────────────────────────────

class EmailThreadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    account_id: UUID
    ticket_id: Optional[UUID]
    subject: str
    snippet: Optional[str]
    participant_emails: List[str]
    is_read: bool
    is_starred: bool
    is_archived: bool
    is_spam: bool
    message_count: int
    unread_count: int
    has_attachments: bool
    last_message_at: datetime
    created_at: datetime
    updated_at: datetime


class EmailThreadUpdate(BaseModel):
    is_read: Optional[bool] = None
    is_starred: Optional[bool] = None
    is_archived: Optional[bool] = None
    is_spam: Optional[bool] = None
    ticket_id: Optional[UUID] = None


class PaginatedThreads(BaseModel):
    items: List[EmailThreadOut]
    total: int
    page: int
    pages: int


# ── Email Message ─────────────────────────────────────────────────────────────

class EmailAttachmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    filename: str
    content_type: str
    size_bytes: int
    content_id: Optional[str]
    is_inline: bool
    storage_path: Optional[str]


class EmailMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    thread_id: UUID
    account_id: UUID
    direction: str
    message_type: str
    from_email: str
    from_name: Optional[str]
    sent_by_agent_id: Optional[UUID]
    to_recipients: List[Any]
    cc_recipients: List[Any]
    bcc_recipients: List[Any]
    subject: Optional[str]
    body_html: Optional[str]
    body_text: Optional[str]
    body_stripped: Optional[str]
    delivery_status: str
    delivery_error: Optional[str]
    sent_at: Optional[datetime]
    is_read: bool
    read_at: Optional[datetime]
    is_opened: bool
    open_count: int
    first_opened_at: Optional[datetime]
    ai_summary: Optional[str]
    ai_suggested_reply: Optional[str]
    ai_sentiment: Optional[str]
    received_at: datetime
    attachments: List[EmailAttachmentOut] = []


class SendEmailRequest(BaseModel):
    thread_id: Optional[UUID] = None      # None = new thread
    account_id: UUID
    to: List[Recipient]
    cc: List[Recipient] = []
    bcc: List[Recipient] = []
    subject: str
    body_html: str
    body_text: Optional[str] = None
    message_type: str = "reply"           # reply | forward | internal_note
    in_reply_to_message_id: Optional[UUID] = None
    signature_id: Optional[UUID] = None
    template_id: Optional[UUID] = None
    schedule_at: Optional[datetime] = None


class ForwardRequest(BaseModel):
    to: List[Recipient]
    cc: List[Recipient] = []
    additional_note: Optional[str] = None


class MarkReadRequest(BaseModel):
    message_ids: List[UUID]
    is_read: bool = True


# ── Template ──────────────────────────────────────────────────────────────────

class TemplateVariable(BaseModel):
    name: str
    description: Optional[str] = None
    default: Optional[str] = None


class EmailTemplateCreate(BaseModel):
    name: str
    category: str = "general"
    subject: str
    body_html: str
    body_text: Optional[str] = None
    variables: List[TemplateVariable] = []
    is_shared: bool = True


class EmailTemplateUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    subject: Optional[str] = None
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    variables: Optional[List[TemplateVariable]] = None
    is_active: Optional[bool] = None
    is_shared: Optional[bool] = None


class EmailTemplateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    category: str
    subject: str
    body_html: str
    body_text: Optional[str]
    variables: List[Any]
    is_active: bool
    is_shared: bool
    use_count: int
    created_by_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime


class RenderTemplateRequest(BaseModel):
    template_id: UUID
    variables: dict[str, str] = {}


class RenderTemplateOut(BaseModel):
    subject: str
    body_html: str
    body_text: Optional[str]


# ── Signature ─────────────────────────────────────────────────────────────────

class EmailSignatureCreate(BaseModel):
    name: str
    body_html: str
    body_text: Optional[str] = None
    is_default: bool = False


class EmailSignatureUpdate(BaseModel):
    name: Optional[str] = None
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    is_default: Optional[bool] = None


class EmailSignatureOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    agent_id: UUID
    name: str
    body_html: str
    body_text: Optional[str]
    is_default: bool
    created_at: datetime
    updated_at: datetime


# ── Routing Rule ──────────────────────────────────────────────────────────────

class RoutingCondition(BaseModel):
    field: str          # from | subject | body | to
    operator: str       # contains | not_contains | matches | starts_with | ends_with
    value: str


class RoutingAction(BaseModel):
    type: str           # create_ticket | assign_team | set_priority | add_tag | forward | skip
    params: dict[str, Any] = {}


class EmailRoutingRuleCreate(BaseModel):
    account_id: Optional[UUID] = None
    name: str
    priority: int = 100
    conditions: List[RoutingCondition]
    condition_logic: str = "AND"
    actions: List[RoutingAction]


class EmailRoutingRuleUpdate(BaseModel):
    name: Optional[str] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None
    conditions: Optional[List[RoutingCondition]] = None
    condition_logic: Optional[str] = None
    actions: Optional[List[RoutingAction]] = None


class EmailRoutingRuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    account_id: Optional[UUID]
    name: str
    priority: int
    is_active: bool
    conditions: List[Any]
    condition_logic: str
    actions: List[Any]
    created_at: datetime
    updated_at: datetime


# ── AI ────────────────────────────────────────────────────────────────────────

class AISuggestRequest(BaseModel):
    message_id: UUID
    tone: Optional[str] = "professional"    # professional | friendly | formal
    language: Optional[str] = "en"
    max_length: Optional[int] = 300


class AISuggestOut(BaseModel):
    suggestion: str
    tone: str


class AISummarizeRequest(BaseModel):
    thread_id: UUID
    max_length: Optional[int] = 200


class AISummarizeOut(BaseModel):
    summary: str
    sentiment: Optional[str]
    key_points: List[str]


# ── Search ────────────────────────────────────────────────────────────────────

class EmailSearchResult(BaseModel):
    thread_id: UUID
    message_id: UUID
    subject: str
    snippet: str
    from_email: str
    received_at: datetime


class PaginatedSearchResults(BaseModel):
    items: List[EmailSearchResult]
    total: int
    query: str


# ── Tracking ──────────────────────────────────────────────────────────────────

class TrackingEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    event_type: str
    link_url: Optional[str]
    occurred_at: datetime
