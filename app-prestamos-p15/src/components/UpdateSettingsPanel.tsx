import { useUpdates } from "../updates/updateContext";
import { isUpdateBusy } from "../utils/updateController";

export function UpdateSettingsPanel() {
  const { controller, state } = useUpdates();
  const unavailable = ["browser", "unsupported", "development"].includes(state.status);
  const installed = state.status === "installed" || state.error === "restart";
  const message = state.status === "browser"
    ? "La vista del navegador no puede actualizar la aplicación de escritorio."
    : state.status === "unsupported"
      ? "Por ahora solo se publican actualizaciones para Windows x64. Esta plataforma no está disponible."
      : state.status === "development"
        ? "Las actualizaciones están deshabilitadas en compilaciones de desarrollo."
        : state.status === "checking"
          ? "Buscando actualizaciones…"
          : state.status === "current"
            ? "No hay una versión más reciente disponible."
            : state.error === "check"
              ? "No se pudo consultar el servidor. Revisá la conexión y reintentá cuando tengas acceso a Internet."
              : installed
                ? "La actualización está instalada. Cerrá y abrí la aplicación; no hace falta volver a instalar."
                : state.version
                  ? `Versión ${state.version} disponible. ${state.status === "deferred" ? "La pospusiste por esta sesión; buscá manualmente para volver a verla." : "Revisá el aviso de actualización al inicio de la pantalla."}`
                  : "Buscamos al abrir la aplicación y cada 6 horas mientras permanece abierta.";
  return (
    <section className="panel update-settings" aria-labelledby="update-settings-heading">
      <h2 id="update-settings-heading">Actualizaciones</h2>
      <p role="status">{message}</p>
      <p>La búsqueda no descarga ni instala nada. Windows cerrará la aplicación solo después de tu confirmación y la descarga; guardá tu trabajo antes de actualizar.</p>
      <div className="update-actions">
        <button type="button" disabled={unavailable || installed || isUpdateBusy(state)} onClick={() => void controller.check(true)}>
          {state.status === "checking" ? "Buscando…" : "Buscar actualizaciones"}
        </button>
      </div>
    </section>
  );
}
