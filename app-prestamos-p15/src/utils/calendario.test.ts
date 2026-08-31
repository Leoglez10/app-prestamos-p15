import test from "node:test";
import assert from "node:assert/strict";
import {
  aIso,
  construirMes,
  dentroDelRango,
  desdeIso,
  esIsoValido,
  etiquetaMes,
  mesDeIso,
  seleccionarDia,
  sumarDias,
  sumarMeses,
} from "./calendario.ts";

test("aIso usa la fecha local, no la de UTC", () => {
  // 23:30 del 31 de agosto en local: toISOString() daría el 1 de septiembre
  // en cualquier huso al oeste de Greenwich.
  assert.equal(aIso(new Date(2026, 7, 31, 23, 30)), "2026-08-31");
  assert.equal(aIso(new Date(2026, 0, 1, 0, 5)), "2026-01-01");
});

test("desdeIso devuelve el mismo día que se le pidió", () => {
  const fecha = desdeIso("2026-08-31");
  assert.equal(fecha.getFullYear(), 2026);
  assert.equal(fecha.getMonth(), 7);
  assert.equal(fecha.getDate(), 31);
});

test("ir y volver por ISO no corre el día", () => {
  // El viaje de ida y vuelta es lo que hace el calendario en cada clic.
  for (const iso of ["2026-01-01", "2026-02-28", "2026-04-05", "2026-10-25", "2026-12-31"]) {
    assert.equal(aIso(desdeIso(iso)), iso, `se movió el día en ${iso}`);
  }
});

test("esIsoValido solo acepta YYYY-MM-DD", () => {
  assert.equal(esIsoValido("2026-08-31"), true);
  assert.equal(esIsoValido("31/08/2026"), false);
  assert.equal(esIsoValido(""), false);
  assert.equal(esIsoValido(null), false);
});

test("sumarDias cruza meses y años", () => {
  assert.equal(sumarDias("2026-08-31", 1), "2026-09-01");
  assert.equal(sumarDias("2026-09-01", -1), "2026-08-31");
  assert.equal(sumarDias("2026-12-31", 1), "2027-01-01");
  assert.equal(sumarDias("2026-01-01", -1), "2025-12-31");
  assert.equal(sumarDias("2026-08-10", 7), "2026-08-17");
});

test("sumarDias respeta el año bisiesto", () => {
  assert.equal(sumarDias("2028-02-28", 1), "2028-02-29");
  assert.equal(sumarDias("2026-02-28", 1), "2026-03-01");
});

test("sumarMeses normaliza diciembre y enero", () => {
  assert.deepEqual(sumarMeses({ anio: 2026, mes: 12 }, 1), { anio: 2027, mes: 1 });
  assert.deepEqual(sumarMeses({ anio: 2026, mes: 1 }, -1), { anio: 2025, mes: 12 });
  assert.deepEqual(sumarMeses({ anio: 2026, mes: 8 }, 3), { anio: 2026, mes: 11 });
});

test("mesDeIso y etiquetaMes describen el mes visible", () => {
  assert.deepEqual(mesDeIso("2026-08-31"), { anio: 2026, mes: 8 });
  assert.equal(etiquetaMes({ anio: 2026, mes: 8 }), "agosto 2026");
});

test("la rejilla siempre trae seis semanas de siete días", () => {
  // Alto fijo: el calendario no debe cambiar de tamaño al pasar de mes.
  for (const visible of [
    { anio: 2026, mes: 2 },
    { anio: 2026, mes: 8 },
    { anio: 2028, mes: 2 },
  ]) {
    const semanas = construirMes(visible);
    assert.equal(semanas.length, 6);
    for (const semana of semanas) assert.equal(semana.length, 7);
  }
});

test("la rejilla empieza en lunes y rellena los bordes", () => {
  // El 1 de agosto de 2026 es sábado: la primera semana trae 5 días de julio.
  const semanas = construirMes({ anio: 2026, mes: 8 });
  assert.equal(semanas[0][0].iso, "2026-07-27");
  assert.equal(semanas[0][0].delMes, false);
  assert.equal(semanas[0][5].iso, "2026-08-01");
  assert.equal(semanas[0][5].delMes, true);
});

test("la rejilla contiene todos los días del mes exactamente una vez", () => {
  const semanas = construirMes({ anio: 2026, mes: 2 });
  const delMes = semanas.flat().filter((dia) => dia.delMes);
  assert.equal(delMes.length, 28);
  assert.equal(delMes[0].iso, "2026-02-01");
  assert.equal(delMes[27].iso, "2026-02-28");
  assert.equal(new Set(delMes.map((dia) => dia.iso)).size, 28);
});

test("los días de la rejilla van seguidos, sin saltos", () => {
  const dias = construirMes({ anio: 2026, mes: 3 }).flat();
  for (let i = 1; i < dias.length; i += 1) {
    assert.equal(dias[i].iso, sumarDias(dias[i - 1].iso, 1));
  }
});

test("dentroDelRango: sin fin, solo el día del inicio cuenta", () => {
  const rango = { inicio: "2026-08-31", fin: null };
  assert.equal(dentroDelRango("2026-08-31", rango), true);
  assert.equal(dentroDelRango("2026-09-01", rango), false);
});

test("dentroDelRango incluye los dos extremos", () => {
  const rango = { inicio: "2026-08-31", fin: "2026-09-02" };
  assert.equal(dentroDelRango("2026-08-31", rango), true);
  assert.equal(dentroDelRango("2026-09-01", rango), true);
  assert.equal(dentroDelRango("2026-09-02", rango), true);
  assert.equal(dentroDelRango("2026-08-30", rango), false);
  assert.equal(dentroDelRango("2026-09-03", rango), false);
});

test("el primer clic arma un evento de un día", () => {
  assert.deepEqual(seleccionarDia(null, "2026-08-31"), { inicio: "2026-08-31", fin: null });
});

test("un segundo clic más adelante abre el rango", () => {
  const rango = seleccionarDia({ inicio: "2026-08-31", fin: null }, "2026-09-02");
  assert.deepEqual(rango, { inicio: "2026-08-31", fin: "2026-09-02" });
});

test("un segundo clic ANTES del inicio corrige el inicio, no invierte el rango", () => {
  // Es el error de captura real: te equivocaste de día al empezar.
  const rango = seleccionarDia({ inicio: "2026-08-31", fin: null }, "2026-08-25");
  assert.deepEqual(rango, { inicio: "2026-08-25", fin: null });
});

test("volver a picar el inicio deja el evento en un solo día", () => {
  const rango = seleccionarDia({ inicio: "2026-08-31", fin: null }, "2026-08-31");
  assert.deepEqual(rango, { inicio: "2026-08-31", fin: null });
});

test("con un rango ya cerrado, el siguiente clic empieza de nuevo", () => {
  const rango = seleccionarDia({ inicio: "2026-08-31", fin: "2026-09-02" }, "2026-09-10");
  assert.deepEqual(rango, { inicio: "2026-09-10", fin: null });
});

test("seleccionarDia nunca produce un fin anterior al inicio", () => {
  // La invariante que protege a validarEvento: si esto se rompe, el formulario
  // guarda un evento que termina antes de empezar.
  const dias = construirMes({ anio: 2026, mes: 8 }).flat().map((dia) => dia.iso);
  let rango = seleccionarDia(null, dias[0]);
  for (const iso of dias) {
    rango = seleccionarDia(rango, iso);
    if (rango.fin) assert.ok(rango.fin > rango.inicio, `${rango.inicio} → ${rango.fin}`);
  }
});
