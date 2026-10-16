import test from "node:test";
import assert from "node:assert/strict";
import { agregarSubnivel, hijosDeUbicacion, rutaDeUbicacion } from "./ubicaciones.ts";

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
