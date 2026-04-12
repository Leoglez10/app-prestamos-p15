# Limpieza del Repositorio

## Qué sí es basura o generado

Estos directorios no deben considerarse fuente del proyecto:

- `node_modules/`
- `dist/`
- `src-tauri/target/`
- `src-tauri/target-codex/`
- `src-tauri/target-codex-2/`
- `src-tauri/target-codex-3/`

Explicación:

- `node_modules/` se reinstala con `npm install`
- `dist/` se regenera con `npm run build`
- `src-tauri/target/` se regenera con `npm run tauri build` o `npm run tauri dev`
- `target-codex*` son directorios temporales de compilaciones auxiliares y no forman parte del código fuente

## Qué archivos Markdown parecen históricos o transitorios

En la raíz hay varios `.md` que hoy parecen ser bitácoras de implementación, diagnóstico o cierre, no documentación canónica:

- `COMPLETADO.md`
- `DIAGNOSTICO_BD.md`
- `IMPLEMENTACION_FINAL.md`
- `PLAN_PRUEBAS_GRANEL.md`
- `QUICK_START_GRANEL.md`
- `RESUMEN_CAMBIOS_GRANEL.md`
- `SOLUCION_CARGA_DATOS.md`
- `TODO_IMPLEMENTACION.md`
- `VERIFICACION_FINAL.md`

No necesariamente están “mal”, pero ya no deberían ser la primera fuente de verdad para mantenimiento.

## Qué documentación debería quedar como oficial

Documentación recomendada como oficial:

- [docs/ENGINEERING_HANDBOOK.md](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/docs/ENGINEERING_HANDBOOK.md)
- [docs/sqlite-backup-restore-guide.md](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/docs/sqlite-backup-restore-guide.md)
- [README.md](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/README.md)
- [README_INSTALACION.md](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/README_INSTALACION.md)

## Qué no borraría sin revisar

- `docs/legacy_profile.json`
  Puede ser necesario para migraciones legadas.
- `scripts/migrate_legacy_p15_to_sqlite.py`
- `scripts/migrate_postgres_to_sqlite.py`
- `database.sql`
  Está desactualizado, pero puede servir como referencia histórica. Mejor actualizarlo o moverlo a `docs/archive/` antes de eliminarlo.
- `prestamos.db`
  No debería versionarse, pero puede ser una copia local valiosa de datos reales.

## Limpieza recomendada manual

Si quieres dejar el repositorio limpio localmente, puedes borrar estos directorios sin afectar el código fuente:

```powershell
Remove-Item -Recurse -Force dist
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force src-tauri\target
Remove-Item -Recurse -Force src-tauri\target-codex
Remove-Item -Recurse -Force src-tauri\target-codex-2
Remove-Item -Recurse -Force src-tauri\target-codex-3
```

Luego puedes regenerar todo con:

```powershell
npm install
npm run build
npm run tauri build
```

## Siguiente limpieza recomendada

Si más adelante quieres una limpieza real del repositorio, el paso correcto sería:

1. Mover `.md` históricos a `docs/archive/`
2. Actualizar `database.sql` o archivarlo
3. Partir `Admin.tsx`
4. Mantener una sola documentación oficial de ingeniería
