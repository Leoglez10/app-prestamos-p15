#!/usr/bin/env python3
"""Create timestamped backups for a SQLite database used by the Tauri app."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import shutil
import sqlite3
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create a safe backup copy of a SQLite database.",
    )
    parser.add_argument(
        "--sqlite-path",
        required=True,
        help="Path to the source SQLite file (prestamos.db).",
    )
    parser.add_argument(
        "--out-dir",
        default="./backups/sqlite",
        help="Directory where the backup will be saved.",
    )
    parser.add_argument(
        "--label",
        default="",
        help="Optional label to append to backup filename.",
    )
    return parser.parse_args()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def run_integrity_check(sqlite_path: Path) -> None:
    with sqlite3.connect(sqlite_path) as connection:
        result = connection.execute("PRAGMA integrity_check").fetchone()
        status = (result[0] if result else "").strip().lower()
        if status != "ok":
            raise RuntimeError(f"Integrity check failed: {status or 'unknown error'}")


def main() -> int:
    args = parse_args()

    sqlite_path = Path(args.sqlite_path).expanduser().resolve()
    if not sqlite_path.exists() or not sqlite_path.is_file():
        raise FileNotFoundError(f"SQLite file was not found: {sqlite_path}")

    run_integrity_check(sqlite_path)

    out_dir = Path(args.out_dir).expanduser().resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    timestamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    label = f"-{args.label.strip()}" if args.label.strip() else ""
    out_name = f"prestamos-{timestamp}{label}.db"
    backup_path = out_dir / out_name

    shutil.copy2(sqlite_path, backup_path)
    checksum = sha256(backup_path)

    print(f"source: {sqlite_path}")
    print(f"backup: {backup_path}")
    print(f"sha256: {checksum}")
    print("status: ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
