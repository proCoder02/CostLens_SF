"""
CostLens – Insights Service
Analyzes usage patterns and generates optimization recommendations.
"""

from datetime import date, timedelta
from uuid import UUID
from typing import List

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import DailyCost, UsageLog
from app.schemas import Insight


async def generate_insights(
    db: AsyncSession,
    user_id: UUID,
    days: int = 30,
) -> List[Insight]:
    """
    Analyze usage data and return actionable insights sorted by priority.
    """
    since = date.today() - timedelta(days=days)
    insights: List[Insight] = []

    # ── 1. Biggest Cost Driver ────────────────────────────────────
    stmt = (
        select(
            DailyCost.endpoint,
            DailyCost.provider,
            func.sum(DailyCost.total_cost).label("cost"),
            func.sum(DailyCost.total_requests).label("requests"),
        )
        .where(and_(DailyCost.user_id == user_id, DailyCost.date >= since))
        .group_by(DailyCost.endpoint, DailyCost.provider)
        .order_by(func.sum(DailyCost.total_cost).desc())
        .limit(5)
    )
    result = await db.execute(stmt)
    top_endpoints = result.all()

    if top_endpoints:
        total_cost_stmt = (
            select(func.coalesce(func.sum(DailyCost.total_cost), 0.0))
            .where(and_(DailyCost.user_id == user_id, DailyCost.date >= since))
        )
        total_cost = float((await db.execute(total_cost_stmt)).scalar_one())

        top = top_endpoints[0]
        top_cost = float(top.cost)
        pct = (top_cost / total_cost * 100) if total_cost > 0 else 0

        if pct > 30:
            monthly_savings = top_cost * 0.35  # estimate 35% cacheable
            insights.append(Insight(
                icon="🔥",
                title="Biggest Cost Driver",
                detail=(
                    f"{top.endpoint} ({top.provider}) accounts for {pct:.0f}% "
                    f"of total spend (${top_cost:.2f} over {days}d). "
                    f"High-volume endpoints benefit most from caching."
                ),
                action="Add response caching",
                estimated_savings=f"${monthly_savings:.0f}/mo",
                priority=1,
            ))

    # ── 2. Duplicate Request Detection ────────────────────────────
    # Check endpoints with high request counts but low unique patterns
    # (simplified heuristic: endpoints with > 1000 req/day average)
    stmt_high_vol = (
        select(
            DailyCost.endpoint,
            DailyCost.provider,
            func.avg(DailyCost.total_requests).label("avg_daily_requests"),
            func.sum(DailyCost.total_cost).label("total_cost"),
        )
        .where(and_(DailyCost.user_id == user_id, DailyCost.date >= since))
        .group_by(DailyCost.endpoint, DailyCost.provider)
        .having(func.avg(DailyCost.total_requests) > 500)
        .order_by(func.avg(DailyCost.total_requests).desc())
    )
    result = await db.execute(stmt_high_vol)
    high_vol = result.all()

    if high_vol:
        ep = high_vol[0]
        est_dup_rate = 0.65  # typical duplicate rate for embedding endpoints
        savings = float(ep.total_cost) * est_dup_rate / (days / 30)
        insights.append(Insight(
            icon="♻️",
            title="Duplicate Request Reduction",
            detail=(
                f"{ep.endpoint} averages {int(ep.avg_daily_requests)} calls/day. "
                f"High-volume endpoints often have 50-70% duplicate inputs. "
                f"A semantic cache can eliminate redundant API calls."
            ),
            action="Enable semantic cache",
            estimated_savings=f"${savings:.0f}/mo",
            priority=2,
        ))

    # ── 3. Batch Opportunity ──────────────────────────────────────
    # Look for endpoints with many small requests (low tokens per request)
    stmt_small = (
        select(
            DailyCost.endpoint,
            DailyCost.provider,
            func.sum(DailyCost.total_requests).label("total_requests"),
            func.sum(DailyCost.total_cost).label("total_cost"),
            (func.sum(DailyCost.total_tokens) / func.nullif(func.sum(DailyCost.total_requests), 0)).label("tokens_per_req"),
        )
        .where(and_(DailyCost.user_id == user_id, DailyCost.date >= since))
        .group_by(DailyCost.endpoint, DailyCost.provider)
        .having(func.sum(DailyCost.total_requests) > 1000)
        .order_by(func.sum(DailyCost.total_requests).desc())
    )
    result = await db.execute(stmt_small)
    small_reqs = result.all()

    for ep in small_reqs:
        tpr = float(ep.tokens_per_req or 0)
        if 0 < tpr < 100:  # low tokens per request = likely batchable
            savings = float(ep.total_cost) * 0.4 / (days / 30)
            insights.append(Insight(
                icon="📦",
                title="Batch Opportunity",
                detail=(
                    f"{ep.endpoint} has {int(ep.total_requests)} requests with only "
                    f"~{int(tpr)} tokens each. Batching 10+ items per request can "
                    f"significantly reduce per-call overhead."
                ),
                action="Implement request batching",
                estimated_savings=f"${savings:.0f}/mo",
                priority=3,
            ))
            break  # only show top 1

    # ── 4. Latency Optimization ───────────────────────────────────
    stmt_slow = (
        select(
            DailyCost.endpoint,
            DailyCost.provider,
            func.avg(DailyCost.avg_latency_ms).label("avg_latency"),
            func.sum(DailyCost.total_cost).label("total_cost"),
        )
        .where(and_(DailyCost.user_id == user_id, DailyCost.date >= since))
        .group_by(DailyCost.endpoint, DailyCost.provider)
        .having(func.avg(DailyCost.avg_latency_ms) > 2000)
        .order_by(func.avg(DailyCost.avg_latency_ms).desc())
        .limit(1)
    )
    result = await db.execute(stmt_slow)
    slow_ep = result.first()

    if slow_ep:
        insights.append(Insight(
            icon="⏱️",
            title="High Latency Endpoint",
            detail=(
                f"{slow_ep.endpoint} averages {int(slow_ep.avg_latency)}ms per call. "
                f"Consider switching to a faster model tier, adding a CDN, or "
                f"pre-computing responses for common inputs."
            ),
            action="Optimize or downgrade model",
            estimated_savings=f"${float(slow_ep.total_cost) * 0.3 / (days / 30):.0f}/mo",
            priority=4,
        ))

    # ── 5. Unused / Low-Traffic Endpoints ─────────────────────────
    stmt_low = (
        select(
            DailyCost.endpoint,
            DailyCost.provider,
            func.sum(DailyCost.total_requests).label("total_requests"),
            func.sum(DailyCost.total_cost).label("total_cost"),
        )
        .where(and_(DailyCost.user_id == user_id, DailyCost.date >= since))
        .group_by(DailyCost.endpoint, DailyCost.provider)
        .having(func.sum(DailyCost.total_requests) < 10)
        .order_by(func.sum(DailyCost.total_cost).desc())
    )
    result = await db.execute(stmt_low)
    low_traffic = result.all()

    if low_traffic:
        total_waste = sum(float(ep.total_cost) for ep in low_traffic)
        if total_waste > 1:
            insights.append(Insight(
                icon="🧹",
                title="Low-Traffic Endpoints",
                detail=(
                    f"{len(low_traffic)} endpoints have fewer than 10 calls in {days} days "
                    f"but still incur ${total_waste:.2f} in costs. These may be leftover "
                    f"from deprecated features."
                ),
                action="Audit and remove unused endpoints",
                estimated_savings=f"${total_waste / (days / 30):.0f}/mo",
                priority=5,
            ))

    return sorted(insights, key=lambda i: i.priority)
