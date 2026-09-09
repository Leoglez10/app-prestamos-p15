/**
 * El catálogo de estados de un equipo.
 *
 * Vivía repetido como cuatro `<option>` sueltos en tres pantallas distintas, y
 * cada vez que hacía falta uno nuevo había que acordarse de las tres. Ahora la
 * lista es una sola, y las pantallas la recorren.
 *
 * Los estados fijos son los que el código conoce por nombre: `disponible` es el
 * único que deja prestar (ver `createPrestamo`) y `prestado` lo escribe el
 * préstamo solo. Los demás son etiquetas de inventario — un equipo que está
 * "Para baja" simplemente no se presta, sin ninguna regla extra.
 *
 * Los personalizados los agrega la persona desde el formulario y viven en
 * `app_settings`, no en una tabla: son media docena de nombres, no un catálogo.
 */

export type Estado = {
  valor: string;
  etiqueta: string;
};

export const ESTADOS_FIJOS: Estado[] = [
  { valor: "disponible", etiqueta: "Disponible" },
  { valor: "prestado", etiqueta: "Prestado (No remueve el préstamo)" },
  { valor: "extraviado", etiqueta: "Extraviado" },
  { valor: "mantenimiento", etiqueta: "Mantenimiento" },
  { valor: "para_baja", etiqueta: "Para baja" },
  { valor: "baja", etiqueta: "Baja" },
  { valor: "obsoleto", etiqueta: "Obsoleto" },
  { valor: "en_resguardo", etiqueta: "En resguardo" },
];

/**
 * El valor que se guarda en la columna `estado`.
 *
 * Sin acentos ni espacios porque el mismo texto termina siendo una clase CSS
 * (`.state.para_baja`) y el valor de un `<option>` en los filtros.
 */
export const slugEstado = (nombre: string): string =>
  nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

/** Los fijos primero, después los que agregó la persona. Sin repetidos. */
export const listaEstados = (personalizados: Estado[] = []): Estado[] => {
  const vistos = new Set(ESTADOS_FIJOS.map((estado) => estado.valor));
  return [
    ...ESTADOS_FIJOS,
    ...personalizados.filter((estado) => {
      if (!estado.valor || vistos.has(estado.valor)) return false;
      vistos.add(estado.valor);
      return true;
    }),
  ];
};

/**
 * Lo que se le muestra a una persona. Un estado que ya no está en la lista
 * (se borró el personalizado pero quedaron equipos con él) se muestra igual:
 * esconderlo dejaría filas con la celda vacía y nadie sabría por qué.
 */
export const etiquetaEstado = (valor: string, personalizados: Estado[] = []): string => {
  const encontrado = listaEstados(personalizados).find((estado) => estado.valor === valor);
  if (encontrado) return encontrado.etiqueta;
  const legible = valor.replace(/_/g, " ").trim();
  return legible ? legible.charAt(0).toUpperCase() + legible.slice(1) : valor;
};

/**
 * La misma etiqueta, sin el paréntesis de ayuda.
 *
 * "Prestado (No remueve el préstamo)" avisa de lo que pasa al guardar: tiene
 * sentido dentro del `<select>` del formulario y ninguno en una ficha, donde
 * el estado se está leyendo, no eligiendo. Solo recorta a los estados fijos:
 * los personalizados llegan por el slug, que nunca trae paréntesis.
 */
export const etiquetaEstadoCorta = (valor: string, personalizados: Estado[] = []): string =>
  etiquetaEstado(valor, personalizados).replace(/\s*\([^)]*\)\s*$/, "").trim();

/**
 * Los cuatro colores del bloque grande de estado en la ficha del equipo.
 *
 * No sustituye a `.state` de `App.css`: ese chip de tabla es un pastilla sólida
 * con texto blanco y funciona. Acá el estado ocupa una tarjeta entera, así que
 * necesita un fondo suave, un borde y un texto oscuro que se lea encima.
 */
export type ColorEstado = {
  fondo: string;
  borde: string;
  texto: string;
  punto: string;
};

/**
 * El violeta es el color de cualquier estado sin entrada propia: los que la
 * persona agregue desde el formulario y también `obsoleto`, que ya sale violeta
 * en la tabla (`.state.obsoleto`). Ninguno se queda sin color.
 */
export const COLOR_ESTADO_DEFECTO: ColorEstado = {
  fondo: "#F5F3FF",
  borde: "#DDD6FE",
  texto: "#6D28D9",
  punto: "#7C3AED",
};

const COLORES_ESTADO: Record<string, ColorEstado> = {
  disponible: { fondo: "#ECFDF5", borde: "#A7F3D0", texto: "#047857", punto: "#059669" },
  prestado: { fondo: "#FEF2F2", borde: "#FECACA", texto: "#B91C1C", punto: "#DC2626" },
  mantenimiento: { fondo: "#FFFBEB", borde: "#FDE68A", texto: "#B45309", punto: "#D97706" },
  extraviado: { fondo: "#F1F5F9", borde: "#CBD5E1", texto: "#334155", punto: "#64748B" },
  para_baja: { fondo: "#FFF7ED", borde: "#FED7AA", texto: "#C2410C", punto: "#EA580C" },
  baja: { fondo: "#F8FAFC", borde: "#E2E8F0", texto: "#64748B", punto: "#94A3B8" },
  en_resguardo: { fondo: "#EFF6FF", borde: "#BFDBFE", texto: "#1D4ED8", punto: "#2563EB" },
};

export const colorEstado = (valor: string): ColorEstado =>
  COLORES_ESTADO[valor] ?? COLOR_ESTADO_DEFECTO;
