"""
CostLens – Alert Routes
GET    /alerts           – list alerts (with unread filter)
POST   /alerts/read      – mark specific alerts as read
POST   /alerts/read-all  – mark all alerts as read
POST   /alerts/check     – manually trigger spike & budget checks
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import User
from app.schemas import AlertOut, AlertMarkRead
from app.services.alert_service import (
    get_alerts, get_unread_count, mark_alerts_read,
    mark_all_read, check_spend_spike, check_budget_warnings,
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("/", response_model=list[AlertOut])
async def list_alerts(
    limit: int = Query(default=20, ge=1, le=100),
    unread_only: bool = Query(default=False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    alerts = await get_alerts(db, current_user.id, limit, unread_only)
    return [AlertOut.model_validate(a) for a in alerts]


@router.get("/unread-count")
async def unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = await get_unread_count(db, current_user.id)
    return {"unread_count": count}


@router.post("/read")
async def read_alerts(
    payload: AlertMarkRead,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    updated = await mark_alerts_read(db, current_user.id, payload.alert_ids)
    return {"updated": updated}


@router.post("/read-all")
async def read_all_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    updated = await mark_all_read(db, current_user.id)
    return {"updated": updated}


@router.post("/check")
async def trigger_alert_checks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Manually trigger alert evaluation.
    In production, this runs on a schedule via APScheduler/Celery.
    """
    spike_alerts = await check_spend_spike(db, current_user.id)
    budget_alerts = await check_budget_warnings(db, current_user.id)

    all_new = spike_alerts + budget_alerts
    return {
        "alerts_created": len(all_new),
        "alerts": [AlertOut.model_validate(a) for a in all_new],
    }
