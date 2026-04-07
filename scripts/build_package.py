"""
build_package.py
================
Empaqueta el proyecto en UNA carpeta:
  build/ExpedienteClinico/  →  Python 3.10+ (Windows 10/11)

FLUJO:
    1. En macOS: migrar MySQL -> SQLite (migrate_structure.py + migrate_data.py)
    2. En macOS: ejecutar este script para empaquetar todo
    3. Copiar la carpeta al equipo destino
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
BUILD_DIR = os.path.join(PROJECT_ROOT, "build", "ExpedienteClinico")

REQUIREMENTS = """\
fastapi==0.135.3
uvicorn==0.43.0
python-jose[cryptography]==3.5.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.24
boto3>=1.35.0
reportlab==4.4.9
beautifulsoup4==4.12.3
requests==2.31.0
"""


def clean_build():
    if os.path.exists(BUILD_DIR):
        shutil.rmtree(BUILD_DIR)
    os.makedirs(BUILD_DIR, exist_ok=True)


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


def copy_frontend(dist_dir):
    static_dir = os.path.join(BUILD_DIR, "static")
    shutil.copytree(dist_dir, static_dir)


def copy_backend():
    src = os.path.join(PROJECT_ROOT, "backend", "src")
    dst = os.path.join(BUILD_DIR, "backend", "src")
    shutil.copytree(src, dst, ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))

    init_path = os.path.join(BUILD_DIR, "backend", "__init__.py")
    if not os.path.exists(init_path):
        open(init_path, "w").close()

    with open(os.path.join(BUILD_DIR, "requirements.txt"), "w") as f:
        f.write(REQUIREMENTS)


def copy_database():
    db_dir = os.path.join(BUILD_DIR, "database")
    os.makedirs(db_dir, exist_ok=True)
    os.makedirs(os.path.join(db_dir, "backups"), exist_ok=True)

    if os.path.exists(DB_FILE):
        shutil.copy2(DB_FILE, os.path.join(db_dir, "expediente_clinico.db"))
        size_kb = os.path.getsize(DB_FILE) / 1024
        print(f"  Base de datos copiada ({size_kb:.0f} KB)")
    else:
        print("  ADVERTENCIA: No se encontro la base de datos.")
        print("  Ejecuta primero la migracion:")
        print("    python scripts/migrate_structure.py")
        print("    python scripts/migrate_data.py --seed")
        sys.exit(1)


def copy_migration_scripts():
    scripts_dst = os.path.join(BUILD_DIR, "scripts")
    os.makedirs(scripts_dst, exist_ok=True)
    for fname in ["migrate_structure.py", "migrate_data.py"]:
        src_file = os.path.join(PROJECT_ROOT, "scripts", fname)
        if os.path.exists(src_file):
            shutil.copy2(src_file, os.path.join(scripts_dst, fname))


def copy_documentation():
    src_doc = os.path.join(PROJECT_ROOT, "documentation")
    dst_doc = os.path.join(BUILD_DIR, "documentation")
    os.makedirs(dst_doc, exist_ok=True)
    for fname in ["encabezado.png"]:
        src_file = os.path.join(src_doc, fname)
        if os.path.exists(src_file):
            shutil.copy2(src_file, os.path.join(dst_doc, fname))


def copy_env():
    """Copy only .env.example (never the real .env with credentials)."""
    src = os.path.join(PROJECT_ROOT, ".env.example")
    if os.path.exists(src):
        shutil.copy2(src, os.path.join(BUILD_DIR, ".env.example"))


def generate_icon():
    try:
        from PIL import Image, ImageDraw
        sizes = [16, 32, 48, 64, 128, 256]
        images = []
        for size in sizes:
            img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
            d = ImageDraw.Draw(img)
            d.ellipse([0, 0, size - 1, size - 1], fill=(10, 143, 131, 255))
            cx = size / 2
            m = size / 32
            bx1, by1, bx2, by2 = cx - 4.5*m, 10.5*m, cx + 4.5*m, 22.5*m
            d.rounded_rectangle([bx1, by1, bx2, by2], radius=2*m, fill=(255, 255, 255, 255))
            d.rounded_rectangle([cx - 1.5*m, 22.5*m, cx + 1.5*m, 25*m], radius=0.8*m, fill=(255, 255, 255, 255))
            d.line([bx1, 16*m, 7*m, 12.5*m], fill=(255, 255, 255, 220), width=max(1, int(1.6*m)))
            d.ellipse([5*m, 10*m, 9*m, 14*m], outline=(255, 255, 255, 220), width=max(1, int(1.3*m)))
            d.line([bx2, 16*m, 25*m, 12.5*m], fill=(255, 255, 255, 220), width=max(1, int(1.6*m)))
            d.ellipse([23*m, 10*m, 27*m, 14*m], outline=(255, 255, 255, 220), width=max(1, int(1.3*m)))
            images.append(img)
        ico_path = os.path.join(BUILD_DIR, "icon.ico")
        images[0].save(ico_path, format="ICO", sizes=[(s, s) for s in sizes], append_images=images[1:])
        print("  icon.ico generado")
    except Exception as e:
        print(f"  (icon.ico omitido: {e})")


def create_windows_scripts():
    setup_bat = r"""@echo off
chcp 65001 >nul
echo ============================================
echo  Expediente Clinico - Instalacion
echo ============================================
echo.

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

if not exist ".venv\Scripts\activate.bat" (
    echo ERROR: No se encontro el entorno virtual.
    echo Ejecuta primero: setup.bat
    pause
    exit /b 1
)

call .venv\Scripts\activate.bat

:: Load variables from .env if it exists
if exist ".env" (
    for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
        set "%%A=%%B"
    )
)

if not exist "database\expediente_clinico.db" (
    echo ERROR: No se encontro la base de datos.
    echo El archivo database\expediente_clinico.db no existe.
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

    readme_txt = """============================================================
  EXPEDIENTE CLINICO - GINECOLOGIA
  Guia de Instalacion y Uso
============================================================

Este programa funciona en tu navegador (Chrome, Edge, Firefox).
Solo necesitas instalar Python una vez y luego ya puedes usarlo.

VERSION REQUERIDA: Python 3.10 o superior


============================================================
  PASO 1: INSTALAR PYTHON (solo la primera vez)
============================================================

  1. Abre tu navegador y ve a:
     https://www.python.org/downloads/

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
  PASO 3: CONFIGURAR CREDENCIALES (solo la primera vez)
============================================================

  Lee el archivo CONFIGURACION_ENV.txt para configurar las
  credenciales de Amazon S3 (colposcopias y respaldos).

  Sin esta configuracion:
  - El sistema funciona normalmente
  - Pero NO podras subir imagenes de colposcopia
  - Y NO podras hacer respaldos a la nube


============================================================
  PASO 4: USAR EL PROGRAMA (cada vez que quieras usarlo)
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

    config_env_txt = """============================================================
  CONFIGURACION DE CREDENCIALES (.env)
============================================================

Para que funcionen las imagenes de colposcopia y los
respaldos a la nube, necesitas crear un archivo llamado
".env" en esta carpeta.

IMPORTANTE: El archivo se llama punto-env  -->  .env
            (empieza con un punto)


============================================================
  COMO CREAR EL ARCHIVO .env
============================================================

  1. Abre esta carpeta en el Explorador de archivos.

  2. Busca el archivo ".env.example" (es una plantilla).

  3. Haz clic derecho sobre ".env.example" y selecciona
     "Copiar". Luego haz clic derecho en un espacio vacio
     y selecciona "Pegar".

  4. Renombra la copia de ".env.example - copia" a ".env"
     (Windows puede advertir sobre cambiar la extension,
     haz clic en "Si").

  5. Haz clic derecho en ".env" > "Abrir con" > "Bloc de notas".

  6. Llena los valores con las credenciales que te
     proporcionaron. Ejemplo:


============================================================
  CONTENIDO DEL ARCHIVO .env
============================================================

Copia esto al Bloc de notas y reemplaza los valores:

  PORT=8000
  SECRET_KEY=expediente-clinico-secret-key-change-in-production
  VITE_API_PORT=8000

  # Colposcopias (imagenes)
  AWS_ACCESS_KEY_ID=AKIA...tu_access_key_colposcopia
  AWS_SECRET_ACCESS_KEY=tu_secret_key_colposcopia
  AWS_REGION=us-west-2
  S3_BUCKET_NAME=expediente-clinico

  # Respaldos (copias de seguridad)
  S3_BACKUP_ACCESS_KEY_ID=AKIA...tu_access_key_respaldos
  S3_BACKUP_SECRET_ACCESS_KEY=tu_secret_key_respaldos
  S3_BACKUP_BUCKET=historial-clinico-backups
  S3_BACKUP_PREFIX=miriam-01
  S3_BACKUP_REGION=us-east-1


============================================================
  NOTAS IMPORTANTES
============================================================

  - Las credenciales de COLPOSCOPIA y RESPALDOS son
    DIFERENTES. Son dos usuarios de Amazon distintos.

  - Si no tienes las credenciales, pide al administrador
    del sistema que te las proporcione.

  - NUNCA compartas el archivo .env con nadie.

  - Si el archivo .env no existe o esta vacio:
    * El sistema funciona normalmente
    * Las consultas, pacientes, etc. funcionan
    * Solo no podras subir imagenes ni hacer respaldos S3

  - Despues de crear o modificar .env, debes REINICIAR
    el programa (cerrar y abrir run.bat de nuevo).
"""

    for name, content in [
        ("setup.bat", setup_bat),
        ("run.bat", run_bat),
        ("README.txt", readme_txt),
        ("CONFIGURACION_ENV.txt", config_env_txt),
    ]:
        path = os.path.join(BUILD_DIR, name)
        with open(path, "w", encoding="utf-8", newline="\r\n") as f:
            f.write(content)


def main():
    print("=" * 50)
    print(" Empaquetando Expediente Clinico")
    print("=" * 50)

    clean_build()
    dist_dir = build_frontend()

    print("[2/7] Copiando frontend...")
    copy_frontend(dist_dir)

    print("[3/7] Copiando backend...")
    copy_backend()

    print("[4/7] Copiando base de datos...")
    copy_database()

    print("[5/7] Copiando scripts y documentacion...")
    copy_migration_scripts()
    copy_documentation()
    copy_env()

    print("[6/7] Creando scripts de Windows...")
    create_windows_scripts()

    print("[7/7] Generando icono...")
    generate_icon()

    total = sum(
        os.path.getsize(os.path.join(dp, f))
        for dp, _, files in os.walk(BUILD_DIR)
        for f in files
    )

    print()
    print("=" * 50)
    print(f" Empaquetado completado! ({total / (1024*1024):.1f} MB)")
    print(f" build/ExpedienteClinico/")
    print("=" * 50)


if __name__ == "__main__":
    main()
