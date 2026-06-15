# Makefile — Expediente Clinico (Ginecologia)
# Atajos para desarrollo, base de datos y empaquetado.
#   make            -> ayuda
#   make install    -> setup completo
#   make dev        -> backend + frontend
#   make build      -> empaquetado para Windows
# Variables sobreescribibles:  make dev PORT=9000

SHELL := /bin/bash

# ── Configuracion (sobreescribible, p.ej.  make dev PORT=9000) ─────────────
# Comentarios en su propia linea: en Make los espacios antes de un '#' inline
# quedarian DENTRO del valor de la variable.

# el venv real del proyecto vive en backend/.venv
VENV          ?= backend/.venv
# interprete para CREAR el venv (requiere Python 3.14+)
PYTHON        ?= python3
# puerto del backend (FastAPI/uvicorn)
PORT          ?= 8000
# puerto del dev server de Vite
FRONTEND_PORT ?= 5173

PY            := $(VENV)/bin/python
PIP           := $(VENV)/bin/pip
DB            := database/expediente_clinico.db
DUMP          := documentation/expediente_clinico_full.sql

.DEFAULT_GOAL := help

# ── Ayuda ──────────────────────────────────────────────────────────────────
.PHONY: help
help: ## Muestra esta ayuda
	@echo "Expediente Clinico — targets disponibles:"
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "} {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

# ── Instalacion / setup ─────────────────────────────────────────────────────
.PHONY: install
install: deps frontend-install env db-init ## Setup completo (venv + deps + frontend + .env + BD)
	@echo "✓ Listo. Arranca con:  make dev"

.PHONY: venv
venv: $(VENV) ## Crea el entorno virtual de Python (backend/.venv)

$(VENV):
	$(PYTHON) -m venv $(VENV)
	$(PY) -m pip install --upgrade pip

.PHONY: deps
deps: $(VENV) ## Instala/actualiza dependencias de Python (backend/requirements.txt)
	$(PIP) install -r backend/requirements.txt

.PHONY: frontend-install
frontend-install: ## Instala dependencias de Node (frontend/)
	cd frontend && npm install

.PHONY: env
env: ## Crea .env y frontend/.env si no existen
	@[ -f .env ] || { cp .env.example .env && echo "✓ .env creado desde .env.example (edita SECRET_KEY y AWS_*)"; }
	@[ -f frontend/.env ] || { echo "VITE_API_PORT=$(PORT)" > frontend/.env && echo "✓ frontend/.env creado"; }

# ── Base de datos ────────────────────────────────────────────────────────────
.PHONY: db-init
db-init: $(VENV) ## Crea la BD (estructura + datos de ejemplo) SOLO si no existe
	@if [ -f $(DB) ]; then \
		echo "✓ BD ya existe ($(DB)), no se toca"; \
	else \
		mkdir -p database; \
		$(PY) scripts/migrate_structure.py; \
		$(PY) scripts/migrate_data.py --seed; \
		echo "✓ BD creada: $(DB)"; \
	fi

.PHONY: db-schema
db-schema: $(VENV) ## (Re)crea solo el esquema de tablas (idempotente: CREATE IF NOT EXISTS)
	$(PY) scripts/migrate_structure.py

.PHONY: seed
seed: $(VENV) ## Inserta datos de ejemplo (OJO: no idempotente, puede duplicar)
	$(PY) scripts/migrate_data.py --seed

.PHONY: import-dump
import-dump: $(VENV) ## Importa datos desde el dump MySQL (INSERT OR IGNORE por id)
	$(PY) scripts/migrate_data.py --from-sql $(DUMP)

# ── Desarrollo ───────────────────────────────────────────────────────────────
.PHONY: dev
dev: ## Levanta backend + frontend a la vez (Ctrl-C detiene ambos)
	@command -v node >/dev/null || { echo "ERROR: Node no esta instalado"; exit 1; }
	@[ -x $(PY) ] || { echo "ERROR: falta el venv. Corre:  make install"; exit 1; }
	@[ -d frontend/node_modules ] || { echo "ERROR: faltan deps del frontend. Corre:  make frontend-install"; exit 1; }
	@echo "Backend  -> http://localhost:$(PORT)   (docs en /docs)"
	@echo "Frontend -> http://localhost:$(FRONTEND_PORT)"
	@trap 'kill 0' INT TERM; \
	$(PY) -m uvicorn backend.src.main:app --reload --port $(PORT) & \
	( cd frontend && npm run dev ) & \
	wait

.PHONY: dev-backend
dev-backend: $(VENV) ## Solo backend (uvicorn con autoreload)
	$(PY) -m uvicorn backend.src.main:app --reload --port $(PORT)

.PHONY: dev-frontend
dev-frontend: ## Solo frontend (vite dev server)
	cd frontend && npm run dev

.PHONY: serve
serve: $(VENV) ## Backend en modo produccion (sin autoreload, escucha en 0.0.0.0)
	$(PY) -m uvicorn backend.src.main:app --host 0.0.0.0 --port $(PORT)

# ── Calidad ──────────────────────────────────────────────────────────────────
.PHONY: check
check: $(VENV) ## Verifica que el backend compila (py_compile)
	$(PY) -m py_compile backend/src/*.py backend/src/routers/*.py backend/src/utils/*.py
	@echo "✓ Backend compila sin errores de sintaxis"

# ── Empaquetado / build ──────────────────────────────────────────────────────
.PHONY: frontend-build
frontend-build: ## Compila el frontend a frontend/dist (vite build)
	cd frontend && npm run build

.PHONY: build
build: $(VENV) ## Empaqueta TODO en build/ExpedienteClinico/ (frontend+backend+BD+.bat Windows)
	$(PY) scripts/build_package.py

.PHONY: build-update
build-update: $(VENV) ## Paquete de ACTUALIZACION sin BD -> build/ExpedienteClinico_Update/
	$(PY) scripts/build_update.py

# ── Limpieza ──────────────────────────────────────────────────────────────────
.PHONY: clean
clean: ## Borra artefactos de build y caches de Python (NO toca BD ni venv)
	rm -rf build/ExpedienteClinico build/ExpedienteClinico_Update frontend/dist
	find . -type d -name __pycache__ -prune -exec rm -rf {} + 2>/dev/null || true
	@echo "✓ Limpiado (artefactos de build y __pycache__)"

.PHONY: distclean
distclean: clean ## Limpieza profunda: ademas borra venv y node_modules (NO toca BD)
	rm -rf $(VENV) frontend/node_modules
	@echo "✓ venv y node_modules eliminados (la BD se conserva)"
