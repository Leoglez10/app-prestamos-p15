/**
 * Validación del formulario de "Reportar un problema".
 *
 * Los mismos límites viven en `src-tauri/src/feedback.rs` y en `worker/src/index.js`.
 * Esta copia existe solo para avisar antes de salir a la red; la que manda es la del
 * Worker, porque es la única que un cliente no puede saltarse.
 */
export type TipoReporte = "bug" | "sugerencia";

export const TITULO_MAX = 120;
export const DESCRIPCION_MAX = 4000;

export const validarReporte = (
  { tipo, titulo, descripcion }: { tipo: string; titulo: string; descripcion: string },
): string | null => {
  if (tipo !== "bug" && tipo !== "sugerencia") return "Elegí si es un problema o una sugerencia.";
  const tituloLimpio = titulo.trim();
  if (!tituloLimpio) return "Escribí un título corto que resuma el problema.";
  if (tituloLimpio.length > TITULO_MAX) return `El título no puede pasar de ${TITULO_MAX} caracteres.`;
  const descripcionLimpia = descripcion.trim();
  if (!descripcionLimpia) return "Contá qué pasó y qué esperabas que pasara.";
  if (descripcionLimpia.length > DESCRIPCION_MAX) return `La descripción no puede pasar de ${DESCRIPCION_MAX} caracteres.`;
  return null;
};
