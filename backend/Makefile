.PHONY: help dev seed test lint migrate docker-up docker-down docker-seed clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Local Development ─────────────────────────────────────────

dev: ## Start the dev server with hot reload
	uvicorn app.main:app --reload --port 8000

seed: ## Seed the database with demo data
	python -m app.seed

test: ## Run the test suite
	pytest tests/ -v

lint: ## Run linter (ruff)
	ruff check app/ tests/
	ruff format --check app/ tests/

format: ## Auto-format code
	ruff format app/ tests/

# ── Database ──────────────────────────────────────────────────

migrate: ## Generate a new Alembic migration
	alembic revision --autogenerate -m "$(msg)"

upgrade: ## Apply all pending migrations
	alembic upgrade head

downgrade: ## Rollback last migration
	alembic downgrade -1

# ── Docker ────────────────────────────────────────────────────

docker-up: ## Start all services (db, redis, api)
	docker compose up -d

docker-down: ## Stop all services
	docker compose down

docker-seed: ## Seed database via Docker
	docker compose run --rm seed

docker-logs: ## Tail API server logs
	docker compose logs -f api

docker-rebuild: ## Rebuild and restart API container
	docker compose up -d --build api

# ── Cleanup ───────────────────────────────────────────────────

clean: ## Remove cached files and build artifacts
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	rm -rf .pytest_cache htmlcov .coverage dist build *.egg-info
