# Makefile for next-fastapi project

# Variables
PYTHON := python3
PIP := $(PYTHON) -m pip
PNPM := pnpm
UVICORN := $(PYTHON) -m uvicorn
CONCURRENTLY := $(PNPM) exec concurrently

# Python-related targets
.PHONY: fastapi-install
fastapi-install:
	cd ./api && $(PIP) install -r requirements.txt

.PHONY: fastapi-dev
fastapi-dev:
	$(UVICORN) api.index:app --reload --port 5328

.PHONY: fastapi-prod
fastapi-prod:
	$(UVICORN) api.index:app --port 5328

# Development targets
.PHONY: next-dev
next-dev:
	cd ./app && $(PNPM) run next-dev

.PHONY: dev
dev: fastapi-install
	$(CONCURRENTLY) "$(MAKE) next-dev" "$(MAKE) fastapi-dev"

# Production targets
.PHONY: build
build:
	cd ./app && $(PNPM) run build

.PHONY: start
start:
	cd ./app && $(PNPM) run start

.PHONY: prod
prod: build fastapi-install
	$(CONCURRENTLY) "$(MAKE) start" "$(MAKE) fastapi-prod"

.PHONY: prod-docker
prod-docker:
	$(CONCURRENTLY) "$(MAKE) start" "$(MAKE) fastapi-prod"

# Utility targets
.PHONY: lint
lint:
	cd ./app && $(PNPM) run lint

.PHONY: clean
clean:
	rm -rf .next
	find . -type d -name __pycache__ -exec rm -rf {} +
