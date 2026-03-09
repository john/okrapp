from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, model_validator

from app.models.goal import GoalStatus, GoalType


class GoalCreate(BaseModel):
    title: str
    description: str | None = None
    status: GoalStatus = GoalStatus.draft
    goal_type: GoalType
    organization_id: int
    parent_goal_id: int | None = None
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def end_after_start(self) -> "GoalCreate":
        if self.end_date < self.start_date:
            raise ValueError("end_date must be >= start_date")
        return self


class GoalUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: GoalStatus | None = None
    start_date: date | None = None
    end_date: date | None = None


class GoalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    status: GoalStatus
    goal_type: GoalType
    organization_id: int
    parent_goal_id: int | None
    start_date: date
    end_date: date
    created_at: datetime
    created_by: int
