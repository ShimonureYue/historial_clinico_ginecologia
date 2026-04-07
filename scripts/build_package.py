"""
build_package.py
================
Empaqueta el proyecto en DOS carpetas:
  build/ExpedienteClinico_Win10/  →  Python 3.10+  (Windows 10/11)
  build/ExpedienteClinico_Win8/   →  Python 3.8/3.9 (Windows 8/8.1)

FLUJO:
    1. En macOS: migrar MySQL -> SQLite (migrate_structure.py + migrate_data.py)
    2. En macOS: ejecutar este script para empaquetar todo
    3. Copiar la carpeta correspondiente al equipo destino
    4. En Windows: setup.bat -> run.bat

Requisitos (macOS):
    - Node.js 20 (via nvm) para compilar el frontend
    - .venv activado con dependencias instaladas

Uso:
    source backend/.venv/bin/activate
    source ~/.nvm/nvm.sh && nvm use 20
    python scripts/build_package.py
"""

import os
import shutil
import subprocess
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_FILE = os.path.join(PROJECT_ROOT, "database", "expediente_clinico.db")

TARGETS = {
    "Win10": {
        "dir": os.path.join(PROJECT_ROOT, "build", "ExpedienteClinico_Win10"),
        "python_label": "Python 3.10, 3.11, 3.12, 3.13 o 3.14",
        "python_url": "https://www.python.org/downloads/",
        "requirements": """\
fastapi==0.135.3
uvicorn==0.43.0
python-jose[cryptography]==3.5.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.24
boto3>=1.35.0
reportlab==4.4.9
beautifulsoup4==4.12.3
requests==2.31.0
""",
    },
    "Win8": {
        "dir": os.path.join(PROJECT_ROOT, "build", "ExpedienteClinico_Win8"),
        "python_label": "Python 3.8 o 3.9",
        "python_url": "https://www.python.org/downloads/release/python-3913/",
        "requirements": """\
fastapi==0.104.1
uvicorn==0.24.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
boto3==1.34.0
reportlab==4.0.8
beautifulsoup4==4.12.3
requests==2.31.0
""",
    },
}


def clean_build(build_dir):
    if os.path.exists(build_dir):
        shutil.rmtree(build_dir)
    os.makedirs(build_dir, exist_ok=True)


def build_frontend():
    frontend_dir = os.path.join(PROJECT_ROOT, "frontend")
    print("[1/7] Compilando frontend...")
    result = subprocess.run(
        ["npm", "run", "build"],
        cwd=frontend_dir,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"Error compilando frontend:\n{result.stderr}")
        sys.exit(1)
    print("  Frontend compilado -> dist/")
    return os.path.join(frontend_dir, "dist")


def copy_frontend(dist_dir, build_dir):
    static_dir = os.path.join(build_dir, "static")
    shutil.copytree(dist_dir, static_dir)


def copy_backend(build_dir, requirements_content):
    src = os.path.join(PROJECT_ROOT, "backend", "src")
    dst = os.path.join(build_dir, "backend", "src")
    shutil.copytree(src, dst, ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))

    init_path = os.path.join(build_dir, "backend", "__init__.py")
    if not os.path.exists(init_path):
        open(init_path, "w").close()

    with open(os.path.join(build_dir, "requirements.txt"), "w") as f:
        f.write(requirements_content)


def copy_database(build_dir):
    db_dir = os.path.join(build_dir, "database")
    os.makedirs(db_dir, exist_ok=True)
    os.makedirs(os.path.join(db_dir, "backups"), exist_ok=True)

    if os.path.exists(DB_FILE):
        shutil.copy2(DB_FILE, os.path.join(db_dir, "expediente_clinico.db"))
        size_kb = os.path.getsize(DB_FILE) / 1024
        print(f"  Base de datos copiada ({size_kb:.0f} KB)")
    else:
        print("  ADVERTENCIA: No se encontró la base de datos.")
        print("  Ejecuta primero la migración:")
        print("    python scripts/migrate_structure.py")
        print("    python scripts/migrate_data.py --from-sql documentation/expediente_clinico_full.sql")
        sys.exit(1)


def copy_migration_scripts(build_dir):
    scripts_dst = os.path.join(build_dir, "scripts")
    os.makedirs(scripts_dst, exist_ok=True)
    for fname in ["migrate_structure.py", "migrate_data.py"]:
        src_file = os.path.join(PROJECT_ROOT, "scripts", fname)
        if os.path.exists(src_file):
            shutil.copy2(src_file, os.path.join(scripts_dst, fname))


def create_windows_scripts(build_dir, python_label, python_url):
    setup_bat = r"""@echo off
chcp 65001 >nul
echo ============================================
echo  Expediente Clinico - Instalacion
echo ============================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python no esta instalado.
    echo Descarga Python desde https://www.python.org/downloads/
    echo IMPORTANTE: Marca "Add Python to PATH" durante la instalacion.
    pause
    exit /b 1
)

echo Python encontrado:
python --version
echo.

echo Creando entorno virtual...
python -m venv .venv
if errorlevel 1 (
    echo ERROR: No se pudo crear el entorno virtual.
    pause
    exit /b 1
)

echo Activando entorno e instalando dependencias...
call .venv\Scripts\activate.bat
pip install --upgrade pip >nul 2>&1
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: No se pudieron instalar las dependencias.
    pause
    exit /b 1
)

echo.
echo ============================================
echo  Instalacion completada exitosamente!
echo ============================================
echo.
echo Ahora ejecuta: run.bat
echo.
pause
"""

    run_bat = r"""@echo off
chcp 65001 >nul
echo ============================================
echo  Expediente Clinico - Ginecologia
echo ============================================
echo.

:: Check venv exists
if not exist ".venv\Scripts\activate.bat" (
    echo ERROR: No se encontro el entorno virtual.
    echo Ejecuta primero: setup.bat
    pause
    exit /b 1
)

call .venv\Scripts\activate.bat

:: Load S3 / AWS variables from .env if it exists
if exist ".env" (
    for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
        set "%%A=%%B"
    )
)

:: Check database
if not exist "database\expediente_clinico.db" (
    echo ERROR: No se encontro la base de datos.
    echo El archivo database\expediente_clinico.db no existe.
    echo Asegurate de que la carpeta se copio completa.
    pause
    exit /b 1
)

echo Iniciando servidor...
echo.
echo ========================================
echo  Abre tu navegador en:
echo  http://localhost:8000
echo ========================================
echo.
echo Presiona Ctrl+C para detener el servidor.
echo.

start "" "http://localhost:8000"
python -m uvicorn backend.src.main:app --host 127.0.0.1 --port 8000
pause
"""

    readme_txt = f"""============================================================
  EXPEDIENTE CLINICO - GINECOLOGIA
  Guia de Instalacion y Uso
============================================================

Este programa funciona en tu navegador (Chrome, Edge, Firefox).
Solo necesitas instalar Python una vez y luego ya puedes usarlo.

VERSION REQUERIDA: {python_label}


============================================================
  PASO 1: INSTALAR PYTHON (solo la primera vez)
============================================================

  1. Abre tu navegador y ve a esta pagina:

     {python_url}

  2. Descarga el instalador para Windows y ejecutalo.

  3. MUY IMPORTANTE - En la primera pantalla del instalador:

     [x] Marca la casilla que dice:
         "Add Python to PATH"  (o "Add python.exe to PATH")

         Esta casilla esta ABAJO del todo, asegurate de
         marcarla ANTES de hacer clic en instalar.

  4. Haz clic en "Install Now" (Instalar ahora).

  5. Espera a que termine. Cuando diga "Setup was successful",
     haz clic en "Close" (Cerrar).


============================================================
  PASO 2: CONFIGURAR EL PROGRAMA (solo la primera vez)
============================================================

  1. Abre la carpeta "ExpedienteClinico" (esta carpeta).

  2. Busca el archivo "setup.bat" y haz DOBLE CLIC en el.

  3. Se abrira una ventana negra (consola). Espera a que
     termine de instalar todo. Puede tardar 1-2 minutos.

  4. Al final veras:
     "Instalacion completada exitosamente!"

  5. Presiona cualquier tecla para cerrar esa ventana.


============================================================
  PASO 3: USAR EL PROGRAMA (cada vez que quieras usarlo)
============================================================

  1. Abre la carpeta "ExpedienteClinico".

  2. Haz DOBLE CLIC en "run.bat".

  3. Se abrira una ventana negra y automaticamente se abrira
     tu navegador en la pagina del sistema.

     Si no se abre solo, abre tu navegador y escribe:
     http://localhost:8000

  4. Inicia sesion con estas credenciales:

     Correo:     admin@clinica.com
     Contrasena: admin123

     (o bien)

     Correo:     doctora@clinica.com
     Contrasena: doctor123

  5. Ya puedes usar el sistema!


============================================================
  COMO CERRAR EL PROGRAMA
============================================================

  1. Cierra la pestana del navegador normalmente.
  2. Ve a la ventana negra y cierrala con la X, o Ctrl+C.


============================================================
  COMO RESPALDAR LA BASE DE DATOS
============================================================

  Los datos se guardan en: database\\expediente_clinico.db

  Para respaldar:
  1. Asegurate de que el programa NO este corriendo.
  2. Copia el archivo "expediente_clinico.db" a una USB
     o carpeta segura.

  Para restaurar:
  1. Asegurate de que el programa NO este corriendo.
  2. Reemplaza el archivo con tu copia de respaldo.


============================================================
  CONFIGURAR IMAGENES DE COLPOSCOPIA (S3)
============================================================

  Las imagenes de colposcopia se almacenan en Amazon S3.
  Para configurar S3, crea un archivo .env en esta carpeta
  con el siguiente contenido:

  AWS_ACCESS_KEY_ID=tu_access_key
  AWS_SECRET_ACCESS_KEY=tu_secret_key
  AWS_REGION=us-east-1
  S3_BUCKET_NAME=tu_bucket

  Si no configuras S3, el sistema funcionara pero no podras
  subir ni ver imagenes de colposcopia.


============================================================
  PROBLEMAS COMUNES
============================================================

  "Python no esta instalado"
  -> Instala Python como se explica en el Paso 1.
     Marca "Add Python to PATH".

  "No se encontro el entorno virtual"
  -> Ejecuta setup.bat primero (Paso 2).

  "No se encontro la base de datos"
  -> Verifica que la carpeta "database" contenga el archivo
    "expediente_clinico.db".

  "El navegador dice que no puede conectar"
  -> Verifica que la ventana negra este abierta y no muestre
     errores. Cierra y abre run.bat de nuevo.

  "Windows Defender bloquea el programa"
  -> Haz clic en "Mas informacion" > "Ejecutar de todas formas".
"""

    update_bat = r"""@echo off
chcp 65001 >nul
echo ============================================
echo  Expediente Clinico - Actualizacion
echo ============================================
echo.
echo Este script actualiza una instalacion existente
echo SIN tocar la base de datos ni el entorno virtual.
echo.

:: Ask for target installation path
set /p TARGET="Escribe la ruta de la instalacion existente (ej. C:\ExpedienteClinico): "

if not exist "%TARGET%\" (
    echo ERROR: No se encontro la carpeta: %TARGET%
    pause
    exit /b 1
)

if not exist "%TARGET%\database\expediente_clinico.db" (
    echo ERROR: No parece ser una instalacion valida (no hay base de datos).
    echo Usa setup.bat para instalaciones nuevas.
    pause
    exit /b 1
)

echo.
echo Actualizando archivos en: %TARGET%
echo (La base de datos y el entorno virtual no se modificaran)
echo.

:: Copy frontend static files
xcopy /E /I /Y "static" "%TARGET%\static" >nul
echo  [OK] Frontend actualizado

:: Copy backend source
xcopy /E /I /Y "backend" "%TARGET%\backend" >nul
echo  [OK] Backend actualizado

:: Copy scripts
xcopy /E /I /Y "scripts" "%TARGET%\scripts" >nul
echo  [OK] Scripts actualizados

:: Copy documentation assets
xcopy /E /I /Y "documentation" "%TARGET%\documentation" >nul
echo  [OK] Documentacion actualizada

:: Copy requirements and bat files
copy /Y "requirements.txt" "%TARGET%\requirements.txt" >nul
copy /Y "run.bat" "%TARGET%\run.bat" >nul
copy /Y "setup.bat" "%TARGET%\setup.bat" >nul
copy /Y "README.txt" "%TARGET%\README.txt" >nul
if exist "icon.ico" copy /Y "icon.ico" "%TARGET%\icon.ico" >nul
echo  [OK] Archivos de configuracion actualizados

:: Update dependencies if venv exists
if exist "%TARGET%\.venv\Scripts\activate.bat" (
    echo.
    echo Actualizando dependencias Python...
    call "%TARGET%\.venv\Scripts\activate.bat"
    pip install -r "%TARGET%\requirements.txt" --quiet
    echo  [OK] Dependencias actualizadas
)

echo.
echo ============================================
echo  Actualizacion completada!
echo  Ejecuta run.bat para iniciar el sistema.
echo ============================================
echo.
pause
"""

    for name, content in [
        ("setup.bat", setup_bat),
        ("run.bat", run_bat),
        ("update.bat", update_bat),
        ("README.txt", readme_txt),
    ]:
        path = os.path.join(build_dir, name)
        with open(path, "w", encoding="utf-8", newline="\r\n") as f:
            f.write(content)


def copy_env(build_dir):
    """Copy .env and .env.example from project root into the package."""
    for name in [".env", ".env.example"]:
        src = os.path.join(PROJECT_ROOT, name)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(build_dir, name))


def generate_icon(build_dir):
    """Generate icon.ico for Windows shortcuts using Pillow."""
    try:
        from PIL import Image, ImageDraw
        sizes = [16, 32, 48, 64, 128, 256]
        images = []
        for size in sizes:
            img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
            d = ImageDraw.Draw(img)
            # Teal circle background
            d.ellipse([0, 0, size - 1, size - 1], fill=(10, 143, 131, 255))
            # Simplified uterus: white body trapezoid
            cx = size / 2
            m = size / 32  # scale factor
            # Body
            bx1, by1, bx2, by2 = cx - 4.5*m, 10.5*m, cx + 4.5*m, 22.5*m
            d.rounded_rectangle([bx1, by1, bx2, by2], radius=2*m, fill=(255, 255, 255, 255))
            # Cervix
            d.rounded_rectangle([cx - 1.5*m, 22.5*m, cx + 1.5*m, 25*m], radius=0.8*m, fill=(255, 255, 255, 255))
            # Left tube
            d.line([bx1, 16*m, 7*m, 12.5*m], fill=(255, 255, 255, 220), width=max(1, int(1.6*m)))
            d.ellipse([5*m, 10*m, 9*m, 14*m], outline=(255, 255, 255, 220), width=max(1, int(1.3*m)))
            # Right tube
            d.line([bx2, 16*m, 25*m, 12.5*m], fill=(255, 255, 255, 220), width=max(1, int(1.6*m)))
            d.ellipse([23*m, 10*m, 27*m, 14*m], outline=(255, 255, 255, 220), width=max(1, int(1.3*m)))
            images.append(img)
        ico_path = os.path.join(build_dir, "icon.ico")
        images[0].save(ico_path, format="ICO", sizes=[(s, s) for s in sizes], append_images=images[1:])
        print("  icon.ico generado")
    except Exception as e:
        print(f"  (icon.ico omitido: {e})")


def copy_documentation(build_dir):
    """Copy documentation assets needed at runtime (e.g. PDF header image)."""
    src_doc = os.path.join(PROJECT_ROOT, "documentation")
    dst_doc = os.path.join(build_dir, "documentation")
    os.makedirs(dst_doc, exist_ok=True)
    for fname in ["encabezado.png"]:
        src_file = os.path.join(src_doc, fname)
        if os.path.exists(src_file):
            shutil.copy2(src_file, os.path.join(dst_doc, fname))


def build_target(name, config, dist_dir):
    build_dir = config["dir"]
    print(f"\n  → Empaquetando {name} en {os.path.basename(build_dir)}/")
    clean_build(build_dir)
    copy_frontend(dist_dir, build_dir)
    copy_backend(build_dir, config["requirements"])
    copy_database(build_dir)
    copy_migration_scripts(build_dir)
    copy_documentation(build_dir)
    copy_env(build_dir)
    generate_icon(build_dir)
    create_windows_scripts(build_dir, config["python_label"], config["python_url"])

    total = sum(
        os.path.getsize(os.path.join(dp, f))
        for dp, _, files in os.walk(build_dir)
        for f in files
    )
    print(f"  ✓ {name}: {total / (1024*1024):.1f} MB → {os.path.basename(build_dir)}/")


def main():
    print("=" * 50)
    print(" Empaquetando Expediente Clínico")
    print(" Windows 10  +  Windows 8")
    print("=" * 50)

    dist_dir = build_frontend()

    for name, config in TARGETS.items():
        build_target(name, config, dist_dir)

    print()
    print("=" * 50)
    print(" Empaquetado completado!")
    print("  build/ExpedienteClinico_Win10/  →  Windows 10/11")
    print("  build/ExpedienteClinico_Win8/   →  Windows 8/8.1")
    print("=" * 50)


if __name__ == "__main__":
    main()
