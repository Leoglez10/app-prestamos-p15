import type { CSSProperties } from "react";
import type { VersionChange } from "../utils/updateHistory";
import { getSpecialAnnouncement } from "../updates/specialAnnouncements";
import { ReleaseNotes } from "./ReleaseNotes";
import "./UpdateAppliedCard.css";

export function UpdateAppliedCard({ change, onDismiss }: {
  change: VersionChange | null;
  onDismiss: () => void;
}) {
  const greeting = getSpecialAnnouncement(change);
  return (
    <aside
      className={`update-applied${greeting ? " update-greeting" : ""}`}
      aria-label="Resultado de la actualización"
      hidden={!change}
    >
      {greeting ? (
        <div className="update-greeting-confetti" aria-hidden="true">
          {Array.from({ length: 12 }, (_, index) => (
            <span key={index} style={{
              "--piece": index,
              "--drift": `${index % 2 ? -32 : 32}px`,
            } as CSSProperties} />
          ))}
        </div>
      ) : null}
      <div className="update-greeting-content">
        {/* Stay nonmodal: never move focus or cover the staff's work. */}
        <div role="status" aria-live="polite" aria-atomic="true">
          {greeting ? (
            <>
              <p className="update-greeting-eyebrow">UNA NOTA PARA USTEDES</p>
              <h2 className="update-greeting-title">
                <span className="update-greeting-wave" aria-hidden="true">👋</span>
                {greeting.title}
              </h2>
              <p className="update-greeting-message">{greeting.message}</p>
              {greeting.signature ? <p className="update-greeting-signature">Con aprecio, {greeting.signature}</p> : null}
            </>
          ) : null}
          <p className={greeting ? "update-greeting-version" : undefined}>
            {change ? `Listo, la aplicación se actualizó. Venías de la versión ${change.previous} y ahora estás usando la ${change.current}.` : ""}
          </p>
        </div>
        {change?.notes ? <ReleaseNotes notes={change.notes} /> : null}
        {change ? (
          <div className="update-actions">
            <button type="button" onClick={onDismiss}>{greeting ? "¡Gracias!" : "Entendido"}</button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
