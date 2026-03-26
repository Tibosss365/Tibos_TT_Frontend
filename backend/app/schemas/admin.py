import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.admin import EmailType, SMTPSecurity


class SLAConfigOut(BaseModel):
    id: uuid.UUID
    critical_hours: int
    high_hours: int
    medium_hours: int
    low_hours: int
    updated_at: datetime

    model_config = {"from_attributes": True}


class SLAConfigUpdate(BaseModel):
    critical_hours: int
    high_hours: int
    medium_hours: int
    low_hours: int


class SMTPSettings(BaseModel):
    host: str = ""
    port: str = "587"
    security: SMTPSecurity = SMTPSecurity.tls
    from_address: str = ""
    user: str = ""
    password: str = ""


class M365Settings(BaseModel):
    tenant_id: str = ""
    client_id: str = ""
    client_secret: str = ""
    from_address: str = ""


class EmailTriggers(BaseModel):
    trigger_new: bool = True
    trigger_assign: bool = True
    trigger_resolve: bool = True


class EmailConfigOut(BaseModel):
    id: uuid.UUID
    type: EmailType
    smtp_host: str | None
    smtp_port: str | None
    smtp_security: SMTPSecurity | None
    smtp_from: str | None
    smtp_user: str | None
    m365_tenant_id: str | None
    m365_client_id: str | None
    m365_from: str | None
    trigger_new: bool
    trigger_assign: bool
    trigger_resolve: bool
    updated_at: datetime

    model_config = {"from_attributes": True}


class EmailConfigUpdate(BaseModel):
    type: EmailType
    smtp: SMTPSettings | None = None
    m365: M365Settings | None = None
    triggers: EmailTriggers = EmailTriggers()


class AdminStats(BaseModel):
    total_tickets: int
    open_tickets: int
    in_progress_tickets: int
    resolved_tickets: int
    closed_tickets: int
    critical_tickets: int
    unassigned_tickets: int
    agent_workload: list[dict]
