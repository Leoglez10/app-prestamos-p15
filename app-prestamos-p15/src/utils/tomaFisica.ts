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
  marca: string | null;
  modelo: string | null;
  num_serie: string | null;
  resguardante_nombre: string | null;
};

export type ProgresoCampana = {
  total: number;
  revisados: number;
  pendientes: number;
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

export const calcularProgreso = (
  equipos: EquipoRevisable[],
  inicioCampana: string | null
): ProgresoCampana => {
  const total = equipos.length;
  const revisados = equipos.filter((equipo) => fueRevisado(equipo, inicioCampana)).length;
  const sinEtiqueta = equipos.filter((equipo) => !equipo.id_patrimonial).length;

  return {
    total,
    revisados,
    pendientes: total - revisados,
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
 * El reporte que se le devuelve a Patrimonio.
 *
 * Reproduce la columna `Localizado` de su propio archivo, que es justamente lo
 * que una toma física produce: qué apareció, dónde, y qué no apareció.
 *
 * Sale como CSV con `;` y BOM UTF-8 a propósito: así Excel en español lo abre en
 * columnas y con los acentos bien, en vez de una sola columna llena de símbolos.
 * Un `.xlsx` de verdad obligaría a sumar una librería de escritura para no
 * ganar nada.
 */
export const construirReporteCsv = (
  equipos: EquipoRevisable[],
  inicioCampana: string | null
): string => {
  const filas = equipos.map((equipo) => {
    const revisado = fueRevisado(equipo, inicioCampana);
    return [
      equipo.id_patrimonial,
      equipo.nombre_equipo,
      equipo.marca,
      equipo.modelo,
      equipo.num_serie,
      equipo.resguardante_nombre,
      equipo.ubicacion,
      revisado ? "S" : "N",
      revisado ? equipo.revisado_en : null,
      revisado ? equipo.revisado_por : null,
    ]
      .map(campoCsv)
      .join(";");
  });

  return `﻿${COLUMNAS_REPORTE.map(campoCsv).join(";")}\n${filas.join("\n")}\n`;
};

/** `reporte-inventario-2026-08-25.csv` */
export const nombreDelReporte = (ahora: Date): string => {
  const iso = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(
    ahora.getDate()
  ).padStart(2, "0")}`;
  return `reporte-inventario-${iso}.csv`;
};
