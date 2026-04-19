# ⚡ CostLens — Full-Stack API Monitoring & Cost Optimizer

A production-ready SaaS application for tracking API usage across providers (OpenAI, AWS, Stripe, Twilio), alerting on cost spikes, and generating AI-powered optimization insights.

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                        Docker Compose                       │
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌───────────────┐  │
│  │   Frontend    │──▶│   Backend    │──▶│  PostgreSQL   │  │
│  │  React/Vite   │   │   FastAPI    │   │   (Data)      │  │
│  │  Nginx :80    │   │   :8000      │   │   :5432       │  │
│  └──────────────┘   └──────┬───────┘   └───────────────┘  │
│                            │                                │
│                     ┌──────┴───────┐   ┌───────────────┐  │
│                     │  Scheduler   │   │    Redis       │  │
│                     │  APScheduler │   │    :6379       │  │
│                     └──────┬───────┘   └───────────────┘  │
│                            │                                │
│              ┌─────────────┼─────────────┐                 │
│              ▼             ▼             ▼                  │
│        ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│        │  OpenAI  │ │   AWS    │ │ Stripe   │             │
│        └──────────┘ └──────────┘ └──────────┘             │
└────────────────────────────────────────────────────────────┘
```

## Quick Start (Docker — recommended)

```bash
# 1. Clone the repo
git clone https://github.com/your-org/costlens.git && cd costlens

# 2. Start everything (PostgreSQL + Redis + API + Frontend)
docker compose up -d

# 3. Seed demo data
docker compose run --rm seed

# 4. Open the app
open http://localhost          # Frontend (landing + dashboard)
open http://localhost:8000/docs  # Swagger API docs
```

**Demo login:** `demo@costlens.io` / `demodemo123`

## Quick Start (Local Development)

```bash
# Terminal 1 — Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev    # → http://localhost:3000 (proxies /api to :8000)

# Terminal 3 — Seed data
cd backend
python -m app.seed
```

## Tech Stack

| Layer      | Technology                                            |
|------------|-------------------------------------------------------|
| Frontend   | React 18, React Router 6, Tailwind CSS 3, Recharts   |
| Backend    | FastAPI, SQLAlchemy 2.0 (async), Pydantic v2          |
| Database   | PostgreSQL 16                                         |
| Cache      | Redis 7                                               |
| Auth       | JWT (python-jose) + bcrypt                            |
| Scheduler  | APScheduler (polling, aggregation, alert checks)      |
| Build      | Vite 5 (frontend), Docker + Docker Compose            |
| Proxy      | Nginx (production), Vite dev proxy (development)      |

## Project Structure

```
costlens/
├── docker-compose.yml          # Full-stack orchestration
├── Makefile                    # Common commands
│
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── api/                #   8 API client modules
│   │   ├── components/         #   Layout, Toast, Spinner, ProtectedRoute
│   │   ├── context/            #   AuthContext (login/logout state)
│   │   ├── hooks/              #   useApi, useMutation hooks
│   │   ├── pages/              #   9 page components
│   │   ├── styles/             #   Tailwind globals + component classes
│   │   ├── utils/              #   Formatters, constants
│   │   ├── App.jsx             #   Route configuration
│   │   └── main.jsx            #   Entry point
│   ├── Dockerfile              #   Multi-stage build → Nginx
│   ├── nginx.conf              #   SPA routing + API proxy
│   ├── tailwind.config.js
│   └── package.json
│
├── backend/                    # FastAPI REST API
│   ├── app/
│   │   ├── api/                #   7 route modules (22 endpoints)
│   │   ├── core/               #   Config, security (JWT + bcrypt)
│   │   ├── db/                 #   Async engine + session factory
│   │   ├── models/             #   7 SQLAlchemy models
│   │   ├── schemas/            #   Pydantic request/response schemas
│   │   ├── services/           #   5 business logic services
│   │   ├── main.py             #   FastAPI app + lifespan
│   │   ├── scheduler.py        #   Background jobs
│   │   └── seed.py             #   Demo data generator
│   ├── alembic/                #   Database migrations
│   ├── tests/                  #   15 async pytest tests
│   ├── costlens_sdk.py         #   Client SDK / middleware
│   ├── examples/               #   Integration example
│   ├── Dockerfile
│   └── requirements.txt
```

## Features

### Frontend (9 pages)
- **Landing Page** — Hero, features grid, pricing tiers, provider logos, CTA
- **Login / Register** — JWT auth with form validation, demo credentials
- **Dashboard** — Summary cards, stacked bar chart (Recharts), top endpoints table
- **Endpoints** — Sortable, filterable table with cost bars and trend badges
- **Alerts** — Severity-filtered feed, unread badges, mark-all-read, manual trigger
- **Insights** — Prioritized optimization cards with savings estimates, total savings CTA
- **Settings** — Connection manager, budget CRUD, alert threshold toggles, pricing plans

### Backend (22 API endpoints)
- **Auth** — Register, login (OAuth2 form), JWT token, profile
- **Connections** — CRUD for provider API keys with plan-based limits
- **Dashboard** — Single-call summary: today/MTD cost, budget %, provider breakdown, daily chart data
- **Usage** — Batch ingest, webhook receiver, per-endpoint breakdown with period comparison
- **Alerts** — List, filter, mark read, manual spike/budget check trigger
- **Insights** — 5 optimization analyzers: cost drivers, duplicates, batching, latency, cleanup
- **Settings** — Budget CRUD, alert preferences (thresholds, toggles, digest schedule)

### Infrastructure
- **Background scheduler** — Provider polling (15m), daily aggregation (midnight), alert checks (hourly)
- **Client SDK** — Drop-in middleware + context manager for automatic usage tracking
- **Docker Compose** — One-command deployment of all 5 services
- **Nginx** — Static asset caching, gzip, SPA fallback, API reverse proxy

## Commands

```bash
make up              # Start all services
make down            # Stop all services
make seed            # Seed demo data
make logs            # Tail all logs
make dev-api         # Start backend dev server
make dev-frontend    # Start frontend dev server
make test            # Run backend tests
make clean           # Remove caches and build artifacts
```

## Environment Variables

See `backend/.env.example` and `frontend/.env.example` for all configuration options.

## License

MIT
