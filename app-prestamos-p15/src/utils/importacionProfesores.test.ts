import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizarNombre,
  planificarImportacionProfesores,
  type ProfesorExistente,
} from "./importacionProfesores.ts";

const existente = (extra: Partial<ProfesorExistente> = {}): ProfesorExistente => ({
  id: 1,
  codigo: "2958101",
  nombre: "Edgar Iván Aguilar Durán",
  ...extra,
});

test("un código que no existe se da de alta", () => {
  const plan = planificarImportacionProfesores(
    { filas: [{ codigo: "2104455", nombre: "María López Hernández" }], avisos: [] },
    [existente()]
  );
  assert.deepEqual(plan.altas, [{ codigo: "2104455", nombre: "María López Hernández" }]);
  assert.equal(plan.cambios.length, 0);
  assert.equal(plan.sinCambio, 0);
});

test("un código existente con otro nombre se actualiza", () => {
  const plan = planificarImportacionProfesores(
    { filas: [{ codigo: "2958101", nombre: "Edgar Aguilar" }], avisos: [] },
    [existente()]
  );
  assert.deepEqual(plan.cambios, [
    { id: 1, codigo: "2958101", nombreAnterior: "Edgar Iván Aguilar Durán", nombre: "Edgar Aguilar" },
  ]);
  assert.equal(plan.altas.length, 0);
});

test("mayúsculas, acentos y espacios dobles no cuentan como cambio", () => {
  // Un archivo en MAYÚSCULAS no puede marcar a todo el directorio como modificado.
  const plan = planificarImportacionProfesores(
    { filas: [{ codigo: "2958101", nombre: "EDGAR  IVAN AGUILAR DURAN" }], avisos: [] },
    [existente()]
  );
  assert.equal(plan.sinCambio, 1);
  assert.equal(plan.cambios.length, 0);
});

test("el código se compara recortado", () => {
  const plan = planificarImportacionProfesores(
    { filas: [{ codigo: " 2958101 ", nombre: "Edgar Iván Aguilar Durán" }], avisos: [] },
    [existente({ codigo: "2958101 " })]
  );
  assert.equal(plan.sinCambio, 1);
  assert.equal(plan.altas.length, 0);
});

test("quien no viene en el archivo no aparece en el plan", () => {
  // Nunca se borra: préstamos y celulares apuntan a esos profesores.
  const plan = planificarImportacionProfesores({ filas: [], avisos: [] }, [existente(), existente({ id: 2, codigo: "9" })]);
  assert.deepEqual(plan, { altas: [], cambios: [], sinCambio: 0, avisos: [] });
});

test("el plan no trae campos de administrador", () => {
  const plan = planificarImportacionProfesores(
    { filas: [{ codigo: "1", nombre: "Nueva" }, { codigo: "2958101", nombre: "Otro" }], avisos: [] },
    [existente()]
  );
  assert.deepEqual(Object.keys(plan.altas[0]).sort(), ["codigo", "nombre"]);
  assert.deepEqual(Object.keys(plan.cambios[0]).sort(), ["codigo", "id", "nombre", "nombreAnterior"]);
});

test("los avisos de la lectura llegan a la vista previa", () => {
  const plan = planificarImportacionProfesores({ filas: [], avisos: ["Fila 3: algo"] }, []);
  assert.deepEqual(plan.avisos, ["Fila 3: algo"]);
});

test("normalizarNombre ignora mayúsculas, acentos y espacios", () => {
  assert.equal(normalizarNombre("  María   LÓPEZ "), "maria lopez");
});

test("la ñ no se confunde con la n", () => {
  assert.equal(normalizarNombre("PEÑA"), "peña");
  assert.notEqual(normalizarNombre("Peña"), normalizarNombre("Pena"));
});
