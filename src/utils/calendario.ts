/**
 * La aritmética de un calendario de mes, sin React y sin base.
 *
 * Existe porque `<input type="date">` en el WebView de la app no ofrece un
 * calendario que se pueda abrir: se ve como tres casillas DD/MM/AAAA y hay que
 * teclear el día. Para una salida a evento eso es justo al revés de lo que se
 * necesita —uno piensa "el jueves y el viernes", no "31/08"—, así que la
 * pantalla dibuja su propia rejilla y este módulo le da los números.
 *
 * **Regla de oro: nunca `toISOString()` ni `new Date("2026-03-12")`.** Las dos
 * cosas trabajan en UTC, y en México eso mueve el día un lugar. Todo aquí se
 * arma y se parte con los componentes locales de `Date` (getFullYear, getMonth,
 * getDate), que son los que coinciden con el día que la persona ve en la pared.
 *
 * Puro a propósito: corre con `node --test`, sin navegador.
 */

/** Lunes primero, como se lee un calendario en México. */
export const NOMBRES_DIA = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"] as const;

export const NOMBRES_MES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

/** Una casilla de la rejilla. `delMes` es falso en los días de relleno. */
export type DiaCalendario = {
  /** YYYY-MM-DD. */
  iso: string;
  dia: number;
  delMes: boolean;
};

/** Qué mes se está viendo. `mes` es 1-12, no el 0-11 de `Date`. */
export type MesVisible = { anio: number; mes: number };

export type RangoFechas = { inicio: string; fin: string | null };

/** `Date` → YYYY-MM-DD usando la fecha LOCAL. */
export const aIso = (fecha: Date): string => {
  const mes = `${fecha.getMonth() + 1}`.padStart(2, "0");
  const dia = `${fecha.getDate()}`.padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
};

/**
 * YYYY-MM-DD → `Date` a mediodía local.
 *
 * El mediodía no es capricho: en un cambio de horario de verano la medianoche
 * puede no existir, y `new Date(a, m, d)` termina cayendo en el día anterior.
 * Desde las 12:00 sobra margen en cualquier huso.
 */
export const desdeIso = (iso: string): Date => {
  const [anio, mes, dia] = iso.split("-").map(Number);
  return new Date(anio, mes - 1, dia, 12, 0, 0, 0);
};

export const esIsoValido = (valor: string | null | undefined): boolean =>
  typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor);

/** Suma (o resta) días sobre una fecha ISO. `Date` ya sabe cruzar meses y años. */
export const sumarDias = (iso: string, dias: number): string => {
  const fecha = desdeIso(iso);
  fecha.setDate(fecha.getDate() + dias);
  return aIso(fecha);
};

/** Mueve el mes visible. `setMonth` normaliza diciembre → enero del año siguiente. */
export const sumarMeses = (visible: MesVisible, meses: number): MesVisible => {
  const fecha = new Date(visible.anio, visible.mes - 1 + meses, 1, 12, 0, 0, 0);
  return { anio: fecha.getFullYear(), mes: fecha.getMonth() + 1 };
};

export const mesDeIso = (iso: string): MesVisible => {
  const fecha = desdeIso(iso);
  return { anio: fecha.getFullYear(), mes: fecha.getMonth() + 1 };
};

export const etiquetaMes = (visible: MesVisible): string =>
  `${NOMBRES_MES[visible.mes - 1]} ${visible.anio}`;

/**
 * La rejilla del mes: SIEMPRE seis semanas de siete días.
 *
 * Fijo en seis y no "las que hagan falta" para que el calendario no cambie de
 * alto al pasar de mes. Un contenedor que brinca mueve el botón que la persona
 * iba a tocar, y en un formulario eso se paga en clics equivocados.
 */
export const construirMes = (visible: MesVisible): DiaCalendario[][] => {
  const primero = new Date(visible.anio, visible.mes - 1, 1, 12, 0, 0, 0);
  // getDay() da 0=domingo; con lunes primero, el domingo es la columna 6.
  const desplazamiento = (primero.getDay() + 6) % 7;

  const inicio = new Date(primero);
  inicio.setDate(inicio.getDate() - desplazamiento);

  const semanas: DiaCalendario[][] = [];
  const cursor = new Date(inicio);

  for (let semana = 0; semana < 6; semana += 1) {
    const dias: DiaCalendario[] = [];
    for (let dia = 0; dia < 7; dia += 1) {
      dias.push({
        iso: aIso(cursor),
        dia: cursor.getDate(),
        delMes: cursor.getMonth() === visible.mes - 1 && cursor.getFullYear() === visible.anio,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    semanas.push(dias);
  }

  return semanas;
};

/** Comparar strings ISO ordena igual que las fechas, sin construir `Date`. */
export const dentroDelRango = (iso: string, rango: RangoFechas): boolean => {
  if (!rango.fin) return iso === rango.inicio;
  return iso >= rango.inicio && iso <= rango.fin;
};

/**
 * Qué pasa al hacer clic en un día.
 *
 * Un solo gesto cubre los dos casos que existen: la mayoría de los eventos son
 * de un día (un clic y listo, sin fin), y los de varios se arman con un segundo
 * clic más adelante. No hay botón de "modo rango" porque no hace falta: si el
 * segundo clic cae ANTES del inicio, se entiende como corregir el inicio, no
 * como un rango al revés.
 */
export const seleccionarDia = (rango: RangoFechas | null, iso: string): RangoFechas => {
  // Sin inicio, o con un rango ya cerrado: este clic empieza uno nuevo.
  if (!rango || !rango.inicio || rango.fin) {
    return { inicio: iso, fin: null };
  }
  if (iso <= rango.inicio) {
    return { inicio: iso, fin: null };
  }
  return { inicio: rango.inicio, fin: iso };
};
