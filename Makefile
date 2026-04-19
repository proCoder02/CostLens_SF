.PHONY: help up down seed logs build dev-api dev-frontend test clean

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Docker (production) ──────────────────────────────────────

up: ## Start all services (db + redis + api + frontend)
	docker compose up -d

down: ## Stop all services
	docker compose down

build: ## Rebuild all containers
	docker compose build

seed: ## Seed database with demo data
	docker compose run --rm seed

logs: ## Tail all logs
	docker compose logs -f

logs-api: ## Tail API server logs only
	docker compose logs -f api

# ── Local Development ────────────────────────────────────────

dev-api: ## Start backend dev server (requires venv + PostgreSQL)
	cd backend && uvicorn app.main:app --reload --port 8000

dev-frontend: ## Start frontend dev server
	cd frontend && npm run dev

install-frontend: ## Install frontend dependencies
	cd frontend && npm install

install-backend: ## Install backend dependencies
	cd backend && pip install -r requirements.txt

# ── Testing ──────────────────────────────────────────────────

test: ## Run backend tests
	cd backend && pytest tests/ -v

test-watch: ## Run tests in watch mode
	cd backend && pytest tests/ -v --tb=short -x

# ── Cleanup ──────────────────────────────────────────────────

clean: ## Remove all build artifacts and caches
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name node_modules -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name dist -exec rm -rf {} + 2>/dev/null || true
	rm -rf backend/.pytest_cache frontend/dist
