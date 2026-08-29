import test from "node:test";
import assert from "node:assert/strict";
import { construirReporteCsv, type EquipoRevisable } from "./tomaFisica.ts";
import { leerReporteCsv, planificarFusionReporte } from "./reporteTomaFisica.ts";

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

/** Un reporte mínimo con las columnas que exporta la app. */
const csv = (...filas: string[]): string =>
  `﻿"Id";"Descripción";"Marca";"Modelo";"Num Serie";"Resguardante";"Ubicación";"Localizado";"Revisado";"Revisó"\n${filas.join(
    "\n"
  )}\n`;

const fila = (
  id: string,
  localizado: string,
  cuando: string,
  quien = "Leonardo",
  ubicacion = "Aula 12"
): string =>
  `"${id}";"COMPUTADORA";"DELL";"LATITUDE";"";"";"${ubicacion}";"${localizado}";"${cuando}";"${quien}"`;

// --- El parser ---------------------------------------------------------------

test("un campo entrecomillado puede traer el separador adentro", () => {
  // Las descripciones de Patrimonio traen `;` y comas. Partir por separador
  // correría la fila y leería el Localizado del campo de al lado.
  const lectura = leerReporteCsv(
    csv(`"3382871";"MESA; SILLA";"";"";"";"";"Aula 1";"S";"2026-08-28 10:00:00";"Leo"`)
  );

  assert.equal(lectura.filas.length, 1);
  assert.equal(lectura.filas[0].nombre, "MESA; SILLA");
  assert.equal(lectura.filas[0].localizado, "S");
});

test("un campo entrecomillado puede traer comillas y saltos de línea", () => {
  const lectura = leerReporteCsv(
    csv(`"3382871";"CABLE 3"" CON\nNOTA";"";"";"";"";"Aula 1";"S";"2026-08-28 10:00:00";"Leo"`)
  );

  assert.equal(lectura.filas.length, 1);
  assert.equal(lectura.filas[0].nombre, 'CABLE 3" CON\nNOTA');
});

test("las columnas se leen por nombre, no por posición", () => {
  // El archivo puede pasar por Excel y volver con las columnas movidas.
  const texto = `"Revisó";"Localizado";"Id";"Revisado"\n"Leo";"S";"3382871";"2026-08-28 10:00:00"\n`;
  const lectura = leerReporteCsv(texto);

  assert.equal(lectura.filas[0].id_patrimonial, "3382871");
  assert.equal(lectura.filas[0].localizado, "S");
  assert.equal(lectura.filas[0].quien, "Leo");
});

test("un archivo que no es el reporte se rechaza en vez de importarse a medias", () => {
  assert.throws(
    () => leerReporteCsv(`"Nombre";"Correo"\n"Leo";"leo@x.com"\n`),
    /no parece un reporte de toma física/
  );
});

test("una fila sin etiqueta de Patrimonio no se puede machear", () => {
  const lectura = leerReporteCsv(
    csv(`"";"GRANEL";"";"";"";"";"Aula 1";"S";"2026-08-28 10:00:00";"Leo"`)
  );

  assert.equal(lectura.filas.length, 0);
  assert.equal(lectura.sinEtiqueta, 1);
});

// --- Las reglas de fusión ----------------------------------------------------

test("un 'apareció' más nuevo marca revisado y trae la ubicación", () => {
  const lectura = leerReporteCsv(csv(fila("3382871", "S", "2026-08-28 10:00:00")));
  const plan = planificarFusionReporte(lectura, [equipo({ revisado_en: null })]);

  assert.equal(plan.cambios.length, 1);
  assert.equal(plan.cambios[0].tipo, "revisado");
  assert.equal(plan.cambios[0].cuando, "2026-08-28 10:00:00");
  assert.equal(plan.cambios[0].quien, "Leonardo");
  assert.equal(plan.cambios[0].ubicacion, "Aula 12");
});

test("importar el mismo reporte dos veces no cambia nada", () => {
  // La garantía que hace segura la fusión: es idempotente. Si no lo fuera,
  // nadie podría reimportar sin miedo y volveríamos a los turnos.
  const lectura = leerReporteCsv(csv(fila("3382871", "S", "2026-08-28 10:00:00")));
  const yaImportado = equipo({
    revisado_en: "2026-08-28 10:00:00",
    revisado_por: "Leonardo",
    ubicacion: "Aula 12",
  });

  const plan = planificarFusionReporte(lectura, [yaImportado]);

  assert.equal(plan.cambios.length, 0);
  assert.equal(plan.sinCambio, 1);
});

test("un reporte viejo no pisa un recorrido más reciente de la máquina principal", () => {
  const lectura = leerReporteCsv(csv(fila("3382871", "S", "2026-08-20 09:00:00", "Ana", "Aula 3")));
  const masNuevo = equipo({ revisado_en: "2026-08-27 16:00:00", ubicacion: "Aula 9" });

  const plan = planificarFusionReporte(lectura, [masNuevo]);

  assert.equal(plan.cambios.length, 0);
  assert.equal(plan.sinCambio, 1);
});

test("un 'no apareció' más nuevo se marca como no localizado", () => {
  const lectura = leerReporteCsv(csv(fila("3382871", "N", "2026-08-28 11:00:00", "Ana")));
  const plan = planificarFusionReporte(lectura, [equipo()]);

  assert.equal(plan.cambios.length, 1);
  assert.equal(plan.cambios[0].tipo, "no_localizado");
  assert.equal(plan.cambios[0].quien, "Ana");
  // La ubicación no viaja en un "no apareció": nadie lo vio en ningún lado.
  assert.equal(plan.cambios[0].ubicacion, null);
});

test("haberlo visto después gana sobre un 'no apareció' anterior", () => {
  // El equipo está ahí. Un reporte anterior no puede declararlo perdido.
  const lectura = leerReporteCsv(csv(fila("3382871", "N", "2026-08-20 09:00:00", "Ana")));
  const visto = equipo({ revisado_en: "2026-08-27 16:00:00" });

  const plan = planificarFusionReporte(lectura, [visto]);

  assert.equal(plan.cambios.length, 0);
  assert.equal(plan.sinCambio, 1);
});

test("un 'Localizado' vacío no toca nada: nadie llegó a ese equipo", () => {
  const lectura = leerReporteCsv(csv(fila("3382871", "", "")));
  const plan = planificarFusionReporte(lectura, [equipo()]);

  assert.equal(plan.cambios.length, 0);
  assert.equal(plan.sinDecidir, 1);
});

test("un id que no existe en esta base se reporta, no se inventa", () => {
  // Son las altas al vuelo de la otra máquina: el CSV no trae categoría, así
  // que crearlas sería adivinar.
  const lectura = leerReporteCsv(csv(fila("9999999", "S", "2026-08-28 10:00:00")));
  const plan = planificarFusionReporte(lectura, [equipo()]);

  assert.equal(plan.cambios.length, 0);
  assert.deepEqual(plan.desconocidos, ["9999999"]);
});

test("una afirmación sin fecha se avisa en vez de aplicarse a ciegas", () => {
  const lectura = leerReporteCsv(csv(fila("3382871", "S", "")));
  const plan = planificarFusionReporte(lectura, [equipo()]);

  assert.equal(plan.cambios.length, 0);
  assert.equal(plan.avisos.length, 1);
  assert.match(plan.avisos[0], /no trae fecha/);
});

// --- Ida y vuelta ------------------------------------------------------------

test("lo que exporta una máquina es exactamente lo que la otra puede fusionar", () => {
  // El contrato completo: PC-B exporta con `construirReporteCsv`, el archivo
  // viaja por Drive, PC-A lo lee. Si este test cae, el relevo se rompió.
  const enLaSegundaPc: EquipoRevisable[] = [
    equipo({
      id: 1,
      id_patrimonial: "3382871",
      revisado_en: "2026-08-28 10:00:00",
      revisado_por: "Ana",
      ubicacion: "Aula 12",
    }),
    equipo({
      id: 2,
      nombre_equipo: 'PROYECTOR 3" HD',
      id_patrimonial: "3382872",
      no_localizado_en: "2026-08-28 11:30:00",
      no_localizado_por: "Ana",
    }),
    equipo({ id: 3, id_patrimonial: "3382873" }),
  ];

  const archivo = construirReporteCsv(enLaSegundaPc, "2026-08-01 00:00:00");

  const enLaPrincipal: EquipoRevisable[] = [
    equipo({ id: 41, id_patrimonial: "3382871" }),
    equipo({ id: 42, nombre_equipo: 'PROYECTOR 3" HD', id_patrimonial: "3382872" }),
    equipo({ id: 43, id_patrimonial: "3382873" }),
  ];

  const plan = planificarFusionReporte(leerReporteCsv(archivo), enLaPrincipal);

  assert.equal(plan.cambios.length, 2);
  assert.equal(plan.sinDecidir, 1);
  assert.deepEqual(plan.desconocidos, []);
  assert.deepEqual(plan.avisos, []);

  // Los ids son los de ESTA base, no los del archivo.
  const revisado = plan.cambios.find((cambio) => cambio.tipo === "revisado");
  assert.equal(revisado?.id, 41);
  assert.equal(revisado?.ubicacion, "Aula 12");
  assert.equal(revisado?.quien, "Ana");

  const perdido = plan.cambios.find((cambio) => cambio.tipo === "no_localizado");
  assert.equal(perdido?.id, 42);
  assert.equal(perdido?.cuando, "2026-08-28 11:30:00");
});
