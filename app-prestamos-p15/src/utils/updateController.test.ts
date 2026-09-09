import { test } from "node:test";
import assert from "node:assert/strict";
import { createUpdateController, UPDATE_INTERVAL_MS } from "./updateController.ts";
import type {
  UpdateDependencies, UpdateProgress, UpdateReadiness, UpdateResource,
} from "./updateController.ts";

const tick = () => new Promise<void>((resolve) => queueMicrotask(resolve));
function pending<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fixture() {
  const calls = { check: 0, download: 0, close: 0, restart: 0, readiness: 0 };
  let progress: ((event: UpdateProgress) => void) | undefined;
  const update: UpdateResource = {
    version: "1.0.0", body: "<script>not HTML</script>",
    downloadAndInstall: async (listener) => { calls.download++; progress = listener; },
    close: async () => { calls.close++; },
  };
  const deps: UpdateDependencies = {
    isDesktop: () => true,
    readiness: async (): Promise<UpdateReadiness> => { calls.readiness++; return "ready"; },
    check: async (): Promise<UpdateResource | null> => { calls.check++; return update; },
    relaunch: async () => { calls.restart++; },
    schedule: (_callback: () => void, _milliseconds: number) => () => {},
  };
  return { calls, update, deps, progress: () => progress };
}

test("checking and deferring never download; only explicit consent installs", async () => {
  let downloads = 0;
  const controller = createUpdateController({
    isDesktop: () => true,
    readiness: async () => "ready",
    check: async () => ({
      version: "1.0.0", body: "<b>Plain text</b>",
      downloadAndInstall: async () => { downloads++; },
      close: async () => {},
    }),
    relaunch: async () => {},
  });
  await controller.check();
  assert.equal(controller.getSnapshot().status, "available");
  controller.defer();
  assert.equal(controller.getSnapshot().status, "deferred");
  assert.equal(downloads, 0);
  await controller.check(true);
  await controller.install(async () => false);
  assert.equal(downloads, 0);
  await controller.install(async () => true);
  assert.equal(downloads, 1);
  assert.equal(controller.getSnapshot().status, "installed");
});

test("no update is current; browser and unpublished/debug builds never call updater", async () => {
  const f = fixture();
  f.deps.check = async () => null;
  const current = createUpdateController(f.deps);
  await current.check(true);
  assert.equal(current.getSnapshot().status, "current");
  for (const readiness of ["unsupported", "development"] as const) {
    f.deps.readiness = async () => readiness;
    const controller = createUpdateController(f.deps);
    await controller.check(true);
    assert.equal(controller.getSnapshot().status, readiness);
  }
  f.deps.isDesktop = () => false;
  f.deps.readiness = async () => { throw new Error("no native calls in browser"); };
  const browser = createUpdateController(f.deps);
  await browser.check(true);
  assert.equal(browser.getSnapshot().status, "browser");
  assert.equal(f.calls.check, 0);
});

test("automatic failures stay quiet, manual concurrent request surfaces failure, retry succeeds", async () => {
  const f = fixture();
  f.deps.check = async () => { throw new Error("offline"); };
  const controller = createUpdateController(f.deps);
  await controller.check();
  assert.equal(controller.getSnapshot().notice, false);
  const automatic = controller.check();
  assert.equal(controller.check(true), automatic);
  await automatic;
  assert.equal(controller.getSnapshot().error, "check");
  assert.equal(controller.getSnapshot().notice, true);
  f.deps.check = async () => f.update;
  await controller.check(true);
  assert.equal(controller.getSnapshot().status, "available");
  assert.equal(controller.getSnapshot().notes, "<script>not HTML</script>");
});

test("deferred versions stay quiet for the session; manual check resurfaces them", async () => {
  const f = fixture();
  const controller = createUpdateController(f.deps);
  await controller.check();
  controller.defer();
  await controller.check();
  assert.equal(controller.getSnapshot().status, "deferred");
  assert.equal(controller.getSnapshot().notice, false);
  assert.equal(f.calls.download, 0);
  await controller.check(true);
  assert.equal(controller.getSnapshot().status, "available");
  assert.equal(controller.getSnapshot().notice, true);
  assert.equal(f.calls.close, 2);
});

test("StrictMode setup deduplicates startup, bounds cadence and cleans timer/resources", async () => {
  const f = fixture();
  let timer: (() => void) | undefined;
  let activeTimers = 0;
  f.deps.schedule = (callback, delay) => {
    assert.equal(delay, UPDATE_INTERVAL_MS);
    timer = callback;
    activeTimers++;
    return () => { activeTimers--; };
  };
  const controller = createUpdateController(f.deps);
  const detach = controller.attach();
  detach();
  const detachAgain = controller.attach();
  await controller.check();
  assert.equal(f.calls.check, 1);
  assert.equal(activeTimers, 1);
  controller.defer();
  timer!();
  await controller.check();
  assert.equal(f.calls.check, 2);
  detachAgain();
  detachAgain();
  await tick();
  assert.equal(activeTimers, 0);
  assert.equal(f.calls.close, 2);
});

test("a retired check cannot overwrite a newer mount and closes its late resource", async () => {
  const f = fixture();
  const old = pending<UpdateResource | null>();
  f.deps.check = () => old.promise;
  const controller = createUpdateController(f.deps);
  const detach = controller.attach();
  await tick();
  detach();
  await tick();
  f.deps.check = async () => null;
  const detachNew = controller.attach();
  await controller.check();
  assert.equal(controller.getSnapshot().status, "current");
  old.resolve(f.update);
  await tick();
  assert.equal(controller.getSnapshot().status, "current");
  assert.equal(f.calls.close, 1);
  detachNew();
  await tick();
});

test("consent, download and install each block repeated check/install; progress supports unknown length", async () => {
  const f = fixture();
  const consent = pending<boolean>();
  const download = pending<void>();
  let onProgress!: (event: UpdateProgress) => void;
  f.update.downloadAndInstall = async (listener) => {
    f.calls.download++;
    onProgress = listener;
    await download.promise;
  };
  const controller = createUpdateController(f.deps);
  await controller.check();
  const installing = controller.install(() => consent.promise);
  await controller.install(async () => true);
  await controller.check(true);
  assert.equal(f.calls.check, 1);
  assert.equal(f.calls.download, 0);
  consent.resolve(true);
  await tick();
  onProgress({ event: "Started", data: {} });
  onProgress({ event: "Progress", data: { chunkLength: 10 } });
  assert.equal(controller.getSnapshot().received, 10);
  assert.equal(controller.getSnapshot().total, undefined);
  onProgress({ event: "Started", data: { contentLength: 100 } });
  onProgress({ event: "Progress", data: { chunkLength: 50 } });
  assert.equal(controller.getSnapshot().received, 50);
  assert.equal(controller.getSnapshot().total, 100);
  onProgress({ event: "Finished" });
  assert.equal(controller.getSnapshot().status, "installing");
  await controller.install(async () => true);
  await controller.check(true);
  controller.defer();
  assert.equal(controller.getSnapshot().status, "installing");
  download.resolve();
  await installing;
  onProgress({ event: "Progress", data: { chunkLength: 999 } });
  assert.equal(controller.getSnapshot().received, 50);
  assert.equal(f.calls.download, 1);
  assert.equal(f.calls.restart, 0);
});

for (const failure of ["signature mismatch", "download interrupted", "installer failed"]) {
  test(`${failure} is retryable only with renewed consent`, async () => {
    const f = fixture();
    f.update.downloadAndInstall = async () => { f.calls.download++; throw new Error(failure); };
    const controller = createUpdateController(f.deps);
    await controller.check();
    await controller.install(async () => true);
    assert.equal(controller.getSnapshot().error, "install");
    assert.equal(f.calls.restart, 0);
    await controller.install(async () => false);
    assert.equal(f.calls.download, 1);
    f.update.downloadAndInstall = async () => { f.calls.download++; };
    await controller.install(async () => true);
    assert.equal(controller.getSnapshot().status, "installed");
    assert.equal(f.calls.download, 2);
  });
}

test("remount during a native installation cannot start another operation", async () => {
  const f = fixture();
  const download = pending<void>();
  f.update.downloadAndInstall = async () => { f.calls.download++; await download.promise; };
  const controller = createUpdateController(f.deps);
  const detach = controller.attach();
  await controller.check();
  const installing = controller.install(async () => true);
  await tick();
  detach();
  await tick();
  const detachNew = controller.attach();
  await controller.check(true);
  assert.equal(controller.getSnapshot().status, "downloading");
  assert.equal(f.calls.check, 1);
  download.resolve();
  await installing;
  assert.equal(controller.getSnapshot().status, "installed");
  detachNew();
  await tick();
  assert.equal(f.calls.close, 1);
});

test("only consent records the pending update, and a broken recorder cannot stop it", async () => {
  const f = fixture();
  const consents: Array<[string, string | undefined]> = [];
  f.deps.onInstallConsent = (version: string, notes?: string) => { consents.push([version, notes]); };
  const controller = createUpdateController(f.deps);
  await controller.check();
  await controller.install(async () => false);
  assert.deepEqual(consents, []);
  await controller.install(async () => true);
  assert.deepEqual(consents, [["1.0.0", "<script>not HTML</script>"]]);
  assert.equal(f.calls.download, 1);

  const broken = fixture();
  broken.deps.onInstallConsent = () => { throw new Error("storage unavailable"); };
  const resilient = createUpdateController(broken.deps);
  await resilient.check();
  await resilient.install(async () => true);
  assert.equal(resilient.getSnapshot().status, "installed");
  assert.equal(broken.calls.download, 1);
});

test("failed restart is retryable but can never reinstall or recheck", async () => {
  const f = fixture();
  f.deps.relaunch = async () => { f.calls.restart++; throw new Error("restart failed"); };
  const controller = createUpdateController(f.deps);
  await controller.check();
  await controller.install(async () => true);
  await controller.restart(async () => false);
  assert.equal(f.calls.restart, 0);
  await controller.restart(async () => true);
  assert.equal(controller.getSnapshot().error, "restart");
  await controller.install(async () => true);
  await controller.check(true);
  assert.equal(f.calls.download, 1);
  assert.equal(f.calls.check, 1);
  f.deps.relaunch = async () => { f.calls.restart++; };
  await controller.restart(async () => true);
  assert.equal(f.calls.restart, 2);
});
