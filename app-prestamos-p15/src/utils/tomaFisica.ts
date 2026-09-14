/**
 * Toma física de inventario: recorrer el edificio con la pistola y marcar qué
 * apareció, dónde y quién lo vio.
 *
 * Pura y sin base, para poder probarla con `node --test`.
 *
 * **Por qué no hay tabla de revisiones.** Dos columnas (`revisado_en`,
 * `revisado_por`) más una fecha de corte guardada en `app_settings` dan el
 * reporte completo: pendiente es todo lo que no se vio *desde* que arrancó la
 * campaña. Una tabla de historial contestaría "¿dónde estaba esto el año
 * pasado?", que nadie preguntó todavía, y se puede agregar después sin migrar
 * nada de esto.
 */

export type EquipoRevisable = {
  id: number;
  nombre_equipo: string;
  id_patrimonial: string | null;
  ubicacion: string | null;
  revisado_en: string | null;
  revisado_por: string | null;
  no_localizado_en: string | null;
  no_localizado_por: string | null;
  marca: string | null;
  modelo: string | null;
  num_serie: string | null;
  resguardante_nombre: string | null;
};

export type ProgresoCampana = {
  total: number;
  revisados: number;
  pendientes: number;
  /** Se buscaron y no aparecieron. Salen de `pendientes`: ya se decidió sobre ellos. */
  noLocalizados: number;
  /** Equipos sin etiqueta de Patrimonio: no se pueden escanear, hay que buscarlos a mano. */
  sinEtiqueta: number;
  porcentaje: number;
};

/**
 * Un equipo cuenta como revisado solo si se vio DESPUÉS de que arrancó la
 * campaña. Sin la fecha de corte, la toma del año pasado haría parecer que ya
 * está todo hecho.
 */
export const fueRevisado = (equipo: EquipoRevisable, inicioCampana: string | null): boolean => {
  if (!equipo.revisado_en) return false;
  if (!inicioCampana) return true;
  return equipo.revisado_en >= inicioCampana;
};

/**
 * Igual que `fueRevisado`, pero para la afirmación contraria.
 *
 * También se compara contra la fecha de corte: que algo no apareciera el año
 * pasado no dice nada de dónde está hoy.
 */
export const fueNoLocalizado = (
  equipo: EquipoRevisable,
  inicioCampana: string | null
): boolean => {
  if (!equipo.no_localizado_en) return false;
  if (!inicioCampana) return true;
  return equipo.no_localizado_en >= inicioCampana;
};

export const calcularProgreso = (
  equipos: EquipoRevisable[],
  inicioCampana: string | null
): ProgresoCampana => {
  const total = equipos.length;
  const revisados = equipos.filter((equipo) => fueRevisado(equipo, inicioCampana)).length;
  const sinEtiqueta = equipos.filter((equipo) => !equipo.id_patrimonial).length;
  // Un equipo revisado gana sobre la marca vieja: si aparecio, aparecio.
  const noLocalizados = equipos.filter(
    (equipo) => !fueRevisado(equipo, inicioCampana) && fueNoLocalizado(equipo, inicioCampana)
  ).length;

  return {
    total,
    revisados,
    pendientes: total - revisados - noLocalizados,
    noLocalizados,
    sinEtiqueta,
    porcentaje: total === 0 ? 0 : Math.round((revisados / total) * 100),
  };
};

/**
 * Escapa un campo para CSV. Las comillas se duplican y todo va entrecomillado:
 * las descripciones del Excel traen comas, comillas y saltos de línea.
 */
const campoCsv = (valor: string | null): string => `"${(valor ?? "").replace(/"/g, '""')}"`;

const COLUMNAS_REPORTE = [
  "Id",
  "Descripción",
  "Marca",
  "Modelo",
  "Num Serie",
  "Resguardante",
  "Ubicación",
  "Localizado",
  "Revisado",
  "Revisó",
] as const;

/**
 * Las filas del reporte que se le devuelve a Patrimonio, encabezado incluido.
 *
 * Reproduce la columna `Localizado` de su propio archivo, que es justamente lo
 * que una toma física produce: qué apareció, dónde, y qué no apareció.
 *
 * Sale como matriz y no como texto porque hay dos salidas sobre los MISMOS
 * datos: el CSV que esta app vuelve a leer para fusionar dos computadoras, y el
 * `.xlsx` que se entrega. Armarlas por separado sería garantizar que un día
 * digan cosas distintas.
 */
export const filasDelReporte = (
  equipos: EquipoRevisable[],
  inicioCampana: string | null
): string[][] => {
  const filas = equipos.map((equipo) => {
    const revisado = fueRevisado(equipo, inicioCampana);
    const perdido = !revisado && fueNoLocalizado(equipo, inicioCampana);

    // Tres estados, no dos. `S` apareció, `N` se buscó y no estaba, vacío es que
    // nadie llegó todavía a esa área. Antes todo lo no revisado salía como `N`,
    // o sea que el reporte afirmaba pérdidas que nadie había comprobado.
    const localizado = revisado ? "S" : perdido ? "N" : "";
    const cuando = revisado ? equipo.revisado_en : perdido ? equipo.no_localizado_en : null;
    const quien = revisado ? equipo.revisado_por : perdido ? equipo.no_localizado_por : null;

    return [
      equipo.id_patrimonial,
      equipo.nombre_equipo,
      equipo.marca,
      equipo.modelo,
      equipo.num_serie,
      equipo.resguardante_nombre,
      equipo.ubicacion,
      localizado,
      cuando,
      quien,
    ].map((valor) => valor ?? "");
  });

  return [[...COLUMNAS_REPORTE], ...filas];
};

/**
 * El mismo reporte, como CSV.
 *
 * Va con `;` y BOM UTF-8 a propósito: así Excel en español lo abre en columnas
 * y con los acentos bien, en vez de una sola columna llena de símbolos. Este es
 * además el archivo que `importarReporte` vuelve a leer para fusionar el
 * trabajo de dos computadoras; el `.xlsx` es solo para entregar.
 */
export const construirReporteCsv = (
  equipos: EquipoRevisable[],
  inicioCampana: string | null
): string => {
  const [encabezado, ...filas] = filasDelReporte(equipos, inicioCampana);

  return `\ufeff${encabezado.map(campoCsv).join(";")}\n${filas
    .map((fila) => fila.map(campoCsv).join(";"))
    .join("\n")}\n`;
};

/** `reporte-inventario-2026-08-25.csv` */
export const nombreDelReporte = (ahora: Date, extension: "csv" | "xlsx" = "csv"): string => {
  const iso = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(
    ahora.getDate()
  ).padStart(2, "0")}`;
  return `reporte-inventario-${iso}.${extension}`;
};

/**
 * Los niveles de un lugar: "SITE 2 / Anaquel 1" son dos. Se separa en `/` y se
 * limpia cada tramo, así "SITE 2/Anaquel 1" y "SITE 2 /  Anaquel 1" son lo mismo.
 */
const tramosDeLugar = (texto: string | null | undefined): string[] =>
  (texto ?? "")
    .split("/")
    .map((tramo) => tramo.trim().replace(/\s+/g, " "))
    .filter(Boolean);

/**
 * La forma en que se guarda y se muestra un lugar: tramos separados por " / ".
 * Respeta mayúsculas; la comparación las ignora por su cuenta.
 */
export const normalizarLugar = (texto: string | null | undefined): string =>
  tramosDeLugar(texto).join(" / ");

/**
 * Si `lugar` queda dentro de `area`: los tramos del área son el principio de los
 * del lugar. Recorrer "SITE 2" cubre "SITE 2 / Anaquel 1"; al revés no.
 *
 * Se compara por tramos y no por texto para que "SITE 2" no contenga "SITE 20".
 */
export const estaDentroDe = (
  lugar: string | null | undefined,
  area: string | null | undefined
): boolean => {
  const tramosLugar = tramosDeLugar(lugar).map((tramo) => tramo.toLocaleLowerCase());
  const tramosArea = tramosDeLugar(area).map((tramo) => tramo.toLocaleLowerCase());
  if (tramosLugar.length === 0 || tramosArea.length === 0) return false;
  if (tramosArea.length > tramosLugar.length) return false;
  return tramosArea.every((tramo, i) => tramo === tramosLugar[i]);
};

/**
 * La ubicación que se escribe al ver un equipo recorriendo `ahora`.
 *
 * Si ya estaba anotado más adentro ("SITE 2 / Anaquel 1") y se recorre el nivel
 * de arriba ("SITE 2"), se conserva el dato preciso: recorrer el site no dice en
 * qué anaquel está. En cualquier otro caso manda el lugar del recorrido.
 */
export const lugarAlRevisar = (
  antes: string | null | undefined,
  ahora: string
): string => {
  const actual = normalizarLugar(ahora);
  const previo = normalizarLugar(antes);
  return estaDentroDe(previo, actual) && !estaDentroDe(actual, previo) ? previo : actual;
};

/**
 * Lo que Patrimonio dice que vive en esta área y todavía no se vio en esta
 * campaña. Incluye los subniveles: recorrer "SITE 2" cubre "SITE 2 / Anaquel 1".
 *
 * Es la única señal de que un aula está terminada: sin ella se dispara hasta
 * que uno se cansa. No hace falta ninguna columna nueva porque
 * `registrarRevision` conserva `ubicacion` entre campañas — el dato de dónde
 * estaba cada equipo sobrevive al corte.
 */
export const pendientesDeArea = (
  equipos: EquipoRevisable[],
  ubicacion: string,
  inicioCampana: string | null
): EquipoRevisable[] => {
  return equipos.filter(
    (equipo) =>
      estaDentroDe(equipo.ubicacion, ubicacion) &&
      !fueRevisado(equipo, inicioCampana) &&
      !fueNoLocalizado(equipo, inicioCampana)
  );
};

/** Las tres cosas que puede significar un disparo contra una etiqueta conocida. */
export type ResultadoDisparo = "repetido" | "movido" | "nuevo";

/**
 * Clasifica un disparo ANTES de escribirlo.
 *
 * `movido` sale de comparar la ubicación guardada contra la actual, y hoy se
 * pierde en silencio: `registrarRevision` pisa la columna sin que nadie mire lo
 * que había. Es el dato que más le importa a Patrimonio — un equipo que
 * cambió de aula sin que nadie lo reportara.
 *
 * Pasar a un subnivel o a su nivel de arriba ("SITE 2" ↔ "SITE 2 / Anaquel 1")
 * no es moverse: es el mismo lugar dicho con más o menos detalle.
 */
export const clasificarDisparo = (
  equipo: EquipoRevisable,
  ubicacionActual: string,
  yaLeidos: ReadonlyArray<number>
): ResultadoDisparo => {
  if (yaLeidos.includes(equipo.id)) return "repetido";

  const antes = equipo.ubicacion;
  const ahora = ubicacionActual;
  if (!normalizarLugar(antes) || !normalizarLugar(ahora)) return "nuevo";
  return estaDentroDe(antes, ahora) || estaDentroDe(ahora, antes) ? "nuevo" : "movido";
};
