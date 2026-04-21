"""
CostLens - Admin Routes
Full SaaS owner panel: stats, users, payments, config, audit log.
All routes require is_admin=True.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import User
from app.api.deps import get_current_user
from app.services.admin_service import (
    get_admin_stats, get_revenue_chart, get_all_users, get_user_detail,
    get_all_payments, update_user_plan, toggle_user_active, update_user_notes,
    refund_payment, get_saas_config, update_saas_config, log_action, get_audit_logs,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ── Overview ──────────────────────────────────────────────────
@router.get("/stats")
async def admin_stats(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    return await get_admin_stats(db)


@router.get("/revenue-chart")
async def revenue_chart(days: int = Query(default=30, ge=7, le=365), admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    return await get_revenue_chart(db, days)


# ── Users ─────────────────────────────────────────────────────
@router.get("/users")
async def list_users(
    skip: int = Query(default=0, ge=0), limit: int = Query(default=50, ge=1, le=200),
    search: str = Query(default=""), plan: str = Query(default=""),
    admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db),
):
    users, total = await get_all_users(db, skip, limit, search, plan)
    return {
        "users": [
            {"id": str(u.id), "email": u.email, "full_name": u.full_name,
             "company_name": u.company_name, "plan": u.plan, "is_active": u.is_active,
             "is_admin": u.is_admin, "onboarded": u.onboarded, "notes": u.notes or "",
             "created_at": u.created_at.isoformat() if u.created_at else None}
            for u in users
        ],
        "total": total, "skip": skip, "limit": limit,
    }


@router.get("/users/{user_id}")
async def user_detail(user_id: UUID, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    detail = await get_user_detail(db, user_id)
    if not detail:
        raise HTTPException(status_code=404, detail="User not found")
    return detail


@router.patch("/users/{user_id}/plan")
async def change_plan(
    user_id: UUID, plan: str = Query(..., pattern="^(free|startup|business)$"),
    request: Request = None, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db),
):
    user = await update_user_plan(db, user_id, plan)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await log_action(db, admin.id, "user.plan_changed", "user", user_id, f"Plan set to {plan}", request.client.host if request else "")
    return {"user_id": str(user.id), "plan": user.plan}


@router.patch("/users/{user_id}/toggle-active")
async def toggle_active(user_id: UUID, request: Request = None, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    user = await toggle_user_active(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    action = "user.activated" if user.is_active else "user.deactivated"
    await log_action(db, admin.id, action, "user", user_id, "", request.client.host if request else "")
    return {"user_id": str(user.id), "is_active": user.is_active}


@router.patch("/users/{user_id}/notes")
async def update_notes(user_id: UUID, notes: str = "", admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    user = await update_user_notes(db, user_id, notes)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"user_id": str(user.id), "notes": user.notes}


# ── Payments ──────────────────────────────────────────────────
@router.get("/payments")
async def list_payments(
    skip: int = Query(default=0, ge=0), limit: int = Query(default=50, ge=1, le=200),
    status: str = Query(default=""),
    admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db),
):
    rows, total = await get_all_payments(db, skip, limit, status)
    return {
        "payments": [
            {"id": str(p.id), "user_email": email, "user_name": name, "company": company,
             "amount": p.amount, "currency": p.currency, "status": p.status, "plan": p.plan,
             "payment_method": p.payment_method, "card_last4": p.card_last4, "card_brand": p.card_brand,
             "description": p.description, "receipt_url": p.receipt_url,
             "created_at": p.created_at.isoformat() if p.created_at else None}
            for p, email, name, company in rows
        ],
        "total": total,
    }


@router.post("/payments/{payment_id}/refund")
async def refund(payment_id: UUID, request: Request = None, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    payment = await refund_payment(db, payment_id)
    if not payment:
        raise HTTPException(status_code=400, detail="Payment not found or not refundable")
    await log_action(db, admin.id, "payment.refunded", "payment", payment_id, f"${payment.amount}", request.client.host if request else "")
    return {"payment_id": str(payment.id), "status": "refunded", "amount": payment.amount}


# ── SaaS Config ──────────────────────────────────────────────
@router.get("/config")
async def get_config(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    config = await get_saas_config(db)
    return {c.key: getattr(config, c.key) for c in config.__table__.columns if c.key != "id"}


@router.patch("/config")
async def update_config(request: Request, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    data = await request.json()
    config = await update_saas_config(db, data)
    await log_action(db, admin.id, "config.updated", "config", "1", str(list(data.keys())), request.client.host if request else "")
    return {c.key: getattr(config, c.key) for c in config.__table__.columns if c.key != "id"}


# ── Audit Log ────────────────────────────────────────────────
@router.get("/audit-log")
async def audit_log(limit: int = Query(default=50, ge=1, le=200), admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    return await get_audit_logs(db, limit)
