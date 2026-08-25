import test from "node:test";
import assert from "node:assert/strict";
import {
  calcularProgreso,
  construirReporteCsv,
  fueRevisado,
  nombreDelReporte,
  type EquipoRevisable,
} from "./tomaFisica.ts";

const equipo = (extra: Partial<EquipoRevisable> = {}): EquipoRevisable => ({
  id: 1,
  nombre_equipo: "COMPUTADORA PORTATIL",
  id_patrimonial: "3382871",
  ubicacion: null,
  revisado_en: null,
  revisado_por: null,
  marca: "DELL",
  modelo: "LATITUDE",
  num_serie: null,
  resguardante_nombre: null,
  ...extra,
});

test("una revisión vieja no cuenta para la campaña nueva", () => {
  // Sin fecha de corte, la toma del año pasado haría parecer que ya está hecho.
  const viejo = equipo({ revisado_en: "2025-03-01 10:00:00" });
  assert.equal(fueRevisado(viejo, "2026-08-01 00:00:00"), false);
});

test("una revisión de esta campaña sí cuenta", () => {
  const nuevo = equipo({ revisado_en: "2026-08-20 09:00:00" });
  assert.equal(fueRevisado(nuevo, "2026-08-01 00:00:00"), true);
});

test("sin campaña arrancada, cualquier revisión cuenta", () => {
  assert.equal(fueRevisado(equipo({ revisado_en: "2020-01-01 00:00:00" }), null), true);
  assert.equal(fueRevisado(equipo(), null), false);
});

test("el progreso separa revisados, pendientes y lo que no se puede escanear", () => {
  const progreso = calcularProgreso(
    [
      equipo({ id: 1, revisado_en: "2026-08-20 09:00:00" }),
      equipo({ id: 2 }),
      equipo({ id: 3, id_patrimonial: null }),
      equipo({ id: 4, revisado_en: "2025-01-01 09:00:00" }),
    ],
    "2026-08-01 00:00:00"
  );

  assert.deepEqual(progreso, {
    total: 4,
    revisados: 1,
    pendientes: 3,
    sinEtiqueta: 1,
    porcentaje: 25,
  });
});

test("el progreso no divide por cero con el inventario vacío", () => {
  assert.equal(calcularProgreso([], null).porcentaje, 0);
});

test("el reporte marca Localizado S/N como lo hace Patrimonio", () => {
  const csv = construirReporteCsv(
    [
      equipo({ id: 1, revisado_en: "2026-08-20 09:00:00", revisado_por: "Luz", ubicacion: "Aula 12" }),
      equipo({ id: 2, id_patrimonial: "90665" }),
    ],
    "2026-08-01 00:00:00"
  );
  const filas = csv.trimEnd().split("\n");

  assert.equal(filas.length, 3, "encabezado + dos filas");
  assert.match(filas[1], /"Aula 12";"S";"2026-08-20 09:00:00";"Luz"/);
  assert.match(filas[2], /"";"N";"";""/);
});

test("el CSV sobrevive a comas y comillas de las descripciones del Excel", () => {
  const csv = construirReporteCsv(
    [equipo({ nombre_equipo: 'MONITOR 18,5" LED, NEGRO' })],
    null
  );
  assert.ok(csv.includes('"MONITOR 18,5"" LED, NEGRO"'));
  // Una comilla sin escapar partiría la fila en dos al abrirla.
  assert.equal(csv.trimEnd().split("\n").length, 2);
});

test("el reporte lleva BOM para que Excel en español no rompa los acentos", () => {
  assert.ok(construirReporteCsv([], null).startsWith("﻿"));
});

test("el nombre del reporte lleva la fecha", () => {
  assert.equal(nombreDelReporte(new Date(2026, 7, 25)), "reporte-inventario-2026-08-25.csv");
});
