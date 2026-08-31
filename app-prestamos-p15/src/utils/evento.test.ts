import test from "node:test";
import assert from "node:assert/strict";
import {
  buildActaEventoBody,
  estadoEvento,
  formatearFecha,
  rangoFechas,
  rangoHoras,
  tituloEvento,
  validarEvento,
  type Evento,
  type EventoInput,
  type EventoItem,
} from "./evento.ts";

const inputValido = (extra?: Partial<EventoInput>): EventoInput => ({
  lugar: "Auditorio central",
  fecha_inicio: "2026-03-12",
  responsable_nombre: "Laura Méndez",
  responsable_codigo: "2958101",
  responsable_tipo: "profesor",
  ...extra,
});

const eventoBase = (extra?: Partial<Evento>): Evento => ({
  id: 1,
  nombre: null,
  lugar: "Auditorio central",
  fecha_inicio: "2026-03-12",
  fecha_fin: null,
  hora_inicio: "09:00",
  hora_fin: "14:00",
  responsable_nombre: "Laura Méndez",
  responsable_codigo: "2958101",
  responsable_tipo: "profesor",
  expositor_nombre: null,
  expositor_contacto: null,
  observaciones: null,
  id_admin: 1,
  autorizante_codigo: "223992647",
  autorizante_nombre: "Administrador P15",
  creado_en: "2026-03-12 08:30:00",
  cerrado_en: null,
  cerrado_por: null,
  notas_cierre: null,
  total_items: 2,
  items_devueltos: 0,
  ...extra,
});

const item = (extra?: Partial<EventoItem>): EventoItem => ({
  id: 10,
  nombre_equipo: "Proyector Epson",
  identificador: "PRO-004",
  id_patrimonial: "3382871",
  observaciones: null,
  estado: "activo",
  fecha_salida: "2026-03-12 08:30:00",
  fecha_retorno: null,
  equipo_id: 4,
  ...extra,
});

test("un evento sin cierre sigue activo aunque todo haya vuelto", () => {
  // La firma del cierre es un hecho aparte de que los objetos regresaron.
  const evento = eventoBase({ items_devueltos: 2, cerrado_en: null });
  assert.equal(estadoEvento(evento), "activo");
});

test("cerrar con todo devuelto da cerrado completo", () => {
  const evento = eventoBase({ items_devueltos: 2, cerrado_en: "2026-03-12 19:00:00" });
  assert.equal(estadoEvento(evento), "cerrado");
});

test("cerrar con objetos pendientes da cerrado con faltantes", () => {
  const evento = eventoBase({ items_devueltos: 1, cerrado_en: "2026-03-12 19:00:00" });
  assert.equal(estadoEvento(evento), "cerrado-con-faltantes");
});

test("un objeto que aparece tarde vuelve el evento a cerrado completo", () => {
  // Es la razón de derivar el estado en vez de guardarlo: marcar devuelto el
  // faltante basta, no hay una segunda columna que corregir.
  const tarde = eventoBase({ items_devueltos: 2, cerrado_en: "2026-03-12 19:00:00" });
  assert.equal(estadoEvento(tarde), "cerrado");
});

test("el título cae al lugar cuando no escribieron nombre", () => {
  assert.equal(tituloEvento({ nombre: null, lugar: "Auditorio central" }), "Auditorio central");
  assert.equal(tituloEvento({ nombre: "  ", lugar: "Auditorio central" }), "Auditorio central");
  assert.equal(tituloEvento({ nombre: "Feria de ciencias", lugar: "Auditorio" }), "Feria de ciencias");
});

test("formatearFecha no retrocede un día", () => {
  // new Date("2026-03-12") se lee en UTC y en México cae en el 11.
  assert.equal(formatearFecha("2026-03-12"), "12/03/2026");
  assert.equal(formatearFecha(null), "—");
});

test("el rango de fechas solo se abre cuando el evento dura varios días", () => {
  assert.equal(rangoFechas({ fecha_inicio: "2026-03-12", fecha_fin: null }), "12/03/2026");
  assert.equal(rangoFechas({ fecha_inicio: "2026-03-12", fecha_fin: "2026-03-12" }), "12/03/2026");
  assert.equal(
    rangoFechas({ fecha_inicio: "2026-03-12", fecha_fin: "2026-03-14" }),
    "12/03/2026 → 14/03/2026",
  );
});

test("el rango de horas tolera que falte una de las dos", () => {
  assert.equal(rangoHoras({ hora_inicio: "09:00", hora_fin: "14:00" }), "09:00 – 14:00");
  assert.equal(rangoHoras({ hora_inicio: "09:00", hora_fin: null }), "09:00");
  assert.equal(rangoHoras({ hora_inicio: null, hora_fin: null }), "—");
});

test("un evento bien capturado no produce errores", () => {
  assert.deepEqual(validarEvento(inputValido(), 1), []);
});

test("exige lugar, responsable, fecha y al menos un objeto", () => {
  const errores = validarEvento(
    { ...inputValido(), lugar: " ", responsable_nombre: "", responsable_codigo: "", fecha_inicio: "" },
    0,
  );
  const campos = errores.map((error) => error.field).sort();
  assert.deepEqual(campos, ["equipos", "fechaInicio", "lugar", "responsableCodigo", "responsableNombre"]);
});

test("la fecha de fin no puede quedar antes del inicio", () => {
  const errores = validarEvento(inputValido({ fecha_fin: "2026-03-10" }), 1);
  assert.equal(errores.length, 1);
  assert.equal(errores[0].field, "fechaFin");
});

test("las horas solo se comparan dentro del mismo día", () => {
  // Mismo día: terminar antes de empezar es un error de captura.
  assert.equal(validarEvento(inputValido({ hora_inicio: "14:00", hora_fin: "09:00" }), 1).length, 1);
  // Varios días: salir a las 14:00 del jueves y volver a las 09:00 del sábado es normal.
  assert.deepEqual(
    validarEvento(inputValido({ fecha_fin: "2026-03-14", hora_inicio: "14:00", hora_fin: "09:00" }), 1),
    [],
  );
});

test("un contacto sin expositor es captura a medias", () => {
  const errores = validarEvento(inputValido({ expositor_contacto: "33 1234 5678" }), 1);
  assert.equal(errores[0].field, "expositorNombre");
  // Con nombre, el contacto ya es válido.
  assert.deepEqual(
    validarEvento(inputValido({ expositor_nombre: "Dr. Ruiz", expositor_contacto: "33 1234 5678" }), 1),
    [],
  );
});

test("el acta marca la casilla solo de lo devuelto", () => {
  const acta = buildActaEventoBody(
    eventoBase({ items_devueltos: 1, cerrado_en: "2026-03-12 19:00:00", cerrado_por: "Admin P15" }),
    [item({ id: 10 }), item({ id: 11, nombre_equipo: "Bocina JBL", estado: "devuelto", fecha_retorno: "2026-03-12 18:40:00" })],
    { generadoEn: "2026-03-12 19:05" },
  );

  assert.match(acta, /Cerrado con faltantes/);
  assert.match(acta, /PENDIENTE/);
  assert.equal((acta.match(/&#9744;/g) ?? []).length, 1, "solo el pendiente lleva casilla vacía");
  assert.equal((acta.match(/&#10003;/g) ?? []).length, 1, "solo el devuelto lleva palomita");
  assert.match(acta, /1 sin devolver/);
});

test("el acta escapa lo que escribe el usuario", () => {
  const acta = buildActaEventoBody(
    eventoBase({ lugar: '<script>alert("x")</script>' }),
    [item()],
    { generadoEn: "2026-03-12 19:05" },
  );
  assert.ok(!acta.includes("<script>"), "el lugar no debe inyectar HTML");
  assert.match(acta, /&lt;script&gt;/);
});
