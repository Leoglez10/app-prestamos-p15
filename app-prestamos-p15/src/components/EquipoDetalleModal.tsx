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
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { formatSqliteDateTime } from "../utils/datetime";
import { getHistorialEquipo, type Equipo, type HistorialEquipo } from "../hooks/useInventory";

type Props = {
  equipo: Equipo | null;
  onClose: () => void;
  onEditar: (equipo: Equipo) => void;
};

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: "0.15rem" }}>
      <small style={{ color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".04em", fontSize: "0.7rem" }}>
        {label}
      </small>
      <div>{children}</div>
    </div>
  );
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

          <div className="admin-dialog-cols">
            <div className="stack" style={{ gap: "0.9rem" }}>
              <Dato label="Categoría">{equipo.categoria_nombre}</Dato>
              <Dato label="Tipo de préstamo">
                <span className={`state ${equipo.es_prestable === 1 ? "activo" : "historico"}`} style={{ width: "fit-content" }}>
                  {equipo.es_prestable === 1 ? "Prestable" : "Solo inventario"}
                </span>
              </Dato>
              <Dato label="Disponibilidad">
                {equipo.es_granel === 1 ? (
                  <span style={{ fontWeight: 500, color: "var(--brand-primary)" }}>
                    {equipo.stock_disponible} / {equipo.stock_total} disponibles
                  </span>
                ) : (
                  <span className={`state ${equipo.estado}`} style={{ width: "fit-content" }}>{equipo.estado}</span>
                )}
              </Dato>
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
            </div>

            <div className="stack" style={{ gap: "0.9rem" }}>
              <Dato label="ID de Patrimonio (UdeG)">
                {equipo.id_patrimonial ? (
                  <code style={{ letterSpacing: ".08em", fontSize: "1.15rem" }}>{equipo.id_patrimonial}</code>
                ) : (
                  <span style={{ color: "var(--text-secondary)" }}>Sin etiqueta de Patrimonio</span>
                )}
              </Dato>
              {equipo.es_granel === 1 ? (
                <small style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  El granel no pasó por Patrimonio y no lleva etiqueta: esta fila cuenta unidades
                  intercambiables. Para saber cuál se llevó cada quien, regístralas por separado.
                </small>
              ) : null}
              {/* Los campos vacíos no se pintan: la mayoría del inventario solo
                  tendrá algunos, y una lista de guiones no dice nada. */}
              {equipo.marca || equipo.modelo ? (
                <Dato label="Marca y modelo">
                  {[equipo.marca, equipo.modelo].filter(Boolean).join(" · ")}
                </Dato>
              ) : null}
              {equipo.num_serie ? (
                <Dato label="Número de serie"><code>{equipo.num_serie}</code></Dato>
              ) : null}
              {equipo.ubicacion ? <Dato label="Ubicación">{equipo.ubicacion}</Dato> : null}
              {equipo.resguardante_nombre || equipo.resguardante_codigo ? (
                <Dato label="Resguardante">
                  {equipo.resguardante_nombre || "—"}
                  {equipo.resguardante_codigo ? (
                    <small style={{ display: "block", color: "var(--text-secondary)" }}>
                      {equipo.resguardante_codigo}
                    </small>
                  ) : null}
                </Dato>
              ) : null}
              {equipo.fecha_adquisicion ? (
                <Dato label="Fecha de adquisición">{equipo.fecha_adquisicion}</Dato>
              ) : null}
              {equipo.descripcion ? (
                <Dato label="Descripción">
                  <span style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>{equipo.descripcion}</span>
                </Dato>
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
