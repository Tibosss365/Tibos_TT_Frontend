-- ============================================================
-- 002_email_schema.sql
-- Enterprise Email Communication Module
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Email accounts (IMAP/SMTP/Graph API inboxes) ─────────────────────────────

CREATE TABLE email_accounts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL,
    email_address   TEXT NOT NULL UNIQUE,
    display_name    TEXT,
    protocol        TEXT NOT NULL CHECK (protocol IN ('imap_smtp', 'graph_api')),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,

    -- IMAP settings (encrypted at application layer before storage)
    imap_host       TEXT,
    imap_port       INTEGER,
    imap_use_ssl    BOOLEAN DEFAULT TRUE,
    imap_username   TEXT,
    imap_password   TEXT,          -- stored encrypted

    -- SMTP settings
    smtp_host       TEXT,
    smtp_port       INTEGER,
    smtp_use_tls    BOOLEAN DEFAULT TRUE,
    smtp_username   TEXT,
    smtp_password   TEXT,          -- stored encrypted

    -- Microsoft Graph API settings
    graph_tenant_id     TEXT,
    graph_client_id     TEXT,
    graph_client_secret TEXT,      -- stored encrypted
    graph_user_id       TEXT,      -- mailbox user object ID or UPN

    -- Fetch state
    last_fetched_at TIMESTAMPTZ,
    fetch_since_uid BIGINT DEFAULT 0,   -- IMAP UID watermark
    graph_delta_link TEXT,              -- Graph delta token

    -- Auto ticket creation settings
    auto_create_tickets     BOOLEAN NOT NULL DEFAULT FALSE,
    default_ticket_priority TEXT DEFAULT 'medium',
    default_assign_team_id  UUID,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_accounts_active ON email_accounts (is_active);

-- ── Email threads (conversation groupings) ────────────────────────────────────

CREATE TABLE email_threads (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id      UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
    ticket_id       UUID,           -- FK to tickets table (optional)
    subject         TEXT NOT NULL,
    snippet         TEXT,           -- preview from last message
    external_thread_id  TEXT,       -- Graph conversationId or IMAP thread header value
    participant_emails  TEXT[]  NOT NULL DEFAULT '{}',
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    is_starred      BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived     BOOLEAN NOT NULL DEFAULT FALSE,
    is_spam         BOOLEAN NOT NULL DEFAULT FALSE,
    message_count   INTEGER NOT NULL DEFAULT 0,
    unread_count    INTEGER NOT NULL DEFAULT 0,
    has_attachments BOOLEAN NOT NULL DEFAULT FALSE,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_threads_account     ON email_threads (account_id, last_message_at DESC);
CREATE INDEX idx_email_threads_ticket      ON email_threads (ticket_id) WHERE ticket_id IS NOT NULL;
CREATE INDEX idx_email_threads_unread      ON email_threads (account_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_email_threads_starred     ON email_threads (account_id, is_starred) WHERE is_starred = TRUE;
CREATE INDEX idx_email_threads_external    ON email_threads (external_thread_id) WHERE external_thread_id IS NOT NULL;

-- Full-text search on thread subjects
ALTER TABLE email_threads ADD COLUMN search_vector TSVECTOR;
CREATE INDEX idx_email_threads_fts ON email_threads USING GIN (search_vector);

CREATE OR REPLACE FUNCTION email_thread_search_trigger() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', coalesce(NEW.subject, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_thread_search_trigger
    BEFORE INSERT OR UPDATE OF subject ON email_threads
    FOR EACH ROW EXECUTE FUNCTION email_thread_search_trigger();

-- ── Email messages (individual emails in a thread) ────────────────────────────

CREATE TABLE email_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id       UUID NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
    account_id      UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,

    -- Message identity
    message_id_header   TEXT UNIQUE,    -- RFC 2822 Message-ID header
    external_id         TEXT,           -- Graph message ID or IMAP UID
    in_reply_to         TEXT,           -- References / In-Reply-To header

    -- Direction & type
    direction   TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message_type TEXT NOT NULL DEFAULT 'reply' CHECK (message_type IN ('reply', 'internal_note', 'forward', 'original')),

    -- Author
    from_email      TEXT NOT NULL,
    from_name       TEXT,
    sent_by_agent_id UUID,             -- if outbound, the agent who sent it

    -- Recipients (stored as JSONB arrays: [{email, name}])
    to_recipients   JSONB NOT NULL DEFAULT '[]',
    cc_recipients   JSONB NOT NULL DEFAULT '[]',
    bcc_recipients  JSONB NOT NULL DEFAULT '[]',

    -- Content
    subject         TEXT,
    body_html       TEXT,
    body_text       TEXT,
    body_stripped   TEXT,              -- body with quoted replies stripped

    -- Delivery status (outbound)
    delivery_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (delivery_status IN ('pending', 'queued', 'sent', 'delivered', 'failed', 'bounced')),
    delivery_error  TEXT,
    sent_at         TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,

    -- Read tracking (inbound)
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    read_at         TIMESTAMPTZ,

    -- Open/click tracking (outbound)
    tracking_pixel_id   TEXT UNIQUE,
    is_opened           BOOLEAN NOT NULL DEFAULT FALSE,
    open_count          INTEGER NOT NULL DEFAULT 0,
    first_opened_at     TIMESTAMPTZ,

    -- AI fields
    ai_summary          TEXT,
    ai_suggested_reply  TEXT,
    ai_sentiment        TEXT CHECK (ai_sentiment IN ('positive', 'neutral', 'negative', NULL)),
    ai_processed_at     TIMESTAMPTZ,

    -- Signature used (outbound)
    signature_id    UUID,

    -- Template used (outbound)
    template_id     UUID,

    -- Timestamps
    received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_messages_thread      ON email_messages (thread_id, received_at ASC);
CREATE INDEX idx_email_messages_account     ON email_messages (account_id);
CREATE INDEX idx_email_messages_agent       ON email_messages (sent_by_agent_id) WHERE sent_by_agent_id IS NOT NULL;
CREATE INDEX idx_email_messages_external    ON email_messages (external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_email_messages_tracking    ON email_messages (tracking_pixel_id) WHERE tracking_pixel_id IS NOT NULL;
CREATE INDEX idx_email_messages_delivery    ON email_messages (delivery_status) WHERE delivery_status IN ('pending', 'queued', 'failed');
CREATE INDEX idx_email_messages_unread      ON email_messages (thread_id, is_read) WHERE is_read = FALSE;

-- FTS on body
ALTER TABLE email_messages ADD COLUMN search_vector TSVECTOR;
CREATE INDEX idx_email_messages_fts ON email_messages USING GIN (search_vector);

CREATE OR REPLACE FUNCTION email_message_search_trigger() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := to_tsvector('english',
        coalesce(NEW.subject, '') || ' ' ||
        coalesce(NEW.body_stripped, NEW.body_text, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_message_search_trigger
    BEFORE INSERT OR UPDATE OF subject, body_stripped, body_text ON email_messages
    FOR EACH ROW EXECUTE FUNCTION email_message_search_trigger();

-- Keep thread counters in sync
CREATE OR REPLACE FUNCTION update_thread_counters() RETURNS trigger AS $$
BEGIN
    UPDATE email_threads SET
        message_count   = (SELECT COUNT(*) FROM email_messages WHERE thread_id = NEW.thread_id),
        unread_count    = (SELECT COUNT(*) FROM email_messages WHERE thread_id = NEW.thread_id AND is_read = FALSE AND direction = 'inbound'),
        has_attachments = EXISTS (SELECT 1 FROM email_attachments WHERE message_id IN (SELECT id FROM email_messages WHERE thread_id = NEW.thread_id)),
        snippet         = (SELECT body_stripped FROM email_messages WHERE thread_id = NEW.thread_id ORDER BY received_at DESC LIMIT 1),
        last_message_at = (SELECT MAX(received_at) FROM email_messages WHERE thread_id = NEW.thread_id),
        updated_at      = NOW()
    WHERE id = NEW.thread_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_thread_counters_trigger
    AFTER INSERT OR UPDATE ON email_messages
    FOR EACH ROW EXECUTE FUNCTION update_thread_counters();

-- ── Email attachments ──────────────────────────────────────────────────────────

CREATE TABLE email_attachments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id      UUID NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
    filename        TEXT NOT NULL,
    content_type    TEXT NOT NULL,
    size_bytes      BIGINT NOT NULL DEFAULT 0,
    storage_path    TEXT,           -- S3/Azure Blob path
    content_id      TEXT,           -- cid: for inline images
    is_inline       BOOLEAN NOT NULL DEFAULT FALSE,
    external_id     TEXT,           -- Graph attachment ID for lazy fetch
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_attachments_message ON email_attachments (message_id);

-- ── Email templates ────────────────────────────────────────────────────────────

CREATE TABLE email_templates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL,
    category        TEXT NOT NULL DEFAULT 'general',
    subject         TEXT NOT NULL,
    body_html       TEXT NOT NULL,
    body_text       TEXT,
    variables       JSONB NOT NULL DEFAULT '[]',  -- [{name, description, default}]
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_shared       BOOLEAN NOT NULL DEFAULT TRUE,  -- false = private to creator
    created_by_id   UUID,
    updated_by_id   UUID,
    use_count       INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_templates_active   ON email_templates (is_active, category);
CREATE INDEX idx_email_templates_creator  ON email_templates (created_by_id);

-- ── Email signatures (per-agent) ───────────────────────────────────────────────

CREATE TABLE email_signatures (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id    UUID NOT NULL,
    name        TEXT NOT NULL,
    body_html   TEXT NOT NULL,
    body_text   TEXT,
    is_default  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (agent_id, name)
);

CREATE INDEX idx_email_signatures_agent ON email_signatures (agent_id, is_default);

-- Only one default per agent
CREATE UNIQUE INDEX idx_email_signatures_one_default
    ON email_signatures (agent_id)
    WHERE is_default = TRUE;

-- ── Email routing rules (auto ticket creation / assignment) ────────────────────

CREATE TABLE email_routing_rules (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id  UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    priority    INTEGER NOT NULL DEFAULT 100,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    -- conditions: [{field: 'from'|'subject'|'body', operator: 'contains'|'matches', value}]
    conditions  JSONB NOT NULL DEFAULT '[]',
    condition_logic TEXT NOT NULL DEFAULT 'AND' CHECK (condition_logic IN ('AND', 'OR')),
    -- actions: [{type: 'create_ticket'|'assign_team'|'set_priority'|'add_tag'|'forward'|'skip', ...params}]
    actions     JSONB NOT NULL DEFAULT '[]',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_routing_account ON email_routing_rules (account_id, is_active, priority);

-- ── Email tracking events (open/click) ────────────────────────────────────────

CREATE TABLE email_tracking_events (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id  UUID NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
    event_type  TEXT NOT NULL CHECK (event_type IN ('open', 'click')),
    ip_address  INET,
    user_agent  TEXT,
    link_url    TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_tracking_message ON email_tracking_events (message_id, event_type);
CREATE INDEX idx_email_tracking_time    ON email_tracking_events (occurred_at DESC);

-- Update open stats on tracking event
CREATE OR REPLACE FUNCTION update_message_open_stats() RETURNS trigger AS $$
BEGIN
    IF NEW.event_type = 'open' THEN
        UPDATE email_messages SET
            is_opened       = TRUE,
            open_count      = open_count + 1,
            first_opened_at = COALESCE(first_opened_at, NEW.occurred_at)
        WHERE id = NEW.message_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_tracking_open_trigger
    AFTER INSERT ON email_tracking_events
    FOR EACH ROW EXECUTE FUNCTION update_message_open_stats();

-- ── Email audit logs ──────────────────────────────────────────────────────────

CREATE TABLE email_audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id    UUID,               -- agent who performed action (NULL = system)
    actor_email TEXT,
    action      TEXT NOT NULL,      -- e.g. 'message.sent', 'thread.archived', 'account.created'
    entity_type TEXT NOT NULL,      -- 'message', 'thread', 'account', 'template', 'signature'
    entity_id   UUID,
    detail      JSONB DEFAULT '{}', -- arbitrary extra context
    ip_address  INET,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_audit_entity  ON email_audit_logs (entity_type, entity_id);
CREATE INDEX idx_email_audit_actor   ON email_audit_logs (actor_id);
CREATE INDEX idx_email_audit_time    ON email_audit_logs (occurred_at DESC);
CREATE INDEX idx_email_audit_action  ON email_audit_logs (action);

-- ── updated_at auto-update trigger (shared) ───────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'email_accounts','email_threads','email_messages',
        'email_templates','email_signatures','email_routing_rules'
    ] LOOP
        EXECUTE format(
            'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
            tbl
        );
    END LOOP;
END $$;
