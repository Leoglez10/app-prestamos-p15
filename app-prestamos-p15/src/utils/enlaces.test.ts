import { test } from "node:test";
import assert from "node:assert/strict";

import { esClicSimple, REPORTES_URL, NUEVO_REPORTE_URL, REPO_URL } from "./enlaces.ts";

const clic = (extra: Partial<Parameters<typeof esClicSimple>[0]> = {}) => ({
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  defaultPrevented: false,
  ...extra,
});

test("un clic izquierdo sin modificadores lo maneja la app", () => {
  assert.equal(esClicSimple(clic()), true);
});

test("el clic del medio no se intercepta: el lector pidió otra cosa", () => {
  assert.equal(esClicSimple(clic({ button: 1 })), false);
});

test("con modificador el enlace conserva su comportamiento normal", () => {
  for (const modificador of ["metaKey", "ctrlKey", "shiftKey", "altKey"] as const) {
    assert.equal(esClicSimple(clic({ [modificador]: true })), false, modificador);
  }
});

test("un evento ya manejado no se vuelve a interceptar", () => {
  assert.equal(esClicSimple(clic({ defaultPrevented: true })), false);
});

test("las URLs cuelgan del repositorio, sin repetir el nombre a mano", () => {
  assert.equal(REPORTES_URL, `${REPO_URL}/issues`);
  assert.equal(NUEVO_REPORTE_URL, `${REPO_URL}/issues/new/choose`);
});
