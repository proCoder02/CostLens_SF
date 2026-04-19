"""
CostLens – Test Suite
Run with: pytest tests/ -v
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app
from app.db.session import Base, get_db


# ── Test Database Setup ───────────────────────────────────────────

TEST_DB_URL = "sqlite+aiosqlite:///./test.db"

test_engine = create_async_engine(TEST_DB_URL, echo=False)
test_session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with test_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def auth_client(client: AsyncClient):
    """Client with a registered and authenticated user."""
    # Register
    response = await client.post("/api/v1/auth/register", json={
        "email": "test@costlens.io",
        "password": "testpassword123",
        "full_name": "Test User",
    })
    assert response.status_code == 201
    token = response.json()["access_token"]

    client.headers["Authorization"] = f"Bearer {token}"
    return client


# ═══════════════════════════════════════════════════════════════════
# Health Check
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "costlens-api"


# ═══════════════════════════════════════════════════════════════════
# Auth
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_register(client: AsyncClient):
    response = await client.post("/api/v1/auth/register", json={
        "email": "new@costlens.io",
        "password": "password123",
        "full_name": "New User",
    })
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "new@costlens.io"
    assert data["user"]["plan"] == "free"


@pytest.mark.asyncio
async def test_register_duplicate(client: AsyncClient):
    payload = {"email": "dup@costlens.io", "password": "password123"}
    await client.post("/api/v1/auth/register", json=payload)
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_login(client: AsyncClient):
    # Register first
    await client.post("/api/v1/auth/register", json={
        "email": "login@costlens.io",
        "password": "password123",
    })

    # Login
    response = await client.post("/api/v1/auth/login", data={
        "username": "login@costlens.io",
        "password": "password123",
    })
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "email": "wrong@costlens.io",
        "password": "password123",
    })
    response = await client.post("/api/v1/auth/login", data={
        "username": "wrong@costlens.io",
        "password": "wrongpassword",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me(auth_client: AsyncClient):
    response = await auth_client.get("/api/v1/auth/me")
    assert response.status_code == 200
    assert response.json()["email"] == "test@costlens.io"


# ═══════════════════════════════════════════════════════════════════
# Connections
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_create_connection(auth_client: AsyncClient):
    response = await auth_client.post("/api/v1/connections/", json={
        "provider": "openai",
        "display_name": "OpenAI",
        "api_key": "sk-test-key",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["provider"] == "openai"
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_list_connections(auth_client: AsyncClient):
    await auth_client.post("/api/v1/connections/", json={
        "provider": "openai", "api_key": "sk-test",
    })
    await auth_client.post("/api/v1/connections/", json={
        "provider": "aws", "api_key": "ak-test",
    })

    response = await auth_client.get("/api/v1/connections/")
    assert response.status_code == 200
    assert len(response.json()) == 2


@pytest.mark.asyncio
async def test_toggle_connection(auth_client: AsyncClient):
    create_resp = await auth_client.post("/api/v1/connections/", json={
        "provider": "stripe", "api_key": "sk-test",
    })
    conn_id = create_resp.json()["id"]

    # Deactivate
    response = await auth_client.patch(
        f"/api/v1/connections/{conn_id}",
        json={"is_active": False},
    )
    assert response.status_code == 200
    assert response.json()["is_active"] is False


# ═══════════════════════════════════════════════════════════════════
# Usage Ingest
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_usage_ingest(auth_client: AsyncClient):
    # Need a connection first
    await auth_client.post("/api/v1/connections/", json={
        "provider": "openai", "api_key": "sk-test",
    })

    response = await auth_client.post("/api/v1/usage/ingest", json={
        "records": [
            {
                "provider": "openai",
                "endpoint": "/v1/chat/completions",
                "feature_tag": "ai-chat",
                "request_count": 1,
                "tokens_used": 1523,
                "cost": 0.042,
                "latency_ms": 890,
            },
            {
                "provider": "openai",
                "endpoint": "/v1/embeddings",
                "feature_tag": "search",
                "request_count": 10,
                "tokens_used": 2000,
                "cost": 0.004,
                "latency_ms": 150,
            },
        ]
    })
    assert response.status_code == 201
    data = response.json()
    assert data["ingested"] == 2
    assert data["total_submitted"] == 2


# ═══════════════════════════════════════════════════════════════════
# Settings
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_create_budget(auth_client: AsyncClient):
    response = await auth_client.post("/api/v1/settings/budgets", json={
        "provider": "openai",
        "monthly_limit": 500.0,
    })
    assert response.status_code == 201
    assert response.json()["monthly_limit"] == 500.0


@pytest.mark.asyncio
async def test_get_alert_settings(auth_client: AsyncClient):
    response = await auth_client.get("/api/v1/settings/alerts")
    assert response.status_code == 200
    data = response.json()
    assert data["spike_threshold_pct"] == 40.0
    assert data["anomaly_detection"] is True


@pytest.mark.asyncio
async def test_update_alert_settings(auth_client: AsyncClient):
    response = await auth_client.patch("/api/v1/settings/alerts", json={
        "spike_threshold_pct": 60.0,
        "weekly_digest": False,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["spike_threshold_pct"] == 60.0
    assert data["weekly_digest"] is False


# ═══════════════════════════════════════════════════════════════════
# Alerts
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_alerts_empty(auth_client: AsyncClient):
    response = await auth_client.get("/api/v1/alerts/")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_unread_count(auth_client: AsyncClient):
    response = await auth_client.get("/api/v1/alerts/unread-count")
    assert response.status_code == 200
    assert response.json()["unread_count"] == 0
