import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";

/** Canonical project URLs, so no screen has to hardcode the repository name. */
export const REPO_URL = "https://github.com/Leoglez10/app-prestamos-p15";
export const REPORTES_URL = `${REPO_URL}/issues`;
export const NUEVO_REPORTE_URL = `${REPO_URL}/issues/new/choose`;

/** The subset of a mouse event that decides who owns a link click. */
type Clic = {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
};

/**
 * Only a plain left click belongs to the app. With a modifier (new tab, new
 * window, download) or with the middle button the reader is asking the browser
 * for something else, so the app must not swallow the event.
 */
export function esClicSimple(event: Clic): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

/**
 * Sends an external URL to the system browser and reports whether it worked.
 *
 * Inside Tauri the webview cannot navigate out on its own, so the opener plugin
 * hands the URL to the operating system. Everywhere else (Vite in a normal tab)
 * a new browser tab is the equivalent behaviour.
 */
export async function abrirEnlace(url: string): Promise<boolean> {
  if (isTauri()) {
    try {
      await openUrl(url);
      return true;
    } catch {
      return false;
    }
  }
  if (typeof window === "undefined") return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
