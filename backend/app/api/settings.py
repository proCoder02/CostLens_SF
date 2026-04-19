"""
CostLens – Settings Routes
CRUD for budgets and alert preferences.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import User, Budget, AlertSetting
from app.schemas import (
    BudgetCreate, BudgetOut,
    AlertSettingUpdate, AlertSettingOut,
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/settings", tags=["Settings"])


# ─── Budgets ──────────────────────────────────────────────────────

@router.get("/budgets", response_model=list[BudgetOut])
async def list_budgets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Budget).where(Budget.user_id == current_user.id)
    )
    return [BudgetOut.model_validate(b) for b in result.scalars().all()]


@router.post("/budgets", response_model=BudgetOut, status_code=201)
async def create_budget(
    payload: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check for existing budget on this provider
    existing = await db.execute(
        select(Budget).where(
            and_(
                Budget.user_id == current_user.id,
                Budget.provider == payload.provider,
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"Budget already exists for provider '{payload.provider}'. Use PUT to update.",
        )

    budget = Budget(
        user_id=current_user.id,
        provider=payload.provider,
        monthly_limit=payload.monthly_limit,
    )
    db.add(budget)
    await db.flush()
    return BudgetOut.model_validate(budget)


@router.put("/budgets/{budget_id}", response_model=BudgetOut)
async def update_budget(
    budget_id: UUID,
    payload: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Budget).where(
            and_(Budget.id == budget_id, Budget.user_id == current_user.id)
        )
    )
    budget = result.scalar_one_or_none()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    budget.monthly_limit = payload.monthly_limit
    budget.provider = payload.provider
    await db.flush()
    return BudgetOut.model_validate(budget)


@router.delete("/budgets/{budget_id}", status_code=204)
async def delete_budget(
    budget_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Budget).where(
            and_(Budget.id == budget_id, Budget.user_id == current_user.id)
        )
    )
    budget = result.scalar_one_or_none()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    await db.delete(budget)
    await db.flush()


# ─── Alert Settings ──────────────────────────────────────────────

@router.get("/alerts", response_model=AlertSettingOut)
async def get_alert_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AlertSetting).where(AlertSetting.user_id == current_user.id)
    )
    setting = result.scalar_one_or_none()
    if not setting:
        # Create default settings on first access
        setting = AlertSetting(user_id=current_user.id)
        db.add(setting)
        await db.flush()

    return AlertSettingOut.model_validate(setting)


@router.patch("/alerts", response_model=AlertSettingOut)
async def update_alert_settings(
    payload: AlertSettingUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AlertSetting).where(AlertSetting.user_id == current_user.id)
    )
    setting = result.scalar_one_or_none()
    if not setting:
        setting = AlertSetting(user_id=current_user.id)
        db.add(setting)
        await db.flush()

    # Apply partial updates
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(setting, field, value)

    await db.flush()
    return AlertSettingOut.model_validate(setting)
