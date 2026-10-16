import { estaDentroDe, normalizarLugar } from "./tomaFisica.ts";
import { remapearUbicacion, rutaDeUbicacion } from "./ubicaciones.ts";

export type FilaUbicacion = { id: number; nombre_equipo: string; ubicacion: string | null };
export type CambioUbicacion = { id: number; nombre: string; antes: string; despues: string };
export type OperacionUbicacion =
  | { tipo: "renombrar"; nombre: string }
  | { tipo: "eliminar"; destino: string };
export type AccionUbicacion = "reubicar" | OperacionUbicacion["tipo"];
export type PlanReubicacion = {
  origen: string;
  padre: string;
  destino: string;
  inventario: FilaUbicacion[];
  cambios: CambioUbicacion[];
  operacion?: OperacionUbicacion;
};
export type PlanCambioUbicacion = PlanReubicacion & { operacion: OperacionUbicacion };
export type BaseReubicacion = {
  select: <T>(query: string) => Promise<T>;
  execute: (query: string, binds: unknown[]) => Promise<{ rowsAffected: number }>;
};
const key = (path: string) => normalizarLugar(path).toLocaleLowerCase();
const OBSOLETO = "El inventario cambió. Vuelve a generar la vista previa.";
const INVALIDO = "La vista previa no es válida. Vuelve a generarla.";
// Solo las operaciones nuevas requieren conservar el objeto de preview emitido.
// WeakMap sobrevive a los wrappers del hook, sin retener previews descartados ni
// aceptar ediciones coordinadas de operación, snapshot y cambios del llamador.
const previewsDeCambio = new WeakMap<PlanReubicacion, string>();

/** Solo rutas persistidas: un borrador no autoriza mover equipos ni crear padres. */
const planificar = (inventario: FilaUbicacion[], source: string, parent: string): PlanReubicacion => {
  const ids = new Set<number>();
  for (const row of inventario) {
    if (!Number.isSafeInteger(row.id) || row.id <= 0 || ids.has(row.id)) {
      throw new Error("El inventario contiene identificadores inválidos o duplicados.");
    }
    ids.add(row.id);
  }
  const origen = normalizarLugar(source);
  const padre = normalizarLugar(parent);
  const exists = (path: string) => inventario.some((row) => estaDentroDe(row.ubicacion, path));
  if (!origen || !exists(origen)) throw new Error("Elige una ubicación existente.");
  if (padre && !exists(padre)) throw new Error("Elige un padre existente o Sin padre.");
  if (padre && estaDentroDe(padre, origen)) {
    throw new Error("El padre no puede ser la ubicación ni uno de sus subniveles.");
  }
  const route = rutaDeUbicacion(origen);
  const name = route[route.length - 1].name;
  const destino = normalizarLugar(`${padre}/${name}`);
  if (key(destino) === key(origen)) throw new Error("La ubicación ya pertenece a ese padre.");
  if (exists(destino)) {
    throw new Error("Ya existe una ubicación con ese nombre en el destino. No se pueden combinar.");
  }
  const cambios = inventario.filter((row) => estaDentroDe(row.ubicacion, origen)).map((row) => ({
    id: row.id,
    nombre: row.nombre_equipo,
    antes: row.ubicacion!,
    despues: remapearUbicacion(row.ubicacion!, origen, destino),
  }));
  return { origen, padre, destino, inventario, cambios };
};

const validarOperacion = (operation: OperacionUbicacion): void => {
  if (!operation || (operation.tipo !== "renombrar" && operation.tipo !== "eliminar") ||
      (operation.tipo === "renombrar" ? typeof operation.nombre !== "string" : typeof operation.destino !== "string")) {
    throw new Error("La operación de ubicación no es válida.");
  }
};

const planificarCambio = (inventario: FilaUbicacion[], source: string, operation: OperacionUbicacion): PlanCambioUbicacion => {
  validarOperacion(operation);
  const origen = normalizarLugar(source);
  const ids = inventario.map((row) => row.id);
  if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0) || new Set(ids).size !== ids.length) {
    throw new Error("El inventario contiene identificadores inválidos o duplicados.");
  }
  const dentro = (row: FilaUbicacion) => estaDentroDe(row.ubicacion, origen);
  const affected = inventario.filter(dentro);
  if (!origen || !affected.length) throw new Error("Elige una ubicación existente.");
  const route = rutaDeUbicacion(origen);
  const padre = route[route.length - 2]?.path ?? "";
  const outside = inventario.filter((row) => !dentro(row));
  let destino: string;
  if (operation.tipo === "renombrar") {
    if (typeof operation.nombre !== "string" || !operation.nombre.trim()) throw new Error("Escribe el nombre del lugar.");
    if (operation.nombre.includes("/")) throw new Error("Escribe solo un nombre, sin /; agrega cada nivel por separado.");
    destino = normalizarLugar(`${padre}/${operation.nombre}`);
    // La igualdad exacta permite corregir mayúsculas, pero no un falso renombrado.
    if (destino === origen) throw new Error("El lugar ya tiene ese nombre.");
    if (outside.some((row) => estaDentroDe(row.ubicacion, destino))) {
      throw new Error("Ya existe una ubicación con ese nombre en el destino. No se pueden combinar.");
    }
  } else {
    destino = normalizarLugar(operation.destino);
    if (!destino || !inventario.some((row) => estaDentroDe(row.ubicacion, destino))) {
      throw new Error("Elige un destino existente para trasladar los equipos.");
    }
    if (estaDentroDe(destino, origen)) throw new Error("El destino no puede ser el lugar ni uno de sus subniveles.");
    const incoming = new Set(affected.flatMap((row) => {
      const child = rutaDeUbicacion(row.ubicacion!)[route.length];
      return child ? [`${destino} / ${child.name}`] : [];
    }));
    if ([...incoming].some((branch) => outside.some((row) => estaDentroDe(row.ubicacion, branch)))) {
      throw new Error("Un subnivel ya existe en el destino. Elige otro lugar para evitar combinarlos.");
    }
  }
  const cambios = affected.map((row) => ({
    id: row.id, nombre: row.nombre_equipo, antes: row.ubicacion!,
    despues: remapearUbicacion(row.ubicacion!, origen, destino),
  }));
  // Un alias del origen no es un cambio si todas las rutas guardadas ya coinciden.
  if (operation.tipo === "renombrar" && cambios.every((change) => change.antes === change.despues)) {
    throw new Error("El lugar ya tiene ese nombre.");
  }
  if (operation.tipo === "eliminar" && cambios.some((change) => estaDentroDe(change.despues, origen))) {
    throw new Error("Los subniveles volverían a crear el lugar eliminado. Elige otro destino.");
  }
  return { origen, padre, destino, inventario, cambios, operacion: { ...operation } };
};

// La conexión del plugin puede cambiar entre llamadas. Una sola sentencia evita
// depender de BEGIN/COMMIT separados. El guard se materializa ANTES del primer
// cambio y compara ambos sentidos, incluyendo inserciones, borrados y NULL raw.
// Se asume el esquema de la app: triggers externos RAISE(FAIL/IGNORE) no están
// soportados; un ABORT sí revierte la sentencia completa.
const ACTUALIZAR = `WITH
  esperado AS MATERIALIZED (
    SELECT json_extract(value, '$.id') AS id, json_extract(value, '$.ubicacion') AS ubicacion
    FROM json_each(?)
  ),
  actual AS MATERIALIZED (SELECT id, ubicacion FROM inventario),
  guardia AS MATERIALIZED (
    SELECT NOT EXISTS (SELECT * FROM actual EXCEPT SELECT * FROM esperado)
       AND NOT EXISTS (SELECT * FROM esperado EXCEPT SELECT * FROM actual) AS valido
  ),
  cambios AS MATERIALIZED (
    SELECT json_extract(value, '$.id') AS id,
           json_extract(value, '$.antes') AS antes,
           json_extract(value, '$.despues') AS despues
    FROM json_each(?)
  )
UPDATE inventario
SET ubicacion = (SELECT despues FROM cambios WHERE cambios.id = inventario.id)
WHERE (SELECT valido FROM guardia) = 1
  AND id IN (SELECT id FROM cambios)
  AND ubicacion IS (SELECT antes FROM cambios WHERE cambios.id = inventario.id)`;

/** API pública y aislada de Tauri; preview/cancelar nunca ejecutan SQL de escritura. */
export const crearServicioReubicacion = (db: BaseReubicacion) => ({
  previsualizar: async (source: string, parent: string): Promise<PlanReubicacion> => {
    const rows = await db.select<FilaUbicacion[]>("SELECT id, nombre_equipo, ubicacion FROM inventario ORDER BY id");
    return planificar(rows, source, parent);
  },
  previsualizarCambio: async (source: string, operation: OperacionUbicacion): Promise<PlanCambioUbicacion> => {
    validarOperacion(operation);
    const rows = await db.select<FilaUbicacion[]>("SELECT id, nombre_equipo, ubicacion FROM inventario ORDER BY id");
    const plan = planificarCambio(rows, source, operation);
    previewsDeCambio.set(plan, JSON.stringify(plan));
    return plan;
  },
  aplicar: async (preview: PlanReubicacion, options: { confirmado: boolean; prueba: boolean }): Promise<void> => {
    if (options.prueba) throw new Error("Modo prueba: no se pueden reorganizar ubicaciones.");
    if (!options.confirmado) throw new Error("Confirma el cambio antes de guardar.");
    // Nunca usar una lista de cambios arbitraria proporcionada por el llamador.
    let plan: PlanReubicacion;
    if ("operacion" in preview || previewsDeCambio.has(preview)) {
      validarOperacion(preview.operacion!);
      if (previewsDeCambio.get(preview) !== JSON.stringify(preview)) throw new Error(INVALIDO);
      plan = planificarCambio(preview.inventario, preview.origen, preview.operacion!);
    } else {
      plan = planificar(preview.inventario, preview.origen, preview.padre);
    }
    if (plan.destino !== preview.destino || plan.padre !== preview.padre || JSON.stringify(plan.cambios) !== JSON.stringify(preview.cambios)) {
      throw new Error(INVALIDO);
    }
    let result: { rowsAffected: number };
    try {
      result = await db.execute(ACTUALIZAR, [
        JSON.stringify(plan.inventario.map(({ id, ubicacion }) => ({ id, ubicacion }))),
        JSON.stringify(plan.cambios),
      ]);
    } catch (error) {
      // Sin fallback: un runtime sin JSON/MATERIALIZED falla antes de mutar.
      throw new Error(`No se guardó la reorganización: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (result.rowsAffected === 0) throw new Error(OBSOLETO);
    if (result.rowsAffected !== plan.cambios.length) {
      throw new Error("No se pudo verificar el cambio completo. Recarga el inventario antes de continuar.");
    }
  },
});
