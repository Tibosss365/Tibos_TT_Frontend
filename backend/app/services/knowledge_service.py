"""Business logic for Knowledge Base articles, categories, versions, and links."""
from __future__ import annotations

import re
import unicodedata
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.knowledge import (
    KBArticle, KBArticleFeedback, KBArticleTranslation, KBArticleVersion,
    KBCategory, KBCategoryTranslation, KBTag, KBTicketArticleLink,
)
from app.schemas.knowledge import (
    ArticleCreate, ArticleListOut, ArticleOut, ArticleUpdate,
    CategoryCreate, CategoryOut, CategoryUpdate,
    FeedbackCreate, TagCreate, TicketLinkCreate, TranslationCreate,
)


# ── Utilities ─────────────────────────────────────────────────────────────────
def _slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[-\s]+", "-", text)


def _article_opts():
    return [
        selectinload(KBArticle.translations),
        selectinload(KBArticle.tags),
        selectinload(KBArticle.attachments),
        selectinload(KBArticle.author),
        selectinload(KBArticle.category).selectinload(KBCategory.translations),
    ]


# ── Categories ────────────────────────────────────────────────────────────────
async def get_category_tree(db: AsyncSession) -> list[CategoryOut]:
    result = await db.execute(
        select(KBCategory)
        .where(KBCategory.parent_id.is_(None))
        .order_by(KBCategory.sort_order)
        .options(
            selectinload(KBCategory.translations),
            selectinload(KBCategory.children).selectinload(KBCategory.translations),
            selectinload(KBCategory.children).selectinload(KBCategory.children).selectinload(KBCategory.translations),
        )
    )
    roots = result.scalars().all()
    return [CategoryOut.model_validate(c) for c in roots]


async def create_category(db: AsyncSession, data: CategoryCreate) -> CategoryOut:
    cat = KBCategory(parent_id=data.parent_id, slug=data.slug, icon=data.icon, sort_order=data.sort_order)
    db.add(cat)
    await db.flush()
    for t in data.translations:
        db.add(KBCategoryTranslation(category_id=cat.id, language=t.language, name=t.name, description=t.description))
    await db.commit()
    await db.refresh(cat)
    return CategoryOut.model_validate(cat)


async def update_category(db: AsyncSession, cat_id: UUID, data: CategoryUpdate) -> CategoryOut:
    cat = await db.get(KBCategory, cat_id)
    if not cat:
        return None
    for field, val in data.model_dump(exclude_none=True, exclude={"translations"}).items():
        setattr(cat, field, val)
    if data.translations is not None:
        for t in data.translations:
            existing = await db.execute(
                select(KBCategoryTranslation)
                .where(KBCategoryTranslation.category_id == cat_id, KBCategoryTranslation.language == t.language)
            )
            row = existing.scalar_one_or_none()
            if row:
                row.name = t.name; row.description = t.description
            else:
                db.add(KBCategoryTranslation(category_id=cat_id, language=t.language, name=t.name, description=t.description))
    await db.commit()
    await db.refresh(cat)
    return CategoryOut.model_validate(cat)


async def delete_category(db: AsyncSession, cat_id: UUID) -> bool:
    cat = await db.get(KBCategory, cat_id)
    if not cat:
        return False
    await db.delete(cat)
    await db.commit()
    return True


# ── Articles ──────────────────────────────────────────────────────────────────
async def list_articles(
    db: AsyncSession,
    *,
    visible_visibilities: list[str],
    category_id: UUID | None = None,
    status: str | None = None,
    tag_id: UUID | None = None,
    language: str = "en",
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[KBArticle], int]:
    q = (
        select(KBArticle)
        .where(KBArticle.visibility.in_(visible_visibilities))
        .options(*_article_opts())
    )
    if category_id:
        q = q.where(KBArticle.category_id == category_id)
    if status:
        q = q.where(KBArticle.status == status)
    if tag_id:
        q = q.join(KBArticle.tags).where(KBTag.id == tag_id)

    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar_one()

    q = q.order_by(KBArticle.updated_at.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(q)).scalars().all()
    return rows, total


async def get_article(db: AsyncSession, article_id: UUID, visible_visibilities: list[str]) -> KBArticle | None:
    result = await db.execute(
        select(KBArticle)
        .where(KBArticle.id == article_id, KBArticle.visibility.in_(visible_visibilities))
        .options(*_article_opts())
    )
    return result.scalar_one_or_none()


async def get_article_by_slug(db: AsyncSession, slug: str, visible_visibilities: list[str]) -> KBArticle | None:
    result = await db.execute(
        select(KBArticle)
        .where(KBArticle.slug == slug, KBArticle.visibility.in_(visible_visibilities))
        .options(*_article_opts())
    )
    return result.scalar_one_or_none()


async def create_article(db: AsyncSession, data: ArticleCreate, author_id: UUID) -> KBArticle:
    slug = data.slug or _slugify(data.translations[0].title)
    article = KBArticle(
        category_id=data.category_id,
        author_id=author_id,
        slug=slug,
        status=data.status,
        visibility=data.visibility,
        default_language=data.default_language,
        reference_url=data.reference_url,
        sort_order=data.sort_order,
    )
    db.add(article)
    await db.flush()

    for t in data.translations:
        trans = KBArticleTranslation(
            article_id=article.id, language=t.language,
            title=t.title, content=t.content, excerpt=t.excerpt,
        )
        db.add(trans)
        # Snapshot version 1
        db.add(KBArticleVersion(
            article_id=article.id, language=t.language,
            title=t.title, content=t.content,
            change_summary=data.change_summary or "Initial version",
            changed_by=author_id,
        ))

    if data.tag_ids:
        tags = (await db.execute(select(KBTag).where(KBTag.id.in_(data.tag_ids)))).scalars().all()
        article.tags = list(tags)

    if data.status == "published":
        article.published_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(article, ["translations", "tags", "attachments", "author", "category"])
    return article


async def update_article(db: AsyncSession, article: KBArticle, data: ArticleUpdate, editor_id: UUID) -> KBArticle:
    for field, val in data.model_dump(exclude_none=True, exclude={"translations", "tag_ids", "status"}).items():
        setattr(article, field, val)

    if data.status and data.status != article.status:
        article.status = data.status
        if data.status == "published" and not article.published_at:
            article.published_at = datetime.now(timezone.utc)

    if data.tag_ids is not None:
        tags = (await db.execute(select(KBTag).where(KBTag.id.in_(data.tag_ids)))).scalars().all()
        article.tags = list(tags)

    if data.translations:
        for t in data.translations:
            existing = await db.execute(
                select(KBArticleTranslation)
                .where(KBArticleTranslation.article_id == article.id, KBArticleTranslation.language == t.language)
            )
            row = existing.scalar_one_or_none()
            if row:
                row.title = t.title; row.content = t.content; row.excerpt = t.excerpt
            else:
                row = KBArticleTranslation(
                    article_id=article.id, language=t.language,
                    title=t.title, content=t.content, excerpt=t.excerpt,
                )
                db.add(row)
            # Snapshot version
            db.add(KBArticleVersion(
                article_id=article.id, language=t.language,
                title=t.title, content=t.content,
                change_summary=data.change_summary or "Updated",
                changed_by=editor_id,
            ))

    await db.commit()
    await db.refresh(article, ["translations", "tags", "attachments", "author", "category"])
    return article


async def delete_article(db: AsyncSession, article: KBArticle) -> None:
    await db.delete(article)
    await db.commit()


async def increment_view(db: AsyncSession, article_id: UUID) -> None:
    await db.execute(
        update(KBArticle).where(KBArticle.id == article_id).values(view_count=KBArticle.view_count + 1)
    )
    await db.commit()


# ── Versions ──────────────────────────────────────────────────────────────────
async def get_versions(db: AsyncSession, article_id: UUID, language: str | None = None) -> list[KBArticleVersion]:
    q = (
        select(KBArticleVersion)
        .where(KBArticleVersion.article_id == article_id)
        .options(selectinload(KBArticleVersion.author))
        .order_by(KBArticleVersion.version_number.desc())
    )
    if language:
        q = q.where(KBArticleVersion.language == language)
    return (await db.execute(q)).scalars().all()


async def revert_to_version(
    db: AsyncSession, article: KBArticle, version_number: int, language: str, editor_id: UUID, change_summary: str,
) -> KBArticle:
    ver = await db.execute(
        select(KBArticleVersion).where(
            KBArticleVersion.article_id == article.id,
            KBArticleVersion.version_number == version_number,
            KBArticleVersion.language == language,
        )
    )
    ver = ver.scalar_one_or_none()
    if not ver:
        raise ValueError(f"Version {version_number} ({language}) not found")

    trans = await db.execute(
        select(KBArticleTranslation).where(
            KBArticleTranslation.article_id == article.id,
            KBArticleTranslation.language == language,
        )
    )
    row = trans.scalar_one_or_none()
    if row:
        row.title = ver.title; row.content = ver.content
    else:
        db.add(KBArticleTranslation(article_id=article.id, language=language, title=ver.title, content=ver.content))

    db.add(KBArticleVersion(
        article_id=article.id, language=language,
        title=ver.title, content=ver.content,
        change_summary=change_summary or f"Reverted to v{version_number}",
        changed_by=editor_id,
    ))
    await db.commit()
    await db.refresh(article, ["translations"])
    return article


# ── Ticket links ──────────────────────────────────────────────────────────────
async def link_ticket(db: AsyncSession, article_id: UUID, data: TicketLinkCreate, user_id: UUID) -> KBTicketArticleLink:
    link = KBTicketArticleLink(
        ticket_id=data.ticket_id, article_id=article_id,
        linked_by=user_id, link_type=data.link_type,
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return link


async def unlink_ticket(db: AsyncSession, article_id: UUID, ticket_id: UUID) -> bool:
    result = await db.execute(
        select(KBTicketArticleLink).where(
            KBTicketArticleLink.article_id == article_id,
            KBTicketArticleLink.ticket_id == ticket_id,
        )
    )
    link = result.scalar_one_or_none()
    if not link:
        return False
    await db.delete(link)
    await db.commit()
    return True


async def get_ticket_links(db: AsyncSession, article_id: UUID) -> list[KBTicketArticleLink]:
    result = await db.execute(
        select(KBTicketArticleLink).where(KBTicketArticleLink.article_id == article_id)
    )
    return result.scalars().all()


async def get_articles_for_ticket(db: AsyncSession, ticket_id: UUID) -> list[dict]:
    result = await db.execute(
        select(KBTicketArticleLink, KBArticle, KBArticleTranslation)
        .join(KBArticle, KBTicketArticleLink.article_id == KBArticle.id)
        .outerjoin(
            KBArticleTranslation,
            (KBArticleTranslation.article_id == KBArticle.id) &
            (KBArticleTranslation.language == KBArticle.default_language),
        )
        .where(KBTicketArticleLink.ticket_id == ticket_id)
    )
    rows = result.all()
    return [
        {
            "link_id": str(link.id), "link_type": link.link_type,
            "article_id": str(art.id), "slug": art.slug,
            "status": art.status, "visibility": art.visibility,
            "title": trans.title if trans else "(no translation)",
            "linked_at": link.created_at.isoformat(),
        }
        for link, art, trans in rows
    ]


# ── Feedback ──────────────────────────────────────────────────────────────────
async def submit_feedback(
    db: AsyncSession, article_id: UUID, data: FeedbackCreate, user_id: UUID | None, ip_hash: str | None,
) -> KBArticleFeedback:
    fb = KBArticleFeedback(
        article_id=article_id, user_id=user_id,
        is_helpful=data.is_helpful, comment=data.comment, ip_hash=ip_hash,
    )
    db.add(fb)
    col = KBArticle.helpful_yes if data.is_helpful else KBArticle.helpful_no
    await db.execute(update(KBArticle).where(KBArticle.id == article_id).values({col: col + 1}))
    await db.commit()
    await db.refresh(fb)
    return fb
