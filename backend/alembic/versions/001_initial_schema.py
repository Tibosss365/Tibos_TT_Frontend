"""initial schema

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enums
    op.execute("CREATE TYPE userrole AS ENUM ('technician', 'admin')")
    op.execute("CREATE TYPE ticketcategory AS ENUM ('hardware','software','network','access','email','security','other')")
    op.execute("CREATE TYPE ticketpriority AS ENUM ('critical','high','medium','low')")
    op.execute("CREATE TYPE ticketstatus AS ENUM ('open','in-progress','on-hold','resolved','closed')")
    op.execute("CREATE TYPE timelinetype AS ENUM ('created','assign','status','comment','resolved')")
    op.execute("CREATE TYPE notificationtype AS ENUM ('critical','warning','success','info')")
    op.execute("CREATE TYPE emailtype AS ENUM ('smtp','m365')")
    op.execute("CREATE TYPE smtpsecurity AS ENUM ('tls','ssl')")

    # Sequence for ticket numbers
    op.execute("CREATE SEQUENCE ticket_number_seq START 1")

    # users
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("initials", sa.String(4), nullable=False),
        sa.Column("group", sa.String(100), nullable=False, server_default=""),
        sa.Column("username", sa.String(50), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", sa.Enum("technician", "admin", name="userrole"), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_users_username", "users", ["username"])

    # tickets
    op.create_table(
        "tickets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("ticket_number", sa.Integer, sa.Sequence("ticket_number_seq"), nullable=False, unique=True),
        sa.Column("subject", sa.String(255), nullable=False),
        sa.Column("category", sa.Enum("hardware","software","network","access","email","security","other", name="ticketcategory"), nullable=False),
        sa.Column("priority", sa.Enum("critical","high","medium","low", name="ticketpriority"), nullable=False),
        sa.Column("status", sa.Enum("open","in-progress","on-hold","resolved","closed", name="ticketstatus"), nullable=False, server_default="open"),
        sa.Column("assignee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("submitter_name", sa.String(100), nullable=False),
        sa.Column("company", sa.String(100), nullable=False, server_default=""),
        sa.Column("contact_name", sa.String(100), nullable=False, server_default=""),
        sa.Column("email", sa.String(255), nullable=False, server_default=""),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("asset", sa.String(100), nullable=True),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_tickets_ticket_number", "tickets", ["ticket_number"])
    op.create_index("ix_tickets_created_at", "tickets", ["created_at"])

    # ticket_timeline
    op.create_table(
        "ticket_timeline",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("ticket_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.Enum("created","assign","status","comment","resolved", name="timelinetype"), nullable=False),
        sa.Column("text", sa.Text, nullable=False),
        sa.Column("author_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_ticket_timeline_ticket_id", "ticket_timeline", ["ticket_id"])

    # notifications
    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ticket_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tickets.id", ondelete="CASCADE"), nullable=True),
        sa.Column("text", sa.Text, nullable=False),
        sa.Column("type", sa.Enum("critical","warning","success","info", name="notificationtype"), nullable=False),
        sa.Column("read", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_created_at", "notifications", ["created_at"])

    # sla_config
    op.create_table(
        "sla_config",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("critical_hours", sa.Integer, nullable=False, server_default="1"),
        sa.Column("high_hours", sa.Integer, nullable=False, server_default="4"),
        sa.Column("medium_hours", sa.Integer, nullable=False, server_default="8"),
        sa.Column("low_hours", sa.Integer, nullable=False, server_default="24"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # email_config
    op.create_table(
        "email_config",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("type", sa.Enum("smtp","m365", name="emailtype"), nullable=False, server_default="smtp"),
        sa.Column("smtp_host", sa.String(255), nullable=True),
        sa.Column("smtp_port", sa.String(10), nullable=True),
        sa.Column("smtp_security", sa.Enum("tls","ssl", name="smtpsecurity"), nullable=True),
        sa.Column("smtp_from", sa.String(255), nullable=True),
        sa.Column("smtp_user", sa.String(255), nullable=True),
        sa.Column("smtp_pass", sa.Text, nullable=True),
        sa.Column("m365_tenant_id", sa.String(255), nullable=True),
        sa.Column("m365_client_id", sa.String(255), nullable=True),
        sa.Column("m365_client_secret", sa.Text, nullable=True),
        sa.Column("m365_from", sa.String(255), nullable=True),
        sa.Column("trigger_new", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("trigger_assign", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("trigger_resolve", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("email_config")
    op.drop_table("sla_config")
    op.drop_table("notifications")
    op.drop_table("ticket_timeline")
    op.drop_table("tickets")
    op.drop_table("users")
    op.execute("DROP SEQUENCE IF EXISTS ticket_number_seq")
    for enum in ["smtpsecurity","emailtype","notificationtype","timelinetype","ticketstatus","ticketpriority","ticketcategory","userrole"]:
        op.execute(f"DROP TYPE IF EXISTS {enum}")
