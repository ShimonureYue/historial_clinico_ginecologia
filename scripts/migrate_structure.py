#!/usr/bin/env python3
"""Create the SQLite schema for Expediente Clínico.

Usage:
    python scripts/migrate_structure.py [--db database/expediente_clinico.db]
"""

import argparse
import hashlib
import os
import sqlite3
import sys

DEFAULT_DB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "database", "expediente_clinico.db")

SCHEMA_SQL = """
-- ================================================================
-- Expediente Clínico – SQLite Schema
-- ================================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ── Usuarios y permisos ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    correo TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'medico',
    activo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS permisos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    modulo TEXT NOT NULL UNIQUE,
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS usuario_permisos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    permiso_id INTEGER NOT NULL,
    lectura INTEGER NOT NULL DEFAULT 0,
    escritura INTEGER NOT NULL DEFAULT 0,
    actualizacion INTEGER NOT NULL DEFAULT 0,
    eliminacion INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (permiso_id) REFERENCES permisos(id) ON DELETE CASCADE,
    UNIQUE(usuario_id, permiso_id)
);

-- ── Pacientes ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pacientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    a_paterno TEXT,
    a_materno TEXT,
    email TEXT,
    curp TEXT,
    fecha_nacimiento TEXT,
    genero TEXT DEFAULT 'F',
    fotografia TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_pacientes_deleted_at ON pacientes(deleted_at);
CREATE INDEX IF NOT EXISTS idx_pacientes_nombre ON pacientes(nombre, a_paterno, a_materno);

CREATE TRIGGER IF NOT EXISTS trg_pacientes_updated_at
AFTER UPDATE ON pacientes
BEGIN
    UPDATE pacientes SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- ── Direcciones ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS direcciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id INTEGER,
    telefono TEXT,
    celular TEXT,
    calle TEXT,
    numero_int TEXT,
    numero_ext TEXT,
    codigo_postal TEXT,
    colonia TEXT,
    municipio TEXT,
    estado TEXT,
    ciudad TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_direcciones_paciente ON direcciones(paciente_id);
CREATE INDEX IF NOT EXISTS idx_direcciones_deleted_at ON direcciones(deleted_at);

-- ── Consultas ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS consultas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id INTEGER,
    fecha TEXT DEFAULT (datetime('now')),
    motivo TEXT,
    padecimiento_actual TEXT,
    exploracion_fisica TEXT,
    diagnostico TEXT,
    tratamiento TEXT,
    estudios TEXT,
    notas_adicionales TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_consultas_paciente ON consultas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_consultas_fecha ON consultas(created_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_consultas_updated_at
AFTER UPDATE ON consultas
BEGIN
    UPDATE consultas SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- ── Signos vitales ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS signos_vitales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    consulta_id INTEGER,
    talla TEXT,
    peso TEXT,
    temperatura TEXT,
    frecuencia_respiratoria TEXT,
    frecuencia_cardiaca TEXT,
    presion_arterial TEXT,
    saturacion TEXT,
    fondo_uterino TEXT,
    frecuencia_cardiaca_fetal TEXT,
    craneo TEXT,
    cuello TEXT,
    torax TEXT,
    abdomen TEXT,
    extremidades TEXT,
    genitales TEXT,
    movimientos_fetales TEXT,
    otros TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT,
    FOREIGN KEY (consulta_id) REFERENCES consultas(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_signos_consulta ON signos_vitales(consulta_id);

-- ── Medicamentos ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS medicamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    consulta_id INTEGER,
    nombre TEXT,
    presentacion TEXT,
    dosis TEXT,
    frecuencia TEXT,
    duracion TEXT,
    comentarios TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT,
    FOREIGN KEY (consulta_id) REFERENCES consultas(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_medicamentos_consulta ON medicamentos(consulta_id);

-- ── Colposcopías ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS colposcopias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    consulta_id INTEGER,
    detalle TEXT,
    foto_1 TEXT,
    comentario_1 TEXT,
    foto_2 TEXT,
    comentario_2 TEXT,
    foto_3 TEXT,
    comentario_3 TEXT,
    foto_4 TEXT,
    comentario_4 TEXT,
    foto_5 TEXT,
    comentario_5 TEXT,
    -- Hallazgos Colposcopicos
    hc_cervix TEXT,
    hc_colposcopia TEXT,
    hc_epitelio_acetoblanco TEXT,
    hc_puntilleo TEXT,
    hc_mosaico TEXT,
    hc_vasos_atipicos TEXT,
    hc_tumor TEXT,
    hc_localizacion_lesion TEXT,
    hc_extension_fondos_saco TEXT,
    hc_metaplasia TEXT,
    hc_eversion_glandular TEXT,
    hc_atrofia_epitelial TEXT,
    hc_reaccion_inflamatoria TEXT,
    hc_exudado_vaginal TEXT,
    hc_add TEXT,
    hc_diagnostico_colposcopico TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT,
    FOREIGN KEY (consulta_id) REFERENCES consultas(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_colposcopias_consulta ON colposcopias(consulta_id);

-- ── Interrogatorio por aparatos y sistemas ──────────────────────

CREATE TABLE IF NOT EXISTS interrogatorio_aparatos_sistemas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    consulta_id INTEGER,
    -- Generales
    generales_fiebre INTEGER DEFAULT 0,
    generales_astenia INTEGER DEFAULT 0,
    generales_adinamia INTEGER DEFAULT 0,
    generales_perdida_peso INTEGER DEFAULT 0,
    generales_hiporexia INTEGER DEFAULT 0,
    generales_anorexia INTEGER DEFAULT 0,
    generales_comentarios TEXT,
    -- Sistema nervioso
    nervioso_cefalea INTEGER DEFAULT 0,
    nervioso_vertigo INTEGER DEFAULT 0,
    nervioso_perdida_sensibilidad INTEGER DEFAULT 0,
    nervioso_debilidad INTEGER DEFAULT 0,
    nervioso_letargo INTEGER DEFAULT 0,
    nervioso_somnolencia INTEGER DEFAULT 0,
    nervioso_movimientos_anormales INTEGER DEFAULT 0,
    nervioso_temblores INTEGER DEFAULT 0,
    nervioso_espasmos_musculares INTEGER DEFAULT 0,
    nervioso_coma INTEGER DEFAULT 0,
    nervioso_sincope INTEGER DEFAULT 0,
    nervioso_deficit_marcha INTEGER DEFAULT 0,
    nervioso_ataxia INTEGER DEFAULT 0,
    nervioso_ceguera INTEGER DEFAULT 0,
    nervioso_dolor_neurologico INTEGER DEFAULT 0,
    nervioso_alucinaciones_acusticas INTEGER DEFAULT 0,
    nervioso_alucinaciones_visuales INTEGER DEFAULT 0,
    nervioso_comentarios TEXT,
    -- Órganos de los sentidos
    organos_dolor_ocular INTEGER DEFAULT 0,
    organos_dolor_auditivo INTEGER DEFAULT 0,
    organos_perdida_audicion INTEGER DEFAULT 0,
    organos_disnea INTEGER DEFAULT 0,
    organos_dolor_encias INTEGER DEFAULT 0,
    organos_sensibilidad_dental INTEGER DEFAULT 0,
    organos_disminucion_agudeza_visual INTEGER DEFAULT 0,
    organos_disminucion_agudeza_auditiva INTEGER DEFAULT 0,
    organos_hiposmia INTEGER DEFAULT 0,
    organos_anosmia INTEGER DEFAULT 0,
    organos_tinitus INTEGER DEFAULT 0,
    organos_comentarios TEXT,
    -- Cardiovascular
    cardiovascular_vertigo INTEGER DEFAULT 0,
    cardiovascular_mareo INTEGER DEFAULT 0,
    cardiovascular_sincope INTEGER DEFAULT 0,
    cardiovascular_dolor_precordial INTEGER DEFAULT 0,
    cardiovascular_palpitacion INTEGER DEFAULT 0,
    cardiovascular_disnea INTEGER DEFAULT 0,
    cardiovascular_edema INTEGER DEFAULT 0,
    cardiovascular_acufenos INTEGER DEFAULT 0,
    cardiovascular_fosfenos INTEGER DEFAULT 0,
    cardiovascular_comentarios TEXT,
    -- Respiratorio
    respiratorio_disnea INTEGER DEFAULT 0,
    respiratorio_apnea INTEGER DEFAULT 0,
    respiratorio_tos INTEGER DEFAULT 0,
    respiratorio_sibilancia INTEGER DEFAULT 0,
    respiratorio_congestion_nasal INTEGER DEFAULT 0,
    respiratorio_dolor_toracico INTEGER DEFAULT 0,
    respiratorio_hemoptisis INTEGER DEFAULT 0,
    respiratorio_espectoracion INTEGER DEFAULT 0,
    respiratorio_vomica INTEGER DEFAULT 0,
    respiratorio_comentarios TEXT,
    -- Gastrointestinal
    gastrointestinal_pirosis INTEGER DEFAULT 0,
    gastrointestinal_taquifagia INTEGER DEFAULT 0,
    gastrointestinal_alitosis INTEGER DEFAULT 0,
    gastrointestinal_disfagia INTEGER DEFAULT 0,
    gastrointestinal_onicofagia INTEGER DEFAULT 0,
    gastrointestinal_vomito INTEGER DEFAULT 0,
    gastrointestinal_rectoragia INTEGER DEFAULT 0,
    gastrointestinal_melena INTEGER DEFAULT 0,
    gastrointestinal_tenesmo INTEGER DEFAULT 0,
    gastrointestinal_nauseas INTEGER DEFAULT 0,
    gastrointestinal_distencion_abdominal INTEGER DEFAULT 0,
    gastrointestinal_hematemesis INTEGER DEFAULT 0,
    gastrointestinal_diarrea INTEGER DEFAULT 0,
    gastrointestinal_constipacion INTEGER DEFAULT 0,
    gastrointestinal_regurgitacion_esofagica INTEGER DEFAULT 0,
    gastrointestinal_comentarios TEXT,
    -- Genitourinario
    genitourinario_colico_renal INTEGER DEFAULT 0,
    genitourinario_disuria INTEGER DEFAULT 0,
    genitourinario_coliuria INTEGER DEFAULT 0,
    genitourinario_hematuria INTEGER DEFAULT 0,
    genitourinario_anuria INTEGER DEFAULT 0,
    genitourinario_nicturia INTEGER DEFAULT 0,
    genitourinario_poliuria INTEGER DEFAULT 0,
    genitourinario_lesiones_genitales INTEGER DEFAULT 0,
    genitourinario_tenesmo_vesical INTEGER DEFAULT 0,
    genitourinario_pujo INTEGER DEFAULT 0,
    genitourinario_prurito_valvulal INTEGER DEFAULT 0,
    genitourinario_comentarios TEXT,
    -- Endocrino
    endocrino_dibilidad INTEGER DEFAULT 0,
    endocrino_fatiga INTEGER DEFAULT 0,
    endocrino_polifagia INTEGER DEFAULT 0,
    endocrino_comentarios TEXT,
    -- Osteomuscular
    osteomuscular_dolor_maxilar INTEGER DEFAULT 0,
    osteomuscular_rigidez_articular INTEGER DEFAULT 0,
    osteomuscular_inflamacion_articular INTEGER DEFAULT 0,
    osteomuscular_debilidad_muscular INTEGER DEFAULT 0,
    osteomuscular_sensibilidad_osea INTEGER DEFAULT 0,
    osteomuscular_calambres_musculares INTEGER DEFAULT 0,
    osteomuscular_hormigueo INTEGER DEFAULT 0,
    osteomuscular_sensasion_ardor INTEGER DEFAULT 0,
    osteomuscular_pesadez INTEGER DEFAULT 0,
    osteomuscular_mialguia INTEGER DEFAULT 0,
    osteomuscular_artralgias INTEGER DEFAULT 0,
    osteomuscular_comentarios TEXT,
    -- Psicológico
    psicologico_ansiedad INTEGER DEFAULT 0,
    psicologico_fatiga INTEGER DEFAULT 0,
    psicologico_panico INTEGER DEFAULT 0,
    psicologico_irritabilidad INTEGER DEFAULT 0,
    psicologico_insomnio INTEGER DEFAULT 0,
    psicologico_somnolencia INTEGER DEFAULT 0,
    psicologico_alucinaciones INTEGER DEFAULT 0,
    psicologico_depresion INTEGER DEFAULT 0,
    psicologico_comentarios TEXT,
    -- Tegumentario
    tegumentario_prurito_cutaneo INTEGER DEFAULT 0,
    tegumentario_dolor_urente INTEGER DEFAULT 0,
    tegumentario_hiperestesias INTEGER DEFAULT 0,
    tegumentario_hipoestesias INTEGER DEFAULT 0,
    tegumentario_disestesia INTEGER DEFAULT 0,
    tegumentario_rubicundez INTEGER DEFAULT 0,
    tegumentario_exantemas INTEGER DEFAULT 0,
    tegumentario_clanosis INTEGER DEFAULT 0,
    tegumentario_ictericia INTEGER DEFAULT 0,
    tegumentario_hipersensibilidad INTEGER DEFAULT 0,
    tegumentario_comentarios TEXT,
    -- Hematopoyético
    hematopoyetico_astenia INTEGER DEFAULT 0,
    hematopoyetico_vertigo INTEGER DEFAULT 0,
    hematopoyetico_comentarios TEXT,
    -- Inmunológico
    inmunologico_edema INTEGER DEFAULT 0,
    inmunologico_urticaria INTEGER DEFAULT 0,
    inmunologico_comentarios TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT,
    FOREIGN KEY (consulta_id) REFERENCES consultas(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_interrogatorio_consulta ON interrogatorio_aparatos_sistemas(consulta_id);

-- ── Antecedentes patológicos ────────────────────────────────────

CREATE TABLE IF NOT EXISTS antecedentes_patologicos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id INTEGER,
    enfermedades TEXT,
    hospitalizaciones TEXT,
    cirugias TEXT,
    traumatismos TEXT,
    transfusiones_sanguineas TEXT,
    immunizaciones_vacunas TEXT,
    historia_psiquiatrica TEXT,
    viajes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ant_pp_paciente ON antecedentes_patologicos(paciente_id);

-- ── Antecedentes no patológicos ─────────────────────────────────

CREATE TABLE IF NOT EXISTS antecedentes_no_patologicos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id INTEGER,
    nivel_socioeconomico TEXT,
    vivienda_tipo TEXT,
    vivienda_renta TEXT,
    vivienda_agua TEXT,
    vivienda_luz TEXT,
    vivienda_drenaje TEXT,
    vivienda_habitantes INTEGER,
    vivienda_habitaciones INTEGER,
    vivienda_zoonosis TEXT,
    vivienda_plagas TEXT,
    vivienda_hacinamiento TEXT,
    vivienda_descripcion TEXT,
    alimentacion_calidad TEXT,
    alimentacion_descripcion TEXT,
    alimentacion_intolerancia TEXT,
    deportes_cuales TEXT,
    deportes_frecuencia TEXT,
    sueno_descripcion TEXT,
    toxicomanias_alcohol TEXT,
    toxicomanias_alcohol_inicio TEXT,
    toxicomanias_alcohol_frecuencia TEXT,
    toxicomanias_alcohol_descripcion TEXT,
    toxicomanias_tabaco TEXT,
    toxicomanias_tabaco_inicio TEXT,
    toxicomanias_tabaco_frecuencia TEXT,
    toxicomanias_tabaco_descripcion TEXT,
    toxicomanias_drogas TEXT,
    toxicomanias_drogas_inicio TEXT,
    toxicomanias_drogas_frecuencia TEXT,
    toxicomanias_drogas_descripcion TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ant_pnp_paciente ON antecedentes_no_patologicos(paciente_id);

-- ── Antecedentes heredo familiares ──────────────────────────────

CREATE TABLE IF NOT EXISTS antecedentes_heredofamiliares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id INTEGER,
    tuberculosis INTEGER DEFAULT 0,
    diabetes_mellitus INTEGER DEFAULT 0,
    hipertencion INTEGER DEFAULT 0,
    carcinomas INTEGER DEFAULT 0,
    cardiopatias INTEGER DEFAULT 0,
    hepatopatias INTEGER DEFAULT 0,
    nefropatias INTEGER DEFAULT 0,
    enfermedades_endocrinas INTEGER DEFAULT 0,
    enfermedades_mentales INTEGER DEFAULT 0,
    epilepsia INTEGER DEFAULT 0,
    asma INTEGER DEFAULT 0,
    enfermedades_hematologicas INTEGER DEFAULT 0,
    sifilis INTEGER DEFAULT 0,
    abuelo_paterno TEXT,
    abuela_paterno TEXT,
    abuelo_materno TEXT,
    abuela_materno TEXT,
    padre TEXT,
    madre TEXT,
    hermanos TEXT,
    otros_familiares TEXT,
    comentarios TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ant_hf_paciente ON antecedentes_heredofamiliares(paciente_id);

-- ── Antecedentes gineco-obstétricos ─────────────────────────────

CREATE TABLE IF NOT EXISTS antecedentes_ginecoobstetricos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id INTEGER,
    gravidez INTEGER,
    partos INTEGER,
    vaginales INTEGER,
    cesareas INTEGER,
    abortos INTEGER,
    ectopicos INTEGER,
    nacidos_vivos INTEGER,
    nacidos_muertos INTEGER,
    menarca TEXT,
    menopausia TEXT,
    ultima_regla TEXT,
    ultimo_parto TEXT,
    ultima_citologia TEXT,
    citologia_comentarios TEXT,
    ciclos_menstruales TEXT,
    actividad_sexual TEXT,
    metodo_planificacion TEXT,
    patologias_relacionadas_embarazo TEXT,
    fecha_proxima_parto TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ant_go_paciente ON antecedentes_ginecoobstetricos(paciente_id);
"""

SEED_SQL = """
-- ── Catálogo de permisos (módulos) ──────────────────────────────
INSERT OR IGNORE INTO permisos (modulo, descripcion) VALUES
    ('pacientes', 'Gestión de pacientes'),
    ('consultas', 'Consultas médicas'),
    ('antecedentes_pp', 'Antecedentes patológicos'),
    ('antecedentes_pnp', 'Antecedentes no patológicos'),
    ('antecedentes_hf', 'Antecedentes heredo familiares'),
    ('antecedentes_go', 'Antecedentes gineco-obstétricos'),
    ('usuarios', 'Gestión de usuarios');
"""


def create_default_users(conn):
    """Create admin and medico default users."""
    admin_hash = hashlib.sha256("admin123".encode()).hexdigest()
    doctor_hash = hashlib.sha256("doctor123".encode()).hexdigest()

    conn.execute(
        "INSERT OR IGNORE INTO usuarios (nombre, correo, password_hash, rol, activo) VALUES (?, ?, ?, ?, ?)",
        ("Administrador", "admin@clinica.com", admin_hash, "admin", 1),
    )
    conn.execute(
        "INSERT OR IGNORE INTO usuarios (nombre, correo, password_hash, rol, activo) VALUES (?, ?, ?, ?, ?)",
        ("Dra. Miriam Vargas", "doctora@clinica.com", doctor_hash, "medico", 1),
    )

    # Assign full permissions to admin
    admin = conn.execute("SELECT id FROM usuarios WHERE correo='admin@clinica.com'").fetchone()
    doctor = conn.execute("SELECT id FROM usuarios WHERE correo='doctora@clinica.com'").fetchone()
    permisos = conn.execute("SELECT id FROM permisos").fetchall()

    if admin:
        for p in permisos:
            conn.execute(
                "INSERT OR IGNORE INTO usuario_permisos (usuario_id, permiso_id, lectura, escritura, actualizacion, eliminacion) VALUES (?, ?, 1, 1, 1, 1)",
                (admin[0], p[0]),
            )
    if doctor:
        for p in permisos:
            modulo = conn.execute("SELECT modulo FROM permisos WHERE id=?", (p[0],)).fetchone()
            if modulo and modulo[0] == "usuarios":
                conn.execute(
                    "INSERT OR IGNORE INTO usuario_permisos (usuario_id, permiso_id, lectura, escritura, actualizacion, eliminacion) VALUES (?, ?, 1, 0, 0, 0)",
                    (doctor[0], p[0]),
                )
            else:
                conn.execute(
                    "INSERT OR IGNORE INTO usuario_permisos (usuario_id, permiso_id, lectura, escritura, actualizacion, eliminacion) VALUES (?, ?, 1, 1, 1, 0)",
                    (doctor[0], p[0]),
                )


def main():
    parser = argparse.ArgumentParser(description="Create SQLite schema for Expediente Clínico")
    parser.add_argument("--db", default=DEFAULT_DB, help="Path to SQLite database")
    args = parser.parse_args()

    db_dir = os.path.dirname(args.db)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)

    print(f"Creating schema in: {args.db}")
    conn = sqlite3.connect(args.db)
    conn.executescript(SCHEMA_SQL)
    conn.executescript(SEED_SQL)
    create_default_users(conn)

    # Add hallazgos colposcopicos columns to existing databases
    # Add notas_adicionales to consultas for existing databases
    try:
        conn.execute("ALTER TABLE consultas ADD COLUMN notas_adicionales TEXT")
    except Exception:
        pass

    hc_cols = [
        'hc_cervix', 'hc_colposcopia', 'hc_epitelio_acetoblanco',
        'hc_puntilleo', 'hc_mosaico', 'hc_vasos_atipicos', 'hc_tumor',
        'hc_localizacion_lesion', 'hc_extension_fondos_saco', 'hc_metaplasia',
        'hc_eversion_glandular', 'hc_atrofia_epitelial', 'hc_reaccion_inflamatoria',
        'hc_exudado_vaginal', 'hc_add', 'hc_diagnostico_colposcopico',
    ]
    for col in hc_cols:
        try:
            conn.execute(f"ALTER TABLE colposcopias ADD COLUMN {col} TEXT")
        except Exception:
            pass  # Column already exists

    conn.commit()
    conn.close()
    print("Schema created successfully!")
    print("Default users:")
    print("  admin@clinica.com / admin123 (rol: admin)")
    print("  doctora@clinica.com / doctor123 (rol: medico)")


if __name__ == "__main__":
    main()
