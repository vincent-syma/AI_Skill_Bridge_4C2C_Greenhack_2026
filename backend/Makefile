.DEFAULT_GOAL := help

COMPOSE := docker compose
OBS_PROFILE := --profile observability
API_URL := http://localhost:8000
GRAFANA_URL := http://localhost:3010
DASHBOARD_URL := http://localhost:3010/d/ai-skill-bridge-api

.PHONY: help env install dev run up up-obs stack down logs logs-api observability obs-up obs-down grafana seed seed-risk test lint clean

help: ## Show available targets
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage: make [target]\n\nTargets:\n"} \
	/^[a-zA-Z0-9_-]+:.*##/ { printf "  %-16s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@echo ""
	@echo "Quick paths:"
	@echo "  API docs     $(API_URL)/docs"
	@echo "  Grafana      $(GRAFANA_URL)"
	@echo "  Dashboard    $(DASHBOARD_URL)"

env: ## Copy .env.example → .env if missing
	@test -f .env || cp .env.example .env
	@echo ".env ready"

install: ## Install Python dependencies (uv sync)
	uv sync

dev: ## Start Postgres only (local API via 'make run')
	$(COMPOSE) up db -d
	@echo "Postgres ready on :5432. Run 'make run' for the API."

run: ## Start API locally with hot reload
	uv run python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

up: ## Docker: Postgres + API
	$(COMPOSE) up --build

up-obs: ## Docker: Postgres + API + Loki/Grafana/Promtail (detached)
	$(COMPOSE) $(OBS_PROFILE) up --build -d
	@echo "API:       $(API_URL)/docs"
	@echo "Dashboard: $(DASHBOARD_URL)"

stack: up-obs ## Alias: full stack with observability

down: ## Stop all compose services
	$(COMPOSE) $(OBS_PROFILE) down

logs: ## Follow all compose logs
	$(COMPOSE) $(OBS_PROFILE) logs -f

logs-api: ## Follow API container logs only
	$(COMPOSE) logs -f api

observability obs-up: ## Start Loki + Promtail + Grafana (no API rebuild)
	$(COMPOSE) $(OBS_PROFILE) up -d loki promtail grafana
	@echo "Grafana dashboard: $(DASHBOARD_URL)"

obs-down: ## Stop observability services only
	$(COMPOSE) stop loki promtail grafana

grafana: ## Print Grafana / dashboard URLs
	@echo "Grafana:   $(GRAFANA_URL)"
	@echo "Dashboard: $(DASHBOARD_URL)"
	@echo "Explore:   $(GRAFANA_URL)/explore?orgId=1&left=%7B%22datasource%22:%22loki%22%7D"

seed: ## Seed admin, power user, demo tasks
	uv run python seed.py

seed-risk: ## Seed Risk Management curriculum tasks
	uv run python seed_risk_curriculum.py

test: ## Run pytest (if tests exist)
	@if [ -d app/tests ]; then uv run pytest app/tests/ -v; else echo "No app/tests/ yet — skipping."; fi

lint: ## Ruff check on app/
	uv run ruff check app/ || true

clean: ## Stop containers and remove volumes
	$(COMPOSE) $(OBS_PROFILE) down -v
	rm -rf .pytest_cache
