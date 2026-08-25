import test from "node:test";
import assert from "node:assert/strict";
import { normalizarCodigoPatrimonial } from "./codigoPatrimonial.ts";

test("deja pasar el código pelón", () => {
  assert.equal(normalizarCodigoPatrimonial("3382871"), "3382871");
});

test("quita los delimitadores de Code 39", () => {
  assert.equal(normalizarCodigoPatrimonial("*3382871*"), "3382871");
});

test("quita el ruido que agrega la pistola", () => {
  assert.equal(normalizarCodigoPatrimonial("  3382871\n"), "3382871");
  assert.equal(normalizarCodigoPatrimonial("\t3382871\r\n"), "3382871");
});

test("acepta los IDs cortos que trae el archivo real", () => {
  // El Excel de Patrimonio tiene IDs de 5 a 7 dígitos: validar por ancho fijo
  // dejaría fuera equipos que existen.
  assert.equal(normalizarCodigoPatrimonial("90665"), "90665");
});

test("no convierte a número: conserva los ceros a la izquierda", () => {
  assert.equal(normalizarCodigoPatrimonial("0033871"), "0033871");
});

test("devuelve null cuando no hay ningún dígito", () => {
  assert.equal(normalizarCodigoPatrimonial(""), null);
  assert.equal(normalizarCodigoPatrimonial("   "), null);
  assert.equal(normalizarCodigoPatrimonial("SIN ETIQUETA"), null);
});
