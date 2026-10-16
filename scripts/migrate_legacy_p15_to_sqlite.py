#!/usr/bin/env python3
"""
Specialized migration for the detected legacy schema:
- profesor
- laptop
- control
- proyector
- historico_de_prestamo
- prestamo_pendiente

It transforms source data into the app SQLite model:
- profesores
- categorias
- inventario
- prestamos
"""

from __future__ import annotations

import argparse
import importlib
import re
import sqlite3
import sys
from collections import Counter
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class PgConfig:
    host: str
    port: int
    dbname: str
    user: str
    password: str


CATEGORY_BY_FIELD = {
    "codigo_laptop": "Laptop",
    "codigo_control": "Control",
    "codigo_proyector": "Proyector",
    "hdmi": "HDMI",
    "extension_electrica": "Extension electrica",
    "bocinas": "Bocinas",
}

NON_INVENTORY_TOKENS = {
    "0",
    "-",
    "--",
    "null",
    "ninguno",
    "na",
    "n/a",
    "no",
    "s/n",
    "sn",
}

NON_INVENTORY_BY_CATEGORY = {
    "Proyector": {"sony", "info", "epson", "benq"},
}

AULA_CODE_PATTERN = re.compile(r"^(?:[A-F]\d{2}|TC\d|LUM\d|COOR)$", re.IGNORECASE)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Migrate legacy P15 PostgreSQL schema into SQLite")
    parser.add_argument("--pg-host", required=True)
    parser.add_argument("--pg-port", required=True, type=int)
    parser.add_argument("--pg-db", required=True)
    parser.add_argument("--pg-user", required=True)
    parser.add_argument("--pg-password", required=True)
    parser.add_argument("--sqlite-path", required=True)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print migration stats without writing rows to SQLite",
    )
    parser.add_argument(
        "--no-auto-create-missing",
        action="store_true",
        help="Do not create placeholder inventory entries for missing legacy equipment codes",
    )
    return parser.parse_args()


def connect_postgres(config: PgConfig) -> Any:
    try:
        psycopg_module = importlib.import_module("psycopg")
    except ImportError as exc:
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
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo TEXT NOT NULL UNIQUE,
            nombre TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS categorias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS inventario (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            categoria_id INTEGER NOT NULL,
            nombre_equipo TEXT NOT NULL,
            identificador TEXT,
            estado TEXT NOT NULL DEFAULT 'disponible',
            FOREIGN KEY (categoria_id) REFERENCES categorias(id)
        );

        CREATE TABLE IF NOT EXISTS prestamos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            equipo_id INTEGER NOT NULL,
            codigo_profe TEXT NOT NULL,
            nombre_profe TEXT,
            fecha_salida TEXT,
            fecha_retorno TEXT,
            FOREIGN KEY (equipo_id) REFERENCES inventario(id)
        );
        """
    )


def clean_text(value: object) -> str:
    return str(value or "").strip()


def normalize_code(value: object) -> str:
    text = clean_text(value)
    if not text:
        return ""

    # Collapse legacy formatting noise like spaces/tabs and case variance.
    compact = "".join(text.split())
    return compact.upper()


def normalize_datetime(value: object) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat(sep=" ")
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time()).isoformat(sep=" ")
    text = clean_text(value)
    return text or None


def normalize_estado(value: object) -> str:
    raw = clean_text(value).lower()
    if not raw:
        return "disponible"
    if "prest" in raw or "ocup" in raw or raw in {"1", "si", "yes"}:
        return "prestado"
    return "disponible"


def is_meaningful_code(value: object) -> bool:
    text = normalize_code(value).lower()
    if not text:
        return False
    return text not in NON_INVENTORY_TOKENS


def should_skip_non_inventory_code(category: str, code: str) -> bool:
    normalized = normalize_code(code).lower()
    if not normalized:
        return True

    if normalized in NON_INVENTORY_TOKENS:
        return True

    if category == "Control" and AULA_CODE_PATTERN.match(normalized):
        return True

    if normalized in NON_INVENTORY_BY_CATEGORY.get(category, set()):
        return True

    return False


def fetch_all(pg_conn: Any, query: str, params: list[object] | None = None) -> list[tuple]:
    with pg_conn.cursor() as cursor:
        cursor.execute(query, params or [])
        return cursor.fetchall()


def load_profesores(pg_conn: Any) -> list[tuple[str, str]]:
    rows = fetch_all(
        pg_conn,
        """
        SELECT
          codigo_profesor,
          nombres,
          apellidos
        FROM profesor
        ORDER BY codigo_profesor
        """,
    )

    result: list[tuple[str, str]] = []
    for codigo, nombres, apellidos in rows:
        c = clean_text(codigo)
        if not c:
            continue
        nombre = f"{clean_text(nombres)} {clean_text(apellidos)}".strip()
        result.append((c, nombre))
    return result


def load_pending_codes(pg_conn: Any) -> dict[str, set[str]]:
    rows = fetch_all(
        pg_conn,
        """
        SELECT
          codigo_laptop,
          codigo_control,
          codigo_proyector,
          hdmi,
          extension_electrica,
          bocinas
        FROM prestamo_pendiente
        """,
    )

    pending: dict[str, set[str]] = {field: set() for field in CATEGORY_BY_FIELD}
    for row in rows:
        for index, field in enumerate(CATEGORY_BY_FIELD):
            value = row[index]
            if is_meaningful_code(value):
                pending[field].add(normalize_code(value))
    return pending


def load_inventario_rows(pg_conn: Any, pending: dict[str, set[str]]) -> list[tuple[str, str, str, str]]:
    inventory_rows: list[tuple[str, str, str, str]] = []

    for codigo_laptop, tipo, estado in fetch_all(
        pg_conn,
        "SELECT codigo_laptop, tipo, estado FROM laptop ORDER BY codigo_laptop",
    ):
        code = normalize_code(codigo_laptop)
        if not code:
            continue
        estado_final = "prestado" if code in pending["codigo_laptop"] else normalize_estado(estado)
        nombre_equipo = f"Laptop {clean_text(tipo)}".strip()
        inventory_rows.append(("Laptop", nombre_equipo, code, estado_final))

    for codigo_control, in fetch_all(
        pg_conn,
        "SELECT codigo_control FROM control ORDER BY codigo_control",
    ):
        code = normalize_code(codigo_control)
        if not code:
            continue
        estado_final = "prestado" if code in pending["codigo_control"] else "disponible"
        inventory_rows.append(("Control", f"Control {code}", code, estado_final))

    for codigo_proyector, estado in fetch_all(
        pg_conn,
        "SELECT codigo_proyector, estado FROM proyector ORDER BY codigo_proyector",
    ):
        code = normalize_code(codigo_proyector)
        if not code:
            continue
        estado_final = "prestado" if code in pending["codigo_proyector"] else normalize_estado(estado)
        inventory_rows.append(("Proyector", f"Proyector {code}", code, estado_final))

    for field, category in (
        ("hdmi", "HDMI"),
        ("extension_electrica", "Extension electrica"),
        ("bocinas", "Bocinas"),
    ):
        rows = fetch_all(
            pg_conn,
            f"""
            SELECT DISTINCT {field}
            FROM historico_de_prestamo
            WHERE {field} IS NOT NULL AND TRIM({field}) <> ''
            UNION
            SELECT DISTINCT {field}
            FROM prestamo_pendiente
            WHERE {field} IS NOT NULL AND TRIM({field}) <> ''
            """,
        )
        for (value,) in rows:
            if not is_meaningful_code(value):
                continue
            code = normalize_code(value)
            estado_final = "prestado" if code in pending[field] else "disponible"
            inventory_rows.append((category, f"{category} {code}", code, estado_final))

    dedup: dict[tuple[str, str], tuple[str, str, str, str]] = {}
    for row in inventory_rows:
        dedup[(row[0], row[2])] = row
    return list(dedup.values())


def build_category_map(sqlite_conn: sqlite3.Connection) -> dict[str, int]:
    rows = sqlite_conn.execute("SELECT id, nombre FROM categorias").fetchall()
    return {str(nombre): int(cid) for cid, nombre in rows}


def build_inventory_lookup(sqlite_conn: sqlite3.Connection) -> dict[tuple[str, str], int]:
    rows = sqlite_conn.execute(
        """
        SELECT i.id, c.nombre, i.identificador
        FROM inventario i
        JOIN categorias c ON c.id = i.categoria_id
        """
    ).fetchall()

    lookup: dict[tuple[str, str], int] = {}
    for eid, category, identifier in rows:
        lookup[(clean_text(category), normalize_code(identifier))] = int(eid)
    return lookup


def load_prestamos_rows(pg_conn: Any) -> list[tuple[str, object, object, dict[str, str]]]:
    historico_rows = fetch_all(
        pg_conn,
        """
        SELECT
          codigo_profesor,
          fecha_y_hora_de_prestamo,
          fecha_y_hora_de_devolucion,
          codigo_laptop,
          codigo_control,
          codigo_proyector,
          hdmi,
          extension_electrica,
          bocinas
        FROM historico_de_prestamo
        """,
    )

    pendientes_rows = fetch_all(
        pg_conn,
        """
        SELECT
          codigo_profesor,
          fecha_y_hora_de_prestamo,
          NULL,
          codigo_laptop,
          codigo_control,
          codigo_proyector,
          hdmi,
          extension_electrica,
          bocinas
        FROM prestamo_pendiente
        """,
    )

    rows: list[tuple[str, object, object, dict[str, str]]] = []
    for raw in list(historico_rows) + list(pendientes_rows):
        codigo_profesor = clean_text(raw[0])
        fecha_prestamo = normalize_datetime(raw[1])
        fecha_devolucion = normalize_datetime(raw[2])
        equipment_map = {
            "codigo_laptop": normalize_code(raw[3]),
            "codigo_control": normalize_code(raw[4]),
            "codigo_proyector": normalize_code(raw[5]),
            "hdmi": normalize_code(raw[6]),
            "extension_electrica": normalize_code(raw[7]),
            "bocinas": normalize_code(raw[8]),
        }
        rows.append((codigo_profesor, fecha_prestamo, fecha_devolucion, equipment_map))
    return rows


def run_migration(
    pg_config: PgConfig,
    sqlite_path: Path,
    dry_run: bool,
    auto_create_missing: bool,
) -> None:
    with connect_postgres(pg_config) as pg_conn:
        profesores = load_profesores(pg_conn)
        pending_codes = load_pending_codes(pg_conn)
        inventario = load_inventario_rows(pg_conn, pending_codes)
        prestamos_legacy = load_prestamos_rows(pg_conn)

    if dry_run:
        print("[DRY-RUN] Legacy extraction summary:")
        print(f"- profesores: {len(profesores)}")
        print(f"- inventario items: {len(inventario)}")
        print(f"- legacy prestamos source rows: {len(prestamos_legacy)}")
        print(f"- auto-create missing inventory: {auto_create_missing}")
        return

    with connect_sqlite(sqlite_path) as sqlite_conn:
        ensure_sqlite_schema(sqlite_conn)

        sqlite_conn.execute("DELETE FROM prestamos")
        sqlite_conn.execute("DELETE FROM inventario")
        sqlite_conn.execute("DELETE FROM categorias")
        sqlite_conn.execute("DELETE FROM profesores")

        sqlite_conn.executemany(
            "INSERT INTO profesores (codigo, nombre) VALUES (?, ?)",
            profesores,
        )

        categorias = [("Laptop",), ("Control",), ("Proyector",), ("HDMI",), ("Extension electrica",), ("Bocinas",)]
        sqlite_conn.executemany("INSERT INTO categorias (nombre) VALUES (?)", categorias)
        category_map = build_category_map(sqlite_conn)

        inventory_rows_sqlite: list[tuple[int, str, str, str]] = []
        for category, nombre_equipo, identificador, estado in inventario:
            category_id = category_map[category]
            inventory_rows_sqlite.append((category_id, nombre_equipo, identificador, estado))

        sqlite_conn.executemany(
            """
            INSERT INTO inventario (categoria_id, nombre_equipo, identificador, estado)
            VALUES (?, ?, ?, ?)
            """,
            inventory_rows_sqlite,
        )

        inventory_lookup = build_inventory_lookup(sqlite_conn)
        prof_name_rows = sqlite_conn.execute("SELECT codigo, nombre FROM profesores").fetchall()
        prof_name_map = {clean_text(codigo): clean_text(nombre) for codigo, nombre in prof_name_rows}

        prestamos_to_insert: list[tuple[int, str, str, object, object]] = []
        skipped_without_equipment = 0
        skipped_without_lookup = 0
        skipped_non_inventory_code = 0
        created_missing_inventory = 0
        unresolved_missing_counter: Counter[tuple[str, str]] = Counter()
        auto_created_counter: Counter[tuple[str, str]] = Counter()

        for codigo_profesor, fecha_prestamo, fecha_devolucion, equipment_map in prestamos_legacy:
            any_equipment = False
            for field_name, category in CATEGORY_BY_FIELD.items():
                equipment_code = normalize_code(equipment_map[field_name])
                if not is_meaningful_code(equipment_code):
                    continue

                if should_skip_non_inventory_code(category, equipment_code):
                    skipped_non_inventory_code += 1
                    continue

                any_equipment = True
                equipo_id = inventory_lookup.get((category, equipment_code))
                if not equipo_id:
                    if auto_create_missing:
                        category_id = category_map[category]
                        legacy_name = f"{category} {equipment_code} (LEGACY)"
                        sqlite_conn.execute(
                            """
                            INSERT INTO inventario (categoria_id, nombre_equipo, identificador, estado)
                            VALUES (?, ?, ?, ?)
                            """,
                            (category_id, legacy_name, equipment_code, "disponible"),
                        )
                        equipo_id = int(sqlite_conn.execute("SELECT last_insert_rowid()").fetchone()[0])
                        inventory_lookup[(category, equipment_code)] = equipo_id
                        created_missing_inventory += 1
                        auto_created_counter[(category, equipment_code)] += 1
                    else:
                        skipped_without_lookup += 1
                        unresolved_missing_counter[(category, equipment_code)] += 1
                        continue

                prestamos_to_insert.append(
                    (
                        equipo_id,
                        codigo_profesor,
                        prof_name_map.get(codigo_profesor, ""),
                        fecha_prestamo,
                        fecha_devolucion,
                    )
                )

            if not any_equipment:
                skipped_without_equipment += 1

        sqlite_conn.executemany(
            """
            INSERT INTO prestamos (equipo_id, codigo_profe, nombre_profe, fecha_salida, fecha_retorno)
            VALUES (?, ?, ?, ?, ?)
            """,
            prestamos_to_insert,
        )

        sqlite_conn.commit()

    print("Migration completed.")
    print(f"- profesores inserted: {len(profesores)}")
    print(f"- inventario inserted: {len(inventario)}")
    print(f"- prestamos inserted: {len(prestamos_to_insert)}")
    print(f"- prestamos skipped (no equipment in source row): {skipped_without_equipment}")
    print(f"- prestamos skipped (non-inventory value): {skipped_non_inventory_code}")
    print(f"- inventory placeholders auto-created: {created_missing_inventory}")
    print(f"- prestamos skipped (equipment code not found in inventory): {skipped_without_lookup}")
    if unresolved_missing_counter:
        print("- top unresolved missing equipment codes (category, code, occurrences):")
        for (category, code), count in unresolved_missing_counter.most_common(15):
            print(f"  - {category}, {code}, {count}")
    if auto_created_counter:
        print("- top auto-created legacy equipment codes (category, code, occurrences):")
        for (category, code), count in auto_created_counter.most_common(15):
            print(f"  - {category}, {code}, {count}")


def main() -> int:
    args = parse_args()

    config = PgConfig(
        host=args.pg_host,
        port=args.pg_port,
        dbname=args.pg_db,
        user=args.pg_user,
        password=args.pg_password,
    )

    run_migration(
        pg_config=config,
        sqlite_path=Path(args.sqlite_path),
        dry_run=args.dry_run,
        auto_create_missing=not args.no_auto_create_missing,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
