from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.user import AuthProvider


class OrganizationBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    org_type: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sub: str
    auth_provider: AuthProvider
    name: str | None
    email: str | None
    created_at: datetime


class UserWithOrgsResponse(UserResponse):
    organizations: list[OrganizationBrief] = []


class UserMeResponse(UserResponse):
    organizations: list[OrganizationBrief] = []
    is_admin: bool = False
