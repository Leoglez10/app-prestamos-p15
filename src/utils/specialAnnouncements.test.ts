import test from "node:test";
import assert from "node:assert/strict";
import { getSpecialAnnouncement } from "../updates/specialAnnouncements.ts";
import { notePendingUpdate, resolveVersionChange } from "./updateHistory.ts";

const change = { previous: "0.16.0", current: "0.16.1", notes: "- El PDF incluye ubicación." };

test("a selected release carries its own special greeting", () => {
  assert.deepEqual(getSpecialAnnouncement(change), {
    title: "¡Actualización lista!",
    message: "¡Saludos al equipo de cómputo! :) Gracias por todo lo que hacen cada día.",
    signature: "Leo",
  });
});

test("a release without a greeting keeps the ordinary notice", () => {
  assert.equal(getSpecialAnnouncement({ ...change, current: "0.16.2" }), null);
  assert.equal(getSpecialAnnouncement({ ...change, current: "toString" }), null);
  assert.equal(getSpecialAnnouncement(null), null);
});

test("the greeting appears only on a real version change, not first install or next launch", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
  assert.equal(getSpecialAnnouncement(resolveVersionChange(storage, "0.16.1")), null);
  values.clear();
  resolveVersionChange(storage, "0.16.0");
  notePendingUpdate(storage, "0.16.1", change.notes);
  const applied = resolveVersionChange(storage, "0.16.1");
  assert.deepEqual(applied, change);
  assert.ok(getSpecialAnnouncement(applied));
  assert.equal(getSpecialAnnouncement(resolveVersionChange(storage, "0.16.1")), null);
  const next = resolveVersionChange(storage, "0.16.2");
  assert.equal(getSpecialAnnouncement(next), null);
  assert.equal(next?.notes, undefined);
});
