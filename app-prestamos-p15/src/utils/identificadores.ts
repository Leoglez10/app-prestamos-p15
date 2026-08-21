/**
 * Identificadores autonumerados para el alta de varias unidades a la vez.
 *
 * Registrar cinco controles como cinco filas es lo que les da un QR propio y un
 * historial propio (ver `EquipoDetalleModal`). Hacerlo a mano es tan tedioso que
 * la gente termina usando granel, que es justo lo que no queremos.
 *
 * Se respeta el ancho que escribió el usuario: `REM-001` sigue con `REM-002`, no
 * con `REM-2`, para que las etiquetas impresas queden parejas.
 */
export const generarIdentificadores = (base: string, cantidad: number): (string | null)[] => {
  const total = Math.max(1, Math.floor(cantidad) || 1);
  const limpio = base.trim();

  // Sin código base no hay nada que numerar: las filas quedan sin identificador.
  if (!limpio) {
    return Array.from({ length: total }, () => null);
  }

  // Los dígitos finales son el contador; lo de antes es el prefijo literal.
  const partes = limpio.match(/^(.*?)(\d+)$/);
  const prefijo = partes ? partes[1] : `${limpio}-`;
  const inicio = partes ? Number(partes[2]) : 1;
  const ancho = partes ? partes[2].length : 3;

  return Array.from({ length: total }, (_, i) =>
    `${prefijo}${String(inicio + i).padStart(ancho, "0")}`
  );
};
