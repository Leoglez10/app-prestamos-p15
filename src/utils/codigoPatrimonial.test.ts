import test from "node:test";
import assert from "node:assert/strict";
import {
  clasificarCodigoEscaneado,
  resolverCodigoEscaneado,
  normalizarCodigoPatrimonial,
  normalizarNumSerie,
} from "./codigoPatrimonial.ts";

test("modo serie busca solo serie aunque el código coincida con otro ID", async () => {
  const llamadas: string[] = [];
  const resultado = await resolverCodigoEscaneado("*0033871*", "serie", {
    porId: async () => { llamadas.push("id"); return { id: 1 }; },
    porSerie: async (valor) => { llamadas.push(valor); return { equipo: { id: 2 }, coincidencias: 1 }; },
  });
  assert.deepEqual(llamadas, ["0033871"]);
  assert.deepEqual(resultado, {
    clasificado: { tipo: "serie", valor: "0033871" },
    equipo: { id: 2 }, coincidencias: 1, encontradoPorSerie: true,
  });
});

test("modo ID no consulta series cuando el ID es desconocido", async () => {
  const llamadas: string[] = [];
  const resultado = await resolverCodigoEscaneado("*0033871*", "patrimonial", {
    porId: async (valor) => { llamadas.push(valor); return null; },
    porSerie: async () => { llamadas.push("serie"); return { equipo: { id: 2 }, coincidencias: 1 }; },
  });
  assert.deepEqual(llamadas, ["0033871"]);
  assert.deepEqual(resultado?.clasificado, { tipo: "patrimonial", valor: "0033871" });
  assert.equal(resultado?.equipo, null);
  assert.equal(resultado?.encontradoPorSerie, false);
});

test("modo automático conserva prioridad del ID y fallback a serie", async () => {
  for (const encontrado of [true, false]) {
    const llamadas: string[] = [];
    const resultado = await resolverCodigoEscaneado("0033871", "auto", {
      porId: async () => { llamadas.push("id"); return encontrado ? { id: 1 } : null; },
      porSerie: async () => { llamadas.push("serie"); return { equipo: { id: 2 }, coincidencias: 1 }; },
    });
    assert.deepEqual(llamadas, encontrado ? ["id"] : ["id", "serie"]);
    assert.equal(resultado?.equipo?.id, encontrado ? 1 : 2);
    assert.equal(resultado?.encontradoPorSerie, !encontrado);
  }
});

test("serie conserva letras, propaga desconocidos y rechaza coincidencias múltiples", async () => {
  for (const coincidencias of [0, 1, 2]) {
    const resultado = await resolverCodigoEscaneado(" *sn-00a12* ", "serie", {
      porId: async () => { assert.fail("No debe consultar ID"); },
      porSerie: async (valor) => {
        assert.equal(valor, "SN-00A12");
        return { equipo: { id: 2 }, coincidencias };
      },
    });
    assert.deepEqual(resultado?.clasificado, { tipo: "serie", valor: "SN-00A12" });
    assert.equal(resultado?.coincidencias, coincidencias);
    assert.deepEqual(resultado?.equipo, coincidencias === 1 ? { id: 2 } : null);
  }
});

test("no consulta inventario con entrada vacía o letras en modo ID", async () => {
  const consultas = {
    porId: async () => { assert.fail("No debe consultar ID"); },
    porSerie: async () => { assert.fail("No debe consultar serie"); },
  };
  assert.equal(await resolverCodigoEscaneado(" ** ", "serie", consultas), null);
  assert.equal(await resolverCodigoEscaneado("SN-123", "patrimonial", consultas), null);
});

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
