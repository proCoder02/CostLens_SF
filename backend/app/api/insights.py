"""
CostLens – Insights Route
GET /insights – returns optimization recommendations with estimated savings.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import User
from app.schemas import Insight
from app.services.insights_service import generate_insights
from app.api.deps import get_current_user

router = APIRouter(prefix="/insights", tags=["Insights"])


@router.get("/", response_model=list[Insight])
async def list_insights(
    days: int = Query(default=30, ge=7, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Analyze the user's usage data and return actionable optimization insights.
    Each insight includes an estimated monthly savings figure.
    """
    return await generate_insights(db, current_user.id, days)


@router.get("/summary")
async def insights_summary(
    days: int = Query(default=30, ge=7, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return a high-level summary: total potential savings and insight count."""
    insights = await generate_insights(db, current_user.id, days)

    total_savings = 0.0
    for ins in insights:
        # Parse "$42/mo" style strings
        try:
            val = ins.estimated_savings.replace("$", "").replace("/mo", "").strip()
            total_savings += float(val)
        except ValueError:
            pass

    return {
        "insight_count": len(insights),
        "total_potential_savings": f"${total_savings:.0f}/mo",
        "top_action": insights[0].action if insights else None,
    }
