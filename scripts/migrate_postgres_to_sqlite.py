#!/usr/bin/env python3
"""
Postgres -> SQLite migration bootstrap for app-prestamos-p15.

Usage example:
python scripts/migrate_postgres_to_sqlite.py \
  --pg-host localhost \
  --pg-port 5432 \
  --pg-db registro_equipos \
  --pg-user postgres \
  --pg-password secret \
  --sqlite-path ./prestamos.db \
  --tables profesores,categorias,inventario,prestamos
"""

from __future__ import annotations

import argparse
import importlib
import json
import sqlite3
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Sequence


@dataclass(frozen=True)
class PgConfig:
    host: str
    port: int
    dbname: str
    user: str
    password: str


TARGET_TABLE_COLUMNS: dict[str, list[str]] = {
    "profesores": ["id", "codigo", "nombre"],
    "categorias": ["id", "nombre"],
    "inventario": ["id", "categoria_id", "nombre_equipo", "identificador", "estado"],
    "prestamos": ["id", "equipo_id", "codigo_profe", "nombre_profe", "fecha_salida", "fecha_retorno"],
}


DEFAULT_TABLE_MAPPING = {
    "tables": {
        "profesores": "profesores",
        "categorias": "categorias",
        "inventario": "inventario",
        "prestamos": "prestamos",
    },
    "columns": {
        "profesores": {
            "id": "id",
            "codigo": "codigo",
            "nombre": "nombre",
        },
        "categorias": {
            "id": "id",
            "nombre": "nombre",
        },
        "inventario": {
            "id": "id",
            "categoria_id": "categoria_id",
            "nombre_equipo": "nombre_equipo",
            "identificador": "identificador",
            "estado": "estado",
        },
        "prestamos": {
            "id": "id",
            "equipo_id": "equipo_id",
            "codigo_profe": "codigo_profe",
            "nombre_profe": "nombre_profe",
            "fecha_salida": "fecha_salida",
            "fecha_retorno": "fecha_retorno",
        },
    },
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Migrate legacy Postgres data to SQLite")
    parser.add_argument("--pg-host", required=True)
    parser.add_argument("--pg-port", required=True, type=int)
    parser.add_argument("--pg-db", required=True)
    parser.add_argument("--pg-user", required=True)
    parser.add_argument("--pg-password", required=True)
    parser.add_argument("--sqlite-path", required=True)
    parser.add_argument(
        "--tables",
        default="profesores,categorias,inventario,prestamos",
        help="Comma-separated table names to migrate",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only print row counts without writing to SQLite",
    )
    parser.add_argument(
        "--discover-only",
        action="store_true",
        help="Inspect PostgreSQL schema and exit without migrating",
    )
    parser.add_argument(
        "--profile-out",
        default="",
        help="Optional JSON path to write discovered schema metadata",
    )
    parser.add_argument(
        "--mapping-file",
        default="",
        help="Optional JSON file with source-to-target table/column mapping",
    )
    return parser.parse_args()


def connect_postgres(config: PgConfig) -> Any:
    try:
        psycopg_module = importlib.import_module("psycopg")
    except ImportError as exc:  # pragma: no cover
        raise SystemExit(
            "Missing dependency 'psycopg'. Install with: pip install psycopg[binary]"
        ) from exc

    return psycopg_module.connect(
        host=config.host,
        port=config.port,
        dbname=config.dbname,
        user=config.user,
        password=config.password,
    )


def connect_sqlite(sqlite_path: Path) -> sqlite3.Connection:
    sqlite_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(sqlite_path)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def ensure_sqlite_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS profesores (
            id INTEGER PRIMARY KEY,
            codigo TEXT NOT NULL UNIQUE,
            nombre TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS categorias (
            id INTEGER PRIMARY KEY,
            nombre TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS inventario (
            id INTEGER PRIMARY KEY,
            categoria_id INTEGER NOT NULL,
            nombre_equipo TEXT NOT NULL,
            identificador TEXT,
            estado TEXT NOT NULL DEFAULT 'disponible',
            FOREIGN KEY (categoria_id) REFERENCES categorias(id)
        );

        CREATE TABLE IF NOT EXISTS prestamos (
            id INTEGER PRIMARY KEY,
            equipo_id INTEGER NOT NULL,
            codigo_profe TEXT NOT NULL,
            nombre_profe TEXT,
            fecha_salida TEXT,
            fecha_retorno TEXT,
            FOREIGN KEY (equipo_id) REFERENCES inventario(id)
        );
        """
    )


def quote_identifier(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


def list_public_tables(pg_conn: Any) -> list[str]:
    query = (
        "SELECT table_name "
        "FROM information_schema.tables "
        "WHERE table_schema = 'public' "
        "ORDER BY table_name"
    )
    with pg_conn.cursor() as cursor:
        cursor.execute(query)
        rows = cursor.fetchall()
    return [row[0] for row in rows]


def list_table_columns(pg_conn: Any, table_name: str) -> list[dict[str, str]]:
    query = (
        "SELECT column_name, data_type, is_nullable "
        "FROM information_schema.columns "
        "WHERE table_schema = 'public' AND table_name = %s "
        "ORDER BY ordinal_position"
    )
    with pg_conn.cursor() as cursor:
        cursor.execute(query, [table_name])
        rows = cursor.fetchall()

    return [
        {
            "column": row[0],
            "type": row[1],
            "nullable": row[2],
        }
        for row in rows
    ]


def build_profile(pg_conn: Any) -> dict[str, Any]:
    profile: dict[str, Any] = {"tables": {}}
    for table_name in list_public_tables(pg_conn):
        columns = list_table_columns(pg_conn, table_name)
        with pg_conn.cursor() as cursor:
            cursor.execute(f"SELECT COUNT(*) FROM {quote_identifier(table_name)}")
            row_count = cursor.fetchone()[0]
        profile["tables"][table_name] = {
            "row_count": row_count,
            "columns": columns,
        }
    return profile


def load_mapping(mapping_path: str) -> dict[str, Any]:
    if not mapping_path:
        return DEFAULT_TABLE_MAPPING

    candidate = Path(mapping_path)
    if not candidate.exists():
        raise FileNotFoundError(f"Mapping file not found: {candidate}")

    with candidate.open("r", encoding="utf-8") as handle:
        loaded = json.load(handle)

    merged: dict[str, Any] = {
        "tables": dict(DEFAULT_TABLE_MAPPING["tables"]),
        "columns": dict(DEFAULT_TABLE_MAPPING["columns"]),
    }

    merged["tables"].update(loaded.get("tables", {}))
    for target_table, column_map in loaded.get("columns", {}).items():
        base_map = dict(merged["columns"].get(target_table, {}))
        base_map.update(column_map)
        merged["columns"][target_table] = base_map

    return merged


def read_table(
    pg_conn: Any,
    table_name: str,
) -> tuple[list[str], list[tuple]]:
    query = f"SELECT * FROM {quote_identifier(table_name)}"
    with pg_conn.cursor() as cursor:
        cursor.execute(query)
        rows = cursor.fetchall()
        columns = [desc.name for desc in cursor.description]
    return columns, rows


def project_row_to_target(
    target_table: str,
    source_columns: Sequence[str],
    source_row: Sequence[object],
    mapping: dict[str, Any],
) -> dict[str, object]:
    row_map = dict(zip(source_columns, source_row, strict=True))
    source_by_target = mapping.get("columns", {}).get(target_table, {})

    projected: dict[str, object] = {}
    for target_column in TARGET_TABLE_COLUMNS[target_table]:
        source_column = source_by_target.get(target_column, target_column)
        projected[target_column] = row_map.get(source_column)

    return projected


def normalize_row(table_name: str, row_map: dict[str, object]) -> dict[str, object]:
    normalized = dict(row_map)

    if table_name == "profesores":
        codigo = str(normalized.get("codigo") or "").strip()
        nombre = str(normalized.get("nombre") or "").strip()
        normalized["codigo"] = codigo
        normalized["nombre"] = nombre

    if table_name == "inventario":
        raw_estado = str(normalized.get("estado") or "disponible").strip().lower()
        normalized["estado"] = raw_estado if raw_estado in {"disponible", "prestado"} else "disponible"

    return normalized


def migrate_table(
    pg_conn: Any,
    sqlite_conn: sqlite3.Connection,
    target_table_name: str,
    mapping: dict[str, Any],
    dry_run: bool,
) -> int:
    source_table_name = mapping.get("tables", {}).get(target_table_name, target_table_name)
    columns, rows = read_table(pg_conn, source_table_name)
    normalized_rows = [
        normalize_row(
            target_table_name,
            project_row_to_target(target_table_name, columns, row, mapping),
        )
        for row in rows
    ]

    if dry_run:
        print(
            f"[DRY-RUN] target={target_table_name}, source={source_table_name}: "
            f"{len(normalized_rows)} rows"
        )
        return len(normalized_rows)

    sqlite_conn.execute(f"DELETE FROM {quote_identifier(target_table_name)}")

    if not normalized_rows:
        return 0

    insert_columns = list(normalized_rows[0].keys())
    placeholders = ", ".join(["?" for _ in insert_columns])
    insert_sql = (
        f"INSERT INTO {quote_identifier(target_table_name)} ({', '.join(insert_columns)}) "
        f"VALUES ({placeholders})"
    )

    values = [tuple(row[col] for col in insert_columns) for row in normalized_rows]
    sqlite_conn.executemany(insert_sql, values)
    return len(normalized_rows)


def run_migration(
    pg_config: PgConfig,
    sqlite_path: Path,
    tables: Iterable[str],
    mapping: dict[str, Any],
    dry_run: bool,
) -> None:
    migrated_total = 0

    with connect_postgres(pg_config) as pg_conn:
        with connect_sqlite(sqlite_path) as sqlite_conn:
            ensure_sqlite_schema(sqlite_conn)

            ordered_tables = [name for name in ("profesores", "categorias", "inventario", "prestamos") if name in tables]
            ordered_tables.extend([name for name in tables if name not in ordered_tables])

            for table_name in ordered_tables:
                clean_table = table_name.strip()
                if not clean_table:
                    continue
                if clean_table not in TARGET_TABLE_COLUMNS:
                    raise ValueError(
                        f"Unsupported target table '{clean_table}'. "
                        f"Supported tables: {', '.join(TARGET_TABLE_COLUMNS)}"
                    )

                count = migrate_table(
                    pg_conn=pg_conn,
                    sqlite_conn=sqlite_conn,
                    target_table_name=clean_table,
                    mapping=mapping,
                    dry_run=dry_run,
                )
                migrated_total += count
                print(f"{clean_table}: {count} rows")

            if not dry_run:
                sqlite_conn.commit()

    print(f"Done. Total rows processed: {migrated_total}")


def discover_schema(pg_config: PgConfig, profile_out: str) -> None:
    with connect_postgres(pg_config) as pg_conn:
        profile = build_profile(pg_conn)

    print("Detected tables in PostgreSQL public schema:")
    for table_name, info in profile["tables"].items():
        print(f"- {table_name} ({info['row_count']} rows)")

    if profile_out:
        destination = Path(profile_out)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(
            json.dumps(profile, indent=2, ensure_ascii=True),
            encoding="utf-8",
        )
        print(f"Profile written to: {destination}")


def main() -> int:
    args = parse_args()

    pg_config = PgConfig(
        host=args.pg_host,
        port=args.pg_port,
        dbname=args.pg_db,
        user=args.pg_user,
        password=args.pg_password,
    )

    if args.discover_only:
        discover_schema(pg_config=pg_config, profile_out=args.profile_out)
        return 0

    mapping = load_mapping(args.mapping_file)
    selected_tables = [part.strip() for part in args.tables.split(",") if part.strip()]

    run_migration(
        pg_config=pg_config,
        sqlite_path=Path(args.sqlite_path),
        tables=selected_tables,
        mapping=mapping,
        dry_run=args.dry_run,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
