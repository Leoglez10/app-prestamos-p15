import test from "node:test";
import assert from "node:assert/strict";
import {
  calcularProgreso,
  clasificarDisparo,
  fueNoLocalizado,
  construirReporteCsv,
  fueRevisado,
  nombreDelReporte,
  pendientesDeArea,
  type EquipoRevisable,
} from "./tomaFisica.ts";

const equipo = (extra: Partial<EquipoRevisable> = {}): EquipoRevisable => ({
  id: 1,
  nombre_equipo: "COMPUTADORA PORTATIL",
  id_patrimonial: "3382871",
  ubicacion: null,
  revisado_en: null,
  revisado_por: null,
  no_localizado_en: null,
  no_localizado_por: null,
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
      equipo({ id: 2, revisado_en: null }),
      equipo({ id: 3, revisado_en: null, id_patrimonial: null }),
      equipo({ id: 4, revisado_en: null, no_localizado_en: "2026-08-21 10:00:00" }),
    ],
    "2026-08-01 00:00:00"
  );

  assert.deepEqual(progreso, {
    total: 4,
    revisados: 1,
    // El no localizado sale de pendientes: ya se decidio sobre el.
    pendientes: 2,
    noLocalizados: 1,
    sinEtiqueta: 1,
    porcentaje: 25,
  });
});

test("aparecer le gana a la marca de no localizado", () => {
  const reaparecido = equipo({
    revisado_en: "2026-08-22 09:00:00",
    no_localizado_en: "2026-08-21 10:00:00",
  });
  const progreso = calcularProgreso([reaparecido], "2026-08-01 00:00:00");
  assert.equal(progreso.revisados, 1);
  assert.equal(progreso.noLocalizados, 0);
});

test("un no localizado de la campana pasada no cuenta en esta", () => {
  const viejo = equipo({ no_localizado_en: "2025-03-01 10:00:00" });
  assert.equal(fueNoLocalizado(viejo, "2026-08-01 00:00:00"), false);
});

test("el progreso no divide por cero con el inventario vacío", () => {
  assert.equal(calcularProgreso([], null).porcentaje, 0);
});

test("el reporte distingue apareci\u00f3, no apareci\u00f3 y nadie lo busc\u00f3", () => {
  const csv = construirReporteCsv(
    [
      equipo({
        id: 1,
        ubicacion: "Aula 12",
        revisado_en: "2026-08-20 09:00:00",
        revisado_por: "Luz",
      }),
      equipo({
        id: 2,
        ubicacion: "Bodega P15",
        no_localizado_en: "2026-08-21 10:00:00",
        no_localizado_por: "Luz",
      }),
      equipo({ id: 3 }),
    ],
    "2026-08-01 00:00:00"
  );
  const filas = csv.trimEnd().split("\n");

  assert.equal(filas.length, 4, "encabezado + tres filas");
  assert.match(filas[1], /"Aula 12";"S";"2026-08-20 09:00:00";"Luz"/);
  // Quien afirma la perdida queda firmado igual que quien confirma la presencia.
  assert.match(filas[2], /"Bodega P15";"N";"2026-08-21 10:00:00";"Luz"/);
  // Nadie recorrio esa area todavia: el reporte no afirma nada.
  assert.match(filas[3], /"";"";"";""/);
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

test("los pendientes del área son los de esa ubicación que no se vieron en esta campaña", () => {
  const equipos = [
    equipo({ id: 1, ubicacion: "Aula 12", revisado_en: "2026-08-20 09:00:00" }),
    equipo({ id: 2, ubicacion: "Aula 12", revisado_en: null }),
    equipo({ id: 3, ubicacion: "aula 12 ", revisado_en: "2025-01-01 09:00:00" }),
    equipo({ id: 4, ubicacion: "Auditorio", revisado_en: null }),
    equipo({ id: 5, ubicacion: null, revisado_en: null }),
    // Ya se decidio que no esta: no vuelve a la lista de lo que falta buscar.
    equipo({ id: 6, ubicacion: "Aula 12", no_localizado_en: "2026-08-21 10:00:00" }),
  ];
  const pendientes = pendientesDeArea(equipos, "Aula 12", "2026-08-01 00:00:00");

  // El 3 cuenta: se vio, pero en la campaña pasada. El 1 ya se vio en esta.
  assert.deepEqual(pendientes.map((e) => e.id), [2, 3]);
});

test("sin ubicación no hay pendientes de área", () => {
  assert.deepEqual(pendientesDeArea([equipo({ ubicacion: "Aula 12" })], "  ", null), []);
});

test("un equipo que estaba en otra área sale como movido", () => {
  const bocina = equipo({ id: 7, ubicacion: "Bodega P15" });
  assert.equal(clasificarDisparo(bocina, "Aula 12", []), "movido");
  assert.equal(clasificarDisparo(bocina, "bodega p15", []), "nuevo");
  assert.equal(clasificarDisparo(bocina, "Aula 12", [7]), "repetido");
});

test("un equipo sin ubicación previa no es un movimiento, es la primera vez", () => {
  assert.equal(clasificarDisparo(equipo({ ubicacion: null }), "Aula 12", []), "nuevo");
});
