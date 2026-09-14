/**
 * Qué hace la importación del Excel de profesores con cada fila.
 *
 * Pura a propósito, igual que `importacionPatrimonio.ts`: decide, no escribe.
 * La escritura vive en `useInventory.ts` y esta lógica se prueba con `node --test`.
 *
 * Límites deliberados:
 * - NUNCA toca `es_admin` ni `admin_pin`. Dar permisos de administrador desde un
 *   Excel sería una puerta trasera; eso se hace a mano en Admin.
 * - NUNCA borra a quien no viene en el archivo. Préstamos y celulares vinculados
 *   apuntan a esos profesores, y un Excel incompleto no puede llevárselos.
 */

/** Una fila ya limpia, tal como la devuelve `src-tauri/src/profesores.rs`. */
export type FilaProfesor = {
  codigo: string;
  nombre: string;
};

export type LecturaProfesores = {
  filas: FilaProfesor[];
  avisos: string[];
};

export type ProfesorExistente = {
  id: number;
  codigo: string;
  nombre: string;
};

export type CambioProfesor = {
  id: number;
  codigo: string;
  nombreAnterior: string;
  nombre: string;
};

export type PlanImportacionProfesores = {
  altas: FilaProfesor[];
  cambios: CambioProfesor[];
  sinCambio: number;
  avisos: string[];
};

/**
 * Forma de comparar nombres: sin mayúsculas, sin acentos y sin espacios dobles.
 *
 * Si el archivo llega en MAYÚSCULAS o sin acentos, no es un cambio de nombre:
 * sin esto, reimportar marcaría a todo el directorio como modificado y
 * reemplazaría "María López" por "MARIA LOPEZ".
 *
 * La tilde de la ñ (U+0303) NO se quita: "Peña" y "Pena" son apellidos
 * distintos, y corregir uno por el otro es justo lo que debe llegar a la base.
 */
export const normalizarNombre = (nombre: string): string =>
  nombre
    .normalize("NFD")
    .replace(/(?!̃)[̀-ͯ]/g, "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/**
 * Compara el archivo contra el directorio y devuelve qué se va a hacer.
 * Nada de esto escribe: alimenta la vista previa.
 */
export const planificarImportacionProfesores = (
  lectura: LecturaProfesores,
  existentes: ProfesorExistente[]
): PlanImportacionProfesores => {
  const porCodigo = new Map<string, ProfesorExistente>();
  for (const profesor of existentes) {
    porCodigo.set(profesor.codigo.trim(), profesor);
  }

  const altas: FilaProfesor[] = [];
  const cambios: CambioProfesor[] = [];
  let sinCambio = 0;

  for (const fila of lectura.filas) {
    const codigo = fila.codigo.trim();
    const nombre = fila.nombre.trim();
    const existente = porCodigo.get(codigo);

    if (!existente) {
      altas.push({ codigo, nombre });
    } else if (normalizarNombre(existente.nombre) === normalizarNombre(nombre)) {
      sinCambio += 1;
    } else {
      cambios.push({ id: existente.id, codigo, nombreAnterior: existente.nombre, nombre });
    }
  }

  return { altas, cambios, sinCambio, avisos: lectura.avisos };
};
