"""Antecedentes No Patológicos CRUD endpoints."""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from ..database import get_db
from ..auth import require_permission

router = APIRouter()


class AntecedentePNPCreate(BaseModel):
    paciente_id: int
    nivel_socioeconomico: Optional[str] = None
    vivienda_tipo: Optional[str] = None
    vivienda_renta: Optional[str] = None
    vivienda_agua: Optional[str] = None
    vivienda_luz: Optional[str] = None
    vivienda_drenaje: Optional[str] = None
    vivienda_habitantes: Optional[str] = None
    vivienda_habitaciones: Optional[str] = None
    vivienda_zoonosis: Optional[str] = None
    vivienda_plagas: Optional[str] = None
    vivienda_hacinamiento: Optional[str] = None
    vivienda_descripcion: Optional[str] = None
    alimentacion_calidad: Optional[str] = None
    alimentacion_descripcion: Optional[str] = None
    alimentacion_intolerancia: Optional[str] = None
    deportes_cuales: Optional[str] = None
    deportes_frecuencia: Optional[str] = None
    sueno_descripcion: Optional[str] = None
    toxicomanias_alcohol: Optional[str] = None
    toxicomanias_alcohol_inicio: Optional[str] = None
    toxicomanias_alcohol_frecuencia: Optional[str] = None
    toxicomanias_alcohol_descripcion: Optional[str] = None
    toxicomanias_tabaco: Optional[str] = None
    toxicomanias_tabaco_inicio: Optional[str] = None
    toxicomanias_tabaco_frecuencia: Optional[str] = None
    toxicomanias_tabaco_descripcion: Optional[str] = None
    toxicomanias_drogas: Optional[str] = None
    toxicomanias_drogas_inicio: Optional[str] = None
    toxicomanias_drogas_frecuencia: Optional[str] = None
    toxicomanias_drogas_descripcion: Optional[str] = None


class AntecedentePNPUpdate(BaseModel):
    nivel_socioeconomico: Optional[str] = None
    vivienda_tipo: Optional[str] = None
    vivienda_renta: Optional[str] = None
    vivienda_agua: Optional[str] = None
    vivienda_luz: Optional[str] = None
    vivienda_drenaje: Optional[str] = None
    vivienda_habitantes: Optional[str] = None
    vivienda_habitaciones: Optional[str] = None
    vivienda_zoonosis: Optional[str] = None
    vivienda_plagas: Optional[str] = None
    vivienda_hacinamiento: Optional[str] = None
    vivienda_descripcion: Optional[str] = None
    alimentacion_calidad: Optional[str] = None
    alimentacion_descripcion: Optional[str] = None
    alimentacion_intolerancia: Optional[str] = None
    deportes_cuales: Optional[str] = None
    deportes_frecuencia: Optional[str] = None
    sueno_descripcion: Optional[str] = None
    toxicomanias_alcohol: Optional[str] = None
    toxicomanias_alcohol_inicio: Optional[str] = None
    toxicomanias_alcohol_frecuencia: Optional[str] = None
    toxicomanias_alcohol_descripcion: Optional[str] = None
    toxicomanias_tabaco: Optional[str] = None
    toxicomanias_tabaco_inicio: Optional[str] = None
    toxicomanias_tabaco_frecuencia: Optional[str] = None
    toxicomanias_tabaco_descripcion: Optional[str] = None
    toxicomanias_drogas: Optional[str] = None
    toxicomanias_drogas_inicio: Optional[str] = None
    toxicomanias_drogas_frecuencia: Optional[str] = None
    toxicomanias_drogas_descripcion: Optional[str] = None


_FIELDS = [
    "nivel_socioeconomico", "vivienda_tipo", "vivienda_renta", "vivienda_agua",
    "vivienda_luz", "vivienda_drenaje", "vivienda_habitantes", "vivienda_habitaciones",
    "vivienda_zoonosis", "vivienda_plagas", "vivienda_hacinamiento", "vivienda_descripcion",
    "alimentacion_calidad", "alimentacion_descripcion", "alimentacion_intolerancia",
    "deportes_cuales", "deportes_frecuencia", "sueno_descripcion",
    "toxicomanias_alcohol", "toxicomanias_alcohol_inicio", "toxicomanias_alcohol_frecuencia",
    "toxicomanias_alcohol_descripcion", "toxicomanias_tabaco", "toxicomanias_tabaco_inicio",
    "toxicomanias_tabaco_frecuencia", "toxicomanias_tabaco_descripcion",
    "toxicomanias_drogas", "toxicomanias_drogas_inicio", "toxicomanias_drogas_frecuencia",
    "toxicomanias_drogas_descripcion",
]


@router.get("/paciente/{paciente_id}")
def get_by_paciente(paciente_id: int, user=Depends(require_permission("antecedentes_pnp", "lectura"))):
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM antecedentes_no_patologicos WHERE paciente_id=?",
            (paciente_id,),
        ).fetchone()
        if not row:
            return None
        return dict(row)


@router.post("")
def create(data: AntecedentePNPCreate, user=Depends(require_permission("antecedentes_pnp", "escritura"))):
    with get_db() as conn:
        placeholders = ", ".join(["?"] * (len(_FIELDS) + 1))
        cols = ", ".join(["paciente_id"] + _FIELDS)
        values = [data.paciente_id] + [getattr(data, f) for f in _FIELDS]
        cursor = conn.execute(
            f"INSERT INTO antecedentes_no_patologicos ({cols}) VALUES ({placeholders})",
            values,
        )
        return {"id": cursor.lastrowid, "message": "Antecedentes no patológicos creados"}


@router.put("/{record_id}")
def update(record_id: int, data: AntecedentePNPUpdate, user=Depends(require_permission("antecedentes_pnp", "actualizacion"))):
    with get_db() as conn:
        set_clause = ", ".join([f"{f}=?" for f in _FIELDS])
        values = [getattr(data, f) for f in _FIELDS] + [record_id]
        result = conn.execute(
            f"UPDATE antecedentes_no_patologicos SET {set_clause} WHERE id=?",
            values,
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Registro no encontrado")
        return {"message": "Antecedentes no patológicos actualizados"}
