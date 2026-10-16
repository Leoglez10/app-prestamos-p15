import { createContext, useContext, useSyncExternalStore } from "react";
import type { UpdateController } from "../utils/updateController";

export const UpdateContext = createContext<UpdateController | null>(null);

export function useUpdates() {
  const controller = useContext(UpdateContext);
  if (!controller) throw new Error("UpdateProvider is required");
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  return { controller, state };
}
