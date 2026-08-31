import Database from "@tauri-apps/plugin-sql";

import { isTauri } from "@tauri-apps/api/core";
import { invoke } from "@tauri-apps/api/core";
import { normalizarCodigoPatrimonial } from "../utils/codigoPatrimonial";
import { cambiosDeEquipo, COLUMNAS_FICHA_EQUIPO, esPrestableEfectivo, type FichaEquipo } from "../utils/equipoFicha";
import {
  planificarImportacion,
  type LecturaExcel,
  type PlanImportacion,
} from "../utils/importacionPatrimonio";

export type { PlanImportacion };
import {
  construirReporteCsv,
  nombreDelReporte,
  type EquipoRevisable,
} from "../utils/tomaFisica";
import {
  leerReporteCsv,
  planificarFusionReporte,
  type PlanFusion,
} from "../utils/reporteTomaFisica";
import { tituloEvento, validarEvento } from "../utils/evento";

export type { EquipoRevisable };
export type { PlanFusion };

export type { FichaEquipo };

export type PersonaRapida = {
  nombre: string;
  codigo: string;
  tipo_persona: string;
  ultimo_prestamo: string | null;
};

export type Profesor = {
  id: number;
  codigo: string;
  nombre: string;
  es_admin: number;
  admin_pin?: string | null;
};

export type Categoria = {
  id: number;
  nombre: string;
  es_prestable: number;
  total_articulos: number;
};

export type Equipo = {
  id: number;
  nombre_equipo: string;
  identificador: string | null;
  // Ficha de Patrimonio. `id_patrimonial` es el numero del codigo de barras de la
  // etiqueta de la UdeG. Todas nullable a proposito: el granel nunca paso por
  // Patrimonio. Ver docs/INVENTARIO_PATRIMONIO.md.
  id_patrimonial: string | null;
  marca: string | null;
  modelo: string | null;
  num_serie: string | null;
  descripcion: string | null;
  resguardante_codigo: string | null;
  resguardante_nombre: string | null;
  fecha_adquisicion: string | null;
  // Las llena la toma fisica, no el Excel.
  ubicacion: string | null;
  revisado_en: string | null;
  revisado_por: string | null;
  // "Lo busque y no aparecio", que NO es lo mismo que "todavia no lo busque".
  // Ver docs/PLAN_IMPORTACION_PATRIMONIO.md §3 y la columna Localizado del CSV.
  no_localizado_en: string | null;
  no_localizado_por: string | null;
  estado: string;
  es_prestable: number;
  categoria_es_prestable?: number;
  categoria_id: number;
  categoria_nombre: string;
  es_granel: number;
  stock_total: number;
  stock_disponible: number;
  prestamo_activo_id?: number | null;
  prestamo_activo_profe?: string | null;
  prestamo_activo_fecha?: string | null;
  // Nombre del evento cuando el préstamo activo salió con una salida a evento.
  // Null en un préstamo normal: es lo que distingue las dos cosas en la tabla.
  prestamo_activo_evento?: string | null;
};
type PrestamoRapidoInput = {
  equipoIds: number[];
  profesorCodigo: string;
  profesorNombre?: string;
  observacionesEntrega?: string;
};

type IntegrityRow = {
  integrity_check: string;
};

export type HistorialEquipo = {
  id: number;
  codigo_profe: string;
  nombre_profe: string | null;
  fecha_salida: string;
  fecha_retorno: string | null;
  estado_prestamo: string | null;
  observaciones_entrega: string | null;
  condicion_regreso: string | null;
};

export type ReportePrestamoFilters = {
  busqueda?: string;
  estado?: string;
  categoriaId?: number | null;
  fechaDesde?: string;
  fechaHasta?: string;
  limit?: number;
};

export type BackupKind = "auto" | "manual" | "pre-restore" | "otro";

export type BackupInfo = {
  file_name: string;
  backup_path: string;
  created_epoch: number;
  kind: BackupKind;
};

export type RestoreBackupResult = {
  restored_file_name: string;
  backup_path: string;
  restored_at_epoch: number;
};

export type PrestamoRapidoAlumno = {
  id: number;
  nombre_alumno: string;
  codigo_alumno: string;
  nombre_equipo: string;
  persona_prestamo: string;
  fecha_salida: string;
  fecha_retorno: string | null;
  estado: string;
  observaciones: string | null;
  // Authorizing admin identity (added by admin-auth-prestamo-rapido).
  id_admin: number | null;
  autorizante_codigo: string | null;
  autorizante_nombre: string | null;
  // Inventory linkage (added by prestamo-rapido-inventario). tipo_persona is
  // 'alumno' | 'profesor'; equipo_id/prestamo_app_id are null for free-text loans.
  tipo_persona: string;
  equipo_id: number | null;
  prestamo_app_id: number | null;
  // Salida a evento: no nulo cuando esta fila es uno de los objetos que salieron
  // con un evento. La pantalla las agrupa en una sola fila. Ver utils/evento.ts.
  evento_id: number | null;
};

let dbPromise: Promise<Database> | null = null;
let dbUrlPromise: Promise<string> | null = null;
let runtimeStorageMode: "tauri-sqlite" | "blocked" = "blocked";
let runtimeStorageReason = "";
const DB_OPEN_MAX_ATTEMPTS = 3;
const DB_OPEN_RETRY_MS = 350;
const DEFAULT_ADMIN_PIN = "#admin*p15#";
let dbPrepared = false;

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS profesores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    es_admin INTEGER NOT NULL DEFAULT 0,
    admin_pin TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    es_prestable INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS inventario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoria_id INTEGER NOT NULL,
    nombre_equipo TEXT NOT NULL,
    identificador TEXT,
    estado TEXT NOT NULL DEFAULT 'disponible',
    es_prestable INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
  )`,
  `CREATE TABLE IF NOT EXISTS prestamos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipo_id INTEGER NOT NULL,
    codigo_profe TEXT NOT NULL,
    nombre_profe TEXT,
    fecha_salida DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_retorno DATETIME,
    observaciones_entrega TEXT,
    FOREIGN KEY (equipo_id) REFERENCES inventario(id)
  )`,
  `CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  // Fotos de devolución, guardadas dentro de la base para que el respaldo siga
  // siendo un solo archivo que se copia a una USB y trae todo.
  //
  // Va en tabla aparte, no como columna de `prestamos`: así ninguna consulta de
  // préstamos arrastra el blob sin querer. Ver docs/QR_CELULAR.md.
  `CREATE TABLE IF NOT EXISTS fotos_regreso (
    prestamo_id INTEGER PRIMARY KEY,
    imagen TEXT NOT NULL,
    creada_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prestamo_id) REFERENCES prestamos(id) ON DELETE CASCADE
  )`,

  // Celulares vinculados para el acceso por QR. El token nunca se guarda en claro:
  // solo su SHA-256, para que una copia de la base no entregue accesos usables.
  // Ver docs/QR_CELULAR.md.
  `CREATE TABLE IF NOT EXISTS celular_dispositivos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profesor_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    etiqueta TEXT NOT NULL,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    ultimo_uso DATETIME,
    revocado_en DATETIME,
    FOREIGN KEY (profesor_id) REFERENCES profesores(id)
  )`,
  // Salidas a evento: SOLO el encabezado. Los objetos que salieron viven en
  // `prestamos_rapidos_alumnos` con `evento_id`, o sea son préstamos rápidos
  // normales — por eso devolver uno libera el equipo en el inventario sin
  // código nuevo. El estado del evento NO se guarda, se deriva de sus filas;
  // ver `src/utils/evento.ts`.
  `CREATE TABLE IF NOT EXISTS eventos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    lugar TEXT NOT NULL,
    fecha_inicio TEXT NOT NULL,
    fecha_fin TEXT,
    hora_inicio TEXT,
    hora_fin TEXT,
    responsable_nombre TEXT NOT NULL,
    responsable_codigo TEXT NOT NULL,
    responsable_tipo TEXT NOT NULL DEFAULT 'profesor',
    expositor_nombre TEXT,
    expositor_contacto TEXT,
    observaciones TEXT,
    id_admin INTEGER REFERENCES profesores(id) ON DELETE SET NULL,
    autorizante_codigo TEXT,
    autorizante_nombre TEXT,
    creado_en DATETIME,
    cerrado_en DATETIME,
    cerrado_por TEXT,
    notas_cierre TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS prestamos_rapidos_alumnos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_alumno TEXT NOT NULL,
    codigo_alumno TEXT NOT NULL,
    nombre_equipo TEXT NOT NULL,
    persona_prestamo TEXT NOT NULL,
    fecha_salida DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_retorno DATETIME,
    estado TEXT DEFAULT 'activo',
    observaciones TEXT,
    tipo_persona TEXT NOT NULL DEFAULT 'alumno',
    equipo_id INTEGER REFERENCES inventario(id) ON DELETE SET NULL,
    prestamo_app_id INTEGER,
    evento_id INTEGER REFERENCES eventos(id) ON DELETE SET NULL
  )`,

];

const initialDataStatements = [
  "INSERT OR IGNORE INTO categorias (id, nombre) VALUES (1, 'Laptops')",
  "INSERT OR IGNORE INTO categorias (id, nombre) VALUES (2, 'Adaptadores HDMI')",
  "INSERT OR IGNORE INTO profesores (codigo, nombre) VALUES ('2958101', 'Edgar Ivan Aguilar Duran')",
  `INSERT OR IGNORE INTO inventario (id, categoria_id, nombre_equipo, identificador, estado)
   VALUES (1, 1, 'Laptop Dell Latitude', 'LAT-001', 'disponible')`,
  `INSERT OR IGNORE INTO inventario (id, categoria_id, nombre_equipo, identificador, estado)
   VALUES (2, 2, 'Adaptador HDMI USB-C', 'HDMI-008', 'disponible')`,
];

const defaultSettingsStatements = [
  "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('kiosk_show_pendientes', 'true')",
  "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('kiosk_show_catalogo', 'true')",
  "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('backup_auto_enabled', 'true')",
  "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('backup_auto_hours', '12')",
];

const isTauriRuntime = (): boolean => {
  return isTauri();
};

export const getRuntimeStorageMode = (): "tauri-sqlite" | "blocked" => runtimeStorageMode;

export const getRuntimeStorageReason = (): string => runtimeStorageReason;

const requireTauriRuntime = (): void => {
  if (isTauriRuntime()) {
    return;
  }

  runtimeStorageMode = "blocked";
  runtimeStorageReason =
    "Esta app requiere Tauri + SQLite para operar. Inicia con 'npm run tauri dev' o ejecuta el build de escritorio.";
  throw new Error(runtimeStorageReason);
};

/**
 * Una sentencia SQL con sus parametros, lista para `ejecutar_transaccion`.
 */
type SentenciaSql = { sql: string; params: Array<string | number | null> };

/**
 * Corre varias sentencias en UNA transaccion real.
 *
 * No se puede hacer con `db.execute("BEGIN")`: el pool de tauri-plugin-sql tiene
 * 10 conexiones y cada `execute` toma una cualquiera, asi que el BEGIN queda en
 * una conexion y las escrituras salen por otras. Cuando el pool reusa la de la
 * transaccion, esa se queda con el lock de escritura hasta el COMMIT y el resto
 * revienta con "database is locked" (SQLite codigo 5).
 * El lado Rust vive en `src-tauri/src/transaccion.rs`.
 */
const ejecutarEnTransaccion = async (sentencias: SentenciaSql[]): Promise<void> => {
  if (sentencias.length === 0) return;
  // Fuerza que la base este abierta y migrada antes de pedirle el pool a Rust.
  await getDb();
  const db = await resolveDatabaseUrl();
  await invoke("ejecutar_transaccion", { db, sentencias });
};

const enforceConnectionPragmas = async (db: Database): Promise<void> => {
  await db.execute("PRAGMA foreign_keys = ON");
  await db.execute("PRAGMA journal_mode = WAL");
};

const delay = async (ms: number): Promise<void> => {
  await new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
};

const resolveDatabaseUrl = async (): Promise<string> => {
  if (!dbUrlPromise) {
    dbUrlPromise = (async () => {
      try {
        const resolvedUrl = await invoke<string>("get_database_url");
        if (resolvedUrl.startsWith("sqlite:")) {
          return resolvedUrl;
        }
      } catch {
        // Fallback para mantener compatibilidad si el comando nativo no estuviera disponible.
      }

      return "sqlite:prestamos.db";
    })();
  }

  return dbUrlPromise;
};

const verifyDatabaseIntegrity = async (db: Database): Promise<void> => {
  const rows = await db.select<IntegrityRow[]>("PRAGMA integrity_check");
  const failures = rows
    .map((row) => row.integrity_check)
    .filter((value) => value.toLowerCase() !== "ok");

  if (failures.length > 0) {
    throw new Error(`La base SQLite reporta problemas de integridad: ${failures.join("; ")}`);
  }
};

const getTableColumns = async (db: Database, tableName: string): Promise<string[]> => {
  const rows = await db.select<Array<{ name: string }>>(`PRAGMA table_info(${tableName})`);
  return rows.map((row) => row.name);
};

const prepareDatabase = async (db: Database): Promise<void> => {
  if (dbPrepared) {
    return;
  }

  await enforceConnectionPragmas(db);

  for (const statement of schemaStatements) {
    await db.execute(statement);
  }

  const prestamosColumns = await getTableColumns(db, "prestamos");
  if (!prestamosColumns.includes("estado_prestamo")) {
    await db.execute("ALTER TABLE prestamos ADD COLUMN estado_prestamo TEXT DEFAULT 'activo'");
  }
  if (!prestamosColumns.includes("observaciones_entrega")) {
    await db.execute("ALTER TABLE prestamos ADD COLUMN observaciones_entrega TEXT");
  }
  if (!prestamosColumns.includes("condicion_regreso")) {
    await db.execute("ALTER TABLE prestamos ADD COLUMN condicion_regreso TEXT");
  }
  if (!prestamosColumns.includes("notas_regreso")) {
    await db.execute("ALTER TABLE prestamos ADD COLUMN notas_regreso TEXT");
  }
  if (!prestamosColumns.includes("admin_condicion_entrega")) {
    await db.execute("ALTER TABLE prestamos ADD COLUMN admin_condicion_entrega TEXT");
  }
  if (!prestamosColumns.includes("admin_notas_retorno")) {
    await db.execute("ALTER TABLE prestamos ADD COLUMN admin_notas_retorno TEXT");
  }

  const inventarioColumns = await getTableColumns(db, "inventario");
  // Ficha de Patrimonio. Todas TEXT y nullable: el granel nunca paso por
  // Patrimonio y no va a tener ninguna. Ver docs/PLAN_IMPORTACION_PATRIMONIO.md §4.
  //
  // `ubicacion` no la llena el Excel (solo 150 filas de 2137 la traen): la produce
  // la toma fisica caminando con la pistola.
  for (const columna of [
    "id_patrimonial",
    "marca",
    "modelo",
    "num_serie",
    "descripcion",
    "resguardante_codigo",
    "resguardante_nombre",
    "fecha_adquisicion",
    "ubicacion",
    // Toma fisica. NO entran en COLUMNAS_FICHA_EQUIPO a proposito: solo las
    // escribe `registrarRevision`, asi ni la importacion ni el formulario de
    // Admin pueden pisarlas por accidente.
    "revisado_en",
    "revisado_por",
    "no_localizado_en",
    "no_localizado_por",
  ]) {
    if (!inventarioColumns.includes(columna)) {
      await db.execute(`ALTER TABLE inventario ADD COLUMN ${columna} TEXT`);
    }
  }
  if (!inventarioColumns.includes("es_granel")) {
    await db.execute("ALTER TABLE inventario ADD COLUMN es_granel INTEGER DEFAULT 0");
  }
  if (!inventarioColumns.includes("stock_total")) {
    await db.execute("ALTER TABLE inventario ADD COLUMN stock_total INTEGER DEFAULT 1");
  }
  if (!inventarioColumns.includes("es_prestable")) {
    await db.execute("ALTER TABLE inventario ADD COLUMN es_prestable INTEGER DEFAULT 1");
  }

  const categoriasColumns = await getTableColumns(db, "categorias");
  if (!categoriasColumns.includes("es_prestable")) {
    await db.execute("ALTER TABLE categorias ADD COLUMN es_prestable INTEGER DEFAULT 1");
  }

  const prestamosRapidosAlumnosColumns = await getTableColumns(db, "prestamos_rapidos_alumnos");
  if (!prestamosRapidosAlumnosColumns.includes("id_admin")) {
    await db.execute("ALTER TABLE prestamos_rapidos_alumnos ADD COLUMN id_admin INTEGER REFERENCES profesores(id) ON DELETE SET NULL");
  }
  if (!prestamosRapidosAlumnosColumns.includes("autorizante_codigo")) {
    await db.execute("ALTER TABLE prestamos_rapidos_alumnos ADD COLUMN autorizante_codigo TEXT");
  }
  if (!prestamosRapidosAlumnosColumns.includes("autorizante_nombre")) {
    await db.execute("ALTER TABLE prestamos_rapidos_alumnos ADD COLUMN autorizante_nombre TEXT");
  }
  if (!prestamosRapidosAlumnosColumns.includes("tipo_persona")) {
    // SQLite exige un DEFAULT no nulo al agregar una columna NOT NULL; 'alumno'
    // preserva el significado de todas las filas previas.
    await db.execute("ALTER TABLE prestamos_rapidos_alumnos ADD COLUMN tipo_persona TEXT NOT NULL DEFAULT 'alumno'");
  }
  if (!prestamosRapidosAlumnosColumns.includes("equipo_id")) {
    await db.execute("ALTER TABLE prestamos_rapidos_alumnos ADD COLUMN equipo_id INTEGER REFERENCES inventario(id) ON DELETE SET NULL");
  }
  if (!prestamosRapidosAlumnosColumns.includes("prestamo_app_id")) {
    await db.execute("ALTER TABLE prestamos_rapidos_alumnos ADD COLUMN prestamo_app_id INTEGER");
  }
  if (!prestamosRapidosAlumnosColumns.includes("evento_id")) {
    // Sin REFERENCES: SQLite no permite agregar una columna con llave foránea
    // en un ALTER TABLE. La integridad la sostiene el código, que solo escribe
    // `evento_id` con el id que acaba de insertar en `eventos`.
    await db.execute("ALTER TABLE prestamos_rapidos_alumnos ADD COLUMN evento_id INTEGER");
  }

  const profesoresColumns = await getTableColumns(db, "profesores");
  if (!profesoresColumns.includes("es_admin")) {
    await db.execute("ALTER TABLE profesores ADD COLUMN es_admin INTEGER DEFAULT 0");
  }
  if (!profesoresColumns.includes("admin_pin")) {
    await db.execute("ALTER TABLE profesores ADD COLUMN admin_pin TEXT");
  }

  // Lo que hace que reimportar el Excel de Patrimonio actualice en vez de
  // duplicar. En SQLite los NULL no chocan entre si dentro de un indice unico,
  // asi que el granel (sin id patrimonial) convive sin problema.
  await db.execute(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_inventario_id_patrimonial ON inventario (id_patrimonial)"
  );

  await db.execute("UPDATE prestamos SET estado_prestamo = 'activo' WHERE estado_prestamo IS NULL OR TRIM(estado_prestamo) = ''");
  await db.execute("UPDATE prestamos SET fecha_salida = CURRENT_TIMESTAMP WHERE fecha_salida IS NULL OR TRIM(fecha_salida) = ''");
  await db.execute("UPDATE inventario SET es_granel = 0 WHERE es_granel IS NULL");
  await db.execute("UPDATE inventario SET stock_total = 1 WHERE stock_total IS NULL OR stock_total < 1");
  await db.execute("UPDATE inventario SET es_prestable = 1 WHERE es_prestable IS NULL");
  await db.execute("UPDATE categorias SET es_prestable = 1 WHERE es_prestable IS NULL");
  await db.execute("UPDATE profesores SET es_admin = 0 WHERE es_admin IS NULL");

  await db.execute(
    `INSERT INTO profesores (codigo, nombre, es_admin, admin_pin)
     VALUES ('223992647', 'Administrador P15', 1, ?)
     ON CONFLICT(codigo) DO NOTHING`,
    [DEFAULT_ADMIN_PIN]
  );

  // FIX: Archivar todos los préstamos previos al nuevo sistema (anteriores al 21-Mar-2026)
  // para que no saturen la vista del Kiosko de los profesores.
  await db.execute("UPDATE prestamos SET estado_prestamo = 'historico' WHERE estado_prestamo = 'activo' AND date(fecha_salida) < '2026-03-21'").catch((e) => console.error("Migracion historicos failed", e));

  for (const statement of defaultSettingsStatements) {
    await db.execute(statement);
  }

  const seededCheck = await db.select<{count: number}[]>("SELECT COUNT(*) as count FROM app_settings WHERE key = 'app_seeded'");
  
  if (seededCheck[0].count === 0) {
    // Para identificar si es realmente una base de datos nueva (y no una base exportada de antes del parche), 
    // revisamos si las tablas están completamente vacías. Si tiene cualquier categoría, profesor o préstamo,
    // significa que es una base de datos ya en uso, así que no insertamos los datos de prueba.
    const catsCount = await db.select<{count: number}[]>("SELECT COUNT(*) as count FROM categorias");
    const profsCount = await db.select<{count: number}[]>("SELECT COUNT(*) as count FROM profesores");
    const prestamosCount = await db.select<{count: number}[]>("SELECT COUNT(*) as count FROM prestamos");

    const totalData = catsCount[0].count + profsCount[0].count + prestamosCount[0].count;

    if (totalData === 0) {
      for (const statement of initialDataStatements) {
        await db.execute(statement);
      }
    }
    await db.execute("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('app_seeded', 'true')");
  }

  await verifyDatabaseIntegrity(db);
  dbPrepared = true;
};

const getDb = async (): Promise<Database> => {
  requireTauriRuntime();

  if (!dbPromise) {
    dbPromise = (async () => {
      const dbUrl = await resolveDatabaseUrl();
      let latestError: unknown;

      for (let attempt = 1; attempt <= DB_OPEN_MAX_ATTEMPTS; attempt += 1) {
        try {
          const db = await Database.load(dbUrl);
          await prepareDatabase(db);
          return db;
        } catch (error) {
          latestError = error;
          if (attempt < DB_OPEN_MAX_ATTEMPTS) {
            await delay(DB_OPEN_RETRY_MS);
          }
        }
      }

      const message =
        latestError instanceof Error ? latestError.message : "error desconocido al abrir la base";
      throw new Error(`No se pudo abrir la base SQLite (${dbUrl}): ${message}`);
    })();
  }

  try {
    return await dbPromise;
  } catch (error) {
    dbPromise = null;
    throw error;
  }
};

export const initializeInventoryDb = async (): Promise<void> => {
  requireTauriRuntime();

  try {
    await getDb();

    runtimeStorageMode = "tauri-sqlite";
    runtimeStorageReason = "";
  } catch (error) {
    dbPromise = null;
    dbPrepared = false;
    runtimeStorageMode = "blocked";
    const errorMessage = typeof error === 'string' ? error : (error instanceof Error ? error.message : JSON.stringify(error));
    runtimeStorageReason = `No se pudo inicializar SQLite en Tauri: ${errorMessage}`;
    throw new Error(runtimeStorageReason);
  }
};

export const getCategorias = async (): Promise<Categoria[]> => {
  const db = await getDb();
  return db.select<Categoria[]>(
    `SELECT c.id,
            c.nombre,
            COALESCE(c.es_prestable, 1) AS es_prestable,
            COUNT(i.id) AS total_articulos
     FROM categorias c
     LEFT JOIN inventario i ON i.categoria_id = c.id
     GROUP BY c.id, c.nombre, c.es_prestable
     ORDER BY c.nombre`
  );
};

export const closeInventoryDb = async (): Promise<void> => {
  if (!dbPromise) {
    return;
  }

  try {
    const db = await dbPromise;
    await db.close();
  } finally {
    dbPromise = null;
    dbPrepared = false;
  }
};

export const getSettings = async (): Promise<Record<string, string>> => {
  const db = await getDb();
  const rows = await db.select<{key: string, value: string}[]>("SELECT key, value FROM app_settings");
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
};

export const updateSetting = async (key: string, value: string): Promise<void> => {
  const db = await getDb();
  await db.execute(
    "INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = $2",
    [key, value]
  );
};

export const createCategoria = async (nombre: string, esPrestable = true): Promise<void> => {
  const cleanedName = nombre.trim();
  if (!cleanedName) {
    throw new Error("El nombre de categoria es obligatorio.");
  }

  const db = await getDb();
  await db.execute("INSERT INTO categorias (nombre, es_prestable) VALUES (?, ?)", [
    cleanedName,
    esPrestable ? 1 : 0,
  ]);
};

export const updateCategoria = async (id: number, nombre: string, esPrestable = true): Promise<void> => {
  const cleanedName = nombre.trim();
  if (!cleanedName) {
    throw new Error("El nombre de categoria es obligatorio.");
  }

  const db = await getDb();
  await db.execute("UPDATE categorias SET nombre = ?, es_prestable = ? WHERE id = ?", [
    cleanedName,
    esPrestable ? 1 : 0,
    id,
  ]);
};

export const deleteCategoria = async (id: number): Promise<void> => {
  const db = await getDb();
  const rows = await db.select<{count: number}[]>(
    "SELECT COUNT(*) as count FROM inventario WHERE categoria_id = ?",
    [id]
  );
  if (rows[0].count > 0) {
    throw new Error("No se puede eliminar la categoría porque aún tiene equipos asociados. Elimina los equipos primero.");
  }
  await db.execute("DELETE FROM categorias WHERE id = ?", [id]);
};

export const searchProfesores = async (codigo: string): Promise<Profesor[]> => {
  const db = await getDb();
  const cleanedCodigo = codigo.trim();

  if (!cleanedCodigo) {
    return db.select<Profesor[]>(
      "SELECT id, codigo, nombre, COALESCE(es_admin, 0) AS es_admin, admin_pin FROM profesores ORDER BY nombre LIMIT 8",
    );
  }

  return db.select<Profesor[]>(
    `SELECT id, codigo, nombre, COALESCE(es_admin, 0) AS es_admin, admin_pin
     FROM profesores
     WHERE codigo LIKE ? OR nombre LIKE ?
     ORDER BY nombre
     LIMIT 10`,
    [`%${cleanedCodigo}%`, `%${cleanedCodigo}%`],
  );
};

export const getProfesores = async (): Promise<Profesor[]> => {
  const db = await getDb();
  return db.select<Profesor[]>(
    "SELECT id, codigo, nombre, COALESCE(es_admin, 0) AS es_admin, admin_pin FROM profesores ORDER BY nombre",
  );
};

export const createProfesor = async (input: { codigo: string; nombre: string; es_admin?: number; admin_pin?: string | null }): Promise<void> => {
  const codigo = input.codigo.trim();
  const nombre = input.nombre.trim();
  const esAdmin = input.es_admin ?? 0;
  const adminPin = esAdmin === 1 ? (input.admin_pin?.trim() || DEFAULT_ADMIN_PIN) : null;

  if (!codigo || !nombre) {
    throw new Error("El codigo y nombre del profesor son obligatorios.");
  }

  const db = await getDb();
  await db.execute(
    "INSERT INTO profesores (codigo, nombre, es_admin, admin_pin) VALUES (?, ?, ?, ?)",
    [codigo, nombre, esAdmin, adminPin],
  );
};

export const updateProfesor = async (
  id: number,
  input: { codigo: string; nombre: string; es_admin?: number; admin_pin?: string | null },
): Promise<void> => {
  const codigo = input.codigo.trim();
  const nombre = input.nombre.trim();
  const esAdmin = input.es_admin ?? 0;
  const adminPin = esAdmin === 1 ? (input.admin_pin?.trim() || DEFAULT_ADMIN_PIN) : null;

  if (!codigo || !nombre) {
    throw new Error("El codigo y nombre del profesor son obligatorios.");
  }

  const db = await getDb();
  await db.execute(
    "UPDATE profesores SET codigo = ?, nombre = ?, es_admin = ?, admin_pin = ? WHERE id = ?",
    [codigo, nombre, esAdmin, adminPin, id],
  );
};

// --- Fotos de devolución. Ver docs/QR_CELULAR.md. ---

/**
 * Solo los ids que tienen foto, no las imágenes.
 *
 * Traer todas las fotos para pintar una tabla sería cargar megabytes que casi
 * nadie va a mirar; la imagen se pide una por una al abrirla.
 */
export const getPrestamosConFoto = async (): Promise<Set<number>> => {
  const db = await getDb();
  const filas = await db.select<Array<{ prestamo_id: number }>>(
    "SELECT prestamo_id FROM fotos_regreso"
  );
  return new Set(filas.map((fila) => fila.prestamo_id));
};

/** Devuelve el data URL listo para un `<img src>`, o null si no hay foto. */
export const getFotoRegreso = async (prestamoId: number): Promise<string | null> => {
  const db = await getDb();
  const filas = await db.select<Array<{ imagen: string }>>(
    "SELECT imagen FROM fotos_regreso WHERE prestamo_id = ? LIMIT 1",
    [prestamoId]
  );
  return filas.length > 0 ? filas[0].imagen : null;
};

// --- Celulares vinculados (acceso por QR). Ver docs/QR_CELULAR.md. ---

export type CelularDispositivo = {
  id: number;
  etiqueta: string;
  nombre_profesor: string;
  creado_en: string;
  ultimo_uso: string | null;
};

/** Solo los dispositivos vigentes: los revocados dejan de existir para la UI. */
export const getCelularDispositivos = async (): Promise<CelularDispositivo[]> => {
  const db = await getDb();
  return db.select<CelularDispositivo[]>(
    `SELECT d.id, d.etiqueta, p.nombre AS nombre_profesor, d.creado_en, d.ultimo_uso
       FROM celular_dispositivos d
       JOIN profesores p ON p.id = d.profesor_id
      WHERE d.revocado_en IS NULL
      ORDER BY d.creado_en DESC`
  );
};

/**
 * Revoca el acceso de un celular. No se borra la fila: queda el registro de que
 * ese dispositivo existió y cuándo se le quitó el acceso.
 */
export const revocarCelularDispositivo = async (id: number): Promise<void> => {
  const db = await getDb();
  await db.execute(
    "UPDATE celular_dispositivos SET revocado_en = CURRENT_TIMESTAMP WHERE id = ?",
    [id]
  );
};

export const loginAdmin = async (codigo: string, pin: string): Promise<Profesor | null> => {
  const db = await getDb();
  const rows = await db.select<Profesor[]>(
    `SELECT id, codigo, nombre, COALESCE(es_admin, 0) AS es_admin, admin_pin
     FROM profesores
     WHERE codigo = ?
       AND COALESCE(es_admin, 0) = 1
       AND (
         COALESCE(NULLIF(admin_pin, ''), ?) = ?
         OR (? = '223992647' AND ? = ?)
       )
     LIMIT 1`,
    [codigo.trim(), DEFAULT_ADMIN_PIN, pin.trim(), codigo.trim(), pin.trim(), DEFAULT_ADMIN_PIN]
  );
  return rows.length > 0 ? rows[0] : null;
};

// Code-only admin lookup for the simplified /prestamo-rapido flow. No PIN check,
// no backdoor clause. Returns the admin row if it exists with es_admin=1, else null.
export const loginAdminByCode = async (codigo: string): Promise<Profesor | null> => {
  const db = await getDb();
  const rows = await db.select<Profesor[]>(
    `SELECT id, codigo, nombre, COALESCE(es_admin, 0) AS es_admin, admin_pin
     FROM profesores
     WHERE codigo = ?
       AND COALESCE(es_admin, 0) = 1
     LIMIT 1`,
    [codigo.trim()]
  );
  return rows.length > 0 ? rows[0] : null;
};

// Re-validates a stored admin session against the DB. Used by the AuthContext on
// restore (and unlock) to defeat session forgery via hand-crafted localStorage
// blobs. Returns true only if the profesor row still exists with es_admin=1.
export const verifyAdminStoredSession = async (adminId: number, codigo: string): Promise<boolean> => {
  const db = await getDb();
  const rows = await db.select<{ id: number }[]>(
    `SELECT id FROM profesores WHERE id = ? AND codigo = ? AND COALESCE(es_admin, 0) = 1 LIMIT 1`,
    [adminId, codigo]
  );
  return rows.length > 0;
};

export const deleteProfesor = async (id: number): Promise<void> => {
  const db = await getDb();
  await db.execute("DELETE FROM profesores WHERE id = ?", [id]);
};

// Columnas de ficha, en un solo lugar para no repetirlas en cada variante de la
// consulta. Los nombres son fijos, no vienen de afuera.
const SELECT_FICHA_EQUIPO = COLUMNAS_FICHA_EQUIPO.map((columna) => `i.${columna}`).join(", ");
const SELECT_REVISION_EQUIPO =
  "i.revisado_en, i.revisado_por, i.no_localizado_en, i.no_localizado_por";

export const getEquipos = async (categoriaId?: number | null): Promise<Equipo[]> => {
  const db = await getDb();
  const responsableActivoSql = `
    CASE
      WHEN COALESCE(i.es_granel, 0) = 1 THEN (
        SELECT GROUP_CONCAT(DISTINCT COALESCE(NULLIF(TRIM(p2.nombre_profe), ''), p2.codigo_profe))
        FROM prestamos p2
        WHERE p2.equipo_id = i.id AND p2.estado_prestamo = 'activo'
      )
      ELSE (
        SELECT COALESCE(NULLIF(TRIM(p2.nombre_profe), ''), p2.codigo_profe)
        FROM prestamos p2
        WHERE p2.equipo_id = i.id AND p2.estado_prestamo = 'activo'
        ORDER BY p2.fecha_salida DESC, p2.id DESC
        LIMIT 1
      )
    END
  `;
  const prestamoActivoIdSql = `
    CASE
      WHEN COALESCE(i.es_granel, 0) = 1 THEN NULL
      ELSE (
        SELECT p2.id
        FROM prestamos p2
        WHERE p2.equipo_id = i.id AND p2.estado_prestamo = 'activo'
        ORDER BY p2.fecha_salida DESC, p2.id DESC
        LIMIT 1
      )
    END
  `;
  // fecha_salida se guarda en hora local con formato 'YYYY-MM-DD HH:MM:SS',
  // asi que MAX() ordena bien como texto y sirve igual para granel y equipo unico.
  const prestamoActivoFechaSql = `
    (
      SELECT MAX(p2.fecha_salida)
      FROM prestamos p2
      WHERE p2.equipo_id = i.id AND p2.estado_prestamo = 'activo'
    )
  `;
  // Si el equipo salió con un evento, su nombre. Se llega por
  // prestamos_rapidos_alumnos, que es donde vive la liga evento ↔ inventario.
  // COALESCE con el lugar por lo mismo que `tituloEvento`: el nombre es opcional.
  const eventoActivoSql = `
    (
      SELECT COALESCE(NULLIF(TRIM(e.nombre), ''), e.lugar)
      FROM prestamos_rapidos_alumnos pra
      JOIN eventos e ON e.id = pra.evento_id
      WHERE pra.equipo_id = i.id AND pra.estado = 'activo'
      ORDER BY pra.fecha_salida DESC, pra.id DESC
      LIMIT 1
    )
  `;

  if (!categoriaId) {
    try {
      return db.select<Equipo[]>(
        `SELECT i.id, i.nombre_equipo, i.identificador, i.estado, i.categoria_id, c.nombre AS categoria_nombre,
                COALESCE(c.es_prestable, 1) AS categoria_es_prestable,
                COALESCE(i.es_prestable, 1) AS es_prestable,
                ${SELECT_FICHA_EQUIPO}, ${SELECT_REVISION_EQUIPO},
                COALESCE(i.es_granel, 0) AS es_granel, COALESCE(i.stock_total, 1) AS stock_total,
                (COALESCE(i.stock_total, 1) - (
                    SELECT COUNT(*) FROM prestamos p2 WHERE p2.equipo_id = i.id AND p2.estado_prestamo = 'activo'
                )) AS stock_disponible,
                ${prestamoActivoIdSql} AS prestamo_activo_id,
                ${responsableActivoSql} AS prestamo_activo_profe,
                ${prestamoActivoFechaSql} AS prestamo_activo_fecha,
                ${eventoActivoSql} AS prestamo_activo_evento
         FROM inventario i
         JOIN categorias c ON c.id = i.categoria_id
         ORDER BY c.nombre, i.nombre_equipo`
      );
    } catch (err) {
      // Fallback si columnas no existen
      console.warn("Query con es_granel/stock_total falló, usando fallback sin nuevas columnas", err);
      const result = await db.select<any[]>(
        `SELECT i.id, i.nombre_equipo, i.identificador, i.estado, i.categoria_id, c.nombre AS categoria_nombre,
                COALESCE(c.es_prestable, 1) AS categoria_es_prestable,
                COALESCE(i.es_prestable, 1) AS es_prestable,
                NULL AS prestamo_activo_id,
                (
                  SELECT COALESCE(NULLIF(TRIM(p2.nombre_profe), ''), p2.codigo_profe)
                  FROM prestamos p2
                  WHERE p2.equipo_id = i.id
                  ORDER BY p2.fecha_salida DESC, p2.id DESC
                  LIMIT 1
                ) AS prestamo_activo_profe,
                (
                  SELECT MAX(p2.fecha_salida)
                  FROM prestamos p2
                  WHERE p2.equipo_id = i.id
                ) AS prestamo_activo_fecha
         FROM inventario i
         JOIN categorias c ON c.id = i.categoria_id
         ORDER BY c.nombre, i.nombre_equipo`
      );
      // Agregar valores por defecto para que coincida con tipo Equipo
      return result.map(r => ({
        ...r,
        id_patrimonial: null,
        marca: null,
        modelo: null,
        num_serie: null,
        descripcion: null,
        resguardante_codigo: null,
        resguardante_nombre: null,
        fecha_adquisicion: null,
        ubicacion: null,
        revisado_en: null,
        revisado_por: null,
        no_localizado_en: null,
        no_localizado_por: null,
        categoria_es_prestable: 1,
        es_prestable: 1,
        es_granel: 0,
        prestamo_activo_evento: null,
        stock_total: 1,
        stock_disponible: r.estado === 'disponible' ? 1 : 0
      }));
    }
  }

  try {
    return db.select<Equipo[]>(
      `SELECT i.id, i.nombre_equipo, i.identificador, i.estado, i.categoria_id, c.nombre AS categoria_nombre,
              COALESCE(c.es_prestable, 1) AS categoria_es_prestable,
              COALESCE(i.es_prestable, 1) AS es_prestable,
              ${SELECT_FICHA_EQUIPO}, ${SELECT_REVISION_EQUIPO},
              COALESCE(i.es_granel, 0) AS es_granel, COALESCE(i.stock_total, 1) AS stock_total,
              (COALESCE(i.stock_total, 1) - (
                  SELECT COUNT(*) FROM prestamos p2 WHERE p2.equipo_id = i.id AND p2.estado_prestamo = 'activo'
              )) AS stock_disponible,
              ${prestamoActivoIdSql} AS prestamo_activo_id,
              ${responsableActivoSql} AS prestamo_activo_profe,
              ${prestamoActivoFechaSql} AS prestamo_activo_fecha,
              ${eventoActivoSql} AS prestamo_activo_evento
       FROM inventario i
       JOIN categorias c ON c.id = i.categoria_id
       WHERE i.categoria_id = ?
       ORDER BY i.nombre_equipo`,
      [categoriaId]
    );
  } catch (err) {
    // Fallback si columnas no existen
    console.warn("Query con es_granel/stock_total falló, usando fallback sin nuevas columnas", err);
    const result = await db.select<any[]>(
      `SELECT i.id, i.nombre_equipo, i.identificador, i.estado, i.categoria_id, c.nombre AS categoria_nombre,
              COALESCE(c.es_prestable, 1) AS categoria_es_prestable,
              COALESCE(i.es_prestable, 1) AS es_prestable,
              NULL AS prestamo_activo_id,
              (
                SELECT COALESCE(NULLIF(TRIM(p2.nombre_profe), ''), p2.codigo_profe)
                FROM prestamos p2
                WHERE p2.equipo_id = i.id
                ORDER BY p2.fecha_salida DESC, p2.id DESC
                LIMIT 1
              ) AS prestamo_activo_profe,
              (
                SELECT MAX(p2.fecha_salida)
                FROM prestamos p2
                WHERE p2.equipo_id = i.id
              ) AS prestamo_activo_fecha
       FROM inventario i
       JOIN categorias c ON c.id = i.categoria_id
       WHERE i.categoria_id = ?
       ORDER BY i.nombre_equipo`,
      [categoriaId]
    );
    // Agregar valores por defecto para que coincida con tipo Equipo
    return result.map(r => ({
      ...r,
      id_patrimonial: null,
      marca: null,
      modelo: null,
      num_serie: null,
      descripcion: null,
      resguardante_codigo: null,
      resguardante_nombre: null,
      fecha_adquisicion: null,
      ubicacion: null,
      revisado_en: null,
      revisado_por: null,
      no_localizado_en: null,
      no_localizado_por: null,
      categoria_es_prestable: 1,
      es_prestable: 1,
      es_granel: 0,
      prestamo_activo_evento: null,
      stock_total: 1,
      stock_disponible: r.estado === 'disponible' ? 1 : 0
    }));
  }
};

export const getCurrentLocalDateTime = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

export const createPrestamoRapido = async ({
  equipoIds,
  profesorCodigo,
  profesorNombre,
  observacionesEntrega,
}: PrestamoRapidoInput): Promise<void> => {
  if (!equipoIds || equipoIds.length === 0) {
    throw new Error("No se seleccionaron equipos.");
  }

  const db = await getDb();

  // Validate all requested equipments
  const placeholders = equipoIds.map(() => "?").join(",");
  const rows = await db.select<Array<{ id: number; estado: string; es_granel: number; stock_total: number; es_prestable: number; categoria_es_prestable: number }>>(
    `SELECT i.id,
            i.estado,
            i.es_granel,
            i.stock_total,
            COALESCE(i.es_prestable, 1) AS es_prestable,
            COALESCE(c.es_prestable, 1) AS categoria_es_prestable,
            (i.stock_total - (
                SELECT COUNT(*) FROM prestamos p2 WHERE p2.equipo_id = i.id AND p2.estado_prestamo = 'activo'
            )) AS stock_disponible
     FROM inventario i
     JOIN categorias c ON c.id = i.categoria_id
     WHERE i.id IN (${placeholders})`,
    equipoIds,
  );

  // Consider frequency of requested IDs
  const idCounts: Record<number, number> = {};
  for (const id of equipoIds) {
    idCounts[id] = (idCounts[id] || 0) + 1;
  }

  for (const [idStr, count] of Object.entries(idCounts)) {
    const numId = Number(idStr);
    const row = rows.find(r => r.id === numId);
    if (!row) {
      throw new Error(`El equipo con ID ${numId} no existe.`);
    }

    if (!esPrestableEfectivo(row)) {
      throw new Error(`El equipo con ID ${numId} está marcado como no prestable.`);
    }

    if (row.es_granel === 1) {
      const stock_disponible = (row as any).stock_disponible;
      if (stock_disponible < count) {
        throw new Error(`Stock insuficiente para equipo ID ${numId}. Solicitados: ${count}, Disponibles: ${stock_disponible}`);
      }
    } else {
      if (count > 1) {
        throw new Error(`El equipo con ID ${numId} es único y no se puede prestar más de 1 vez.`);
      }
      if (row.estado !== "disponible") {
        throw new Error(`El equipo único con ID ${numId} no está disponible.`);
      }
    }
  }

  // Create loans for each equipment
  const fechaSalida = getCurrentLocalDateTime();
  for (const equipoId of equipoIds) {
    await db.execute(
      `INSERT INTO prestamos (equipo_id, codigo_profe, nombre_profe, fecha_salida, estado_prestamo, observaciones_entrega)
       VALUES (?, ?, ?, ?, 'activo', ?)`,
      [equipoId, profesorCodigo.trim(), (profesorNombre ?? "").trim(), fechaSalida, (observacionesEntrega ?? "").trim()],
    );

    // Solo actualizamos de inmediato a prestado si no es a granel
    // Si es a granel, el select ya restará dinámicamente de "stock_disponible"
    const isGranel = (Object.keys(idCounts).map(Number).includes(equipoId)) && 
                     rows.find(r => r.id === equipoId)?.es_granel === 1;
    
    if (!isGranel) {
      await db.execute(
        "UPDATE inventario SET estado = 'prestado' WHERE id = ?",
        [equipoId],
      );
    }
  }
};

/**
 * El indice unico de `id_patrimonial` es lo que evita que el mismo objeto entre
 * dos veces, pero escupe un error de SQLite en crudo. Escribir dos veces la
 * misma etiqueta es un error de captura normal, asi que se traduce.
 */
const traducirErrorDeEquipo = (error: unknown, idPatrimonial: string | null): Error => {
  const mensaje = error instanceof Error ? error.message : String(error);

  if (idPatrimonial && mensaje.includes("UNIQUE constraint failed: inventario.id_patrimonial")) {
    return new Error(`El ID de Patrimonio ${idPatrimonial} ya esta registrado en otro equipo.`);
  }

  return error instanceof Error ? error : new Error(mensaje);
};

export type CreateEquipoInput = FichaEquipo & {
  nombre_equipo: string;
  identificador: string | null;
  categoria_id: number;
  es_prestable: number;
  es_granel: number;
  stock_total: number;
};

/**
 * El INSERT de un equipo, sin ejecutarlo. La importacion de Patrimonio necesita
 * la sentencia suelta para meter miles de ellas en una sola transaccion.
 */
const sentenciaCrearEquipo = (input: CreateEquipoInput): SentenciaSql => {
  // `estado` no viene del formulario: un equipo nuevo siempre nace disponible.
  const cambios: Record<string, string | number | null> = { ...cambiosDeEquipo(input), estado: "disponible" };
  const columnas = Object.keys(cambios);

  return {
    sql: `INSERT INTO inventario (${columnas.join(", ")}) VALUES (${columnas.map(() => "?").join(", ")})`,
    params: columnas.map((columna) => cambios[columna]),
  };
};

export const createEquipo = async (input: CreateEquipoInput): Promise<void> => {
  const db = await getDb();
  const { sql, params } = sentenciaCrearEquipo(input);

  try {
    await db.execute(sql, params);
  } catch (error) {
    throw traducirErrorDeEquipo(error, input.id_patrimonial ?? null);
  }
};

export const deleteEquipo = async (equipoId: number): Promise<void> => {
  const db = await getDb();
  await db.execute("DELETE FROM prestamos WHERE equipo_id = ?", [equipoId]);
  await db.execute("DELETE FROM inventario WHERE id = ?", [equipoId]);
};

/**
 * Todo opcional a proposito: `updateEquipo` escribe SOLO las claves presentes.
 *
 * Antes reescribia la fila entera, y eso convertia cada columna nueva en una
 * trampa: cualquier pantalla que no conociera el campo lo borraba al guardar. Ya
 * habia pasado con `id_patrimonial` desde el panel de categorias. Con `undefined`
 * distinto de `null`, no saber de un campo es no tocarlo, y borrarlo a proposito
 * sigue siendo posible mandando `null`.
 */
export type UpdateEquipoInput = FichaEquipo & {
  nombre_equipo?: string;
  identificador?: string | null;
  categoria_id?: number;
  estado?: string;
  es_prestable?: number;
  es_granel?: number;
  stock_total?: number;
};

/** El UPDATE de un equipo, sin ejecutarlo. `null` si no hay nada que cambiar. */
const sentenciaActualizarEquipo = (
  id: number,
  input: UpdateEquipoInput
): SentenciaSql | null => {
  const cambios = cambiosDeEquipo(input);

  // Los nombres de columna salen de las listas blancas de `equipoFicha.ts`, nunca
  // del objeto que llega: no hay forma de inyectar SQL por aca.
  const columnas = Object.keys(cambios);
  if (columnas.length === 0) return null;

  return {
    sql: `UPDATE inventario SET ${columnas.map((columna) => `${columna} = ?`).join(", ")} WHERE id = ?`,
    params: [...columnas.map((columna) => cambios[columna]), id],
  };
};

export const updateEquipo = async (id: number, input: UpdateEquipoInput): Promise<void> => {
  const db = await getDb();
  const sentencia = sentenciaActualizarEquipo(id, input);
  if (!sentencia) return;

  try {
    await db.execute(sentencia.sql, sentencia.params);
  } catch (error) {
    throw traducirErrorDeEquipo(error, input.id_patrimonial ?? null);
  }
};

export type PrestamoActivo = {
  id: number;
  equipo_id: number;
  nombre_equipo: string;
  fecha_salida: string;
};

export const getPrestamosActivosProfesor = async (codigo_profe: string): Promise<PrestamoActivo[]> => {
  const db = await getDb();
  return db.select<PrestamoActivo[]>(
    `SELECT p.id, p.equipo_id, i.nombre_equipo, p.fecha_salida
     FROM prestamos p
     JOIN inventario i ON i.id = p.equipo_id
     WHERE p.codigo_profe = ? AND p.estado_prestamo = 'activo'
     ORDER BY p.fecha_salida DESC`,
    [codigo_profe.trim()]
  );
};

export const verificarProfesorExacto = async (codigo: string): Promise<Profesor | null> => {
  const db = await getDb();
  const rows = await db.select<Profesor[]>(
    "SELECT id, codigo, nombre FROM profesores WHERE codigo = ? LIMIT 1",
    [codigo.trim()]
  );
  return rows.length > 0 ? rows[0] : null;
};

export const devolverEquipo = async (
  prestamoId: number, 
  equipoId: number,
  condicion: string, 
  notas: string
): Promise<void> => {
  const db = await getDb();
  
  // Verificar si el equipo es a granel
  const equipoData = await db.select<{ es_granel: number }[]>(
    "SELECT es_granel FROM inventario WHERE id = ?",
    [equipoId]
  );

  if (equipoData.length === 0) {
    throw new Error(`El equipo con ID ${equipoId} no existe.`);
  }

const esGranel = equipoData[0].es_granel === 1;
  const fechaRetorno = getCurrentLocalDateTime();
  
  await db.execute(
    `UPDATE prestamos 
     SET estado_prestamo = 'devuelto', 
         fecha_retorno = $1, 
         condicion_regreso = $2, 
         notas_regreso = $3 
      WHERE id = $4`,
    [fechaRetorno, condicion.trim(), notas.trim(), prestamoId]
  );

  // Si es a granel, NO actualizar estado (permanece siempre 'disponible')
  // Si es equipo único, marcarlo como disponible
  if (!esGranel) {
    await db.execute(
      "UPDATE inventario SET estado = 'disponible' WHERE id = ?",
      [equipoId]
    );
  }
};

export const marcarEquipoPerdido = async (
  prestamoId: number,
  equipoId: number
): Promise<void> => {
  const db = await getDb();

  // Verificar si el equipo es a granel
  const equipoData = await db.select<{ es_granel: number }[]>(
    "SELECT es_granel FROM inventario WHERE id = ?",
    [equipoId]
  );

  if (equipoData.length === 0) {
    throw new Error(`El equipo con ID ${equipoId} no existe.`);
  }

  const esGranel = equipoData[0].es_granel === 1;
  const fechaRetorno = getCurrentLocalDateTime();

  await db.execute(
`UPDATE prestamos 
      SET estado_prestamo = 'devuelto', 
          fecha_retorno = $1, 
          condicion_regreso = 'No devuelto / Perdido', 
          notas_regreso = 'Marcado manualmente como perdido por administración' 
      WHERE id = $2`,
    [fechaRetorno, prestamoId]
  );

  // Si es a granel, NO cambiar el estado (el stock se refleja en los préstamos activos)
  // Si es equipo único, marcar como extraviado
  if (!esGranel) {
    await db.execute(
      "UPDATE inventario SET estado = 'extraviado' WHERE id = $1",
      [equipoId]
    );
  }
};

export type ReportePrestamo = {
  id: number;
  codigo_profe: string;
  nombre_profe: string;
  nombre_equipo: string;
  categoria_nombre: string;
  estado_prestamo: string;
  fecha_salida: string;
  fecha_retorno: string | null;
  observaciones_entrega: string | null;
  condicion_regreso: string | null;
  admin_condicion_entrega: string | null;
  admin_notas_retorno: string | null;
  cantidad_prestada: number;
  /**
   * Ids de TODOS los préstamos que esta fila agrupa, separados por coma.
   *
   * `id` es solo el más chico del grupo (`MIN(p.id)`), así que no sirve para
   * buscar algo atado a un préstamo puntual —como su foto de devolución—.
   */
  ids: string;
};

export const getReportePrestamos = async (filters: ReportePrestamoFilters = {}): Promise<ReportePrestamo[]> => {
  const db = await getDb();
  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (filters.busqueda?.trim()) {
    const searchTerm = `%${filters.busqueda.trim()}%`;
    conditions.push("(p.codigo_profe LIKE ? OR p.nombre_profe LIKE ? OR i.nombre_equipo LIKE ? OR c.nombre LIKE ?)");
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (filters.estado?.trim()) {
    conditions.push("p.estado_prestamo = ?");
    params.push(filters.estado.trim());
  }

  if (filters.categoriaId) {
    conditions.push("c.id = ?");
    params.push(filters.categoriaId);
  }

  if (filters.fechaDesde) {
    conditions.push("date(p.fecha_salida) >= date(?)");
    params.push(filters.fechaDesde);
  }

  if (filters.fechaHasta) {
    conditions.push("date(p.fecha_salida) <= date(?)");
    params.push(filters.fechaHasta);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = Math.max(50, Math.min(filters.limit ?? 500, 2000));
  const rows = await db.select<ReportePrestamo[]>(
    `SELECT MIN(p.id) AS id,
            p.codigo_profe,
            p.nombre_profe,
            i.nombre_equipo,
            COALESCE(c.nombre, 'Sin categoría') AS categoria_nombre,
            p.estado_prestamo,
            MIN(p.fecha_salida) AS fecha_salida,
            MAX(p.fecha_retorno) AS fecha_retorno,
            MIN(p.observaciones_entrega) AS observaciones_entrega,
            MIN(p.condicion_regreso) AS condicion_regreso,
            MIN(p.admin_condicion_entrega) AS admin_condicion_entrega,
            MIN(p.admin_notas_retorno) AS admin_notas_retorno,
            COUNT(*) AS cantidad_prestada,
            GROUP_CONCAT(p.id) AS ids
     FROM prestamos p
     LEFT JOIN inventario i ON i.id = p.equipo_id
     LEFT JOIN categorias c ON c.id = i.categoria_id
     ${whereClause}
     GROUP BY p.equipo_id, p.codigo_profe, p.nombre_profe, p.estado_prestamo
     ORDER BY MIN(p.fecha_salida) DESC
     LIMIT ${limit}`,
    params
  );
  return rows.map(r => ({
    ...r,
    nombre_equipo: r.nombre_equipo || 'Equipo Eliminado',
    categoria_nombre: r.categoria_nombre || 'Sin categoría',
    nombre_profe: r.nombre_profe || 'Desconocido',
    estado_prestamo: r.estado_prestamo || 'activo',
    cantidad_prestada: r.cantidad_prestada || 1
  }));
};

/**
 * Loan history of ONE inventory row.
 *
 * A row with `es_granel = 0` is one physical object, so `prestamos.equipo_id`
 * already tells us who took that exact unit. Nothing to join or group: the
 * per-unit trace is the reason units get their own row and their own QR.
 */
export const getHistorialEquipo = async (equipoId: number): Promise<HistorialEquipo[]> => {
  const db = await getDb();
  const rows = await db.select<HistorialEquipo[]>(
    `SELECT p.id,
            p.codigo_profe,
            p.nombre_profe,
            p.fecha_salida,
            p.fecha_retorno,
            p.estado_prestamo,
            p.observaciones_entrega,
            p.condicion_regreso
     FROM prestamos p
     WHERE p.equipo_id = ?
     ORDER BY p.fecha_salida DESC
     LIMIT 50`,
    [equipoId]
  );
  return rows.map(r => ({
    ...r,
    nombre_profe: r.nombre_profe || r.codigo_profe,
    estado_prestamo: r.estado_prestamo || (r.fecha_retorno ? "devuelto" : "activo"),
  }));
};

export const updatePrestamoObservacionesAdmin = async (
  prestamoId: number,
  condicion: string,
  notas: string
): Promise<void> => {
  const db = await getDb();
  await db.execute(
    `UPDATE prestamos
     SET admin_condicion_entrega = ?,
         admin_notas_retorno = ?
     WHERE id = ?`,
    [condicion.trim(), notas.trim(), prestamoId]
  );
};

export const deletePrestamo = async (prestamoId: number): Promise<void> => {
  const db = await getDb();
  await db.execute("DELETE FROM prestamos WHERE id = ?", [prestamoId]);
};

export const deleteHistorialPrestamos = async (): Promise<void> => {
  const db = await getDb();
  await db.execute("DELETE FROM prestamos WHERE COALESCE(estado_prestamo, 'activo') <> 'activo'");
};

export const deleteAllReportes = async (): Promise<void> => {
  await ejecutarEnTransaccion([
    { sql: "DELETE FROM prestamos", params: [] },
    { sql: "UPDATE inventario SET estado = 'disponible' WHERE estado = 'prestado'", params: [] },
  ]);
};

export const createBackup = async (auto = false): Promise<BackupInfo> => {
  const db = await getDb();
  // SQLite runs in WAL mode: recent transactions live in the -wal file, not in
  // prestamos.db. Without this checkpoint the file copy on the Rust side would
  // silently miss them. Failing to checkpoint must not block the backup itself.
  try {
    await db.select("PRAGMA wal_checkpoint(TRUNCATE)");
  } catch (error) {
    console.warn("No se pudo consolidar el WAL antes del respaldo:", error);
  }

  return invoke<BackupInfo>("create_backup", { auto });
};

export const openBackupsFolder = async (): Promise<string> => {
  return invoke<string>("open_backups_dir");
};

export const getBackups = async (): Promise<BackupInfo[]> => {
  return invoke<BackupInfo[]>("list_backups");
};

/**
 * Restaura un respaldo que ya vive en la carpeta de respaldos de la app.
 *
 * Es el mismo camino que `restoreBackupFromFile`, sin pedirle al usuario que
 * busque el archivo: la ruta sale de `getBackups()`. Rust valida que la ruta
 * caiga dentro de la carpeta de respaldos antes de tocar nada.
 */
export const restoreBackupFromPath = async (backupPath: string): Promise<RestoreBackupResult> => {
  await closeInventoryDb();

  try {
    const result = await invoke<RestoreBackupResult>("restore_backup_from_path", {
      backupPath,
    });

    await initializeInventoryDb();
    return result;
  } catch (error) {
    dbPromise = null;
    throw error;
  }
};

export const restoreBackupFromFile = async (file: File): Promise<RestoreBackupResult> => {
  const bytes = Array.from(new Uint8Array(await file.arrayBuffer()));
  await closeInventoryDb();

  try {
    const result = await invoke<RestoreBackupResult>("restore_backup_from_bytes", {
      fileName: file.name,
      bytes,
    });

    await initializeInventoryDb();
    return result;
  } catch (error) {
    dbPromise = null;
    throw error;
  }
};

export const getPrestamosRapidosAlumnos = async (filters?: {
  busqueda?: string;
  estado?: string;
}): Promise<PrestamoRapidoAlumno[]> => {
  const db = await getDb();
  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (filters?.busqueda?.trim()) {
    const term = `%${filters.busqueda.trim()}%`;
    conditions.push("(nombre_alumno LIKE ? OR codigo_alumno LIKE ? OR nombre_equipo LIKE ? OR persona_prestamo LIKE ?)");
    params.push(term, term, term, term);
  }

  if (filters?.estado?.trim()) {
    conditions.push("estado = ?");
    params.push(filters.estado.trim());
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  return db.select<PrestamoRapidoAlumno[]>(
    `SELECT id, nombre_alumno, codigo_alumno, nombre_equipo, persona_prestamo,
            fecha_salida, fecha_retorno, estado, observaciones,
            id_admin, autorizante_codigo, autorizante_nombre,
            COALESCE(tipo_persona, 'alumno') AS tipo_persona, equipo_id, prestamo_app_id,
            evento_id
     FROM prestamos_rapidos_alumnos ${whereClause} ORDER BY fecha_salida DESC LIMIT 500`,
    params
  );
};

/**
 * People already seen in Prestamo Rapido, most recent first. This is the
 * "history" side of the person autocomplete: anyone captured as free text once
 * is offered back on the next loan without needing a table of its own, since
 * every loan row already carries the name, the code and the person type.
 */
export const getPersonasRapidas = async (): Promise<PersonaRapida[]> => {
  const db = await getDb();
  return db.select<PersonaRapida[]>(
    `SELECT nombre_alumno AS nombre,
            codigo_alumno AS codigo,
            COALESCE(tipo_persona, 'alumno') AS tipo_persona,
            MAX(fecha_salida) AS ultimo_prestamo
     FROM prestamos_rapidos_alumnos
     WHERE TRIM(nombre_alumno) <> '' AND TRIM(codigo_alumno) <> ''
     GROUP BY codigo_alumno, COALESCE(tipo_persona, 'alumno')
     ORDER BY ultimo_prestamo DESC
     LIMIT 400`
  );
};

export const createPrestamoRapidoAlumno = async (input: import("../auth/types").PrestamoRapidoAlumnoCreate): Promise<void> => {
  if (!input.admin) {
    throw new Error("createPrestamoRapidoAlumno requires an authenticated admin");
  }
  if (!input.nombre_alumno.trim() || !input.codigo_alumno.trim() || !input.nombre_equipo.trim()) {
    throw new Error("Todos los campos son obligatorios.");
  }

  const db = await getDb();
  const adminNombre = input.admin.nombre.trim();
  const tipoPersona = input.tipo_persona === "profesor" ? "profesor" : "alumno";
  await db.execute(
    // fecha_salida se escribe explicita en hora local: el DEFAULT CURRENT_TIMESTAMP
    // de SQLite guarda UTC y quedaba desfasado contra fecha_retorno, que ya usa
    // getCurrentLocalDateTime(). Sin esto el tiempo transcurrido de la UI miente.
    `INSERT INTO prestamos_rapidos_alumnos
       (nombre_alumno, codigo_alumno, nombre_equipo, persona_prestamo, observaciones,
        id_admin, autorizante_codigo, autorizante_nombre, fecha_salida, tipo_persona)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.nombre_alumno.trim(),
      input.codigo_alumno.trim(),
      input.nombre_equipo.trim(),
      adminNombre,
      (input.observaciones ?? "").trim(),
      input.admin.id,
      input.admin.codigo.trim(),
      adminNombre,
      getCurrentLocalDateTime(),
      tipoPersona,
    ]
  );
};

type EquipoDisponible = {
  id: number;
  nombre_equipo: string;
  estado: string;
  es_granel: number;
  es_prestable: number;
  categoria_es_prestable: number;
  stock_disponible: number;
};

/**
 * Lee un ítem del inventario y confirma que PUEDE salir, o lanza con el motivo
 * exacto. Se saca aparte porque la salida a evento necesita revisar TODOS los
 * objetos antes de escribir el primero: si el tercero no está disponible, el
 * evento no debe quedar a medias.
 */
const requireEquipoDisponible = async (db: Database, equipoId: number): Promise<EquipoDisponible> => {
  const rows = await db.select<EquipoDisponible[]>(
    `SELECT i.id,
            i.nombre_equipo,
            i.estado,
            COALESCE(i.es_granel, 0) AS es_granel,
            COALESCE(i.es_prestable, 1) AS es_prestable,
            COALESCE(c.es_prestable, 1) AS categoria_es_prestable,
            (COALESCE(i.stock_total, 1) - (
                SELECT COUNT(*) FROM prestamos p2 WHERE p2.equipo_id = i.id AND p2.estado_prestamo = 'activo'
            )) AS stock_disponible
     FROM inventario i
     JOIN categorias c ON c.id = i.categoria_id
     WHERE i.id = ?`,
    [equipoId],
  );

  if (rows.length === 0) {
    throw new Error(`El equipo con ID ${equipoId} no existe.`);
  }
  const row = rows[0];

  if (!esPrestableEfectivo(row)) {
    throw new Error(`El equipo "${row.nombre_equipo}" está marcado como no prestable.`);
  }

  if (row.es_granel === 1) {
    if (row.stock_disponible < 1) {
      throw new Error(`Stock insuficiente para "${row.nombre_equipo}". Disponibles: ${row.stock_disponible}`);
    }
  } else if (row.estado !== "disponible") {
    throw new Error(`El equipo único "${row.nombre_equipo}" no está disponible.`);
  }

  return row;
};

/**
 * Escribe las DOS filas de una salida ligada al inventario: el préstamo real en
 * `prestamos` —que es lo que marca el equipo como prestado— y su espejo en
 * `prestamos_rapidos_alumnos`, amarrados por prestamo_app_id / equipo_id para
 * que devolver aquí también devuelva allá.
 *
 * El préstamo rápido de siempre y cada objeto de una salida a evento pasan por
 * aquí; lo único que cambia es el `evento_id`.
 */
const insertarSalidaInventario = async (
  db: Database,
  equipo: EquipoDisponible,
  datos: {
    nombreEquipoOverride?: string;
    persona: { nombre: string; codigo: string; tipo: "alumno" | "profesor" };
    admin: import("../auth/types").AdminUser;
    observaciones?: string | null;
    fechaSalida: string;
    eventoId?: number | null;
  },
): Promise<void> => {
  const observaciones = (datos.observaciones ?? "").trim();
  const nombrePersona = datos.persona.nombre.trim();
  const codigoPersona = datos.persona.codigo.trim();

  // El id sale del RESULTADO del INSERT, nunca de `SELECT last_insert_rowid()`.
  // El plugin abre un pool de 10 conexiones y ese SELECT puede salir por otra,
  // donde `last_insert_rowid()` vale 0 o el id de una escritura ajena. Amarrar
  // el espejo con un id equivocado es peor que no amarrarlo: devolver desde
  // Préstamo Rápido cerraría el préstamo de otra persona.
  const resultado = await db.execute(
    `INSERT INTO prestamos (equipo_id, codigo_profe, nombre_profe, fecha_salida, estado_prestamo, observaciones_entrega)
     VALUES (?, ?, ?, ?, 'activo', ?)`,
    [equipo.id, codigoPersona, nombrePersona, datos.fechaSalida, observaciones],
  );
  const prestamoAppId = resultado.lastInsertId ?? null;

  // Granel no cambia estado: la disponibilidad se descuenta por préstamos activos.
  if (equipo.es_granel !== 1) {
    await db.execute("UPDATE inventario SET estado = 'prestado' WHERE id = ?", [equipo.id]);
  }

  const adminNombre = datos.admin.nombre.trim();
  await db.execute(
    `INSERT INTO prestamos_rapidos_alumnos
       (nombre_alumno, codigo_alumno, nombre_equipo, persona_prestamo, observaciones,
        id_admin, autorizante_codigo, autorizante_nombre, fecha_salida,
        tipo_persona, equipo_id, prestamo_app_id, evento_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nombrePersona,
      codigoPersona,
      datos.nombreEquipoOverride ?? equipo.nombre_equipo,
      adminNombre,
      observaciones,
      datos.admin.id,
      datos.admin.codigo.trim(),
      adminNombre,
      datos.fechaSalida,
      datos.persona.tipo,
      equipo.id,
      prestamoAppId,
      datos.eventoId ?? null,
    ],
  );
};

/**
 * Préstamo rápido ligado a un ítem REAL del inventario.
 */
export const createPrestamoRapidoDesdeInventario = async (
  input: import("../auth/types").PrestamoRapidoInventarioCreate,
): Promise<void> => {
  if (!input.admin) {
    throw new Error("createPrestamoRapidoDesdeInventario requires an authenticated admin");
  }
  if (!input.nombre_alumno.trim() || !input.codigo_alumno.trim()) {
    throw new Error("Todos los campos son obligatorios.");
  }

  const db = await getDb();
  const equipo = await requireEquipoDisponible(db, input.equipoId);

  await insertarSalidaInventario(db, equipo, {
    persona: {
      nombre: input.nombre_alumno,
      codigo: input.codigo_alumno,
      tipo: input.tipo_persona === "profesor" ? "profesor" : "alumno",
    },
    admin: input.admin,
    observaciones: input.observaciones,
    fechaSalida: getCurrentLocalDateTime(),
  });
};

export const marcarPrestamoRapidoDevuelto = async (id: number): Promise<void> => {
  const db = await getDb();

  // Si el registro está ligado al inventario, devolver aquí también cierra el
  // préstamo real y libera el equipo (espejo de devolverEquipo).
  const rows = await db.select<Array<{ prestamo_app_id: number | null; equipo_id: number | null }>>(
    "SELECT prestamo_app_id, equipo_id FROM prestamos_rapidos_alumnos WHERE id = ? LIMIT 1",
    [id]
  );
  const linked = rows[0];
  if (linked?.prestamo_app_id != null && linked.equipo_id != null) {
    const equipoData = await db.select<Array<{ es_granel: number }>>(
      "SELECT es_granel FROM inventario WHERE id = ?",
      [linked.equipo_id]
    );
    const esGranel = equipoData.length > 0 && equipoData[0].es_granel === 1;

    const fechaCierre = getCurrentLocalDateTime();
    await db.execute(
      `UPDATE prestamos
       SET estado_prestamo = 'devuelto',
           fecha_retorno = ?,
           condicion_regreso = '—',
           notas_regreso = 'Devuelto vía Préstamo Rápido'
       WHERE id = ?`,
      [fechaCierre, linked.prestamo_app_id]
    );
    if (!esGranel) {
      await db.execute("UPDATE inventario SET estado = 'disponible' WHERE id = ?", [linked.equipo_id]);
    }
  }

  const fechaRetorno = getCurrentLocalDateTime();
  await db.execute(
    "UPDATE prestamos_rapidos_alumnos SET estado = 'devuelto', fecha_retorno = ? WHERE id = ?",
    [fechaRetorno, id]
  );
};

export const deletePrestamoRapidoAlumno = async (id: number): Promise<void> => {
  const db = await getDb();

  // Un registro ligado a un préstamo ACTIVO del inventario no se puede borrar:
  // dejaría un equipo marcado como prestado sin forma de devolverlo desde aquí.
  const rows = await db.select<Array<{ prestamo_app_id: number | null }>>(
    "SELECT prestamo_app_id FROM prestamos_rapidos_alumnos WHERE id = ? LIMIT 1",
    [id]
  );
  const prestamoAppId = rows[0]?.prestamo_app_id ?? null;
  if (prestamoAppId != null) {
    const activos = await db.select<Array<{ count: number }>>(
      "SELECT COUNT(*) AS count FROM prestamos WHERE id = ? AND estado_prestamo = 'activo'",
      [prestamoAppId]
    );
    if ((activos[0]?.count ?? 0) > 0) {
      throw new Error("Este préstamo está ligado al inventario. Márcalo como devuelto antes de eliminarlo.");
    }
  }

  await db.execute("DELETE FROM prestamos_rapidos_alumnos WHERE id = ?", [id]);
};

// --- Salidas a evento -------------------------------------------------------
//
// Un evento es UN encabezado en `eventos` y N objetos que ya son préstamos
// rápidos ligados al inventario (`prestamos_rapidos_alumnos.evento_id`). No hay
// tabla de items: por eso devolver un objeto del evento libera el equipo con el
// mismo `marcarPrestamoRapidoDevuelto` de siempre. La lógica pura —estado
// derivado, validación y acta imprimible— vive en `src/utils/evento.ts`.

export type { Evento, EventoInput, EventoItem } from "../utils/evento";

/**
 * Registra la salida completa: el encabezado y todos sus objetos.
 *
 * PRIMERO valida los equipos, DESPUÉS escribe. Un evento a medias —con dos de
 * cinco proyectores marcados como prestados y sin acta— es peor que un error
 * antes de tocar nada.
 *
 * ponytail: la escritura no va en una transacción porque cada objeto necesita
 * el id que devuelve su propio INSERT para amarrar el espejo, y
 * `ejecutar_transaccion` recibe las sentencias ya armadas. La validación previa
 * cubre el caso real (equipo no disponible); si algún día hace falta atomicidad
 * dura, el camino es un comando Rust que arme el evento entero.
 */
export const createEventoSalida = async (input: {
  evento: import("../utils/evento").EventoInput;
  equipoIds: number[];
  admin: import("../auth/types").AdminUser;
}): Promise<number> => {
  if (!input.admin) {
    throw new Error("createEventoSalida requires an authenticated admin");
  }

  const errores = validarEvento(input.evento, input.equipoIds.length);
  if (errores.length > 0) {
    throw new Error(errores[0].message);
  }

  const db = await getDb();

  // Sin duplicados: elegir dos veces el mismo proyector generaría dos préstamos
  // activos del mismo equipo único y el segundo dejaría el inventario mintiendo.
  const equipoIds = [...new Set(input.equipoIds)];
  const equipos: EquipoDisponible[] = [];
  for (const equipoId of equipoIds) {
    equipos.push(await requireEquipoDisponible(db, equipoId));
  }

  const evento = input.evento;
  const adminNombre = input.admin.nombre.trim();
  const creadoEn = getCurrentLocalDateTime();
  const limpiar = (valor: string | null | undefined): string | null => {
    const texto = (valor ?? "").trim();
    return texto ? texto : null;
  };

  const insertado = await db.execute(
    `INSERT INTO eventos
       (nombre, lugar, fecha_inicio, fecha_fin, hora_inicio, hora_fin,
        responsable_nombre, responsable_codigo, responsable_tipo,
        expositor_nombre, expositor_contacto, observaciones,
        id_admin, autorizante_codigo, autorizante_nombre, creado_en)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      limpiar(evento.nombre),
      evento.lugar.trim(),
      evento.fecha_inicio.trim(),
      limpiar(evento.fecha_fin),
      limpiar(evento.hora_inicio),
      limpiar(evento.hora_fin),
      evento.responsable_nombre.trim(),
      evento.responsable_codigo.trim(),
      evento.responsable_tipo === "alumno" ? "alumno" : "profesor",
      limpiar(evento.expositor_nombre),
      // El contacto sin nombre no llega hasta aquí: validarEvento lo rechaza.
      limpiar(evento.expositor_nombre) ? limpiar(evento.expositor_contacto) : null,
      limpiar(evento.observaciones),
      input.admin.id,
      input.admin.codigo.trim(),
      adminNombre,
      creadoEn,
    ],
  );

  // Mismo motivo que en `insertarSalidaInventario`: el id viene del resultado
  // del INSERT. Con `last_insert_rowid()` sobre el pool, los objetos se
  // guardaban con un evento_id que no existía y el evento salía con 0 objetos
  // aunque el equipo SÍ estuviera marcado como prestado.
  const eventoId = insertado.lastInsertId;
  if (eventoId == null) {
    throw new Error("No se pudo registrar el evento.");
  }

  for (const equipo of equipos) {
    await insertarSalidaInventario(db, equipo, {
      persona: {
        nombre: evento.responsable_nombre,
        codigo: evento.responsable_codigo,
        tipo: evento.responsable_tipo === "alumno" ? "alumno" : "profesor",
      },
      admin: input.admin,
      observaciones: `Salida a evento: ${tituloEvento({
        nombre: limpiar(evento.nombre),
        lugar: evento.lugar.trim(),
      })}`,
      fechaSalida: creadoEn,
      eventoId,
    });
  }

  return eventoId;
};

/**
 * Los eventos con el conteo de sus objetos. Los dos conteos son lo único que
 * `estadoEvento` necesita para decidir qué se pinta, así que se calculan aquí
 * en vez de traer todas las filas hijas a la pantalla.
 */
export const getEventos = async (): Promise<import("../utils/evento").Evento[]> => {
  const db = await getDb();
  return db.select<import("../utils/evento").Evento[]>(
    `SELECT e.id, e.nombre, e.lugar, e.fecha_inicio, e.fecha_fin, e.hora_inicio, e.hora_fin,
            e.responsable_nombre, e.responsable_codigo, e.responsable_tipo,
            e.expositor_nombre, e.expositor_contacto, e.observaciones,
            e.id_admin, e.autorizante_codigo, e.autorizante_nombre,
            e.creado_en, e.cerrado_en, e.cerrado_por, e.notas_cierre,
            (SELECT COUNT(*) FROM prestamos_rapidos_alumnos p WHERE p.evento_id = e.id) AS total_items,
            (SELECT COUNT(*) FROM prestamos_rapidos_alumnos p
              WHERE p.evento_id = e.id AND p.estado = 'devuelto') AS items_devueltos
     FROM eventos e
     ORDER BY e.creado_en DESC
     LIMIT 200`,
  );
};

/** Los objetos de un evento, con la etiqueta de Patrimonio para el acta. */
export const getEventoItems = async (eventoId: number): Promise<import("../utils/evento").EventoItem[]> => {
  const db = await getDb();
  return db.select<import("../utils/evento").EventoItem[]>(
    `SELECT p.id, p.nombre_equipo, p.observaciones, p.estado, p.fecha_salida, p.fecha_retorno,
            p.equipo_id, i.identificador, i.id_patrimonial
     FROM prestamos_rapidos_alumnos p
     LEFT JOIN inventario i ON i.id = p.equipo_id
     WHERE p.evento_id = ?
     ORDER BY p.id ASC`,
    [eventoId],
  );
};

/**
 * Pasar la lista al volver del evento.
 *
 * `idsDevueltos` son los objetos que SÍ regresaron; el resto se queda activo, y
 * eso es justo lo que convierte al evento en "cerrado con faltantes". No se
 * marca nada como perdido: el objeto sigue prestado y puede devolverse después
 * desde el detalle, que es lo que pasa en la vida real.
 */
export const cerrarEvento = async (input: {
  eventoId: number;
  idsDevueltos: number[];
  admin: import("../auth/types").AdminUser;
  notas?: string | null;
}): Promise<void> => {
  const db = await getDb();

  const pertenecen = await db.select<Array<{ id: number }>>(
    `SELECT id FROM prestamos_rapidos_alumnos WHERE evento_id = ? AND estado = 'activo'`,
    [input.eventoId],
  );
  const activos = new Set(pertenecen.map((fila) => fila.id));

  for (const id of input.idsDevueltos) {
    // Filtrar por los activos del evento evita que un id de otra pantalla —o
    // uno ya devuelto— reescriba una devolución con fecha nueva.
    if (activos.has(id)) {
      await marcarPrestamoRapidoDevuelto(id);
    }
  }

  await db.execute(
    "UPDATE eventos SET cerrado_en = ?, cerrado_por = ?, notas_cierre = ? WHERE id = ?",
    [
      getCurrentLocalDateTime(),
      input.admin.nombre.trim(),
      (input.notas ?? "").trim() || null,
      input.eventoId,
    ],
  );
};

/** Reabrir: el evento no terminó (o se cerró por error). Los objetos no se tocan. */
export const reabrirEvento = async (eventoId: number): Promise<void> => {
  const db = await getDb();
  await db.execute(
    "UPDATE eventos SET cerrado_en = NULL, cerrado_por = NULL, notas_cierre = NULL WHERE id = ?",
    [eventoId],
  );
};

/**
 * Borrar el evento entero, con sus objetos.
 *
 * El conteo de pendientes va PRIMERO. `deletePrestamoRapidoAlumno` ya se niega
 * a borrar un préstamo activo, pero rebotar a mitad del ciclo dejaría al evento
 * sin la mitad de sus objetos y con el resto todavía prestado: se pregunta una
 * vez por todos y se aborta antes de borrar nada.
 */
export const deleteEvento = async (eventoId: number): Promise<void> => {
  const db = await getDb();

  const pendientes = await db.select<Array<{ count: number }>>(
    "SELECT COUNT(*) AS count FROM prestamos_rapidos_alumnos WHERE evento_id = ? AND estado = 'activo'",
    [eventoId],
  );
  if ((pendientes[0]?.count ?? 0) > 0) {
    throw new Error(
      "Este evento todavía tiene objetos sin devolver. Pasa la lista de devolución antes de eliminarlo.",
    );
  }

  const items = await db.select<Array<{ id: number }>>(
    "SELECT id FROM prestamos_rapidos_alumnos WHERE evento_id = ?",
    [eventoId],
  );

  for (const item of items) {
    await deletePrestamoRapidoAlumno(item.id);
  }

  await db.execute("DELETE FROM eventos WHERE id = ?", [eventoId]);
};

// --- Importacion del Excel de Patrimonio ------------------------------------
//
// Rust hace lo unico que solo Rust puede hacer: leer el .xlsx (ver
// `src-tauri/src/patrimonio.rs`). Toda la escritura se queda aca, que es el
// modulo dueno del esquema. Ver docs/PLAN_IMPORTACION_PATRIMONIO.md §6 P3.

/**
 * Paso 1: leer el archivo y comparar contra lo que hay. NO escribe nada.
 */
export const leerExcelPatrimonio = async (bytes: Uint8Array): Promise<PlanImportacion> => {
  requireTauriRuntime();

  const lectura = await invoke<LecturaExcel>("leer_excel_patrimonio", {
    bytes: Array.from(bytes),
  });

  const [equipos, categorias] = await Promise.all([getEquipos(), getCategorias()]);

  return planificarImportacion(
    lectura,
    equipos.map((equipo) => ({
      id: equipo.id,
      id_patrimonial: equipo.id_patrimonial,
      marca: equipo.marca,
      modelo: equipo.modelo,
      num_serie: equipo.num_serie,
      descripcion: equipo.descripcion,
      resguardante_codigo: equipo.resguardante_codigo,
      resguardante_nombre: equipo.resguardante_nombre,
      fecha_adquisicion: equipo.fecha_adquisicion,
    })),
    categorias.map((categoria) => categoria.nombre)
  );
};

export type ResultadoImportacion = {
  altas: number;
  actualizados: number;
  sinCambio: number;
  respaldo: string;
};

/**
 * Paso 2: aplicar el plan.
 *
 * Antes de tocar una sola fila se fuerza un respaldo: esto escribe cientos de
 * registros de un golpe sobre el inventario de produccion y tiene que haber
 * marcha atras. El sistema de respaldo ya existia, se reusa tal cual.
 */
export const aplicarImportacionPatrimonio = async (
  plan: PlanImportacion
): Promise<ResultadoImportacion> => {
  const db = await getDb();
  const respaldo = await createBackup(false);

  for (const nombre of plan.categoriasNuevas) {
    // El Excel puede organizar por categoria, pero nunca decide que se presta.
    await createCategoria(nombre, false);
  }

  const categorias = await getCategorias();
  const idPorNombre = new Map(
    categorias.map((categoria) => [categoria.nombre.trim().toLowerCase(), categoria.id])
  );

  // Todo o nada. Son miles de filas de un golpe: si revienta a la mitad, un
  // inventario a medias es peor que uno sin importar, porque nadie sabe donde
  // quedo. De paso SQLite deja de hacer fsync por fila.
  const sentencias: SentenciaSql[] = [];

  for (const alta of plan.altas) {
    const categoriaId = idPorNombre.get(alta.categoria.trim().toLowerCase());
    if (categoriaId === undefined) {
      throw new Error(`No se pudo crear la categoria "${alta.categoria}".`);
    }

    sentencias.push(
      sentenciaCrearEquipo({
        nombre_equipo: alta.fila.clasificador,
        identificador: null,
        categoria_id: categoriaId,
        es_prestable: alta.es_prestable,
        es_granel: 0,
        stock_total: 1,
        id_patrimonial: alta.fila.id_patrimonial,
        marca: alta.fila.marca,
        modelo: alta.fila.modelo,
        num_serie: alta.fila.num_serie,
        descripcion: alta.fila.descripcion,
        resguardante_codigo: alta.fila.resguardante_codigo,
        resguardante_nombre: alta.fila.resguardante_nombre,
        fecha_adquisicion: alta.fila.fecha_adquisicion,
        // La ubicacion del Excel solo sirve al dar de alta: en un equipo que ya
        // existe manda la toma fisica de la escuela.
        ubicacion: alta.fila.ubicacion,
      })
    );
  }

  // `sentenciaActualizarEquipo` escribe SOLO las claves que recibe, asi que mandar
  // unicamente los campos que cambiaron no puede pisar la ubicacion ni la curaduria.
  for (const cambio of plan.cambios) {
    const sentencia = sentenciaActualizarEquipo(cambio.id, cambio.campos);
    if (sentencia) sentencias.push(sentencia);
  }

  try {
    await ejecutarEnTransaccion(sentencias);
  } catch (error) {
    // Rust ya hizo ROLLBACK al soltar la transaccion: no queda nada a medias.
    const mensaje = error instanceof Error ? error.message : String(error);
    if (mensaje.includes("UNIQUE constraint failed: inventario.id_patrimonial")) {
      throw new Error(
        "El Excel trae un ID de Patrimonio que ya esta registrado en otro equipo. No se importo nada."
      );
    }
    throw error instanceof Error ? error : new Error(mensaje);
  }

  await db.select("PRAGMA wal_checkpoint(TRUNCATE)");

  return {
    altas: plan.altas.length,
    actualizados: plan.cambios.length,
    sinCambio: plan.sinCambio,
    respaldo: respaldo.file_name,
  };
};

// --- Toma fisica de inventario ----------------------------------------------
//
// El bucle: elegir ubicacion una vez, disparar la pistola N veces. Cada escaneo
// resuelve el objeto, lo marca visto y le estampa la ubicacion actual.
// Ver docs/PLAN_IMPORTACION_PATRIMONIO.md §3.1.

const CLAVE_CAMPANA = "inventario_campana_inicio";

/** Cuando arranco la campana actual, o null si nunca se inicio ninguna. */
export const getInicioCampana = async (): Promise<string | null> => {
  const settings = await getSettings();
  return settings[CLAVE_CAMPANA] ?? null;
};

/**
 * Arranca una campana nueva. No borra nada: lo anterior sigue en `revisado_en`,
 * y lo unico que cambia es la fecha de corte contra la que se compara.
 */
export const iniciarCampanaInventario = async (): Promise<string> => {
  const inicio = getCurrentLocalDateTime();
  await updateSetting(CLAVE_CAMPANA, inicio);
  return inicio;
};

/**
 * Resuelve un disparo de la pistola.
 *
 * Devuelve `null` si el codigo no esta en el inventario: ahi es donde entra la
 * vinculacion a mano, que es como se puebla lo que el Excel no cubrio.
 */
export const buscarPorIdPatrimonial = async (codigo: string): Promise<Equipo | null> => {
  const normalizado = normalizarCodigoPatrimonial(codigo);
  if (!normalizado) return null;

  const db = await getDb();
  const filas = await db.select<Array<{ id: number }>>(
    "SELECT id FROM inventario WHERE id_patrimonial = ? LIMIT 1",
    [normalizado]
  );
  if (filas.length === 0) return null;

  const equipos = await getEquipos();
  return equipos.find((equipo) => equipo.id === filas[0].id) ?? null;
};

/**
 * Marca un equipo como visto, y de paso le estampa donde estaba.
 *
 * La ubicacion se escribe aca y no en la importacion: es el dato que produce
 * caminar el edificio, y es lo unico que la reimportacion del Excel no puede
 * pisar.
 */
export const registrarRevision = async (
  equipoId: number,
  ubicacion: string,
  revisadoPor: string
): Promise<void> => {
  const db = await getDb();
  const cuando = getCurrentLocalDateTime();
  const donde = ubicacion.trim();

  // Encontrarlo borra el "no aparecio": la marca es una afirmacion sobre el
  // presente, y el equipo esta ahi. Se limpia aca y no en quien llama porque
  // TODO camino que ve un equipo pasa por esta funcion.
  await db.execute(
    `UPDATE inventario
     SET revisado_en = ?, revisado_por = ?, ubicacion = COALESCE(NULLIF(?, ''), ubicacion),
         no_localizado_en = NULL, no_localizado_por = NULL
     WHERE id = ?`,
    [cuando, revisadoPor.trim(), donde, equipoId]
  );
};

/**
 * Deja escrito que se busco el equipo y no aparecio.
 *
 * Es una afirmacion con nombre y fecha, no un hueco: hasta ahora el CSV mandaba
 * `N` tanto para "lo busque y no esta" como para "todavia no llegue a esa aula",
 * y quien firma el reporte es quien recorre. Se decide parado en el aula, que es
 * el unico momento en que la persona todavia se acuerda.
 */
export const marcarNoLocalizado = async (equipoId: number, quien: string): Promise<void> => {
  const db = await getDb();
  await db.execute(
    "UPDATE inventario SET no_localizado_en = ?, no_localizado_por = ? WHERE id = ?",
    [getCurrentLocalDateTime(), quien.trim(), equipoId]
  );
};

/** Vuelve atras un "no aparecio": lo deja pendiente otra vez, sin afirmar nada. */
export const limpiarNoLocalizado = async (equipoId: number): Promise<void> => {
  const db = await getDb();
  await db.execute(
    "UPDATE inventario SET no_localizado_en = NULL, no_localizado_por = NULL WHERE id = ?",
    [equipoId]
  );
};

/**
 * Deshace el ultimo disparo devolviendo las tres columnas a como estaban.
 *
 * Hace falta porque la pistola dispara contra lo que se le ponga enfrente: la
 * etiqueta de al lado, el equipo del pasillo. Sin esto, un disparo equivocado
 * queda escrito en la base y el reporte le miente a Patrimonio.
 *
 * Los valores previos los guarda quien llama: son los que ya venian en el
 * `Equipo` que se leyo antes de escribir, asi que no hace falta ninguna tabla
 * de historial para poder volver atras un paso.
 *
 * No restaura la marca de `no_localizado`: si el disparo la habia limpiado, el
 * equipo queda pendiente y no "no localizado". Se deja asi a proposito — quien
 * deshace acaba de disparar contra la etiqueta equivocada, y afirmar de nuevo
 * una perdida en su nombre seria peor que dejarlo sin decidir.
 */
export const revertirRevision = async (
  equipoId: number,
  previo: { revisado_en: string | null; revisado_por: string | null; ubicacion: string | null }
): Promise<void> => {
  const db = await getDb();
  await db.execute(
    "UPDATE inventario SET revisado_en = ?, revisado_por = ?, ubicacion = ? WHERE id = ?",
    [previo.revisado_en, previo.revisado_por, previo.ubicacion, equipoId]
  );
};

/**
 * Las areas por las que ya se paso, la mas reciente primero.
 *
 * Son siempre las mismas cinco o seis aulas: tecleadas a mano cada recorrido
 * son cientos de pulsaciones y un nombre distinto cada vez ("Aula 12", "aula
 * 12", "Aula12"), que es lo que rompe el conteo por area.
 */
export const getUbicacionesRecientes = async (limite = 6): Promise<string[]> => {
  const db = await getDb();
  const filas = await db.select<Array<{ ubicacion: string }>>(
    `SELECT ubicacion, MAX(revisado_en) AS visto
       FROM inventario
      WHERE ubicacion IS NOT NULL AND TRIM(ubicacion) <> '' AND revisado_en IS NOT NULL
      GROUP BY ubicacion
      ORDER BY visto DESC
      LIMIT ?`,
    [limite]
  );
  return filas.map((fila) => fila.ubicacion);
};

/**
 * Liga un codigo escaneado a un equipo que ya existe pero no tenia etiqueta.
 *
 * Es el camino que no depende de que Patrimonio entregue nada: se puebla
 * caminando, y sigue sirviendo para todo lo que el Excel no cubra.
 */
export const vincularIdPatrimonial = async (equipoId: number, codigo: string): Promise<void> => {
  const normalizado = normalizarCodigoPatrimonial(codigo);
  if (!normalizado) {
    throw new Error("El codigo escaneado no tiene ningun numero.");
  }
  await updateEquipo(equipoId, { id_patrimonial: normalizado });
};

/** Guarda el reporte para Patrimonio y devuelve la ruta donde quedo. */
export const exportarReporteInventario = async (
  equipos: EquipoRevisable[],
  inicioCampana: string | null
): Promise<string> => {
  requireTauriRuntime();

  return invoke<string>("guardar_reporte_inventario", {
    nombre: nombreDelReporte(new Date()),
    contenido: construirReporteCsv(equipos, inicioCampana),
  });
};

/**
 * Lee un reporte de toma fisica hecho en OTRA computadora y dice que haria.
 *
 * No escribe nada: alimenta la vista previa, igual que la importacion del Excel.
 * Ver `src/utils/reporteTomaFisica.ts` para las reglas de fusion.
 */
export const leerReporteTomaFisica = async (texto: string): Promise<PlanFusion> => {
  const equipos = await getEquipos();
  return planificarFusionReporte(leerReporteCsv(texto), equipos);
};

/**
 * Aplica la fusion de un reporte de toma fisica.
 *
 * FUSIONA, no reemplaza: toca unicamente las columnas que produce un recorrido.
 * Los prestamos no comparten ninguna de ellas, asi que traer el trabajo de la
 * segunda computadora no puede borrar lo que la principal registro mientras
 * tanto. Restaurar un respaldo `.db` si lo borraria, y por eso existe esto.
 *
 * Todo en una transaccion, por la misma razon que la importacion de Patrimonio:
 * una fusion a medias deja un inventario que nadie sabe donde quedo.
 */
export const aplicarFusionReporte = async (
  plan: PlanFusion
): Promise<{ aplicados: number; respaldo: string }> => {
  const respaldo = await createBackup(false);

  const sentencias: SentenciaSql[] = plan.cambios.map((cambio) =>
    cambio.tipo === "revisado"
      ? {
          // Mismas reglas que `registrarRevision`: encontrarlo borra el "no
          // aparecio", y una ubicacion vacia conserva la que ya estaba.
          sql: `UPDATE inventario
                SET revisado_en = ?, revisado_por = ?,
                    ubicacion = COALESCE(NULLIF(?, ''), ubicacion),
                    no_localizado_en = NULL, no_localizado_por = NULL
                WHERE id = ?`,
          params: [cambio.cuando, cambio.quien, cambio.ubicacion ?? "", cambio.id],
        }
      : {
          sql: "UPDATE inventario SET no_localizado_en = ?, no_localizado_por = ? WHERE id = ?",
          params: [cambio.cuando, cambio.quien, cambio.id],
        }
  );

  await ejecutarEnTransaccion(sentencias);

  return { aplicados: plan.cambios.length, respaldo: respaldo.file_name };
};

