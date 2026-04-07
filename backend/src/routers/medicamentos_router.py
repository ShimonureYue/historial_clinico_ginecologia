"""Medicamentos (por consulta) CRUD endpoints."""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List

from ..database import get_db
from ..auth import require_permission

router = APIRouter()


class MedicamentoCreate(BaseModel):
    consulta_id: int
    nombre: Optional[str] = None
    presentacion: Optional[str] = None
    dosis: Optional[str] = None
    frecuencia: Optional[str] = None
    duracion: Optional[str] = None
    comentarios: Optional[str] = None


@router.get("/consulta/{consulta_id}")
def list_medicamentos(consulta_id: int, user=Depends(require_permission("consultas", "lectura"))):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM medicamentos WHERE consulta_id=? ORDER BY id",
            (consulta_id,),
        ).fetchall()
        return [dict(r) for r in rows]


@router.post("")
def create_medicamento(data: MedicamentoCreate, user=Depends(require_permission("consultas", "escritura"))):
    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO medicamentos
               (consulta_id, nombre, presentacion, dosis, frecuencia, duracion, comentarios)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (data.consulta_id, data.nombre, data.presentacion, data.dosis,
             data.frecuencia, data.duracion, data.comentarios),
        )
        return {"id": cursor.lastrowid, "message": "Medicamento creado"}


@router.put("/bulk/{consulta_id}")
def bulk_update_medicamentos(consulta_id: int, data: List[MedicamentoCreate], user=Depends(require_permission("consultas", "actualizacion"))):
    """Replace all medicamentos for a consulta."""
    with get_db() as conn:
        conn.execute("DELETE FROM medicamentos WHERE consulta_id=?", (consulta_id,))
        for m in data:
            conn.execute(
                """INSERT INTO medicamentos
                   (consulta_id, nombre, presentacion, dosis, frecuencia, duracion, comentarios)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (consulta_id, m.nombre, m.presentacion, m.dosis,
                 m.frecuencia, m.duracion, m.comentarios),
            )
        return {"message": "Medicamentos actualizados"}


@router.delete("/{medicamento_id}")
def delete_medicamento(medicamento_id: int, user=Depends(require_permission("consultas", "eliminacion"))):
    with get_db() as conn:
        result = conn.execute("DELETE FROM medicamentos WHERE id=?", (medicamento_id,))
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Medicamento no encontrado")
        return {"message": "Medicamento eliminado"}
