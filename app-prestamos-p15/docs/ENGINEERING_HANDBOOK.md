# App Prestamos P15: Guía de Ingeniería y Mantenimiento

## 1. Resumen ejecutivo

Esta aplicación es una app de escritorio para Windows construida con:

- Frontend: React + TypeScript + Vite
- Shell de escritorio: Tauri v2
- Base de datos: SQLite mediante `@tauri-apps/plugin-sql`
- Backend Rust: mínimo, solo para operaciones nativas de respaldo

El sistema resuelve cuatro áreas funcionales:

- Kiosko de profesores para préstamo y devolución rápida
- Panel administrativo para inventario
- Gestión de categorías y profesores
- Reportes PDF y configuración operativa

## 2. Estructura del proyecto

### Frontend

- [src/App.tsx](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/src/App.tsx)
  Define las rutas principales.
- [src/pages/Home.tsx](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/src/pages/Home.tsx)
  Pantalla inicial con accesos a `kiosko` y `admin`.
- [src/pages/Kiosk.tsx](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/src/pages/Kiosk.tsx)
  Flujo de profesor: login por código, selección de equipo y devoluciones.
- [src/pages/Admin.tsx](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/src/pages/Admin.tsx)
  Pantalla administrativa monolítica. Contiene tabs para inventario, categorías, profesores, reportes y configuración.
- [src/hooks/useInventory.ts](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/src/hooks/useInventory.ts)
  Capa real de acceso a datos y reglas de negocio. Este archivo es el corazón del sistema.
- [src/utils/print.ts](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/src/utils/print.ts)
  Generación de HTML imprimible para “Guardar como PDF”.
- [src/utils/datetime.ts](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/src/utils/datetime.ts)
  Parseo y formateo de fechas SQLite.

### Backend Tauri / Rust

- [src-tauri/src/main.rs](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/src-tauri/src/main.rs)
  Entrada de la app de escritorio.
- [src-tauri/src/lib.rs](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/src-tauri/src/lib.rs)
  Registra plugins y comandos nativos (`create_backup`, `list_backups`).
- [src-tauri/tauri.conf.json](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/src-tauri/tauri.conf.json)
  Configuración de bundling de Tauri.
- [src-tauri/capabilities/default.json](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/src-tauri/capabilities/default.json)
  Permisos Tauri para ventana principal y plugins.

### Scripts auxiliares

- [scripts/backup_sqlite.py](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/scripts/backup_sqlite.py)
- [scripts/restore_sqlite.py](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/scripts/restore_sqlite.py)
- [scripts/migrate_legacy_p15_to_sqlite.py](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/scripts/migrate_legacy_p15_to_sqlite.py)
- [scripts/migrate_postgres_to_sqlite.py](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/scripts/migrate_postgres_to_sqlite.py)

## 3. Flujo funcional de la app

### Home

La ruta `/` solo enruta al usuario hacia:

- `/kiosko`
- `/admin`

### Kiosko

La ruta `/kiosko` hace esto:

1. Inicializa SQLite con `initializeInventoryDb()`.
2. Carga configuración y catálogos.
3. El profesor inicia sesión usando su código.
4. Puede ver préstamos activos.
5. Puede tomar uno o varios equipos.
6. Puede devolver equipos que tenga activos.

Reglas relevantes:

- Solo muestra categorías y equipos marcados como prestables.
- Equipos únicos usan `estado = disponible/prestado/extraviado/...`.
- Equipos a granel usan `stock_total` y el stock disponible se calcula con préstamos activos.

### Admin

La ruta `/admin` contiene login administrativo y tabs:

- `inventario`
- `categorias`
- `profesores`
- `reportes`
- `configuracion`

Cada tab vive dentro del mismo archivo [src/pages/Admin.tsx](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/src/pages/Admin.tsx). Si en el futuro el archivo crece más, conviene separarlo por paneles.

## 4. Base de datos y modelo mental

La base de datos real no debe modelarse desde [database.sql](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/database.sql), porque ese archivo está desactualizado. La fuente viva es [src/hooks/useInventory.ts](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/src/hooks/useInventory.ts), dentro de `schemaStatements` y las migraciones condicionales.

### Tablas activas

#### `profesores`

- `id`
- `codigo`
- `nombre`
- `es_admin`
- `admin_pin`

#### `categorias`

- `id`
- `nombre`
- `es_prestable`

#### `inventario`

- `id`
- `categoria_id`
- `nombre_equipo`
- `identificador`
- `estado`
- `es_prestable`
- `es_granel`
- `stock_total`

#### `prestamos`

- `id`
- `equipo_id`
- `codigo_profe`
- `nombre_profe`
- `fecha_salida`
- `fecha_retorno`
- `estado_prestamo`
- `condicion_regreso`
- `notas_regreso`
- `admin_condicion_entrega`
- `admin_notas_retorno`

#### `app_settings`

- `key`
- `value`

#### `admin_users`

Existe por herencia inicial, pero en la implementación actual el login admin real usa la tabla `profesores` con `es_admin` y `admin_pin`. Hoy `admin_users` no es la ruta principal del sistema.

## 5. Inicialización y migraciones

La app se auto-migra al arrancar desde `initializeInventoryDb()`.

Ese flujo:

1. Abre SQLite vía Tauri.
2. Aplica PRAGMAs:
   - `foreign_keys = ON`
   - `journal_mode = WAL`
3. Ejecuta `CREATE TABLE IF NOT EXISTS`.
4. Revisa columnas existentes con `PRAGMA table_info`.
5. Agrega columnas faltantes con `ALTER TABLE`.
6. Normaliza datos nulos o inconsistentes.
7. Inserta semillas básicas.
8. Corre `PRAGMA integrity_check`.

Esto significa que cualquier cambio de esquema nuevo debe agregarse en:

- `schemaStatements`, si es tabla base
- Bloques de `ALTER TABLE`, si la columna puede faltar en instalaciones anteriores
- Normalizaciones posteriores, si el dato viejo requiere saneamiento

## 6. Reglas de negocio importantes

### Inventario único vs inventario a granel

El sistema distingue dos tipos:

- Equipo único: una unidad identificable. Usa `estado`.
- Equipo a granel: muchas unidades bajo un mismo registro. Usa `stock_total` y conteo de préstamos activos.

Reglas:

- En equipos únicos, prestar cambia `estado` a `prestado`.
- En equipos únicos, devolver cambia `estado` a `disponible`.
- En equipos únicos, marcar perdido cambia `estado` a `extraviado`.
- En equipos a granel, el estado físico no cambia por cada préstamo; el stock disponible se calcula.

### Prestabilidad

Hay dos flags que afectan disponibilidad:

- `categorias.es_prestable`
- `inventario.es_prestable`

El kiosko filtra con ambos. Si algo no aparece para préstamo, revisar esos dos campos primero.

### Administración

El acceso admin usa `loginAdmin()`:

- Busca un `profesor` con `es_admin = 1`
- Valida `admin_pin`
- Existe un admin por defecto sembrado por la inicialización

Esto es funcional pero no es un esquema de autenticación fuerte. Si la app escala, conviene endurecerlo.

## 7. Reportes PDF

Los PDFs no se generan con una librería de PDF real. La estrategia actual es:

1. Se arma un HTML completo.
2. Se inyecta a un `iframe`.
3. Se lanza `window.print()`.
4. El usuario guarda como PDF desde el diálogo del sistema.

Ventajas:

- Sin dependencia extra
- Fácil de ajustar visualmente

Limitaciones:

- Depende del motor de impresión del sistema
- No hay control fino de paginación como con una librería dedicada

La lógica está en:

- [src/utils/print.ts](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/src/utils/print.ts)
- [src/pages/Admin.tsx](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/src/pages/Admin.tsx)

## 8. Respaldos

La app de escritorio tiene comandos nativos de respaldo en Rust.

### Flujo actual

- `create_backup`: copia `prestamos.db` a una carpeta `backups` dentro del directorio de datos de la app.
- `list_backups`: lista respaldos `.db` existentes.

La ruta de datos real se resuelve con `app.path().app_config_dir()`.

En Windows, normalmente termina en algo como:

```text
C:\Users\<usuario>\AppData\Roaming\com.p15.prestamos\
```

Ver también:

- [docs/sqlite-backup-restore-guide.md](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/docs/sqlite-backup-restore-guide.md)

## 9. Cómo correr el proyecto

### Desarrollo web

No es el modo real de operación. Sirve para UI, pero la app depende de Tauri para SQLite.

```powershell
npm run dev
```

### Desarrollo real de escritorio

```powershell
npm run tauri dev
```

### Build frontend

```powershell
npm run build
```

### Build instalador

```powershell
npm run tauri build
```

El instalador queda normalmente en:

- `src-tauri\target\release\bundle\nsis\`
- `src-tauri\target\release\bundle\msi\`

## 10. Cómo sacar una nueva versión

Flujo recomendado:

1. Hacer cambios.
2. Probar en `npm run tauri dev`.
3. Subir versión en:
   - [package.json](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/package.json)
   - [src-tauri/tauri.conf.json](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/src-tauri/tauri.conf.json)
4. Generar instalador con `npm run tauri build`.
5. Entregar el nuevo `.exe` o `.msi`.

La estrategia actual es actualización manual por instalador. No hay auto-update configurado.

## 11. Riesgos técnicos actuales

### Archivo `Admin.tsx` demasiado grande

Tiene demasiadas responsabilidades:

- Inventario
- Categorías
- Profesores
- Reportes
- Configuración
- Login admin

Refactor futuro sugerido:

- `src/pages/admin/InventarioPanel.tsx`
- `src/pages/admin/ReportesPanel.tsx`
- `src/pages/admin/CategoriasPanel.tsx`
- `src/pages/admin/ProfesoresPanel.tsx`
- `src/pages/admin/ConfiguracionPanel.tsx`
- `src/pages/admin/AdminShell.tsx`

### Lógica SQL mezclada con UI contract

[src/hooks/useInventory.ts](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/src/hooks/useInventory.ts) es una mezcla de:

- acceso a DB
- migraciones
- reglas de negocio
- tipos
- seeds

Funciona, pero si el proyecto crece, conviene dividirlo en:

- `db.ts`
- `migrations.ts`
- `repositories/`
- `services/`

### `database.sql` quedó obsoleto

No debe usarse como verdad del sistema mientras no se regenere para reflejar el esquema actual.

### `admin_users` probablemente sobra

Existe en esquema base, pero el login operativo usa `profesores`.

## 12. Qué tocar según el tipo de cambio

### Agregar un campo nuevo al inventario

Editar:

- [src/hooks/useInventory.ts](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/src/hooks/useInventory.ts)
  actualizar esquema, migración, selects, inserts y updates
- [src/pages/Admin.tsx](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/src/pages/Admin.tsx)
  actualizar formularios y tablas
- [src/pages/Kiosk.tsx](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/src/pages/Kiosk.tsx)
  solo si afecta el catálogo del profesor

### Cambiar el flujo de préstamos

Revisar primero:

- `createPrestamoRapido`
- `devolverEquipo`
- `marcarEquipoPerdido`
- `getPrestamosActivosProfesor`
- `getEquipos`

Todos están en [src/hooks/useInventory.ts](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/src/hooks/useInventory.ts)

### Cambiar look & feel del PDF

Revisar:

- [src/utils/print.ts](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/src/utils/print.ts)
- [src/pages/Admin.tsx](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/src/pages/Admin.tsx)

### Cambiar respaldos nativos

Revisar:

- [src-tauri/src/lib.rs](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/src-tauri/src/lib.rs)

## 13. Checklist para mantenimiento seguro

Antes de tocar algo delicado:

1. Crear respaldo de `prestamos.db`.
2. Probar en `npm run tauri dev`, no solo en navegador.
3. Validar estos flujos:
   - login profesor
   - préstamo
   - devolución
   - alta/edición de inventario
   - reportes PDF
   - respaldo
4. Si hubo cambio de esquema, probar con una base vieja además de una limpia.
5. Solo después generar instalador.

## 14. Documentos de referencia recomendados

Para mantenimiento futuro, usar como referencia principal:

- este archivo
- [docs/REPO_CLEANUP.md](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/docs/REPO_CLEANUP.md)
- [README.md](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/README.md)
- [README_INSTALACION.md](C:/Users/leoel/OneDrive/Documentos/Personal%20Trabajos/App%20prestamos%20P15/app-prestamos-p15/README_INSTALACION.md)

Los demás `.md` históricos deben tratarse como contexto antiguo o bitácora, no como contrato vigente del sistema.
