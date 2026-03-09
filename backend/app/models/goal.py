import enum
from datetime import date, datetime

from sqlalchemy import String, Text, Enum, Date, DateTime, ForeignKey, CheckConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class GoalStatus(enum.Enum):
    draft = "draft"
    active = "active"
    archived = "archived"


class GoalType(enum.Enum):
    objective = "objective"
    key_result = "key_result"


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(primary_key=True)
    parent_goal_id: Mapped[int | None] = mapped_column(
        ForeignKey("goals.id"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[GoalStatus] = mapped_column(
        Enum(GoalStatus, name="goalstatus"), nullable=False
    )
    goal_type: Mapped[GoalType] = mapped_column(
        Enum(GoalType, name="goaltype"), nullable=False
    )
    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id"), nullable=False, index=True
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )

    __table_args__ = (
        CheckConstraint("end_date >= start_date", name="ck_goals_end_date_after_start"),
    )
