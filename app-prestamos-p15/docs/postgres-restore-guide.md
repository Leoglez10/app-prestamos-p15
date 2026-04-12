# PostgreSQL Restore Guide (Legacy Backup)

This guide restores the legacy backup so you can inspect real table names before running ETL.

## 1) Create target database

```bash
createdb -h localhost -p 5432 -U postgres registro_equipos
```

## 2) Restore custom/binary backup

```bash
pg_restore \
  -h localhost \
  -p 5432 \
  -U postgres \
  -d registro_equipos \
  -v \
  "Registro de equipos/Respaldo de Base de Datos/Respaldo BD COMPLETA 7-JUL-2025.backup"
```

If the backup is plain SQL, use:

```bash
psql -h localhost -p 5432 -U postgres -d registro_equipos -f dump.sql
```

## 3) List tables and columns

```sql
-- In psql or pgAdmin query tool
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name;

SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

## 4) Export schema only (recommended for mapping)

```bash
pg_dump -h localhost -p 5432 -U postgres -d registro_equipos --schema-only > legacy_schema.sql
```

## 5) Run ETL script (dry-run first)

```bash
python scripts/migrate_postgres_to_sqlite.py \
  --pg-host localhost \
  --pg-port 5432 \
  --pg-db registro_equipos \
  --pg-user postgres \
  --pg-password your_password \
  --sqlite-path ./prestamos.db \
  --tables profesores,categorias,inventario,prestamos \
  --dry-run
```

## 6) Discover legacy schema automatically

```bash
python scripts/migrate_postgres_to_sqlite.py \
  --pg-host localhost \
  --pg-port 5432 \
  --pg-db registro_equipos \
  --pg-user postgres \
  --pg-password your_password \
  --sqlite-path ./prestamos.db \
  --discover-only \
  --profile-out ./docs/legacy_profile.json
```

## 7) Use mapping file when legacy names are different

1. Copy `scripts/legacy_table_mapping.sample.json` to `scripts/legacy_table_mapping.json`
2. Adjust table and column names to match your restored PostgreSQL schema
3. Run migration with mapping:

```bash
python scripts/migrate_postgres_to_sqlite.py \
  --pg-host localhost \
  --pg-port 5432 \
  --pg-db registro_equipos \
  --pg-user postgres \
  --pg-password your_password \
  --sqlite-path ./prestamos.db \
  --tables profesores,categorias,inventario,prestamos \
  --mapping-file ./scripts/legacy_table_mapping.json \
  --dry-run
```

When dry-run counts look correct, rerun the same command without `--dry-run`.

## 8) Fast path for detected legacy schema (recommended)

If your discovered profile contains tables like `profesor`, `laptop`, `control`, `proyector`,
`historico_de_prestamo`, and `prestamo_pendiente`, use the specialized script:

```bash
python scripts/migrate_legacy_p15_to_sqlite.py \
  --pg-host localhost \
  --pg-port 5432 \
  --pg-db registro_equipos \
  --pg-user postgres \
  --pg-password your_password \
  --sqlite-path ./prestamos.db \
  --dry-run
```

Then run real migration:

```bash
python scripts/migrate_legacy_p15_to_sqlite.py \
  --pg-host localhost \
  --pg-port 5432 \
  --pg-db registro_equipos \
  --pg-user postgres \
  --pg-password your_password \
  --sqlite-path ./prestamos.db
```
