"""
CostLens – API Monitoring & Cost Optimizer for Startups
Main application entry point.

Run with:
    uvicorn app.main:app --reload --port 8000
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select

from app.core.config import settings
from app.db.session import init_db, async_session_factory
from app.api import all_routers
from app.scheduler import start_scheduler, stop_scheduler
from app.models import SaaSConfig

# ── Logging ───────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s │ %(name)-24s │ %(levelname)-7s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("costlens")


# ── Lifespan ──────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic."""
    logger.info("Starting CostLens API server")
    logger.info(f"Environment: {settings.ENVIRONMENT}")

    # Warn if SECRET_KEY is still the insecure default
    if settings.SECRET_KEY == "change-me-in-production":
        if settings.ENVIRONMENT == "production":
            raise RuntimeError("SECRET_KEY must be changed before deploying to production!")
        else:
            logger.warning("⚠️  SECRET_KEY is set to the default insecure value. Change it before deploying!")

    # Create tables (dev only – use Alembic migrations in prod)
    if settings.ENVIRONMENT == "development":
        await init_db()
        logger.info("Database tables created")

    # Start background scheduler
    start_scheduler()

    yield

    # Shutdown
    stop_scheduler()
    logger.info("CostLens API server stopped")


# ── App ───────────────────────────────────────────────────────────
app = FastAPI(
    title="CostLens API",
    description=(
        "API Monitoring & Cost Optimizer for Startups. "
        "Track API usage across providers, get spike alerts, "
        "and receive AI-powered optimization insights."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Maintenance Mode Middleware ────────────────────────────────────
@app.middleware("http")
async def maintenance_mode_middleware(request: Request, call_next):
    """
    When maintenance_mode=True in SaaSConfig, return 503 for all routes
    except /health and /api/v1/auth/* (so admins can still log in).
    """
    exempt = (
        request.url.path == "/health"
        or request.url.path.startswith("/api/v1/auth")
        or request.url.path.startswith("/docs")
        or request.url.path.startswith("/redoc")
    )
    if not exempt:
        try:
            async with async_session_factory() as db:
                result = await db.execute(select(SaaSConfig).where(SaaSConfig.id == 1))
                config = result.scalar_one_or_none()
                if config and config.maintenance_mode:
                    # Allow admins through by checking Authorization header
                    # (full user lookup skipped here for performance — admins use /auth endpoints)
                    return JSONResponse(
                        status_code=503,
                        content={
                            "detail": config.maintenance_message
                            or "We are currently undergoing maintenance. Please check back soon."
                        },
                    )
        except Exception:
            pass  # Don't block requests if DB check fails

    return await call_next(request)

# ── Routes ────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"

for router in all_routers:
    app.include_router(router, prefix=API_PREFIX)


# ── Health Check ──────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "costlens-api",
        "version": "1.0.0",
    }
