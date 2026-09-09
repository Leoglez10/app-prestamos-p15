/**
 * Detail view for one inventory row.
 *
 * A row with `es_granel = 0` is one physical object: its `id_patrimonial` is the
 * ID printed on the UdeG barcode label stuck to it, and `prestamos.equipo_id`
 * already records who took that exact unit. That per-unit trace is the whole
 * reason to register five remotes as five rows instead of one bulk row of five.
 *
 * A bulk row has no per-unit trace by design — the units are interchangeable,
 * and bulk stock never went through Patrimonio, so it has no label at all. The
 * modal says so out loud instead of pretending otherwise.
 */
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { formatSqliteDateTime } from "../utils/datetime";
import { getHistorialEquipo, type Equipo, type HistorialEquipo } from "../hooks/useInventory";
import { esPrestableEfectivo } from "../utils/equipoFicha";
import { colorEstado, etiquetaEstadoCorta } from "../utils/estados";

type Props = {
  equipo: Equipo | null;
  onClose: () => void;
  onEditar: (equipo: Equipo) => void;
};

function Etiqueta({ children }: { children: React.ReactNode }) {
  return (
    <small style={{ color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".04em", fontSize: "0.7rem" }}>
      {children}
    </small>
  );
}

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: "0.15rem", alignContent: "start" }}>
      <Etiqueta>{label}</Etiqueta>
      <div>{children}</div>
    </div>
  );
}

/**
 * Los dos hechos que se buscan de un golpe al abrir la ficha: en qué estado
 * está el equipo y dónde está. Por eso ninguno es un `Dato` más de la lista —
 * llevan color, un icono y el valor en grande.
 */
const BLOQUE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.65rem",
  padding: "0.7rem 0.85rem",
  borderRadius: "14px",
  border: "1px solid transparent",
};

const BLOQUE_ETIQUETA: CSSProperties = {
  fontSize: "0.68rem",
  textTransform: "uppercase",
  letterSpacing: ".06em",
  fontWeight: 700,
  opacity: 0.72,
};

const BLOQUE_VALOR: CSSProperties = { fontSize: "1.12rem", fontWeight: 700, lineHeight: 1.2 };

function Bloque({
  marca,
  label,
  valor,
  style,
  estiloEtiqueta,
  estiloValor,
}: {
  /** El punto de color del estado o el cuadro con el icono de la ubicación. */
  marca: React.ReactNode;
  label: string;
  valor: React.ReactNode;
  style: CSSProperties;
  estiloEtiqueta?: CSSProperties;
  estiloValor?: CSSProperties;
}) {
  return (
    <div style={{ ...BLOQUE, ...style }}>
      {marca}
      <div style={{ display: "grid", gap: "0.1rem", minWidth: 0 }}>
        <div style={{ ...BLOQUE_ETIQUETA, ...estiloEtiqueta }}>{label}</div>
        <div style={{ ...BLOQUE_VALOR, ...estiloValor }}>{valor}</div>
      </div>
    </div>
  );
}

/** El punto sólido del bloque de estado. */
function Punto({ color }: { color: string }) {
  return <span style={{ width: 11, height: 11, borderRadius: 999, background: color, flexShrink: 0 }} />;
}

export function EquipoDetalleModal({ equipo, onClose, onEditar }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [historial, setHistorial] = useState<HistorialEquipo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const equipoId = equipo?.id ?? null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (equipoId !== null && !dialog.open) dialog.showModal();
    if (equipoId === null && dialog.open) dialog.close();
  }, [equipoId]);

  useEffect(() => {
    if (equipoId === null) return;
    let cancelado = false;
    setCargando(true);
    setError("");
    setHistorial([]);
    getHistorialEquipo(equipoId)
      .then(rows => { if (!cancelado) setHistorial(rows); })
      .catch(err => {
        if (!cancelado) setError(err instanceof Error ? err.message : "No se pudo cargar el historial");
      })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [equipoId]);

  // Con el modal cerrado no se pinta nada: el estado vacío cae en el color por
  // defecto y no hace falta un guard extra dentro del JSX.
  const colorDelEstado = colorEstado(equipo?.estado ?? "");

  return (
    <dialog ref={dialogRef} className="admin-dialog is-wide" onClose={onClose}>
      {equipo ? (
        <div className="stack">
          <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "0.85rem" }}>
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <h3 style={{ margin: 0 }}>{equipo.nombre_equipo}</h3>
              <div style={{ color: "var(--text-secondary)" }}>
                {equipo.es_granel === 1 ? "Control por cantidad (granel)" : equipo.identificador || "Sin identificador"}
              </div>
            </div>
            <button type="button" className="admin-dialog-close" onClick={onClose} aria-label="Cerrar">
              <Icon name="x" size="1.1rem" />
            </button>
          </div>

          <div className="equipo-detalle-cols">
            {/* Tarjeta de identidad: lo que hace único al equipo y lo que se
                busca de un golpe — la placa, el estado y el lugar. */}
            <div className="admin-form-section" style={{ gap: "0.8rem", alignContent: "start" }}>
              <div style={{ display: "grid", gap: "0.4rem" }}>
                <Etiqueta>ID de Patrimonio (UdeG)</Etiqueta>
                {equipo.id_patrimonial ? (
                  <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "12px", background: "var(--surface-default)", overflow: "hidden" }}>
                    {/* Las barras son decoración: el código legible de abajo es
                        el que se teclea, se busca y se compara con la etiqueta. */}
                    <div
                      aria-hidden="true"
                      style={{
                        height: "32px",
                        backgroundImage:
                          "repeating-linear-gradient(90deg, #0F172A 0 2px, transparent 2px 4px, #0F172A 4px 5px, transparent 5px 9px, #0F172A 9px 12px, transparent 12px 14px)",
                        opacity: 0.82,
                      }}
                    />
                    <code style={{ display: "block", padding: "0.35rem 0.7rem 0.5rem", fontSize: "1.4rem", letterSpacing: ".1em", textAlign: "center" }}>
                      {equipo.id_patrimonial}
                    </code>
                  </div>
                ) : (
                  <span style={{ color: "var(--text-secondary)" }}>Sin etiqueta de Patrimonio</span>
                )}
              </div>
              {equipo.es_granel === 1 ? (
                <small style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  El granel no pasó por Patrimonio y no lleva etiqueta: esta fila cuenta unidades
                  intercambiables. Para saber cuál se llevó cada quien, regístralas por separado.
                </small>
              ) : null}

              {equipo.es_granel === 1 ? (
                <Bloque
                  marca={<Punto color="var(--brand-primary)" />}
                  label="Disponibilidad"
                  valor={`${equipo.stock_disponible} / ${equipo.stock_total} disponibles`}
                  style={{ background: "#EFF6FF", borderColor: "#BFDBFE", color: "#1D4ED8" }}
                />
              ) : (
                <Bloque
                  marca={<Punto color={colorDelEstado.punto} />}
                  label="Estado"
                  valor={etiquetaEstadoCorta(equipo.estado)}
                  style={{ background: colorDelEstado.fondo, borderColor: colorDelEstado.borde, color: colorDelEstado.texto }}
                />
              )}

              {equipo.prestamo_activo_profe ? (
                <Dato label="En manos de">
                  {equipo.prestamo_activo_profe}
                  {equipo.prestamo_activo_fecha ? (
                    <small style={{ display: "block", color: "var(--text-secondary)" }}>
                      Desde {formatSqliteDateTime(equipo.prestamo_activo_fecha)}
                    </small>
                  ) : null}
                </Dato>
              ) : null}

              {/* La ubicación sí se pinta vacía: la llena la toma física, no el
                  Excel de Patrimonio, así que el hueco es el estado normal de
                  casi todo el inventario y esconderlo lo volvería invisible. */}
              <Bloque
                marca={
                  <span
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "12px",
                      background: equipo.ubicacion ? "#EFF6FF" : "#F1F5F9",
                      color: equipo.ubicacion ? "var(--brand-primary)" : "#94A3B8",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon name="mapPin" size={20} strokeWidth={1.8} />
                  </span>
                }
                label="Ubicación"
                valor={equipo.ubicacion || "Sin registrar"}
                style={{
                  background: "var(--surface-default)",
                  border: equipo.ubicacion ? "1px solid var(--border-subtle)" : "1px dashed var(--border-subtle)",
                }}
                estiloEtiqueta={{ color: "var(--text-secondary)", opacity: 1 }}
                estiloValor={equipo.ubicacion ? undefined : { color: "#94A3B8", fontWeight: 600 }}
              />

              <div style={{ height: "1px", background: "var(--surface-sunken)" }} />

              <div style={{ display: "grid", gap: "0.25rem" }}>
                <Etiqueta>Categoría</Etiqueta>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.45rem" }}>
                  <span style={{ fontSize: "0.98rem" }}>{equipo.categoria_nombre}</span>
                  <span className={`state ${esPrestableEfectivo(equipo) ? "activo" : "historico"}`} style={{ width: "fit-content" }}>
                    {esPrestableEfectivo(equipo) ? "Prestable" : "Solo inventario"}
                  </span>
                </div>
              </div>

              {equipo.resguardante_nombre || equipo.resguardante_codigo ? (
                <div style={{ display: "grid", gap: "0.15rem" }}>
                  <Etiqueta>Resguardante</Etiqueta>
                  <div style={{ fontSize: "0.98rem", lineHeight: 1.3 }}>{equipo.resguardante_nombre || "—"}</div>
                  {equipo.resguardante_codigo ? (
                    <code style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>{equipo.resguardante_codigo}</code>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Ficha técnica: la descripción es la última fila y crece hasta
                igualar la altura de la tarjeta de la izquierda. */}
            <div style={{ display: "grid", gridTemplateRows: "auto auto 1fr", gap: "0.9rem" }}>
              {/* Los campos vacíos no se pintan: la mayoría del inventario solo
                  tendrá algunos, y una lista de guiones no dice nada. */}
              {equipo.marca || equipo.modelo || equipo.num_serie ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.9rem" }}>
                  {equipo.marca || equipo.modelo ? (
                    <Dato label="Marca y modelo">
                      <span style={{ fontSize: "1rem" }}>{[equipo.marca, equipo.modelo].filter(Boolean).join(" · ")}</span>
                    </Dato>
                  ) : null}
                  {equipo.num_serie ? (
                    <Dato label="Número de serie">
                      <code style={{ fontSize: "0.95rem", letterSpacing: ".03em" }}>{equipo.num_serie}</code>
                    </Dato>
                  ) : null}
                </div>
              ) : null}

              {equipo.fecha_adquisicion ? (
                <Dato label="Fecha de adquisición">
                  <span style={{ fontSize: "1rem" }}>{equipo.fecha_adquisicion}</span>
                </Dato>
              ) : null}

              {equipo.descripcion || equipo.observaciones ? (
                <div
                  style={{
                    display: "grid",
                    gap: "0.6rem",
                    alignContent: "start",
                    padding: "0.85rem 0.95rem",
                    borderRadius: "14px",
                    background: "#F8FAFC",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                  }}
                >
                  {equipo.descripcion ? (
                    <div style={{ display: "grid", gap: "0.3rem" }}>
                      <Etiqueta>Descripción</Etiqueta>
                      <div style={{ color: "var(--text-secondary)", lineHeight: 1.5, fontSize: "0.95rem" }}>
                        {equipo.descripcion}
                      </div>
                    </div>
                  ) : null}
                  {equipo.observaciones ? (
                    <div style={{ display: "grid", gap: "0.3rem" }}>
                      <Etiqueta>Observaciones</Etiqueta>
                      <div style={{ color: "var(--text-secondary)", lineHeight: 1.5, fontSize: "0.95rem", whiteSpace: "pre-wrap" }}>
                        {equipo.observaciones}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="stack" style={{ gap: "0.5rem", marginTop: "1rem" }}>
            <h4 style={{ margin: 0 }}>Historial de préstamos</h4>
            {error ? <div className="state historico">{error}</div> : null}
            {cargando ? (
              <small style={{ color: "var(--text-secondary)" }}>Cargando…</small>
            ) : historial.length === 0 && !error ? (
              <small style={{ color: "var(--text-secondary)" }}>Este equipo nunca se ha prestado.</small>
            ) : (
              <div style={{ maxHeight: "34vh", overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "var(--text-secondary)" }}>
                      <th style={{ padding: "0.4rem 0.5rem" }}>Profesor</th>
                      <th style={{ padding: "0.4rem 0.5rem" }}>Salida</th>
                      <th style={{ padding: "0.4rem 0.5rem" }}>Retorno</th>
                      <th style={{ padding: "0.4rem 0.5rem" }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map(h => (
                      <tr key={h.id} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "0.45rem 0.5rem" }}>
                          {h.nombre_profe}
                          <small style={{ display: "block", color: "var(--text-secondary)" }}>{h.codigo_profe}</small>
                        </td>
                        <td style={{ padding: "0.45rem 0.5rem" }}>{formatSqliteDateTime(h.fecha_salida)}</td>
                        <td style={{ padding: "0.45rem 0.5rem" }}>
                          {h.fecha_retorno ? formatSqliteDateTime(h.fecha_retorno) : "—"}
                        </td>
                        <td style={{ padding: "0.45rem 0.5rem" }}>
                          <span className={`state ${h.estado_prestamo}`} style={{ width: "fit-content" }}>
                            {h.estado_prestamo}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="admin-dialog-actions">
            <button type="button" className="ghost" onClick={onClose} style={{ width: "auto", padding: "0.6rem 1rem" }}>
              Cerrar
            </button>
            <button type="button" onClick={() => onEditar(equipo)} style={{ width: "auto", padding: "0.6rem 1rem" }}>
              Editar equipo
            </button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
