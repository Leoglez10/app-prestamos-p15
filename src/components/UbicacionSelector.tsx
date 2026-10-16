import { useId, useRef, useState } from "react";
import { agregarSubnivel, filtrarUbicaciones, hijosDeUbicacion, rutaDeUbicacion } from "../utils/ubicaciones";
import { estaDentroDe, normalizarLugar } from "../utils/tomaFisica";
import type { AccionUbicacion } from "../utils/reubicarUbicacion";

type Props = {
  locations: ReadonlyArray<string | null | undefined>;
  value: string;
  onNavigate: (path: string) => void;
  onAdd: (path: string) => void;
  onSelect: (path: string) => void;
  onReparent?: (path: string) => void;
  onManage?: (path: string, accion: AccionUbicacion) => void;
  persistedLocations?: ReadonlyArray<string | null | undefined>;
  practice?: boolean;
};

/** Navegar y crear borradores no inicia el recorrido ni escribe en inventario. */
export function UbicacionSelector({ locations, value, onNavigate, onAdd, onSelect, onReparent, onManage, persistedLocations = locations, practice = false }: Props) {
  const id = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const path = normalizarLugar(value);
  const route = rutaDeUbicacion(path);
  const children = hijosDeUbicacion(locations, path);
  const visible = filtrarUbicaciones(children, search);
  const current = route[route.length - 1]?.name;
  const isPersisted = (candidate: string) => persistedLocations.some((location) => estaDentroDe(location, candidate));
  const actions: Array<{ accion: AccionUbicacion; label: string }> = onManage
    ? [{ accion: "renombrar", label: "Renombrar" }, { accion: "reubicar", label: "Cambiar de padre…" }, { accion: "eliminar", label: "Eliminar lugar…" }]
    : [{ accion: "reubicar", label: "Cambiar de ubicación padre…" }];
  const locationActions = (candidate: string) => (onManage || onReparent) && isPersisted(candidate) ? (
    <details className="ubicacion-menu" onKeyDown={(event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.open = false;
      event.currentTarget.querySelector("summary")?.focus();
    }}>
      <summary aria-label={`Opciones de ${candidate}`}>⋯</summary>
      <div role="group" aria-label={`Acciones de ${candidate}`}>
        {actions.map(({ accion, label }) => (
          <button key={accion} type="button" disabled={practice} onClick={(event) => {
            const menu = event.currentTarget.closest("details");
            if (menu) {
              menu.open = false;
              menu.querySelector("summary")?.focus();
            }
            if (onManage) onManage(candidate, accion);
            else onReparent?.(candidate);
          }}>{label}</button>
        ))}
      </div>
    </details>
  ) : null;

  const navigate = (next: string) => {
    setAdding(false);
    setName("");
    setError("");
    setSearch("");
    onNavigate(next);
    headingRef.current?.focus();
  };
  const cancel = () => {
    setAdding(false);
    setName("");
    setError("");
    addRef.current?.focus();
  };

  return (
    <div className="ubicacion-selector">
      <nav aria-label="Ruta de ubicación" className="ubicacion-ruta">
        <ol>
          <li><button type="button" onClick={() => navigate("")} aria-current={!path ? "location" : undefined}>Todos los lugares</button></li>
          {route.map((node, i) => (
            <li key={node.path}>
              <span aria-hidden="true">/</span>
              <button type="button" onClick={() => navigate(node.path)} aria-current={i === route.length - 1 ? "location" : undefined}>{node.name}</button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="ubicacion-nivel">
        <span className="toma-etiqueta">{path ? "Estás eligiendo en" : "Elige una ubicación"}</span>
        <h3 ref={headingRef} tabIndex={-1}>{current ?? "Todos los lugares"}</h3>
        <p>Entra a un lugar para ver sus subniveles. Navegar no inicia el escaneo.</p>
        {path && locationActions(path)}
        {practice && (onManage || onReparent) && <small>Modo prueba: reorganizar ubicaciones está desactivado.</small>}
      </div>
      <div className="ubicacion-busqueda">
        <label htmlFor={`${id}-search`}>Buscar en este nivel</label>
        <input id={`${id}-search`} type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
        <small role="status">{visible.length} de {children.length} lugares</small>
      </div>
      {visible.length > 0 ? (
        <ul className="ubicacion-hijos" aria-label={current ? `Subniveles de ${current}` : "Ubicaciones"}>
          {visible.map((child) => (
            <li key={child.path}>
              <button type="button" onClick={() => navigate(child.path)}>
                <span>{child.name}</span><span aria-hidden="true">→</span>
              </button>
              {locationActions(child.path)}
            </li>
          ))}
        </ul>
      ) : <p className="ubicacion-vacio">{children.length ? "No hay coincidencias en este nivel. Prueba otro nombre." : path ? "No hay subniveles todavía. Puedes escanear aquí o agregar uno." : "Aún no hay lugares. Agrega el primero para comenzar."}</p>}

      <button ref={addRef} type="button" className="ghost ubicacion-agregar" aria-expanded={adding} aria-controls={`${id}-form`} onClick={() => {
        if (adding) cancel();
        else setAdding(true);
      }}>
        {path ? "+ Agregar subnivel" : "+ Agregar ubicación"}
      </button>
      {adding && (
        <form id={`${id}-form`} className="ubicacion-alta" onSubmit={(event) => {
          event.preventDefault();
          const result = agregarSubnivel(locations, path, name);
          if (!result.path) { setError(result.error); return; }
          onAdd(result.path);
          navigate(result.path);
        }} onKeyDown={(event) => {
          if (event.key === "Escape") { event.preventDefault(); cancel(); }
        }}>
          <label htmlFor={`${id}-name`}>{path ? "Nombre del subnivel" : "Nombre de la ubicación"}</label>
          <input id={`${id}-name`} value={name} autoFocus aria-invalid={!!error} aria-describedby={`${id}-help ${id}-error`} onChange={(event) => { setName(event.target.value); setError(""); }} />
          <small id={`${id}-help`}>Solo el nombre, sin /. Se agrega dentro de: {path || "Todos los lugares"}.</small>
          <p id={`${id}-error`} className="ubicacion-error" role="alert">{error}</p>
          <div className="ubicacion-alta-acciones">
            <button type="submit">Agregar</button>
            <button type="button" className="ghost" onClick={cancel}>Cancelar</button>
          </div>
        </form>
      )}
      <div className="ubicacion-escanear">
        <small>Ruta elegida: <strong>{path || "ninguna"}</strong></small>
        <button type="button" className="toma-cta" disabled={!path} onClick={() => { if (path) onSelect(path); }}>
          {current ? `Escanear aquí: ${current}` : "Elige un lugar para escanear"}
        </button>
        <small>Los lugares nuevos son borradores de esta sesión. Se guardan en el inventario al asignarlos a un equipo, no al navegar.</small>
      </div>
    </div>
  );
}
