/**
 * Normaliza lo que devuelve el lector de códigos de barras de la etiqueta de
 * Patrimonio de la UdeG.
 *
 * La etiqueta trae el ID en un código de barras 1D vertical. Según la simbología
 * el lector puede entregarlo pelón (`3382871`) o con delimitadores (`*3382871*`,
 * típico de Code 39). Quedarse solo con los dígitos cubre los dos casos con una
 * sola regla, y de paso limpia el `Enter` o los espacios que agregue la pistola.
 *
 * Se guarda y se compara como TEXTO, nunca como número: convertirlo a entero
 * pierde información en silencio. Ver `docs/INVENTARIO_PATRIMONIO.md` §1.
 *
 * ponytail: si el lector resulta agregar un dígito verificador al final, esto se
 * queda corto y hay que recortarlo acá — es el único lugar. Falta ese dato (ver
 * `docs/PLAN_IMPORTACION_PATRIMONIO.md` §6 P1). Mientras tanto no rompe nada: el
 * buscador cae al filtro difuso de siempre cuando no hay coincidencia exacta.
 */
export const normalizarCodigoPatrimonial = (texto: string): string | null => {
  const digitos = (texto ?? "").replace(/\D/g, "");

  // Los IDs reales del inventario van de 5 a 7 dígitos, pero no se valida por
  // longitud: el archivo de Patrimonio ya trae ambos extremos y una regla de
  // ancho fijo dejaría fuera equipos que sí existen.
  return digitos.length > 0 ? digitos : null;
};

/**
 * Normaliza un número de serie del fabricante tal como lo entrega la pistola.
 *
 * A diferencia del ID de Patrimonio NO se quedan solo los dígitos: la serie es
 * alfanumérica (`MXL3322DP2`) y los guiones o letras son parte del dato. Solo se
 * quitan los espacios, los delimitadores `*` de Code 39 y la diferencia de
 * mayúsculas, que el lector y quien teclea no respetan igual.
 */
export const normalizarNumSerie = (texto: string): string | null => {
  const limpio = (texto ?? "").trim().replace(/^\*+|\*+$/g, "").trim().toUpperCase();
  return limpio.length > 0 ? limpio : null;
};

export type CodigoEscaneado = { tipo: "patrimonial" | "serie"; valor: string };
export type ModoEscaneo = "auto" | CodigoEscaneado["tipo"];

/** Resuelve únicamente el campo elegido; el modo automático conserva el fallback. */
export const resolverCodigoEscaneado = async <T>(
  texto: string,
  modo: ModoEscaneo,
  consultas: {
    porId: (valor: string) => Promise<T | null>;
    porSerie: (valor: string) => Promise<{ equipo: T | null; coincidencias: number }>;
  }
) => {
  const automatico = clasificarCodigoEscaneado(texto);
  const serie = normalizarNumSerie(texto);
  const clasificado: CodigoEscaneado | null = modo === "serie"
    ? (serie ? { tipo: "serie", valor: serie } : null)
    : modo === "patrimonial"
      ? (automatico?.tipo === "patrimonial" ? automatico : null)
      : automatico;
  if (!clasificado) return null;

  const equipo = clasificado.tipo === "patrimonial"
    ? await consultas.porId(clasificado.valor)
    : null;
  if (equipo || modo === "patrimonial") {
    return { clasificado, equipo, coincidencias: equipo ? 1 : 0, encontradoPorSerie: false };
  }
  const resultado = await consultas.porSerie(serie!);
  return {
    clasificado,
    equipo: resultado.coincidencias === 1 ? resultado.equipo : null,
    coincidencias: resultado.coincidencias,
    encontradoPorSerie: resultado.coincidencias === 1 && resultado.equipo !== null,
  };
};

/**
 * Decide si lo que leyó la pistola es un ID de Patrimonio o un número de serie.
 *
 * La regla es deliberadamente simple: si trae alguna letra no puede ser un ID de
 * Patrimonio (son solo dígitos), así que es una serie. Si son solo dígitos se
 * asume Patrimonio, que es la etiqueta que se espera en el recorrido; las series
 * puramente numéricas existen y por eso la toma física también las busca como
 * serie cuando no aparecen como ID.
 */
export const clasificarCodigoEscaneado = (texto: string): CodigoEscaneado | null => {
  const serie = normalizarNumSerie(texto);
  if (!serie) return null;
  if (/\p{L}/u.test(serie)) return { tipo: "serie", valor: serie };

  const patrimonial = normalizarCodigoPatrimonial(serie);
  return patrimonial ? { tipo: "patrimonial", valor: patrimonial } : null;
};
