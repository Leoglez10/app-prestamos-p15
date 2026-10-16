import { test } from "node:test";
import assert from "node:assert/strict";
import { notePendingUpdate, resolveVersionChange } from "./updateHistory.ts";
import type { UpdateHistoryStorage } from "./updateHistory.ts";

function memory(seed: Record<string, string> = {}) {
  const values = new Map<string, string>(Object.entries(seed));
  const storage: UpdateHistoryStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
  return { storage, values };
}

test("a first run is an install, not an update, and a repeated launch says nothing", () => {
  const store = memory();
  assert.equal(resolveVersionChange(store.storage, "1.0.0"), null);
  assert.equal(resolveVersionChange(store.storage, "1.0.0"), null);
});

test("a version change reports both versions and surfaces the consented notes once", () => {
  const store = memory();
  resolveVersionChange(store.storage, "1.0.0");
  notePendingUpdate(store.storage, "1.1.0", "Se agregó el kiosko.");
  const change = resolveVersionChange(store.storage, "1.1.0");
  assert.deepEqual(change, { previous: "1.0.0", current: "1.1.0", notes: "Se agregó el kiosko." });
  // Consumed: a later change must not repeat the notes of an older release.
  notePendingUpdate(store.storage, "1.2.0");
  const next = resolveVersionChange(store.storage, "1.2.0");
  assert.deepEqual(next, { previous: "1.1.0", current: "1.2.0", notes: undefined });
});

test("notes from a different version are never shown", () => {
  const store = memory();
  resolveVersionChange(store.storage, "1.0.0");
  notePendingUpdate(store.storage, "1.1.0", "Notas que nunca se instalaron.");
  const change = resolveVersionChange(store.storage, "2.0.0");
  assert.deepEqual(change, { previous: "1.0.0", current: "2.0.0", notes: undefined });
});

test("a manual reinstall over a different version still reports the change", () => {
  const store = memory();
  resolveVersionChange(store.storage, "1.0.0");
  const change = resolveVersionChange(store.storage, "0.9.0");
  assert.deepEqual(change, { previous: "1.0.0", current: "0.9.0", notes: undefined });
});

test("a declined or failed install keeps its notes until that version really lands", () => {
  const store = memory();
  resolveVersionChange(store.storage, "1.0.0");
  notePendingUpdate(store.storage, "1.1.0", "Novedades reales.");
  assert.equal(resolveVersionChange(store.storage, "1.0.0"), null);
  const change = resolveVersionChange(store.storage, "1.1.0");
  assert.equal(change?.notes, "Novedades reales.");
});

test("corrupted notes degrade to a plain change instead of throwing", () => {
  const store = memory({
    "prestamos.update.lastSeenVersion": "1.0.0",
    "prestamos.update.pendingNotes": "{no es JSON",
  });
  assert.deepEqual(resolveVersionChange(store.storage, "1.1.0"), {
    previous: "1.0.0", current: "1.1.0", notes: undefined,
  });
  const wrongShape = memory({
    "prestamos.update.lastSeenVersion": "1.0.0",
    "prestamos.update.pendingNotes": JSON.stringify({ version: 7, notes: 9 }),
  });
  assert.equal(resolveVersionChange(wrongShape.storage, "1.1.0")?.notes, undefined);
});

test("unavailable or throwing storage never breaks startup", () => {
  const broken: UpdateHistoryStorage = {
    getItem: () => { throw new Error("access denied"); },
    setItem: () => { throw new Error("quota exceeded"); },
    removeItem: () => { throw new Error("access denied"); },
  };
  assert.equal(resolveVersionChange(broken, "1.1.0"), null);
  assert.doesNotThrow(() => notePendingUpdate(broken, "1.1.0", "Novedades."));
  assert.equal(resolveVersionChange(null, "1.1.0"), null);
  assert.doesNotThrow(() => notePendingUpdate(null, "1.1.0", "Novedades."));
});
