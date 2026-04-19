"""
CostLens – Dashboard Route
GET /dashboard – returns full dashboard summary in a single response.
"""

from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import User, APIConnection, DailyCost, Budget
from app.schemas import DashboardSummary, ProviderSummary
from app.services.usage_service import get_daily_costs, get_total_cost_for_period
from app.api.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/", response_model=DashboardSummary)
async def get_dashboard(
    days: int = Query(default=30, ge=7, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()
    yesterday = today - timedelta(days=1)
    month_start = today.replace(day=1)
    period_start = today - timedelta(days=days)
    prev_period_start = period_start - timedelta(days=days)

    # ── Today's and yesterday's cost ──────────────────────────────
    today_cost = await get_total_cost_for_period(db, current_user.id, today, today)
    yesterday_cost = await get_total_cost_for_period(db, current_user.id, yesterday, yesterday)
    daily_change = (
        ((today_cost - yesterday_cost) / yesterday_cost * 100)
        if yesterday_cost > 0 else 0.0
    )

    # ── MTD cost ──────────────────────────────────────────────────
    mtd_cost = await get_total_cost_for_period(db, current_user.id, month_start, today)

    # ── Monthly budget ────────────────────────────────────────────
    budget_result = await db.execute(
        select(Budget).where(
            and_(Budget.user_id == current_user.id, Budget.provider == "*")
        )
    )
    budget = budget_result.scalar_one_or_none()
    monthly_budget = budget.monthly_limit if budget else 0.0
    budget_pct = (mtd_cost / monthly_budget * 100) if monthly_budget > 0 else 0.0

    # ── Connection counts ─────────────────────────────────────────
    conn_result = await db.execute(
        select(APIConnection).where(APIConnection.user_id == current_user.id)
    )
    all_conns = conn_result.scalars().all()
    active_conns = [c for c in all_conns if c.is_active]

    # ── Provider summaries ────────────────────────────────────────
    stmt = (
        select(
            DailyCost.provider,
            func.sum(DailyCost.total_cost).label("cost"),
            func.sum(DailyCost.total_requests).label("requests"),
            func.avg(DailyCost.avg_latency_ms).label("latency"),
        )
        .where(
            and_(DailyCost.user_id == current_user.id, DailyCost.date >= period_start)
        )
        .group_by(DailyCost.provider)
    )
    result = await db.execute(stmt)
    current_providers = {r.provider: r for r in result.all()}

    # Previous period for comparison
    stmt_prev = (
        select(
            DailyCost.provider,
            func.sum(DailyCost.total_cost).label("cost"),
        )
        .where(
            and_(
                DailyCost.user_id == current_user.id,
                DailyCost.date >= prev_period_start,
                DailyCost.date < period_start,
            )
        )
        .group_by(DailyCost.provider)
    )
    prev_result = await db.execute(stmt_prev)
    prev_providers = {r.provider: float(r.cost) for r in prev_result.all()}

    provider_summaries = []
    for provider, row in current_providers.items():
        curr = float(row.cost or 0)
        prev = prev_providers.get(provider, 0)
        change = ((curr - prev) / prev * 100) if prev > 0 else 0.0
        provider_summaries.append(ProviderSummary(
            provider=provider,
            total_cost=round(curr, 2),
            total_requests=row.requests or 0,
            avg_latency_ms=round(float(row.latency or 0), 1),
            change_pct=round(change, 1),
        ))

    # ── Daily cost chart data ─────────────────────────────────────
    daily_costs = await get_daily_costs(db, current_user.id, days)

    # ── Potential savings (simple estimate: 15% of total) ─────────
    total_spend = sum(p.total_cost for p in provider_summaries)
    potential_savings = round(total_spend * 0.15 / (days / 30), 2)

    return DashboardSummary(
        today_cost=round(today_cost, 2),
        yesterday_cost=round(yesterday_cost, 2),
        daily_change_pct=round(daily_change, 1),
        mtd_cost=round(mtd_cost, 2),
        monthly_budget=monthly_budget,
        budget_usage_pct=round(budget_pct, 1),
        active_connections=len(active_conns),
        total_connections=len(all_conns),
        potential_savings=potential_savings,
        providers=provider_summaries,
        daily_costs=daily_costs,
    )
