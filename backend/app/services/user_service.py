"""
CostLens – User Service
Registration, login, and user lookup.
"""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User, AlertSetting
from app.schemas import UserCreate
from app.core.security import hash_password, verify_password, create_access_token


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, payload: UserCreate) -> User:
    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
    )
    db.add(user)
    await db.flush()

    # Create default alert settings
    alert_setting = AlertSetting(user_id=user.id)
    db.add(alert_setting)
    await db.flush()

    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
    user = await get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def generate_token(user: User) -> str:
    return create_access_token(data={"sub": str(user.id), "email": user.email})
