import test from "node:test";
import assert from "node:assert/strict";
import {
  destinoDeClasificador,
  planificarImportacion,
  CATEGORIA_SIN_CLASIFICAR,
  type EquipoExistente,
  type FilaPatrimonio,
} from "./importacionPatrimonio.ts";

const fila = (extra: Partial<FilaPatrimonio> = {}): FilaPatrimonio => ({
  id_patrimonial: "3382871",
  clasificador: "COMPUTADORA PORTATIL",
  marca: "DELL",
  modelo: "LATITUDE",
  num_serie: null,
  descripcion: null,
  resguardante_codigo: null,
  resguardante_nombre: null,
  fecha_adquisicion: null,
  ubicacion: null,
  ...extra,
});

const existente = (extra: Partial<EquipoExistente> = {}): EquipoExistente => ({
  id: 1,
  id_patrimonial: "3382871",
  marca: null,
  modelo: null,
  num_serie: null,
  descripcion: null,
  resguardante_codigo: null,
  resguardante_nombre: null,
  fecha_adquisicion: null,
  ...extra,
});

test("lo que no se presta entra como solo inventario", () => {
  // 78% del archivo es infraestructura fija: si entrara prestable, ahogaría el kiosco.
  for (const clasificador of ["VENTILADOR", "PINTARRON", "EXTINTOR", "MICROSCOPIO"]) {
    const destino = destinoDeClasificador(clasificador);
    assert.equal(destino.es_prestable, 0, clasificador);
    assert.equal(destino.categoria, CATEGORIA_SIN_CLASIFICAR);
  }
});

test("los clasificadores prestables caen en su categoría", () => {
  assert.deepEqual(destinoDeClasificador("COMPUTADORA PORTATIL"), { categoria: "Laptops", es_prestable: 1 });
  assert.deepEqual(destinoDeClasificador("CAÑON PROYECTOR"), { categoria: "Proyectores", es_prestable: 1 });
});

test("una fila nueva se da de alta", () => {
  const plan = planificarImportacion({ filas: [fila()], avisos: [] }, []);
  assert.equal(plan.altas.length, 1);
  assert.equal(plan.cambios.length, 0);
  assert.deepEqual(plan.categoriasNuevas, ["Laptops"]);
});

test("no propone crear una categoría que ya existe", () => {
  const plan = planificarImportacion({ filas: [fila()], avisos: [] }, [], ["laptops"]);
  assert.deepEqual(plan.categoriasNuevas, []);
});

test("reimportar el mismo archivo no escribe nada", () => {
  const plan = planificarImportacion(
    { filas: [fila()], avisos: [] },
    [existente({ marca: "DELL", modelo: "LATITUDE" })]
  );
  assert.equal(plan.sinCambio, 1);
  assert.equal(plan.cambios.length, 0);
  assert.equal(plan.altas.length, 0);
});

test("solo viajan los campos que de verdad cambiaron", () => {
  const plan = planificarImportacion(
    { filas: [fila({ modelo: "LATITUDE 5540" })], avisos: [] },
    [existente({ marca: "DELL", modelo: "LATITUDE" })]
  );
  assert.equal(plan.cambios.length, 1);
  assert.deepEqual(plan.cambios[0].campos, { modelo: "LATITUDE 5540" });
});

test("una celda vacía del Excel no borra lo que ya había", () => {
  // Patrimonio manda sobre lo que trae, no sobre lo que dejó en blanco.
  const plan = planificarImportacion(
    { filas: [fila({ marca: null, modelo: null })], avisos: [] },
    [existente({ marca: "DELL", modelo: "LATITUDE" })]
  );
  assert.equal(plan.sinCambio, 1);
  assert.equal(plan.cambios.length, 0);
});

test("la reimportación nunca toca lo que produce la escuela", () => {
  // ubicacion, es_prestable, categoria_id y nombre_equipo son de la casa: una
  // toma física no se puede perder por volver a correr el Excel.
  const plan = planificarImportacion(
    { filas: [fila({ ubicacion: "Bodega de Patrimonio", clasificador: "VENTILADOR" })], avisos: [] },
    [existente({ marca: "DELL", modelo: "LATITUDE" })]
  );
  assert.equal(plan.cambios.length, 0);
  assert.equal(plan.sinCambio, 1);
});

test("un equipo sin ID de Patrimonio no se confunde con las filas del Excel", () => {
  // El granel vive con id_patrimonial NULL: no debe empatar con nada.
  const plan = planificarImportacion(
    { filas: [fila()], avisos: [] },
    [existente({ id: 9, id_patrimonial: null })]
  );
  assert.equal(plan.altas.length, 1);
  assert.equal(plan.cambios.length, 0);
});

test("los avisos del lector llegan a la vista previa", () => {
  const plan = planificarImportacion({ filas: [fila()], avisos: ["Fila 7: fecha rara"] }, []);
  assert.deepEqual(plan.avisos, ["Fila 7: fecha rara"]);
});
