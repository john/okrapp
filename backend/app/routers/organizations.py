from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_current_admin, get_current_user
from app.database import get_db
from app.models.organization import Organization, OrgType
from app.models.user import User
from app.schemas.organization import OrganizationCreate, OrganizationResponse, OrganizationUpdate

router = APIRouter()


@router.get("", response_model=list[OrganizationResponse])
def list_organizations(
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Organization).filter(Organization.deleted_at.is_(None)).all()


@router.get("/programs", response_model=list[OrganizationResponse])
def list_programs(
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Organization)
        .filter(Organization.org_type == OrgType.program, Organization.deleted_at.is_(None))
        .all()
    )


@router.get("/{org_id}", response_model=OrganizationResponse)
def get_organization(
    org_id: int,
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org = db.query(Organization).filter(Organization.id == org_id, Organization.deleted_at.is_(None)).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@router.post("", response_model=OrganizationResponse, status_code=201)
def create_organization(
    data: OrganizationCreate,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    org = Organization(**data.model_dump())
    db.add(org)
    db.commit()
    db.refresh(org)
    return org


@router.patch("/{org_id}", response_model=OrganizationResponse)
def update_organization(
    org_id: int,
    data: OrganizationUpdate,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    org = db.query(Organization).filter(Organization.id == org_id, Organization.deleted_at.is_(None)).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(org, field, value)
    db.commit()
    db.refresh(org)
    return org
