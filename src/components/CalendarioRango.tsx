/**
 * Calendario de mes para elegir cuándo es el evento.
 *
 * Reemplaza a los dos `<input type="date">` porque en el WebView de la app esos
 * campos no abren ningún calendario: se ven como casillas DD/MM/AAAA y hay que
 * teclear el día de memoria. Nadie planea así — uno dice "el jueves y el
 * viernes" —, y teclear una fecha es justo donde se cuelan los errores que
 * después hay que corregir a mano en la base.
 *
 * Un solo control para las dos fechas: el primer clic fija el día del evento y
 * el segundo, más adelante, lo estira a varios días. Por eso no hay casilla de
 * "dura varios días": la forma de decirlo es picar el último día.
 *
 * La aritmética vive en `src/utils/calendario.ts`, probada aparte. Aquí solo
 * está lo que necesita el navegador: pintar, mover el foco y avisar del cambio.
 */
import { KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";
import {
  construirMes,
  dentroDelRango,
  esIsoValido,
  etiquetaMes,
  mesDeIso,
  NOMBRES_DIA,
  seleccionarDia,
  sumarDias,
  sumarMeses,
  type MesVisible,
  type RangoFechas,
} from "../utils/calendario";
import { formatearFecha, hoyLocal } from "../utils/evento";

type Props = {
  inicio: string;
  fin: string;
  onCambio: (rango: { inicio: string; fin: string }) => void;
  /** Se pinta debajo del calendario, en rojo, cuando la captura no cierra. */
  error?: string;
};

export function CalendarioRango({ inicio, fin, onCambio, error }: Props) {
  const hoy = hoyLocal();
  const rango: RangoFechas = { inicio, fin: fin || null };

  const [visible, setVisible] = useState<MesVisible>(() =>
    mesDeIso(esIsoValido(inicio) ? inicio : hoy),
  );
  // El día que recibe el foco del teclado. Uno solo es tabulable a la vez: con
  // 42 botones tabulables, llegar al siguiente campo costaría 42 tabuladores.
  const [foco, setFoco] = useState<string>(() => (esIsoValido(inicio) ? inicio : hoy));
  // Estirar el rango se ve mientras se mueve el mouse, antes de soltar el clic.
  const [previo, setPrevio] = useState<string | null>(null);

  const rejillaRef = useRef<HTMLDivElement>(null);
  const debeEnfocar = useRef(false);

  // El foco se mueve DESPUÉS de pintar: el botón del día nuevo puede pertenecer
  // a un mes que apenas se está montando.
  useEffect(() => {
    if (!debeEnfocar.current) return;
    debeEnfocar.current = false;
    rejillaRef.current?.querySelector<HTMLButtonElement>(`[data-iso="${foco}"]`)?.focus();
  }, [foco, visible]);

  const semanas = useMemo(() => construirMes(visible), [visible]);

  // Mientras se elige el segundo día, el rango que se pinta es el que quedaría
  // si soltara el clic ahí. Sin esto no hay forma de ver qué se va a guardar.
  const rangoPintado: RangoFechas = useMemo(() => {
    if (!rango.inicio || rango.fin || !previo || previo <= rango.inicio) return rango;
    return { inicio: rango.inicio, fin: previo };
  }, [rango.inicio, rango.fin, previo]);

  const irA = (iso: string) => {
    setFoco(iso);
    debeEnfocar.current = true;
    const mes = mesDeIso(iso);
    if (mes.anio !== visible.anio || mes.mes !== visible.mes) setVisible(mes);
  };

  const elegir = (iso: string) => {
    const nuevo = seleccionarDia(rango, iso);
    setPrevio(null);
    setFoco(iso);
    onCambio({ inicio: nuevo.inicio, fin: nuevo.fin ?? "" });
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const saltos: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      PageUp: -30,
      PageDown: 30,
    };
    const salto = saltos[event.key];
    if (salto !== undefined) {
      event.preventDefault();
      irA(sumarDias(foco, salto));
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      irA(`${visible.anio}-${`${visible.mes}`.padStart(2, "0")}-01`);
    }
  };

  const cambiarMes = (delta: number) => {
    setVisible((actual) => sumarMeses(actual, delta));
  };

  const resumen = !esIsoValido(inicio)
    ? "Pica el día del evento"
    : fin
      ? `Del ${formatearFecha(inicio)} al ${formatearFecha(fin)}`
      : `${formatearFecha(inicio)} · un solo día`;

  return (
    <div className="cal">
      <div className="cal-barra">
        <button type="button" className="cal-nav" onClick={() => cambiarMes(-1)} aria-label="Mes anterior">
          <Icon name="arrowLeft" />
        </button>
        <span className="cal-mes" aria-live="polite">
          {etiquetaMes(visible)}
        </span>
        <button type="button" className="cal-nav" onClick={() => cambiarMes(1)} aria-label="Mes siguiente">
          <Icon name="arrowRight" />
        </button>
      </div>

      <div className="cal-dias-nombres" aria-hidden="true">
        {NOMBRES_DIA.map((nombre) => (
          <span key={nombre}>{nombre}</span>
        ))}
      </div>

      <div
        ref={rejillaRef}
        className="cal-rejilla"
        role="grid"
        aria-label="Elige la fecha del evento"
        onKeyDown={handleKeyDown}
        onMouseLeave={() => setPrevio(null)}
      >
        {semanas.map((semana, indice) => (
          <div className="cal-semana" role="row" key={indice}>
            {semana.map((dia) => {
              const seleccionado = dentroDelRango(dia.iso, rangoPintado);
              const esInicio = dia.iso === rangoPintado.inicio;
              const esFin = rangoPintado.fin != null && dia.iso === rangoPintado.fin;
              const clases = [
                "cal-dia",
                dia.delMes ? "" : "es-otro-mes",
                seleccionado ? "es-elegido" : "",
                esInicio ? "es-inicio" : "",
                esFin ? "es-fin" : "",
                dia.iso === hoy ? "es-hoy" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <button
                  key={dia.iso}
                  type="button"
                  role="gridcell"
                  data-iso={dia.iso}
                  className={clases}
                  tabIndex={dia.iso === foco ? 0 : -1}
                  aria-selected={seleccionado}
                  aria-current={dia.iso === hoy ? "date" : undefined}
                  aria-label={formatearFecha(dia.iso)}
                  onClick={() => elegir(dia.iso)}
                  onFocus={() => setFoco(dia.iso)}
                  onMouseEnter={() => setPrevio(dia.iso)}
                >
                  {dia.dia}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="cal-pie">
        <span className={esIsoValido(inicio) ? "cal-resumen" : "cal-resumen es-vacio"}>{resumen}</span>
        <div className="cal-pie-acciones">
          {fin && (
            <button
              type="button"
              className="cal-accion"
              onClick={() => onCambio({ inicio, fin: "" })}
            >
              Dejarlo en un día
            </button>
          )}
          <button type="button" className="cal-accion" onClick={() => irA(hoy)}>
            Ir a hoy
          </button>
        </div>
      </div>

      <p className="cal-ayuda">
        Un clic elige el día. Si el evento dura más, pica también el último día.
      </p>
      {error && <small className="evento-error">{error}</small>}
    </div>
  );
}
