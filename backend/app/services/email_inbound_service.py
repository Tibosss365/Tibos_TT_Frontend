"""
Inbound email fetcher – supports IMAP/SMTP accounts and Microsoft Graph API.
Call `fetch_new_messages(account)` from a background scheduler.
"""
from __future__ import annotations

import email as stdlib_email
import email.policy
import imaplib
import logging
import re
import uuid
from datetime import datetime, timezone
from email.header import decode_header
from typing import TYPE_CHECKING, Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models.email import (
    EmailAccount, EmailAttachment, EmailMessage, EmailThread,
)
from .email_thread_service import get_or_create_thread

if TYPE_CHECKING:
    pass

log = logging.getLogger(__name__)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _decode_mime_words(s: str | None) -> str:
    if not s:
        return ""
    parts = decode_header(s)
    out = []
    for raw, enc in parts:
        if isinstance(raw, bytes):
            out.append(raw.decode(enc or "utf-8", errors="replace"))
        else:
            out.append(raw)
    return "".join(out)


def _extract_email(addr: str) -> tuple[str, str]:
    """Return (name, email) from 'Name <email>' or 'email'."""
    match = re.match(r"^(.*?)\s*<([^>]+)>$", addr.strip())
    if match:
        return match.group(1).strip().strip('"'), match.group(2).strip()
    return "", addr.strip()


def _parse_address_list(header: str | None) -> list[dict[str, str]]:
    if not header:
        return []
    out = []
    for part in re.split(r",(?![^<>]*>)", header):
        name, addr = _extract_email(_decode_mime_words(part.strip()))
        if addr:
            out.append({"email": addr, "name": name})
    return out


def _strip_quoted(text: str) -> str:
    """Remove >-prefixed quoted lines and common reply markers."""
    lines = text.splitlines()
    result = []
    for line in lines:
        stripped = line.lstrip()
        if stripped.startswith(">"):
            continue
        if re.match(r"^On .+ wrote:$", stripped, re.DOTALL):
            break
        result.append(line)
    return "\n".join(result).strip()


# ── IMAP Fetcher ──────────────────────────────────────────────────────────────

async def fetch_imap(account: EmailAccount, db: AsyncSession) -> int:
    """Connect via IMAP and pull new messages since last UID watermark."""
    fetched = 0
    try:
        if account.imap_use_ssl:
            conn = imaplib.IMAP4_SSL(account.imap_host, account.imap_port or 993)
        else:
            conn = imaplib.IMAP4(account.imap_host, account.imap_port or 143)

        conn.login(account.imap_username, account.imap_password)
        conn.select("INBOX")

        since_uid = account.fetch_since_uid or 0
        _, data = conn.uid("SEARCH", None, f"UID {since_uid + 1}:*")
        uids = data[0].split() if data and data[0] else []

        max_uid = since_uid
        for uid_bytes in uids:
            uid = int(uid_bytes)
            _, msg_data = conn.uid("FETCH", str(uid), "(RFC822)")
            if not msg_data or not msg_data[0]:
                continue
            raw = msg_data[0][1]
            parsed = stdlib_email.message_from_bytes(raw, policy=email.policy.default)  # type: ignore[attr-defined]
            await _store_imap_message(parsed, account, db)
            max_uid = max(max_uid, uid)
            fetched += 1

        conn.logout()
        account.fetch_since_uid = max_uid
        account.last_fetched_at = datetime.now(timezone.utc)
        await db.commit()

    except Exception as exc:
        log.exception("IMAP fetch failed for account %s: %s", account.id, exc)

    return fetched


async def _store_imap_message(
    msg: Any,
    account: EmailAccount,
    db: AsyncSession,
) -> EmailMessage | None:
    message_id_hdr = msg.get("Message-ID", "").strip()
    if message_id_hdr:
        existing = await db.scalar(
            select(EmailMessage).where(EmailMessage.message_id_header == message_id_hdr)
        )
        if existing:
            return None

    from_raw = _decode_mime_words(msg.get("From", ""))
    from_name, from_email = _extract_email(from_raw)

    subject = _decode_mime_words(msg.get("Subject", "(no subject)"))
    in_reply_to = msg.get("In-Reply-To", "").strip() or None
    references = msg.get("References", "").strip() or None

    thread_key = in_reply_to or references or message_id_hdr
    thread = await get_or_create_thread(
        db=db,
        account=account,
        subject=subject,
        external_thread_id=thread_key,
        participant_email=from_email,
    )

    body_html, body_text = _extract_body(msg)
    body_stripped = _strip_quoted(body_text) if body_text else None

    db_msg = EmailMessage(
        id=uuid.uuid4(),
        thread_id=thread.id,
        account_id=account.id,
        message_id_header=message_id_hdr or None,
        in_reply_to=in_reply_to,
        direction="inbound",
        message_type="original" if not in_reply_to else "reply",
        from_email=from_email,
        from_name=from_name,
        to_recipients=_parse_address_list(msg.get("To")),
        cc_recipients=_parse_address_list(msg.get("Cc")),
        bcc_recipients=[],
        subject=subject,
        body_html=body_html,
        body_text=body_text,
        body_stripped=body_stripped,
        delivery_status="delivered",
        is_read=False,
    )
    db.add(db_msg)
    await db.flush()

    await _extract_attachments(msg, db_msg.id, db)
    await db.commit()
    return db_msg


def _extract_body(msg: Any) -> tuple[str | None, str | None]:
    html, text = None, None
    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            if ct == "text/html" and html is None:
                html = part.get_payload(decode=True).decode(part.get_param("charset", "utf-8"), errors="replace")
            elif ct == "text/plain" and text is None:
                text = part.get_payload(decode=True).decode(part.get_param("charset", "utf-8"), errors="replace")
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            charset = msg.get_param("charset", "utf-8")
            decoded = payload.decode(charset, errors="replace")
            if msg.get_content_type() == "text/html":
                html = decoded
            else:
                text = decoded
    return html, text


async def _extract_attachments(msg: Any, message_id: uuid.UUID, db: AsyncSession) -> None:
    for part in msg.walk():
        disposition = str(part.get("Content-Disposition", ""))
        if "attachment" in disposition or "inline" in disposition:
            filename = part.get_filename() or "attachment"
            filename = _decode_mime_words(filename)
            payload = part.get_payload(decode=True) or b""
            content_id = (part.get("Content-ID") or "").strip("<>") or None
            is_inline = "inline" in disposition and content_id is not None
            att = EmailAttachment(
                message_id=message_id,
                filename=filename,
                content_type=part.get_content_type(),
                size_bytes=len(payload),
                content_id=content_id,
                is_inline=is_inline,
            )
            db.add(att)


# ── Microsoft Graph API Fetcher ───────────────────────────────────────────────

GRAPH_BASE = "https://graph.microsoft.com/v1.0"


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


async def fetch_graph(account: EmailAccount, db: AsyncSession) -> int:
    """Fetch new/changed messages via Microsoft Graph delta API."""
    fetched = 0
    try:
        token = await _get_graph_token(account)
        headers = {"Authorization": f"Bearer {token}"}
        user = account.graph_user_id

        if account.graph_delta_link:
            url = account.graph_delta_link
        else:
            url = f"{GRAPH_BASE}/users/{user}/mailFolders/inbox/messages/delta?$select=id,subject,from,toRecipients,ccRecipients,body,receivedDateTime,conversationId,internetMessageId,inReplyTo,hasAttachments,isRead"

        async with httpx.AsyncClient() as client:
            while url:
                resp = await client.get(url, headers=headers, timeout=30)
                resp.raise_for_status()
                data = resp.json()
                for item in data.get("value", []):
                    if not item.get("@removed"):
                        await _store_graph_message(item, account, db, token)
                        fetched += 1
                url = data.get("@odata.nextLink")
                account.graph_delta_link = data.get("@odata.deltaLink", account.graph_delta_link)

        account.last_fetched_at = datetime.now(timezone.utc)
        await db.commit()

    except Exception as exc:
        log.exception("Graph fetch failed for account %s: %s", account.id, exc)

    return fetched


async def _store_graph_message(item: dict, account: EmailAccount, db: AsyncSession, token: str) -> None:
    msg_id_hdr = item.get("internetMessageId", "").strip()
    if msg_id_hdr:
        existing = await db.scalar(
            select(EmailMessage).where(EmailMessage.message_id_header == msg_id_hdr)
        )
        if existing:
            return

    from_obj = item.get("from", {}).get("emailAddress", {})
    from_email = from_obj.get("address", "")
    from_name = from_obj.get("name", "")
    subject = item.get("subject", "(no subject)")
    conv_id = item.get("conversationId")
    in_reply_to = item.get("inReplyTo", "").strip() or None

    thread = await get_or_create_thread(
        db=db,
        account=account,
        subject=subject,
        external_thread_id=conv_id or in_reply_to or msg_id_hdr,
        participant_email=from_email,
    )

    body_content = item.get("body", {}).get("content", "")
    body_type = item.get("body", {}).get("contentType", "text")
    body_html = body_content if body_type == "html" else None
    body_text = body_content if body_type == "text" else None
    body_stripped = _strip_quoted(body_text) if body_text else None

    def parse_recipients(lst: list) -> list[dict]:
        return [{"email": r["emailAddress"]["address"], "name": r["emailAddress"].get("name", "")} for r in lst]

    db_msg = EmailMessage(
        id=uuid.uuid4(),
        thread_id=thread.id,
        account_id=account.id,
        message_id_header=msg_id_hdr or None,
        external_id=item.get("id"),
        in_reply_to=in_reply_to,
        direction="inbound",
        message_type="original" if not in_reply_to else "reply",
        from_email=from_email,
        from_name=from_name,
        to_recipients=parse_recipients(item.get("toRecipients", [])),
        cc_recipients=parse_recipients(item.get("ccRecipients", [])),
        bcc_recipients=[],
        subject=subject,
        body_html=body_html,
        body_text=body_text,
        body_stripped=body_stripped,
        delivery_status="delivered",
        is_read=item.get("isRead", False),
    )
    db.add(db_msg)
    await db.flush()

    if item.get("hasAttachments"):
        await _fetch_graph_attachments(item["id"], db_msg.id, account, token, db)

    await db.commit()


async def _fetch_graph_attachments(
    graph_msg_id: str,
    message_id: uuid.UUID,
    account: EmailAccount,
    token: str,
    db: AsyncSession,
) -> None:
    url = f"{GRAPH_BASE}/users/{account.graph_user_id}/messages/{graph_msg_id}/attachments"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=30)
        if resp.status_code != 200:
            return
        for att_data in resp.json().get("value", []):
            att = EmailAttachment(
                message_id=message_id,
                external_id=att_data.get("id"),
                filename=att_data.get("name", "attachment"),
                content_type=att_data.get("contentType", "application/octet-stream"),
                size_bytes=att_data.get("size", 0),
                content_id=att_data.get("contentId"),
                is_inline=att_data.get("isInline", False),
            )
            db.add(att)


# ── Dispatcher ────────────────────────────────────────────────────────────────

async def fetch_new_messages(account: EmailAccount, db: AsyncSession) -> int:
    if account.protocol == "graph_api":
        return await fetch_graph(account, db)
    return await fetch_imap(account, db)
