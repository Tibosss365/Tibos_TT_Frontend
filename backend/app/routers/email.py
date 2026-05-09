"""
Enterprise Email Communication API
Mount at: /api/email
"""
from __future__ import annotations

import uuid
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.email import (
    EmailAccount, EmailAuditLog, EmailMessage, EmailRoutingRule,
    EmailSignature, EmailTemplate, EmailThread, EmailTrackingEvent,
)
from ..schemas.email import (
    AISuggestRequest, AISuggestOut, AISummarizeRequest, AISummarizeOut,
    EmailAccountCreate, EmailAccountOut, EmailAccountUpdate,
    EmailMessageOut, EmailRoutingRuleCreate, EmailRoutingRuleOut, EmailRoutingRuleUpdate,
    EmailSignatureCreate, EmailSignatureOut, EmailSignatureUpdate,
    EmailTemplateCreate, EmailTemplateOut, EmailTemplateUpdate,
    EmailThreadOut, EmailThreadUpdate,
    ForwardRequest, MarkReadRequest, PaginatedThreads,
    RenderTemplateRequest, RenderTemplateOut, SendEmailRequest,
)
from ..services.ai_email_service import suggest_reply, summarize_thread
from ..services.email_inbound_service import fetch_new_messages
from ..services.email_outbound_service import forward_message, render_template, send_message
from ..services.email_thread_service import (
    get_thread_with_messages, link_thread_to_ticket, list_threads,
    mark_messages_read, update_thread,
)

router = APIRouter(prefix="/api/email", tags=["email"])

# ── Dependency stubs (replace with your actual auth dependency) ───────────────

async def get_db() -> AsyncSession:  # pragma: no cover
    raise NotImplementedError("Inject real DB session")


async def current_agent(request: Request) -> dict:  # pragma: no cover
    raise NotImplementedError("Inject real auth dependency")


def is_staff(agent: dict = Depends(current_agent)) -> dict:
    if agent.get("role") == "user":
        raise HTTPException(status_code=403, detail="Staff access required")
    return agent


def is_admin(agent: dict = Depends(current_agent)) -> dict:
    if agent.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return agent


# ── Email Accounts ────────────────────────────────────────────────────────────

@router.get("/accounts", response_model=List[EmailAccountOut])
async def list_accounts(
    _: dict = Depends(is_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(EmailAccount).order_by(EmailAccount.name))
    return list(result.scalars().all())


@router.post("/accounts", response_model=EmailAccountOut, status_code=201)
async def create_account(
    body: EmailAccountCreate,
    agent: dict = Depends(is_admin),
    db: AsyncSession = Depends(get_db),
):
    acct = EmailAccount(**body.model_dump())
    db.add(acct)
    await db.commit()
    await db.refresh(acct)
    db.add(EmailAuditLog(
        actor_id=agent.get("id"),
        actor_email=agent.get("email"),
        action="account.created",
        entity_type="account",
        entity_id=acct.id,
        detail={"name": acct.name, "email": acct.email_address},
    ))
    await db.commit()
    return acct


@router.patch("/accounts/{account_id}", response_model=EmailAccountOut)
async def update_account(
    account_id: uuid.UUID,
    body: EmailAccountUpdate,
    _: dict = Depends(is_admin),
    db: AsyncSession = Depends(get_db),
):
    acct = await db.get(EmailAccount, account_id)
    if not acct:
        raise HTTPException(404, "Account not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(acct, k, v)
    await db.commit()
    await db.refresh(acct)
    return acct


@router.delete("/accounts/{account_id}", status_code=204)
async def delete_account(
    account_id: uuid.UUID,
    _: dict = Depends(is_admin),
    db: AsyncSession = Depends(get_db),
):
    acct = await db.get(EmailAccount, account_id)
    if not acct:
        raise HTTPException(404, "Account not found")
    await db.delete(acct)
    await db.commit()


@router.post("/accounts/{account_id}/fetch", status_code=202)
async def trigger_fetch(
    account_id: uuid.UUID,
    _: dict = Depends(is_admin),
    db: AsyncSession = Depends(get_db),
):
    acct = await db.get(EmailAccount, account_id)
    if not acct:
        raise HTTPException(404, "Account not found")
    count = await fetch_new_messages(acct, db)
    return {"fetched": count}


# ── Threads ───────────────────────────────────────────────────────────────────

@router.get("/threads", response_model=PaginatedThreads)
async def get_threads(
    account_id: Optional[uuid.UUID] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    is_read: Optional[bool] = None,
    is_starred: Optional[bool] = None,
    is_archived: Optional[bool] = None,
    is_spam: Optional[bool] = None,
    ticket_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    _: dict = Depends(is_staff),
    db: AsyncSession = Depends(get_db),
):
    return await list_threads(
        db=db,
        account_id=account_id,
        page=page,
        page_size=page_size,
        is_read=is_read,
        is_starred=is_starred,
        is_archived=is_archived,
        is_spam=is_spam,
        ticket_id=ticket_id,
        search=search,
    )


@router.get("/threads/{thread_id}", response_model=EmailThreadOut)
async def get_thread(
    thread_id: uuid.UUID,
    _: dict = Depends(is_staff),
    db: AsyncSession = Depends(get_db),
):
    thread = await db.get(EmailThread, thread_id)
    if not thread:
        raise HTTPException(404, "Thread not found")
    return thread


@router.get("/threads/{thread_id}/messages", response_model=List[EmailMessageOut])
async def get_thread_messages(
    thread_id: uuid.UUID,
    _: dict = Depends(is_staff),
    db: AsyncSession = Depends(get_db),
):
    thread = await get_thread_with_messages(db, thread_id)
    if not thread:
        raise HTTPException(404, "Thread not found")
    return thread.messages


@router.patch("/threads/{thread_id}", response_model=EmailThreadOut)
async def patch_thread(
    thread_id: uuid.UUID,
    body: EmailThreadUpdate,
    _: dict = Depends(is_staff),
    db: AsyncSession = Depends(get_db),
):
    thread = await update_thread(db, thread_id, body)
    if not thread:
        raise HTTPException(404, "Thread not found")
    return thread


@router.post("/threads/{thread_id}/link-ticket", response_model=EmailThreadOut)
async def link_ticket(
    thread_id: uuid.UUID,
    ticket_id: Optional[uuid.UUID] = None,
    _: dict = Depends(is_staff),
    db: AsyncSession = Depends(get_db),
):
    thread = await link_thread_to_ticket(db, thread_id, ticket_id)
    if not thread:
        raise HTTPException(404, "Thread not found")
    return thread


@router.post("/threads/{thread_id}/mark-read", status_code=204)
async def mark_read(
    thread_id: uuid.UUID,
    body: MarkReadRequest,
    _: dict = Depends(is_staff),
    db: AsyncSession = Depends(get_db),
):
    await mark_messages_read(db, thread_id, body.message_ids, body.is_read)


# ── Messages ──────────────────────────────────────────────────────────────────

@router.post("/messages/send", response_model=EmailMessageOut, status_code=201)
async def send(
    body: SendEmailRequest,
    agent: dict = Depends(is_staff),
    db: AsyncSession = Depends(get_db),
):
    try:
        msg = await send_message(
            req=body,
            agent_id=agent["id"],
            agent_email=agent["email"],
            db=db,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    return msg


@router.post("/messages/{message_id}/forward", response_model=EmailMessageOut, status_code=201)
async def forward(
    message_id: uuid.UUID,
    body: ForwardRequest,
    agent: dict = Depends(is_staff),
    db: AsyncSession = Depends(get_db),
):
    try:
        msg = await forward_message(
            original_msg_id=message_id,
            to=body.to,
            cc=body.cc,
            additional_note=body.additional_note,
            agent_id=agent["id"],
            agent_email=agent["email"],
            db=db,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    return msg


@router.get("/messages/{message_id}", response_model=EmailMessageOut)
async def get_message(
    message_id: uuid.UUID,
    _: dict = Depends(is_staff),
    db: AsyncSession = Depends(get_db),
):
    msg = await db.scalar(
        select(EmailMessage)
        .where(EmailMessage.id == message_id)
        .options(selectinload(EmailMessage.attachments))
    )
    if not msg:
        raise HTTPException(404, "Message not found")
    return msg


# ── Templates ─────────────────────────────────────────────────────────────────

@router.get("/templates", response_model=List[EmailTemplateOut])
async def list_templates(
    category: Optional[str] = None,
    _: dict = Depends(is_staff),
    db: AsyncSession = Depends(get_db),
):
    q = select(EmailTemplate).where(EmailTemplate.is_active == True)
    if category:
        q = q.where(EmailTemplate.category == category)
    q = q.order_by(EmailTemplate.use_count.desc())
    result = await db.execute(q)
    return list(result.scalars().all())


@router.post("/templates", response_model=EmailTemplateOut, status_code=201)
async def create_template(
    body: EmailTemplateCreate,
    agent: dict = Depends(is_staff),
    db: AsyncSession = Depends(get_db),
):
    tmpl = EmailTemplate(
        **body.model_dump(),
        created_by_id=agent["id"],
        updated_by_id=agent["id"],
        variables=[v.model_dump() for v in body.variables],
    )
    db.add(tmpl)
    await db.commit()
    await db.refresh(tmpl)
    return tmpl


@router.patch("/templates/{template_id}", response_model=EmailTemplateOut)
async def update_template(
    template_id: uuid.UUID,
    body: EmailTemplateUpdate,
    agent: dict = Depends(is_staff),
    db: AsyncSession = Depends(get_db),
):
    tmpl = await db.get(EmailTemplate, template_id)
    if not tmpl:
        raise HTTPException(404, "Template not found")
    data = body.model_dump(exclude_none=True)
    if "variables" in data:
        data["variables"] = [v.model_dump() if hasattr(v, "model_dump") else v for v in data["variables"]]
    data["updated_by_id"] = agent["id"]
    for k, v in data.items():
        setattr(tmpl, k, v)
    await db.commit()
    await db.refresh(tmpl)
    return tmpl


@router.delete("/templates/{template_id}", status_code=204)
async def delete_template(
    template_id: uuid.UUID,
    _: dict = Depends(is_staff),
    db: AsyncSession = Depends(get_db),
):
    tmpl = await db.get(EmailTemplate, template_id)
    if not tmpl:
        raise HTTPException(404, "Template not found")
    await db.delete(tmpl)
    await db.commit()


@router.post("/templates/render", response_model=RenderTemplateOut)
async def render_template_endpoint(
    body: RenderTemplateRequest,
    _: dict = Depends(is_staff),
    db: AsyncSession = Depends(get_db),
):
    try:
        subject, html, text = await render_template(body.template_id, body.variables, db)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return RenderTemplateOut(subject=subject, body_html=html, body_text=text)


# ── Signatures ────────────────────────────────────────────────────────────────

@router.get("/signatures", response_model=List[EmailSignatureOut])
async def list_signatures(
    agent: dict = Depends(is_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EmailSignature)
        .where(EmailSignature.agent_id == agent["id"])
        .order_by(EmailSignature.is_default.desc(), EmailSignature.name)
    )
    return list(result.scalars().all())


@router.post("/signatures", response_model=EmailSignatureOut, status_code=201)
async def create_signature(
    body: EmailSignatureCreate,
    agent: dict = Depends(is_staff),
    db: AsyncSession = Depends(get_db),
):
    if body.is_default:
        await db.execute(
            update(EmailSignature)
            .where(EmailSignature.agent_id == agent["id"])
            .values(is_default=False)
        )
    sig = EmailSignature(**body.model_dump(), agent_id=agent["id"])
    db.add(sig)
    await db.commit()
    await db.refresh(sig)
    return sig


@router.patch("/signatures/{sig_id}", response_model=EmailSignatureOut)
async def update_signature(
    sig_id: uuid.UUID,
    body: EmailSignatureUpdate,
    agent: dict = Depends(is_staff),
    db: AsyncSession = Depends(get_db),
):
    sig = await db.get(EmailSignature, sig_id)
    if not sig or sig.agent_id != uuid.UUID(str(agent["id"])):
        raise HTTPException(404, "Signature not found")
    if body.is_default:
        await db.execute(
            update(EmailSignature)
            .where(EmailSignature.agent_id == agent["id"], EmailSignature.id != sig_id)
            .values(is_default=False)
        )
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(sig, k, v)
    await db.commit()
    await db.refresh(sig)
    return sig


@router.delete("/signatures/{sig_id}", status_code=204)
async def delete_signature(
    sig_id: uuid.UUID,
    agent: dict = Depends(is_staff),
    db: AsyncSession = Depends(get_db),
):
    sig = await db.get(EmailSignature, sig_id)
    if not sig or sig.agent_id != uuid.UUID(str(agent["id"])):
        raise HTTPException(404, "Signature not found")
    await db.delete(sig)
    await db.commit()


# ── Routing Rules ─────────────────────────────────────────────────────────────

@router.get("/routing-rules", response_model=List[EmailRoutingRuleOut])
async def list_routing_rules(
    _: dict = Depends(is_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EmailRoutingRule).order_by(EmailRoutingRule.priority)
    )
    return list(result.scalars().all())


@router.post("/routing-rules", response_model=EmailRoutingRuleOut, status_code=201)
async def create_routing_rule(
    body: EmailRoutingRuleCreate,
    _: dict = Depends(is_admin),
    db: AsyncSession = Depends(get_db),
):
    rule = EmailRoutingRule(
        **body.model_dump(exclude={"conditions", "actions"}),
        conditions=[c.model_dump() for c in body.conditions],
        actions=[a.model_dump() for a in body.actions],
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.patch("/routing-rules/{rule_id}", response_model=EmailRoutingRuleOut)
async def update_routing_rule(
    rule_id: uuid.UUID,
    body: EmailRoutingRuleUpdate,
    _: dict = Depends(is_admin),
    db: AsyncSession = Depends(get_db),
):
    rule = await db.get(EmailRoutingRule, rule_id)
    if not rule:
        raise HTTPException(404, "Rule not found")
    data = body.model_dump(exclude_none=True)
    if "conditions" in data:
        data["conditions"] = [c.model_dump() if hasattr(c, "model_dump") else c for c in data["conditions"]]
    if "actions" in data:
        data["actions"] = [a.model_dump() if hasattr(a, "model_dump") else a for a in data["actions"]]
    for k, v in data.items():
        setattr(rule, k, v)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.delete("/routing-rules/{rule_id}", status_code=204)
async def delete_routing_rule(
    rule_id: uuid.UUID,
    _: dict = Depends(is_admin),
    db: AsyncSession = Depends(get_db),
):
    rule = await db.get(EmailRoutingRule, rule_id)
    if not rule:
        raise HTTPException(404, "Rule not found")
    await db.delete(rule)
    await db.commit()


# ── AI ────────────────────────────────────────────────────────────────────────

@router.post("/ai/suggest-reply", response_model=AISuggestOut)
async def ai_suggest_reply(
    body: AISuggestRequest,
    _: dict = Depends(is_staff),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await suggest_reply(
            message_id=body.message_id,
            tone=body.tone or "professional",
            language=body.language or "en",
            max_length=body.max_length or 300,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/ai/summarize", response_model=AISummarizeOut)
async def ai_summarize(
    body: AISummarizeRequest,
    _: dict = Depends(is_staff),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await summarize_thread(
            thread_id=body.thread_id,
            max_length=body.max_length or 200,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))


# ── Open/Click Tracking (public endpoint — no auth) ───────────────────────────

@router.get("/track/{pixel_id}.gif", include_in_schema=False)
async def track_open(
    pixel_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    from fastapi.responses import Response
    msg = await db.scalar(
        select(EmailMessage).where(EmailMessage.tracking_pixel_id == pixel_id)
    )
    if msg:
        db.add(EmailTrackingEvent(
            message_id=msg.id,
            event_type="open",
            ip_address=str(request.client.host) if request.client else None,
            user_agent=request.headers.get("User-Agent"),
        ))
        await db.commit()
    # Return 1x1 transparent GIF
    gif = b"GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x00\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
    return Response(content=gif, media_type="image/gif", headers={"Cache-Control": "no-store"})


# ── Audit Log ─────────────────────────────────────────────────────────────────

@router.get("/audit-logs")
async def get_audit_logs(
    entity_type: Optional[str] = None,
    entity_id: Optional[uuid.UUID] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, le=200),
    _: dict = Depends(is_admin),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import desc as sql_desc
    q = select(EmailAuditLog)
    if entity_type:
        q = q.where(EmailAuditLog.entity_type == entity_type)
    if entity_id:
        q = q.where(EmailAuditLog.entity_id == entity_id)
    q = q.order_by(sql_desc(EmailAuditLog.occurred_at))
    q = q.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    return list(result.scalars().all())
