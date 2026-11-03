import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { isTauri } from "@tauri-apps/api/core";
import { browserStorage, resolveVersionChange } from "../utils/updateHistory";
import type { VersionChange } from "../utils/updateHistory";
import { UpdateAppliedCard } from "./UpdateAppliedCard";

// Resolving consumes the change, so StrictMode's second mount would find nothing
// left to show. One resolution per webview, shared by every mount.
let pending: Promise<VersionChange | null> | null = null;
// Home unmounts when you leave it, so "Entendido" has to outlive the component or the card returns.
let dismissedForSession = false;
function readChange() {
  pending ??= getVersion().then(
    (version) => resolveVersionChange(browserStorage(), version),
    () => null,
  );
  return pending;
}

export function UpdateApplied() {
  const [change, setChange] = useState<VersionChange | null>(null);
  const [dismissed, setDismissed] = useState(dismissedForSession);
  useEffect(() => {
    if (!isTauri()) return;
    let alive = true;
    void readChange().then((applied) => { if (alive) setChange(applied); });
    return () => { alive = false; };
  }, []);
  const applied = dismissed ? null : change;
  // Keep the live region mounted: the version resolves after the first render.
  return <UpdateAppliedCard change={applied} onDismiss={() => {
    dismissedForSession = true;
    setDismissed(true);
  }} />;
}
