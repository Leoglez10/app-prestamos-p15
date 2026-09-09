import test from "node:test";
import assert from "node:assert/strict";
import { ESTADOS_FIJOS, etiquetaEstado, listaEstados, slugEstado } from "./estados.ts";

test("el slug sirve como columna, clase CSS y valor de <option>", () => {
  assert.equal(slugEstado("Para baja"), "para_baja");
  assert.equal(slugEstado("En resguardo"), "en_resguardo");
  assert.equal(slugEstado("  Préstamo Único / 2026 "), "prestamo_unico_2026");
});

test("un nombre sin letras ni numeros no deja slug que guardar", () => {
  assert.equal(slugEstado("   "), "");
  assert.equal(slugEstado("¿?"), "");
});

test("los fijos van primero y un personalizado no duplica uno que ya existe", () => {
  const lista = listaEstados([
    { valor: "baja", etiqueta: "Baja duplicada" },
    { valor: "comodato", etiqueta: "En comodato" },
  ]);

  assert.deepEqual(lista.slice(0, ESTADOS_FIJOS.length), ESTADOS_FIJOS);
  assert.equal(lista.filter((estado) => estado.valor === "baja").length, 1);
  assert.deepEqual(lista.at(-1), { valor: "comodato", etiqueta: "En comodato" });
});

test("la etiqueta traduce el slug que esta guardado en la columna", () => {
  assert.equal(etiquetaEstado("para_baja"), "Para baja");
  assert.equal(
    etiquetaEstado("comodato", [{ valor: "comodato", etiqueta: "En comodato" }]),
    "En comodato"
  );
});

test("un estado que ya no esta en el catalogo se sigue viendo", () => {
  // Se borró el personalizado pero quedaron filas con él: esconderlo dejaría la
  // celda de estado en blanco sin ninguna explicación.
  assert.equal(etiquetaEstado("en_comodato_viejo"), "En comodato viejo");
});
