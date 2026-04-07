"""Pacientes CRUD endpoints."""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from ..database import get_db
from ..auth import require_permission

router = APIRouter()


class PacienteCreate(BaseModel):
    nombre: Optional[str] = None
    a_paterno: Optional[str] = None
    a_materno: Optional[str] = None
    email: Optional[str] = None
    curp: Optional[str] = None
    fecha_nacimiento: Optional[str] = None
    genero: Optional[str] = None
    fotografia: Optional[str] = None


class DireccionData(BaseModel):
    telefono: Optional[str] = None
    celular: Optional[str] = None
    calle: Optional[str] = None
    numero_int: Optional[str] = None
    numero_ext: Optional[str] = None
    codigo_postal: Optional[str] = None
    colonia: Optional[str] = None
    municipio: Optional[str] = None
    estado: Optional[str] = None
    ciudad: Optional[str] = None


class PacienteFullCreate(BaseModel):
    paciente: PacienteCreate
    direccion: Optional[DireccionData] = None


@router.get("")
def list_pacientes(
    search: str = "",
    page: int = 1,
    limit: int = 50,
    user=Depends(require_permission("pacientes", "lectura")),
):
    offset = (page - 1) * limit
    with get_db() as conn:
        if search:
            q = f"%{search}%"
            where = """WHERE (p.nombre || ' ' || COALESCE(p.a_paterno,'') || ' ' || COALESCE(p.a_materno,'')) LIKE ?
                   OR p.nombre LIKE ? OR p.a_paterno LIKE ?
                   OR p.a_materno LIKE ? OR CAST(p.id AS TEXT) LIKE ?
                   OR p.curp LIKE ?"""
            params = (q, q, q, q, q, q)
            count = conn.execute(
                f"SELECT COUNT(*) FROM pacientes p {where}", params,
            ).fetchone()[0]
            rows = conn.execute(
                f"""SELECT p.*, d.telefono, d.celular, d.ciudad, d.estado
                    FROM pacientes p
                    LEFT JOIN direcciones d ON d.paciente_id = p.id
                    {where}
                    ORDER BY p.created_at DESC LIMIT ? OFFSET ?""",
                (*params, limit, offset),
            ).fetchall()
        else:
            count = conn.execute("SELECT COUNT(*) FROM pacientes").fetchone()[0]
            rows = conn.execute(
                """SELECT p.*, d.telefono, d.celular, d.ciudad, d.estado
                   FROM pacientes p
                   LEFT JOIN direcciones d ON d.paciente_id = p.id
                   ORDER BY p.created_at DESC LIMIT ? OFFSET ?""",
                (limit, offset),
            ).fetchall()
        return {"data": [dict(r) for r in rows], "total": count, "page": page, "limit": limit}


@router.get("/{paciente_id}")
def get_paciente(paciente_id: int, user=Depends(require_permission("pacientes", "lectura"))):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM pacientes WHERE id = ?", (paciente_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Paciente no encontrado")
        result = dict(row)
        direccion = conn.execute(
            "SELECT * FROM direcciones WHERE paciente_id = ?", (paciente_id,)
        ).fetchone()
        result["direccion"] = dict(direccion) if direccion else None
        return result


@router.post("")
def create_paciente(data: PacienteFullCreate, user=Depends(require_permission("pacientes", "escritura"))):
    p = data.paciente
    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO pacientes (nombre, a_paterno, a_materno, email, curp,
               fecha_nacimiento, genero, fotografia)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (p.nombre, p.a_paterno, p.a_materno, p.email, p.curp,
             p.fecha_nacimiento, p.genero, p.fotografia),
        )
        paciente_id = cursor.lastrowid
        if data.direccion:
            d = data.direccion
            conn.execute(
                """INSERT INTO direcciones (paciente_id, telefono, celular, calle,
                   numero_int, numero_ext, codigo_postal, colonia, municipio, estado, ciudad)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (paciente_id, d.telefono, d.celular, d.calle, d.numero_int,
                 d.numero_ext, d.codigo_postal, d.colonia, d.municipio,
                 d.estado, d.ciudad),
            )
        return {"id": paciente_id, "message": "Paciente creado"}


@router.put("/{paciente_id}")
def update_paciente(paciente_id: int, data: PacienteFullCreate, user=Depends(require_permission("pacientes", "actualizacion"))):
    p = data.paciente
    with get_db() as conn:
        result = conn.execute(
            """UPDATE pacientes SET nombre=?, a_paterno=?, a_materno=?, email=?, curp=?,
               fecha_nacimiento=?, genero=?, fotografia=?
               WHERE id=?""",
            (p.nombre, p.a_paterno, p.a_materno, p.email, p.curp,
             p.fecha_nacimiento, p.genero, p.fotografia, paciente_id),
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Paciente no encontrado")
        if data.direccion:
            d = data.direccion
            existing = conn.execute(
                "SELECT id FROM direcciones WHERE paciente_id=?", (paciente_id,)
            ).fetchone()
            if existing:
                conn.execute(
                    """UPDATE direcciones SET telefono=?, celular=?, calle=?,
                       numero_int=?, numero_ext=?, codigo_postal=?, colonia=?,
                       municipio=?, estado=?, ciudad=?
                       WHERE paciente_id=?""",
                    (d.telefono, d.celular, d.calle, d.numero_int,
                     d.numero_ext, d.codigo_postal, d.colonia, d.municipio,
                     d.estado, d.ciudad, paciente_id),
                )
            else:
                conn.execute(
                    """INSERT INTO direcciones (paciente_id, telefono, celular, calle,
                       numero_int, numero_ext, codigo_postal, colonia, municipio, estado, ciudad)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (paciente_id, d.telefono, d.celular, d.calle, d.numero_int,
                     d.numero_ext, d.codigo_postal, d.colonia, d.municipio,
                     d.estado, d.ciudad),
                )
        return {"message": "Paciente actualizado"}


@router.delete("/{paciente_id}")
def delete_paciente(paciente_id: int, user=Depends(require_permission("pacientes", "eliminacion"))):
    with get_db() as conn:
        result = conn.execute("DELETE FROM pacientes WHERE id=?", (paciente_id,))
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Paciente no encontrado")
        return {"message": "Paciente eliminado"}
