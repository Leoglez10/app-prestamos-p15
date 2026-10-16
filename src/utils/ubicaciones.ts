import { estaDentroDe, normalizarLugar } from "./tomaFisica.ts";

type LocationNode = { name: string; path: string };
type Locations = ReadonlyArray<string | null | undefined>;
const segments = (path: string) => normalizarLugar(path).split(" / ").filter(Boolean);
const keyOf = (path: string) => normalizarLugar(path).toLocaleLowerCase();

/** Solo el siguiente nivel, aunque el inventario solo tenga hojas profundas. */
export const hijosDeUbicacion = (locations: Locations, parent: string): LocationNode[] => {
  const prefix = segments(parent);
  const children = new Map<string, LocationNode>();
  for (const location of locations) {
    const parts = segments(location ?? "");
    if (parts.length <= prefix.length || !prefix.every(
      (part, i) => keyOf(part) === keyOf(parts[i])
    )) continue;
    const name = parts[prefix.length];
    const key = keyOf(name);
    if (!children.has(key)) children.set(key, { name, path: [...prefix, name].join(" / ") });
  }
  return [...children.values()].sort((a, b) => a.name.localeCompare(b.name, "es", { numeric: true }));
};

/** Busca dentro del nivel visible sin cambiar la ruta elegida. */
export const filtrarUbicaciones = (nodes: LocationNode[], search: string): LocationNode[] => {
  const query = search.trim().toLocaleLowerCase();
  return nodes.filter((node) => node.name.toLocaleLowerCase().includes(query));
};

/** Conserva los sufijos y no toca rutas fuera del subárbol. También sirve para borradores. */
export const remapearUbicacion = (path: string, source: string, destination: string): string => {
  if (!estaDentroDe(path, source)) return path;
  return [...segments(destination), ...segments(path).slice(segments(source).length)].join(" / ");
};

/** Al quitar un prefijo, un borrador no debe volver a crear el lugar eliminado. */
export const remapearBorradores = (paths: string[], source: string, destination: string, removed = false): string[] =>
  paths.map((path) => remapearUbicacion(path, source, destination))
    .filter((path) => !removed || !estaDentroDe(path, source));

export const seleccionTrasCambio = (path: string, source: string, destination: string, removed = false): string => {
  const mapped = estaDentroDe(path, source) ? remapearUbicacion(path, source, destination) : destination;
  return removed && estaDentroDe(mapped, source) ? destination : mapped;
};

export const rutaDeUbicacion = (path: string): LocationNode[] => {
  const parts = segments(path);
  return parts.map((name, i) => ({ name, path: parts.slice(0, i + 1).join(" / ") }));
};

/** Un alta agrega un nombre, nunca una ruta completa ni un hermano duplicado. */
export const agregarSubnivel = (
  locations: Locations,
  parent: string,
  name: string
): { path: string | null; error: string } => {
  if (!name.trim()) return { path: null, error: "Escribe el nombre del lugar." };
  if (name.includes("/")) return { path: null, error: "Escribe solo un nombre, sin /; agrega cada nivel por separado." };
  const clean = normalizarLugar(name);
  if (hijosDeUbicacion(locations, parent).some((child) => keyOf(child.name) === keyOf(clean))) {
    return { path: null, error: "Ese lugar ya existe en este nivel. Elígelo en la lista." };
  }
  return { path: [...segments(parent), clean].join(" / "), error: "" };
};
