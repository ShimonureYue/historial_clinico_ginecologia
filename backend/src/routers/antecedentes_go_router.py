"""Antecedentes Gineco-Obstétricos CRUD endpoints."""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from ..database import get_db
from ..auth import require_permission

router = APIRouter()


class AntecedenteGOCreate(BaseModel):
    paciente_id: int
    gravidez: Optional[str] = None
    partos: Optional[str] = None
    vaginales: Optional[str] = None
    cesareas: Optional[str] = None
    abortos: Optional[str] = None
    ectopicos: Optional[str] = None
    nacidos_vivos: Optional[str] = None
    nacidos_muertos: Optional[str] = None
    menarca: Optional[str] = None
    menopausia: Optional[str] = None
    ultima_regla: Optional[str] = None
    ultimo_parto: Optional[str] = None
    ultima_citologia: Optional[str] = None
    citologia_comentarios: Optional[str] = None
    ciclos_menstruales: Optional[str] = None
    actividad_sexual: Optional[str] = None
    metodo_planificacion: Optional[str] = None
    patologias_relacionadas_embarazo: Optional[str] = None
    fecha_proxima_parto: Optional[str] = None


class AntecedenteGOUpdate(BaseModel):
    gravidez: Optional[str] = None
    partos: Optional[str] = None
    vaginales: Optional[str] = None
    cesareas: Optional[str] = None
    abortos: Optional[str] = None
    ectopicos: Optional[str] = None
    nacidos_vivos: Optional[str] = None
    nacidos_muertos: Optional[str] = None
    menarca: Optional[str] = None
    menopausia: Optional[str] = None
    ultima_regla: Optional[str] = None
    ultimo_parto: Optional[str] = None
    ultima_citologia: Optional[str] = None
    citologia_comentarios: Optional[str] = None
    ciclos_menstruales: Optional[str] = None
    actividad_sexual: Optional[str] = None
    metodo_planificacion: Optional[str] = None
    patologias_relacionadas_embarazo: Optional[str] = None
    fecha_proxima_parto: Optional[str] = None


_FIELDS = [
    "gravidez", "partos", "vaginales", "cesareas", "abortos", "ectopicos",
    "nacidos_vivos", "nacidos_muertos", "menarca", "menopausia",
    "ultima_regla", "ultimo_parto", "ultima_citologia", "citologia_comentarios",
    "ciclos_menstruales", "actividad_sexual", "metodo_planificacion",
    "patologias_relacionadas_embarazo", "fecha_proxima_parto",
]


@router.get("/paciente/{paciente_id}")
def get_by_paciente(paciente_id: int, user=Depends(require_permission("antecedentes_go", "lectura"))):
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM antecedentes_ginecoobstetricos WHERE paciente_id=?",
            (paciente_id,),
        ).fetchone()
        if not row:
            return None
        return dict(row)


@router.post("")
def create(data: AntecedenteGOCreate, user=Depends(require_permission("antecedentes_go", "escritura"))):
    with get_db() as conn:
        placeholders = ", ".join(["?"] * (len(_FIELDS) + 1))
        cols = ", ".join(["paciente_id"] + _FIELDS)
        values = [data.paciente_id] + [getattr(data, f) for f in _FIELDS]
        cursor = conn.execute(
            f"INSERT INTO antecedentes_ginecoobstetricos ({cols}) VALUES ({placeholders})",
            values,
        )
        return {"id": cursor.lastrowid, "message": "Antecedentes gineco-obstétricos creados"}


@router.put("/{record_id}")
def update(record_id: int, data: AntecedenteGOUpdate, user=Depends(require_permission("antecedentes_go", "actualizacion"))):
    with get_db() as conn:
        set_clause = ", ".join([f"{f}=?" for f in _FIELDS])
        values = [getattr(data, f) for f in _FIELDS] + [record_id]
        result = conn.execute(
            f"UPDATE antecedentes_ginecoobstetricos SET {set_clause} WHERE id=?",
            values,
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Registro no encontrado")
        return {"message": "Antecedentes gineco-obstétricos actualizados"}
