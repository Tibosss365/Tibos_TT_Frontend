import uuid
import enum
from datetime import datetime, timezone

from sqlalchemy import String, Boolean, Integer, DateTime, Enum as SAEnum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class EmailType(str, enum.Enum):
    smtp = "smtp"
    m365 = "m365"


class SMTPSecurity(str, enum.Enum):
    tls = "tls"
    ssl = "ssl"


class SLAConfig(Base):
    __tablename__ = "sla_config"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    critical_hours: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    high_hours: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    medium_hours: Mapped[int] = mapped_column(Integer, default=8, nullable=False)
    low_hours: Mapped[int] = mapped_column(Integer, default=24, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class EmailConfig(Base):
    __tablename__ = "email_config"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    type: Mapped[EmailType] = mapped_column(
        SAEnum(EmailType, name="emailtype"), nullable=False, default=EmailType.smtp
    )
    # SMTP fields
    smtp_host: Mapped[str | None] = mapped_column(String(255), nullable=True)
    smtp_port: Mapped[str | None] = mapped_column(String(10), nullable=True)
    smtp_security: Mapped[SMTPSecurity | None] = mapped_column(
        SAEnum(SMTPSecurity, name="smtpsecurity"), nullable=True
    )
    smtp_from: Mapped[str | None] = mapped_column(String(255), nullable=True)
    smtp_user: Mapped[str | None] = mapped_column(String(255), nullable=True)
    smtp_pass: Mapped[str | None] = mapped_column(Text, nullable=True)
    # M365 fields
    m365_tenant_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    m365_client_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    m365_client_secret: Mapped[str | None] = mapped_column(Text, nullable=True)
    m365_from: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Triggers
    trigger_new: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    trigger_assign: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    trigger_resolve: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
