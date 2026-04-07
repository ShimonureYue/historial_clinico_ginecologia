"""Interrogatorio por Aparatos y Sistemas CRUD endpoints."""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from ..database import get_db
from ..auth import require_permission

router = APIRouter()

# All boolean fields from interrogatorio_aparatos_sistemas table
_BOOL_FIELDS = [
    "generales_fiebre", "generales_astenia", "generales_adinamia",
    "generales_perdida_peso", "generales_hiporexia", "generales_anorexia",
    "nervioso_cefalea", "nervioso_vertigo", "nervioso_perdida_sensibilidad",
    "nervioso_debilidad", "nervioso_letargo", "nervioso_somnolencia",
    "nervioso_movimientos_anormales", "nervioso_temblores", "nervioso_espasmos_musculares",
    "nervioso_coma", "nervioso_sincope", "nervioso_deficit_marcha",
    "nervioso_ataxia", "nervioso_ceguera", "nervioso_dolor_neurologico",
    "nervioso_alucinaciones_acusticas", "nervioso_alucinaciones_visuales",
    "organos_dolor_ocular", "organos_dolor_auditivo", "organos_perdida_audicion",
    "organos_disnea", "organos_dolor_encias", "organos_sensibilidad_dental",
    "organos_disminucion_agudeza_visual", "organos_disminucion_agudeza_auditiva",
    "organos_hiposmia", "organos_anosmia", "organos_tinitus",
    "cardiovascular_vertigo", "cardiovascular_mareo", "cardiovascular_sincope",
    "cardiovascular_dolor_precordial", "cardiovascular_palpitacion",
    "cardiovascular_disnea", "cardiovascular_edema", "cardiovascular_acufenos",
    "cardiovascular_fosfenos",
    "respiratorio_disnea", "respiratorio_apnea", "respiratorio_tos",
    "respiratorio_sibilancia", "respiratorio_congestion_nasal",
    "respiratorio_dolor_toracico", "respiratorio_hemoptisis",
    "respiratorio_espectoracion", "respiratorio_vomica",
    "gastrointestinal_pirosis", "gastrointestinal_taquifagia",
    "gastrointestinal_alitosis", "gastrointestinal_disfagia",
    "gastrointestinal_onicofagia", "gastrointestinal_vomito",
    "gastrointestinal_rectoragia", "gastrointestinal_melena",
    "gastrointestinal_tenesmo", "gastrointestinal_nauseas",
    "gastrointestinal_distencion_abdominal", "gastrointestinal_hematemesis",
    "gastrointestinal_diarrea", "gastrointestinal_constipacion",
    "gastrointestinal_regurgitacion_esofagica",
    "genitourinario_colico_renal", "genitourinario_disuria",
    "genitourinario_coliuria", "genitourinario_hematuria",
    "genitourinario_anuria", "genitourinario_nicturia",
    "genitourinario_poliuria", "genitourinario_lesiones_genitales",
    "genitourinario_tenesmo_vesical", "genitourinario_pujo",
    "genitourinario_prurito_valvulal",
    "endocrino_dibilidad", "endocrino_fatiga", "endocrino_polifagia",
    "osteomuscular_dolor_maxilar", "osteomuscular_rigidez_articular",
    "osteomuscular_inflamacion_articular", "osteomuscular_debilidad_muscular",
    "osteomuscular_sensibilidad_osea", "osteomuscular_calambres_musculares",
    "osteomuscular_hormigueo", "osteomuscular_sensasion_ardor",
    "osteomuscular_pesadez", "osteomuscular_mialguia", "osteomuscular_artralgias",
    "psicologico_ansiedad", "psicologico_fatiga", "psicologico_panico",
    "psicologico_irritabilidad", "psicologico_insomnio", "psicologico_somnolencia",
    "psicologico_alucinaciones", "psicologico_depresion",
    "tegumentario_prurito_cutaneo", "tegumentario_dolor_urente",
    "tegumentario_hiperestesias", "tegumentario_hipoestesias",
    "tegumentario_disestesia", "tegumentario_rubicundez", "tegumentario_exantemas",
    "tegumentario_clanosis", "tegumentario_ictericia", "tegumentario_hipersensibilidad",
    "hematopoyetico_astenia", "hematopoyetico_vertigo",
    "inmunologico_edema", "inmunologico_urticaria",
]

_COMMENT_FIELDS = [
    "generales_comentarios", "nervioso_comentarios", "organos_comentarios",
    "cardiovascular_comentarios", "respiratorio_comentarios",
    "gastrointestinal_comentarios", "genitourinario_comentarios",
    "endocrino_comentarios", "osteomuscular_comentarios",
    "psicologico_comentarios", "tegumentario_comentarios",
    "hematopoyetico_comentarios", "inmunologico_comentarios",
]

_ALL_FIELDS = _BOOL_FIELDS + _COMMENT_FIELDS


class InterrogatorioCreate(BaseModel):
    consulta_id: int

    class Config:
        extra = "allow"


class InterrogatorioUpdate(BaseModel):
    class Config:
        extra = "allow"


@router.get("/consulta/{consulta_id}")
def get_by_consulta(consulta_id: int, user=Depends(require_permission("consultas", "lectura"))):
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM interrogatorio_aparatos_sistemas WHERE consulta_id=?",
            (consulta_id,),
        ).fetchone()
        if not row:
            return None
        return dict(row)


@router.post("")
def create(data: InterrogatorioCreate, user=Depends(require_permission("consultas", "escritura"))):
    extra = data.model_extra or {}
    with get_db() as conn:
        cols = ["consulta_id"]
        vals = [data.consulta_id]
        for f in _ALL_FIELDS:
            if f in extra:
                cols.append(f)
                vals.append(extra[f])
        placeholders = ", ".join(["?"] * len(cols))
        col_str = ", ".join(cols)
        cursor = conn.execute(
            f"INSERT INTO interrogatorio_aparatos_sistemas ({col_str}) VALUES ({placeholders})",
            vals,
        )
        return {"id": cursor.lastrowid, "message": "Interrogatorio creado"}


@router.put("/{record_id}")
def update(record_id: int, data: InterrogatorioUpdate, user=Depends(require_permission("consultas", "actualizacion"))):
    extra = data.model_extra or {}
    with get_db() as conn:
        set_parts = []
        vals = []
        for f in _ALL_FIELDS:
            if f in extra:
                set_parts.append(f"{f}=?")
                vals.append(extra[f])
        if not set_parts:
            raise HTTPException(status_code=400, detail="No hay campos para actualizar")
        vals.append(record_id)
        result = conn.execute(
            f"UPDATE interrogatorio_aparatos_sistemas SET {', '.join(set_parts)} WHERE id=?",
            vals,
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Registro no encontrado")
        return {"message": "Interrogatorio actualizado"}
