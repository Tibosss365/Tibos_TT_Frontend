"""
Thread management helpers – create, fetch, update threads.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.email import EmailAccount, EmailMessage, EmailThread
from ..schemas.email import EmailThreadUpdate, PaginatedThreads


async def get_or_create_thread(
    db: AsyncSession,
    account: EmailAccount,
    subject: str,
    external_thread_id: str | None,
    participant_email: str,
) -> EmailThread:
    """Find an existing thread by external_thread_id or create a new one."""
    if external_thread_id:
        existing = await db.scalar(
            select(EmailThread).where(
                EmailThread.account_id == account.id,
                EmailThread.external_thread_id == external_thread_id,
            )
        )
        if existing:
            # Ensure participant is tracked
            emails = list(existing.participant_emails or [])
            if participant_email and participant_email not in emails:
                emails.append(participant_email)
                existing.participant_emails = emails
            return existing

    thread = EmailThread(
        id=uuid.uuid4(),
        account_id=account.id,
        subject=subject,
        external_thread_id=external_thread_id,
        participant_emails=[participant_email] if participant_email else [],
        last_message_at=datetime.now(timezone.utc),
    )
    db.add(thread)
    await db.flush()
    return thread


async def list_threads(
    db: AsyncSession,
    account_id: uuid.UUID | None,
    page: int = 1,
    page_size: int = 30,
    is_read: bool | None = None,
    is_starred: bool | None = None,
    is_archived: bool | None = None,
    is_spam: bool | None = None,
    ticket_id: uuid.UUID | None = None,
    search: str | None = None,
) -> PaginatedThreads:
    from ..models.email import EmailThread
    from sqlalchemy import func, text

    q = select(EmailThread)
    if account_id:
        q = q.where(EmailThread.account_id == account_id)
    if is_read is not None:
        q = q.where(EmailThread.is_read == is_read)
    if is_starred is not None:
        q = q.where(EmailThread.is_starred == is_starred)
    if is_archived is not None:
        q = q.where(EmailThread.is_archived == is_archived)
    if is_spam is not None:
        q = q.where(EmailThread.is_spam == is_spam)
    if ticket_id is not None:
        q = q.where(EmailThread.ticket_id == ticket_id)
    if search:
        q = q.where(
            EmailThread.search_vector.op("@@")(func.websearch_to_tsquery("english", search))
        )

    count_q = select(func.count()).select_from(q.subquery())
    total = await db.scalar(count_q) or 0

    q = q.order_by(desc(EmailThread.last_message_at))
    q = q.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    items = list(result.scalars().all())

    return PaginatedThreads(
        items=items,
        total=total,
        page=page,
        pages=max(1, (total + page_size - 1) // page_size),
    )


async def get_thread_with_messages(db: AsyncSession, thread_id: uuid.UUID) -> EmailThread | None:
    result = await db.execute(
        select(EmailThread)
        .where(EmailThread.id == thread_id)
        .options(
            selectinload(EmailThread.messages).selectinload(EmailMessage.attachments)
        )
    )
    return result.scalar_one_or_none()


async def update_thread(
    db: AsyncSession,
    thread_id: uuid.UUID,
    data: EmailThreadUpdate,
) -> EmailThread | None:
    thread = await db.get(EmailThread, thread_id)
    if not thread:
        return None
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(thread, field, value)
    if data.is_read is True:
        await db.execute(
            update(EmailMessage)
            .where(EmailMessage.thread_id == thread_id, EmailMessage.is_read == False)
            .values(is_read=True, read_at=datetime.now(timezone.utc))
        )
    await db.commit()
    await db.refresh(thread)
    return thread


async def mark_messages_read(
    db: AsyncSession,
    thread_id: uuid.UUID,
    message_ids: list[uuid.UUID],
    is_read: bool,
) -> None:
    now = datetime.now(timezone.utc)
    await db.execute(
        update(EmailMessage)
        .where(
            EmailMessage.thread_id == thread_id,
            EmailMessage.id.in_(message_ids),
        )
        .values(is_read=is_read, read_at=now if is_read else None)
    )
    unread = await db.scalar(
        select(EmailMessage)
        .where(EmailMessage.thread_id == thread_id, EmailMessage.is_read == False)
        .limit(1)
    )
    thread = await db.get(EmailThread, thread_id)
    if thread:
        thread.is_read = unread is None
    await db.commit()


async def link_thread_to_ticket(
    db: AsyncSession,
    thread_id: uuid.UUID,
    ticket_id: uuid.UUID | None,
) -> EmailThread | None:
    thread = await db.get(EmailThread, thread_id)
    if not thread:
        return None
    thread.ticket_id = ticket_id
    await db.commit()
    await db.refresh(thread)
    return thread
