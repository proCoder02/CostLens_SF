"""
CostLens – Usage Routes
POST /usage/ingest       – batch ingest usage records
POST /usage/webhook      – provider webhook receiver
GET  /usage/endpoints    – per-endpoint cost breakdown
"""

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import User
from app.schemas import UsageBatchCreate, UsageLogCreate, UsageLogOut, EndpointBreakdown
from app.services.usage_service import ingest_usage, get_endpoint_breakdown
from app.api.deps import get_current_user

router = APIRouter(prefix="/usage", tags=["Usage"])


@router.post("/ingest", status_code=201)
async def batch_ingest(
    payload: UsageBatchCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Ingest a batch of usage records from the client SDK or proxy middleware.

    Example request body:
    {
        "records": [
            {
                "provider": "openai",
                "endpoint": "/v1/chat/completions",
                "feature_tag": "ai-chat",
                "request_count": 1,
                "tokens_used": 1523,
                "cost": 0.042,
                "latency_ms": 890,
                "status_code": 200
            }
        ]
    }
    """
    count = await ingest_usage(db, current_user.id, payload.records)
    return {"ingested": count, "total_submitted": len(payload.records)}


@router.post("/webhook/{provider}", status_code=200)
async def provider_webhook(
    provider: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Receive webhooks from providers. Each provider sends a different format,
    so we normalize them into UsageLogCreate records.

    Currently supported: openai, stripe
    """
    body = await request.json()

    records = []

    if provider == "stripe":
        # Stripe sends event objects
        event_type = body.get("type", "unknown")
        records.append(UsageLogCreate(
            provider="stripe",
            endpoint=f"/v1/{event_type.replace('.', '/')}",
            feature_tag=event_type.split(".")[0],
            request_count=1,
            cost=0.0,
        ))

    elif provider == "openai":
        # Custom webhook from OpenAI usage proxy
        records.append(UsageLogCreate(
            provider="openai",
            endpoint=body.get("endpoint", "/v1/unknown"),
            feature_tag=body.get("feature_tag", "untagged"),
            request_count=1,
            tokens_used=body.get("tokens_used", 0),
            cost=body.get("cost", 0.0),
            latency_ms=body.get("latency_ms", 0),
            status_code=body.get("status_code", 200),
        ))

    else:
        # Generic webhook – pass through as-is
        records.append(UsageLogCreate(
            provider=provider,
            endpoint=body.get("endpoint", f"/{provider}/webhook"),
            feature_tag=body.get("feature_tag", "webhook"),
            request_count=body.get("request_count", 1),
            cost=body.get("cost", 0.0),
        ))

    count = await ingest_usage(db, current_user.id, records)
    return {"status": "ok", "ingested": count}


@router.get("/endpoints", response_model=list[EndpointBreakdown])
async def list_endpoints(
    days: int = Query(default=30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all endpoints sorted by cost (descending)."""
    return await get_endpoint_breakdown(db, current_user.id, days)
