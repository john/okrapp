from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.organization import OrgType


class OrganizationCreate(BaseModel):
    name: str
    org_type: OrgType = OrgType.program
    parent_id: int | None = None


class OrganizationUpdate(BaseModel):
    name: str | None = None
    org_type: OrgType | None = None
    parent_id: int | None = None


class OrganizationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    org_type: OrgType
    parent_id: int | None
    created_at: datetime
