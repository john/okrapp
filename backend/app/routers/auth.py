import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth import verify_token
from app.config import settings
from app.database import get_db
from app.models.user import AuthProvider, User
from app.schemas.user import UserResponse

router = APIRouter()
security = HTTPBearer()


@router.post("/callback", response_model=UserResponse)
def auth_callback(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> UserResponse:
    """Called by the frontend after Auth0 login. Upserts the user row."""
    token = credentials.credentials
    payload = verify_token(token)
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Token missing sub claim")

    # Fetch user profile from Auth0 userinfo endpoint
    try:
        userinfo_resp = httpx.get(
            f"https://{settings.auth0_domain}/userinfo",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        userinfo_resp.raise_for_status()
        userinfo = userinfo_resp.json()
    except httpx.HTTPError:
        userinfo = {}

    user = (
        db.query(User)
        .filter(User.sub == sub, User.auth_provider == AuthProvider.auth0, User.deleted_at.is_(None))
        .first()
    )

    if not user:
        user = User(
            sub=sub,
            auth_provider=AuthProvider.auth0,
            name=userinfo.get("name"),
            email=userinfo.get("email"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return UserResponse.model_validate(user)
