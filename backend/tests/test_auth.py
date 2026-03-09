from unittest.mock import patch

import pytest

from app.models.user import AuthProvider, User


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

FAKE_SUB = "auth0|test123"
FAKE_PAYLOAD = {"sub": FAKE_SUB}
FAKE_USERINFO = {"name": "Test User", "email": "testuser@rmi.org"}


def _seed_user(db, email="testuser@rmi.org", sub=FAKE_SUB):
    user = User(sub=sub, auth_provider=AuthProvider.auth0, name="Test User", email=email)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ---------------------------------------------------------------------------
# POST /auth/callback
# ---------------------------------------------------------------------------

class TestAuthCallback:
    def test_callback_creates_user(self, client, db):
        with (
            patch("app.routers.auth.verify_token", return_value=FAKE_PAYLOAD),
            patch("app.routers.auth.httpx.get") as mock_get,
        ):
            mock_get.return_value.json.return_value = FAKE_USERINFO
            mock_get.return_value.raise_for_status = lambda: None

            resp = client.post(
                "/auth/callback",
                headers={"Authorization": "Bearer faketoken"},
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["sub"] == FAKE_SUB
        assert data["email"] == "testuser@rmi.org"

        user = db.query(User).filter_by(sub=FAKE_SUB).first()
        assert user is not None
        assert user.name == "Test User"

    def test_callback_is_idempotent(self, client, db):
        _seed_user(db)

        with (
            patch("app.routers.auth.verify_token", return_value=FAKE_PAYLOAD),
            patch("app.routers.auth.httpx.get") as mock_get,
        ):
            mock_get.return_value.json.return_value = FAKE_USERINFO
            mock_get.return_value.raise_for_status = lambda: None

            resp1 = client.post("/auth/callback", headers={"Authorization": "Bearer faketoken"})
            resp2 = client.post("/auth/callback", headers={"Authorization": "Bearer faketoken"})

        assert resp1.status_code == 200
        assert resp2.status_code == 200

        count = db.query(User).filter_by(sub=FAKE_SUB).count()
        assert count == 1


# ---------------------------------------------------------------------------
# GET /users/me
# ---------------------------------------------------------------------------

class TestGetMe:
    def test_unauthenticated_returns_403(self, client):
        resp = client.get("/users/me")
        assert resp.status_code == 403  # HTTPBearer returns 403 when no credentials

    def test_authenticated_returns_user(self, client, db):
        user = _seed_user(db)

        with patch("app.dependencies.verify_token", return_value={"sub": user.sub}):
            resp = client.get("/users/me", headers={"Authorization": "Bearer faketoken"})

        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == user.email
        assert data["sub"] == user.sub


# ---------------------------------------------------------------------------
# Admin access
# ---------------------------------------------------------------------------

class TestAdminAccess:
    def test_non_admin_rejected(self, client, db):
        user = _seed_user(db, email="notadmin@rmi.org", sub="auth0|notadmin")

        with patch("app.dependencies.verify_token", return_value={"sub": user.sub}):
            resp = client.get("/users", headers={"Authorization": "Bearer faketoken"})

        assert resp.status_code == 403

    def test_admin_accepted(self, client, db):
        admin = _seed_user(db, email="jmcgrath@rmi.org", sub="auth0|admin")

        with patch("app.dependencies.verify_token", return_value={"sub": admin.sub}):
            resp = client.get("/users", headers={"Authorization": "Bearer faketoken"})

        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Token validation
# ---------------------------------------------------------------------------

class TestTokenValidation:
    def test_expired_token_returns_401(self, client):
        from jose.exceptions import ExpiredSignatureError
        from fastapi import HTTPException

        def raise_expired(token):
            raise HTTPException(status_code=401, detail="Token expired")

        with patch("app.dependencies.verify_token", side_effect=raise_expired):
            resp = client.get("/users/me", headers={"Authorization": "Bearer expiredtoken"})

        assert resp.status_code == 401
        assert "expired" in resp.json()["detail"].lower()
