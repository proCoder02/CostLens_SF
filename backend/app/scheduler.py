# """
# CostLens – Background Scheduler
# Runs periodic tasks: provider polling, daily aggregation, and alert checks.
# Uses APScheduler for in-process scheduling. Swap with Celery Beat for production.
# """

# import logging
# from datetime import date, timedelta

# from apscheduler.schedulers.asyncio import AsyncIOScheduler
# from apscheduler.triggers.cron import CronTrigger
# from apscheduler.triggers.interval import IntervalTrigger
# from sqlalchemy import select

# from app.db.session import async_session_factory
# from app.models import User, APIConnection
# from app.services.provider_service import poll_provider
# from app.services.usage_service import ingest_usage, aggregate_daily_costs
# from app.services.alert_service import check_spend_spike, check_budget_warnings

# logger = logging.getLogger("costlens.scheduler")
# scheduler = AsyncIOScheduler()


# async def poll_all_providers():
#     """
#     Poll every active API connection for new usage data.
#     Runs every 15 minutes.
#     """
#     logger.info("Starting provider polling cycle")
#     async with async_session_factory() as db:
#         result = await db.execute(
#             select(APIConnection).where(APIConnection.is_active == True)
#         )
#         connections = result.scalars().all()

#         for conn in connections:
#             try:
#                 since = date.today() - timedelta(days=1)
#                 records = await poll_provider(
#                     provider=conn.provider,
#                     api_key=conn.api_key_encrypted,  # decrypt in production
#                     since=since,
#                 )
#                 if records:
#                     count = await ingest_usage(db, conn.user_id, records)
#                     logger.info(
#                         f"Polled {conn.provider} for user {conn.user_id}: {count} records"
#                     )
#             except Exception as e:
#                 logger.error(f"Error polling {conn.provider}: {e}")

#         await db.commit()
#     logger.info("Provider polling cycle complete")


# async def run_daily_aggregation():
#     """
#     Aggregate yesterday's raw usage logs into daily_costs.
#     Runs at 00:15 UTC daily.
#     """
#     logger.info("Starting daily aggregation")
#     yesterday = date.today() - timedelta(days=1)

#     async with async_session_factory() as db:
#         result = await db.execute(select(User.id).where(User.is_active == True))
#         user_ids = result.scalars().all()

#         for user_id in user_ids:
#             try:
#                 await aggregate_daily_costs(db, user_id, yesterday)
#             except Exception as e:
#                 logger.error(f"Aggregation error for user {user_id}: {e}")

#         await db.commit()
#     logger.info(f"Daily aggregation complete for {len(user_ids)} users")


# async def run_alert_checks():
#     """
#     Evaluate spike detection and budget warnings for all users.
#     Runs every hour.
#     """
#     logger.info("Starting alert checks")
#     async with async_session_factory() as db:
#         result = await db.execute(select(User.id).where(User.is_active == True))
#         user_ids = result.scalars().all()

#         total_alerts = 0
#         for user_id in user_ids:
#             try:
#                 spike = await check_spend_spike(db, user_id)
#                 budget = await check_budget_warnings(db, user_id)
#                 total_alerts += len(spike) + len(budget)
#             except Exception as e:
#                 logger.error(f"Alert check error for user {user_id}: {e}")

#         await db.commit()
#     logger.info(f"Alert checks complete: {total_alerts} new alerts")


# def start_scheduler():
#     """Register all scheduled jobs and start the scheduler."""
#     scheduler.add_job(
#         poll_all_providers,
#         trigger=IntervalTrigger(minutes=15),
#         id="poll_providers",
#         name="Poll all provider APIs",
#         replace_existing=True,
#     )

#     scheduler.add_job(
#         run_daily_aggregation,
#         trigger=CronTrigger(hour=0, minute=15, timezone="UTC"),
#         id="daily_aggregation",
#         name="Aggregate daily costs",
#         replace_existing=True,
#     )

#     scheduler.add_job(
#         run_alert_checks,
#         trigger=IntervalTrigger(hours=1),
#         id="alert_checks",
#         name="Run alert checks",
#         replace_existing=True,
#     )

#     scheduler.start()
#     logger.info("Scheduler started with 3 jobs")


# def stop_scheduler():
#     """Gracefully shut down the scheduler."""
#     if scheduler.running:
#         scheduler.shutdown(wait=False)
#         logger.info("Scheduler stopped")


# """
# CostLens – Background Scheduler
# Runs periodic tasks: provider polling, daily aggregation, and alert checks.
# Uses APScheduler for in-process scheduling. Swap with Celery Beat for production.
# """

# import logging
# from datetime import date, timedelta

# from apscheduler.schedulers.asyncio import AsyncIOScheduler
# from apscheduler.triggers.cron import CronTrigger
# from apscheduler.triggers.interval import IntervalTrigger
# from sqlalchemy import select

# from app.db.session import async_session_factory
# from app.models import User, APIConnection
# from app.services.provider_service import poll_provider
# from app.services.usage_service import ingest_usage, aggregate_daily_costs
# from app.services.alert_service import check_spend_spike, check_budget_warnings

# logger = logging.getLogger("costlens.scheduler")
# scheduler = AsyncIOScheduler()


# async def poll_all_providers():
#     """
#     Poll every active API connection for new usage data.
#     Runs every 15 minutes.
#     """
#     logger.info("Starting provider polling cycle")
#     async with async_session_factory() as db:
#         result = await db.execute(
#             select(APIConnection).where(APIConnection.is_active == True)
#         )
#         connections = result.scalars().all()

#         for conn in connections:
#             try:
#                 since = date.today() - timedelta(days=1)

#                 if conn.provider == "custom":
#                     # Custom API: pass base_url, endpoints, auth_header, cost_per_record
#                     records = await poll_provider(
#                         provider="custom",
#                         api_key=conn.api_key_encrypted,  # decrypt in production
#                         since=since,
#                         base_url=conn.base_url,
#                         endpoints=conn.endpoints or [],
#                         auth_header=conn.auth_header or "X-API-Key",
#                         cost_per_record=conn.cost_per_record or 0.01,
#                     )
#                 else:
#                     # Built-in providers: OpenAI, AWS, Stripe, Twilio
#                     records = await poll_provider(
#                         provider=conn.provider,
#                         api_key=conn.api_key_encrypted,  # decrypt in production
#                         since=since,
#                     )

#                 if records:
#                     count = await ingest_usage(db, conn.user_id, records)
#                     logger.info(
#                         f"Polled {conn.provider} for user {conn.user_id}: {count} records"
#                     )
#             except Exception as e:
#                 logger.error(f"Error polling {conn.provider}: {e}")

#         await db.commit()
#     logger.info("Provider polling cycle complete")


# async def run_daily_aggregation():
#     """
#     Aggregate yesterday's raw usage logs into daily_costs.
#     Runs at 00:15 UTC daily.
#     """
#     logger.info("Starting daily aggregation")
#     yesterday = date.today() - timedelta(days=1)

#     async with async_session_factory() as db:
#         result = await db.execute(select(User.id).where(User.is_active == True))
#         user_ids = result.scalars().all()

#         for user_id in user_ids:
#             try:
#                 await aggregate_daily_costs(db, user_id, yesterday)
#             except Exception as e:
#                 logger.error(f"Aggregation error for user {user_id}: {e}")

#         await db.commit()
#     logger.info(f"Daily aggregation complete for {len(user_ids)} users")


# async def run_alert_checks():
#     """
#     Evaluate spike detection and budget warnings for all users.
#     Runs every hour.
#     """
#     logger.info("Starting alert checks")
#     async with async_session_factory() as db:
#         result = await db.execute(select(User.id).where(User.is_active == True))
#         user_ids = result.scalars().all()

#         total_alerts = 0
#         for user_id in user_ids:
#             try:
#                 spike = await check_spend_spike(db, user_id)
#                 budget = await check_budget_warnings(db, user_id)
#                 total_alerts += len(spike) + len(budget)
#             except Exception as e:
#                 logger.error(f"Alert check error for user {user_id}: {e}")

#         await db.commit()
#     logger.info(f"Alert checks complete: {total_alerts} new alerts")


# def start_scheduler():
#     """Register all scheduled jobs and start the scheduler."""
#     scheduler.add_job(
#         poll_all_providers,
#         trigger=IntervalTrigger(minutes=1),
#         id="poll_providers",
#         name="Poll all provider APIs",
#         replace_existing=True,
#     )

#     scheduler.add_job(
#         run_daily_aggregation,
#         trigger=CronTrigger(hour=0, minute=15, timezone="UTC"),
#         id="daily_aggregation",
#         name="Aggregate daily costs",
#         replace_existing=True,
#     )

#     scheduler.add_job(
#         run_alert_checks,
#         trigger=IntervalTrigger(hours=1),
#         id="alert_checks",
#         name="Run alert checks",
#         replace_existing=True,
#     )

#     scheduler.start()
#     logger.info("Scheduler started with 3 jobs")


# def stop_scheduler():
#     """Gracefully shut down the scheduler."""
#     if scheduler.running:
#         scheduler.shutdown(wait=False)
#         logger.info("Scheduler stopped")



"""
CostLens – Background Scheduler
Runs periodic tasks: provider polling, daily aggregation, and alert checks.
Uses APScheduler for in-process scheduling. Swap with Celery Beat for production.

TESTING MODE: All intervals set to 1 minute for rapid feedback.
For production, change:
  - poll_providers:        IntervalTrigger(minutes=15)
  - realtime_aggregation:  IntervalTrigger(minutes=5)
  - daily_aggregation:     CronTrigger(hour=0, minute=15)
  - alert_checks:          IntervalTrigger(hours=1)
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

                if conn.provider == "custom":
                    records = await poll_provider(
                        provider="custom",
                        api_key=conn.api_key_encrypted,
                        since=since,
                        base_url=conn.base_url,
                        endpoints=conn.endpoints or [],
                        auth_header=conn.auth_header or "X-API-Key",
                        cost_per_record=conn.cost_per_record or 0.01,
                    )
                else:
                    records = await poll_provider(
                        provider=conn.provider,
                        api_key=conn.api_key_encrypted,
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
    Aggregate usage logs into daily_costs.
    Processes both today and yesterday to ensure real-time visibility.
    """
    logger.info("Starting daily aggregation")
    today = date.today()
    yesterday = today - timedelta(days=1)

    async with async_session_factory() as db:
        result = await db.execute(select(User.id).where(User.is_active == True))
        user_ids = result.scalars().all()

        for user_id in user_ids:
            try:
                await aggregate_daily_costs(db, user_id, yesterday)
                await aggregate_daily_costs(db, user_id, today)
            except Exception as e:
                logger.error(f"Aggregation error for user {user_id}: {e}")

        await db.commit()
    logger.info(f"Daily aggregation complete for {len(user_ids)} users")


async def run_alert_checks():
    """
    Evaluate spike detection and budget warnings for all users.
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
    """
    Register all scheduled jobs and start the scheduler.
    TESTING MODE: All set to 1 minute.
    """

    # Poll providers every 1 minute (production: 15 min)
    scheduler.add_job(
        poll_all_providers,
        trigger=IntervalTrigger(minutes=1),
        id="poll_providers",
        name="Poll all provider APIs",
        replace_existing=True,
    )

    # Aggregate usage into daily_costs every 1 minute (production: 5 min or daily)
    scheduler.add_job(
        run_daily_aggregation,
        trigger=IntervalTrigger(minutes=1),
        id="realtime_aggregation",
        name="Realtime cost aggregation",
        replace_existing=True,
    )

    # Alert checks every 1 minute (production: 1 hour)
    scheduler.add_job(
        run_alert_checks,
        trigger=IntervalTrigger(minutes=1),
        id="alert_checks",
        name="Run alert checks",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Scheduler started with 3 jobs (TESTING MODE: 1 min intervals)")


def stop_scheduler():
    """Gracefully shut down the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")