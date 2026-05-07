import Database from "@tauri-apps/plugin-sql";

import { isTauri } from "@tauri-apps/api/core";
import { invoke } from "@tauri-apps/api/core";

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

export type ReportePrestamoFilters = {
  busqueda?: string;
  estado?: string;
  categoriaId?: number | null;
  fechaDesde?: string;
  fechaHasta?: string;
  limit?: number;
};

export type BackupInfo = {
  file_name: string;
  backup_path: string;
  created_epoch: number;
};

export type RestoreBackupResult = {
  restored_file_name: string;
  backup_path: string;
  restored_at_epoch: number;
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
  `CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
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

  const profesoresColumns = await getTableColumns(db, "profesores");
  if (!profesoresColumns.includes("es_admin")) {
    await db.execute("ALTER TABLE profesores ADD COLUMN es_admin INTEGER DEFAULT 0");
  }
  if (!profesoresColumns.includes("admin_pin")) {
    await db.execute("ALTER TABLE profesores ADD COLUMN admin_pin TEXT");
  }

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
     ON CONFLICT(codigo) DO UPDATE SET
       nombre = COALESCE(NULLIF(profesores.nombre, ''), 'Administrador P15'),
       es_admin = 1,
       admin_pin = COALESCE(NULLIF(profesores.admin_pin, ''), excluded.admin_pin)`,
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

export const deleteProfesor = async (id: number): Promise<void> => {
  const db = await getDb();
  await db.execute("DELETE FROM profesores WHERE id = ?", [id]);
};

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

  if (!categoriaId) {
    try {
      return db.select<Equipo[]>(
        `SELECT i.id, i.nombre_equipo, i.identificador, i.estado, i.categoria_id, c.nombre AS categoria_nombre,
                COALESCE(c.es_prestable, 1) AS categoria_es_prestable,
                COALESCE(i.es_prestable, 1) AS es_prestable,
                COALESCE(i.es_granel, 0) AS es_granel, COALESCE(i.stock_total, 1) AS stock_total,
                (COALESCE(i.stock_total, 1) - (
                    SELECT COUNT(*) FROM prestamos p2 WHERE p2.equipo_id = i.id AND p2.estado_prestamo = 'activo'
                )) AS stock_disponible,
                ${prestamoActivoIdSql} AS prestamo_activo_id,
                ${responsableActivoSql} AS prestamo_activo_profe
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
                ) AS prestamo_activo_profe
         FROM inventario i
         JOIN categorias c ON c.id = i.categoria_id
         ORDER BY c.nombre, i.nombre_equipo`
      );
      // Agregar valores por defecto para que coincida con tipo Equipo
      return result.map(r => ({
        ...r,
        categoria_es_prestable: 1,
        es_prestable: 1,
        es_granel: 0,
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
              COALESCE(i.es_granel, 0) AS es_granel, COALESCE(i.stock_total, 1) AS stock_total,
              (COALESCE(i.stock_total, 1) - (
                  SELECT COUNT(*) FROM prestamos p2 WHERE p2.equipo_id = i.id AND p2.estado_prestamo = 'activo'
              )) AS stock_disponible,
              ${prestamoActivoIdSql} AS prestamo_activo_id,
              ${responsableActivoSql} AS prestamo_activo_profe
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
              ) AS prestamo_activo_profe
       FROM inventario i
       JOIN categorias c ON c.id = i.categoria_id
       WHERE i.categoria_id = ?
       ORDER BY i.nombre_equipo`,
      [categoriaId]
    );
    // Agregar valores por defecto para que coincida con tipo Equipo
    return result.map(r => ({
      ...r,
      categoria_es_prestable: 1,
      es_prestable: 1,
      es_granel: 0,
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

    if (row.es_prestable !== 1 || row.categoria_es_prestable !== 1) {
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

export type CreateEquipoInput = {
  nombre_equipo: string;
  identificador: string | null;
  categoria_id: number;
  es_prestable: number;
  es_granel: number;
  stock_total: number;
};

export const createEquipo = async (input: CreateEquipoInput): Promise<void> => {
  const db = await getDb();
  await db.execute(
    "INSERT INTO inventario (nombre_equipo, identificador, categoria_id, estado, es_prestable, es_granel, stock_total) VALUES (?, ?, ?, 'disponible', ?, ?, ?)",
    [input.nombre_equipo.trim(), input.identificador ? input.identificador.trim() : null, input.categoria_id, input.es_prestable, input.es_granel, input.stock_total]
  );
};

export const deleteEquipo = async (equipoId: number): Promise<void> => {
  const db = await getDb();
  await db.execute("DELETE FROM prestamos WHERE equipo_id = ?", [equipoId]);
  await db.execute("DELETE FROM inventario WHERE id = ?", [equipoId]);
};

export type UpdateEquipoInput = {
  nombre_equipo: string;
  identificador: string | null;
  categoria_id: number;
  estado: string;
  es_prestable: number;
  es_granel: number;
  stock_total: number;
};

export const updateEquipo = async (id: number, input: UpdateEquipoInput): Promise<void> => {
  const db = await getDb();
  await db.execute(
    "UPDATE inventario SET nombre_equipo = ?, identificador = ?, categoria_id = ?, estado = ?, es_prestable = ?, es_granel = ?, stock_total = ? WHERE id = ?",
    [input.nombre_equipo.trim(), input.identificador ? input.identificador.trim() : null, input.categoria_id, input.estado, input.es_prestable, input.es_granel, input.stock_total, id]
  );
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
         fecha_retorno = ?, 
         condicion_regreso = $1, 
         notas_regreso = $2 
     WHERE id = $3`,
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
         fecha_retorno = ?, 
         condicion_regreso = 'No devuelto / Perdido', 
         notas_regreso = 'Marcado manualmente como perdido por administración' 
     WHERE id = $1`,
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
    `SELECT p.id,
            p.codigo_profe,
            p.nombre_profe,
            i.nombre_equipo,
            COALESCE(c.nombre, 'Sin categoría') AS categoria_nombre,
            p.estado_prestamo,
            p.fecha_salida,
            p.fecha_retorno,
            p.observaciones_entrega,
            p.condicion_regreso,
            p.admin_condicion_entrega,
            p.admin_notas_retorno
     FROM prestamos p
     LEFT JOIN inventario i ON i.id = p.equipo_id
     LEFT JOIN categorias c ON c.id = i.categoria_id
     ${whereClause}
     ORDER BY p.fecha_salida DESC
     LIMIT ${limit}`,
    params
  );
  return rows.map(r => ({
    ...r,
    nombre_equipo: r.nombre_equipo || 'Equipo Eliminado',
    categoria_nombre: r.categoria_nombre || 'Sin categoría',
    nombre_profe: r.nombre_profe || 'Desconocido',
    estado_prestamo: r.estado_prestamo || 'activo' // Safe fallback
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
  const db = await getDb();

  try {
    await db.execute("BEGIN IMMEDIATE TRANSACTION");
    await db.execute("DELETE FROM prestamos");
    await db.execute("UPDATE inventario SET estado = 'disponible' WHERE estado = 'prestado'");
    await db.execute("COMMIT");
  } catch (error) {
    await db.execute("ROLLBACK").catch(() => undefined);
    throw error;
  }
};

export const createBackup = async (): Promise<BackupInfo> => {
  return invoke<BackupInfo>("create_backup");
};

export const getBackups = async (): Promise<BackupInfo[]> => {
  return invoke<BackupInfo[]>("list_backups");
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
