"""
CostLens – API Connection Routes
CRUD for provider connections (OpenAI, AWS, Stripe, Twilio, custom).
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import User, APIConnection
from app.schemas import APIConnectionCreate, APIConnectionOut, APIConnectionToggle
from app.api.deps import get_current_user

router = APIRouter(prefix="/connections", tags=["Connections"])


@router.get("/", response_model=list[APIConnectionOut])
async def list_connections(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(APIConnection)
        .where(APIConnection.user_id == current_user.id)
        .order_by(APIConnection.created_at)
    )
    return [APIConnectionOut.model_validate(c) for c in result.scalars().all()]


@router.post("/", response_model=APIConnectionOut, status_code=201)
async def create_connection(
    payload: APIConnectionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check if provider already connected
    existing = await db.execute(
        select(APIConnection).where(
            and_(
                APIConnection.user_id == current_user.id,
                APIConnection.provider == payload.provider,
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"{payload.provider} is already connected")

    # Plan limits
    plan_limits = {"free": 1, "startup": 10, "business": 50}
    max_conns = plan_limits.get(current_user.plan, 1)

    count_result = await db.execute(
        select(APIConnection)
        .where(APIConnection.user_id == current_user.id)
    )
    current_count = len(count_result.scalars().all())
    if current_count >= max_conns:
        raise HTTPException(
            status_code=403,
            detail=f"Your {current_user.plan} plan allows up to {max_conns} connections",
        )

    conn = APIConnection(
        user_id=current_user.id,
        provider=payload.provider,
        display_name=payload.display_name or payload.provider.title(),
        api_key_encrypted=payload.api_key,  # TODO: encrypt with Fernet
        is_active=True,
    )
    db.add(conn)
    await db.flush()
    return APIConnectionOut.model_validate(conn)


@router.patch("/{connection_id}", response_model=APIConnectionOut)
async def toggle_connection(
    connection_id: UUID,
    payload: APIConnectionToggle,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(APIConnection).where(
            and_(
                APIConnection.id == connection_id,
                APIConnection.user_id == current_user.id,
            )
        )
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    conn.is_active = payload.is_active
    await db.flush()
    return APIConnectionOut.model_validate(conn)


@router.delete("/{connection_id}", status_code=204)
async def delete_connection(
    connection_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(APIConnection).where(
            and_(
                APIConnection.id == connection_id,
                APIConnection.user_id == current_user.id,
            )
        )
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    await db.delete(conn)
    await db.flush()
