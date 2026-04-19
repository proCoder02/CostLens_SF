"""
CostLens – Usage Service
Ingest API usage records, compute daily aggregates, and query usage data.
"""

from datetime import date, datetime, timedelta, timezone
from uuid import UUID
from typing import List, Optional

from sqlalchemy import select, func, and_, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import UsageLog, DailyCost, APIConnection
from app.schemas import UsageLogCreate, DailyCostPoint, EndpointBreakdown


# ─── Ingest ───────────────────────────────────────────────────────

async def ingest_usage(
    db: AsyncSession,
    user_id: UUID,
    records: List[UsageLogCreate],
) -> int:
    """
    Ingest a batch of usage records.
    Automatically resolves connection_id from the provider.
    Returns the number of records inserted.
    """
    # Cache connection lookups
    conn_cache: dict[str, UUID] = {}

    logs = []
    for rec in records:
        if rec.provider not in conn_cache:
            result = await db.execute(
                select(APIConnection.id).where(
                    and_(
                        APIConnection.user_id == user_id,
                        APIConnection.provider == rec.provider,
                        APIConnection.is_active == True,
                    )
                )
            )
            conn_id = result.scalar_one_or_none()
            if conn_id is None:
                continue  # skip records for disconnected providers
            conn_cache[rec.provider] = conn_id

        log = UsageLog(
            user_id=user_id,
            connection_id=conn_cache[rec.provider],
            provider=rec.provider,
            endpoint=rec.endpoint,
            method=rec.method,
            feature_tag=rec.feature_tag,
            request_count=rec.request_count,
            tokens_used=rec.tokens_used,
            cost=rec.cost,
            latency_ms=rec.latency_ms,
            status_code=rec.status_code,
            metadata_json=rec.metadata_json,
        )
        logs.append(log)

    db.add_all(logs)
    await db.flush()
    return len(logs)


# ─── Daily Aggregation ───────────────────────────────────────────

async def aggregate_daily_costs(
    db: AsyncSession,
    user_id: UUID,
    target_date: date,
) -> None:
    """
    Aggregate raw usage logs into daily_costs for the given date.
    Called by the scheduler after each day, or on-demand for backfill.
    """
    start = datetime.combine(target_date, datetime.min.time()).replace(tzinfo=timezone.utc)
    end = start + timedelta(days=1)

    # Query aggregated data grouped by provider, endpoint, feature_tag
    stmt = (
        select(
            UsageLog.provider,
            UsageLog.endpoint,
            UsageLog.feature_tag,
            func.sum(UsageLog.request_count).label("total_requests"),
            func.sum(UsageLog.tokens_used).label("total_tokens"),
            func.sum(UsageLog.cost).label("total_cost"),
            func.avg(UsageLog.latency_ms).label("avg_latency"),
        )
        .where(
            and_(
                UsageLog.user_id == user_id,
                UsageLog.recorded_at >= start,
                UsageLog.recorded_at < end,
            )
        )
        .group_by(UsageLog.provider, UsageLog.endpoint, UsageLog.feature_tag)
    )
    result = await db.execute(stmt)
    rows = result.all()

    for row in rows:
        daily = DailyCost(
            user_id=user_id,
            provider=row.provider,
            endpoint=row.endpoint,
            feature_tag=row.feature_tag,
            date=target_date,
            total_requests=row.total_requests or 0,
            total_tokens=row.total_tokens or 0,
            total_cost=float(row.total_cost or 0),
            avg_latency_ms=float(row.avg_latency or 0),
        )
        db.add(daily)

    await db.flush()


# ─── Queries ──────────────────────────────────────────────────────

async def get_daily_costs(
    db: AsyncSession,
    user_id: UUID,
    days: int = 30,
) -> List[DailyCostPoint]:
    """Return daily cost breakdown by provider for the dashboard chart."""
    since = date.today() - timedelta(days=days)

    stmt = (
        select(
            DailyCost.date,
            DailyCost.provider,
            func.sum(DailyCost.total_cost).label("cost"),
        )
        .where(and_(DailyCost.user_id == user_id, DailyCost.date >= since))
        .group_by(DailyCost.date, DailyCost.provider)
        .order_by(DailyCost.date)
    )
    result = await db.execute(stmt)
    rows = result.all()

    # Pivot into date -> { provider: cost }
    day_map: dict[date, dict[str, float]] = {}
    for row in rows:
        d = row.date
        if d not in day_map:
            day_map[d] = {}
        day_map[d][row.provider] = float(row.cost)

    points = []
    for d in sorted(day_map.keys()):
        costs = day_map[d]
        points.append(DailyCostPoint(
            date=d,
            label=d.strftime("%b %d"),
            costs=costs,
            total=round(sum(costs.values()), 2),
        ))

    return points


async def get_endpoint_breakdown(
    db: AsyncSession,
    user_id: UUID,
    days: int = 30,
) -> List[EndpointBreakdown]:
    """Return per-endpoint cost breakdown sorted by cost descending."""
    since = date.today() - timedelta(days=days)
    prev_since = since - timedelta(days=days)

    # Current period
    stmt_curr = (
        select(
            DailyCost.endpoint,
            DailyCost.provider,
            DailyCost.feature_tag,
            func.sum(DailyCost.total_requests).label("total_requests"),
            func.sum(DailyCost.total_cost).label("total_cost"),
            func.avg(DailyCost.avg_latency_ms).label("avg_latency"),
        )
        .where(and_(DailyCost.user_id == user_id, DailyCost.date >= since))
        .group_by(DailyCost.endpoint, DailyCost.provider, DailyCost.feature_tag)
        .order_by(func.sum(DailyCost.total_cost).desc())
    )
    curr_result = await db.execute(stmt_curr)
    curr_rows = curr_result.all()

    # Previous period for comparison
    stmt_prev = (
        select(
            DailyCost.endpoint,
            DailyCost.provider,
            func.sum(DailyCost.total_cost).label("total_cost"),
        )
        .where(
            and_(
                DailyCost.user_id == user_id,
                DailyCost.date >= prev_since,
                DailyCost.date < since,
            )
        )
        .group_by(DailyCost.endpoint, DailyCost.provider)
    )
    prev_result = await db.execute(stmt_prev)
    prev_map = {(r.endpoint, r.provider): float(r.total_cost) for r in prev_result.all()}

    breakdowns = []
    for row in curr_rows:
        curr_cost = float(row.total_cost or 0)
        prev_cost = prev_map.get((row.endpoint, row.provider), 0.0)
        change = ((curr_cost - prev_cost) / prev_cost * 100) if prev_cost > 0 else 0.0

        breakdowns.append(EndpointBreakdown(
            endpoint=row.endpoint,
            provider=row.provider,
            feature_tag=row.feature_tag,
            total_requests=row.total_requests or 0,
            total_cost=round(curr_cost, 2),
            avg_latency_ms=round(float(row.avg_latency or 0), 1),
            prev_period_cost=round(prev_cost, 2),
            change_pct=round(change, 1),
        ))

    return breakdowns


async def get_total_cost_for_period(
    db: AsyncSession,
    user_id: UUID,
    start_date: date,
    end_date: date,
) -> float:
    """Sum total cost for a date range."""
    stmt = (
        select(func.coalesce(func.sum(DailyCost.total_cost), 0.0))
        .where(
            and_(
                DailyCost.user_id == user_id,
                DailyCost.date >= start_date,
                DailyCost.date <= end_date,
            )
        )
    )
    result = await db.execute(stmt)
    return float(result.scalar_one())
