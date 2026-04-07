"""Consultas CRUD endpoints."""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from ..database import get_db
from ..auth import require_permission

router = APIRouter()


class ConsultaCreate(BaseModel):
    paciente_id: int
    fecha: Optional[str] = None
    motivo: Optional[str] = None
    padecimiento_actual: Optional[str] = None
    exploracion_fisica: Optional[str] = None
    diagnostico: Optional[str] = None
    tratamiento: Optional[str] = None
    estudios: Optional[str] = None
    notas_adicionales: Optional[str] = None
    # Signos vitales
    talla: Optional[str] = None
    peso: Optional[str] = None
    temperatura: Optional[str] = None
    frecuencia_respiratoria: Optional[str] = None
    frecuencia_cardiaca: Optional[str] = None
    presion_arterial: Optional[str] = None
    saturacion: Optional[str] = None
    fondo_uterino: Optional[str] = None
    frecuencia_cardiaca_fetal: Optional[str] = None
    # Exploración por regiones
    craneo: Optional[str] = None
    cuello: Optional[str] = None
    torax: Optional[str] = None
    abdomen: Optional[str] = None
    extremidades: Optional[str] = None
    genitales: Optional[str] = None
    movimientos_fetales: Optional[str] = None
    otros: Optional[str] = None


def _enrich_consulta(conn, consulta: dict) -> dict:
    """Add patient name, signos vitales, medicamentos, and colposcopia to a consulta dict."""
    pac = conn.execute(
        "SELECT nombre, a_paterno, a_materno, fecha_nacimiento, genero FROM pacientes WHERE id=?",
        (consulta["paciente_id"],),
    ).fetchone()
    if pac:
        consulta["paciente_nombre"] = f"{pac['nombre']} {pac['a_paterno']} {pac['a_materno'] or ''}".strip()
        consulta["paciente_fecha_nacimiento"] = pac["fecha_nacimiento"]
        consulta["paciente_genero"] = pac["genero"]

    signos = conn.execute(
        "SELECT * FROM signos_vitales WHERE consulta_id=?",
        (consulta["id"],),
    ).fetchone()
    consulta["signos_vitales"] = dict(signos) if signos else None

    medicamentos = conn.execute(
        "SELECT * FROM medicamentos WHERE consulta_id=? ORDER BY id",
        (consulta["id"],),
    ).fetchall()
    consulta["medicamentos"] = [dict(m) for m in medicamentos]

    colpo = conn.execute(
        "SELECT * FROM colposcopias WHERE consulta_id=?",
        (consulta["id"],),
    ).fetchone()
    if colpo:
        from ..utils.s3 import generate_presigned_url
        colpo_dict = dict(colpo)
        for i in range(1, 6):
            key = colpo_dict.get(f"foto_{i}")
            colpo_dict[f"foto_{i}_url"] = generate_presigned_url(key) if key else None
        consulta["colposcopia"] = colpo_dict
    else:
        consulta["colposcopia"] = None

    return consulta


@router.get("")
def list_consultas(
    search: str = "",
    page: int = 1,
    limit: int = 50,
    user=Depends(require_permission("consultas", "lectura")),
):
    offset = (page - 1) * limit
    with get_db() as conn:
        if search:
            q = f"%{search}%"
            count = conn.execute(
                """SELECT COUNT(*) FROM consultas c
                   LEFT JOIN pacientes p ON p.id = c.paciente_id
                   WHERE c.motivo LIKE ? OR c.diagnostico LIKE ?
                   OR c.created_at LIKE ?
                   OR (p.nombre || ' ' || COALESCE(p.a_paterno,'') || ' ' || COALESCE(p.a_materno,'')) LIKE ?""",
                (q, q, q, q),
            ).fetchone()[0]
            rows = conn.execute(
                """SELECT c.* FROM consultas c
                   LEFT JOIN pacientes p ON p.id = c.paciente_id
                   WHERE c.motivo LIKE ? OR c.diagnostico LIKE ?
                   OR c.created_at LIKE ?
                   OR (p.nombre || ' ' || COALESCE(p.a_paterno,'') || ' ' || COALESCE(p.a_materno,'')) LIKE ?
                   ORDER BY c.created_at DESC LIMIT ? OFFSET ?""",
                (q, q, q, q, limit, offset),
            ).fetchall()
        else:
            count = conn.execute("SELECT COUNT(*) FROM consultas").fetchone()[0]
            rows = conn.execute(
                "SELECT * FROM consultas ORDER BY created_at DESC LIMIT ? OFFSET ?",
                (limit, offset),
            ).fetchall()
        results = [_enrich_consulta(conn, dict(r)) for r in rows]
        return {"data": results, "total": count, "page": page, "limit": limit}


@router.get("/paciente/{paciente_id}")
def list_consultas_by_paciente(paciente_id: int, user=Depends(require_permission("consultas", "lectura"))):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM consultas WHERE paciente_id=? ORDER BY created_at DESC",
            (paciente_id,),
        ).fetchall()
        return [_enrich_consulta(conn, dict(r)) for r in rows]


@router.get("/{consulta_id}")
def get_consulta(consulta_id: int, user=Depends(require_permission("consultas", "lectura"))):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM consultas WHERE id=?", (consulta_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Consulta no encontrada")
        return _enrich_consulta(conn, dict(row))


@router.post("")
def create_consulta(data: ConsultaCreate, user=Depends(require_permission("consultas", "escritura"))):
    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO consultas (paciente_id, fecha, motivo, padecimiento_actual,
               exploracion_fisica, diagnostico, tratamiento, estudios, notas_adicionales)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (data.paciente_id, data.fecha, data.motivo, data.padecimiento_actual,
             data.exploracion_fisica, data.diagnostico, data.tratamiento,
             data.estudios, data.notas_adicionales),
        )
        consulta_id = cursor.lastrowid

        conn.execute(
            """INSERT INTO signos_vitales
               (consulta_id, talla, peso, temperatura, frecuencia_respiratoria,
                frecuencia_cardiaca, presion_arterial, saturacion,
                fondo_uterino, frecuencia_cardiaca_fetal,
                craneo, cuello, torax, abdomen, extremidades, genitales,
                movimientos_fetales, otros)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (consulta_id, data.talla, data.peso, data.temperatura,
             data.frecuencia_respiratoria, data.frecuencia_cardiaca,
             data.presion_arterial, data.saturacion,
             data.fondo_uterino, data.frecuencia_cardiaca_fetal,
             data.craneo, data.cuello, data.torax, data.abdomen,
             data.extremidades, data.genitales,
             data.movimientos_fetales, data.otros),
        )
        return {"id": consulta_id, "message": "Consulta creada"}


@router.put("/{consulta_id}")
def update_consulta(consulta_id: int, data: ConsultaCreate, user=Depends(require_permission("consultas", "actualizacion"))):
    with get_db() as conn:
        result = conn.execute(
            """UPDATE consultas SET paciente_id=?, fecha=?, motivo=?, padecimiento_actual=?,
               exploracion_fisica=?, diagnostico=?, tratamiento=?, estudios=?,
               notas_adicionales=?
               WHERE id=?""",
            (data.paciente_id, data.fecha, data.motivo, data.padecimiento_actual,
             data.exploracion_fisica, data.diagnostico, data.tratamiento,
             data.estudios, data.notas_adicionales, consulta_id),
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Consulta no encontrada")

        conn.execute("DELETE FROM signos_vitales WHERE consulta_id=?", (consulta_id,))
        conn.execute(
            """INSERT INTO signos_vitales
               (consulta_id, talla, peso, temperatura, frecuencia_respiratoria,
                frecuencia_cardiaca, presion_arterial, saturacion,
                fondo_uterino, frecuencia_cardiaca_fetal,
                craneo, cuello, torax, abdomen, extremidades, genitales,
                movimientos_fetales, otros)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (consulta_id, data.talla, data.peso, data.temperatura,
             data.frecuencia_respiratoria, data.frecuencia_cardiaca,
             data.presion_arterial, data.saturacion,
             data.fondo_uterino, data.frecuencia_cardiaca_fetal,
             data.craneo, data.cuello, data.torax, data.abdomen,
             data.extremidades, data.genitales,
             data.movimientos_fetales, data.otros),
        )
        return {"message": "Consulta actualizada"}


@router.delete("/{consulta_id}")
def delete_consulta(consulta_id: int, user=Depends(require_permission("consultas", "eliminacion"))):
    with get_db() as conn:
        result = conn.execute("DELETE FROM consultas WHERE id=?", (consulta_id,))
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Consulta no encontrada")
        return {"message": "Consulta eliminada"}
