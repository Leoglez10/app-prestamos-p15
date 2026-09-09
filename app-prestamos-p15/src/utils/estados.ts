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
