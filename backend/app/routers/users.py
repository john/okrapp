from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.dependencies import get_current_admin, get_current_user
from app.database import get_db
from app.models.organization import Organization
from app.models.user import User
from app.models.users_organizations import UserOrganization
from app.schemas.user import OrganizationBrief, UserMeResponse, UserResponse, UserWithOrgsResponse

router = APIRouter()


@router.get("/me", response_model=UserMeResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    orgs = (
        db.query(Organization)
        .join(UserOrganization, UserOrganization.organization_id == Organization.id)
        .filter(
            UserOrganization.user_id == current_user.id,
            UserOrganization.deleted_at.is_(None),
            Organization.deleted_at.is_(None),
        )
        .all()
    )
    return UserMeResponse(
        **UserResponse.model_validate(current_user).model_dump(),
        organizations=[OrganizationBrief.model_validate(o) for o in orgs],
        is_admin=current_user.email in settings.admin_emails,
    )


@router.get("", response_model=list[UserWithOrgsResponse])
def list_users(
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    users = db.query(User).filter(User.deleted_at.is_(None)).all()
    # Load org memberships for all users in one query
    memberships = (
        db.query(UserOrganization, Organization)
        .join(Organization, Organization.id == UserOrganization.organization_id)
        .filter(
            UserOrganization.user_id.in_([u.id for u in users]),
            UserOrganization.deleted_at.is_(None),
            Organization.deleted_at.is_(None),
        )
        .all()
    )
    orgs_by_user: dict[int, list[Organization]] = {}
    for membership, org in memberships:
        orgs_by_user.setdefault(membership.user_id, []).append(org)

    return [
        UserWithOrgsResponse(
            **UserResponse.model_validate(u).model_dump(),
            organizations=[OrganizationBrief.model_validate(o) for o in orgs_by_user.get(u.id, [])],
        )
        for u in users
    ]


@router.post("/{user_id}/organizations", status_code=201)
def add_user_to_org(
    user_id: int,
    payload: dict,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    org_id = payload.get("organization_id")
    if not org_id:
        raise HTTPException(status_code=422, detail="organization_id required")

    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    org = db.query(Organization).filter(Organization.id == org_id, Organization.deleted_at.is_(None)).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    existing = (
        db.query(UserOrganization)
        .filter(
            UserOrganization.user_id == user_id,
            UserOrganization.organization_id == org_id,
            UserOrganization.deleted_at.is_(None),
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="User already belongs to this organization")

    membership = UserOrganization(
        user_id=user_id,
        organization_id=org_id,
        created_by=admin.id,
    )
    db.add(membership)
    db.commit()
    return {"ok": True}


@router.delete("/{user_id}/organizations/{org_id}", status_code=200)
def remove_user_from_org(
    user_id: int,
    org_id: int,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    membership = (
        db.query(UserOrganization)
        .filter(
            UserOrganization.user_id == user_id,
            UserOrganization.organization_id == org_id,
            UserOrganization.deleted_at.is_(None),
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")

    membership.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True}
