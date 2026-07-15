-- Paper trail only. The runtime schema and migrations live in src/hooks/useInventory.ts.
-- This file documents the canonical shape after the admin-auth-prestamo-rapido change.

CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    es_prestable INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS inventario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoria_id INTEGER,
    nombre_equipo TEXT NOT NULL,
    identificador TEXT, -- Serie o Aula
    estado TEXT DEFAULT 'disponible', -- 'disponible', 'prestado', 'extraviado', 'mantenimiento'
    es_prestable INTEGER NOT NULL DEFAULT 1,
    es_granel INTEGER NOT NULL DEFAULT 0,
    stock_total INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

CREATE TABLE IF NOT EXISTS profesores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    es_admin INTEGER NOT NULL DEFAULT 0,
    admin_pin TEXT
);

CREATE TABLE IF NOT EXISTS prestamos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipo_id INTEGER,
    codigo_profe TEXT NOT NULL,
    nombre_profe TEXT,
    fecha_salida DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_retorno DATETIME,
    estado_prestamo TEXT DEFAULT 'activo',
    observaciones_entrega TEXT,
    condicion_regreso TEXT,
    notas_regreso TEXT,
    admin_condicion_entrega TEXT,
    admin_notas_retorno TEXT,
    FOREIGN KEY (equipo_id) REFERENCES inventario(id)
);

CREATE TABLE IF NOT EXISTS prestamos_rapidos_alumnos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_alumno TEXT NOT NULL,
    codigo_alumno TEXT NOT NULL,
    nombre_equipo TEXT NOT NULL,
    persona_prestamo TEXT NOT NULL,
    fecha_salida DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_retorno DATETIME,
    estado TEXT DEFAULT 'activo',
    observaciones TEXT,
    -- Added by admin-auth-prestamo-rapido: accountability columns
    id_admin INTEGER REFERENCES profesores(id) ON DELETE SET NULL,
    autorizante_codigo TEXT,
    autorizante_nombre TEXT
);

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- The previous admin_users table was removed in admin-auth-prestamo-rapido.
-- The canonical admin identity lives in `profesores` (es_admin = 1).

-- Default admin seed uses ON CONFLICT DO NOTHING so user-changed PINs
-- in Admin → Configuración are preserved across reboots.
INSERT INTO profesores (codigo, nombre, es_admin, admin_pin)
VALUES ('223992647', 'Administrador P15', 1, '#admin*p15#')
ON CONFLICT(codigo) DO NOTHING;