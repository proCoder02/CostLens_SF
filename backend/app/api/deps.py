"""
CostLens – Auth Dependencies
Extract and validate the current user from JWT bearer token.
"""

from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import oauth2_scheme, decode_access_token
from app.db.session import get_db
from app.services.user_service import get_user_by_id
from app.models import User


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Decode JWT and return the authenticated User object."""
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    user = await get_user_by_id(db, UUID(user_id))
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deactivated",
        )

    return user
