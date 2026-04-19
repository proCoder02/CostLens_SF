# ⚡ CostLens — API Monitoring & Cost Optimizer

A full-stack SaaS backend for tracking API usage across providers (OpenAI, AWS, Stripe, Twilio), alerting on cost spikes, and generating AI-powered optimization insights.

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  React App   │────▶│  FastAPI     │────▶│  PostgreSQL  │
│  (Frontend)  │     │  (Backend)   │     │  (Database)  │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
                     ┌──────┴───────┐
                     │  APScheduler │
                     │  (Jobs)      │
                     └──────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │  OpenAI  │ │   AWS    │ │  Stripe  │
        │  API     │ │Cost Expl.│ │  API     │
        └──────────┘ └──────────┘ └──────────┘
```

## Tech Stack

| Layer       | Technology                              |
|-------------|----------------------------------------|
| Framework   | FastAPI 0.111 (async)                  |
| Database    | PostgreSQL 16 + SQLAlchemy 2.0 (async) |
| Auth        | JWT (python-jose) + bcrypt             |
| Migrations  | Alembic                                |
| Scheduler   | APScheduler (async)                    |
| HTTP Client | httpx (async)                          |
| Containers  | Docker + Docker Compose                |

## Quick Start

### 1. Clone and configure

```bash
cp .env.example .env
# Edit .env with your database credentials and API keys
```

### 2. Start with Docker Compose

```bash
# Start PostgreSQL, Redis, and the API server
docker compose up -d

# Seed the database with demo data
docker compose run --rm seed

# API is now running at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

### 3. Or run locally

```bash
# Install dependencies
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start PostgreSQL (ensure it's running on localhost:5432)
# Create database: createdb costlens

# Run the server
uvicorn app.main:app --reload --port 8000

# Seed demo data
python -m app.seed
```

### 4. Demo login

```
Email:    demo@costlens.io
Password: demodemo123
```

## API Endpoints

All endpoints are prefixed with `/api/v1`.

### Auth
| Method | Path               | Description          |
|--------|-------------------|----------------------|
| POST   | `/auth/register`  | Create new account   |
| POST   | `/auth/login`     | Get JWT token        |
| GET    | `/auth/me`        | Current user profile |

### Connections
| Method | Path                      | Description              |
|--------|--------------------------|--------------------------|
| GET    | `/connections/`          | List all connections     |
| POST   | `/connections/`          | Connect a provider       |
| PATCH  | `/connections/{id}`      | Toggle active/inactive   |
| DELETE | `/connections/{id}`      | Remove connection        |

### Dashboard
| Method | Path           | Description                          |
|--------|---------------|--------------------------------------|
| GET    | `/dashboard/` | Full summary (costs, charts, stats)  |

### Usage
| Method | Path                       | Description               |
|--------|---------------------------|---------------------------|
| POST   | `/usage/ingest`           | Batch ingest usage logs   |
| POST   | `/usage/webhook/{provider}` | Provider webhook receiver |
| GET    | `/usage/endpoints`        | Per-endpoint breakdown    |

### Alerts
| Method | Path                | Description                   |
|--------|--------------------|------------------------------ |
| GET    | `/alerts/`         | List alerts (filter: unread)  |
| GET    | `/alerts/unread-count` | Unread alert count        |
| POST   | `/alerts/read`     | Mark specific alerts read     |
| POST   | `/alerts/read-all` | Mark all alerts read          |
| POST   | `/alerts/check`    | Trigger spike/budget checks   |

### Insights
| Method | Path                | Description                      |
|--------|--------------------|---------------------------------|
| GET    | `/insights/`       | Optimization recommendations    |
| GET    | `/insights/summary`| Total savings summary           |

### Settings
| Method | Path                      | Description             |
|--------|--------------------------|-------------------------|
| GET    | `/settings/budgets`      | List budgets            |
| POST   | `/settings/budgets`      | Create budget           |
| PUT    | `/settings/budgets/{id}` | Update budget           |
| DELETE | `/settings/budgets/{id}` | Delete budget           |
| GET    | `/settings/alerts`       | Get alert preferences   |
| PATCH  | `/settings/alerts`       | Update alert preferences|

## SDK Integration

### Drop-in middleware for your FastAPI app

```python
from costlens_sdk import CostLensMiddleware

app = FastAPI()
app.add_middleware(
    CostLensMiddleware,
    api_key="your-costlens-api-key",
    costlens_url="http://localhost:8000",
)
```

### Manual tracking with context manager

```python
from costlens_sdk import CostLensTracker

tracker = CostLensTracker(api_key="your-key")

with tracker.track("openai", "/v1/chat/completions", feature_tag="ai-chat"):
    response = openai.chat.completions.create(
        model="gpt-4", messages=[{"role": "user", "content": "Hello"}]
    )
```

## Project Structure

```
backend/
├── app/
│   ├── api/                 # Route handlers
│   │   ├── auth.py          #   Authentication
│   │   ├── connections.py   #   Provider connections
│   │   ├── dashboard.py     #   Dashboard summary
│   │   ├── usage.py         #   Usage ingest & queries
│   │   ├── alerts.py        #   Alert management
│   │   ├── insights.py      #   Optimization insights
│   │   ├── settings.py      #   Budgets & preferences
│   │   └── deps.py          #   Auth dependencies
│   ├── core/
│   │   ├── config.py        # App configuration
│   │   └── security.py      # JWT & password utils
│   ├── db/
│   │   └── session.py       # Async DB engine & session
│   ├── models/
│   │   └── models.py        # SQLAlchemy ORM models
│   ├── schemas/
│   │   └── schemas.py       # Pydantic request/response
│   ├── services/
│   │   ├── user_service.py      # User auth logic
│   │   ├── usage_service.py     # Usage ingest & aggregation
│   │   ├── alert_service.py     # Spike & budget detection
│   │   ├── insights_service.py  # Optimization analysis
│   │   └── provider_service.py  # Provider API polling
│   ├── main.py              # FastAPI app entry point
│   ├── scheduler.py         # Background job scheduler
│   └── seed.py              # Demo data seeder
├── alembic/                 # Database migrations
├── tests/                   # Test suite
├── costlens_sdk.py          # Client SDK / middleware
├── docker-compose.yml       # Full dev stack
├── Dockerfile
├── requirements.txt
└── .env.example
```

## Running Tests

```bash
pip install pytest pytest-asyncio aiosqlite httpx
pytest tests/ -v
```

## Background Jobs

The scheduler runs three periodic tasks:

| Job                  | Frequency    | Description                                |
|---------------------|--------------|--------------------------------------------|
| `poll_providers`    | Every 15 min | Fetch usage data from connected APIs       |
| `daily_aggregation` | 00:15 UTC    | Roll up raw logs into daily_costs table    |
| `alert_checks`      | Every hour   | Evaluate spike detection & budget warnings |

## Pricing Tiers (enforced in backend)

| Feature              | Free | Startup ($29) | Business ($99) |
|---------------------|------|---------------|----------------|
| API connections      | 1    | 10            | 50             |
| History retention    | 7d   | 90d           | 365d           |
| Alerts               | ✗    | ✓             | ✓              |
| Insights             | ✗    | ✓             | ✓              |
| Team seats           | 1    | 3             | Unlimited      |
| Custom tags          | ✗    | ✗             | ✓              |

## License

MIT
