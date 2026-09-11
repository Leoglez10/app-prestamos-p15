import test from "node:test";
import assert from "node:assert/strict";
import { validarReporte, TITULO_MAX, DESCRIPCION_MAX } from "./reporteProblema.ts";

const base = { tipo: "bug", titulo: "El escáner no lee", descripcion: "Paso el código y no pasa nada." };

test("un reporte completo no tiene errores", () => {
  assert.equal(validarReporte(base), null);
});

test("la sugerencia también es un tipo válido", () => {
  assert.equal(validarReporte({ ...base, tipo: "sugerencia" }), null);
});

test("cualquier otro tipo se rechaza", () => {
  assert.equal(validarReporte({ ...base, tipo: "queja" }), "Elegí si es un problema o una sugerencia.");
});

test("el título en blanco no cuenta como título", () => {
  assert.equal(validarReporte({ ...base, titulo: "   " }), "Escribí un título corto que resuma el problema.");
});

test("el título justo en el límite pasa y uno más no", () => {
  assert.equal(validarReporte({ ...base, titulo: "a".repeat(TITULO_MAX) }), null);
  assert.equal(validarReporte({ ...base, titulo: "a".repeat(TITULO_MAX + 1) }), `El título no puede pasar de ${TITULO_MAX} caracteres.`);
});

test("la descripción vacía se rechaza", () => {
  assert.equal(validarReporte({ ...base, descripcion: "\n\n" }), "Contá qué pasó y qué esperabas que pasara.");
});

test("la descripción justo en el límite pasa y una más no", () => {
  assert.equal(validarReporte({ ...base, descripcion: "a".repeat(DESCRIPCION_MAX) }), null);
  assert.equal(validarReporte({ ...base, descripcion: "a".repeat(DESCRIPCION_MAX + 1) }), `La descripción no puede pasar de ${DESCRIPCION_MAX} caracteres.`);
});
