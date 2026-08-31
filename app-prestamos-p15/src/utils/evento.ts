/**
 * Salidas a evento: la parte que no necesita la base.
 *
 * Un evento es UN encabezado (lugar, fechas, responsable, expositor) y N
 * objetos que salieron con él. Los objetos NO estrenan tabla: cada uno es una
 * fila de `prestamos_rapidos_alumnos` con `evento_id`, o sea exactamente el
 * mismo préstamo rápido de siempre, con la misma liga a `prestamos` e
 * `inventario`. Por eso devolver un objeto del evento devuelve el equipo en el
 * inventario sin una sola línea nueva de código.
 *
 * De ahí sale la regla que sostiene todo lo demás: **el estado del evento se
 * deriva, no se guarda**. Un evento está cerrado cuando alguien pasó la lista de
 * devolución (`cerrado_en`), y está cerrado CON FALTANTES cuando además quedaron
 * objetos sin devolver. Guardar ese estado sería una segunda verdad que se
 * desincroniza en cuanto un objeto aparece tarde y se marca devuelto.
 *
 * Vive fuera de `useInventory.ts` porque ese módulo importa el plugin SQL de
 * Tauri en la primera línea: aquí la lógica queda pura y corre con `node --test`.
 */
// Extensión explícita: sin ella `node --test` no resuelve el módulo. tsconfig
// tiene `allowImportingTsExtensions` y Vite la resuelve igual.
import { html } from "./print.ts";
import { formatSqliteDateTime } from "./datetime.ts";

export type TipoPersonaEvento = "alumno" | "profesor";

/** Lo que captura el formulario, antes de tocar la base. */
export type EventoInput = {
  /** Opcional: si no lo escriben, el lugar es el nombre del evento. */
  nombre?: string | null;
  lugar: string;
  /** YYYY-MM-DD. */
  fecha_inicio: string;
  /** YYYY-MM-DD. `null` es evento de un solo día. */
  fecha_fin?: string | null;
  /** HH:MM. */
  hora_inicio?: string | null;
  hora_fin?: string | null;
  responsable_nombre: string;
  responsable_codigo: string;
  responsable_tipo: TipoPersonaEvento;
  /** `null` es "no hay expositor": no hace falta un booleano aparte. */
  expositor_nombre?: string | null;
  expositor_contacto?: string | null;
  observaciones?: string | null;
};

/** Una fila de `eventos` ya leída, con el conteo de sus objetos. */
export type Evento = {
  id: number;
  nombre: string | null;
  lugar: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  responsable_nombre: string;
  responsable_codigo: string;
  responsable_tipo: string;
  expositor_nombre: string | null;
  expositor_contacto: string | null;
  observaciones: string | null;
  id_admin: number | null;
  autorizante_codigo: string | null;
  autorizante_nombre: string | null;
  creado_en: string;
  cerrado_en: string | null;
  cerrado_por: string | null;
  notas_cierre: string | null;
  total_items: number;
  items_devueltos: number;
};

/** Un objeto del evento, tal como lo devuelve la consulta de detalle. */
export type EventoItem = {
  id: number;
  nombre_equipo: string;
  identificador: string | null;
  id_patrimonial: string | null;
  observaciones: string | null;
  estado: string;
  fecha_salida: string;
  fecha_retorno: string | null;
  equipo_id: number | null;
};

export type EstadoEvento = "activo" | "cerrado" | "cerrado-con-faltantes";

export type ErrorCampo = { field: string; message: string };

const texto = (value: string | null | undefined): string => (value ?? "").trim();

/**
 * El estado que se pinta en la tabla y en el acta.
 *
 * Ojo con el orden: primero se pregunta si alguien pasó la lista. Un evento con
 * todos los objetos devueltos pero sin cierre sigue ACTIVO — nadie firmó que el
 * evento terminó, y esa firma es justo lo que el acta necesita imprimir.
 */
export const estadoEvento = (evento: {
  cerrado_en: string | null;
  total_items: number;
  items_devueltos: number;
}): EstadoEvento => {
  if (!evento.cerrado_en) return "activo";
  return evento.items_devueltos >= evento.total_items ? "cerrado" : "cerrado-con-faltantes";
};

export const ETIQUETA_ESTADO_EVENTO: Record<EstadoEvento, string> = {
  activo: "En evento",
  cerrado: "Cerrado completo",
  "cerrado-con-faltantes": "Cerrado con faltantes",
};

/** El título con el que el evento aparece en la tabla y en el acta. */
export const tituloEvento = (evento: { nombre: string | null; lugar: string }): string =>
  texto(evento.nombre) || evento.lugar;

/** "12/03/2026" o "12/03/2026 → 14/03/2026" cuando dura varios días. */
export const rangoFechas = (evento: { fecha_inicio: string; fecha_fin: string | null }): string => {
  const inicio = formatearFecha(evento.fecha_inicio);
  const fin = texto(evento.fecha_fin);
  if (!fin || fin === evento.fecha_inicio) return inicio;
  return `${inicio} → ${formatearFecha(fin)}`;
};

/** "09:00 – 14:00", o solo una de las dos si falta la otra. */
export const rangoHoras = (evento: { hora_inicio: string | null; hora_fin: string | null }): string => {
  const inicio = texto(evento.hora_inicio);
  const fin = texto(evento.hora_fin);
  if (inicio && fin) return `${inicio} – ${fin}`;
  return inicio || fin || "—";
};

/**
 * YYYY-MM-DD de HOY en hora local. Se arma a mano por lo mismo que
 * `formatearFecha`: `toISOString()` da el día en UTC y en México adelanta uno
 * después de las 18:00.
 */
export const hoyLocal = (): string => {
  const ahora = new Date();
  const mes = `${ahora.getMonth() + 1}`.padStart(2, "0");
  const dia = `${ahora.getDate()}`.padStart(2, "0");
  return `${ahora.getFullYear()}-${mes}-${dia}`;
};

/**
 * YYYY-MM-DD → DD/MM/YYYY. Se parte el string a mano en vez de usar `new Date`:
 * `new Date("2026-03-12")` se interpreta en UTC y en México retrocede un día.
 */
export const formatearFecha = (fecha: string | null | undefined): string => {
  const valor = texto(fecha);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!match) return valor || "—";
  return `${match[3]}/${match[2]}/${match[1]}`;
};

/**
 * Reglas de captura. Devuelve TODOS los errores de una pasada para que el
 * formulario los pinte juntos y el usuario no descubra uno por intento.
 */
export const validarEvento = (input: EventoInput, totalObjetos: number): ErrorCampo[] => {
  const errores: ErrorCampo[] = [];

  if (!texto(input.lugar)) {
    errores.push({ field: "lugar", message: "Escribe el lugar del evento." });
  }
  if (!texto(input.responsable_nombre)) {
    errores.push({ field: "responsableNombre", message: "Escribe quién es el responsable." });
  }
  if (!texto(input.responsable_codigo)) {
    errores.push({ field: "responsableCodigo", message: "Escribe el código del responsable." });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto(input.fecha_inicio))) {
    errores.push({ field: "fechaInicio", message: "Elige la fecha de inicio." });
  }

  const fin = texto(input.fecha_fin);
  if (fin) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fin)) {
      errores.push({ field: "fechaFin", message: "La fecha de fin no es válida." });
    } else if (fin < texto(input.fecha_inicio)) {
      // Comparación de strings: ISO YYYY-MM-DD ordena igual que la fecha real.
      errores.push({ field: "fechaFin", message: "La fecha de fin no puede ser antes del inicio." });
    }
  }

  const horaInicio = texto(input.hora_inicio);
  const horaFin = texto(input.hora_fin);
  // Solo tiene sentido comparar horas dentro del MISMO día: en un evento de
  // varios días terminar a las 09:00 es perfectamente normal.
  const mismoDia = !fin || fin === texto(input.fecha_inicio);
  if (mismoDia && horaInicio && horaFin && horaFin <= horaInicio) {
    errores.push({ field: "horaFin", message: "La hora de fin debe ser después de la de inicio." });
  }

  if (!texto(input.expositor_nombre) && texto(input.expositor_contacto)) {
    errores.push({ field: "expositorNombre", message: "Escribe el nombre del expositor o borra su contacto." });
  }

  if (totalObjetos < 1) {
    errores.push({ field: "equipos", message: "Agrega al menos un objeto que sale al evento." });
  }

  return errores;
};

/**
 * El acta imprimible: encabezado del evento y la lista de objetos con su
 * casilla. La casilla se dibuja llena cuando el objeto YA volvió, así que el
 * mismo documento sirve de hoja para palomear en la puerta y de comprobante de
 * lo que regresó. Un solo documento, no dos que se desincronizan.
 *
 * Devuelve solo el `<body>`: el envoltorio con estilos lo pone
 * `buildPrintDocument` en `print.ts`.
 */
export const buildActaEventoBody = (
  evento: Evento,
  items: EventoItem[],
  opciones?: { generadoEn?: string },
): string => {
  const estado = estadoEvento(evento);
  const pendientes = items.filter((item) => item.estado !== "devuelto");
  const generado = texto(opciones?.generadoEn) || new Date().toLocaleString("es-MX");

  const dato = (label: string, valor: string): string =>
    `<div class="card"><div class="label">${html(label)}</div><div class="dato-valor">${html(valor)}</div></div>`;

  const filas = items
    .map((item) => {
      const devuelto = item.estado === "devuelto";
      const etiqueta = [item.identificador, item.id_patrimonial].filter(Boolean).join(" · ");
      return `<tr>
        <td class="casilla">${devuelto ? "&#10003;" : "&#9744;"}</td>
        <td>
          <strong>${html(item.nombre_equipo)}</strong>
          ${etiqueta ? `<div class="muted">${html(etiqueta)}</div>` : ""}
          ${item.observaciones?.trim() ? `<div class="muted">${html(item.observaciones)}</div>` : ""}
        </td>
        <td>${devuelto ? "Devuelto" : "PENDIENTE"}</td>
        <td>${item.fecha_retorno ? html(formatSqliteDateTime(item.fecha_retorno)) : "—"}</td>
      </tr>`;
    })
    .join("");

  const expositor = texto(evento.expositor_nombre)
    ? `<div class="notes"><strong>Expositor:</strong> ${html(evento.expositor_nombre)}${
        texto(evento.expositor_contacto) ? ` · ${html(evento.expositor_contacto)}` : ""
      }</div>`
    : "";

  const cierre = evento.cerrado_en
    ? `<div class="notes"><strong>Cierre:</strong> ${html(formatSqliteDateTime(evento.cerrado_en))}${
        texto(evento.cerrado_por) ? ` · revisó ${html(evento.cerrado_por)}` : ""
      }${texto(evento.notas_cierre) ? `<br />${html(evento.notas_cierre)}` : ""}</div>`
    : "";

  return `
    <style>
      .casilla { font-size: 16px; text-align: center; width: 34px; }
      .dato-valor { font-size: 13px; font-weight: 600; }
      .summary.cols-3 { grid-template-columns: repeat(3, 1fr); }
      .firmas { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 46px; }
      .firma { border-top: 1px solid var(--ink); padding-top: 6px; font-size: 12px; text-align: center; }
    </style>
    <div class="header">
      <div class="brand">
        <div>
          <h1>Acta de salida a evento</h1>
          <p class="muted">Preparatoria 15 · Control de inventario</p>
        </div>
      </div>
      <div class="muted">Generada: ${html(generado)}</div>
    </div>

    <h2>${html(tituloEvento(evento))}</h2>
    <p class="meta">${html(ETIQUETA_ESTADO_EVENTO[estado])} · ${items.length} objeto${
      items.length === 1 ? "" : "s"
    } · ${pendientes.length} sin devolver</p>

    <div class="summary cols-3">
      ${dato("Lugar", evento.lugar)}
      ${dato("Fecha", rangoFechas(evento))}
      ${dato("Horario", rangoHoras(evento))}
      ${dato("Responsable", `${evento.responsable_nombre} (${evento.responsable_codigo})`)}
      ${dato("Autorizó", evento.autorizante_nombre ?? "—")}
      ${dato("Registrado", formatSqliteDateTime(evento.creado_en))}
    </div>

    ${expositor}
    ${texto(evento.observaciones) ? `<div class="notes">${html(evento.observaciones)}</div>` : ""}
    ${cierre}

    <table>
      <thead>
        <tr>
          <th scope="col">✓</th>
          <th scope="col">Objeto</th>
          <th scope="col">Estado</th>
          <th scope="col">Devuelto el</th>
        </tr>
      </thead>
      <tbody>${filas || `<tr><td colspan="4" class="muted">Sin objetos registrados.</td></tr>`}</tbody>
    </table>

    <div class="firmas">
      <div class="firma">Entrega (responsable del evento)</div>
      <div class="firma">Recibe (inventario P15)</div>
    </div>`;
};
