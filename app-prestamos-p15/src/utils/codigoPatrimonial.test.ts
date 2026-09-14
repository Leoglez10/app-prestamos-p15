import test from "node:test";
import assert from "node:assert/strict";
import {
  clasificarCodigoEscaneado,
  normalizarCodigoPatrimonial,
  normalizarNumSerie,
} from "./codigoPatrimonial.ts";

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

test("un código con letras es un número de serie y conserva todo menos el ruido", () => {
  assert.deepEqual(clasificarCodigoEscaneado("  mxl3322dp2\n"), { tipo: "serie", valor: "MXL3322DP2" });
  assert.deepEqual(clasificarCodigoEscaneado("*SN-00A12*"), { tipo: "serie", valor: "SN-00A12" });
});

test("un código solo de dígitos se toma como ID de Patrimonio", () => {
  assert.deepEqual(clasificarCodigoEscaneado("*3382871*"), { tipo: "patrimonial", valor: "3382871" });
  assert.deepEqual(clasificarCodigoEscaneado("0033871"), { tipo: "patrimonial", valor: "0033871" });
});

test("la serie nunca pasa por el filtro de dígitos", () => {
  // Con el normalizador de Patrimonio esto quedaría en "1234" y chocaría con otro equipo.
  assert.deepEqual(clasificarCodigoEscaneado("AB-12-34"), { tipo: "serie", valor: "AB-12-34" });
});

test("clasificar devuelve null cuando no hay nada que leer", () => {
  assert.equal(clasificarCodigoEscaneado(""), null);
  assert.equal(clasificarCodigoEscaneado("  **  "), null);
  assert.equal(clasificarCodigoEscaneado("---"), null);
});

test("normalizarNumSerie quita espacios y delimitadores y pasa a mayúsculas", () => {
  assert.equal(normalizarNumSerie("\t*mxl3322dp2*\r\n"), "MXL3322DP2");
  assert.equal(normalizarNumSerie("   "), null);
});
