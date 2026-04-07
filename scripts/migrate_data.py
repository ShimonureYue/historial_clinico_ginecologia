#!/usr/bin/env python3
"""Migrate data from MySQL to SQLite for Expediente Clínico.

Usage:
    # From MySQL:
    python scripts/migrate_data.py --mysql-host localhost --mysql-user root --mysql-password pass --mysql-db expediente_clinico

    # From MySQL SQL dump files (no MySQL connection needed):
    python scripts/migrate_data.py --from-sql documentation/expediente_clinico_full.sql

    # Create seed data only (no MySQL):
    python scripts/migrate_data.py --seed
"""

import argparse
import hashlib
import os
import re
import sqlite3
import sys

DEFAULT_DB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "database", "expediente_clinico.db")

# Tables to migrate (in order to respect FK constraints)
TABLES_TO_MIGRATE = [
    "pacientes",
    "direcciones",
    "consultas",
    "signos_vitales",
    "medicamentos",
    "colposcopias",
    "interrogatorio_aparatos_sistemas",
    "antecedentes_patologicos",
    "antecedentes_no_patologicos",
    "antecedentes_heredofamiliares",
    "antecedentes_ginecoobstetricos",
]

# Tables to skip (Laravel framework tables)
TABLES_TO_SKIP = {"migrations", "password_resets", "full_cruds", "full_crud_paciente", "users", "roles"}


def migrate_from_mysql(host, user, password, db_name, sqlite_db):
    """Migrate data from a live MySQL connection."""
    try:
        import mysql.connector
    except ImportError:
        print("ERROR: mysql-connector-python is required. Install with: pip install mysql-connector-python")
        sys.exit(1)

    print(f"Connecting to MySQL: {user}@{host}/{db_name}")
    mysql_conn = mysql.connector.connect(host=host, user=user, password=password, database=db_name)
    mysql_cursor = mysql_conn.cursor(dictionary=True)

    sqlite_conn = sqlite3.connect(sqlite_db)
    sqlite_conn.execute("PRAGMA foreign_keys=OFF;")

    for table in TABLES_TO_MIGRATE:
        print(f"  Migrating {table}...", end=" ")
        try:
            mysql_cursor.execute(f"SELECT * FROM `{table}`")
            rows = mysql_cursor.fetchall()
        except Exception as e:
            print(f"SKIP ({e})")
            continue

        if not rows:
            print("0 rows")
            continue

        columns = list(rows[0].keys())
        # Filter out columns that don't exist in SQLite schema
        placeholders = ", ".join(["?"] * len(columns))
        col_str = ", ".join(columns)

        count = 0
        for row in rows:
            values = []
            for col in columns:
                v = row[col]
                if v is not None and hasattr(v, "isoformat"):
                    v = v.isoformat()
                values.append(v)
            try:
                sqlite_conn.execute(f"INSERT OR IGNORE INTO {table} ({col_str}) VALUES ({placeholders})", values)
                count += 1
            except sqlite3.OperationalError:
                pass
        sqlite_conn.commit()
        print(f"{count} rows")

    # Normalize gender to F/M; default NULL/empty to F (ginecología)
    sqlite_conn.execute("UPDATE pacientes SET genero='F' WHERE genero IS NULL OR genero='' OR genero='femenino'")
    sqlite_conn.execute("UPDATE pacientes SET genero='M' WHERE genero='masculino'")
    sqlite_conn.commit()

    sqlite_conn.execute("PRAGMA foreign_keys=ON;")
    sqlite_conn.close()
    mysql_cursor.close()
    mysql_conn.close()
    print("MySQL migration complete!")


def migrate_from_sql_dump(sql_file, sqlite_db):
    """Parse a MySQL dump file and insert data into SQLite."""
    print(f"Parsing SQL dump: {sql_file}")

    with open(sql_file, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    sqlite_conn = sqlite3.connect(sqlite_db)
    sqlite_conn.execute("PRAGMA foreign_keys=OFF;")

    # Find INSERT statements
    insert_pattern = re.compile(
        r"INSERT\s+INTO\s+`?(\w+)`?\s+(?:\(([^)]+)\)\s+)?VALUES\s*(.+?);\s*$",
        re.MULTILINE | re.DOTALL | re.IGNORECASE,
    )

    for match in insert_pattern.finditer(content):
        table_name = match.group(1)
        columns_str = match.group(2)
        values_block = match.group(3)

        if table_name in TABLES_TO_SKIP:
            continue
        if table_name not in TABLES_TO_MIGRATE:
            continue

        columns = [c.strip().strip("`") for c in columns_str.split(",")] if columns_str else []
        col_str = ", ".join(columns)

        # Parse value groups: (val1, val2, ...), (val1, val2, ...), ...
        row_pattern = re.compile(r"\(([^)]*(?:'[^']*'[^)]*)*)\)")
        rows_found = row_pattern.findall(values_block)

        count = 0
        for row_str in rows_found:
            # Parse individual values respecting quoted strings
            values = _parse_mysql_values(row_str)
            if len(values) != len(columns):
                continue
            placeholders = ", ".join(["?"] * len(values))
            try:
                sqlite_conn.execute(f"INSERT OR IGNORE INTO {table_name} ({col_str}) VALUES ({placeholders})", values)
                count += 1
            except (sqlite3.OperationalError, sqlite3.IntegrityError):
                pass

        if count > 0:
            sqlite_conn.commit()
            print(f"  {table_name}: {count} rows")

    # Normalize gender to F/M; default NULL/empty to F (ginecología)
    sqlite_conn.execute("UPDATE pacientes SET genero='F' WHERE genero IS NULL OR genero='' OR genero='femenino'")
    sqlite_conn.execute("UPDATE pacientes SET genero='M' WHERE genero='masculino'")
    sqlite_conn.commit()

    sqlite_conn.execute("PRAGMA foreign_keys=ON;")
    sqlite_conn.close()
    print("SQL dump migration complete!")


def _parse_mysql_values(row_str):
    """Parse a MySQL VALUES row string into a list of Python values."""
    values = []
    i = 0
    current = ""
    in_string = False
    quote_char = None

    while i < len(row_str):
        ch = row_str[i]

        if in_string:
            if ch == "\\" and i + 1 < len(row_str):
                current += row_str[i + 1]
                i += 2
                continue
            elif ch == quote_char:
                in_string = False
                i += 1
                continue
            else:
                current += ch
                i += 1
                continue

        if ch in ("'", '"'):
            in_string = True
            quote_char = ch
            i += 1
            continue

        if ch == ",":
            values.append(_convert_value(current.strip()))
            current = ""
            i += 1
            continue

        current += ch
        i += 1

    values.append(_convert_value(current.strip()))
    return values


def _convert_value(val):
    """Convert a MySQL string value to Python type."""
    if val.upper() == "NULL" or val == "":
        return None
    # Try number
    try:
        if "." in val:
            return float(val)
        return int(val)
    except ValueError:
        pass
    return val


def create_seed_data(sqlite_db):
    """Create example seed data when no MySQL is available."""
    print("Creating seed data...")
    conn = sqlite3.connect(sqlite_db)
    conn.execute("PRAGMA foreign_keys=ON;")

    # Seed patients
    patients = [
        ("María", "García", "López", "maria@example.com", "GALM900101MDFRZR01", "1990-01-15", "Femenino"),
        ("Ana", "Martínez", "Rodríguez", "ana@example.com", "MARA850520MDFRDN02", "1985-05-20", "Femenino"),
        ("Laura", "Hernández", "Pérez", "laura@example.com", "HEPL780810MDFRRL03", "1978-08-10", "Femenino"),
        ("Carmen", "López", "Sánchez", None, "LOSC950315MDFPNR04", "1995-03-15", "Femenino"),
        ("Patricia", "Rodríguez", "Gómez", "patricia@example.com", None, "1988-11-22", "Femenino"),
    ]
    for p in patients:
        conn.execute(
            "INSERT INTO pacientes (nombre, a_paterno, a_materno, email, curp, fecha_nacimiento, genero) VALUES (?,?,?,?,?,?,?)",
            p,
        )

    # Seed addresses
    conn.execute(
        "INSERT INTO direcciones (paciente_id, telefono, celular, calle, colonia, municipio, estado, ciudad) VALUES (1, '5551234567', '5559876543', 'Av. Reforma 100', 'Centro', 'Cuauhtémoc', 'CDMX', 'Ciudad de México')"
    )
    conn.execute(
        "INSERT INTO direcciones (paciente_id, telefono, celular, calle, colonia, municipio, estado, ciudad) VALUES (2, '5552345678', '5558765432', 'Calle Juárez 200', 'Roma Norte', 'Cuauhtémoc', 'CDMX', 'Ciudad de México')"
    )

    # Seed a consultation
    conn.execute(
        """INSERT INTO consultas (paciente_id, motivo, padecimiento_actual, diagnostico, tratamiento)
           VALUES (1, 'Revisión ginecológica', 'Paciente refiere dolor abdominal bajo intermitente de 2 semanas de evolución',
                   'Cervicitis leve', 'Tratamiento antibiótico por 7 días')"""
    )
    conn.execute(
        """INSERT INTO signos_vitales (consulta_id, talla, peso, temperatura, frecuencia_cardiaca, frecuencia_respiratoria, presion_arterial)
           VALUES (1, 165, 62.5, 36.5, 72, 18, 120)"""
    )
    conn.execute(
        "INSERT INTO medicamentos (consulta_id, nombre, dosis, frecuencia, duracion) VALUES (1, 'Azitromicina', '500mg', 'Cada 24hrs', '3 días')"
    )

    conn.commit()
    conn.close()
    print("Seed data created!")
    print("  5 pacientes de ejemplo")
    print("  1 consulta con signos vitales y medicamento")


def main():
    parser = argparse.ArgumentParser(description="Migrate data to SQLite for Expediente Clínico")
    parser.add_argument("--db", default=DEFAULT_DB, help="Path to SQLite database")
    parser.add_argument("--seed", action="store_true", help="Create seed data only")
    parser.add_argument("--from-sql", help="Path to MySQL dump SQL file")
    parser.add_argument("--mysql-host", default="localhost")
    parser.add_argument("--mysql-user", default="root")
    parser.add_argument("--mysql-password", default="")
    parser.add_argument("--mysql-db", default="expediente_clinico")
    args = parser.parse_args()

    if not os.path.exists(args.db):
        print(f"Database not found at {args.db}. Run migrate_structure.py first.")
        sys.exit(1)

    if args.seed:
        create_seed_data(args.db)
    elif args.from_sql:
        if not os.path.exists(args.from_sql):
            print(f"SQL file not found: {args.from_sql}")
            sys.exit(1)
        migrate_from_sql_dump(args.from_sql, args.db)
    else:
        migrate_from_mysql(args.mysql_host, args.mysql_user, args.mysql_password, args.mysql_db, args.db)


if __name__ == "__main__":
    main()
