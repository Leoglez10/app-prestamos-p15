/**
 * Qué hace la importación del Excel de Patrimonio con cada fila.
 *
 * Pura a propósito: decide, no escribe. La escritura vive en `useInventory.ts`,
 * y así esta lógica —que es donde se pierde o se salva el inventario— se puede
 * probar con `node --test`, sin base y sin Tauri.
 *
 * Ver `docs/PLAN_IMPORTACION_PATRIMONIO.md` §6 P3.
 */

/** Una fila ya limpia, tal como la devuelve `src-tauri/src/patrimonio.rs`. */
export type FilaPatrimonio = {
  id_patrimonial: string;
  clasificador: string;
  marca: string | null;
  modelo: string | null;
  num_serie: string | null;
  descripcion: string | null;
  resguardante_codigo: string | null;
  resguardante_nombre: string | null;
  fecha_adquisicion: string | null;
  ubicacion: string | null;
};

export type LecturaExcel = {
  filas: FilaPatrimonio[];
  avisos: string[];
};

/** Lo mínimo que hace falta saber de lo que ya está en la base. */
export type EquipoExistente = {
  id: number;
  id_patrimonial: string | null;
  marca: string | null;
  modelo: string | null;
  num_serie: string | null;
  descripcion: string | null;
  resguardante_codigo: string | null;
  resguardante_nombre: string | null;
  fecha_adquisicion: string | null;
};

/**
 * Los campos que la reimportación SÍ pisa: son datos de Patrimonio y Patrimonio
 * manda sobre ellos.
 *
 * Lo que queda deliberadamente afuera es lo que produce la escuela:
 * `ubicacion`, `es_prestable`, `categoria_id` y `nombre_equipo`. Volver a correr
 * el Excel no puede borrar el trabajo de una toma física ni deshacer la curaduría
 * de categorías. `ubicacion` sí se toma al dar de alta: ahí es el único dato que
 * hay.
 */
export const CAMPOS_DE_PATRIMONIO = [
  "marca",
  "modelo",
  "num_serie",
  "descripcion",
  "resguardante_codigo",
  "resguardante_nombre",
  "fecha_adquisicion",
] as const;

export const CATEGORIA_SIN_CLASIFICAR = "Patrimonio (sin clasificar)";

/**
 * Clasificadores que conviene agrupar en categorías reconocibles.
 *
 * El mapeo sirve únicamente para organizar el inventario. Patrimonio no decide
 * qué se presta: incluso una laptop o cámara nueva entra como **solo inventario**
 * y se habilita después, de forma explícita, desde Admin.
 *
 * No se deriva del COG del Excel: 46 de los 190 clasificadores aparecen en más
 * de un COG, así que ese árbol miente. Ver el plan §2.1.
 */
export const CATEGORIA_POR_CLASIFICADOR: Record<string, string> = {
  "COMPUTADORA PORTATIL": "Laptops",
  "TABLETA ELECTRONICA": "Tabletas",
  CAMARA: "Cámaras",
  "VIDEO CAMARA": "Cámaras",
  PROYECTOR: "Proyectores",
  "CAÑON PROYECTOR": "Proyectores",
  MICRÓFONO: "Audio",
  MICROFONO: "Audio",
  "SISTEMA INALAMBRICO": "Audio",
  BOCINA: "Audio",
  AMPLIFICADOR: "Audio",
  "REPRODUCTOR DE AUDIO": "Audio",
  GRABADORA: "Audio",
  MEGAFONO: "Audio",
  TRIPIE: "Accesorios",
  FLASH: "Accesorios",
};

export type DestinoFila = {
  categoria: string;
  es_prestable: number;
};

export const destinoDeClasificador = (clasificador: string): DestinoFila => {
  const categoria =
    CATEGORIA_POR_CLASIFICADOR[clasificador.trim().toUpperCase()] ??
    CATEGORIA_SIN_CLASIFICAR;

  // El clasificador solo organiza. La decisión de prestar es de la escuela.
  return { categoria, es_prestable: 0 };
};

export type AltaPlaneada = {
  fila: FilaPatrimonio;
  categoria: string;
  es_prestable: number;
};

export type CambioPlaneado = {
  id: number;
  id_patrimonial: string;
  campos: Partial<Record<(typeof CAMPOS_DE_PATRIMONIO)[number], string | null>>;
};

export type PlanImportacion = {
  altas: AltaPlaneada[];
  cambios: CambioPlaneado[];
  sinCambio: number;
  /** Categorías que hay que crear antes de insertar. */
  categoriasNuevas: string[];
  avisos: string[];
};

/**
 * Compara el archivo contra lo que ya hay y devuelve qué se va a hacer.
 *
 * Nada de esto escribe: es lo que alimenta la vista previa. Una importación que
 * no se puede mirar antes de correr es una importación que se corre a ciegas
 * sobre el inventario de producción.
 */
export const planificarImportacion = (
  lectura: LecturaExcel,
  existentes: EquipoExistente[],
  categoriasActuales: string[] = []
): PlanImportacion => {
  const porPatrimonial = new Map<string, EquipoExistente>();
  for (const equipo of existentes) {
    if (equipo.id_patrimonial) porPatrimonial.set(equipo.id_patrimonial, equipo);
  }

  const altas: AltaPlaneada[] = [];
  const cambios: CambioPlaneado[] = [];
  const categoriasNuevas = new Set<string>();
  const yaExisten = new Set(categoriasActuales.map((nombre) => nombre.trim().toLowerCase()));
  let sinCambio = 0;

  for (const fila of lectura.filas) {
    const existente = porPatrimonial.get(fila.id_patrimonial);

    if (!existente) {
      const destino = destinoDeClasificador(fila.clasificador);
      if (!yaExisten.has(destino.categoria.toLowerCase())) {
        categoriasNuevas.add(destino.categoria);
      }
      altas.push({ fila, categoria: destino.categoria, es_prestable: destino.es_prestable });
      continue;
    }

    // Solo se mandan los campos que de verdad cambian: así el resumen dice la
    // verdad y reimportar el mismo archivo no escribe 2137 filas al pedo.
    const campos: CambioPlaneado["campos"] = {};
    for (const campo of CAMPOS_DE_PATRIMONIO) {
      const nuevo = fila[campo];
      if (nuevo !== null && nuevo !== existente[campo]) {
        campos[campo] = nuevo;
      }
    }

    if (Object.keys(campos).length === 0) {
      sinCambio += 1;
    } else {
      cambios.push({ id: existente.id, id_patrimonial: fila.id_patrimonial, campos });
    }
  }

  return {
    altas,
    cambios,
    sinCambio,
    categoriasNuevas: [...categoriasNuevas].sort(),
    avisos: lectura.avisos,
  };
};
