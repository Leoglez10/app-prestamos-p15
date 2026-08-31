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
    -- Ficha de Patrimonio. Todas TEXT y nullable a proposito: el granel nunca
    -- paso por Patrimonio y no va a tener ninguna.
    -- Ver docs/INVENTARIO_PATRIMONIO.md y docs/PLAN_IMPORTACION_PATRIMONIO.md.
    id_patrimonial TEXT,      -- el numero del codigo de barras de la etiqueta UdeG
    marca TEXT,
    modelo TEXT,
    num_serie TEXT,           -- informativo: el Excel trae 11 duplicados, no es llave
    descripcion TEXT,         -- specs en texto libre (procesador, memoria, medidas)
    resguardante_codigo TEXT, -- codigo de empleado de quien responde por el bien
    resguardante_nombre TEXT, -- NO se dan de alta en `profesores`: no es login
    fecha_adquisicion TEXT,   -- ISO 'YYYY-MM-DD'
    ubicacion TEXT,           -- la llena la toma fisica, no el Excel
    -- Toma fisica. Solo las escribe `registrarRevision`: quedan fuera de la
    -- lista blanca de `equipoFicha.ts`, asi ni la importacion ni el formulario
    -- de Admin pueden pisarlas. La fecha de corte de la campana vive en
    -- app_settings ('inventario_campana_inicio').
    revisado_en TEXT,
    revisado_por TEXT,
    -- "Se busco y no aparecio", firmado. NO es lo mismo que `revisado_en IS
    -- NULL`, que solo dice que nadie llego todavia a esa area. La columna
    -- Localizado del reporte sale de las dos: S / N / vacio.
    no_localizado_en TEXT,
    no_localizado_por TEXT,
    estado TEXT DEFAULT 'disponible', -- 'disponible', 'prestado', 'extraviado', 'mantenimiento'
    es_prestable INTEGER NOT NULL DEFAULT 1,
    es_granel INTEGER NOT NULL DEFAULT 0,
    stock_total INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

-- Lo que hace que reimportar el Excel de Patrimonio actualice en vez de duplicar.
-- Los NULL no chocan entre si en un indice unico de SQLite, asi que el granel cabe.
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventario_id_patrimonial
    ON inventario (id_patrimonial);

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
    autorizante_nombre TEXT,
    -- Added by prestamo-rapido-inventario: links the record to the real loan.
    tipo_persona TEXT NOT NULL DEFAULT 'alumno',
    equipo_id INTEGER REFERENCES inventario(id) ON DELETE SET NULL,
    prestamo_app_id INTEGER,
    -- Added by salida-a-evento: set when this row is one of the objects that
    -- left with an event. The event header lives in `eventos`.
    evento_id INTEGER REFERENCES eventos(id) ON DELETE SET NULL
);

-- Event outings. This table holds ONLY the header; the objects that left are
-- rows of prestamos_rapidos_alumnos carrying `evento_id`, so returning one of
-- them frees the inventory item through the existing path.
--
-- The event status is NOT stored: it is derived from `cerrado_en` plus the
-- state of its child rows. See src/utils/evento.ts.
CREATE TABLE IF NOT EXISTS eventos (
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