import { useId, useRef, useState } from "react";
import { agregarSubnivel, hijosDeUbicacion, rutaDeUbicacion } from "../utils/ubicaciones";
import { normalizarLugar } from "../utils/tomaFisica";

type Props = {
  locations: ReadonlyArray<string | null | undefined>;
  value: string;
  onNavigate: (path: string) => void;
  onAdd: (path: string) => void;
  onSelect: (path: string) => void;
};

/** Navegar y crear borradores no inicia el recorrido ni escribe en inventario. */
export function UbicacionSelector({ locations, value, onNavigate, onAdd, onSelect }: Props) {
  const id = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const path = normalizarLugar(value);
  const route = rutaDeUbicacion(path);
  const children = hijosDeUbicacion(locations, path);
  const current = route[route.length - 1]?.name;

  const navigate = (next: string) => {
    setAdding(false);
    setName("");
    setError("");
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
      </div>
      {children.length > 0 ? (
        <ul className="ubicacion-hijos" aria-label={current ? `Subniveles de ${current}` : "Ubicaciones"}>
          {children.map((child) => (
            <li key={child.path}>
              <button type="button" onClick={() => navigate(child.path)}>
                <span>{child.name}</span><span aria-hidden="true">→</span>
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="ubicacion-vacio">{path ? "No hay subniveles todavía. Puedes escanear aquí o agregar uno." : "Aún no hay lugares. Agrega el primero para comenzar."}</p>}

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
