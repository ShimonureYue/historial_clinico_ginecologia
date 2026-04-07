# Expediente Clinico Electronico - Ginecologia y Obstetricia

Sistema de expediente clinico electronico especializado en ginecologia y obstetricia. Gestiona pacientes, consultas medicas, antecedentes clinicos, colposcopias con imagenes en AWS S3, y generacion de recetas y reportes en PDF.

---

## Stack Tecnologico

| Capa | Tecnologia |
|------|-----------|
| **Frontend** | React 18 + Vite 5 + Tailwind CSS 3 + Zustand + TanStack React Query v5 |
| **Backend** | Python 3.10+ + FastAPI 0.135 + SQLite 3 (WAL mode) |
| **Autenticacion** | JWT (python-jose), tokens de 24h, permisos granulares por modulo |
| **Imagenes** | AWS S3 con presigned URLs (colposcopias) |
| **PDFs** | jsPDF en frontend (recetas), ReportLab en backend (reportes de colposcopia) |
| **Deploy** | Script Python que genera carpeta autocontenida con `.bat` para Windows |

## Caracteristicas Principales

- **Gestion de pacientes** con datos personales, direccion y busqueda con autocompletado
- **Consultas medicas** completas: signos vitales, exploracion fisica, interrogatorio por aparatos y sistemas
- **4 tipos de antecedentes**: patologicos, no patologicos, heredo-familiares, gineco-obstetricos
- **Colposcopias** con hasta 5 imagenes por estudio (almacenadas en S3) y generacion de reporte PDF
- **Recetas medicas** generadas en PDF desde el navegador (formato media carta horizontal)
- **Sistema de permisos granular**: 7 modulos x 4 permisos (lectura, escritura, actualizacion, eliminacion)
- **Dark mode** con persistencia en localStorage
- **Dashboard** con estadisticas generales
- **Empaquetado para Windows** con setup automatizado

---

## Inicio Rapido

### Requisitos

- Python 3.10+
- Node.js 18+

### 1. Clonar e instalar

```bash
git clone https://github.com/ShimonureYue/historial_clinico_ginecologia.git
cd historial_clinico_ginecologia

# Backend
cd backend
python -m venv .venv
source .venv/bin/activate        # macOS/Linux
# .venv\Scripts\activate         # Windows
pip install -r requirements.txt
cd ..

# Frontend
cd frontend
npm install
cd ..
```

### 2. Crear la base de datos

```bash
python scripts/migrate_structure.py        # Crea schema + usuarios default
python scripts/migrate_data.py --seed      # Datos de ejemplo (5 pacientes, 1 consulta)
```

O migrar desde dump MySQL existente:

```bash
python scripts/migrate_data.py --from-sql documentation/expediente_clinico_full.sql
```

### 3. Configurar variables de entorno (opcional)

```bash
cp .env.example .env
# Editar .env con tu SECRET_KEY y credenciales AWS S3
```

> S3 solo es necesario para subir imagenes de colposcopia. El sistema funciona completamente sin S3.

### 4. Iniciar en desarrollo (2 terminales)

**Terminal 1 - Backend (puerto 8000):**

```bash
source backend/.venv/bin/activate
python -m uvicorn backend.src.main:app --reload --port 8000
```

**Terminal 2 - Frontend (puerto 5173):**

```bash
cd frontend
npm run dev
```

Abrir **http://localhost:5173** en el navegador.

### 5. Iniciar en produccion (1 terminal)

```bash
cd frontend && npm run build && cd ..
python -m uvicorn backend.src.main:app --port 8000
```

Abrir **http://localhost:8000**. FastAPI sirve el frontend compilado. No se necesita Node.js.

---

## Usuarios por Defecto

| Correo | Contrasena | Rol | Permisos |
|--------|-----------|-----|----------|
| `admin@clinica.com` | `admin123` | admin | Todos los permisos en los 7 modulos |
| `doctora@clinica.com` | `doctora123` | medico | Lectura, escritura y actualizacion en modulos clinicos |

---

## Estructura del Proyecto

```
├── backend/
│   ├── src/
│   │   ├── main.py                 # FastAPI app + SPA serving
│   │   ├── database.py             # Conexion SQLite (WAL, foreign keys)
│   │   ├── auth.py                 # JWT + sistema de permisos
│   │   ├── utils/
│   │   │   ├── s3.py               # Upload y presigned URLs para S3
│   │   │   └── pdf.py              # ReportLab: reportes de colposcopia
│   │   └── routers/                # 11 routers (auth, pacientes, consultas, etc.)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # Rutas con React Router
│   │   ├── lib/api.js              # Axios con interceptores JWT
│   │   ├── store/                  # Zustand (auth + theme)
│   │   ├── hooks/                  # useModulePermission
│   │   ├── components/             # Layout, PatientSearch, RichTextEditor
│   │   └── pages/                  # 11 paginas (Login, Dashboard, Pacientes, etc.)
│   ├── package.json
│   └── vite.config.js
├── database/                       # SQLite (generado por migracion)
├── scripts/                        # Migracion y empaquetado
├── documentation/                  # Schema SQL original + assets
├── .env.example                    # Template de variables de entorno
└── .gitignore
```

## API Endpoints

Todos bajo `/api/`. Requieren JWT (`Authorization: Bearer <token>`) excepto `/api/auth/login` y `/api/health`.

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/api/auth/login` | Autenticacion (retorna token + permisos) |
| GET | `/api/health` | Health check |
| GET/POST | `/api/pacientes` | Listar (paginado) / Crear paciente |
| GET/PUT/DELETE | `/api/pacientes/:id` | Detalle / Actualizar / Eliminar |
| GET/POST | `/api/consultas` | Listar / Crear consulta + signos vitales |
| GET/PUT/DELETE | `/api/consultas/:id` | Detalle enriquecido / Actualizar / Eliminar |
| GET/POST/PUT | `/api/medicamentos/consulta/:id` | Medicamentos de una consulta |
| GET/POST/PUT | `/api/colposcopias/consulta/:id` | Colposcopia de una consulta |
| POST | `/api/colposcopias/:id/upload/:foto_num` | Subir imagen a S3 (foto 1-5) |
| GET | `/api/colposcopias/:id/pdf` | Generar PDF de colposcopia |
| GET/POST/PUT | `/api/interrogatorio/consulta/:id` | Interrogatorio por aparatos y sistemas |
| GET/POST/PUT | `/api/antecedentes-patologicos/paciente/:id` | Antecedentes patologicos |
| GET/POST/PUT | `/api/antecedentes-no-patologicos/paciente/:id` | Antecedentes no patologicos |
| GET/POST/PUT | `/api/antecedentes-heredo-familiares/paciente/:id` | Antecedentes heredo-familiares |
| GET/POST/PUT | `/api/antecedentes-gineco-obstetricos/paciente/:id` | Antecedentes gineco-obstetricos |
| GET/POST | `/api/usuarios` | Listar / Crear usuario (solo admin) |
| PUT/DELETE | `/api/usuarios/:id` | Actualizar / Eliminar usuario |

### Paginacion

Los endpoints de listado aceptan `?search=texto&page=1&limit=50` y retornan:

```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "limit": 50
}
```

---

## Modulos y Permisos

7 modulos con 4 tipos de permiso cada uno (lectura, escritura, actualizacion, eliminacion):

| Modulo | Descripcion |
|--------|-------------|
| `pacientes` | Gestion de pacientes y direcciones |
| `consultas` | Consultas medicas, signos vitales, exploracion fisica |
| `antecedentes_pp` | Antecedentes personales patologicos |
| `antecedentes_pnp` | Antecedentes personales no patologicos |
| `antecedentes_hf` | Antecedentes heredo-familiares |
| `antecedentes_go` | Antecedentes gineco-obstetricos |
| `usuarios` | Administracion de usuarios y permisos |

## Base de Datos

SQLite 3 con WAL mode y foreign keys habilitadas. **15 tablas**:

- **Clinicas (11):** pacientes, direcciones, consultas, signos_vitales, medicamentos, colposcopias, interrogatorio_por_aparatos_y_sistemas, antecedentes_personales_patologicos, antecedentes_personales_no_patologicos, antecedentes_heredo_familiares, antecedentes_gineco_obstetricos
- **Autenticacion (3):** usuarios, permisos, usuario_permisos

## Colposcopias e Imagenes S3

Cada colposcopia soporta hasta 5 imagenes almacenadas en AWS S3. Las imagenes se suben via multipart/form-data y se acceden con presigned URLs (validas 1 hora).

## Generacion de PDFs

- **Recetas medicas** (frontend): jsPDF, formato media carta horizontal, generadas desde detalle de consulta
- **Reportes de colposcopia** (backend): ReportLab, incluyen datos del paciente, hallazgos e imagenes de S3

## Empaquetado para Windows

```bash
python scripts/build_package.py
```

Genera `build/ExpedienteClinico/` con `setup.bat` (ejecutar una vez) y `run.bat` (ejecutar cada vez). Requisito: Python 3.10+ con "Add Python to PATH".

## Migracion desde MySQL

El proyecto original usaba MySQL/Laravel. Scripts de migracion disponibles:

```bash
# Desde dump SQL
python scripts/migrate_data.py --from-sql documentation/expediente_clinico_full.sql

# Desde MySQL en vivo
python scripts/migrate_data.py --mysql-host localhost --mysql-user root --mysql-password pass --mysql-db expediente

# Datos de ejemplo
python scripts/migrate_data.py --seed
```

---

---

Desarrollado con la asistencia de [Claude](https://claude.ai) (Anthropic).

## Licencia

Uso privado / clinico.
