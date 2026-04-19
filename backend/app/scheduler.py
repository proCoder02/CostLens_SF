"""
CostLens – Background Scheduler
Runs periodic tasks: provider polling, daily aggregation, and alert checks.
Uses APScheduler for in-process scheduling. Swap with Celery Beat for production.
"""

import logging
from datetime import date, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select

from app.db.session import async_session_factory
from app.models import User, APIConnection
from app.services.provider_service import poll_provider
from app.services.usage_service import ingest_usage, aggregate_daily_costs
from app.services.alert_service import check_spend_spike, check_budget_warnings

logger = logging.getLogger("costlens.scheduler")
scheduler = AsyncIOScheduler()


async def poll_all_providers():
    """
    Poll every active API connection for new usage data.
    Runs every 15 minutes.
    """
    logger.info("Starting provider polling cycle")
    async with async_session_factory() as db:
        result = await db.execute(
            select(APIConnection).where(APIConnection.is_active == True)
        )
        connections = result.scalars().all()

        for conn in connections:
            try:
                since = date.today() - timedelta(days=1)
                records = await poll_provider(
                    provider=conn.provider,
                    api_key=conn.api_key_encrypted,  # decrypt in production
                    since=since,
                )
                if records:
                    count = await ingest_usage(db, conn.user_id, records)
                    logger.info(
                        f"Polled {conn.provider} for user {conn.user_id}: {count} records"
                    )
            except Exception as e:
                logger.error(f"Error polling {conn.provider}: {e}")

        await db.commit()
    logger.info("Provider polling cycle complete")


async def run_daily_aggregation():
    """
    Aggregate yesterday's raw usage logs into daily_costs.
    Runs at 00:15 UTC daily.
    """
    logger.info("Starting daily aggregation")
    yesterday = date.today() - timedelta(days=1)

    async with async_session_factory() as db:
        result = await db.execute(select(User.id).where(User.is_active == True))
        user_ids = result.scalars().all()

        for user_id in user_ids:
            try:
                await aggregate_daily_costs(db, user_id, yesterday)
            except Exception as e:
                logger.error(f"Aggregation error for user {user_id}: {e}")

        await db.commit()
    logger.info(f"Daily aggregation complete for {len(user_ids)} users")


async def run_alert_checks():
    """
    Evaluate spike detection and budget warnings for all users.
    Runs every hour.
    """
    logger.info("Starting alert checks")
    async with async_session_factory() as db:
        result = await db.execute(select(User.id).where(User.is_active == True))
        user_ids = result.scalars().all()

        total_alerts = 0
        for user_id in user_ids:
            try:
                spike = await check_spend_spike(db, user_id)
                budget = await check_budget_warnings(db, user_id)
                total_alerts += len(spike) + len(budget)
            except Exception as e:
                logger.error(f"Alert check error for user {user_id}: {e}")

        await db.commit()
    logger.info(f"Alert checks complete: {total_alerts} new alerts")


def start_scheduler():
    """Register all scheduled jobs and start the scheduler."""
    scheduler.add_job(
        poll_all_providers,
        trigger=IntervalTrigger(minutes=15),
        id="poll_providers",
        name="Poll all provider APIs",
        replace_existing=True,
    )

    scheduler.add_job(
        run_daily_aggregation,
        trigger=CronTrigger(hour=0, minute=15, timezone="UTC"),
        id="daily_aggregation",
        name="Aggregate daily costs",
        replace_existing=True,
    )

    scheduler.add_job(
        run_alert_checks,
        trigger=IntervalTrigger(hours=1),
        id="alert_checks",
        name="Run alert checks",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Scheduler started with 3 jobs")


def stop_scheduler():
    """Gracefully shut down the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
