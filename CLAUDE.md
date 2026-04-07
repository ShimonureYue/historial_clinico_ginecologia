# CLAUDE.md - Expediente Clinico (Ginecologia)

## Tech Stack
- **Frontend:** React 18 + Vite 5 + Tailwind CSS 3 (class-based dark mode) + Zustand + TanStack React Query v5
- **Backend:** Python 3.14+ + FastAPI 0.135.3 + SQLite 3 (WAL mode)
- **Auth:** JWT with python-jose, configurable token expiry (TOKEN_EXPIRE_HOURS), granular permissions per module
- **Images:** AWS S3 with presigned URLs for colposcopy photos
- **Backups:** AWS S3 with sqlite3.backup() snapshots, restore, and presigned URL install
- **PDFs:** jsPDF (frontend prescription with auto-pagination), ReportLab (backend colposcopy report)

## Quick Start (Development)

```bash
# Automatic setup (recommended)
bash setup.sh

# Or manual:
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cd ..
python scripts/migrate_structure.py
python scripts/migrate_data.py --seed
uvicorn backend.src.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Environment Variables
Single `.env` file at project root (loaded by `main.py` before imports). See `.env.example`.
Key vars: `SECRET_KEY`, `TOKEN_EXPIRE_HOURS`, `DB_PATH`, `PORT`, `AWS_*`, `S3_BACKUP_*`, `VITE_API_PORT`

## Default Users
- `admin@clinica.com` / `admin123` (rol: admin, all permissions)
- `doctora@clinica.com` / `doctor123` (rol: medico, read/write/update on clinical modules)

## Database
- SQLite at `database/expediente_clinico.db`
- Schema created by `scripts/migrate_structure.py`
- Data migrated from MySQL dump via `scripts/migrate_data.py --from-sql documentation/expediente_clinico_full.sql`
- Seed data: `scripts/migrate_data.py --seed`
- Backup table `respaldos` auto-created by respaldos_router.py (CREATE TABLE IF NOT EXISTS)

## Permission Modules (7)
pacientes, consultas, antecedentes_pp, antecedentes_pnp, antecedentes_hf, antecedentes_go, usuarios

Each module has 4 permission types: lectura, escritura, actualizacion, eliminacion

## API Endpoints
| Prefix | Router | Description |
|--------|--------|-------------|
| `/api/auth` | auth_router | Login |
| `/api/pacientes` | pacientes_router | Patient CRUD + search + pagination |
| `/api/consultas` | consultas_router | Consultation CRUD + signos vitales |
| `/api/medicamentos` | medicamentos_router | Medications per consultation |
| `/api/colposcopias` | colposcopias_router | Colposcopy CRUD + S3 upload + PDF |
| `/api/interrogatorio` | interrogatorio_router | Review of systems per consultation |
| `/api/antecedentes-patologicos` | antecedentes_pp_router | Pathological history |
| `/api/antecedentes-no-patologicos` | antecedentes_pnp_router | Non-pathological history |
| `/api/antecedentes-heredo-familiares` | antecedentes_hf_router | Family history |
| `/api/antecedentes-gineco-obstetricos` | antecedentes_go_router | Gyneco-obstetric history |
| `/api/usuarios` | usuarios_router | User management + permissions |
| `/api/respaldos` | respaldos_router | S3 backup/restore/install |

## Frontend Key Patterns

### React Query v5
- `onSuccess`/`onError` removed from `useQuery` — use `useEffect` on `data`/`isError`
- `useMutation` still supports `onSuccess`/`onError`

### Pagination
- Backend: `?search=X&page=1&limit=50` → `{data: [...], total, page, limit}`
- Frontend: `r.data.data` (first `.data` is Axios, second is JSON property)

### Dark Mode
- Zustand store in `store/theme.js`, persists to `localStorage.expediente_dark`
- Applied as class on `<html>` before render (no flash)

### localStorage Keys
- `expediente_token`, `expediente_user`, `expediente_permissions`, `expediente_dark`

## Build & Deploy
```bash
python scripts/build_package.py  # Creates build/ExpedienteClinico_Win10/ and _Win8/
```
Copy to Windows → `setup.bat` (once) → `run.bat` (each time)
