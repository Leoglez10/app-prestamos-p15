import { useUpdates } from "../updates/updateContext";
import { isUpdateBusy } from "../utils/updateController";

function confirmExit(): Promise<boolean> {
  // Native <dialog> keeps keyboard focus contained without closing any existing form.
  const trigger = document.activeElement;
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "app-confirm";
    dialog.setAttribute("aria-label", "Confirmar actualización");
    const message = document.createElement("p");
    message.className = "app-confirm-message";
    message.id = "update-exit-warning";
    message.textContent = "La aplicación se cerrará. Guarda los cambios y termina los préstamos o formularios abiertos antes de continuar. ¿Deseas continuar ahora?";
    dialog.setAttribute("aria-describedby", message.id);
    const actions = document.createElement("div");
    actions.className = "app-confirm-actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "ghost";
    cancel.textContent = "Volver sin actualizar";
    const accept = document.createElement("button");
    accept.type = "button";
    accept.textContent = "Guardé mi trabajo, continuar";
    let consent = false;
    cancel.onclick = () => dialog.close();
    accept.onclick = () => { consent = true; dialog.close(); };
    dialog.addEventListener("close", () => {
      dialog.remove();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
      resolve(consent);
    }, { once: true });
    actions.append(cancel, accept);
    dialog.append(message, actions);
    document.body.append(dialog);
    dialog.showModal();
    cancel.focus();
  });
}

export function UpdateNotice() {
  const { controller, state } = useUpdates();
  const busy = isUpdateBusy(state);
  const restartOnly = state.status === "installed" || state.error === "restart" || state.status === "restarting";
  const progress = state.status === "downloading" || state.status === "installing";
  const message = state.error === "check"
    ? "No se pudo buscar la actualización. Revisa la conexión y vuelve a intentar."
    : state.error === "install"
      ? "No se pudo descargar, verificar o instalar la actualización. Puedes volver a intentar; si se repite, contacta al administrador."
      : state.error === "restart"
        ? "La actualización ya se instaló, pero no se pudo reiniciar. Cierra y abre la aplicación o vuelve a intentar el reinicio."
        : state.status === "downloading"
          ? "Descargando actualización… La aplicación se cerrará al terminar. No inicies nuevas operaciones."
          : state.status === "installing"
            ? "Verificando e instalando… Windows cerrará la aplicación para ejecutar el instalador."
            : restartOnly
              ? "Actualización instalada. Cierra y abre la aplicación para usar la nueva versión."
              : state.status === "confirming"
                ? "Esperando tu confirmación. Todavía no se inició una nueva operación."
                : `Versión ${state.version ?? "nueva"} disponible. No se descarga nada hasta que confirmes.`;

  // Keep the live region mounted: automatic checks never move keyboard focus.
  return (
    <aside className="update-notice" aria-label="Actualizaciones de la aplicación" hidden={!state.notice}>
      <p role="status" aria-live="polite">{state.notice ? message : ""}</p>
      {state.notes && !progress && !restartOnly ? (
        <details>
          <summary>Notas de la versión</summary>
          <pre className="update-notes">{state.notes}</pre>
        </details>
      ) : null}
      {progress ? (
        <div className="update-progress">
          <progress aria-label="Descarga de la actualización" max={state.total ?? 1}
            value={state.status === "downloading" && state.total ? Math.min(state.received, state.total) : undefined} />
          <span>{Math.round(state.received / 1024)} KB descargados{state.total ? ` de ${Math.round(state.total / 1024)} KB` : " · tamaño total desconocido"}</span>
        </div>
      ) : null}
      <div className="update-actions">
        {state.error === "check" ? (
          <button type="button" disabled={busy} onClick={() => void controller.check(true)}>Reintentar búsqueda</button>
        ) : restartOnly ? (
          <button type="button" disabled={busy} onClick={() => void controller.restart(confirmExit)}>Reiniciar aplicación</button>
        ) : (
          <button type="button" disabled={busy} onClick={() => void controller.install(confirmExit)}>
            {busy ? "Actualización en curso…" : state.error === "install" ? "Reintentar actualización…" : "Actualizar ahora…"}
          </button>
        )}
        {!restartOnly ? <button type="button" className="ghost" disabled={busy} onClick={() => controller.defer()}>Más tarde</button> : null}
      </div>
    </aside>
  );
}
