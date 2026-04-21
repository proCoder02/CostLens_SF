"""
CostLens - Payment Service
Stripe integration for subscriptions. Works without Stripe key in dev mode
by using simulated payments.
"""
from datetime import datetime, timedelta, timezone
from uuid import UUID
from typing import Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User, Payment, Subscription
from app.core.config import settings

PLAN_PRICES = {
    "free": 0,
    "startup": 29,
    "business": 99,
}

STRIPE_PRICE_IDS = {
    "startup": "price_startup_monthly",
    "business": "price_business_monthly",
}


async def create_checkout(db: AsyncSession, user: User, plan: str) -> dict:
    """
    Create a Stripe Checkout session (or simulate in dev mode).
    Returns checkout URL for the frontend to redirect to.
    """
    if plan not in PLAN_PRICES or plan == "free":
        raise ValueError("Invalid plan for checkout")

    amount = PLAN_PRICES[plan]

    if settings.STRIPE_API_KEY:
        import stripe
        stripe.api_key = settings.STRIPE_API_KEY

        # Create or reuse Stripe customer
        if not user.stripe_customer_id:
            customer = stripe.Customer.create(
                email=user.email,
                name=user.full_name or user.email,
                metadata={"costlens_user_id": str(user.id)},
            )
            user.stripe_customer_id = customer.id
            await db.flush()

        session = stripe.checkout.Session.create(
            customer=user.stripe_customer_id,
            mode="subscription",
            line_items=[{
                "price": STRIPE_PRICE_IDS.get(plan, ""),
                "quantity": 1,
            }],
            success_url=f"{settings.FRONTEND_URL}/app/settings?payment=success&plan={plan}",
            cancel_url=f"{settings.FRONTEND_URL}/app/billing?payment=canceled",
            metadata={
                "costlens_user_id": str(user.id),
                "plan": plan,
            },
        )
        return {"checkout_url": session.url, "session_id": session.id}

    else:
        # Dev mode: simulate payment immediately
        payment = Payment(
            user_id=user.id,
            stripe_payment_id=f"sim_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            amount=amount,
            currency="usd",
            status="succeeded",
            plan=plan,
            description=f"CostLens {plan.title()} plan - Monthly",
            payment_method="card",
            card_last4="4242",
            card_brand="visa",
        )
        db.add(payment)

        # Update user plan
        user.plan = plan
        await db.flush()

        # Create or update subscription
        result = await db.execute(
            select(Subscription).where(Subscription.user_id == user.id)
        )
        sub = result.scalar_one_or_none()
        now = datetime.now(timezone.utc)

        if sub:
            sub.plan = plan
            sub.status = "active"
            sub.current_period_start = now
            sub.current_period_end = now + timedelta(days=30)
            sub.cancel_at_period_end = False
        else:
            sub = Subscription(
                user_id=user.id,
                plan=plan,
                status="active",
                current_period_start=now,
                current_period_end=now + timedelta(days=30),
            )
            db.add(sub)

        await db.flush()
        return {
            "checkout_url": None,
            "simulated": True,
            "payment_id": str(payment.id),
            "message": f"Dev mode: {plan.title()} plan activated. Payment simulated.",
        }


async def handle_stripe_webhook(db: AsyncSession, event: dict) -> dict:
    """Process Stripe webhook events."""
    event_type = event.get("type", "")
    data = event.get("data", {}).get("object", {})

    if event_type == "checkout.session.completed":
        user_id = data.get("metadata", {}).get("costlens_user_id")
        plan = data.get("metadata", {}).get("plan")

        if user_id and plan:
            result = await db.execute(select(User).where(User.id == UUID(user_id)))
            user = result.scalar_one_or_none()
            if user:
                user.plan = plan
                user.stripe_customer_id = data.get("customer", "")

                payment = Payment(
                    user_id=user.id,
                    stripe_payment_id=data.get("payment_intent", ""),
                    amount=float(data.get("amount_total", 0)) / 100,
                    currency=data.get("currency", "usd"),
                    status="succeeded",
                    plan=plan,
                    description=f"CostLens {plan.title()} plan",
                )
                db.add(payment)
                await db.flush()

        return {"handled": True, "event": event_type}

    elif event_type == "invoice.paid":
        customer_id = data.get("customer", "")
        result = await db.execute(
            select(User).where(User.stripe_customer_id == customer_id)
        )
        user = result.scalar_one_or_none()
        if user:
            payment = Payment(
                user_id=user.id,
                stripe_payment_id=data.get("payment_intent", ""),
                stripe_invoice_id=data.get("id", ""),
                amount=float(data.get("amount_paid", 0)) / 100,
                currency=data.get("currency", "usd"),
                status="succeeded",
                plan=user.plan,
                description="Monthly subscription renewal",
            )
            db.add(payment)
            await db.flush()
        return {"handled": True, "event": event_type}

    elif event_type == "customer.subscription.deleted":
        customer_id = data.get("customer", "")
        result = await db.execute(
            select(User).where(User.stripe_customer_id == customer_id)
        )
        user = result.scalar_one_or_none()
        if user:
            user.plan = "free"
            sub_result = await db.execute(
                select(Subscription).where(Subscription.user_id == user.id)
            )
            sub = sub_result.scalar_one_or_none()
            if sub:
                sub.status = "canceled"
            await db.flush()
        return {"handled": True, "event": event_type}

    return {"handled": False, "event": event_type}


async def cancel_subscription(db: AsyncSession, user: User) -> dict:
    """Cancel user's subscription."""
    if settings.STRIPE_API_KEY and user.stripe_customer_id:
        import stripe
        stripe.api_key = settings.STRIPE_API_KEY
        # Cancel at period end via Stripe
        result = await db.execute(
            select(Subscription).where(Subscription.user_id == user.id)
        )
        sub = result.scalar_one_or_none()
        if sub and sub.stripe_subscription_id:
            stripe.Subscription.modify(
                sub.stripe_subscription_id,
                cancel_at_period_end=True,
            )
            sub.cancel_at_period_end = True
            await db.flush()
            return {"status": "will_cancel_at_period_end"}

    # Dev mode or no Stripe
    user.plan = "free"
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == user.id)
    )
    sub = result.scalar_one_or_none()
    if sub:
        sub.status = "canceled"
        sub.cancel_at_period_end = False
    await db.flush()
    return {"status": "canceled", "plan": "free"}


async def get_user_payments(db: AsyncSession, user_id: UUID) -> list:
    """Get payment history for a user."""
    result = await db.execute(
        select(Payment)
        .where(Payment.user_id == user_id)
        .order_by(Payment.created_at.desc())
        .limit(50)
    )
    return list(result.scalars().all())


async def get_user_subscription(db: AsyncSession, user_id: UUID) -> Optional[Subscription]:
    """Get active subscription for a user."""
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == user_id)
    )
    return result.scalar_one_or_none()
