"""
CostLens – API Monitoring & Cost Optimizer for Startups
Main application entry point.

Run with:
    uvicorn app.main:app --reload --port 8000
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.session import init_db
from app.api import all_routers
from app.scheduler import start_scheduler, stop_scheduler

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
