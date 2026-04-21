from app.api.auth import router as auth_router
from app.api.connections import router as connections_router
from app.api.dashboard import router as dashboard_router
from app.api.usage import router as usage_router
from app.api.alerts import router as alerts_router
from app.api.insights import router as insights_router
from app.api.settings import router as settings_router
from app.api.admin import router as admin_router
from app.api.payments import router as payments_router

all_routers = [
    auth_router,
    connections_router,
    dashboard_router,
    usage_router,
    alerts_router,
    insights_router,
    settings_router,
    admin_router,
    payments_router,
]
