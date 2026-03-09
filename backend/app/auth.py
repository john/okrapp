import time
from typing import Any

import httpx
from fastapi import HTTPException
from jose import JWTError, jwt
from jose.exceptions import ExpiredSignatureError

from app.config import settings

# Simple in-memory JWKS cache with TTL
_jwks_cache: dict[str, Any] = {}
_jwks_fetched_at: float = 0
_JWKS_TTL_SECONDS = 900  # 15 minutes


def _get_jwks() -> dict:
    global _jwks_cache, _jwks_fetched_at
    now = time.monotonic()
    if not _jwks_cache or (now - _jwks_fetched_at) > _JWKS_TTL_SECONDS:
        resp = httpx.get(
            f"https://{settings.auth0_domain}/.well-known/jwks.json",
            timeout=10,
        )
        resp.raise_for_status()
        _jwks_cache = resp.json()
        _jwks_fetched_at = now
    return _jwks_cache


def verify_token(token: str) -> dict:
    """Validate an Auth0 RS256 JWT and return the decoded payload."""
    try:
        unverified_header = jwt.get_unverified_header(token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token header")

    jwks = _get_jwks()

    rsa_key: dict = {}
    for key in jwks.get("keys", []):
        if key.get("kid") == unverified_header.get("kid"):
            rsa_key = {
                "kty": key["kty"],
                "kid": key["kid"],
                "use": key["use"],
                "n": key["n"],
                "e": key["e"],
            }
            break

    if not rsa_key:
        # Key rotation: bust cache and retry once
        _jwks_cache.clear()
        jwks = _get_jwks()
        for key in jwks.get("keys", []):
            if key.get("kid") == unverified_header.get("kid"):
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"],
                }
                break

    if not rsa_key:
        raise HTTPException(status_code=401, detail="Public key not found")

    try:
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=settings.auth0_algorithms,
            audience=settings.auth0_api_audience,
            issuer=f"https://{settings.auth0_domain}/",
        )
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except JWTError as exc:
        raise HTTPException(status_code=401, detail=f"Token validation failed: {exc}")

    return payload
