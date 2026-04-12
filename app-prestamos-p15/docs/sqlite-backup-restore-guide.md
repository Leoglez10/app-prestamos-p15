# SQLite Backup and Restore Guide

This guide covers the operational backup and restore flow for the runtime SQLite database used by the Tauri app.

## 1) Locate `prestamos.db`

In Tauri desktop mode, find the active DB file first. Use the file that the running app writes to.

## 2) Create a backup

```bash
python scripts/backup_sqlite.py \
  --sqlite-path "C:/path/to/prestamos.db" \
  --out-dir "./backups/sqlite"
```

Optional label:

```bash
python scripts/backup_sqlite.py \
  --sqlite-path "C:/path/to/prestamos.db" \
  --out-dir "./backups/sqlite" \
  --label before-maintenance
```

What this script does:
- Validates DB integrity (`PRAGMA integrity_check`) before backup
- Creates timestamped copy
- Prints SHA-256 checksum

## 3) Restore from backup

```bash
python scripts/restore_sqlite.py \
  --backup-path "./backups/sqlite/prestamos-YYYYMMDD-HHMMSS.db" \
  --sqlite-path "C:/path/to/prestamos.db"
```

Force mode (no confirmation):

```bash
python scripts/restore_sqlite.py \
  --backup-path "./backups/sqlite/prestamos-YYYYMMDD-HHMMSS.db" \
  --sqlite-path "C:/path/to/prestamos.db" \
  --force
```

What this script does:
- Validates backup integrity before restore
- Creates a pre-restore copy of current DB (if exists)
- Restores backup file
- Validates integrity again after restore

## 4) Operational recommendations

- Keep at least daily backups and one weekly retention set.
- Store backups outside synchronized folders when possible.
- Always close the app before restore.
- After restore, start app and validate core counts in categorias, inventario, profesores and prestamos.
