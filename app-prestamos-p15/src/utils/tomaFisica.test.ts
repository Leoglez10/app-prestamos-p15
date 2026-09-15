import test from "node:test";
import assert from "node:assert/strict";
import {
  calcularProgreso,
  clasificarDisparo,
  estadoAlCapturar,
  fueNoLocalizado,
  construirReporteCsv,
  filasDelReporte,
  fueRevisado,
  estaDentroDe,
  lugarAlRevisar,
  nombreDelReporte,
  normalizarLugar,
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
  estado: "disponible",
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

test("normalizar un lugar limpia cada subnivel y respeta mayúsculas", () => {
  assert.equal(normalizarLugar("site 2/anaquel 1 "), "site 2 / anaquel 1");
  assert.equal(normalizarLugar("  SITE   2 //  Anaquel 1 / "), "SITE 2 / Anaquel 1");
  assert.equal(normalizarLugar("Aula 12"), "Aula 12");
  assert.equal(normalizarLugar(" / "), "");
  assert.equal(normalizarLugar(null), "");
});

test("un lugar está dentro de su área y de sí mismo, comparando por subniveles", () => {
  assert.equal(estaDentroDe("SITE 2 / Anaquel 1", "SITE 2"), true);
  assert.equal(estaDentroDe("SITE 2 / Anaquel 1 / Nivel 3", "site 2/anaquel 1"), true);
  assert.equal(estaDentroDe("SITE 2", "site 2 "), true);
  assert.equal(estaDentroDe("SITE 2", "SITE 2 / Anaquel 1"), false);
  assert.equal(estaDentroDe("SITE 20", "SITE 2"), false);
  assert.equal(estaDentroDe("SITE 2", "SITE 20"), false);
  assert.equal(estaDentroDe("SITE 2 / Anaquel 1", "SITE 2 / Anaquel 2"), false);
  assert.equal(estaDentroDe(null, "SITE 2"), false);
  assert.equal(estaDentroDe("SITE 2", "  "), false);
});

test("recorrer un nivel cubre sus subniveles, y un subnivel solo a sí mismo", () => {
  const equipos = [
    equipo({ id: 1, ubicacion: "SITE 2" }),
    equipo({ id: 2, ubicacion: "SITE 2 / Anaquel 1" }),
    equipo({ id: 3, ubicacion: "SITE 2 / Anaquel 2" }),
    equipo({ id: 4, ubicacion: "SITE 20" }),
  ];
  assert.deepEqual(pendientesDeArea(equipos, "SITE 2", null).map((e) => e.id), [1, 2, 3]);
  assert.deepEqual(pendientesDeArea(equipos, "site 2/anaquel 1", null).map((e) => e.id), [2]);
});

test("precisar o generalizar el lugar no es un movimiento; otra rama sí", () => {
  const enSite = equipo({ id: 8, ubicacion: "SITE 2" });
  const enAnaquel = equipo({ id: 9, ubicacion: "SITE 2 / Anaquel 1" });
  assert.equal(clasificarDisparo(enSite, "SITE 2 / Anaquel 1", []), "nuevo");
  assert.equal(clasificarDisparo(enAnaquel, "SITE 2", []), "nuevo");
  assert.equal(clasificarDisparo(enAnaquel, "SITE 2 / Anaquel 2", []), "movido");
  assert.equal(clasificarDisparo(enSite, "SITE 1", []), "movido");
  assert.equal(clasificarDisparo(enSite, "SITE 20", []), "movido");
});

test("al revisar se conserva el lugar más preciso", () => {
  // Recorrer el site no borra el anaquel que ya estaba anotado.
  assert.equal(lugarAlRevisar("SITE 2 / Anaquel 1", "SITE 2"), "SITE 2 / Anaquel 1");
  // Recorrer el anaquel precisa lo que solo decía el site.
  assert.equal(lugarAlRevisar("SITE 2", "SITE 2 / Anaquel 1"), "SITE 2 / Anaquel 1");
  // Mismo lugar u otra rama: manda el recorrido.
  assert.equal(lugarAlRevisar("site 2", "SITE 2"), "SITE 2");
  assert.equal(lugarAlRevisar("SITE 2 / Anaquel 1", "SITE 2 / Anaquel 2"), "SITE 2 / Anaquel 2");
  assert.equal(lugarAlRevisar("SITE 20 / Anaquel 1", "SITE 2"), "SITE 2");
  assert.equal(lugarAlRevisar(null, "Aula 12"), "Aula 12");
});

test("el estado elegido se aplica solo cuando la persona lo indicó", () => {
  assert.equal(estadoAlCapturar(""), undefined);
  assert.equal(estadoAlCapturar("  mantenimiento  "), "mantenimiento");
});

test("el reporte de Patrimonio incluye el estado con una etiqueta legible", () => {
  const [encabezado, fijo, personalizado] = filasDelReporte(
    [
      equipo({ id: 1, estado: "en_resguardo" }),
      equipo({ id: 2, estado: "en_comodato" }),
    ],
    null,
    [{ valor: "en_comodato", etiqueta: "En comodato institucional" }]
  );

  assert.equal(encabezado.at(-1), "Estado");
  assert.equal(fijo.at(-1), "En resguardo");
  assert.equal(personalizado.at(-1), "En comodato institucional");
});
