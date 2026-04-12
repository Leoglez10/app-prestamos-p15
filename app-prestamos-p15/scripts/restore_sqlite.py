#!/usr/bin/env python3
"""Restore a SQLite backup safely by preserving the current database first."""

from __future__ import annotations

import argparse
import datetime as dt
import shutil
import sqlite3
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Restore a SQLite database from a backup file.",
    )
    parser.add_argument(
        "--backup-path",
        required=True,
        help="Path to backup SQLite file.",
    )
    parser.add_argument(
        "--sqlite-path",
        required=True,
        help="Target path for the restored database.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Skip confirmation prompt.",
    )
    return parser.parse_args()


def run_integrity_check(sqlite_path: Path) -> None:
    with sqlite3.connect(sqlite_path) as connection:
        result = connection.execute("PRAGMA integrity_check").fetchone()
        status = (result[0] if result else "").strip().lower()
        if status != "ok":
            raise RuntimeError(f"Integrity check failed: {status or 'unknown error'}")


def confirm(message: str) -> bool:
    response = input(f"{message} [y/N]: ").strip().lower()
    return response in {"y", "yes", "s", "si"}


def main() -> int:
    args = parse_args()

    backup_path = Path(args.backup_path).expanduser().resolve()
    sqlite_path = Path(args.sqlite_path).expanduser().resolve()

    if not backup_path.exists() or not backup_path.is_file():
        raise FileNotFoundError(f"Backup file was not found: {backup_path}")

    run_integrity_check(backup_path)

    if sqlite_path.exists() and not args.force:
        accepted = confirm(
            f"This will overwrite target database: {sqlite_path}. Continue"
        )
        if not accepted:
            print("restore: cancelled")
            return 0

    sqlite_path.parent.mkdir(parents=True, exist_ok=True)

    previous_copy = None
    if sqlite_path.exists():
        timestamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
        previous_copy = sqlite_path.with_name(f"{sqlite_path.stem}.pre-restore-{timestamp}{sqlite_path.suffix}")
        shutil.copy2(sqlite_path, previous_copy)

    shutil.copy2(backup_path, sqlite_path)
    run_integrity_check(sqlite_path)

    print(f"restored_to: {sqlite_path}")
    if previous_copy:
        print(f"previous_copy: {previous_copy}")
    print("status: ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
