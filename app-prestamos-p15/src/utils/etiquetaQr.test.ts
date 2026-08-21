import test from "node:test";
import assert from "node:assert/strict";
import { codigoDeEquipo, equipoDesdeCodigo } from "./etiquetaQr.ts";

test("el código y su lectura son simétricos", () => {
  assert.equal(codigoDeEquipo(42), "P15-42");
  assert.equal(equipoDesdeCodigo("P15-42"), 42);
});

test("tolera espacios y minúsculas de un lector real", () => {
  assert.equal(equipoDesdeCodigo("  p15-7 "), 7);
});

test("rechaza cualquier QR ajeno", () => {
  assert.equal(equipoDesdeCodigo("https://ejemplo.com"), null);
  assert.equal(equipoDesdeCodigo("P15-"), null);
  assert.equal(equipoDesdeCodigo("P15-abc"), null);
  assert.equal(equipoDesdeCodigo("P15-0"), null);
  assert.equal(equipoDesdeCodigo("P15-1.5"), null);
});
