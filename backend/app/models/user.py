import enum
from datetime import datetime

from sqlalchemy import String, Enum, DateTime, CheckConstraint, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AuthProvider(enum.Enum):
    auth0 = "auth0"
    entra = "entra"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    sub: Mapped[str] = mapped_column(String, nullable=False)
    auth_provider: Mapped[AuthProvider] = mapped_column(
        Enum(AuthProvider, name="authprovider"), nullable=False
    )
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    email: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )

    __table_args__ = (
        UniqueConstraint("auth_provider", "sub", name="uq_users_provider_sub"),
        CheckConstraint(
            "email IS NULL OR lower(email) ~ '^[^@]+@rmi\\.org$'",
            name="email_rmi_domain_check",
        ),
    )
