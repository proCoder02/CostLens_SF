"""
CostLens - Payment Routes
Stripe checkout, webhook, billing history, subscription management.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import User
from app.api.deps import get_current_user
from app.services.payment_service import (
    create_checkout, handle_stripe_webhook, cancel_subscription,
    get_user_payments, get_user_subscription, PLAN_PRICES,
)

router = APIRouter(prefix="/billing", tags=["Billing"])


@router.get("/plans")
async def list_plans():
    """Return available plans and pricing."""
    return {
        "plans": [
            {
                "id": "free",
                "name": "Free",
                "price": 0,
                "interval": "month",
                "features": ["1 API connection", "Basic tracking", "7-day history"],
            },
            {
                "id": "startup",
                "name": "Startup",
                "price": 29,
                "interval": "month",
                "features": [
                    "Unlimited APIs", "Spike alerts", "Smart insights",
                    "90-day history", "3 team seats", "Email notifications",
                ],
            },
            {
                "id": "business",
                "name": "Business",
                "price": 99,
                "interval": "month",
                "features": [
                    "Everything in Startup", "Advanced breakdown", "Custom tags",
                    "Unlimited seats", "API access", "Slack integration", "Priority support",
                ],
            },
        ]
    }


@router.post("/checkout")
async def checkout(
    plan: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a checkout session for plan upgrade.
    In dev mode (no Stripe key): simulates payment and activates plan immediately.
    In production: returns a Stripe Checkout URL to redirect to.
    """
    if plan not in PLAN_PRICES or plan == "free":
        raise HTTPException(status_code=400, detail="Invalid plan. Use 'startup' or 'business'.")

    if current_user.plan == plan:
        raise HTTPException(status_code=400, detail=f"You're already on the {plan} plan.")

    try:
        result = await create_checkout(db, current_user, plan)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cancel")
async def cancel(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel subscription and downgrade to free."""
    if current_user.plan == "free":
        raise HTTPException(status_code=400, detail="You're already on the free plan.")

    result = await cancel_subscription(db, current_user)
    return result


@router.get("/history")
async def payment_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's payment history."""
    payments = await get_user_payments(db, current_user.id)
    return {
        "payments": [
            {
                "id": str(p.id),
                "amount": p.amount,
                "currency": p.currency,
                "status": p.status,
                "plan": p.plan,
                "description": p.description,
                "payment_method": p.payment_method,
                "card_last4": p.card_last4,
                "card_brand": p.card_brand,
                "receipt_url": p.receipt_url,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in payments
        ]
    }


@router.get("/subscription")
async def subscription_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current subscription details."""
    sub = await get_user_subscription(db, current_user.id)
    if not sub:
        return {
            "plan": current_user.plan,
            "status": "active" if current_user.plan != "free" else "none",
            "has_subscription": False,
        }

    return {
        "plan": sub.plan,
        "status": sub.status,
        "has_subscription": True,
        "current_period_start": sub.current_period_start.isoformat() if sub.current_period_start else None,
        "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
        "cancel_at_period_end": sub.cancel_at_period_end,
    }


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Stripe webhook endpoint. No auth required (verified by Stripe signature)."""
    body = await request.json()
    result = await handle_stripe_webhook(db, body)
    return result
