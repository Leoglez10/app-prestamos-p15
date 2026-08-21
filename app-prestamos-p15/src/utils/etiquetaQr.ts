/**
 * Formato del código impreso en las etiquetas de equipo.
 *
 * La etiqueta NO lleva la dirección del servidor: esa cambia sola y obligaría a
 * reimprimir todo. Lleva solo el identificador del equipo. Ver docs/QR_CELULAR.md.
 *
 * El prefijo permite distinguir una etiqueta nuestra de cualquier otro QR que la
 * cámara agarre de casualidad, en vez de interpretar basura como un id.
 *
 * OJO: el lector del celular vive en `src-tauri/src/celular.rs`, servido como
 * HTML. Si cambia este formato, hay que cambiarlo allá también.
 */
const PREFIJO = "P15-";

export const codigoDeEquipo = (equipoId: number): string => `${PREFIJO}${equipoId}`;

/** Devuelve null si el texto no es una etiqueta nuestra. */
export const equipoDesdeCodigo = (texto: string): number | null => {
  const limpio = texto.trim().toUpperCase();
  if (!limpio.startsWith(PREFIJO)) {
    return null;
  }

  const id = Number(limpio.slice(PREFIJO.length));
  return Number.isInteger(id) && id > 0 ? id : null;
};
