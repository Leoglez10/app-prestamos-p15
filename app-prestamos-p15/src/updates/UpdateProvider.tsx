import { useEffect } from "react";
import type { ReactNode } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { createUpdateController } from "../utils/updateController";
import type { UpdateReadiness } from "../utils/updateController";
import { UpdateContext } from "./updateContext";

// One controller per webview, not per render or route. Imports alone perform no IPC.
const controller = createUpdateController({
  isDesktop: isTauri,
  readiness: () => invoke<UpdateReadiness>("get_update_readiness"),
  async check() {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check({ timeout: 30_000 });
    if (!update) return null;
    return {
      version: update.version,
      body: update.body,
      downloadAndInstall: (onEvent) => update.downloadAndInstall(onEvent, {
        timeout: 120_000,
        restartAfterInstall: false,
      }),
      close: () => update.close(),
    };
  },
  async relaunch() {
    const { relaunch } = await import("@tauri-apps/plugin-process");
    await relaunch();
  },
});

export function UpdateProvider({ children }: { children: ReactNode }) {
  useEffect(() => controller.attach(), []);
  return <UpdateContext.Provider value={controller}>{children}</UpdateContext.Provider>;
}
