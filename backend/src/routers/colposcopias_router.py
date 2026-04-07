"""Colposcopias CRUD + S3 image upload + PDF generation endpoints."""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from ..database import get_db
from ..auth import require_permission
from ..utils.s3 import upload_file_to_s3, generate_presigned_url

router = APIRouter()


class ColposcopiaCreate(BaseModel):
    consulta_id: int
    detalle: Optional[str] = None
    comentario_1: Optional[str] = None
    comentario_2: Optional[str] = None
    comentario_3: Optional[str] = None
    comentario_4: Optional[str] = None
    comentario_5: Optional[str] = None
    # Hallazgos Colposcopicos
    hc_cervix: Optional[str] = None
    hc_colposcopia: Optional[str] = None
    hc_epitelio_acetoblanco: Optional[str] = None
    hc_puntilleo: Optional[str] = None
    hc_mosaico: Optional[str] = None
    hc_vasos_atipicos: Optional[str] = None
    hc_tumor: Optional[str] = None
    hc_localizacion_lesion: Optional[str] = None
    hc_extension_fondos_saco: Optional[str] = None
    hc_metaplasia: Optional[str] = None
    hc_eversion_glandular: Optional[str] = None
    hc_atrofia_epitelial: Optional[str] = None
    hc_reaccion_inflamatoria: Optional[str] = None
    hc_exudado_vaginal: Optional[str] = None
    hc_add: Optional[str] = None
    hc_diagnostico_colposcopico: Optional[str] = None


@router.get("/consulta/{consulta_id}")
def get_by_consulta(consulta_id: int, user=Depends(require_permission("consultas", "lectura"))):
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM colposcopias WHERE consulta_id=?", (consulta_id,)
        ).fetchone()
        if not row:
            return None
        result = dict(row)
        # Inject presigned URLs for images
        for i in range(1, 6):
            key = result.get(f"foto_{i}")
            result[f"foto_{i}_url"] = generate_presigned_url(key) if key else None
        return result


@router.post("")
def create_colposcopia(data: ColposcopiaCreate, user=Depends(require_permission("consultas", "escritura"))):
    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM colposcopias WHERE consulta_id=?", (data.consulta_id,)
        ).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Ya existe una colposcopía para esta consulta")
        cursor = conn.execute(
            """INSERT INTO colposcopias (consulta_id, detalle,
               comentario_1, comentario_2, comentario_3, comentario_4, comentario_5,
               hc_cervix, hc_colposcopia, hc_epitelio_acetoblanco, hc_puntilleo,
               hc_mosaico, hc_vasos_atipicos, hc_tumor, hc_localizacion_lesion,
               hc_extension_fondos_saco, hc_metaplasia, hc_eversion_glandular,
               hc_atrofia_epitelial, hc_reaccion_inflamatoria, hc_exudado_vaginal,
               hc_add, hc_diagnostico_colposcopico)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (data.consulta_id, data.detalle,
             data.comentario_1, data.comentario_2, data.comentario_3,
             data.comentario_4, data.comentario_5,
             data.hc_cervix, data.hc_colposcopia, data.hc_epitelio_acetoblanco,
             data.hc_puntilleo, data.hc_mosaico, data.hc_vasos_atipicos, data.hc_tumor,
             data.hc_localizacion_lesion, data.hc_extension_fondos_saco, data.hc_metaplasia,
             data.hc_eversion_glandular, data.hc_atrofia_epitelial, data.hc_reaccion_inflamatoria,
             data.hc_exudado_vaginal, data.hc_add, data.hc_diagnostico_colposcopico),
        )
        return {"id": cursor.lastrowid, "message": "Colposcopía creada"}


@router.put("/{colpo_id}")
def update_colposcopia(colpo_id: int, data: ColposcopiaCreate, user=Depends(require_permission("consultas", "actualizacion"))):
    with get_db() as conn:
        result = conn.execute(
            """UPDATE colposcopias SET detalle=?,
               comentario_1=?, comentario_2=?, comentario_3=?, comentario_4=?, comentario_5=?,
               hc_cervix=?, hc_colposcopia=?, hc_epitelio_acetoblanco=?, hc_puntilleo=?,
               hc_mosaico=?, hc_vasos_atipicos=?, hc_tumor=?, hc_localizacion_lesion=?,
               hc_extension_fondos_saco=?, hc_metaplasia=?, hc_eversion_glandular=?,
               hc_atrofia_epitelial=?, hc_reaccion_inflamatoria=?, hc_exudado_vaginal=?,
               hc_add=?, hc_diagnostico_colposcopico=?
               WHERE id=?""",
            (data.detalle,
             data.comentario_1, data.comentario_2, data.comentario_3,
             data.comentario_4, data.comentario_5,
             data.hc_cervix, data.hc_colposcopia, data.hc_epitelio_acetoblanco,
             data.hc_puntilleo, data.hc_mosaico, data.hc_vasos_atipicos, data.hc_tumor,
             data.hc_localizacion_lesion, data.hc_extension_fondos_saco, data.hc_metaplasia,
             data.hc_eversion_glandular, data.hc_atrofia_epitelial, data.hc_reaccion_inflamatoria,
             data.hc_exudado_vaginal, data.hc_add, data.hc_diagnostico_colposcopico,
             colpo_id),
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Colposcopía no encontrada")
        return {"message": "Colposcopía actualizada"}


@router.post("/{colpo_id}/upload/{foto_num}")
async def upload_colpo_image(
    colpo_id: int,
    foto_num: int,
    file: UploadFile = File(...),
    user=Depends(require_permission("consultas", "escritura")),
):
    """Upload a single image (foto_1 through foto_5) for a colposcopia."""
    if foto_num < 1 or foto_num > 5:
        raise HTTPException(status_code=400, detail="foto_num debe ser entre 1 y 5")

    with get_db() as conn:
        colpo = conn.execute("SELECT * FROM colposcopias WHERE id=?", (colpo_id,)).fetchone()
        if not colpo:
            raise HTTPException(status_code=404, detail="Colposcopía no encontrada")

        object_name = f"uploads/colposcopia/COL{colpo_id}-foto_{foto_num}-{file.filename}"
        s3_key = upload_file_to_s3(file, object_name)

        if not s3_key:
            raise HTTPException(status_code=500, detail="Error al subir imagen a S3")

        conn.execute(
            f"UPDATE colposcopias SET foto_{foto_num}=? WHERE id=?",
            (s3_key, colpo_id),
        )

        url = generate_presigned_url(s3_key)
        return {"s3_key": s3_key, "url": url, "message": f"Imagen foto_{foto_num} subida"}


@router.delete("/{colpo_id}/image/{foto_num}")
def delete_colpo_image(
    colpo_id: int,
    foto_num: int,
    user=Depends(require_permission("consultas", "actualizacion")),
):
    """Remove an image reference from a colposcopia."""
    if foto_num < 1 or foto_num > 5:
        raise HTTPException(status_code=400, detail="foto_num debe ser entre 1 y 5")

    with get_db() as conn:
        conn.execute(
            f"UPDATE colposcopias SET foto_{foto_num}=NULL WHERE id=?",
            (colpo_id,),
        )
        return {"message": f"Imagen foto_{foto_num} eliminada"}


@router.get("/{colpo_id}/pdf")
def generate_colposcopy_pdf(colpo_id: int, user=Depends(require_permission("consultas", "lectura"))):
    """Generate and return a colposcopy PDF report."""
    from ..utils.pdf import create_colposcopy_pdf

    with get_db() as conn:
        colpo = conn.execute("SELECT * FROM colposcopias WHERE id=?", (colpo_id,)).fetchone()
        if not colpo:
            raise HTTPException(status_code=404, detail="Colposcopía no encontrada")
        colpo_dict = dict(colpo)

        consulta = conn.execute("SELECT * FROM consultas WHERE id=?", (colpo_dict["consulta_id"],)).fetchone()
        if not consulta:
            raise HTTPException(status_code=404, detail="Consulta no encontrada")
        consulta_dict = dict(consulta)

        paciente = conn.execute("SELECT * FROM pacientes WHERE id=?", (consulta_dict["paciente_id"],)).fetchone()
        if not paciente:
            raise HTTPException(status_code=404, detail="Paciente no encontrado")
        paciente_dict = dict(paciente)

        image_urls = {}
        for i in range(1, 6):
            key = colpo_dict.get(f"foto_{i}")
            image_urls[f"foto_{i}_url"] = generate_presigned_url(key) if key else None

    buffer = create_colposcopy_pdf(consulta_dict, paciente_dict, colpo_dict, image_urls)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=colposcopia_{colpo_id}.pdf"},
    )
