"""
CostLens - Admin Service
Full SaaS owner toolkit: metrics, user management, config, audit log.
"""
import json
from datetime import date, datetime, timedelta, timezone
from uuid import UUID
from typing import Optional

from sqlalchemy import select, func, and_, or_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User, Payment, Subscription, SaaSConfig, AuditLog


async def get_admin_stats(db: AsyncSession) -> dict:
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    prev_month_start = (month_start - timedelta(days=1)).replace(day=1)

    total_users = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    active_users = (await db.execute(
        select(func.count()).select_from(User).where(User.is_active == True)
    )).scalar_one()
    new_users_month = (await db.execute(
        select(func.count()).select_from(User).where(User.created_at >= month_start)
    )).scalar_one()
    new_users_prev = (await db.execute(
        select(func.count()).select_from(User).where(
            and_(User.created_at >= prev_month_start, User.created_at < month_start)
        )
    )).scalar_one()

    plan_dist = (await db.execute(
        select(User.plan, func.count().label("count")).group_by(User.plan).order_by(func.count().desc())
    )).all()

    mrr = float((await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0.0))
        .where(and_(Payment.status == "succeeded", Payment.created_at >= month_start))
    )).scalar_one())
    prev_mrr = float((await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0.0))
        .where(and_(Payment.status == "succeeded", Payment.created_at >= prev_month_start, Payment.created_at < month_start))
    )).scalar_one())
    total_revenue = float((await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0.0)).where(Payment.status == "succeeded")
    )).scalar_one())
    payments_month = (await db.execute(
        select(func.count()).select_from(Payment).where(and_(Payment.status == "succeeded", Payment.created_at >= month_start))
    )).scalar_one()
    failed_payments = (await db.execute(
        select(func.count()).select_from(Payment).where(and_(Payment.status == "failed", Payment.created_at >= month_start))
    )).scalar_one()
    active_subs = (await db.execute(
        select(func.count()).select_from(Subscription).where(Subscription.status == "active")
    )).scalar_one()
    churned = (await db.execute(
        select(func.count()).select_from(Subscription).where(and_(Subscription.status == "canceled", Subscription.updated_at >= month_start))
    )).scalar_one()

    return {
        "total_users": total_users,
        "active_users": active_users,
        "new_users_this_month": new_users_month,
        "new_users_prev_month": new_users_prev,
        "user_growth_pct": round(((new_users_month - new_users_prev) / max(new_users_prev, 1)) * 100, 1),
        "plan_distribution": [{"plan": p, "count": c} for p, c in plan_dist],
        "mrr": round(mrr, 2),
        "prev_mrr": round(prev_mrr, 2),
        "mrr_growth_pct": round(((mrr - prev_mrr) / max(prev_mrr, 1)) * 100, 1),
        "arr": round(mrr * 12, 2),
        "total_revenue": round(total_revenue, 2),
        "payments_this_month": payments_month,
        "failed_payments_this_month": failed_payments,
        "active_subscriptions": active_subs,
        "churned_this_month": churned,
        "churn_rate_pct": round((churned / max(active_subs + churned, 1)) * 100, 1),
    }


async def get_revenue_chart(db: AsyncSession, days: int = 30) -> list:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    stmt = (
        select(func.date(Payment.created_at).label("date"), func.sum(Payment.amount).label("revenue"), func.count().label("count"))
        .where(and_(Payment.status == "succeeded", Payment.created_at >= since))
        .group_by(func.date(Payment.created_at)).order_by(func.date(Payment.created_at))
    )
    result = await db.execute(stmt)
    return [{"date": str(r.date), "revenue": round(float(r.revenue), 2), "count": r.count} for r in result.all()]


async def get_all_users(db: AsyncSession, skip=0, limit=50, search="", plan_filter=""):
    stmt = select(User).order_by(User.created_at.desc())
    if search:
        stmt = stmt.where(or_(
            User.email.ilike(f"%{search}%"), User.full_name.ilike(f"%{search}%"), User.company_name.ilike(f"%{search}%")
        ))
    if plan_filter:
        stmt = stmt.where(User.plan == plan_filter)
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    result = await db.execute(stmt.offset(skip).limit(limit))
    return result.scalars().all(), total


async def get_user_detail(db: AsyncSession, user_id: UUID) -> dict:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return None

    sub_result = await db.execute(select(Subscription).where(Subscription.user_id == user_id))
    sub = sub_result.scalar_one_or_none()

    pay_result = await db.execute(
        select(Payment).where(Payment.user_id == user_id).order_by(Payment.created_at.desc()).limit(10)
    )
    payments = pay_result.scalars().all()
    total_paid = float((await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0.0)).where(and_(Payment.user_id == user_id, Payment.status == "succeeded"))
    )).scalar_one())

    return {
        "id": str(user.id), "email": user.email, "full_name": user.full_name,
        "company_name": user.company_name, "plan": user.plan, "is_active": user.is_active,
        "is_admin": user.is_admin, "onboarded": user.onboarded, "notes": user.notes,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "subscription": {
            "plan": sub.plan, "status": sub.status,
            "period_end": sub.current_period_end.isoformat() if sub and sub.current_period_end else None,
            "cancel_at_period_end": sub.cancel_at_period_end if sub else False,
        } if sub else None,
        "total_paid": round(total_paid, 2),
        "payment_count": len(payments),
        "recent_payments": [
            {"id": str(p.id), "amount": p.amount, "status": p.status, "plan": p.plan,
             "created_at": p.created_at.isoformat() if p.created_at else None}
            for p in payments
        ],
    }


async def get_all_payments(db: AsyncSession, skip=0, limit=50, status_filter=""):
    stmt = (
        select(Payment, User.email, User.full_name, User.company_name)
        .join(User, Payment.user_id == User.id).order_by(Payment.created_at.desc())
    )
    if status_filter:
        stmt = stmt.where(Payment.status == status_filter)
    count_q = select(func.count()).select_from(Payment)
    if status_filter:
        count_q = count_q.where(Payment.status == status_filter)
    total = (await db.execute(count_q)).scalar_one()
    result = await db.execute(stmt.offset(skip).limit(limit))
    return result.all(), total


async def update_user_plan(db: AsyncSession, user_id: UUID, plan: str):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return None
    user.plan = plan
    await db.flush()
    return user


async def toggle_user_active(db: AsyncSession, user_id: UUID):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return None
    user.is_active = not user.is_active
    await db.flush()
    return user


async def update_user_notes(db: AsyncSession, user_id: UUID, notes: str):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user:
        user.notes = notes
        await db.flush()
    return user


async def refund_payment(db: AsyncSession, payment_id: UUID):
    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()
    if not payment or payment.status != "succeeded":
        return None
    payment.status = "refunded"
    payment.refunded_at = datetime.now(timezone.utc)
    await db.flush()
    return payment


# ── SaaS Config ───────────────────────────────────────────────
async def get_saas_config(db: AsyncSession) -> SaaSConfig:
    result = await db.execute(select(SaaSConfig).where(SaaSConfig.id == 1))
    config = result.scalar_one_or_none()
    if not config:
        config = SaaSConfig(id=1)
        db.add(config)
        await db.flush()
    return config


async def update_saas_config(db: AsyncSession, data: dict) -> SaaSConfig:
    config = await get_saas_config(db)
    for key, value in data.items():
        if hasattr(config, key) and key != "id":
            setattr(config, key, value)
    await db.flush()
    return config


# ── Audit Log ─────────────────────────────────────────────────
async def log_action(db: AsyncSession, admin_id: UUID, action: str, target_type="", target_id="", details="", ip=""):
    entry = AuditLog(admin_id=admin_id, action=action, target_type=target_type, target_id=str(target_id), details=details, ip_address=ip)
    db.add(entry)
    await db.flush()
    return entry


async def get_audit_logs(db: AsyncSession, limit=50):
    stmt = (
        select(AuditLog, User.email)
        .join(User, AuditLog.admin_id == User.id)
        .order_by(AuditLog.created_at.desc()).limit(limit)
    )
    result = await db.execute(stmt)
    return [
        {"id": str(a.id), "admin_email": email, "action": a.action,
         "target_type": a.target_type, "target_id": a.target_id,
         "details": a.details, "created_at": a.created_at.isoformat()}
        for a, email in result.all()
    ]
