// Session badge showing who is currently authorized. Optional logout button.
// No timestamp — the simplified flow has no TTL to display.

import type { Session } from "./types";

export type SessionBadgeProps = {
  session: Session;
  onLogout?: () => void;
};

export function SessionBadge({ session, onLogout }: SessionBadgeProps) {
  return (
    <div className="session-badge" role="status" aria-live="polite">
      <div className="session-badge-text">
        <strong>Sesión:</strong> {session.admin.nombre}{" "}
        <code className="session-badge-code">({session.admin.codigo})</code>
      </div>
      {onLogout ? (
        <button type="button" className="ghost session-badge-logout" onClick={onLogout}>
          Cerrar sesión
        </button>
      ) : null}
    </div>
  );
}
