"""Pydantic v2 schemas for the Knowledge Base API."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator, model_validator


# ── Shared ────────────────────────────────────────────────────────────────────
ArticleStatus     = Literal["draft", "review", "approved", "published", "archived"]
ArticleVisibility = Literal["public", "internal", "agent_only", "customer_specific"]
LinkType          = Literal["related", "resolved_by", "referenced"]


# ── Category ──────────────────────────────────────────────────────────────────
class CategoryTranslationIn(BaseModel):
    language: str = Field(..., min_length=2, max_length=10)
    name: str     = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class CategoryTranslationOut(CategoryTranslationIn):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


class CategoryCreate(BaseModel):
    parent_id: Optional[UUID] = None
    slug: str                 = Field(..., min_length=1, max_length=255, pattern=r"^[a-z0-9-]+$")
    icon: Optional[str]       = Field(None, max_length=100)
    sort_order: int           = 0
    translations: list[CategoryTranslationIn] = Field(default_factory=list)


class CategoryUpdate(BaseModel):
    parent_id: Optional[UUID]  = None
    slug: Optional[str]        = Field(None, pattern=r"^[a-z0-9-]+$")
    icon: Optional[str]        = None
    sort_order: Optional[int]  = None
    translations: Optional[list[CategoryTranslationIn]] = None


class CategoryOut(BaseModel):
    id: UUID
    parent_id: Optional[UUID]
    slug: str
    icon: Optional[str]
    sort_order: int
    translations: list[CategoryTranslationOut]
    children: list["CategoryOut"] = []
    article_count: int = 0
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ── Translation ───────────────────────────────────────────────────────────────
class TranslationCreate(BaseModel):
    language: str   = Field(..., min_length=2, max_length=10)
    title: str      = Field(..., min_length=1, max_length=500)
    content: str    = Field(..., min_length=1)
    excerpt: Optional[str] = Field(None, max_length=500)


class TranslationUpdate(BaseModel):
    title: Optional[str]   = Field(None, min_length=1, max_length=500)
    content: Optional[str] = Field(None, min_length=1)
    excerpt: Optional[str] = None


class TranslationOut(BaseModel):
    id: UUID
    language: str
    title: str
    content: str
    excerpt: Optional[str]
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ── Attachment ────────────────────────────────────────────────────────────────
class AttachmentOut(BaseModel):
    id: UUID
    file_name: str
    file_path: str
    file_size: Optional[int]
    content_type: Optional[str]
    is_image: bool
    uploaded_by: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ── Tag ───────────────────────────────────────────────────────────────────────
class TagCreate(BaseModel):
    name: str             = Field(..., min_length=1, max_length=100)
    color: Optional[str]  = Field(None, max_length=20)


class TagOut(BaseModel):
    id: UUID
    name: str
    color: Optional[str]
    model_config = ConfigDict(from_attributes=True)


# ── Version ───────────────────────────────────────────────────────────────────
class VersionOut(BaseModel):
    id: UUID
    version_number: int
    language: str
    title: str
    content: str
    change_summary: Optional[str]
    changed_by: UUID
    changed_by_name: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class RevertRequest(BaseModel):
    change_summary: Optional[str] = "Reverted to previous version"


# ── Article ───────────────────────────────────────────────────────────────────
class ArticleCreate(BaseModel):
    category_id: Optional[UUID]     = None
    slug: str                        = Field(..., min_length=1, max_length=600, pattern=r"^[a-z0-9-]+$")
    status: ArticleStatus            = "draft"
    visibility: ArticleVisibility    = "public"
    default_language: str            = "en"
    reference_url: Optional[str]     = None
    sort_order: int                  = 0
    tag_ids: list[UUID]              = Field(default_factory=list)
    translations: list[TranslationCreate] = Field(..., min_length=1)
    change_summary: Optional[str]    = None

    @field_validator("reference_url")
    @classmethod
    def validate_url(cls, v: str | None) -> str | None:
        if v and not v.startswith(("http://", "https://")):
            raise ValueError("reference_url must be a valid HTTP(S) URL")
        return v


class ArticleUpdate(BaseModel):
    category_id: Optional[UUID]          = None
    slug: Optional[str]                  = Field(None, pattern=r"^[a-z0-9-]+$")
    status: Optional[ArticleStatus]      = None
    visibility: Optional[ArticleVisibility] = None
    default_language: Optional[str]      = None
    reference_url: Optional[str]         = None
    sort_order: Optional[int]            = None
    tag_ids: Optional[list[UUID]]        = None
    translations: Optional[list[TranslationCreate]] = None
    change_summary: Optional[str]        = None


class ArticleAuthorOut(BaseModel):
    id: UUID
    name: str
    model_config = ConfigDict(from_attributes=True)


class ArticleOut(BaseModel):
    id: UUID
    category_id: Optional[UUID]
    category: Optional[CategoryOut]
    author_id: UUID
    author: Optional[ArticleAuthorOut]
    slug: str
    status: str
    visibility: str
    default_language: str
    reference_url: Optional[str]
    sort_order: int
    view_count: int
    helpful_yes: int
    helpful_no: int
    published_at: Optional[datetime]
    reviewed_by: Optional[UUID]
    reviewed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    translations: list[TranslationOut]  = []
    tags: list[TagOut]                   = []
    attachments: list[AttachmentOut]     = []
    version_count: int                   = 0
    model_config = ConfigDict(from_attributes=True)


class ArticleListOut(BaseModel):
    """Lightweight list view — no content body."""
    id: UUID
    category_id: Optional[UUID]
    slug: str
    status: str
    visibility: str
    default_language: str
    view_count: int
    helpful_yes: int
    helpful_no: int
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    author: Optional[ArticleAuthorOut]
    tags: list[TagOut]             = []
    # Active-language translation header (title + excerpt)
    title: str                     = ""
    excerpt: Optional[str]         = None
    model_config = ConfigDict(from_attributes=True)


class PaginatedArticles(BaseModel):
    items: list[ArticleListOut]
    total: int
    page: int
    page_size: int
    pages: int


# ── Search ────────────────────────────────────────────────────────────────────
class SearchHit(BaseModel):
    article_id: UUID
    slug: str
    language: str
    title: str
    headline: str          # ts_headline snippet
    rank: float
    status: str
    visibility: str
    category_id: Optional[UUID]
    category_name: Optional[str]
    published_at: Optional[datetime]


class SearchResult(BaseModel):
    query: str
    hits: list[SearchHit]
    total: int
    took_ms: float


# ── Ticket links ──────────────────────────────────────────────────────────────
class TicketLinkCreate(BaseModel):
    ticket_id: UUID
    link_type: LinkType = "related"


class TicketLinkOut(BaseModel):
    id: UUID
    ticket_id: UUID
    article_id: UUID
    link_type: str
    linked_by: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ── Feedback ──────────────────────────────────────────────────────────────────
class FeedbackCreate(BaseModel):
    is_helpful: bool
    comment: Optional[str] = Field(None, max_length=1000)


class FeedbackOut(BaseModel):
    id: UUID
    is_helpful: bool
    comment: Optional[str]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ── Status transition ─────────────────────────────────────────────────────────
class StatusTransitionRequest(BaseModel):
    status: ArticleStatus
    comment: Optional[str] = None


# Allow forward references
CategoryOut.model_rebuild()
