-- ═══════════════════════════════════════════════════════════════════════════
-- Knowledge Base Schema  — PostgreSQL 14+
-- Depends on: users(id UUID), tickets(id UUID)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ─────────────────────────────────────────────────────────────────────────────
-- CATEGORIES (hierarchical / self-referential)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE kb_categories (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id   UUID         REFERENCES kb_categories(id) ON DELETE CASCADE,
    slug        VARCHAR(255) NOT NULL UNIQUE,
    icon        VARCHAR(100),
    sort_order  INTEGER      NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kb_categories_parent ON kb_categories(parent_id);
CREATE INDEX idx_kb_categories_slug   ON kb_categories(slug);

-- Category labels per language
CREATE TABLE kb_category_translations (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id  UUID         NOT NULL REFERENCES kb_categories(id) ON DELETE CASCADE,
    language     VARCHAR(10)  NOT NULL,
    name         VARCHAR(255) NOT NULL,
    description  TEXT,
    UNIQUE (category_id, language)
);

CREATE INDEX idx_kb_cattrans_cat ON kb_category_translations(category_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ARTICLES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE kb_articles (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id       UUID         REFERENCES kb_categories(id) ON DELETE SET NULL,
    author_id         UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    slug              VARCHAR(600) NOT NULL UNIQUE,
    status            VARCHAR(20)  NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft','review','approved','published','archived')),
    visibility        VARCHAR(30)  NOT NULL DEFAULT 'public'
                          CHECK (visibility IN ('public','internal','agent_only','customer_specific')),
    default_language  VARCHAR(10)  NOT NULL DEFAULT 'en',
    reference_url     TEXT,
    sort_order        INTEGER      NOT NULL DEFAULT 0,
    view_count        INTEGER      NOT NULL DEFAULT 0,
    helpful_yes       INTEGER      NOT NULL DEFAULT 0,
    helpful_no        INTEGER      NOT NULL DEFAULT 0,
    published_at      TIMESTAMPTZ,
    reviewed_by       UUID         REFERENCES users(id),
    reviewed_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kb_articles_category   ON kb_articles(category_id);
CREATE INDEX idx_kb_articles_author     ON kb_articles(author_id);
CREATE INDEX idx_kb_articles_status     ON kb_articles(status);
CREATE INDEX idx_kb_articles_visibility ON kb_articles(visibility);
CREATE INDEX idx_kb_articles_published  ON kb_articles(published_at DESC NULLS LAST);

-- ─────────────────────────────────────────────────────────────────────────────
-- ARTICLE TRANSLATIONS (multi-language content + FTS)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE kb_article_translations (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id    UUID         NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
    language      VARCHAR(10)  NOT NULL,
    title         VARCHAR(500) NOT NULL,
    content       TEXT         NOT NULL,
    excerpt       TEXT,
    search_vector TSVECTOR,                          -- auto-maintained by trigger
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (article_id, language)
);

CREATE INDEX idx_kb_trans_article ON kb_article_translations(article_id);
CREATE INDEX idx_kb_trans_fts     ON kb_article_translations USING GIN(search_vector);
CREATE INDEX idx_kb_trans_trgm    ON kb_article_translations USING GIN(title gin_trgm_ops);

-- Language-aware stemming for FTS
CREATE OR REPLACE FUNCTION kb_search_vector_trigger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_config REGCONFIG;
BEGIN
    v_config := CASE NEW.language
        WHEN 'ar' THEN 'arabic'    WHEN 'da' THEN 'danish'
        WHEN 'nl' THEN 'dutch'     WHEN 'en' THEN 'english'
        WHEN 'fi' THEN 'finnish'   WHEN 'fr' THEN 'french'
        WHEN 'de' THEN 'german'    WHEN 'hu' THEN 'hungarian'
        WHEN 'it' THEN 'italian'   WHEN 'nb' THEN 'norwegian'
        WHEN 'pt' THEN 'portuguese' WHEN 'ro' THEN 'romanian'
        WHEN 'ru' THEN 'russian'   WHEN 'es' THEN 'spanish'
        WHEN 'sv' THEN 'swedish'   WHEN 'tr' THEN 'turkish'
        ELSE 'simple'
    END;
    -- Title: weight A  |  Excerpt: weight B  |  Content: weight C
    NEW.search_vector :=
        setweight(to_tsvector(v_config, unaccent(coalesce(NEW.title,   ''))), 'A') ||
        setweight(to_tsvector(v_config, unaccent(coalesce(NEW.excerpt, ''))), 'B') ||
        setweight(to_tsvector(v_config, unaccent(coalesce(NEW.content, ''))), 'C');
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_kb_trans_search_vector
    BEFORE INSERT OR UPDATE OF title, excerpt, content, language
    ON kb_article_translations
    FOR EACH ROW EXECUTE FUNCTION kb_search_vector_trigger();

-- ─────────────────────────────────────────────────────────────────────────────
-- ARTICLE VERSIONS (immutable snapshot on every save)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE kb_article_versions (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id     UUID         NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
    version_number INTEGER      NOT NULL,
    language       VARCHAR(10)  NOT NULL DEFAULT 'en',
    title          VARCHAR(500) NOT NULL,
    content        TEXT         NOT NULL,
    change_summary TEXT,
    changed_by     UUID         NOT NULL REFERENCES users(id),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (article_id, version_number, language)
);

CREATE INDEX idx_kb_versions_article ON kb_article_versions(article_id, version_number DESC);

-- Auto-assign version_number per article+language
CREATE OR REPLACE FUNCTION kb_assign_version_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO   NEW.version_number
    FROM   kb_article_versions
    WHERE  article_id = NEW.article_id
      AND  language   = NEW.language;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_kb_version_number
    BEFORE INSERT ON kb_article_versions
    FOR EACH ROW EXECUTE FUNCTION kb_assign_version_number();

-- ─────────────────────────────────────────────────────────────────────────────
-- TAGS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE kb_tags (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(100) NOT NULL UNIQUE,
    color      VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE kb_article_tags (
    article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
    tag_id     UUID NOT NULL REFERENCES kb_tags(id)     ON DELETE CASCADE,
    PRIMARY KEY (article_id, tag_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ATTACHMENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE kb_article_attachments (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id    UUID         NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
    file_name     VARCHAR(500) NOT NULL,
    file_path     TEXT         NOT NULL,
    file_size     BIGINT,
    content_type  VARCHAR(200),
    is_image      BOOLEAN      NOT NULL DEFAULT FALSE,
    storage_key   TEXT,
    uploaded_by   UUID         NOT NULL REFERENCES users(id),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kb_attach_article ON kb_article_attachments(article_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TICKET ↔ ARTICLE LINKS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE kb_ticket_article_links (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id  UUID        NOT NULL REFERENCES tickets(id)     ON DELETE CASCADE,
    article_id UUID        NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
    linked_by  UUID        NOT NULL REFERENCES users(id),
    link_type  VARCHAR(30) NOT NULL DEFAULT 'related'
                   CHECK (link_type IN ('related','resolved_by','referenced')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (ticket_id, article_id)
);

CREATE INDEX idx_kb_links_ticket  ON kb_ticket_article_links(ticket_id);
CREATE INDEX idx_kb_links_article ON kb_ticket_article_links(article_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ARTICLE FEEDBACK
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE kb_article_feedback (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID        NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
    user_id    UUID        REFERENCES users(id),
    is_helpful BOOLEAN     NOT NULL,
    comment    TEXT,
    ip_hash    VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kb_feedback_article ON kb_article_feedback(article_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATED_AT maintenance
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ DECLARE t TEXT;
BEGIN FOR t IN VALUES ('kb_categories'),('kb_articles'),('kb_article_translations')
LOOP EXECUTE format(
    'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
    t, t);
END LOOP; END;$$;
