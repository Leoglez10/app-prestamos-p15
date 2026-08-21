/**
 * Pure scheduling rules for automatic backups.
 *
 * Kept free of React and Tauri imports so it can be checked with
 * `node --test src/utils/backupSchedule.test.ts` (no test framework needed).
 */

export const DEFAULT_INTERVAL_HOURS = 12;
export const MIN_INTERVAL_HOURS = 1;
export const MAX_INTERVAL_HOURS = 24 * 7;

export const BACKUP_INTERVAL_OPTIONS = [
  { value: "6", label: "Cada 6 horas" },
  { value: "12", label: "Cada 12 horas" },
  { value: "24", label: "Una vez al día" },
  { value: "168", label: "Una vez por semana" },
];

/** Clamp whatever is stored in app_settings into a usable number of hours. */
export const parseIntervalHours = (raw: string | undefined | null): number => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_INTERVAL_HOURS;
  }
  return Math.min(Math.max(parsed, MIN_INTERVAL_HOURS), MAX_INTERVAL_HOURS);
};

/**
 * A backup is due when there is no previous automatic backup, or when the last
 * one is older than the configured interval.
 */
export const isBackupDue = (
  lastBackupEpochSeconds: number | null,
  intervalHours: number,
  now = Date.now(),
): boolean => {
  if (lastBackupEpochSeconds === null) {
    return true;
  }
  return now - lastBackupEpochSeconds * 1000 >= intervalHours * 60 * 60 * 1000;
};
