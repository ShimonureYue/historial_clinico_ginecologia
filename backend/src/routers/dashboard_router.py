"""Dashboard statistics endpoint."""

from fastapi import APIRouter, Depends
from ..database import get_db
from ..auth import require_permission

router = APIRouter()


@router.get("")
def get_dashboard(user=Depends(require_permission("consultas", "lectura"))):
    with get_db() as conn:
        # Total counts
        total_pacientes = conn.execute(
            "SELECT COUNT(*) FROM pacientes WHERE deleted_at IS NULL"
        ).fetchone()[0]
        total_consultas = conn.execute(
            "SELECT COUNT(*) FROM consultas WHERE deleted_at IS NULL"
        ).fetchone()[0]
        total_colposcopias = conn.execute(
            "SELECT COUNT(*) FROM colposcopias WHERE deleted_at IS NULL"
        ).fetchone()[0]

        # Consultas this month
        consultas_mes = conn.execute(
            "SELECT COUNT(*) FROM consultas WHERE deleted_at IS NULL AND strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now')"
        ).fetchone()[0]

        # Pacientes this month (new)
        pacientes_mes = conn.execute(
            "SELECT COUNT(*) FROM pacientes WHERE deleted_at IS NULL AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')"
        ).fetchone()[0]

        # Last 6 months: consultas per month
        consultas_por_mes = conn.execute("""
            SELECT strftime('%Y-%m', fecha) as mes, COUNT(*) as total
            FROM consultas
            WHERE deleted_at IS NULL
              AND fecha >= date('now', '-6 months')
            GROUP BY mes
            ORDER BY mes
        """).fetchall()

        # Last 6 months: new pacientes per month
        pacientes_por_mes = conn.execute("""
            SELECT strftime('%Y-%m', created_at) as mes, COUNT(*) as total
            FROM pacientes
            WHERE deleted_at IS NULL
              AND created_at >= date('now', '-6 months')
            GROUP BY mes
            ORDER BY mes
        """).fetchall()

        # Top 5 motivos de consulta (most common)
        top_motivos = conn.execute("""
            SELECT motivo, COUNT(*) as total
            FROM consultas
            WHERE deleted_at IS NULL AND motivo IS NOT NULL AND motivo != ''
            GROUP BY UPPER(TRIM(motivo))
            ORDER BY total DESC
            LIMIT 5
        """).fetchall()

        # Last 5 consultas
        ultimas_consultas = conn.execute("""
            SELECT c.id, c.paciente_id, c.motivo, c.fecha, c.diagnostico,
                   p.nombre, p.a_paterno, p.a_materno
            FROM consultas c
            JOIN pacientes p ON p.id = c.paciente_id
            WHERE c.deleted_at IS NULL
            ORDER BY c.fecha DESC
            LIMIT 5
        """).fetchall()

        # Last 5 pacientes
        ultimos_pacientes = conn.execute("""
            SELECT p.id, p.nombre, p.a_paterno, p.a_materno, p.genero, p.fecha_nacimiento, p.created_at,
                   (SELECT COUNT(*) FROM consultas c WHERE c.paciente_id = p.id AND c.deleted_at IS NULL) as num_consultas
            FROM pacientes p
            WHERE p.deleted_at IS NULL
            ORDER BY p.created_at DESC
            LIMIT 5
        """).fetchall()

        # Top 5 diagnósticos
        top_diagnosticos = conn.execute("""
            SELECT diagnostico, COUNT(*) as total
            FROM consultas
            WHERE deleted_at IS NULL AND diagnostico IS NOT NULL AND diagnostico != ''
            GROUP BY UPPER(TRIM(diagnostico))
            ORDER BY total DESC
            LIMIT 5
        """).fetchall()

        # Distribución por género
        genero_dist = conn.execute("""
            SELECT
                CASE WHEN genero = 'F' THEN 'Femenino'
                     WHEN genero = 'M' THEN 'Masculino'
                     ELSE 'Sin especificar' END as g,
                COUNT(*) as total
            FROM pacientes
            WHERE deleted_at IS NULL
            GROUP BY g
            ORDER BY total DESC
        """).fetchall()

        # Avg consultas per paciente
        avg_consultas = conn.execute("""
            SELECT ROUND(AVG(cnt), 1) FROM (
                SELECT COUNT(*) as cnt FROM consultas
                WHERE deleted_at IS NULL
                GROUP BY paciente_id
            )
        """).fetchone()[0] or 0

        return {
            "kpis": {
                "total_pacientes": total_pacientes,
                "total_consultas": total_consultas,
                "total_colposcopias": total_colposcopias,
                "consultas_mes": consultas_mes,
                "pacientes_mes": pacientes_mes,
                "avg_consultas_por_paciente": avg_consultas,
            },
            "consultas_por_mes": [{"mes": r[0], "total": r[1]} for r in consultas_por_mes],
            "pacientes_por_mes": [{"mes": r[0], "total": r[1]} for r in pacientes_por_mes],
            "top_motivos": [{"motivo": r[0], "total": r[1]} for r in top_motivos],
            "top_diagnosticos": [{"diagnostico": r[0], "total": r[1]} for r in top_diagnosticos],
            "genero_distribucion": [{"genero": r[0], "total": r[1]} for r in genero_dist],
            "ultimas_consultas": [
                {
                    "id": r[0], "paciente_id": r[1], "motivo": r[2], "fecha": r[3],
                    "diagnostico": r[4],
                    "paciente_nombre": f"{r[5]} {r[6]} {r[7] or ''}".strip(),
                }
                for r in ultimas_consultas
            ],
            "ultimos_pacientes": [
                {
                    "id": r[0],
                    "nombre": f"{r[1]} {r[2]} {r[3] or ''}".strip(),
                    "genero": r[4], "fecha_nacimiento": r[5], "created_at": r[6],
                    "num_consultas": r[7],
                }
                for r in ultimos_pacientes
            ],
        }
