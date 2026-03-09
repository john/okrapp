from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, get_current_admin
from app.models.goal import Goal, GoalType
from app.models.organization import Organization
from app.models.user import User
from app.models.users_organizations import UserOrganization
from app.schemas.goal import GoalCreate, GoalResponse, GoalUpdate

router = APIRouter()


def _require_org_access(user: User, org_id: int, db: Session) -> None:
    """Raise 403 if user is not an admin and not a member of the org."""
    if user.email and _is_admin(user):
        return
    membership = (
        db.query(UserOrganization)
        .filter(
            UserOrganization.user_id == user.id,
            UserOrganization.organization_id == org_id,
            UserOrganization.deleted_at.is_(None),
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="You must be a member of this organization")


def _is_admin(user: User) -> bool:
    from app.config import settings
    return user.email in settings.admin_emails


# ── List goals for an org ──────────────────────────────────────────────────

@router.get("/organizations/{org_id}/goals", response_model=list[GoalResponse])
def list_org_goals(
    org_id: int,
    type: GoalType | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org = db.query(Organization).filter(
        Organization.id == org_id, Organization.deleted_at.is_(None)
    ).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    q = db.query(Goal).filter(Goal.organization_id == org_id, Goal.deleted_at.is_(None))
    if type:
        q = q.filter(Goal.goal_type == type)
    return q.order_by(Goal.created_at).all()


# ── Single goal ────────────────────────────────────────────────────────────

@router.get("/goals/{goal_id}", response_model=GoalResponse)
def get_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.deleted_at.is_(None)).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal


# ── Children (KRs under an objective) ─────────────────────────────────────

@router.get("/goals/{goal_id}/children", response_model=list[GoalResponse])
def get_goal_children(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.deleted_at.is_(None)).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return (
        db.query(Goal)
        .filter(Goal.parent_goal_id == goal_id, Goal.deleted_at.is_(None))
        .order_by(Goal.created_at)
        .all()
    )


# ── Create ─────────────────────────────────────────────────────────────────

@router.post("/goals", response_model=GoalResponse, status_code=201)
def create_goal(
    data: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org = db.query(Organization).filter(
        Organization.id == data.organization_id, Organization.deleted_at.is_(None)
    ).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    _require_org_access(current_user, data.organization_id, db)

    if data.parent_goal_id:
        parent = db.query(Goal).filter(
            Goal.id == data.parent_goal_id, Goal.deleted_at.is_(None)
        ).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent goal not found")

    goal = Goal(**data.model_dump(), created_by=current_user.id)
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


# ── Update ─────────────────────────────────────────────────────────────────

@router.patch("/goals/{goal_id}", response_model=GoalResponse)
def update_goal(
    goal_id: int,
    data: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.deleted_at.is_(None)).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    _require_org_access(current_user, goal.organization_id, db)

    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(goal, field, value)
    goal.updated_by = current_user.id
    db.commit()
    db.refresh(goal)
    return goal


# ── Soft delete ────────────────────────────────────────────────────────────

@router.delete("/goals/{goal_id}", status_code=200)
def delete_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.deleted_at.is_(None)).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    _require_org_access(current_user, goal.organization_id, db)

    goal.deleted_at = datetime.now(timezone.utc)
    goal.updated_by = current_user.id
    db.commit()
    return {"ok": True}
