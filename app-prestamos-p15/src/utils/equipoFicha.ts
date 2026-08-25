/**
 * Qué columnas de `inventario` se escriben y con qué valor.
 *
 * Vive fuera de `useInventory.ts` porque ese módulo importa el plugin de SQL de
 * Tauri en la primera línea: aquí la lógica queda pura y se puede probar con
 * `node --test`, sin base y sin runtime.
 *
 * La regla que sostiene todo: **`undefined` es "no toques esta columna" y `null`
 * es "bórrala"**. Antes el update reescribía la fila entera, y eso convertía cada
 * columna nueva en una trampa — cualquier pantalla que no conociera el campo lo
 * borraba al guardar. Ya había pasado con `id_patrimonial`.
 */
// Extensión explícita: sin ella `node --test` no resuelve el módulo. tsconfig
// tiene `allowImportingTsExtensions` y Vite la resuelve igual.
import { normalizarCodigoPatrimonial } from "./codigoPatrimonial.ts";

/** Ficha de Patrimonio: lo que aporta el Excel, más la ubicación que produce la casa. */
export type FichaEquipo = {
  id_patrimonial?: string | null;
  marca?: string | null;
  modelo?: string | null;
  num_serie?: string | null;
  descripcion?: string | null;
  resguardante_codigo?: string | null;
  resguardante_nombre?: string | null;
  fecha_adquisicion?: string | null;
  ubicacion?: string | null;
};

export type BaseEquipo = {
  nombre_equipo?: string;
  identificador?: string | null;
  categoria_id?: number;
  estado?: string;
  es_prestable?: number;
  es_granel?: number;
  stock_total?: number;
};

/**
 * Listas blancas de columnas. Son la única fuente de nombres que llega al string
 * del SQL: ninguna clave del objeto de entrada se concatena a la consulta.
 */
export const COLUMNAS_FICHA_EQUIPO = [
  "id_patrimonial",
  "marca",
  "modelo",
  "num_serie",
  "descripcion",
  "resguardante_codigo",
  "resguardante_nombre",
  "fecha_adquisicion",
  "ubicacion",
] as const satisfies ReadonlyArray<keyof FichaEquipo>;

export const COLUMNAS_BASE_EQUIPO = [
  "nombre_equipo",
  "identificador",
  "categoria_id",
  "estado",
  "es_prestable",
  "es_granel",
  "stock_total",
] as const satisfies ReadonlyArray<keyof BaseEquipo>;

/** Texto vacío o en blanco es "sin dato": se guarda NULL, no `''`. */
export const textoONulo = (valor: string | null | undefined): string | null => {
  const limpio = (valor ?? "").trim();
  return limpio === "" ? null : limpio;
};

/**
 * Traduce el objeto de entrada a las columnas que hay que escribir. Solo aparecen
 * las claves presentes: una clave ausente nunca llega al SQL.
 */
export const cambiosDeEquipo = (
  input: BaseEquipo & FichaEquipo
): Record<string, string | number | null> => {
  const cambios: Record<string, string | number | null> = {};

  for (const columna of COLUMNAS_BASE_EQUIPO) {
    const valor = input[columna];
    if (valor === undefined) continue;

    if (columna === "nombre_equipo") {
      cambios.nombre_equipo = String(valor).trim();
    } else if (columna === "identificador") {
      cambios.identificador = textoONulo(input.identificador);
    } else {
      cambios[columna] = valor;
    }
  }

  for (const columna of COLUMNAS_FICHA_EQUIPO) {
    if (input[columna] === undefined) continue;
    cambios[columna] =
      columna === "id_patrimonial"
        ? normalizarCodigoPatrimonial(input.id_patrimonial ?? "")
        : textoONulo(input[columna]);
  }

  return cambios;
};
