#!/usr/bin/env python3
"""Migrate data from MySQL dump (expediente_clinico_full.sql) into SQLite.

This script:
1. Creates a fresh SQLite database with the proper schema
2. Parses the MySQL dump and extracts INSERT data
3. Maps MySQL tables/columns to our SQLite schema
4. Backfills consultas.fecha from created_at

Usage:
    python scripts/migrate_from_mysql_dump.py [--sql documentation/expediente_clinico_full.sql] [--db database/expediente_clinico.db]
"""

import argparse
import os
import re
import sqlite3
import sys

# Add parent to path so we can import migrate_structure
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from migrate_structure import SCHEMA_SQL, SEED_SQL, create_default_users

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_SQL = os.path.join(ROOT, "documentation", "expediente_clinico_full.sql")
DEFAULT_DB = os.path.join(ROOT, "database", "expediente_clinico.db")

# Tables we want to migrate and their column mappings (MySQL -> SQLite)
# None means use same columns as found in the INSERT statement
TABLES_TO_MIGRATE = {
    "pacientes",
    "direcciones",
    "consultas",
    "signos_vitales",
    "colposcopias",
    "interrogatorio_aparatos_sistemas",
    "medicamentos",
    "antecedentes_ginecoobstetricos",
    "antecedentes_heredofamiliares",
    "antecedentes_no_patologicos",
    "antecedentes_patologicos",
}


def parse_mysql_inserts(sql_path):
    """Parse MySQL dump and extract INSERT statements as (table, columns, rows).

    Yields (table_name, [col_names], [[val1, val2, ...], ...])
    """
    with open(sql_path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    # Pattern to match: INSERT INTO `table` (`col1`, `col2`, ...) VALUES
    insert_pattern = re.compile(
        r"INSERT INTO `(\w+)` \(([^)]+)\) VALUES\s*\n?(.*?);",
        re.DOTALL,
    )

    for match in insert_pattern.finditer(content):
        table = match.group(1)
        if table not in TABLES_TO_MIGRATE:
            continue

        # Parse column names
        cols_raw = match.group(2)
        columns = [c.strip().strip("`") for c in cols_raw.split(",")]

        # Parse values - each row is (...),\n(...)
        values_str = match.group(3).strip()
        rows = parse_value_rows(values_str)

        yield table, columns, rows


def parse_value_rows(values_str):
    """Parse MySQL VALUES section into list of lists."""
    rows = []
    i = 0
    length = len(values_str)

    while i < length:
        # Find start of row
        if values_str[i] == "(":
            row, end = parse_single_row(values_str, i)
            rows.append(row)
            i = end
        else:
            i += 1

    return rows


def parse_single_row(s, start):
    """Parse a single (...) row, handling nested parens and quoted strings."""
    i = start + 1  # skip opening (
    values = []
    current = ""
    in_string = False
    string_char = None
    depth = 0

    while i < len(s):
        ch = s[i]

        if in_string:
            if ch == "\\" and i + 1 < len(s):
                current += ch + s[i + 1]
                i += 2
                continue
            elif ch == string_char:
                # Check for escaped quote ''
                if i + 1 < len(s) and s[i + 1] == string_char:
                    current += ch + ch
                    i += 2
                    continue
                in_string = False
                current += ch
            else:
                current += ch
        elif ch in ("'", '"'):
            in_string = True
            string_char = ch
            current += ch
        elif ch == "(" :
            depth += 1
            current += ch
        elif ch == ")":
            if depth > 0:
                depth -= 1
                current += ch
            else:
                # End of row
                values.append(parse_mysql_value(current.strip()))
                return values, i + 1
        elif ch == "," and depth == 0:
            values.append(parse_mysql_value(current.strip()))
            current = ""
        else:
            current += ch

        i += 1

    # Should not reach here
    values.append(parse_mysql_value(current.strip()))
    return values, i


def parse_mysql_value(val):
    """Convert a MySQL value string to a Python value."""
    if val == "NULL" or val == "":
        return None
    if val.startswith("'") and val.endswith("'"):
        # Unescape MySQL string
        inner = val[1:-1]
        inner = inner.replace("\\'", "'")
        inner = inner.replace("\\\\", "\\")
        inner = inner.replace("\\n", "\n")
        inner = inner.replace("\\r", "\r")
        inner = inner.replace("\\t", "\t")
        inner = inner.replace("\\0", "\0")
        inner = inner.replace("''", "'")
        return inner
    try:
        if "." in val:
            return float(val)
        return int(val)
    except ValueError:
        return val


def get_sqlite_columns(conn, table):
    """Get column names for a SQLite table."""
    cursor = conn.execute(f"PRAGMA table_info({table})")
    return {row[1] for row in cursor.fetchall()}


def insert_rows(conn, table, columns, rows):
    """Insert rows into SQLite table, mapping columns appropriately."""
    sqlite_cols = get_sqlite_columns(conn, table)

    # Filter columns that exist in our SQLite schema
    col_indices = []
    valid_cols = []
    for i, col in enumerate(columns):
        if col in sqlite_cols:
            col_indices.append(i)
            valid_cols.append(col)

    if not valid_cols:
        print(f"  WARNING: No matching columns for {table}")
        return 0

    placeholders = ", ".join(["?"] * len(valid_cols))
    col_str = ", ".join(valid_cols)
    sql = f"INSERT OR IGNORE INTO {table} ({col_str}) VALUES ({placeholders})"

    count = 0
    for row in rows:
        vals = []
        for idx in col_indices:
            if idx < len(row):
                vals.append(row[idx])
            else:
                vals.append(None)
        try:
            conn.execute(sql, vals)
            count += 1
        except Exception as e:
            print(f"  ERROR inserting into {table}: {e}")
            print(f"    Row: {vals[:5]}...")

    return count


def main():
    parser = argparse.ArgumentParser(description="Migrate MySQL dump to SQLite")
    parser.add_argument("--sql", default=DEFAULT_SQL, help="Path to MySQL dump file")
    parser.add_argument("--db", default=DEFAULT_DB, help="Path to SQLite database")
    parser.add_argument("--fresh", action="store_true", help="Delete existing DB and start fresh")
    args = parser.parse_args()

    if not os.path.exists(args.sql):
        print(f"ERROR: SQL file not found: {args.sql}")
        sys.exit(1)

    if args.fresh and os.path.exists(args.db):
        os.remove(args.db)
        print(f"Removed existing database: {args.db}")

    db_dir = os.path.dirname(args.db)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)

    # Step 1: Create schema
    print(f"Creating schema in: {args.db}")
    conn = sqlite3.connect(args.db)
    conn.executescript(SCHEMA_SQL)
    conn.executescript(SEED_SQL)
    create_default_users(conn)
    conn.commit()
    print("Schema created successfully!")

    # Step 2: Parse and import MySQL data (disable FK checks during import)
    print(f"\nParsing MySQL dump: {args.sql}")
    conn.execute("PRAGMA foreign_keys = OFF")
    table_counts = {}

    for table, columns, rows in parse_mysql_inserts(args.sql):
        if table not in table_counts:
            table_counts[table] = 0
        count = insert_rows(conn, table, columns, rows)
        table_counts[table] += count

    conn.commit()
    conn.execute("PRAGMA foreign_keys = ON")

    # Step 3: Post-import data normalization
    print("\nBackfilling consultas.fecha from created_at...")
    conn.execute("UPDATE consultas SET fecha = created_at")

    print("Normalizing pacientes.genero values (femenino->F, masculino->M)...")
    conn.execute("UPDATE pacientes SET genero = 'F' WHERE LOWER(genero) = 'femenino'")
    conn.execute("UPDATE pacientes SET genero = 'M' WHERE LOWER(genero) = 'masculino'")

    conn.commit()

    # Step 4: Summary
    print("\n" + "=" * 50)
    print("Migration Summary")
    print("=" * 50)
    for table in sorted(table_counts.keys()):
        print(f"  {table}: {table_counts[table]} rows")

    # Verify counts
    print("\nVerification (SELECT COUNT):")
    for table in sorted(table_counts.keys()):
        cursor = conn.execute(f"SELECT COUNT(*) FROM {table}")
        actual = cursor.fetchone()[0]
        print(f"  {table}: {actual} rows")

    # Show sample consulta with fecha
    print("\nSample consultas with fecha:")
    cursor = conn.execute("SELECT id, paciente_id, fecha, created_at FROM consultas LIMIT 5")
    for row in cursor.fetchall():
        print(f"  id={row[0]}, paciente_id={row[1]}, fecha={row[2]}, created_at={row[3]}")

    conn.close()
    print(f"\nMigration complete! Database: {args.db}")
    print("\nDefault users (from schema):")
    print("  admin@clinica.com / admin123 (rol: admin)")
    print("  doctora@clinica.com / doctor123 (rol: medico)")


if __name__ == "__main__":
    main()
