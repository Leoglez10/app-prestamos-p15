import { useEffect, useId, useMemo, useRef, useState } from "react";
import { estaDentroDe, normalizarLugar } from "../utils/tomaFisica";
import { rutaDeUbicacion } from "../utils/ubicaciones";
import type { AccionUbicacion, OperacionUbicacion, PlanCambioUbicacion, PlanReubicacion } from "../utils/reubicarUbicacion";

type Props = {
  origen: string;
  accion?: AccionUbicacion;
  locations: ReadonlyArray<string | null | undefined>;
  practice: boolean;
  onPreview: (origen: string, padre: string) => Promise<PlanReubicacion>;
  onPreviewCambio?: (origen: string, operacion: OperacionUbicacion) => Promise<PlanCambioUbicacion>;
  onApply: (plan: PlanReubicacion) => Promise<void>;
  onClose: () => void;
};

/** Dos pasos explícitos: leer la vista previa nunca autoriza guardarla. */
export function ReubicarUbicacionDialog({ origen, accion = "reubicar", locations, practice, onPreview, onPreviewCambio, onApply, onClose }: Props) {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const busyRef = useRef(false);
  const route = rutaDeUbicacion(origen);
  const [nombre, setNombre] = useState(route[route.length - 1]?.name ?? "");
  const labels = {
    reubicar: { title: "Cambiar de ubicación padre", confirm: "Confirmar y guardar cambio de padre" },
    renombrar: { title: "Renombrar lugar", confirm: "Confirmar y guardar nuevo nombre" },
    eliminar: { title: "Eliminar lugar y trasladar su contenido", confirm: "Confirmar traslado y eliminar lugar" },
  }[accion];
  const [plan, setPlan] = useState<PlanReubicacion | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const parents = useMemo(() => {
    const nodes = new Map<string, string>();
    for (const location of locations) {
      for (const node of rutaDeUbicacion(location ?? "")) {
        if (!estaDentroDe(node.path, origen)) {
          const key = node.path.toLocaleLowerCase();
          if (!nodes.has(key)) nodes.set(key, node.path);
        }
      }
    }
    return [...nodes.values()].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
  }, [locations, origen]);
  const [padre, setPadre] = useState(() => {
    const current = route[route.length - 2]?.path.toLocaleLowerCase();
    return parents.find((path) => path.toLocaleLowerCase() === current) ?? "";
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
      else document.querySelector<HTMLElement>(".ubicacion-nivel h3")?.focus();
    };
  }, []);

  const run = async (save: boolean) => {
    if (busyRef.current || practice) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      if (save && plan) {
        await onApply(plan);
        onClose();
      } else {
        setPlan(null);
        if (accion === "reubicar") setPlan(await onPreview(origen, padre));
        else {
          if (!onPreviewCambio) throw new Error("No se pudo preparar la operación de ubicación.");
          const operation: OperacionUbicacion = accion === "renombrar"
            ? { tipo: "renombrar", nombre }
            : { tipo: "eliminar", destino: padre };
          setPlan(await onPreviewCambio(origen, operation));
        }
      }
    } catch (err) {
      setPlan(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <dialog ref={dialogRef} className="admin-dialog reubicar-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-help`} aria-busy={busy}
      onCancel={(event) => { event.preventDefault(); if (!busyRef.current) onClose(); }}>
      <div className="reubicar-contenido">
        <h2 id={`${id}-title`}>{labels.title}</h2>
        <p id={`${id}-help`}>{accion === "eliminar"
          ? "No se borrará ningún equipo. Elige a dónde trasladar su contenido: los equipos directos irán al destino y sus subniveles conservarán sus nombres."
          : "Se actualizarán las rutas de esta ubicación y sus subniveles, no sus revisiones ni otros datos."}</p>
        <p>Ubicación actual: <strong>{normalizarLugar(origen)}</strong></p>
        {accion === "renombrar" ? (
          <>
            <label htmlFor={`${id}-name`}>Nuevo nombre del lugar</label>
            <input id={`${id}-name`} autoFocus value={nombre} disabled={busy || practice}
              aria-invalid={!!error} aria-describedby={`${id}-name-help${error ? ` ${id}-error` : ""}`}
              onChange={(event) => { setNombre(event.target.value); setPlan(null); setError(""); }} />
            <small id={`${id}-name-help`}>Solo un nombre, sin /. El padre no cambia.</small>
          </>
        ) : (
          <>
            <label htmlFor={`${id}-parent`}>{accion === "eliminar" ? "Trasladar equipos y subniveles a…" : "Es subnivel de…"}</label>
            <select id={`${id}-parent`} autoFocus value={padre} disabled={busy || practice}
              aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
              onChange={(event) => { setPadre(event.target.value); setPlan(null); setError(""); }}>
              <option value="">{accion === "eliminar" ? "Elige un destino existente" : "Sin padre"}</option>
              {parents.map((path) => <option key={path} value={path}>{path}</option>)}
            </select>
          </>
        )}
        {practice && <p role="status">Modo prueba: no se pueden reorganizar ubicaciones.</p>}
        {error && <p id={`${id}-error`} className="feedback error" role="alert">{error} Revisa los datos y pulsa «Ver equipos afectados» para generar otra vista previa.</p>}
        {plan && (
          <section aria-label="Vista previa del cambio" className="reubicar-preview">
            <p><strong>{plan.origen}</strong> → <strong>{plan.destino}</strong></p>
            <h3>{plan.cambios.length} equipos afectados</h3>
            <ul>
              {plan.cambios.map((change) => (
                <li key={change.id}>
                  <strong>{change.nombre} · #{change.id}</strong>
                  <span>Antes: {change.antes}</span>
                  <span>Después: {change.despues}</span>
                </li>
              ))}
            </ul>
            <p>Este cambio se guarda en el inventario. Revisa los equipos antes de confirmar.</p>
          </section>
        )}
        {busy && <p role="status">{plan ? "Guardando cambio…" : "Preparando vista previa…"}</p>}
        <div className="reubicar-acciones">
          {plan
            ? <button type="button" disabled={busy || practice} onClick={() => void run(true)}>{labels.confirm}</button>
            : <button type="button" disabled={busy || practice} onClick={() => void run(false)}>Ver equipos afectados</button>}
          <button type="button" className="ghost" disabled={busy} onClick={() => { if (!busyRef.current) onClose(); }}>Cancelar</button>
        </div>
      </div>
    </dialog>
  );
}
