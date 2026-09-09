import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { isTauri } from "@tauri-apps/api/core";
import { browserStorage, resolveVersionChange } from "../utils/updateHistory";
import type { VersionChange } from "../utils/updateHistory";

// Resolving consumes the change, so StrictMode's second mount would find nothing
// left to show. One resolution per webview, shared by every mount.
let pending: Promise<VersionChange | null> | null = null;
function readChange() {
  pending ??= getVersion().then(
    (version) => resolveVersionChange(browserStorage(), version),
    () => null,
  );
  return pending;
}

export function UpdateApplied() {
  const [change, setChange] = useState<VersionChange | null>(null);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (!isTauri()) return;
    let alive = true;
    void readChange().then((applied) => { if (alive) setChange(applied); });
    return () => { alive = false; };
  }, []);
  const applied = dismissed ? null : change;
  // Keep the live region mounted: the version resolves after the first render.
  return (
    <aside className="update-applied" aria-label="Resultado de la actualización" hidden={!applied}>
      <p role="status" aria-live="polite">
        {applied ? `Listo, la aplicación se actualizó. Venías de la versión ${applied.previous} y ahora estás usando la ${applied.current}.` : ""}
      </p>
      {applied?.notes ? (
        <details>
          <summary>Novedades de esta versión</summary>
          <pre className="update-notes">{applied.notes}</pre>
        </details>
      ) : null}
      {applied ? (
        <div className="update-actions">
          <button type="button" onClick={() => setDismissed(true)}>Entendido</button>
        </div>
      ) : null}
    </aside>
  );
}
