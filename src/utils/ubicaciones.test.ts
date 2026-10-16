import test from "node:test";
import assert from "node:assert/strict";
import { agregarSubnivel, hijosDeUbicacion, rutaDeUbicacion, filtrarUbicaciones, remapearUbicacion, remapearBorradores, seleccionTrasCambio } from "./ubicaciones.ts";

test("filtra sin distinguir mayúsculas, conserva rutas y remapea solo segmentos del origen", () => {
  const children = hijosDeUbicacion(["SITE 1", "SITE 10", "Almacén"], "");
  assert.deepEqual(filtrarUbicaciones(children, " site 1 ").map((node) => node.path), ["SITE 1", "SITE 10"]);
  assert.deepEqual(filtrarUbicaciones(children, "nada"), []);
  assert.deepEqual(filtrarUbicaciones(children, " "), children);
  assert.equal(remapearUbicacion(" site 1 / Cajón / Nivel A ", "SITE 1", "SITE 2 / SITE 1"), "SITE 2 / SITE 1 / Cajón / Nivel A");
  assert.equal(remapearUbicacion("SITE 10", "SITE 1", "SITE 2 / SITE 1"), "SITE 10");
});

test("sesión remapea borradores y selección sin resucitar el prefijo eliminado", () => {
  const paths = ["A / X", "a / x / Nuevo", "A / X / X / Borrador", "A / XYZ", "B / Fijo"];
  assert.deepEqual(remapearBorradores(paths, "A / X", "A", true), ["A", "A / Nuevo", "A / XYZ", "B / Fijo"]);
  assert.equal(seleccionTrasCambio("A / X / X / Borrador", "A / X", "A", true), "A");
  assert.equal(seleccionTrasCambio("A / X / Nuevo", "A / X", "A", true), "A / Nuevo");
  assert.equal(seleccionTrasCambio("", "A / X", "A / Y"), "A / Y");
  assert.deepEqual(remapearBorradores(["A / X / Nuevo", "A / XYZ"], "A / X", "A / x"), ["A / x / Nuevo", "A / XYZ"]);
});

const locations = [
  " SITE 1/ Almacén / Anaquel 1 ",
  "site 1 / almacén / Anaquel 2",
  "SITE 1 / Oficina",
  "SITE 10 / Bodega",
  null,
  " / ",
];

test("infiere niveles inmediatos desde rutas profundas y elimina duplicados sin distinguir mayúsculas", () => {
  assert.deepEqual(hijosDeUbicacion(locations, ""), [
    { name: "SITE 1", path: "SITE 1" },
    { name: "SITE 10", path: "SITE 10" },
  ]);
  assert.deepEqual(hijosDeUbicacion(locations, " site 1 / "), [
    { name: "Almacén", path: "site 1 / Almacén" },
    { name: "Oficina", path: "site 1 / Oficina" },
  ]);
});

test("compara segmentos completos: SITE 1 no incluye SITE 10; una hoja no tiene hijos", () => {
  assert.deepEqual(hijosDeUbicacion(locations, "SITE 10"), [
    { name: "Bodega", path: "SITE 10 / Bodega" },
  ]);
  assert.deepEqual(hijosDeUbicacion(locations, "SITE 1 / Almacén / Anaquel 1"), []);
});

test("cada breadcrumb selecciona su ruta acumulada, normalizada y sin perder mayúsculas", () => {
  assert.deepEqual(rutaDeUbicacion(" / SITE 1// Almacén / Anaquel   1 / "), [
    { name: "SITE 1", path: "SITE 1" },
    { name: "Almacén", path: "SITE 1 / Almacén" },
    { name: "Anaquel 1", path: "SITE 1 / Almacén / Anaquel 1" },
  ]);
  assert.deepEqual(rutaDeUbicacion(""), []);
});

test("agrega un solo nombre normalizado bajo el padre o en la raíz", () => {
  assert.deepEqual(agregarSubnivel(locations, "SITE 1 / Almacén", " Anaquel   3 "), {
    path: "SITE 1 / Almacén / Anaquel 3", error: "",
  });
  assert.deepEqual(agregarSubnivel([], "", " SITE   2 "), { path: "SITE 2", error: "" });
});

test("rechaza nombres vacíos, rutas pegadas y hermanos existentes, incluso inferidos", () => {
  for (const name of ["", "  ", "Anaquel / Nivel", "/ Anaquel"]) {
    const result = agregarSubnivel(locations, "SITE 1", name);
    assert.equal(result.path, null);
    assert.ok(result.error);
  }
  assert.equal(agregarSubnivel(locations, "SITE 1", " almacén ").path, null);
  assert.equal(agregarSubnivel(locations, "", "site 1").path, null);
  assert.equal(agregarSubnivel(locations, "SITE 10", "Almacén").path, "SITE 10 / Almacén");
});
