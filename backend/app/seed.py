"""
CostLens – Database Seeder
Populates the database with realistic demo data for development.

Run with:
    python -m app.seed
"""

import asyncio
import random
from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

from app.db.session import async_session_factory, init_db
from app.models import (
    User, APIConnection, UsageLog, DailyCost, Alert, Budget, AlertSetting,
)
from app.core.security import hash_password


# ── Configuration ─────────────────────────────────────────────────

DEMO_USER = {
    "email": "demoo@costlens.io",
    "password": "demodemo123",
    "full_name": "Alex Chen",
    "plan": "startup",
}

PROVIDERS = [
    {"provider": "openai",  "display_name": "OpenAI",  "budget": 500},
    {"provider": "aws",     "display_name": "AWS",     "budget": 800},
    {"provider": "stripe",  "display_name": "Stripe",  "budget": 200},
    {"provider": "twilio",  "display_name": "Twilio",  "budget": 150},
]

ENDPOINTS = [
    {"endpoint": "/v1/chat/completions",   "provider": "openai",  "tag": "AI Chat",        "avg_cost": 0.042,   "avg_tokens": 1500,  "avg_latency": 1200},
    {"endpoint": "/v1/embeddings",         "provider": "openai",  "tag": "Search",         "avg_cost": 0.0004,  "avg_tokens": 200,   "avg_latency": 150},
    {"endpoint": "/v1/images/generations", "provider": "openai",  "tag": "Image Gen",      "avg_cost": 0.08,    "avg_tokens": 0,     "avg_latency": 3500},
    {"endpoint": "/s3/put-object",         "provider": "aws",     "tag": "File Upload",    "avg_cost": 0.00001, "avg_tokens": 0,     "avg_latency": 80},
    {"endpoint": "/lambda/invoke",         "provider": "aws",     "tag": "Processing",     "avg_cost": 0.00002, "avg_tokens": 0,     "avg_latency": 200},
    {"endpoint": "/ses/send-email",        "provider": "aws",     "tag": "Notifications",  "avg_cost": 0.0001,  "avg_tokens": 0,     "avg_latency": 300},
    {"endpoint": "/v1/charges",            "provider": "stripe",  "tag": "Payments",       "avg_cost": 0.0,     "avg_tokens": 0,     "avg_latency": 400},
    {"endpoint": "/v1/customers",          "provider": "stripe",  "tag": "User Mgmt",      "avg_cost": 0.0,     "avg_tokens": 0,     "avg_latency": 250},
    {"endpoint": "/messages",              "provider": "twilio",  "tag": "SMS Alerts",     "avg_cost": 0.0079,  "avg_tokens": 0,     "avg_latency": 500},
]

ALERTS_SEED = [
    {"alert_type": "spike",        "severity": "critical", "title": "Spend Spike",     "message": "OpenAI spend surged 180% on Apr 14 — /v1/chat/completions received 3× normal traffic"},
    {"alert_type": "budget",       "severity": "warning",  "title": "Budget Warning",  "message": "AWS is at 87% of monthly budget ($696 / $800) with 13 days remaining"},
    {"alert_type": "anomaly",      "severity": "info",     "title": "Traffic Anomaly", "message": "Twilio SMS volume dropped 45% — verify your notification pipeline is healthy"},
    {"alert_type": "optimization", "severity": "success",  "title": "Cache Opportunity","message": "Caching /v1/embeddings could save ~$42/mo — 68% of queries are duplicates"},
    {"alert_type": "spike",        "severity": "warning",  "title": "API Spike",       "message": "Stripe API calls up 60% — new checkout flow may be retrying failed charges"},
    {"alert_type": "optimization", "severity": "success",  "title": "Batch Opportunity","message": "Batching /lambda/invoke calls could reduce invocations by 40%, saving ~$18/mo"},
]


async def seed():
    """Seed the database with demo data."""
    await init_db()

    async with async_session_factory() as db:
        # ── 1. Create demo user ──────────────────────────────────
        user = User(
            email=DEMO_USER["email"],
            hashed_password=hash_password(DEMO_USER["password"]),
            full_name=DEMO_USER["full_name"],
            plan=DEMO_USER["plan"],
        )
        db.add(user)
        await db.flush()
        print(f"✓ Created user: {user.email} (id: {user.id})")

        # ── 2. Alert settings ────────────────────────────────────
        alert_setting = AlertSetting(user_id=user.id)
        db.add(alert_setting)

        # ── 3. API connections ───────────────────────────────────
        connections = {}
        for p in PROVIDERS:
            conn = APIConnection(
                user_id=user.id,
                provider=p["provider"],
                display_name=p["display_name"],
                api_key_encrypted="sk-demo-key-not-real",
                is_active=True,
            )
            db.add(conn)
            await db.flush()
            connections[p["provider"]] = conn.id
        print(f"✓ Created {len(connections)} API connections")

        # ── 4. Budgets ───────────────────────────────────────────
        total_budget = 0
        for p in PROVIDERS:
            budget = Budget(
                user_id=user.id,
                provider=p["provider"],
                monthly_limit=p["budget"],
            )
            db.add(budget)
            total_budget += p["budget"]

        # Overall budget
        db.add(Budget(user_id=user.id, provider="*", monthly_limit=total_budget))
        print(f"✓ Created budgets (total: ${total_budget})")

        # ── 5. Daily cost data (30 days) ─────────────────────────
        today = date.today()
        daily_count = 0

        for day_offset in range(30):
            d = today - timedelta(days=29 - day_offset)
            day_of_week = d.weekday()
            is_weekend = day_of_week >= 5
            base_mult = 0.6 if is_weekend else 1.0
            spike = 2.8 if day_offset == 26 else (1.6 if day_offset == 22 else 1.0)
            trend = 1 + day_offset * 0.008

            for ep in ENDPOINTS:
                calls = int(random.gauss(5000, 2000) * base_mult * spike)
                calls = max(calls, 50)
                cost = calls * ep["avg_cost"] * trend * random.uniform(0.7, 1.3)
                tokens = calls * ep["avg_tokens"] if ep["avg_tokens"] > 0 else 0
                latency = ep["avg_latency"] * random.uniform(0.8, 1.2)

                daily = DailyCost(
                    user_id=user.id,
                    provider=ep["provider"],
                    endpoint=ep["endpoint"],
                    feature_tag=ep["tag"],
                    date=d,
                    total_requests=calls,
                    total_tokens=tokens,
                    total_cost=round(cost, 4),
                    avg_latency_ms=round(latency, 1),
                )
                db.add(daily)
                daily_count += 1

        print(f"✓ Created {daily_count} daily cost records (30 days × {len(ENDPOINTS)} endpoints)")

        # ── 6. Alerts ────────────────────────────────────────────
        for i, a in enumerate(ALERTS_SEED):
            alert = Alert(
                user_id=user.id,
                alert_type=a["alert_type"],
                severity=a["severity"],
                title=a["title"],
                message=a["message"],
                is_read=i >= 2,  # first 2 unread
                created_at=datetime.now(timezone.utc) - timedelta(hours=i * 12),
            )
            db.add(alert)
        print(f"✓ Created {len(ALERTS_SEED)} alerts")

        await db.commit()

    print("\n🎉 Seed complete!")
    print(f"   Login: {DEMO_USER['email']} / {DEMO_USER['password']}")
    print(f"   API docs: http://localhost:8000/docs")


if __name__ == "__main__":
    asyncio.run(seed())
