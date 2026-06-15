# Instructivo de actualización — Expediente Clínico (Ginecología)

Esta actualización corrige varios errores. **No toca la base de datos** (pacientes,
consultas, etc.) ni las credenciales: solo reemplaza el programa por la versión corregida.

Tiempo estimado: **2–3 minutos**.

---

## ¿Qué se corrige en esta versión?

- **Pacientes y consultas eliminados ya no reaparecen.** Antes, los registros que se
  habían eliminado seguían apareciendo en los listados y búsquedas, aunque el tablero
  (dashboard) ya no los contaba. Ahora el listado y el tablero coinciden.
- **Mejoras de seguridad en el servidor** (protección contra accesos a archivos indebidos).
- **Gestión de usuarios más robusta**: mensajes de error correctos al crear o editar
  usuarios (ya no dice "correo duplicado" cuando el problema es otro) y aviso claro si
  se intenta editar un usuario que no existe.

---

## Antes de empezar (recomendado)

1. **Haz un respaldo** por si acaso. Dos opciones:
   - Dentro del sistema, entra a **Respaldos** y crea uno (si ya lo tienes configurado), **o**
   - Copia y pega la carpeta `database` de tu instalación a otro lugar (ej. al Escritorio).
2. **Cierra el sistema** si está abierto (cierra la ventana negra del servidor).

> La actualización **no borra ni modifica** tu base de datos, pero un respaldo nunca está de más.

---

## Pasos para actualizar (Windows)

1. **Copia** la carpeta `ExpedienteClinico_Update` **al mismo lugar** donde está tu
   instalación actual (la carpeta que contiene tu base de datos).

   Ejemplo: si tu sistema está en `C:\ExpedienteClinico_Win10\`,
   copia la carpeta de actualización a `C:\ExpedienteClinico_Update\`
   (que quede **al lado**, no dentro).

2. Abre la carpeta `ExpedienteClinico_Update` y haz **doble clic en `actualizar.bat`**.

3. El script encuentra tu instalación automáticamente. Si te pregunta, escribe **S** y
   presiona **Enter** para continuar.

4. Espera a que aparezca **"Actualización completada!"**.

5. Ve a tu carpeta de instalación original y abre **`run.bat`** como siempre.

¡Listo! El sistema ya tiene las correcciones.

---

## ¿Cómo sé que funcionó?

- El sistema abre normal con `run.bat`.
- Un paciente o consulta que hayas eliminado **ya no aparece** en los listados ni en la búsqueda.
- Tus pacientes y consultas siguen ahí (no se perdió nada).

## Si algo sale mal

- El `actualizar.bat` **no toca la base de datos**, así que tus datos están a salvo.
- Si el sistema no abre, vuelve a ejecutar `setup.bat` en tu carpeta de instalación y
  luego `run.bat`.
- Si tienes el respaldo del paso previo, puedes restaurar la carpeta `database`.

---

*Para soporte, comparte la ventana de error (la ventana negra) con quien te envió esta actualización.*
