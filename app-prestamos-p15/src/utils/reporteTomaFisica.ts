/**
 * Traer de vuelta una toma física hecha en OTRA computadora.
 *
 * El caso real: la máquina principal sigue prestando mientras una segunda
 * computadora camina el edificio con la pistola. Al terminar hay que juntar los
 * dos trabajos, y el respaldo `.db` NO sirve para eso: `restore_from_bytes`
 * reemplaza la base entera, así que devolver la base de la segunda máquina
 * borraría todos los préstamos que la principal registró mientras tanto.
 *
 * Este módulo lee el CSV que la app ya exporta con `construirReporteCsv` y lo
 * convierte en una FUSIÓN: escribe únicamente las cuatro columnas que produce un
 * recorrido — `revisado_en`, `revisado_por`, `no_localizado_en`,
 * `no_localizado_por` — más la ubicación. Los préstamos no comparten ninguna de
 * esas columnas, y por eso las dos máquinas pueden trabajar a la vez sin pisarse.
 *
 * No hizo falta inventar un formato nuevo: el reporte para Patrimonio ya trae
 * `Id`, `Localizado`, `Revisado`, `Revisó` y `Ubicación`, que es exactamente lo
 * que se necesita para reconstruir cada afirmación del recorrido.
 *
 * Pura y sin base, igual que `importacionPatrimonio.ts`: decide, no escribe. La
 * escritura vive en `useInventory.ts` y así esto se prueba con `node --test`.
 */
import type { EquipoRevisable } from "./tomaFisica";

/** Una fila del reporte, ya interpretada. */
export type FilaReporte = {
  id_patrimonial: string;
  nombre: string;
  ubicacion: string | null;
  /** `S` apareció, `N` se buscó y no estaba, vacío es que nadie llegó a esa área. */
  localizado: "S" | "N" | "";
  cuando: string | null;
  quien: string | null;
};

export type LecturaReporte = {
  filas: FilaReporte[];
  /** Filas sin etiqueta de Patrimonio: no hay con qué machearlas. */
  sinEtiqueta: number;
  avisos: string[];
};

/** Un equipo al que el reporte le cambia algo. */
export type CambioRevision = {
  id: number;
  id_patrimonial: string;
  nombre: string;
  tipo: "revisado" | "no_localizado";
  cuando: string;
  quien: string | null;
  /** Solo viaja en `revisado`, y solo si el reporte trae un área. */
  ubicacion: string | null;
};

export type PlanFusion = {
  cambios: CambioRevision[];
  /** Lo que el reporte afirma, pero la base ya sabe igual o más nuevo. */
  sinCambio: number;
  /** `Localizado` vacío: nadie llegó todavía a ese equipo. No se toca. */
  sinDecidir: number;
  /** Ids del reporte que no existen en esta base. Casi siempre altas al vuelo. */
  desconocidos: string[];
  sinEtiqueta: number;
  avisos: string[];
};

/** Sin acentos, sin mayúsculas, sin espacios de sobra. Para comparar encabezados. */
const normalizar = (valor: string): string =>
  valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const limpiar = (valor: string | undefined): string | null => {
  const texto = (valor ?? "").trim();
  return texto === "" ? null : texto;
};

/**
 * Parser de CSV con comillas, no `split(";")`.
 *
 * Las descripciones que vienen del Excel de Patrimonio traen comas, comillas y
 * saltos de línea adentro — por eso `campoCsv` entrecomilla todo y duplica las
 * comillas. Partir por separador rompería justo en esas filas, y romperían en
 * silencio: la fila se correría una columna y el `Localizado` de un equipo se
 * leería del campo de al lado.
 */
const parsearCsv = (texto: string): string[][] => {
  // BOM al frente (lo escribe la app para que Excel abra bien los acentos) y
  // los CR de un archivo que pasó por Windows.
  const limpio = texto.replace(/^\ufeff/, "").replace(/\r/g, "");

  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let enComillas = false;

  for (let i = 0; i < limpio.length; i += 1) {
    const caracter = limpio[i];

    if (enComillas) {
      if (caracter === '"') {
        // Comilla doble escapada: `""` es una comilla literal.
        if (limpio[i + 1] === '"') {
          campo += '"';
          i += 1;
        } else {
          enComillas = false;
        }
      } else {
        campo += caracter;
      }
      continue;
    }

    if (caracter === '"') {
      enComillas = true;
    } else if (caracter === ";") {
      fila.push(campo);
      campo = "";
    } else if (caracter === "\n") {
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else {
      campo += caracter;
    }
  }

  // La última fila puede no terminar en salto de línea.
  if (campo !== "" || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }

  return filas;
};

/**
 * Las columnas se buscan por NOMBRE, no por posición.
 *
 * El archivo puede pasar por Excel antes de volver, y ahí se le mueven o se le
 * agregan columnas. Leer por posición haría que un archivo reordenado importara
 * datos corridos sin avisar.
 */
const COLUMNA = {
  id: "id",
  ubicacion: "ubicacion",
  localizado: "localizado",
  revisado: "revisado",
  reviso: "reviso",
  descripcion: "descripcion",
} as const;

export const leerReporteCsv = (texto: string): LecturaReporte => {
  const filasCrudas = parsearCsv(texto).filter((fila) =>
    fila.some((celda) => celda.trim() !== "")
  );

  if (filasCrudas.length === 0) {
    throw new Error("El archivo está vacío.");
  }

  const encabezado = filasCrudas[0].map(normalizar);
  const indice = (nombre: string): number => encabezado.indexOf(nombre);

  const iId = indice(COLUMNA.id);
  const iLocalizado = indice(COLUMNA.localizado);

  if (iId === -1 || iLocalizado === -1) {
    throw new Error(
      "Este archivo no parece un reporte de toma física: le faltan las columnas " +
        '"Id" y "Localizado". Tiene que ser el CSV que exporta esta misma app.'
    );
  }

  const iUbicacion = indice(COLUMNA.ubicacion);
  const iRevisado = indice(COLUMNA.revisado);
  const iReviso = indice(COLUMNA.reviso);
  const iDescripcion = indice(COLUMNA.descripcion);

  const filas: FilaReporte[] = [];
  const avisos: string[] = [];
  let sinEtiqueta = 0;

  for (const cruda of filasCrudas.slice(1)) {
    const id = limpiar(cruda[iId]);
    if (!id) {
      sinEtiqueta += 1;
      continue;
    }

    const marca = (limpiar(cruda[iLocalizado]) ?? "").toUpperCase();
    if (marca !== "" && marca !== "S" && marca !== "N") {
      avisos.push(`${id}: "Localizado" dice "${marca}", que no es S ni N. Se ignora la fila.`);
      continue;
    }

    filas.push({
      id_patrimonial: id,
      nombre: (iDescripcion === -1 ? null : limpiar(cruda[iDescripcion])) ?? id,
      ubicacion: iUbicacion === -1 ? null : limpiar(cruda[iUbicacion]),
      localizado: marca as FilaReporte["localizado"],
      cuando: iRevisado === -1 ? null : limpiar(cruda[iRevisado]),
      quien: iReviso === -1 ? null : limpiar(cruda[iReviso]),
    });
  }

  return { filas, sinEtiqueta, avisos };
};

/**
 * Compara el reporte contra lo que ya hay y devuelve qué se va a escribir.
 *
 * **Gana el más nuevo, por equipo y no por archivo.** Esa es toda la diferencia
 * con restaurar un respaldo: acá la comparación es fila por fila contra el
 * timestamp que ya está guardado, así que importar el mismo reporte dos veces no
 * cambia nada, y un reporte viejo no puede pisar un recorrido más reciente.
 *
 * Los timestamps son texto `YYYY-MM-DD HH:MM:SS` (`getCurrentLocalDateTime`),
 * que ordena cronológicamente comparando como cadena. Por eso alcanza con `>=`.
 */
export const planificarFusionReporte = (
  lectura: LecturaReporte,
  existentes: EquipoRevisable[]
): PlanFusion => {
  const porPatrimonial = new Map<string, EquipoRevisable>();
  for (const equipo of existentes) {
    if (equipo.id_patrimonial) porPatrimonial.set(equipo.id_patrimonial, equipo);
  }

  const cambios: CambioRevision[] = [];
  const desconocidos: string[] = [];
  const avisos = [...lectura.avisos];
  let sinCambio = 0;
  let sinDecidir = 0;

  for (const fila of lectura.filas) {
    if (fila.localizado === "") {
      sinDecidir += 1;
      continue;
    }

    const existente = porPatrimonial.get(fila.id_patrimonial);
    if (!existente) {
      desconocidos.push(fila.id_patrimonial);
      continue;
    }

    // Sin fecha no hay forma de saber si esto es más nuevo que lo que ya está,
    // y sin esa comparación la fusión deja de ser segura. Se avisa y se salta.
    if (!fila.cuando) {
      avisos.push(
        `${fila.id_patrimonial}: dice "${fila.localizado}" pero no trae fecha. No se puede saber si es más nuevo que lo guardado.`
      );
      continue;
    }

    if (fila.localizado === "S") {
      if (existente.revisado_en && existente.revisado_en >= fila.cuando) {
        sinCambio += 1;
        continue;
      }

      cambios.push({
        id: existente.id,
        id_patrimonial: fila.id_patrimonial,
        nombre: existente.nombre_equipo,
        tipo: "revisado",
        cuando: fila.cuando,
        quien: fila.quien,
        ubicacion: fila.ubicacion,
      });
      continue;
    }

    // "No apareció". Que la base lo haya VISTO después manda sobre esto: si el
    // equipo se escaneó más tarde en la máquina principal, está ahí, y un
    // reporte anterior no puede declararlo perdido.
    if (existente.revisado_en && existente.revisado_en >= fila.cuando) {
      sinCambio += 1;
      continue;
    }

    if (existente.no_localizado_en && existente.no_localizado_en >= fila.cuando) {
      sinCambio += 1;
      continue;
    }

    cambios.push({
      id: existente.id,
      id_patrimonial: fila.id_patrimonial,
      nombre: existente.nombre_equipo,
      tipo: "no_localizado",
      cuando: fila.cuando,
      quien: fila.quien,
      ubicacion: null,
    });
  }

  return {
    cambios,
    sinCambio,
    sinDecidir,
    desconocidos,
    sinEtiqueta: lectura.sinEtiqueta,
    avisos,
  };
};
