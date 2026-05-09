"""
Knowledge Base API router — FastAPI.

Mount in main.py:
    from app.routers import knowledge
    app.include_router(knowledge.router, prefix="/api/kb", tags=["knowledge"])
"""
from __future__ import annotations

import hashlib
import math
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, get_optional_user
from app.auth.kb_rbac import (
    KBPerm, require_article_delete, require_article_edit,
    require_kb_perm, validate_status_transition, visible_visibilities,
)
from app.database import get_db
from app.schemas.knowledge import (
    ArticleCreate, ArticleListOut, ArticleOut, ArticleUpdate,
    AttachmentOut, CategoryCreate, CategoryOut, CategoryUpdate,
    FeedbackCreate, FeedbackOut, PaginatedArticles, RevertRequest,
    SearchResult, StatusTransitionRequest, TagCreate, TagOut,
    TicketLinkCreate, TicketLinkOut, TranslationCreate, VersionOut,
)
from app.services import knowledge_service as svc
from app.services import search_service as search_svc

router = APIRouter()


# ══════════════════════════════════════════════════════════════════════════════
# CATEGORIES
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/categories", response_model=list[CategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)):
    """Return the full category tree (all roles)."""
    return await svc.get_category_tree(db)


@router.post(
    "/categories",
    response_model=CategoryOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_kb_perm(KBPerm.MANAGE_CATEGORIES))],
)
async def create_category(data: CategoryCreate, db: AsyncSession = Depends(get_db)):
    return await svc.create_category(db, data)


@router.patch(
    "/categories/{category_id}",
    response_model=CategoryOut,
    dependencies=[Depends(require_kb_perm(KBPerm.MANAGE_CATEGORIES))],
)
async def update_category(category_id: UUID, data: CategoryUpdate, db: AsyncSession = Depends(get_db)):
    cat = await svc.update_category(db, category_id, data)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return cat


@router.delete(
    "/categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_kb_perm(KBPerm.MANAGE_CATEGORIES))],
)
async def delete_category(category_id: UUID, db: AsyncSession = Depends(get_db)):
    if not await svc.delete_category(db, category_id):
        raise HTTPException(status_code=404, detail="Category not found")


# ══════════════════════════════════════════════════════════════════════════════
# ARTICLES — list / create
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/articles", response_model=PaginatedArticles)
async def list_articles(
    category_id: Optional[UUID] = Query(None),
    status: Optional[str]       = Query(None),
    tag_id: Optional[UUID]      = Query(None),
    language: str               = Query("en"),
    page: int                   = Query(1, ge=1),
    page_size: int              = Query(20, ge=1, le=100),
    current_user                = Depends(get_current_user),
    db: AsyncSession            = Depends(get_db),
):
    vis = visible_visibilities(current_user.role)
    rows, total = await svc.list_articles(
        db, visible_visibilities=vis, category_id=category_id,
        status=status, tag_id=tag_id, language=language,
        page=page, page_size=page_size,
    )
    # Build lightweight list items with resolved translation header
    items: list[ArticleListOut] = []
    for row in rows:
        trans = next((t for t in row.translations if t.language == language), None) or \
                next((t for t in row.translations if t.language == row.default_language), None)
        item = ArticleListOut.model_validate(row)
        if trans:
            item.title   = trans.title
            item.excerpt = trans.excerpt
        items.append(item)

    return PaginatedArticles(items=items, total=total, page=page, page_size=page_size, pages=math.ceil(total / page_size) or 1)


@router.post(
    "/articles",
    response_model=ArticleOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_kb_perm(KBPerm.CREATE))],
)
async def create_article(
    data: ArticleCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await svc.create_article(db, data, author_id=current_user.id)


# ══════════════════════════════════════════════════════════════════════════════
# ARTICLES — single item
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/articles/{article_id}", response_model=ArticleOut)
async def get_article(
    article_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    vis = visible_visibilities(current_user.role)
    article = await svc.get_article(db, article_id, vis)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    await svc.increment_view(db, article_id)
    return article


@router.get("/articles/slug/{slug}", response_model=ArticleOut)
async def get_article_by_slug(
    slug: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    vis = visible_visibilities(current_user.role)
    article = await svc.get_article_by_slug(db, slug, vis)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    await svc.increment_view(db, article.id)
    return article


@router.patch("/articles/{article_id}", response_model=ArticleOut)
async def update_article(
    article_id: UUID,
    data: ArticleUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    vis = visible_visibilities(current_user.role)
    article = await svc.get_article(db, article_id, vis)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    require_article_edit(article.author_id, current_user)
    if data.status and data.status != article.status:
        validate_status_transition(article.status, data.status, current_user.role)
    return await svc.update_article(db, article, data, editor_id=current_user.id)


@router.delete("/articles/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_article(
    article_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    vis = visible_visibilities(current_user.role)
    article = await svc.get_article(db, article_id, vis)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    require_article_delete(article.author_id, current_user)
    await svc.delete_article(db, article)


# ── Status transition ─────────────────────────────────────────────────────────
@router.post("/articles/{article_id}/status", response_model=ArticleOut)
async def transition_status(
    article_id: UUID,
    body: StatusTransitionRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    vis = visible_visibilities(current_user.role)
    article = await svc.get_article(db, article_id, vis)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    require_article_edit(article.author_id, current_user)
    validate_status_transition(article.status, body.status, current_user.role)
    return await svc.update_article(db, article, ArticleUpdate(status=body.status, change_summary=body.comment), editor_id=current_user.id)


# ── Translations ──────────────────────────────────────────────────────────────
@router.put("/articles/{article_id}/translations/{language}", response_model=ArticleOut)
async def upsert_translation(
    article_id: UUID,
    language: str,
    data: TranslationCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    vis = visible_visibilities(current_user.role)
    article = await svc.get_article(db, article_id, vis)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    require_article_edit(article.author_id, current_user)
    update_data = ArticleUpdate(translations=[TranslationCreate(language=language, title=data.title, content=data.content, excerpt=data.excerpt)])
    return await svc.update_article(db, article, update_data, editor_id=current_user.id)


# ══════════════════════════════════════════════════════════════════════════════
# VERSIONS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/articles/{article_id}/versions", response_model=list[VersionOut])
async def list_versions(
    article_id: UUID,
    language: Optional[str]  = Query(None),
    current_user             = Depends(get_current_user),
    db: AsyncSession         = Depends(get_db),
):
    vis = visible_visibilities(current_user.role)
    article = await svc.get_article(db, article_id, vis)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    versions = await svc.get_versions(db, article_id, language)
    out = []
    for v in versions:
        vo = VersionOut.model_validate(v)
        vo.changed_by_name = v.author.name if v.author else None
        out.append(vo)
    return out


@router.post("/articles/{article_id}/versions/{version_number}/revert", response_model=ArticleOut)
async def revert_version(
    article_id: UUID,
    version_number: int,
    language: str = Query("en"),
    body: RevertRequest = RevertRequest(),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    vis = visible_visibilities(current_user.role)
    article = await svc.get_article(db, article_id, vis)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    require_article_edit(article.author_id, current_user)
    try:
        return await svc.revert_to_version(db, article, version_number, language, current_user.id, body.change_summary)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ══════════════════════════════════════════════════════════════════════════════
# TICKET LINKS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/articles/{article_id}/ticket-links", response_model=list[TicketLinkOut])
async def get_ticket_links(
    article_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    vis = visible_visibilities(current_user.role)
    if not await svc.get_article(db, article_id, vis):
        raise HTTPException(status_code=404, detail="Article not found")
    return await svc.get_ticket_links(db, article_id)


@router.post(
    "/articles/{article_id}/ticket-links",
    response_model=TicketLinkOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_kb_perm(KBPerm.EDIT_OWN))],
)
async def link_ticket(
    article_id: UUID,
    data: TicketLinkCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await svc.link_ticket(db, article_id, data, user_id=current_user.id)


@router.delete("/articles/{article_id}/ticket-links/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unlink_ticket(
    article_id: UUID,
    ticket_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    require_article_edit(article_id, current_user)  # reuse guard
    if not await svc.unlink_ticket(db, article_id, ticket_id):
        raise HTTPException(status_code=404, detail="Link not found")


@router.get("/tickets/{ticket_id}/articles")
async def articles_for_ticket(
    ticket_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await svc.get_articles_for_ticket(db, ticket_id)


# ══════════════════════════════════════════════════════════════════════════════
# SEARCH
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/search", response_model=SearchResult)
async def search_articles(
    q: str                        = Query(..., min_length=1, max_length=200),
    language: str                 = Query("en"),
    category_id: Optional[UUID]   = Query(None),
    status: str                   = Query("published"),
    limit: int                    = Query(20, ge=1, le=100),
    offset: int                   = Query(0, ge=0),
    current_user                  = Depends(get_current_user),
    db: AsyncSession              = Depends(get_db),
):
    vis = visible_visibilities(current_user.role)
    return await search_svc.search(
        db, query=q, language=language,
        visible_visibilities=vis, category_id=category_id,
        status=status, limit=limit, offset=offset,
    )


@router.get("/search/suggest", response_model=list[str])
async def search_suggest(
    q: str           = Query(..., min_length=2, max_length=100),
    language: str    = Query("en"),
    current_user     = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    vis = visible_visibilities(current_user.role)
    return await search_svc.suggest(db, prefix=q, language=language, visible_visibilities=vis)


# ══════════════════════════════════════════════════════════════════════════════
# FEEDBACK
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/articles/{article_id}/feedback", response_model=FeedbackOut, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    article_id: UUID,
    data: FeedbackCreate,
    request: Request,
    current_user=Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    ip = request.client.host if request.client else "unknown"
    ip_hash = hashlib.sha256(ip.encode()).hexdigest()
    user_id = current_user.id if current_user else None
    return await svc.submit_feedback(db, article_id, data, user_id=user_id, ip_hash=ip_hash)
