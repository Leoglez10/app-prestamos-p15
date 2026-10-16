import { useEffect } from "react";
import { createBackup, getBackups, getSettings } from "./useInventory";
import { isBackupDue, parseIntervalHours } from "../utils/backupSchedule";

/** How often we re-check whether a backup is due while the app stays open. */
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

export const runAutoBackupIfDue = async (): Promise<void> => {
  const settings = await getSettings();
  if (settings.backup_auto_enabled === "false") {
    return;
  }

  const backups = await getBackups();
  const lastAuto = backups.find((backup) => backup.kind === "auto");
  const intervalHours = parseIntervalHours(settings.backup_auto_hours);

  if (!isBackupDue(lastAuto?.created_epoch ?? null, intervalHours)) {
    return;
  }

  await createBackup(true);
};

/**
 * Checks on mount and on a timer, so a kiosk machine that is never restarted
 * still produces backups.
 */
export const useAutoBackup = (): void => {
  useEffect(() => {
    let cancelled = false;

    const check = () => {
      // A failed backup must never break the UI: log it and retry on the next tick.
      void runAutoBackupIfDue().catch((error) => {
        if (!cancelled) {
          console.error("No se pudo crear el respaldo automático:", error);
        }
      });
    };

    check();
    const timer = window.setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);
};
