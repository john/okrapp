import enum
from datetime import datetime

from sqlalchemy import String, Enum, DateTime, ForeignKey, CheckConstraint, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class OrgType(enum.Enum):
    program = "program"
    initiative = "initiative"


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    org_type: Mapped[OrgType] = mapped_column(
        Enum(OrgType, name="orgtype"), nullable=False, server_default="program"
    )
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("organizations.id"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )

    __table_args__ = (
        UniqueConstraint("name", "parent_id", name="uq_organizations_name_parent"),
        CheckConstraint("parent_id != id", name="ck_organizations_no_self_parent"),
    )
