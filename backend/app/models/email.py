from __future__ import annotations
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger, Boolean, Column, DateTime, ForeignKey, Index,
    Integer, String, Text, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY, INET, JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


# ── Email Account ─────────────────────────────────────────────────────────────

class EmailAccount(Base):
    __tablename__ = "email_accounts"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name          = Column(Text, nullable=False)
    email_address = Column(Text, nullable=False, unique=True)
    display_name  = Column(Text)
    protocol      = Column(String(20), nullable=False)   # imap_smtp | graph_api
    is_active     = Column(Boolean, nullable=False, default=True)
    is_default    = Column(Boolean, nullable=False, default=False)

    # IMAP
    imap_host     = Column(Text)
    imap_port     = Column(Integer)
    imap_use_ssl  = Column(Boolean, default=True)
    imap_username = Column(Text)
    imap_password = Column(Text)

    # SMTP
    smtp_host     = Column(Text)
    smtp_port     = Column(Integer)
    smtp_use_tls  = Column(Boolean, default=True)
    smtp_username = Column(Text)
    smtp_password = Column(Text)

    # Graph API
    graph_tenant_id     = Column(Text)
    graph_client_id     = Column(Text)
    graph_client_secret = Column(Text)
    graph_user_id       = Column(Text)

    # Fetch state
    last_fetched_at = Column(DateTime(timezone=True))
    fetch_since_uid = Column(BigInteger, default=0)
    graph_delta_link = Column(Text)

    # Auto ticket
    auto_create_tickets     = Column(Boolean, nullable=False, default=False)
    default_ticket_priority = Column(String(20), default="medium")
    default_assign_team_id  = Column(UUID(as_uuid=True))

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    threads       = relationship("EmailThread", back_populates="account", cascade="all, delete-orphan")
    routing_rules = relationship("EmailRoutingRule", back_populates="account", cascade="all, delete-orphan")


# ── Email Thread ──────────────────────────────────────────────────────────────

class EmailThread(Base):
    __tablename__ = "email_threads"

    id                 = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id         = Column(UUID(as_uuid=True), ForeignKey("email_accounts.id", ondelete="CASCADE"), nullable=False)
    ticket_id          = Column(UUID(as_uuid=True))
    subject            = Column(Text, nullable=False)
    snippet            = Column(Text)
    external_thread_id = Column(Text)
    participant_emails = Column(ARRAY(Text), nullable=False, default=list)
    is_read            = Column(Boolean, nullable=False, default=False)
    is_starred         = Column(Boolean, nullable=False, default=False)
    is_archived        = Column(Boolean, nullable=False, default=False)
    is_spam            = Column(Boolean, nullable=False, default=False)
    message_count      = Column(Integer, nullable=False, default=0)
    unread_count       = Column(Integer, nullable=False, default=0)
    has_attachments    = Column(Boolean, nullable=False, default=False)
    last_message_at    = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    created_at         = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at         = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    account  = relationship("EmailAccount", back_populates="threads")
    messages = relationship("EmailMessage", back_populates="thread", cascade="all, delete-orphan",
                            order_by="EmailMessage.received_at")


# ── Email Message ─────────────────────────────────────────────────────────────

class EmailMessage(Base):
    __tablename__ = "email_messages"

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id         = Column(UUID(as_uuid=True), ForeignKey("email_threads.id", ondelete="CASCADE"), nullable=False)
    account_id        = Column(UUID(as_uuid=True), ForeignKey("email_accounts.id", ondelete="CASCADE"), nullable=False)

    message_id_header = Column(Text, unique=True)
    external_id       = Column(Text)
    in_reply_to       = Column(Text)

    direction         = Column(String(10), nullable=False)   # inbound | outbound
    message_type      = Column(String(20), nullable=False, default="reply")

    from_email        = Column(Text, nullable=False)
    from_name         = Column(Text)
    sent_by_agent_id  = Column(UUID(as_uuid=True))

    to_recipients  = Column(JSONB, nullable=False, default=list)
    cc_recipients  = Column(JSONB, nullable=False, default=list)
    bcc_recipients = Column(JSONB, nullable=False, default=list)

    subject       = Column(Text)
    body_html     = Column(Text)
    body_text     = Column(Text)
    body_stripped = Column(Text)

    delivery_status = Column(String(20), nullable=False, default="pending")
    delivery_error  = Column(Text)
    sent_at         = Column(DateTime(timezone=True))
    delivered_at    = Column(DateTime(timezone=True))

    is_read  = Column(Boolean, nullable=False, default=False)
    read_at  = Column(DateTime(timezone=True))

    tracking_pixel_id = Column(Text, unique=True)
    is_opened         = Column(Boolean, nullable=False, default=False)
    open_count        = Column(Integer, nullable=False, default=0)
    first_opened_at   = Column(DateTime(timezone=True))

    ai_summary          = Column(Text)
    ai_suggested_reply  = Column(Text)
    ai_sentiment        = Column(String(10))
    ai_processed_at     = Column(DateTime(timezone=True))

    signature_id = Column(UUID(as_uuid=True), ForeignKey("email_signatures.id", ondelete="SET NULL"))
    template_id  = Column(UUID(as_uuid=True), ForeignKey("email_templates.id", ondelete="SET NULL"))

    received_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    created_at  = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    thread      = relationship("EmailThread", back_populates="messages")
    attachments = relationship("EmailAttachment", back_populates="message", cascade="all, delete-orphan")
    tracking    = relationship("EmailTrackingEvent", back_populates="message", cascade="all, delete-orphan")
    signature   = relationship("EmailSignature")
    template    = relationship("EmailTemplate")


# ── Email Attachment ──────────────────────────────────────────────────────────

class EmailAttachment(Base):
    __tablename__ = "email_attachments"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id   = Column(UUID(as_uuid=True), ForeignKey("email_messages.id", ondelete="CASCADE"), nullable=False)
    filename     = Column(Text, nullable=False)
    content_type = Column(Text, nullable=False)
    size_bytes   = Column(BigInteger, nullable=False, default=0)
    storage_path = Column(Text)
    content_id   = Column(Text)
    is_inline    = Column(Boolean, nullable=False, default=False)
    external_id  = Column(Text)
    created_at   = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    message = relationship("EmailMessage", back_populates="attachments")


# ── Email Template ────────────────────────────────────────────────────────────

class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name          = Column(Text, nullable=False)
    category      = Column(Text, nullable=False, default="general")
    subject       = Column(Text, nullable=False)
    body_html     = Column(Text, nullable=False)
    body_text     = Column(Text)
    variables     = Column(JSONB, nullable=False, default=list)
    is_active     = Column(Boolean, nullable=False, default=True)
    is_shared     = Column(Boolean, nullable=False, default=True)
    created_by_id = Column(UUID(as_uuid=True))
    updated_by_id = Column(UUID(as_uuid=True))
    use_count     = Column(Integer, nullable=False, default=0)
    created_at    = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


# ── Email Signature ───────────────────────────────────────────────────────────

class EmailSignature(Base):
    __tablename__ = "email_signatures"
    __table_args__ = (
        UniqueConstraint("agent_id", "name"),
    )

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id   = Column(UUID(as_uuid=True), nullable=False)
    name       = Column(Text, nullable=False)
    body_html  = Column(Text, nullable=False)
    body_text  = Column(Text)
    is_default = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


# ── Email Routing Rule ────────────────────────────────────────────────────────

class EmailRoutingRule(Base):
    __tablename__ = "email_routing_rules"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id      = Column(UUID(as_uuid=True), ForeignKey("email_accounts.id", ondelete="CASCADE"))
    name            = Column(Text, nullable=False)
    priority        = Column(Integer, nullable=False, default=100)
    is_active       = Column(Boolean, nullable=False, default=True)
    conditions      = Column(JSONB, nullable=False, default=list)
    condition_logic = Column(String(3), nullable=False, default="AND")
    actions         = Column(JSONB, nullable=False, default=list)
    created_at      = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    account = relationship("EmailAccount", back_populates="routing_rules")


# ── Email Tracking Event ──────────────────────────────────────────────────────

class EmailTrackingEvent(Base):
    __tablename__ = "email_tracking_events"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id  = Column(UUID(as_uuid=True), ForeignKey("email_messages.id", ondelete="CASCADE"), nullable=False)
    event_type  = Column(String(10), nullable=False)   # open | click
    ip_address  = Column(INET)
    user_agent  = Column(Text)
    link_url    = Column(Text)
    occurred_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    message = relationship("EmailMessage", back_populates="tracking")


# ── Email Audit Log ───────────────────────────────────────────────────────────

class EmailAuditLog(Base):
    __tablename__ = "email_audit_logs"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_id    = Column(UUID(as_uuid=True))
    actor_email = Column(Text)
    action      = Column(Text, nullable=False)
    entity_type = Column(Text, nullable=False)
    entity_id   = Column(UUID(as_uuid=True))
    detail      = Column(JSONB, default=dict)
    ip_address  = Column(INET)
    occurred_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
