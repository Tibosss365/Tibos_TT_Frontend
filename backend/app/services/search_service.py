"""
Full-text search for Knowledge Base.

Strategy:
  1. Rank using ts_rank_cd (cover-density) on pre-computed tsvector column.
  2. Fall back to trigram similarity (pg_trgm) when FTS returns zero results.
  3. ts_headline provides context-aware result snippets.
  4. Results are filtered by caller-supplied visibility list (RBAC).
"""
from __future__ import annotations

import time
from uuid import UUID

from sqlalchemy import and_, func, literal, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.knowledge import KBArticle, KBArticleTranslation, KBCategory, KBCategoryTranslation
from app.schemas.knowledge import SearchHit, SearchResult


# ── Language config helper ────────────────────────────────────────────────────
_LANG_CONFIG: dict[str, str] = {
    "en": "english", "fr": "french", "de": "german", "es": "spanish",
    "pt": "portuguese", "it": "italian", "nl": "dutch", "ru": "russian",
    "ar": "arabic", "tr": "turkish", "sv": "swedish", "da": "danish",
    "fi": "finnish", "nb": "norwegian", "hu": "hungarian", "ro": "romanian",
}


def _ts_config(language: str) -> str:
    return _LANG_CONFIG.get(language, "simple")


# ── Primary: full-text search ─────────────────────────────────────────────────
async def fts_search(
    db: AsyncSession,
    query: str,
    language: str = "en",
    visible_visibilities: list[str] | None = None,
    category_id: UUID | None = None,
    status: str = "published",
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[SearchHit], int]:
    if not query.strip():
        return [], 0

    visible_visibilities = visible_visibilities or ["public"]
    ts_config = _ts_config(language)

    # Build tsquery — support phrase (quoted) and prefix (word:*)
    tsquery_expr = func.websearch_to_tsquery(ts_config, query)

    rank_expr = func.ts_rank_cd(KBArticleTranslation.search_vector, tsquery_expr, 32)

    headline_expr = func.ts_headline(
        ts_config,
        KBArticleTranslation.content,
        tsquery_expr,
        "MaxWords=35, MinWords=15, MaxFragments=2, StartSel=<mark>, StopSel=</mark>",
    )

    stmt = (
        select(
            KBArticle.id,
            KBArticle.slug,
            KBArticle.status,
            KBArticle.visibility,
            KBArticle.category_id,
            KBArticle.published_at,
            KBArticleTranslation.language,
            KBArticleTranslation.title,
            headline_expr.label("headline"),
            rank_expr.label("rank"),
        )
        .join(KBArticleTranslation, KBArticleTranslation.article_id == KBArticle.id)
        .where(
            KBArticleTranslation.search_vector.op("@@")(tsquery_expr),
            KBArticle.visibility.in_(visible_visibilities),
            KBArticleTranslation.language == language,
        )
    )

    if status:
        stmt = stmt.where(KBArticle.status == status)
    if category_id:
        stmt = stmt.where(KBArticle.category_id == category_id)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = stmt.order_by(rank_expr.desc()).limit(limit).offset(offset)
    rows = (await db.execute(stmt)).mappings().all()

    return [SearchHit(**dict(row), category_name=None) for row in rows], total


# ── Fallback: trigram similarity ──────────────────────────────────────────────
async def trigram_search(
    db: AsyncSession,
    query: str,
    language: str = "en",
    visible_visibilities: list[str] | None = None,
    limit: int = 10,
) -> list[SearchHit]:
    visible_visibilities = visible_visibilities or ["public"]
    similarity = func.similarity(KBArticleTranslation.title, query)

    stmt = (
        select(
            KBArticle.id,
            KBArticle.slug,
            KBArticle.status,
            KBArticle.visibility,
            KBArticle.category_id,
            KBArticle.published_at,
            KBArticleTranslation.language,
            KBArticleTranslation.title,
            KBArticleTranslation.excerpt.label("headline"),
            similarity.label("rank"),
        )
        .join(KBArticleTranslation, KBArticleTranslation.article_id == KBArticle.id)
        .where(
            similarity > 0.2,
            KBArticle.visibility.in_(visible_visibilities),
            KBArticle.status == "published",
            KBArticleTranslation.language == language,
        )
        .order_by(similarity.desc())
        .limit(limit)
    )

    rows = (await db.execute(stmt)).mappings().all()
    return [SearchHit(**dict(row), category_name=None) for row in rows]


# ── Search suggestions (autocomplete) ────────────────────────────────────────
async def suggest(
    db: AsyncSession,
    prefix: str,
    language: str = "en",
    visible_visibilities: list[str] | None = None,
    limit: int = 8,
) -> list[str]:
    visible_visibilities = visible_visibilities or ["public"]
    stmt = (
        select(KBArticleTranslation.title)
        .join(KBArticle, KBArticle.id == KBArticleTranslation.article_id)
        .where(
            func.lower(KBArticleTranslation.title).contains(prefix.lower()),
            KBArticle.visibility.in_(visible_visibilities),
            KBArticle.status == "published",
            KBArticleTranslation.language == language,
        )
        .order_by(KBArticleTranslation.title)
        .limit(limit)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return list(rows)


# ── Orchestrator ──────────────────────────────────────────────────────────────
async def search(
    db: AsyncSession,
    query: str,
    language: str = "en",
    visible_visibilities: list[str] | None = None,
    category_id: UUID | None = None,
    status: str = "published",
    limit: int = 20,
    offset: int = 0,
) -> SearchResult:
    t0 = time.perf_counter()

    hits, total = await fts_search(
        db, query, language=language,
        visible_visibilities=visible_visibilities,
        category_id=category_id, status=status,
        limit=limit, offset=offset,
    )

    # Fallback to trigram when FTS finds nothing
    if not hits:
        hits = await trigram_search(db, query, language=language, visible_visibilities=visible_visibilities, limit=limit)
        total = len(hits)

    # Enrich with category names
    cat_ids = {h.category_id for h in hits if h.category_id}
    if cat_ids:
        cat_rows = (
            await db.execute(
                select(KBCategoryTranslation.category_id, KBCategoryTranslation.name)
                .where(KBCategoryTranslation.category_id.in_(cat_ids), KBCategoryTranslation.language == language)
            )
        ).all()
        cat_map = {str(r.category_id): r.name for r in cat_rows}
        for h in hits:
            h.category_name = cat_map.get(str(h.category_id))

    took_ms = (time.perf_counter() - t0) * 1000
    return SearchResult(query=query, hits=hits, total=total, took_ms=round(took_ms, 2))
