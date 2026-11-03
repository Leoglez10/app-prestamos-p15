import type { VersionChange } from "../utils/updateHistory.ts";

export type SpecialAnnouncement = {
  title: string;
  message: string;
  signature?: string;
};

// Optional, bundled text only. Add an entry for each release that needs a greeting.
const announcements: Readonly<Record<string, SpecialAnnouncement>> = {
  "0.16.1": {
    title: "¡Actualización lista!",
    message: "¡Saludos al equipo de cómputo! :) Gracias por todo lo que hacen cada día.",
    signature: "Leo",
  },
};

export function getSpecialAnnouncement(change: VersionChange | null): SpecialAnnouncement | null {
  if (!change || !Object.prototype.hasOwnProperty.call(announcements, change.current)) return null;
  return announcements[change.current];
}
