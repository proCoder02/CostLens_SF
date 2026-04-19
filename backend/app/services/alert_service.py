"""
CostLens – Alert Service
Create, evaluate, and manage alerts. Includes spike detection and budget monitoring.
"""

from datetime import date, timedelta, timezone, datetime
from uuid import UUID
from typing import List

from sqlalchemy import select, func, and_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Alert, AlertSetting, DailyCost, Budget
from app.schemas import AlertOut


# ─── Query Alerts ─────────────────────────────────────────────────

async def get_alerts(
    db: AsyncSession,
    user_id: UUID,
    limit: int = 20,
    unread_only: bool = False,
) -> List[Alert]:
    stmt = (
        select(Alert)
        .where(Alert.user_id == user_id)
        .order_by(Alert.created_at.desc())
        .limit(limit)
    )
    if unread_only:
        stmt = stmt.where(Alert.is_read == False)

    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_unread_count(db: AsyncSession, user_id: UUID) -> int:
    stmt = (
        select(func.count())
        .select_from(Alert)
        .where(and_(Alert.user_id == user_id, Alert.is_read == False))
    )
    result = await db.execute(stmt)
    return result.scalar_one()


async def mark_alerts_read(db: AsyncSession, user_id: UUID, alert_ids: List[UUID]) -> int:
    stmt = (
        update(Alert)
        .where(and_(Alert.user_id == user_id, Alert.id.in_(alert_ids)))
        .values(is_read=True)
    )
    result = await db.execute(stmt)
    return result.rowcount


async def mark_all_read(db: AsyncSession, user_id: UUID) -> int:
    stmt = (
        update(Alert)
        .where(and_(Alert.user_id == user_id, Alert.is_read == False))
        .values(is_read=True)
    )
    result = await db.execute(stmt)
    return result.rowcount


# ─── Alert Creation ───────────────────────────────────────────────

async def create_alert(
    db: AsyncSession,
    user_id: UUID,
    alert_type: str,
    severity: str,
    title: str,
    message: str,
) -> Alert:
    alert = Alert(
        user_id=user_id,
        alert_type=alert_type,
        severity=severity,
        title=title,
        message=message,
    )
    db.add(alert)
    await db.flush()
    return alert


# ─── Spike Detection ─────────────────────────────────────────────

async def check_spend_spike(
    db: AsyncSession,
    user_id: UUID,
) -> List[Alert]:
    """
    Compare today's spend to the 7-day rolling average.
    If it exceeds the user's spike_threshold_pct, fire an alert.
    """
    # Get user's threshold
    result = await db.execute(
        select(AlertSetting).where(AlertSetting.user_id == user_id)
    )
    settings = result.scalar_one_or_none()
    threshold = settings.spike_threshold_pct if settings else 40.0

    today = date.today()
    week_ago = today - timedelta(days=7)

    # Today's total
    stmt_today = (
        select(func.coalesce(func.sum(DailyCost.total_cost), 0.0))
        .where(and_(DailyCost.user_id == user_id, DailyCost.date == today))
    )
    today_cost = float((await db.execute(stmt_today)).scalar_one())

    # 7-day average (excluding today)
    stmt_avg = (
        select(func.coalesce(func.avg(DailyCost.total_cost), 0.0))
        .where(
            and_(
                DailyCost.user_id == user_id,
                DailyCost.date >= week_ago,
                DailyCost.date < today,
            )
        )
    )
    avg_cost = float((await db.execute(stmt_avg)).scalar_one())

    alerts_created = []

    if avg_cost > 0:
        change_pct = ((today_cost - avg_cost) / avg_cost) * 100
        if change_pct > threshold:
            alert = await create_alert(
                db, user_id,
                alert_type="spike",
                severity="critical" if change_pct > 100 else "warning",
                title="Spend Spike Detected",
                message=(
                    f"Today's API spend (${today_cost:.2f}) is {change_pct:.0f}% above "
                    f"your 7-day average (${avg_cost:.2f})."
                ),
            )
            alerts_created.append(alert)

    return alerts_created


# ─── Budget Check ─────────────────────────────────────────────────

async def check_budget_warnings(
    db: AsyncSession,
    user_id: UUID,
) -> List[Alert]:
    """Check if any provider's MTD spend exceeds the budget warning threshold."""
    result = await db.execute(
        select(AlertSetting).where(AlertSetting.user_id == user_id)
    )
    settings = result.scalar_one_or_none()
    warning_pct = settings.budget_warning_pct if settings else 80.0

    # Get all budgets
    budget_result = await db.execute(
        select(Budget).where(Budget.user_id == user_id)
    )
    budgets = budget_result.scalars().all()

    today = date.today()
    month_start = today.replace(day=1)

    alerts_created = []

    for budget in budgets:
        # Get MTD spend for this provider
        stmt = select(func.coalesce(func.sum(DailyCost.total_cost), 0.0)).where(
            and_(
                DailyCost.user_id == user_id,
                DailyCost.date >= month_start,
                DailyCost.date <= today,
            )
        )
        if budget.provider != "*":
            stmt = stmt.where(DailyCost.provider == budget.provider)

        mtd_cost = float((await db.execute(stmt)).scalar_one())
        usage_pct = (mtd_cost / budget.monthly_limit) * 100 if budget.monthly_limit > 0 else 0

        if usage_pct >= warning_pct:
            provider_label = budget.provider.upper() if budget.provider != "*" else "Total"
            alert = await create_alert(
                db, user_id,
                alert_type="budget",
                severity="critical" if usage_pct >= 95 else "warning",
                title=f"{provider_label} Budget Warning",
                message=(
                    f"{provider_label} spend is at {usage_pct:.0f}% of monthly budget "
                    f"(${mtd_cost:.2f} / ${budget.monthly_limit:.2f})."
                ),
            )
            alerts_created.append(alert)

    return alerts_created
