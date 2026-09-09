export const UPDATE_INTERVAL_MS = 6 * 60 * 60 * 1000;
export type UpdateReadiness = "ready" | "unsupported" | "development";
export type UpdateProgress =
  | { event: "Started"; data: { contentLength?: number } }
  | { event: "Progress"; data: { chunkLength: number } }
  | { event: "Finished" };
export interface UpdateResource {
  version: string;
  body?: string;
  downloadAndInstall(onEvent: (event: UpdateProgress) => void): Promise<void>;
  close(): Promise<void>;
}
export interface UpdateState {
  status: "idle" | "browser" | "unsupported" | "development" | "checking" | "current"
    | "available" | "deferred" | "confirming" | "downloading" | "installing"
    | "installed" | "restarting" | "error";
  version?: string;
  notes?: string;
  received: number;
  total?: number;
  notice: boolean;
  error?: "check" | "install" | "restart";
}
interface UpdateDependencies {
  isDesktop(): boolean;
  readiness(): Promise<UpdateReadiness>;
  check(): Promise<UpdateResource | null>;
  relaunch(): Promise<void>;
  schedule?: (callback: () => void, milliseconds: number) => () => void;
}
export const isUpdateBusy = (state: UpdateState) =>
  ["checking", "confirming", "downloading", "installing", "restarting"].includes(state.status);

export function createUpdateController(deps: UpdateDependencies) {
  let state: UpdateState = { status: "idle", received: 0, notice: false };
  const listeners = new Set<() => void>();
  const deferred = new Set<string>();
  let resource: UpdateResource | null = null;
  let flight: Promise<void> | null = null;
  let manualRequest = false;
  let generation = 0;
  let owners = 0;
  let started = false;
  let stopTimer: (() => void) | undefined;
  let installed = false;
  let operation = false;
  const schedule = deps.schedule ?? ((callback, milliseconds) => {
    const timer = setInterval(callback, milliseconds);
    return () => clearInterval(timer);
  });
  const publish = (patch: Partial<UpdateState>) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };
  const close = (update: UpdateResource | null) => { void update?.close().catch(() => {}); };
  function retire() {
    // Native installation cannot be cancelled by unmounting React. Keep its lock
    // and resource until it settles, including across a real remount.
    if (owners !== 0 || operation) return;
    generation++;
    flight = null;
    started = false;
    close(resource);
    resource = null;
    publish({ status: installed ? "installed" : "idle", notice: false, error: undefined });
  }

  function check(manual = false): Promise<void> {
    if (flight) {
      manualRequest ||= manual;
      return flight;
    }
    if (isUpdateBusy(state) || installed) return Promise.resolve();
    if (!deps.isDesktop()) {
      publish({ status: "browser", notice: false });
      return Promise.resolve();
    }
    // Do not replace the resource while the user is reading an offered update.
    if (!manual && state.notice && resource) return Promise.resolve();
    const epoch = generation;
    manualRequest = manual;
    publish({ status: "checking", error: undefined });
    const task = async () => {
      try {
        const readiness = await deps.readiness();
        if (epoch !== generation) return;
        if (readiness !== "ready") {
          publish({ status: readiness, notice: false });
          return;
        }
        const next = await deps.check();
        if (epoch !== generation) { close(next); return; }
        close(resource);
        resource = next;
        if (next) {
          const hidden = !manualRequest && deferred.has(next.version);
          publish({ status: hidden ? "deferred" : "available", version: next.version,
            notes: next.body, notice: !hidden, received: 0, total: undefined });
        } else {
          publish({ status: "current", version: undefined, notes: undefined, notice: false });
        }
      } catch {
        if (epoch === generation) publish({ status: "error", error: "check", notice: manualRequest });
      } finally {
        if (epoch === generation) flight = null;
      }
    };
    flight = task();
    return flight;
  }

  async function install(confirm: () => Promise<boolean>) {
    if (!resource || installed || isUpdateBusy(state) || state.status === "deferred") return;
    const update = resource;
    const epoch = generation;
    operation = true;
    publish({ status: "confirming", error: undefined, notice: true });
    try {
      const consent = await confirm();
      if (epoch !== generation) return;
      if (!consent || (started && owners === 0)) { publish({ status: "available" }); return; }
      publish({ status: "downloading", received: 0, total: undefined });
      await update.downloadAndInstall((event) => {
        if (epoch !== generation || state.status !== "downloading") return;
        if (event.event === "Started") {
          const length = event.data.contentLength;
          publish({ total: length && length > 0 ? length : undefined, received: 0 });
        } else if (event.event === "Progress") {
          publish({ received: state.received + Math.max(0, event.data.chunkLength) });
        } else {
          publish({ status: "installing" });
        }
      });
      // Windows normally exits inside the plugin. If it returns, never install twice.
      installed = true;
      if (epoch === generation) {
        resource = null;
        publish({ status: "installed", error: undefined });
      }
      close(update);
    } catch {
      if (epoch === generation) publish({ status: "error", error: "install", notice: true });
    } finally {
      operation = false;
      if (started && owners === 0) retire();
    }
  }

  async function restart(confirm: () => Promise<boolean>) {
    if (!installed || isUpdateBusy(state)) return;
    operation = true;
    publish({ status: "confirming", error: undefined });
    try {
      if (!(await confirm()) || (started && owners === 0)) { publish({ status: "installed" }); return; }
      publish({ status: "restarting" });
      await deps.relaunch();
      publish({ status: "installed" });
    } catch {
      publish({ status: "error", error: "restart", notice: true });
    } finally {
      operation = false;
      if (started && owners === 0) retire();
    }
  }

  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    attach() {
      owners++;
      if (!started) { started = true; void check(); }
      if (!stopTimer && deps.isDesktop()) stopTimer = schedule(() => { void check(); }, UPDATE_INTERVAL_MS);
      let detached = false;
      return () => {
        if (detached) return;
        detached = true;
        if (--owners !== 0) return;
        stopTimer?.();
        stopTimer = undefined;
        // React StrictMode reattaches synchronously. Only a real unmount retires resources.
        queueMicrotask(retire);
      };
    },
    check,
    install,
    restart,
    defer() {
      if (isUpdateBusy(state) || installed) return;
      if (state.version) deferred.add(state.version);
      publish({ status: resource ? "deferred" : "idle", notice: false });
    },
  };
}
export type UpdateController = ReturnType<typeof createUpdateController>;
