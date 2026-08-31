/**
 * Detalle de una salida a evento: qué salió, qué volvió y el acta imprimible.
 *
 * Tiene dos modos y el segundo es el que importa. En modo "lista" el modal deja
 * de ser una ficha y se vuelve el checklist de la puerta: una casilla por
 * objeto, todas palomeadas de entrada porque lo normal es que todo regrese, y
 * el trabajo del encargado se reduce a DESmarcar lo que no llegó. Cerrar
 * devuelve lo palomeado —lo que también libera el equipo en el inventario— y
 * deja lo demás prestado a nombre del responsable, que es exactamente lo que
 * pasa en la realidad: el evento terminó, el micrófono no.
 *
 * Nada se marca como "perdido". El objeto que falta sigue prestado y puede
 * devolverse después desde esta misma lista sin reabrir el evento.
 */
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import {
  cerrarEvento,
  deleteEvento,
  getEventoItems,
  marcarPrestamoRapidoDevuelto,
  reabrirEvento,
} from "../hooks/useInventory";
import {
  buildActaEventoBody,
  estadoEvento,
  ETIQUETA_ESTADO_EVENTO,
  rangoFechas,
  rangoHoras,
  tituloEvento,
  type Evento,
  type EventoItem,
} from "../utils/evento";
import { formatSqliteDateTime } from "../utils/datetime";
import { printHtmlDocument } from "../utils/print";
import { confirmDialog } from "../utils/confirm";
import type { AdminUser } from "../auth/types";

type Props = {
  evento: Evento | null;
  admin: AdminUser | null;
  onCerrar: () => void;
  /** Se llama después de cualquier escritura para que la pantalla recargue. */
  onCambio: () => void;
};

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="evento-dato">
      <small>{label}</small>
      <div>{children}</div>
    </div>
  );
}

export function EventoDetalleModal({ evento, admin, onCerrar, onCambio }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<EventoItem[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [modoLista, setModoLista] = useState(false);
  const [devueltos, setDevueltos] = useState<number[]>([]);
  const [notasCierre, setNotasCierre] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  const eventoId = evento?.id ?? null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (eventoId !== null && !dialog.open) dialog.showModal();
    if (eventoId === null && dialog.open) dialog.close();
  }, [eventoId]);

  useEffect(() => {
    if (eventoId === null) return;
    let cancelado = false;
    setCargando(true);
    setError("");
    setModoLista(false);
    setNotasCierre("");
    getEventoItems(eventoId)
      .then((filas) => {
        if (cancelado) return;
        setItems(filas);
        // Todo lo que sigue afuera arranca palomeado: el caso común es que el
        // evento regresó completo, y desmarcar dos cosas es menos trabajo que
        // marcar diez.
        setDevueltos(filas.filter((item) => item.estado !== "devuelto").map((item) => item.id));
      })
      .catch((err) => {
        if (!cancelado) setError(err instanceof Error ? err.message : "No se pudieron cargar los objetos.");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [eventoId]);

  const recargarItems = async (id: number) => {
    const filas = await getEventoItems(id);
    setItems(filas);
    setDevueltos(filas.filter((item) => item.estado !== "devuelto").map((item) => item.id));
  };

  if (!evento) {
    return <dialog ref={dialogRef} className="admin-dialog is-wide evento-dialog" onClose={onCerrar} />;
  }

  const estado = estadoEvento(evento);
  const pendientes = items.filter((item) => item.estado !== "devuelto");

  const toggleItem = (id: number) => {
    setDevueltos((prev) => (prev.includes(id) ? prev.filter((actual) => actual !== id) : [...prev, id]));
  };

  const handleImprimir = () => {
    try {
      printHtmlDocument(
        `Acta de salida a evento — ${tituloEvento(evento)}`,
        buildActaEventoBody(evento, items),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir la vista de impresión.");
    }
  };

  const handleCerrarEvento = async () => {
    if (!admin) {
      setError("Tu sesión expiró. Vuelve a iniciar sesión.");
      return;
    }
    const faltantes = pendientes.length - devueltos.length;
    if (faltantes > 0) {
      const seguir = await confirmDialog(
        `${faltantes} objeto${faltantes === 1 ? "" : "s"} se queda${faltantes === 1 ? "" : "n"} sin devolver y sigue${
          faltantes === 1 ? "" : "n"
        } prestado${faltantes === 1 ? "" : "s"} a ${evento.responsable_nombre}. ¿Cerrar el evento así?`,
        { confirmLabel: "Cerrar con faltantes" },
      );
      if (!seguir) return;
    }

    setTrabajando(true);
    setError("");
    try {
      await cerrarEvento({ eventoId: evento.id, idsDevueltos: devueltos, admin, notas: notasCierre });
      await recargarItems(evento.id);
      setModoLista(false);
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cerrar el evento.");
    } finally {
      setTrabajando(false);
    }
  };

  const handleDevolverUno = async (item: EventoItem) => {
    setTrabajando(true);
    setError("");
    try {
      await marcarPrestamoRapidoDevuelto(item.id);
      await recargarItems(evento.id);
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo devolver el objeto.");
    } finally {
      setTrabajando(false);
    }
  };

  const handleReabrir = async () => {
    setTrabajando(true);
    setError("");
    try {
      await reabrirEvento(evento.id);
      onCambio();
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reabrir el evento.");
    } finally {
      setTrabajando(false);
    }
  };

  const handleEliminar = async () => {
    const seguir = await confirmDialog(
      `Se elimina el registro del evento "${tituloEvento(evento)}" y sus ${items.length} objeto${
        items.length === 1 ? "" : "s"
      }. Esta acción no se puede deshacer.`,
      { confirmLabel: "Eliminar evento" },
    );
    if (!seguir) return;

    setTrabajando(true);
    setError("");
    try {
      await deleteEvento(evento.id);
      onCambio();
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el evento.");
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <dialog ref={dialogRef} className="admin-dialog is-wide evento-dialog" onClose={onCerrar}>
      <div className="evento-detalle">
        <div className="evento-detalle-head">
          <span className="evento-head-icon" aria-hidden="true">
            <Icon name="mapPin" size="1.2rem" />
          </span>
          <div>
            <h3>{tituloEvento(evento)}</h3>
            <p className="evento-head-sub">
              Salida a evento · {items.length} objeto{items.length === 1 ? "" : "s"} ·{" "}
              {pendientes.length} sin devolver
            </p>
          </div>
          <span className={`evento-estado evento-estado-${estado}`}>{ETIQUETA_ESTADO_EVENTO[estado]}</span>
          <button type="button" className="admin-dialog-close" onClick={onCerrar} aria-label="Cerrar">
            <Icon name="x" size="1.1rem" />
          </button>
        </div>

        {error && (
          <div className="evento-alert" role="alert">
            <Icon name="alert" />
            <span>{error}</span>
          </div>
        )}

        <div className="evento-datos">
          <Dato label="Lugar">{evento.lugar}</Dato>
          <Dato label="Fecha">{rangoFechas(evento)}</Dato>
          <Dato label="Horario">{rangoHoras(evento)}</Dato>
          <Dato label="Responsable">
            {evento.responsable_nombre}
            <div className="evento-dato-meta">
              {evento.responsable_codigo} · {evento.responsable_tipo === "alumno" ? "Alumno" : "Profesor"}
            </div>
          </Dato>
          <Dato label="Expositor">
            {evento.expositor_nombre ? (
              <>
                {evento.expositor_nombre}
                {evento.expositor_contacto && (
                  <div className="evento-dato-meta">{evento.expositor_contacto}</div>
                )}
              </>
            ) : (
              <span className="evento-dato-meta">Sin expositor</span>
            )}
          </Dato>
          <Dato label="Autorizó">
            {evento.autorizante_nombre ?? "—"}
            <div className="evento-dato-meta">{formatSqliteDateTime(evento.creado_en)}</div>
          </Dato>
        </div>

        {evento.observaciones && <p className="evento-notas">{evento.observaciones}</p>}

        {evento.cerrado_en && (
          <p className="evento-notas evento-notas-cierre">
            <strong>Cerrado</strong> el {formatSqliteDateTime(evento.cerrado_en)}
            {evento.cerrado_por ? ` · revisó ${evento.cerrado_por}` : ""}
            {evento.notas_cierre ? ` — ${evento.notas_cierre}` : ""}
          </p>
        )}

        <div className="evento-lista-head">
          <h4>
            {modoLista
              ? pendientes.length > 0
                ? "Pasa la lista de devolución"
                : "Cerrar el evento"
              : "Objetos del evento"}
          </h4>
          {modoLista && (
            <p className="evento-head-sub">
              {pendientes.length > 0
                ? `Vienen palomeados. Desmarca lo que NO regresó: eso se queda prestado a ${evento.responsable_nombre}.`
                : "No queda nada afuera. Al cerrar solo se registra quién y cuándo revisó."}
            </p>
          )}
        </div>

        {cargando ? (
          <p className="evento-vacio">Cargando objetos...</p>
        ) : items.length === 0 ? (
          <p className="evento-vacio">Este evento no tiene objetos registrados.</p>
        ) : (
          <ul className="evento-items">
            {items.map((item) => {
              const yaDevuelto = item.estado === "devuelto";
              const etiqueta = [item.identificador, item.id_patrimonial].filter(Boolean).join(" · ");
              return (
                <li key={item.id} className={yaDevuelto ? "is-devuelto" : undefined}>
                  {modoLista && !yaDevuelto ? (
                    <label className="evento-item-check">
                      <input
                        type="checkbox"
                        checked={devueltos.includes(item.id)}
                        onChange={() => toggleItem(item.id)}
                        disabled={trabajando}
                      />
                      <span className="visually-hidden">Marcar {item.nombre_equipo} como devuelto</span>
                    </label>
                  ) : (
                    <span className={`evento-item-icono ${yaDevuelto ? "is-devuelto" : ""}`} aria-hidden="true">
                      <Icon name={yaDevuelto ? "checkCircle" : "dot"} />
                    </span>
                  )}

                  <div className="evento-item-texto">
                    <span className="evento-item-nombre">{item.nombre_equipo}</span>
                    {etiqueta && <span className="evento-item-meta">{etiqueta}</span>}
                    {yaDevuelto && item.fecha_retorno && (
                      <span className="evento-item-meta">
                        Devuelto {formatSqliteDateTime(item.fecha_retorno)}
                      </span>
                    )}
                  </div>

                  {!modoLista && !yaDevuelto && (
                    <button
                      type="button"
                      className="evento-btn-mini"
                      onClick={() => handleDevolverUno(item)}
                      disabled={trabajando}
                    >
                      Devolver
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {modoLista && (
          <label className="evento-campo">
            Notas del cierre
            <textarea
              rows={2}
              value={notasCierre}
              onChange={(e) => setNotasCierre(e.target.value)}
              placeholder="Ej. el micrófono se quedó con el expositor, lo trae el lunes"
            />
          </label>
        )}

        <div className="evento-detalle-acciones">
          {modoLista ? (
            <>
              <button
                type="button"
                className="evento-btn-primario"
                onClick={handleCerrarEvento}
                disabled={trabajando}
              >
                {trabajando ? "Cerrando..." : "Cerrar evento"}
              </button>
              <button
                type="button"
                className="evento-btn-secundario"
                onClick={() => setModoLista(false)}
                disabled={trabajando}
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              {/* Se ofrece mientras el evento siga abierto, tenga o no equipo
                  afuera: el cierre es un hecho aparte de la devolución, y sin
                  esto un evento que ya terminó se quedaba "En evento" para
                  siempre. Sin pendientes solo hay que firmar el cierre. */}
              {!evento.cerrado_en && (
                <button
                  type="button"
                  className="evento-btn-primario"
                  onClick={() => setModoLista(true)}
                  disabled={trabajando}
                >
                  {pendientes.length > 0 ? "Pasar lista de devolución" : "Cerrar evento"}
                </button>
              )}
              <button type="button" className="evento-btn-secundario" onClick={handleImprimir}>
                <Icon name="clipboard" /> Imprimir acta
              </button>
              {evento.cerrado_en && (
                <button
                  type="button"
                  className="evento-btn-secundario"
                  onClick={handleReabrir}
                  disabled={trabajando}
                >
                  Reabrir
                </button>
              )}
              <button
                type="button"
                className="evento-btn-peligro"
                onClick={handleEliminar}
                disabled={trabajando}
              >
                <Icon name="trash" /> Eliminar
              </button>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
