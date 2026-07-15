// localStorage helpers for the admin session.
// Tauri webview supports localStorage natively; no Rust or plugin changes required.

import type { AdminUser, Session } from "./types";

const STORAGE_KEY = "p15_admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function isValidSessionShape(value: unknown): value is Session {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Session>;
  if (!candidate.admin || typeof candidate.admin !== "object") return false;
  const admin = candidate.admin as Partial<AdminUser>;
  if (
    typeof admin.id !== "number" ||
    typeof admin.codigo !== "string" ||
    typeof admin.nombre !== "string"
  ) {
    return false;
  }
  if (typeof candidate.loginAt !== "string" || typeof candidate.expiresAt !== "string") {
    return false;
  }
  return true;
}

export function isExpired(session: Session): boolean {
  const expiresAtMs = new Date(session.expiresAt).getTime();
  if (Number.isNaN(expiresAtMs)) return true;
  return expiresAtMs <= Date.now();
}

export function loadSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidSessionShape(parsed)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (isExpired(parsed)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    // Malformed JSON or storage disabled — clear and return null.
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore secondary failures
    }
    return null;
  }
}

export function saveSession(admin: AdminUser): Session {
  const loginAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const session: Session = { admin, loginAt, expiresAt };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage may be disabled (e.g. private mode); still return the session in memory.
  }
  return session;
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
