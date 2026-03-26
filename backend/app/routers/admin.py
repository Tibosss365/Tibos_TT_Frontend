from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user, require_admin
from app.database import get_db
from app.models.admin import EmailConfig, SLAConfig
from app.models.ticket import Ticket, TicketStatus
from app.models.user import User
from app.redis_client import get_redis
from app.schemas.admin import (
    AdminStats,
    EmailConfigOut,
    EmailConfigUpdate,
    SLAConfigOut,
    SLAConfigUpdate,
)
from app.services import cache_service

router = APIRouter(prefix="/admin", tags=["admin"])


# ── SLA ────────────────────────────────────────────────────────────────────

@router.get("/sla", response_model=SLAConfigOut)
async def get_sla(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(SLAConfig))
    sla = result.scalar_one_or_none()
    if not sla:
        raise HTTPException(status_code=404, detail="SLA config not found")
    return SLAConfigOut.model_validate(sla)


@router.put("/sla", response_model=SLAConfigOut)
async def update_sla(
    body: SLAConfigUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(SLAConfig))
    sla = result.scalar_one_or_none()
    if not sla:
        sla = SLAConfig()
        db.add(sla)

    sla.critical_hours = body.critical_hours
    sla.high_hours = body.high_hours
    sla.medium_hours = body.medium_hours
    sla.low_hours = body.low_hours

    await db.flush()
    await db.refresh(sla)
    return SLAConfigOut.model_validate(sla)


# ── Email Config ───────────────────────────────────────────────────────────

@router.get("/email", response_model=EmailConfigOut)
async def get_email(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(EmailConfig))
    cfg = result.scalar_one_or_none()
    if not cfg:
        raise HTTPException(status_code=404, detail="Email config not found")
    return EmailConfigOut.model_validate(cfg)


@router.put("/email", response_model=EmailConfigOut)
async def update_email(
    body: EmailConfigUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(EmailConfig))
    cfg = result.scalar_one_or_none()
    if not cfg:
        cfg = EmailConfig()
        db.add(cfg)

    cfg.type = body.type
    if body.triggers:
        cfg.trigger_new = body.triggers.trigger_new
        cfg.trigger_assign = body.triggers.trigger_assign
        cfg.trigger_resolve = body.triggers.trigger_resolve

    if body.smtp and body.type.value == "smtp":
        cfg.smtp_host = body.smtp.host
        cfg.smtp_port = body.smtp.port
        cfg.smtp_security = body.smtp.security
        cfg.smtp_from = body.smtp.from_address
        cfg.smtp_user = body.smtp.user
        if body.smtp.password:
            cfg.smtp_pass = body.smtp.password

    if body.m365 and body.type.value == "m365":
        cfg.m365_tenant_id = body.m365.tenant_id
        cfg.m365_client_id = body.m365.client_id
        cfg.m365_from = body.m365.from_address
        if body.m365.client_secret:
            cfg.m365_client_secret = body.m365.client_secret

    await db.flush()
    await db.refresh(cfg)
    return EmailConfigOut.model_validate(cfg)


# ── Stats / Overview ───────────────────────────────────────────────────────

@router.get("/stats", response_model=AdminStats)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    redis = await get_redis()
    cache_key = cache_service.stats_key()
    cached = await cache_service.cache_get(redis, cache_key)
    if cached:
        return cached

    # Count by status
    status_counts: dict[str, int] = {}
    for s in TicketStatus:
        res = await db.execute(
            select(func.count()).select_from(Ticket).where(Ticket.status == s)
        )
        status_counts[s.value] = res.scalar_one()

    from app.models.ticket import TicketPriority
    critical_res = await db.execute(
        select(func.count()).select_from(Ticket).where(
            Ticket.priority == TicketPriority.critical,
            Ticket.status.notin_([TicketStatus.resolved, TicketStatus.closed]),
        )
    )
    critical = critical_res.scalar_one()

    unassigned_res = await db.execute(
        select(func.count()).select_from(Ticket).where(
            Ticket.assignee_id.is_(None),
            Ticket.status.notin_([TicketStatus.resolved, TicketStatus.closed]),
        )
    )
    unassigned = unassigned_res.scalar_one()

    # Agent workload
    agents_res = await db.execute(select(User).where(User.is_active == True))
    agents = agents_res.scalars().all()
    agent_workload = []
    for agent in agents:
        open_res = await db.execute(
            select(func.count()).select_from(Ticket).where(
                Ticket.assignee_id == agent.id,
                Ticket.status.notin_([TicketStatus.resolved, TicketStatus.closed]),
            )
        )
        agent_workload.append({
            "id": str(agent.id),
            "name": agent.name,
            "initials": agent.initials,
            "group": agent.group,
            "open_tickets": open_res.scalar_one(),
        })

    total = sum(status_counts.values())
    stats = AdminStats(
        total_tickets=total,
        open_tickets=status_counts.get("open", 0),
        in_progress_tickets=status_counts.get("in-progress", 0),
        resolved_tickets=status_counts.get("resolved", 0),
        closed_tickets=status_counts.get("closed", 0),
        critical_tickets=critical,
        unassigned_tickets=unassigned,
        agent_workload=agent_workload,
    )

    await cache_service.cache_set(redis, cache_key, stats.model_dump(), cache_service.STATS_TTL)
    return stats
