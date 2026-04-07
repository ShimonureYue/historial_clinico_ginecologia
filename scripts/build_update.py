"""
build_update.py
===============
Genera un paquete de ACTUALIZACION que NO incluye la base de datos.
El medico copia esta carpeta junto a su instalacion existente y
ejecuta actualizar.bat.

Genera:  build/ExpedienteClinico_Update/

Contenido:
  - static/           (frontend compilado)
  - backend/          (codigo fuente)
  - scripts/          (migracion)
  - documentation/    (assets como encabezado.png)
  - requirements.txt  (deps actualizadas)
  - .env.example      (referencia de variables)
  - actualizar.bat    (doble clic para aplicar la actualizacion)
  - run.bat           (nuevo, se copia al destino)
  - setup.bat         (nuevo, se copia al destino)
  - README_UPDATE.txt (instrucciones para el medico)

  NO incluye:
  - database/         (NO se toca la base de datos del medico)
  - .env              (NO se sobreescriben sus credenciales)
  - .venv/            (se actualizan las deps in-place)

Uso:
    source .venv/bin/activate
    python scripts/build_update.py
"""

import os
import shutil
import subprocess
import sys
from datetime import datetime

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD_DIR = os.path.join(PROJECT_ROOT, "build", "ExpedienteClinico_Update")

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
    print("[1/6] Compilando frontend...")
    result = subprocess.run(
        ["npm", "run", "build"],
        cwd=frontend_dir,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"Error compilando frontend:\n{result.stderr}")
        sys.exit(1)
    dist_dir = os.path.join(frontend_dir, "dist")
    shutil.copytree(dist_dir, os.path.join(BUILD_DIR, "static"))
    print("  Frontend compilado y copiado a static/")


def copy_backend():
    print("[2/6] Copiando backend...")
    src = os.path.join(PROJECT_ROOT, "backend", "src")
    dst = os.path.join(BUILD_DIR, "backend", "src")
    shutil.copytree(src, dst, ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))

    init_path = os.path.join(BUILD_DIR, "backend", "__init__.py")
    if not os.path.exists(init_path):
        open(init_path, "w").close()

    with open(os.path.join(BUILD_DIR, "requirements.txt"), "w") as f:
        f.write(REQUIREMENTS)
    print("  Backend copiado + requirements.txt")


def copy_scripts():
    print("[3/6] Copiando scripts y documentacion...")
    scripts_dst = os.path.join(BUILD_DIR, "scripts")
    os.makedirs(scripts_dst, exist_ok=True)
    for fname in ["migrate_structure.py", "migrate_data.py"]:
        src_file = os.path.join(PROJECT_ROOT, "scripts", fname)
        if os.path.exists(src_file):
            shutil.copy2(src_file, os.path.join(scripts_dst, fname))

    # Documentation assets
    src_doc = os.path.join(PROJECT_ROOT, "documentation")
    dst_doc = os.path.join(BUILD_DIR, "documentation")
    os.makedirs(dst_doc, exist_ok=True)
    for fname in ["encabezado.png"]:
        src_file = os.path.join(src_doc, fname)
        if os.path.exists(src_file):
            shutil.copy2(src_file, os.path.join(dst_doc, fname))

    # .env.example
    env_example = os.path.join(PROJECT_ROOT, ".env.example")
    if os.path.exists(env_example):
        shutil.copy2(env_example, os.path.join(BUILD_DIR, ".env.example"))


def create_actualizar_bat():
    print("[4/6] Creando scripts de Windows...")

    actualizar_bat = r"""@echo off
chcp 65001 >nul
echo ============================================
echo  Expediente Clinico - ACTUALIZACION
echo ============================================
echo.
echo  Este script actualiza el sistema SIN tocar
echo  la base de datos ni las credenciales (.env).
echo.

:: Detect where the existing installation is
:: Default: same parent folder (the update folder sits next to the install)
set "TARGET=%~dp0..\ExpedienteClinico"

if not exist "%TARGET%\database\expediente_clinico.db" (
    set "TARGET=%~dp0..\ExpedienteClinico_Win10"
)

if not exist "%TARGET%\database\expediente_clinico.db" (
    echo No se encontro la instalacion automaticamente.
    echo.
    set /p TARGET="Escribe la ruta de tu instalacion (ej. C:\ExpedienteClinico_Win10): "
)

if not exist "%TARGET%\" (
    echo ERROR: No se encontro la carpeta: %TARGET%
    pause
    exit /b 1
)

if not exist "%TARGET%\database\expediente_clinico.db" (
    echo ERROR: No parece ser una instalacion valida.
    echo No se encontro: %TARGET%\database\expediente_clinico.db
    echo.
    echo Si es una instalacion nueva, usa setup.bat en su lugar.
    pause
    exit /b 1
)

echo.
echo  Instalacion encontrada en: %TARGET%
echo.
echo  Se actualizara:
echo    [SI] Frontend (pagina web)
echo    [SI] Backend (servidor)
echo    [SI] Scripts y documentacion
echo    [SI] Dependencias Python
echo    [NO] Base de datos (no se toca)
echo    [NO] Archivo .env (no se toca)
echo    [NO] Entorno virtual (se actualizan deps)
echo.
set /p CONFIRM="Continuar? (S/N): "
if /i not "%CONFIRM%"=="S" (
    echo Actualizacion cancelada.
    pause
    exit /b 0
)

echo.
echo Actualizando...

:: 1. Frontend
if exist "%~dp0static" (
    if exist "%TARGET%\static" rmdir /S /Q "%TARGET%\static"
    xcopy /E /I /Y "%~dp0static" "%TARGET%\static" >nul
    echo  [OK] Frontend actualizado
)

:: 2. Backend (borrar viejo para limpiar archivos eliminados)
if exist "%~dp0backend" (
    if exist "%TARGET%\backend\src" rmdir /S /Q "%TARGET%\backend\src"
    xcopy /E /I /Y "%~dp0backend" "%TARGET%\backend" >nul
    echo  [OK] Backend actualizado
)

:: 3. Scripts
if exist "%~dp0scripts" (
    xcopy /E /I /Y "%~dp0scripts" "%TARGET%\scripts" >nul
    echo  [OK] Scripts actualizados
)

:: 4. Documentation
if exist "%~dp0documentation" (
    xcopy /E /I /Y "%~dp0documentation" "%TARGET%\documentation" >nul
    echo  [OK] Documentacion actualizada
)

:: 5. Requirements + bat files
copy /Y "%~dp0requirements.txt" "%TARGET%\requirements.txt" >nul
echo  [OK] requirements.txt actualizado

if exist "%~dp0run.bat" copy /Y "%~dp0run.bat" "%TARGET%\run.bat" >nul
if exist "%~dp0setup.bat" copy /Y "%~dp0setup.bat" "%TARGET%\setup.bat" >nul
if exist "%~dp0README.txt" copy /Y "%~dp0README.txt" "%TARGET%\README.txt" >nul
if exist "%~dp0.env.example" copy /Y "%~dp0.env.example" "%TARGET%\.env.example" >nul
if exist "%~dp0CONFIGURACION_ENV.txt" copy /Y "%~dp0CONFIGURACION_ENV.txt" "%TARGET%\CONFIGURACION_ENV.txt" >nul
echo  [OK] Archivos de configuracion actualizados

:: 6. Merge new .env variables (add missing ones, don't overwrite existing)
if exist "%TARGET%\.env" (
    if exist "%~dp0.env.example" (
        for /f "usebackq tokens=1,* delims==" %%A in ("%~dp0.env.example") do (
            findstr /B /C:"%%A=" "%TARGET%\.env" >nul 2>&1
            if errorlevel 1 (
                echo %%A=%%B>> "%TARGET%\.env"
                echo  [+] Variable nueva agregada a .env: %%A
            )
        )
    )
)

:: 7. Update Python dependencies
if exist "%TARGET%\.venv\Scripts\activate.bat" (
    echo.
    echo Actualizando dependencias Python...
    call "%TARGET%\.venv\Scripts\activate.bat"
    pip install -r "%TARGET%\requirements.txt" --quiet
    echo  [OK] Dependencias Python actualizadas
) else (
    echo.
    echo  AVISO: No se encontro entorno virtual.
    echo  Ejecuta setup.bat en la carpeta destino para crearlo.
)

echo.
echo ============================================
echo  Actualizacion completada!
echo ============================================
echo.
echo  La base de datos NO fue modificada.
echo  Ejecuta run.bat en %TARGET% para iniciar.
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

    setup_bat = r"""@echo off
chcp 65001 >nul
echo ============================================
echo  Expediente Clinico - Instalacion
echo ============================================
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python no esta instalado.
    echo Descarga desde https://www.python.org/downloads/
    echo IMPORTANTE: Marca "Add Python to PATH"
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

echo Instalando dependencias...
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
echo  Instalacion completada!
echo  Ejecuta: run.bat
echo ============================================
echo.
pause
"""

    readme_update = f"""============================================================
  EXPEDIENTE CLINICO - ACTUALIZACION
  Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M')}
============================================================

Esta carpeta contiene una ACTUALIZACION del sistema.
NO contiene la base de datos (tus datos no se tocan).

COMO ACTUALIZAR:

  1. Copia esta carpeta (ExpedienteClinico_Update) al
     mismo lugar donde esta tu instalacion actual.
     Por ejemplo, si tu instalacion esta en:
       C:\\ExpedienteClinico_Win10\\

     Entonces copia esta carpeta a:
       C:\\ExpedienteClinico_Update\\

  2. CIERRA el programa si esta corriendo (cierra la
     ventana negra).

  3. Haz DOBLE CLIC en "actualizar.bat" dentro de
     esta carpeta.

  4. El script te preguntara si quieres continuar.
     Escribe S y presiona Enter.

  5. Espera a que termine. Veras:
     "Actualizacion completada!"

  6. Abre tu carpeta de instalacion original y
     ejecuta "run.bat" como siempre.

QUE SE ACTUALIZA:
  - Pagina web (frontend)
  - Servidor (backend)
  - Dependencias de Python
  - Scripts y documentacion

QUE NO SE TOCA:
  - Tu base de datos (tus pacientes y consultas)
  - Tu archivo .env (tus credenciales)
  - Variables nuevas de .env se agregan automaticamente

NUEVO - RESPALDOS A LA NUBE:
  Si aun no tienes configurado el archivo .env con las
  credenciales de respaldo, lee CONFIGURACION_ENV.txt
  en tu carpeta de instalacion despues de actualizar.

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
        ("actualizar.bat", actualizar_bat),
        ("run.bat", run_bat),
        ("setup.bat", setup_bat),
        ("README_UPDATE.txt", readme_update),
        ("CONFIGURACION_ENV.txt", config_env_txt),
    ]:
        path = os.path.join(BUILD_DIR, name)
        with open(path, "w", encoding="utf-8", newline="\r\n") as f:
            f.write(content)


def generate_icon():
    print("[5/6] Generando icono...")
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


def main():
    print("=" * 50)
    print(" Empaquetando ACTUALIZACION")
    print(" (sin base de datos)")
    print("=" * 50)

    clean_build()
    build_frontend()
    copy_backend()
    copy_scripts()
    create_actualizar_bat()
    generate_icon()

    # Total size
    total = sum(
        os.path.getsize(os.path.join(dp, f))
        for dp, _, files in os.walk(BUILD_DIR)
        for f in files
    )

    print(f"\n[6/6] Paquete listo: {total / (1024*1024):.1f} MB")
    print()
    print("=" * 50)
    print(f" build/ExpedienteClinico_Update/")
    print()
    print(" Contenido:")
    print("   static/           Frontend compilado")
    print("   backend/          Codigo del servidor")
    print("   scripts/          Migracion")
    print("   documentation/    Assets (encabezado)")
    print("   actualizar.bat    Doble clic para actualizar")
    print("   README_UPDATE.txt Instrucciones para el medico")
    print()
    print(" NO incluye: database/ ni .env")
    print("=" * 50)


if __name__ == "__main__":
    main()
