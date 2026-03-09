import enum
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Text, Enum, Date, DateTime, ForeignKey, Numeric, CheckConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AssessmentStatus(enum.Enum):
    not_started = "not_started"
    on_track = "on_track"
    at_risk = "at_risk"
    off_track = "off_track"
    completed = "completed"


class Confidence(enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(primary_key=True)
    goal_id: Mapped[int] = mapped_column(
        ForeignKey("goals.id"), nullable=False, index=True
    )
    assessment_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), nullable=False, index=True
    )
    period_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    period_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[AssessmentStatus] = mapped_column(
        Enum(AssessmentStatus, name="assessmentstatus"), nullable=False
    )
    score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    confidence: Mapped[Confidence | None] = mapped_column(
        Enum(Confidence, name="confidence"), nullable=True
    )
    narrative: Mapped[str | None] = mapped_column(Text, nullable=True)
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
        CheckConstraint(
            "score IS NULL OR (score >= 0 AND score <= 100)",
            name="ck_assessments_score_range",
        ),
        # Functional unique index on (goal_id, date_trunc('day', assessment_date))
        # is defined in the Alembic migration (cannot be expressed as a table-level constraint)
    )
