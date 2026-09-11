# Arquitectura e inventario técnico

Mapa técnico profundo de la aplicación. El [README](../../README.md) cubre lo que
necesitan los usuarios, el personal administrativo y quien recién llega al código; este
documento es para quien va a **modificar** el proyecto.

> Para reglas de trabajo, deuda técnica conocida y convenciones de mantenimiento, mira
> [`ENGINEERING_HANDBOOK.md`](ENGINEERING_HANDBOOK.md).

---

## Forma del repositorio

El repositorio tiene **dos niveles anidados**. Confundirlos es la causa más común de
comandos que fallan:

```text
app-prestamos-p15/                    ← raíz Git (aquí viven .github/, README.md, CONTRIBUTING.md)
├── .github/
│   ├── ISSUE_TEMPLATE/               ← formularios guiados de bug y mejora
│   └── workflows/build-windows.yml   ← workflow activo de compilación y release
├── CHANGELOG.md
├── README.md                         ← el README principal
└── app-prestamos-p15/                ← código de la aplicación
    ├── docs/                         ← documentación técnica y manual del personal
    ├── scripts/                      ← automatización local y de CI
    ├── src/                          ← frontend React + TypeScript
    ├── src-tauri/                    ← shell Tauri, Rust, capabilities y configuración
    ├── worker/                       ← Cloudflare Worker que abre los reportes en GitHub
    ├── package.json
    └── src-tauri/tauri.conf.json     ← fuente de verdad de la versión
```

- Los comandos de la aplicación (`npm`, `cargo`, `pytest` del manual) se ejecutan desde
  **`app-prestamos-p15/`**, el directorio anidado.
- El workflow vive en la **raíz Git** y compila la aplicación anidada con
  `projectPath: ./app-prestamos-p15`.

---

## Frontend

Stack: React 19 + TypeScript 5.8 + Vite 7, empaquetado por Tauri v2.

```text
src/
├── auth/          ← contexto de sesión y formulario de ingreso
├── components/    ← paneles y diálogos reutilizables
├── hooks/         ← useInventory.ts: capa de datos completa
├── pages/         ← Home, Kiosk, PrestamoRapido, Admin
├── updates/       ← contexto y proveedor del actualizador
├── utils/         ← lógica pura, con su prueba al lado (nombre.test.ts)
├── App.tsx        ← ruteo
└── App.css        ← estilos de toda la aplicación
```

Las cuatro pantallas se corresponden con las rutas `/`, `/kiosko`, `/prestamo-rapido` y
`/admin`.

### Archivos grandes (deuda conocida)

Son los candidatos naturales a dividir cuando haya que tocarlos. Las cifras cambian con
cada cambio; mídelas con `wc -l` antes de citarlas:

| Archivo | Rol | Tamaño aproximado |
|---|---|---|
| `src/pages/Admin.tsx` | Panel de administración completo, con varios paneles internos | ~3.000 líneas |
| `src/hooks/useInventory.ts` | Esquema, migraciones y todas las consultas | ~2.700 líneas |
| `src/pages/PrestamoRapido.tsx` | Préstamo rápido a alumnos y salidas a evento | ~2.500 líneas |
| `src/pages/Kiosk.tsx` | Kiosko de préstamo de equipos | ~2.200 líneas |
| `src/App.css` | Estilos de todas las pantallas | ~3.450 líneas |

---

## Capa de datos

SQLite local mediante `@tauri-apps/plugin-sql`. **No hay servidor ni backend remoto.**

- El **esquema real** se crea y migra en `src/hooks/useInventory.ts`. `database.sql`, en la
  raíz de la aplicación, es referencia histórica y no debe tomarse como fuente de verdad.
- La base del usuario vive fuera del repositorio: en Windows,
  `%AppData%\com.p15.prestamos\prestamos.db`.
- Los archivos `-wal` y `-shm` acompañan a la base. Nunca deben sincronizarse a la nube
  mientras la aplicación esté abierta: se corrompen.

Tablas creadas por el esquema:

| Tabla | Contenido |
|---|---|
| `inventario` | Equipos: identificación patrimonial, categoría, estado y prestabilidad. |
| `categorias` | Categorías y su bandera de prestabilidad. |
| `profesores` | Docentes y administrativos, incluida la bandera `es_admin`. |
| `prestamos` | Préstamos y devoluciones con trazabilidad de quién autorizó. |
| `prestamos_rapidos_alumnos` | Préstamo rápido a alumnos, incluidos los de texto libre. |
| `eventos` | Salidas a evento y su calendario. |
| `fotos_regreso` | Evidencia local del regreso cuando aplica. |
| `celular_dispositivos` | Dispositivos autorizados para el acceso experimental desde celular. |
| `app_settings` | Preferencias de la aplicación. |

> Los dos préstamos rápidos no son lo mismo: el que sale del inventario escribe en
> `prestamos` y en `prestamos_rapidos_alumnos`; el de texto libre escribe **solo** en
> `prestamos_rapidos_alumnos`. Esa diferencia explica qué aparece en Reportes y qué no.

---

## Comandos nativos (Rust)

Registrados en `src-tauri/src/lib.rs`. Son **14**:

| Comando | Módulo | Para qué |
|---|---|---|
| `get_update_readiness` | `lib.rs` | Indica si el actualizador puede operar. |
| `get_database_url` | `lib.rs` | Ruta real del archivo SQLite. |
| `create_backup` | `lib.rs` | Respaldo manual. |
| `list_backups` | `lib.rs` | Lista los respaldos existentes. |
| `open_backups_dir` | `lib.rs` | Abre la carpeta de respaldos en el explorador. |
| `restore_backup_from_bytes` | `lib.rs` | Restaura desde bytes, validando la cabecera SQLite. |
| `restore_backup_from_path` | `lib.rs` | Restaura desde una ruta en disco. |
| `local_ip` | `lib.rs` | IP local, para el acceso desde celular. |
| `celular_registrar_dispositivo` | `celular.rs` | Autoriza un dispositivo móvil. |
| `feedback::reportar_problema` | `feedback.rs` | Envía el reporte al Cloudflare Worker. |
| `patrimonio::leer_excel_patrimonio` | `patrimonio.rs` | Lee el Excel oficial de Patrimonio. |
| `transaccion::ejecutar_transaccion` | `transaccion.rs` | Agrupa varias escrituras en una transacción. |
| `guardar_reporte_inventario` | `lib.rs` | Exporta el reporte de inventario. |
| `guardar_reporte_inventario_excel` | `lib.rs` | Exporta el reporte de inventario en `.xlsx`. |

Módulos presentes: `celular.rs`, `certificado.rs`, `feedback.rs`, `patrimonio.rs`,
`transaccion.rs`, además de `lib.rs` y `main.rs`.

Dos decisiones que conviene no revertir sin pensarlo:

- La versión y el sistema operativo del reporte se leen **en Rust**, no en el webview, para
  que un reporte no pueda mentir sobre ellos.
- `reqwest` está fijado en **0.13** con la feature `rustls` (no `rustls-tls`, que es el
  nombre de 0.12). `tauri-plugin-updater` ya arrastra 0.13; usar 0.12 compilaría dos pilas
  HTTP distintas dentro del mismo binario.

---

## Permisos (capabilities)

`src-tauri/capabilities/default.json` otorga a la ventana principal:

| Permiso | Para qué |
|---|---|
| `core:default` | API base de Tauri. |
| `opener:default` | Abrir `https://`, `mailto:` y `tel:` con la aplicación del sistema, y revelar archivos en el explorador. |
| `updater:allow-check` | Consultar si hay versión nueva. |
| `updater:allow-download-and-install` | Descargar e instalar la actualización. |
| `process:allow-restart` | Reiniciar la aplicación al terminar. |
| `sql:*` | Crear, cargar, consultar y ejecutar contra SQLite local. |

---

## Build, CI y release

El workflow activo es `.github/workflows/build-windows.yml`, en la raíz Git. Tiene tres
trabajos: `prepare-release`, `build-tauri` y `build-manual`.

- Se dispara con un **push a `main`**, con un **tag `v*`** y de forma **manual**
  (`workflow_dispatch`, que acepta `dry_run`).
- Un grupo de concurrencia serializa las ejecuciones, de modo que dos pushes no puedan
  competir por el mismo número de versión.
- Un push a `main` **solo publica** si desde el último tag hay algún commit `feat:` o `fix:`
  sin merge de por medio. Un push de solo documentación o mantenimiento no genera versión,
  no publica nada y no arranca el runner de Windows.
- La versión se escribe en cuatro archivos a la vez — `src-tauri/tauri.conf.json` (fuente de
  verdad), `package.json`, `src-tauri/Cargo.toml` y `src-tauri/Cargo.lock` — y luego se
  sellan el README, el CHANGELOG y el manual del personal.
- El tag y el Release los crea `tauri-action` mientras compila, para que no pueda quedar un
  tag sin Release.
- El PDF del manual se compila aparte y se adjunta al mismo Release.

Automatización en `scripts/`:

| Script | Rol |
|---|---|
| `release-gate.sh` | Decide si corresponde publicar. No escribe nada: sirve para probar en local. |
| `ci-bump-release.sh` | Bump de los cuatro archivos, sellado de documentos, commit y push. No taggea. |
| `publish-release.sh` | Flujo humano de release completo, con rollback. |
| `stamp-release-docs.sh` | Escribe la versión en README, CHANGELOG y manual. |
| `test-release-gate.sh` | Autocomprobación del gate, con repositorios temporales. |
| `test-publish-release.sh` | Autocomprobación de `publish-release.sh` y del sellado. |
| `build-manual-pdf.py` | Genera el PDF del manual. |
| `make-dmg.sh` | Empaquetado auxiliar para macOS. |

---

## Archivos de deriva (`-LeoLaptop`)

Hay tres archivos versionados con ese sufijo que **no forman parte del build**:

- `app-prestamos-p15/package-LeoLaptop.json`
- `app-prestamos-p15/src-tauri/src/lib-LeoLaptop.rs`
- `app-prestamos-p15/src-tauri/tauri.conf-LeoLaptop.json`

Son copias de trabajo de una máquina concreta. Ninguno se compila ni se importa. No los
tomes como referencia del estado real del proyecto y no los sincronices con los archivos
buenos: ya acumularon diferencias.

---

## Reportes dentro de la aplicación

Cuando alguien usa **Reportar un problema**, el recorrido es:

```text
UI (ReportarProblemaPanel)
   ↓  invoke("reportar_problema")     ← versión y SO los agrega Rust
comando Rust (src-tauri/src/feedback.rs)
   ↓  POST HTTPS
Cloudflare Worker (worker/)
   ↓  API de GitHub con un token guardado como secret
Issue en Leoglez10/app-prestamos-p15
```

- El Worker vive en `worker/`, con su propio `wrangler.toml` y su `README.md`. Se despliega
  **desde `worker/`**; correr `wrangler deploy` en la raíz hace otra cosa por completo.
- El token de GitHub nunca entra al repositorio: se carga con
  `npx wrangler secret put GITHUB_TOKEN`.
- El Worker limita a 5 reportes por minuto y por IP. Es una mitigación, no una barrera: la
  URL del Worker viaja dentro del binario y el laboratorio sale por una sola IP pública.
