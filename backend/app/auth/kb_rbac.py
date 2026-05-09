"""
Knowledge Base RBAC — permission-based access control.

Permissions are additive; roles inherit from lower tiers.

  user  → can read public articles, submit feedback
  agent → user + read internal/agent-only, create/edit own articles
  admin → agent + edit any, delete any, publish, review, manage categories
"""
from __future__ import annotations

from enum import Enum
from functools import lru_cache
from typing import Callable

from fastapi import Depends, HTTPException, status

from app.auth.dependencies import get_current_user   # your existing JWT dep


# ── Permission catalogue ──────────────────────────────────────────────────────
class KBPerm(str, Enum):
    # Read
    VIEW_PUBLIC            = "kb:view_public"
    VIEW_INTERNAL          = "kb:view_internal"
    VIEW_AGENT_ONLY        = "kb:view_agent_only"
    # Write
    CREATE                 = "kb:create"
    EDIT_OWN               = "kb:edit_own"
    EDIT_ANY               = "kb:edit_any"
    DELETE_OWN             = "kb:delete_own"
    DELETE_ANY             = "kb:delete_any"
    # Workflow
    SUBMIT_FOR_REVIEW      = "kb:submit_review"
    REVIEW                 = "kb:review"
    PUBLISH                = "kb:publish"
    ARCHIVE                = "kb:archive"
    # Admin
    MANAGE_CATEGORIES      = "kb:manage_categories"
    MANAGE_TAGS            = "kb:manage_tags"
    VIEW_ANALYTICS         = "kb:view_analytics"


_AGENT_PERMS: frozenset[KBPerm] = frozenset({
    KBPerm.VIEW_PUBLIC,
    KBPerm.VIEW_INTERNAL,
    KBPerm.VIEW_AGENT_ONLY,
    KBPerm.CREATE,
    KBPerm.EDIT_OWN,
    KBPerm.DELETE_OWN,
    KBPerm.SUBMIT_FOR_REVIEW,
})

_ADMIN_PERMS: frozenset[KBPerm] = _AGENT_PERMS | frozenset({
    KBPerm.EDIT_ANY,
    KBPerm.DELETE_ANY,
    KBPerm.REVIEW,
    KBPerm.PUBLISH,
    KBPerm.ARCHIVE,
    KBPerm.MANAGE_CATEGORIES,
    KBPerm.MANAGE_TAGS,
    KBPerm.VIEW_ANALYTICS,
})

ROLE_PERMISSIONS: dict[str, frozenset[KBPerm]] = {
    "user":  frozenset({KBPerm.VIEW_PUBLIC}),
    "agent": _AGENT_PERMS,
    "admin": _ADMIN_PERMS,
}


@lru_cache(maxsize=None)
def get_role_permissions(role: str) -> frozenset[KBPerm]:
    return ROLE_PERMISSIONS.get(role, frozenset())


def has_permission(user_role: str, permission: KBPerm) -> bool:
    return permission in get_role_permissions(user_role)


# ── Visibility filter helper ──────────────────────────────────────────────────
def visible_visibilities(role: str) -> list[str]:
    """Return the visibility values a given role is allowed to read."""
    base = ["public"]
    if role in ("agent", "admin"):
        base += ["internal", "agent_only"]
    return base


# ── FastAPI dependency factory ────────────────────────────────────────────────
def require_kb_perm(permission: KBPerm) -> Callable:
    """
    Usage:
        @router.post("/", dependencies=[Depends(require_kb_perm(KBPerm.CREATE))])
    """
    async def _dependency(current_user=Depends(get_current_user)) -> None:
        if not has_permission(current_user.role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permission: {permission.value}",
            )
    return _dependency


def require_article_edit(article_author_id, current_user) -> None:
    """Raise 403 unless user can edit the article (owns it or has EDIT_ANY)."""
    if has_permission(current_user.role, KBPerm.EDIT_ANY):
        return
    if has_permission(current_user.role, KBPerm.EDIT_OWN) and str(article_author_id) == str(current_user.id):
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to edit this article.")


def require_article_delete(article_author_id, current_user) -> None:
    """Raise 403 unless user can delete the article."""
    if has_permission(current_user.role, KBPerm.DELETE_ANY):
        return
    if has_permission(current_user.role, KBPerm.DELETE_OWN) and str(article_author_id) == str(current_user.id):
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to delete this article.")


# ── Status transition guard ───────────────────────────────────────────────────
_ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "draft":     {"review"},
    "review":    {"draft", "approved"},
    "approved":  {"review", "published"},
    "published": {"draft", "archived"},
    "archived":  {"draft"},
}

_TRANSITION_PERMS: dict[str, KBPerm] = {
    "review":    KBPerm.SUBMIT_FOR_REVIEW,
    "approved":  KBPerm.REVIEW,
    "published": KBPerm.PUBLISH,
    "archived":  KBPerm.ARCHIVE,
    "draft":     KBPerm.EDIT_OWN,  # revert to draft
}


def validate_status_transition(current_status: str, new_status: str, user_role: str) -> None:
    allowed = _ALLOWED_TRANSITIONS.get(current_status, set())
    if new_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Cannot transition from '{current_status}' to '{new_status}'. Allowed: {sorted(allowed)}",
        )
    required_perm = _TRANSITION_PERMS.get(new_status)
    if required_perm and not has_permission(user_role, required_perm):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Missing permission to set status '{new_status}': {required_perm.value}",
        )
