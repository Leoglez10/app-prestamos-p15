CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS inventario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoria_id INTEGER,
    nombre_equipo TEXT NOT NULL,
    identificador TEXT, -- Serie o Aula
    estado TEXT DEFAULT 'disponible', -- 'disponible', 'prestado'
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

CREATE TABLE IF NOT EXISTS prestamos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipo_id INTEGER,
    codigo_profe TEXT NOT NULL,
    nombre_profe TEXT,
    fecha_salida DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_retorno DATETIME,
    FOREIGN KEY (equipo_id) REFERENCES inventario(id)
);