"""
Outbound email sender – SMTP or Microsoft Graph API.
Call `send_message(request, agent, db)` from the FastAPI router.
"""
from __future__ import annotations

import logging
import smtplib
import uuid
from datetime import datetime, timezone
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email import encoders
from typing import TYPE_CHECKING

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models.email import (
    EmailAccount, EmailAuditLog, EmailMessage, EmailSignature, EmailTemplate, EmailThread,
)
from ..schemas.email import SendEmailRequest, Recipient
from .email_thread_service import get_or_create_thread

if TYPE_CHECKING:
    pass

log = logging.getLogger(__name__)

GRAPH_BASE = "https://graph.microsoft.com/v1.0"


# ── Template rendering ────────────────────────────────────────────────────────

async def render_template(template_id: uuid.UUID, variables: dict[str, str], db: AsyncSession) -> tuple[str, str, str | None]:
    """Returns (subject, body_html, body_text)."""
    tmpl = await db.get(EmailTemplate, template_id)
    if not tmpl:
        raise ValueError("Template not found")
    subject = tmpl.subject
    body_html = tmpl.body_html
    body_text = tmpl.body_text
    for k, v in variables.items():
        subject = subject.replace(f"{{{{{k}}}}}", v)
        body_html = body_html.replace(f"{{{{{k}}}}}", v)
        if body_text:
            body_text = body_text.replace(f"{{{{{k}}}}}", v)
    tmpl.use_count += 1
    return subject, body_html, body_text


# ── Signature appending ───────────────────────────────────────────────────────

async def append_signature(body_html: str, body_text: str | None, signature_id: uuid.UUID | None, db: AsyncSession) -> tuple[str, str | None]:
    if not signature_id:
        return body_html, body_text
    sig = await db.get(EmailSignature, signature_id)
    if not sig:
        return body_html, body_text
    body_html = body_html + f'<br><br><div class="email-signature">{sig.body_html}</div>'
    if body_text and sig.body_text:
        body_text = body_text + "\n\n-- \n" + sig.body_text
    return body_html, body_text


# ── Core send dispatcher ──────────────────────────────────────────────────────

async def send_message(
    req: SendEmailRequest,
    agent_id: uuid.UUID,
    agent_email: str,
    db: AsyncSession,
) -> EmailMessage:
    account = await db.get(EmailAccount, req.account_id)
    if not account or not account.is_active:
        raise ValueError("Email account not found or inactive")

    # Resolve subject + body
    subject = req.subject
    body_html = req.body_html
    body_text = req.body_text

    if req.template_id:
        subject, body_html, body_text = await render_template(req.template_id, {}, db)

    body_html, body_text = await append_signature(body_html, body_text, req.signature_id, db)

    # Determine or create thread
    if req.thread_id:
        thread = await db.get(EmailThread, req.thread_id)
        if not thread:
            raise ValueError("Thread not found")
    else:
        to_email = req.to[0].email if req.to else agent_email
        thread = await get_or_create_thread(
            db=db,
            account=account,
            subject=subject,
            external_thread_id=None,
            participant_email=to_email,
        )

    # Build message record
    msg = EmailMessage(
        id=uuid.uuid4(),
        thread_id=thread.id,
        account_id=account.id,
        direction="outbound",
        message_type=req.message_type,
        from_email=account.email_address,
        from_name=account.display_name or account.name,
        sent_by_agent_id=agent_id,
        to_recipients=[r.model_dump() for r in req.to],
        cc_recipients=[r.model_dump() for r in req.cc],
        bcc_recipients=[r.model_dump() for r in req.bcc],
        subject=subject,
        body_html=body_html,
        body_text=body_text,
        delivery_status="queued",
        signature_id=req.signature_id,
        template_id=req.template_id,
        tracking_pixel_id=str(uuid.uuid4()),
    )
    db.add(msg)
    await db.flush()

    # Actually send
    try:
        if account.protocol == "graph_api":
            await _send_via_graph(msg, req, account, body_html, body_text)
        else:
            await _send_via_smtp(msg, req, account, body_html, body_text)

        msg.delivery_status = "sent"
        msg.sent_at = datetime.now(timezone.utc)

    except Exception as exc:
        log.exception("Send failed for message %s: %s", msg.id, exc)
        msg.delivery_status = "failed"
        msg.delivery_error = str(exc)

    db.add(EmailAuditLog(
        actor_id=agent_id,
        actor_email=agent_email,
        action="message.sent",
        entity_type="message",
        entity_id=msg.id,
        detail={"to": [r.email for r in req.to], "subject": subject, "status": msg.delivery_status},
    ))

    await db.commit()
    await db.refresh(msg)
    return msg


# ── SMTP sender ───────────────────────────────────────────────────────────────

async def _send_via_smtp(
    msg_record: EmailMessage,
    req: SendEmailRequest,
    account: EmailAccount,
    body_html: str,
    body_text: str | None,
) -> None:
    mime = MIMEMultipart("alternative")
    mime["Subject"] = req.subject
    mime["From"] = f"{account.display_name or account.name} <{account.email_address}>"
    mime["To"] = ", ".join(f"{r.name} <{r.email}>" if r.name else r.email for r in req.to)
    if req.cc:
        mime["Cc"] = ", ".join(f"{r.name} <{r.email}>" if r.name else r.email for r in req.cc)
    mime["Message-ID"] = f"<{msg_record.id}@{account.email_address.split('@')[1]}>"
    if req.in_reply_to_message_id:
        mime["In-Reply-To"] = str(req.in_reply_to_message_id)

    if body_text:
        mime.attach(MIMEText(body_text, "plain"))
    mime.attach(MIMEText(body_html, "html"))

    all_recipients = [r.email for r in req.to + req.cc + req.bcc]

    if account.smtp_use_tls:
        server = smtplib.SMTP(account.smtp_host, account.smtp_port or 587)
        server.starttls()
    else:
        server = smtplib.SMTP_SSL(account.smtp_host, account.smtp_port or 465)

    server.login(account.smtp_username, account.smtp_password)
    server.sendmail(account.email_address, all_recipients, mime.as_string())
    server.quit()


# ── Graph API sender ──────────────────────────────────────────────────────────

async def _get_graph_token(account: EmailAccount) -> str:
    url = f"https://login.microsoftonline.com/{account.graph_tenant_id}/oauth2/v2.0/token"
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, data={
            "grant_type": "client_credentials",
            "client_id": account.graph_client_id,
            "client_secret": account.graph_client_secret,
            "scope": "https://graph.microsoft.com/.default",
        })
        resp.raise_for_status()
        return resp.json()["access_token"]


def _graph_recipient(r: Recipient) -> dict:
    return {"emailAddress": {"address": r.email, "name": r.name or ""}}


async def _send_via_graph(
    msg_record: EmailMessage,
    req: SendEmailRequest,
    account: EmailAccount,
    body_html: str,
    body_text: str | None,
) -> None:
    token = await _get_graph_token(account)
    payload = {
        "message": {
            "subject": req.subject,
            "body": {"contentType": "HTML", "content": body_html},
            "toRecipients": [_graph_recipient(r) for r in req.to],
            "ccRecipients": [_graph_recipient(r) for r in req.cc],
            "bccRecipients": [_graph_recipient(r) for r in req.bcc],
        },
        "saveToSentItems": True,
    }

    url = f"{GRAPH_BASE}/users/{account.graph_user_id}/sendMail"
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url,
            json=payload,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            timeout=30,
        )
        resp.raise_for_status()


# ── Forward ───────────────────────────────────────────────────────────────────

async def forward_message(
    original_msg_id: uuid.UUID,
    to: list[Recipient],
    cc: list[Recipient],
    additional_note: str | None,
    agent_id: uuid.UUID,
    agent_email: str,
    db: AsyncSession,
) -> EmailMessage:
    original = await db.get(EmailMessage, original_msg_id)
    if not original:
        raise ValueError("Original message not found")

    fwd_body = ""
    if additional_note:
        fwd_body = f"<p>{additional_note}</p><hr>"
    fwd_body += f"""
    <p><strong>---------- Forwarded message ----------</strong><br>
    From: {original.from_name or ''} &lt;{original.from_email}&gt;<br>
    Subject: {original.subject or ''}</p>
    {original.body_html or original.body_text or ''}
    """

    req = SendEmailRequest(
        thread_id=original.thread_id,
        account_id=original.account_id,
        to=to,
        cc=cc,
        subject=f"Fwd: {original.subject or ''}",
        body_html=fwd_body,
        message_type="forward",
    )
    return await send_message(req, agent_id, agent_email, db)
