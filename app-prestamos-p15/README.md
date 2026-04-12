# App Prestamos P15

Aplicación de escritorio con Tauri + React para control de préstamos e inventario.

## Stack

- React + TypeScript + Vite
- Tauri v2
- SQLite con `@tauri-apps/plugin-sql`
- Rust para comandos nativos de respaldo

## Comandos principales

```powershell
npm install
npm run tauri dev
```

Build frontend:

```powershell
npm run build
```

Build instalador:

```powershell
npm run tauri build
```

## Documentación principal

- Ingeniería y mantenimiento:
  [docs/ENGINEERING_HANDBOOK.md](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/docs/ENGINEERING_HANDBOOK.md)
- Limpieza del repo:
  [docs/REPO_CLEANUP.md](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/docs/REPO_CLEANUP.md)
- Instalación y actualización manual:
  [README_INSTALACION.md](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/README_INSTALACION.md)
- Respaldo y restauración SQLite:
  [docs/sqlite-backup-restore-guide.md](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/docs/sqlite-backup-restore-guide.md)

## Notas operativas

- La app opera solo con SQLite dentro de Tauri.
- Si SQLite o el plugin SQL fallan, la app se bloquea explícitamente.
- La actualización actual es manual mediante nuevo instalador.
