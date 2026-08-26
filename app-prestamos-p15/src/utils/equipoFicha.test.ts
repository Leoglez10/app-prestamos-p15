import test from "node:test";
import assert from "node:assert/strict";
import { cambiosDeEquipo, esPrestableEfectivo, textoONulo } from "./equipoFicha.ts";

test("una clave ausente no llega al SQL", () => {
  // Es la regla que evita el bug: una pantalla que no conoce un campo no lo pisa.
  const cambios = cambiosDeEquipo({ nombre_equipo: "Laptop" });
  assert.deepEqual(Object.keys(cambios), ["nombre_equipo"]);
});

test("null sí borra la columna a propósito", () => {
  const cambios = cambiosDeEquipo({ marca: null });
  assert.deepEqual(cambios, { marca: null });
});

test("un objeto vacío no genera ningún cambio", () => {
  assert.deepEqual(cambiosDeEquipo({}), {});
});

test("el texto en blanco se guarda como NULL, no como cadena vacía", () => {
  assert.equal(cambiosDeEquipo({ marca: "   " }).marca, null);
  assert.equal(cambiosDeEquipo({ modelo: "" }).modelo, null);
});

test("el ID de Patrimonio pasa por el normalizador del lector", () => {
  assert.equal(cambiosDeEquipo({ id_patrimonial: "*3382871*" }).id_patrimonial, "3382871");
});

test("los ceros no se confunden con ausencia", () => {
  // es_prestable: 0 es un valor real. Filtrar por falsy lo perdería.
  const cambios = cambiosDeEquipo({ es_prestable: 0, es_granel: 0, stock_total: 0 });
  assert.deepEqual(cambios, { es_prestable: 0, es_granel: 0, stock_total: 0 });
});

test("recorta el nombre pero conserva los números tal cual", () => {
  const cambios = cambiosDeEquipo({ nombre_equipo: "  Laptop Dell  ", categoria_id: 3 });
  assert.equal(cambios.nombre_equipo, "Laptop Dell");
  assert.equal(cambios.categoria_id, 3);
});

test("ignora claves que no estén en la lista blanca", () => {
  // Lo que blinda el SQL armado a mano: nada de afuera se concatena.
  const cambios = cambiosDeEquipo({ "id = 1; DROP TABLE inventario; --": "x" } as never);
  assert.deepEqual(cambios, {});
});

test("textoONulo trata undefined y null igual que el vacío", () => {
  assert.equal(textoONulo(undefined), null);
  assert.equal(textoONulo(null), null);
  assert.equal(textoONulo(" Aula 12 "), "Aula 12");
});

test("solo es prestable si el equipo Y su categoria lo permiten", () => {
  // Apagar la categoria apaga sus equipos sin reescribir ni una fila de inventario.
  assert.equal(esPrestableEfectivo({ es_prestable: 1, categoria_es_prestable: 1 }), true);
  assert.equal(esPrestableEfectivo({ es_prestable: 1, categoria_es_prestable: 0 }), false);
  assert.equal(esPrestableEfectivo({ es_prestable: 0, categoria_es_prestable: 1 }), false);
});

test("sin dato de la categoria se asume que la categoria presta", () => {
  assert.equal(esPrestableEfectivo({ es_prestable: 1 }), true);
  assert.equal(esPrestableEfectivo({ es_prestable: 0 }), false);
});
