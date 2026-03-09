from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.auth import verify_token
from app.config import settings
from app.database import get_db
from app.models.user import User

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    payload = verify_token(token)
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Invalid token: missing sub")

    user = db.query(User).filter(User.sub == sub, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found; complete login via /auth/callback first",
        )
    return user


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.email not in settings.admin_emails:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
