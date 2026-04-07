"""Antecedentes Heredo Familiares CRUD endpoints."""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from ..database import get_db
from ..auth import require_permission

router = APIRouter()


class AntecedenteHFCreate(BaseModel):
    paciente_id: int
    tuberculosis: Optional[int] = 0
    diabetes_mellitus: Optional[int] = 0
    hipertencion: Optional[int] = 0
    carcinomas: Optional[int] = 0
    cardiopatias: Optional[int] = 0
    hepatopatias: Optional[int] = 0
    nefropatias: Optional[int] = 0
    enfermedades_endocrinas: Optional[int] = 0
    enfermedades_mentales: Optional[int] = 0
    epilepsia: Optional[int] = 0
    asma: Optional[int] = 0
    enfermedades_hematologicas: Optional[int] = 0
    sifilis: Optional[int] = 0
    abuelo_paterno: Optional[str] = None
    abuela_paterno: Optional[str] = None
    abuelo_materno: Optional[str] = None
    abuela_materno: Optional[str] = None
    padre: Optional[str] = None
    madre: Optional[str] = None
    hermanos: Optional[str] = None
    otros_familiares: Optional[str] = None
    comentarios: Optional[str] = None


class AntecedenteHFUpdate(BaseModel):
    tuberculosis: Optional[int] = 0
    diabetes_mellitus: Optional[int] = 0
    hipertencion: Optional[int] = 0
    carcinomas: Optional[int] = 0
    cardiopatias: Optional[int] = 0
    hepatopatias: Optional[int] = 0
    nefropatias: Optional[int] = 0
    enfermedades_endocrinas: Optional[int] = 0
    enfermedades_mentales: Optional[int] = 0
    epilepsia: Optional[int] = 0
    asma: Optional[int] = 0
    enfermedades_hematologicas: Optional[int] = 0
    sifilis: Optional[int] = 0
    abuelo_paterno: Optional[str] = None
    abuela_paterno: Optional[str] = None
    abuelo_materno: Optional[str] = None
    abuela_materno: Optional[str] = None
    padre: Optional[str] = None
    madre: Optional[str] = None
    hermanos: Optional[str] = None
    otros_familiares: Optional[str] = None
    comentarios: Optional[str] = None


_FIELDS = [
    "tuberculosis", "diabetes_mellitus", "hipertencion", "carcinomas",
    "cardiopatias", "hepatopatias", "nefropatias", "enfermedades_endocrinas",
    "enfermedades_mentales", "epilepsia", "asma", "enfermedades_hematologicas",
    "sifilis", "abuelo_paterno", "abuela_paterno", "abuelo_materno",
    "abuela_materno", "padre", "madre", "hermanos", "otros_familiares", "comentarios",
]


@router.get("/paciente/{paciente_id}")
def get_by_paciente(paciente_id: int, user=Depends(require_permission("antecedentes_hf", "lectura"))):
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM antecedentes_heredofamiliares WHERE paciente_id=?",
            (paciente_id,),
        ).fetchone()
        if not row:
            return None
        return dict(row)


@router.post("")
def create(data: AntecedenteHFCreate, user=Depends(require_permission("antecedentes_hf", "escritura"))):
    with get_db() as conn:
        placeholders = ", ".join(["?"] * (len(_FIELDS) + 1))
        cols = ", ".join(["paciente_id"] + _FIELDS)
        values = [data.paciente_id] + [getattr(data, f) for f in _FIELDS]
        cursor = conn.execute(
            f"INSERT INTO antecedentes_heredofamiliares ({cols}) VALUES ({placeholders})",
            values,
        )
        return {"id": cursor.lastrowid, "message": "Antecedentes heredo familiares creados"}


@router.put("/{record_id}")
def update(record_id: int, data: AntecedenteHFUpdate, user=Depends(require_permission("antecedentes_hf", "actualizacion"))):
    with get_db() as conn:
        set_clause = ", ".join([f"{f}=?" for f in _FIELDS])
        values = [getattr(data, f) for f in _FIELDS] + [record_id]
        result = conn.execute(
            f"UPDATE antecedentes_heredofamiliares SET {set_clause} WHERE id=?",
            values,
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Registro no encontrado")
        return {"message": "Antecedentes heredo familiares actualizados"}
