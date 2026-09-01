import { useState, useEffect, useCallback, useMemo, useDeferredValue, FormEvent, ChangeEvent, useRef, type MouseEvent as ReactMouseEvent } from "react";
import { Link } from "react-router-dom";
import logoP15 from "../../img/logo-p15.png";
import {
  Categoria,
  Equipo,
  Profesor,
  BackupInfo,
  createCategoria,
  createBackup,
  createEquipo,
  createProfesor,
  deleteCategoria,
  deleteEquipo,
  deleteAllReportes,
  deleteHistorialPrestamos,
  deleteProfesor,
  getBackups,
  getCategorias,
  getEquipos,
  getProfesores,
  getSettings,
  initializeInventoryDb,
  loginAdmin,
  openBackupsFolder,
  restoreBackupFromFile,
  restoreBackupFromPath,
  updateCategoria,
  updateEquipo,
  updatePrestamoObservacionesAdmin,
  updateProfesor,
  getReportePrestamos,
  // EXPERIMENT: fotos de devolución. Ver docs/QR_CELULAR.md para quitarlo.
  getPrestamosConFoto,
  getFotoRegreso,
  ReportePrestamo,
  devolverEquipo,
  marcarEquipoPerdido,
  deletePrestamo,
  updateSetting
} from "../hooks/useInventory";
import { esPrestableEfectivo } from "../utils/equipoFicha";
import "../App.css";
import { BACKUP_INTERVAL_OPTIONS, parseIntervalHours } from "../utils/backupSchedule";
import { formatSqliteDateTime } from "../utils/datetime";
import { html, buildPrintDocument, printHtmlDocument } from "../utils/print";
import { normalizarCodigoPatrimonial } from "../utils/codigoPatrimonial";

// Cuantas filas de inventario se pintan de un jalon. Ver `visibles`.
const FILAS_POR_PAGINA = 100;

import { Icon } from "../components/Icon";
// EXPERIMENT: phone access over the LAN. See docs/QR_CELULAR.md to remove.
import { RedCelularPanel } from "../components/RedCelularPanel";
import { EquipoDetalleModal } from "../components/EquipoDetalleModal";
import { TomaFisicaPanel } from "../components/TomaFisicaPanel";
import { EquipoFormDialog } from "../components/EquipoFormDialog";
import { useEscaneoGlobal } from "../hooks/useEscaneoGlobal";
import { useEntradaPistola } from "../hooks/usePistola";
import { confirmDialog, alertDialog } from "../utils/confirm";

const BACKUP_KIND_LABELS: Record<string, string> = {
  auto: "Automático",
  manual: "Manual",
  "pre-restore": "Previo a restaurar",
  otro: "Otro",
};

type PdfOptionItem = {
  key: string;
  label: string;
};

function PdfDesignerPanel({
  heading,
  subheading,
  title,
  subtitle,
  notes,
  onTitleChange,
  onSubtitleChange,
  onNotesChange,
  options,
  values,
  onToggle,
  actionLabel,
  accent = "linear-gradient(135deg, #0f172a, #1d4ed8)",
  previewLabel,
  previewValue,
  previewMeta,
  previewDocument,
  onAction,
}: {
  heading: string;
  subheading: string;
  title: string;
  subtitle: string;
  notes: string;
  onTitleChange: (value: string) => void;
  onSubtitleChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  options: PdfOptionItem[];
  values: Record<string, boolean>;
  onToggle: (key: string, checked: boolean) => void;
  actionLabel: string;
  accent?: string;
  previewLabel: string;
  previewValue: string;
  previewMeta: string;
  /** Full printable HTML. When provided, the panel shows a live render instead of the text summary. */
  previewDocument?: string;
  onAction: () => void;
}) {
  // The designer used to sit expanded at the top of every panel and ate most of
  // the viewport. It now lives behind a dialog, like the equipment form.
  const pdfDialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        className="ghost"
        onClick={() => pdfDialogRef.current?.showModal()}
        style={{ width: "auto", justifySelf: "start", padding: "0.75rem 1.1rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
      >
        <Icon name="clipboard" size="1rem" />
        {actionLabel}
      </button>

      <dialog ref={pdfDialogRef} className="admin-dialog is-wide">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
          <strong style={{ fontSize: "1rem" }}>{heading}</strong>
          <button
            type="button"
            className="admin-dialog-close"
            onClick={() => pdfDialogRef.current?.close()}
            aria-label="Cerrar"
          >
            <Icon name="x" size="1rem" />
          </button>
        </div>
        <div style={{ display: "grid", gap: "0.75rem" }}>
      <div
        style={{
          borderRadius: "16px",
          padding: "0.8rem",
          color: "white",
          background: `${accent}, radial-gradient(circle at top right, rgba(255,255,255,0.18), transparent 30%)`,
          boxShadow: "0 22px 48px rgba(15, 23, 42, 0.14)",
          display: "grid",
          gap: "0.7rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "0.9rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.82 }}>
              Configurador visual
            </div>
            <h3 style={{ margin: "0.18rem 0 0.08rem", fontSize: "0.96rem", lineHeight: 1.1 }}>{heading}</h3>
            <div style={{ color: "rgba(255,255,255,0.82)", lineHeight: 1.35, fontSize: "0.82rem" }}>{subheading}</div>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1.4fr auto",
            gap: "0.65rem",
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              borderRadius: "12px",
              padding: "0.65rem",
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.14)",
              display: "grid",
              gap: "0.22rem",
            }}
          >
            <div style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.8 }}>
              {previewLabel}
            </div>
            <strong style={{ fontSize: "0.9rem", lineHeight: 1.2 }}>{previewValue}</strong>
            <div style={{ color: "rgba(255,255,255,0.82)", fontSize: "0.76rem", lineHeight: 1.35 }}>{previewMeta}</div>
          </div>
          <div
            style={{
              borderRadius: "12px",
              padding: "0.65rem",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.14)",
              color: "rgba(255,255,255,0.82)",
              fontSize: "0.78rem",
              lineHeight: 1.45,
              display: "grid",
              alignItems: "center",
            }}
          >
            Ajusta el contenido del documento y genera el PDF solo cuando el diseño ya esté listo.
          </div>
          <button
            type="button"
            onClick={() => {
              pdfDialogRef.current?.close();
              onAction();
            }}
            style={{
              minWidth: "190px",
              padding: "0.68rem 0.95rem",
              borderRadius: "12px",
              border: "none",
              background: "rgba(255,255,255,0.92)",
              color: "#0f172a",
              fontWeight: 800,
              fontSize: "0.84rem",
              cursor: "pointer",
              boxShadow: "0 12px 28px rgba(15, 23, 42, 0.14)",
            }}
          >
            {actionLabel}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gap: "0.75rem" }}>
        <div
          style={{
            borderRadius: "16px",
            padding: "0.8rem",
            background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))",
            border: "1px solid rgba(148, 163, 184, 0.15)",
            display: "grid",
            gap: "0.65rem",
          }}
        >
          <div>
            <div style={{ fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--brand-primary)" }}>
              Elementos incluidos en el PDF
            </div>
          </div>
          <div className="admin-3col-grid">
            {options.map((option) => {
              const checked = values[option.key];
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => onToggle(option.key, !checked)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: "0.55rem",
                    padding: "0.58rem 0.8rem",
                    borderRadius: "14px",
                    border: checked ? "1px solid rgba(37, 99, 235, 0.26)" : "1px solid rgba(148, 163, 184, 0.18)",
                    background: checked ? "rgba(37, 99, 235, 0.08)" : "rgba(255,255,255,0.9)",
                    color: checked ? "#1d4ed8" : "var(--text-primary)",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    boxShadow: checked ? "0 12px 24px rgba(37, 99, 235, 0.08)" : "none",
                    minHeight: "44px",
                  }}
                >
                  <span
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "999px",
                      display: "grid",
                      placeItems: "center",
                      background: checked ? "#2563eb" : "rgba(148, 163, 184, 0.16)",
                      color: "white",
                      fontSize: "0.7rem",
                      fontWeight: 900,
                      flexShrink: 0,
                    }}
                  >
                    {checked ? <Icon name="check" size="0.62rem" strokeWidth={4} /> : null}
                  </span>
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            // The live preview needs the full width to render a page-shaped document.
            gridTemplateColumns: previewDocument ? "1fr" : "1fr 1fr",
            gap: "0.75rem",
            borderRadius: "16px",
            padding: "0.8rem",
            background: "linear-gradient(180deg, rgba(248,250,252,0.98), rgba(255,255,255,0.96))",
            border: "1px solid rgba(148, 163, 184, 0.15)",
          }}
        >
          <div style={{ display: "grid", gap: "0.55rem" }}>
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Título del documento"
              style={{ borderRadius: "12px", border: "1px solid rgba(148,163,184,0.2)", padding: "0.72rem 0.9rem" }}
            />
            <input
              type="text"
              value={subtitle}
              onChange={(e) => onSubtitleChange(e.target.value)}
              placeholder="Subtítulo o descripción"
              style={{ borderRadius: "12px", border: "1px solid rgba(148,163,184,0.2)", padding: "0.72rem 0.9rem" }}
            />
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Notas o conclusiones del PDF"
              rows={3}
              style={{ borderRadius: "12px", border: "1px solid rgba(148,163,184,0.2)", padding: "0.72rem 0.9rem", resize: "vertical" }}
            />
          </div>

          <div
            style={{
              borderRadius: "14px",
              padding: "0.8rem",
              background: "white",
              border: "1px solid rgba(148, 163, 184, 0.16)",
              display: "grid",
              alignContent: "start",
              gap: "0.6rem",
            }}
          >
            <div>
              <div style={{ fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--brand-primary)" }}>
                {previewDocument ? "Vista previa del documento" : "Vista previa textual"}
              </div>
            </div>
            {previewDocument ? (
              <iframe
                title="Vista previa del PDF"
                srcDoc={previewDocument}
                sandbox=""
                style={{
                  width: "100%",
                  height: "320px",
                  border: "1px solid rgba(148, 163, 184, 0.22)",
                  borderRadius: "10px",
                  background: "white",
                }}
              />
            ) : (
              <>
                <div>
                  <div style={{ fontSize: "1rem", fontWeight: 800, marginTop: "0.22rem" }}>{title || "Sin título"}</div>
                  <div style={{ color: "var(--text-secondary)", lineHeight: 1.45, marginTop: "0.2rem", fontSize: "0.9rem" }}>
                    {subtitle || "Agrega un subtítulo para describir mejor el documento."}
                  </div>
                </div>
                <div style={{ borderTop: "1px solid rgba(148, 163, 184, 0.14)", paddingTop: "0.65rem", color: "var(--text-secondary)", lineHeight: 1.5, fontSize: "0.9rem" }}>
                  {notes.trim() || "Las notas aparecerán aquí como cierre o contexto adicional del PDF."}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
        </div>
      </dialog>
    </>
  );
}

function InventarioPanel() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // El formulario completo es dueño de sus doce campos: acá solo se dice si está
  // abierto y qué equipo está editando. Ver `components/EquipoFormDialog.tsx`.
  const [editando, setEditando] = useState<Equipo | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  // El inventario de la prepa son miles de filas y la tabla no vive dentro de un
  // scroll virtual: pintarlas todas congela la pagina en cada tecla del buscador.
  const [visibles, setVisibles] = useState(FILAS_POR_PAGINA);
  const [sortKey, setSortKey] = useState<"nombre" | "categoria" | "estado">("nombre");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [quickNombre, setQuickNombre] = useState("");
  const [quickCategoria, setQuickCategoria] = useState("");
  const [formAbierto, setFormAbierto] = useState(false);
  const [detalleId, setDetalleId] = useState<number | null>(null);
  // Última etiqueta escaneada que no está en la base. Es la puerta al alta.
  const [escaneoHuerfano, setEscaneoHuerfano] = useState<string | null>(null);
  const [inventarioPdf, setInventarioPdf] = useState({
    title: "Inventario completo P15",
    subtitle: "Control general de equipos, disponibilidad y estado administrativo.",
    notes: "",
    includeLogo: true,
    includeSummary: true,
    includeFilters: true,
    includeIdentifier: true,
    includeCategory: true,
    includeLoanType: true,
    includeResponsible: true,
    includeStock: true,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [eqs, cats] = await Promise.all([getEquipos(), getCategorias()]);
      setEquipos(eqs);
      setCategorias(cats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleEditInit = (eq: Equipo) => {
    setEscaneoHuerfano(null);
    setEditando(eq);
    setFormAbierto(true);
  };

  const handleCancelEdit = () => {
    setFormAbierto(false);
    setEditando(null);
  };

  /** Alta. `conIdPatrimonial` llega cuando la abrió una etiqueta escaneada. */
  const handleNuevoEquipo = (conIdPatrimonial?: string) => {
    setEditando(null);
    setEscaneoHuerfano(conIdPatrimonial ?? null);
    setFormAbierto(true);
  };

  /**
   * La pistola apuntada a la pantalla, sin campo de escaneo: la etiqueta abre
   * la ficha del equipo. Es el gesto que ya se hace en la toma física, pero sin
   * abrir un recorrido, para cuando solo se quiere ver qué es un aparato.
   *
   * La búsqueda es contra `equipos`, que ya está en memoria: la tabla completa
   * se cargó al entrar y no hay razón para volver a la base por una fila.
   */
  const abrirPorEscaneo = (leido: string) => {
    const codigo = normalizarCodigoPatrimonial(leido);
    if (!codigo) return;

    const equipo = equipos.find(eq => eq.id_patrimonial === codigo);
    if (equipo) {
      setEscaneoHuerfano(null);
      setDetalleId(equipo.id);
      return;
    }

    setDetalleId(null);
    setEscaneoHuerfano(codigo);
  };

  // Mientras el formulario está abierto el teclado le pertenece a él: el código
  // que se dispare ahí va al campo de ID de Patrimonio, no a esto.
  useEscaneoGlobal(!formAbierto, abrirPorEscaneo);

  // Escanear con el cursor dentro del buscador: el código nuevo reemplaza al
  // viejo en vez de pegarse a él. Ver `useEntradaPistola`.
  const buscadorPistola = useEntradaPistola(setSearchTerm);

  // Name + category is the whole cost of adding one more unique item; the full
  // form stays for stock, serial numbers and kiosk visibility.
  const handleQuickAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!quickNombre.trim() || !quickCategoria) return;
    try {
      await createEquipo({
        nombre_equipo: quickNombre.trim(),
        identificador: null,
        id_patrimonial: null,
        categoria_id: Number(quickCategoria),
        es_prestable: 1,
        es_granel: 0,
        stock_total: 1,
      });
      setQuickNombre("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el equipo");
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog("¿Seguro que deseas eliminar este equipo?"))) return;
    try {
      await deleteEquipo(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar equipo");
    }
  };

  const handleForzarDevolucion = async (prestamoId: number, equipoId: number) => {
    if (!(await confirmDialog("¿Marcar este equipo como devuelto administrativamente?"))) return;
    try {
      await devolverEquipo(prestamoId, equipoId, "Devuelto por Admin", "Devolución registrada por el administrador.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al forzar devolución");
    }
  };

  const handleMarcarPerdido = async (prestamoId: number, equipoId: number) => {
    if (!(await confirmDialog("¿Seguro que deseas marcar este equipo como PERDIDO/NO DEVUELTO? Esto afectará al inventario."))) return;
    try {
      await marcarEquipoPerdido(prestamoId, equipoId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al marcar como perdido");
    }
  };

  // Search and category are applied before the status chips so each chip count
  // describes the current view; applying the status here too would make every
  // chip except the active one read 0.
  // Escanear en Admin tiene que ganarle al filtro por texto, igual que en el
  // kiosko: buscar el ID como subcadena puede pegarle al identificador de otro
  // equipo que contenga esos dígitos. Ver src/utils/codigoPatrimonial.ts.
  const codigoEscaneado = normalizarCodigoPatrimonial(searchTerm);
  const coincidenciaExacta = codigoEscaneado
    ? equipos.filter(eq => eq.id_patrimonial === codigoEscaneado)
    : [];

  const baseEquipos = coincidenciaExacta.length === 1 ? coincidenciaExacta : equipos.filter(eq => {
    const termino = searchTerm.trim().toLowerCase();
    // Marca, modelo y serie entran al buscador: con miles de filas llamadas
    // "COMPUTADORA", el modelo es lo único que distingue una de otra.
    const matchesSearch = !termino || [
      eq.nombre_equipo,
      eq.identificador,
      eq.id_patrimonial,
      eq.marca,
      eq.modelo,
      eq.num_serie,
      eq.ubicacion,
    ].some(campo => (campo ?? "").toLowerCase().includes(termino));
    const matchesCategory = filterCategory ? eq.categoria_id.toString() === filterCategory : true;
    return matchesSearch && matchesCategory;
  });

  // `prestable:` no es un estado sino una vista: con el inventario de Patrimonio
  // adentro, la mayoria de las filas son mobiliario que nunca se presta, y sin
  // esto no hay forma de mirar solo lo que si circula.
  const cumpleFiltro = (eq: Equipo, valor: string) => {
    if (!valor) return true;
    if (valor === "prestable:1") return esPrestableEfectivo(eq);
    if (valor === "prestable:0") return !esPrestableEfectivo(eq);
    return eq.estado === valor;
  };

  const statusChips = [
    { value: "", label: "Todos" },
    { value: "prestable:1", label: "Prestables" },
    { value: "prestable:0", label: "Solo inventario" },
    { value: "disponible", label: "Disponibles" },
    { value: "prestado", label: "Prestados" },
    { value: "extraviado", label: "Extraviados" },
    { value: "mantenimiento", label: "Mantenimiento" },
  ];

  const countForStatus = (value: string) =>
    value ? baseEquipos.filter(eq => cumpleFiltro(eq, value)).length : baseEquipos.length;

  const sortValue = (eq: Equipo) =>
    sortKey === "categoria" ? eq.categoria_nombre : sortKey === "estado" ? eq.estado : eq.nombre_equipo;

  const filteredEquipos = baseEquipos
    .filter(eq => cumpleFiltro(eq, filterStatus))
    .sort((a, b) => (sortDir === "asc" ? 1 : -1) * sortValue(a).localeCompare(sortValue(b), "es", { numeric: true }));

  // Al cambiar el filtro el conjunto es otro: seguir en la pagina 12 no tiene
  // sentido y ademas esconderia los primeros resultados.
  useEffect(() => {
    setVisibles(FILAS_POR_PAGINA);
  }, [searchTerm, filterCategory, filterStatus]);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir(current => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortArrow = (key: typeof sortKey) =>
    sortKey === key ? <span className="sort-arrow">{sortDir === "asc" ? "\u2191" : "\u2193"}</span> : null;

  // <details> keeps the menu open after the action fires, so each item closes
  // the menu it lives in.
  const closeRowMenu = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.currentTarget.closest("details")?.removeAttribute("open");
  };

  const hasActiveFilters = Boolean(searchTerm || filterCategory || filterStatus);

  const inventarioSummary = {
    disponibles: filteredEquipos.filter((equipo) => equipo.estado === "disponible").length,
    prestados: filteredEquipos.filter((equipo) => equipo.estado === "prestado").length,
    mantenimiento: filteredEquipos.filter((equipo) => equipo.estado === "mantenimiento").length,
    extraviados: filteredEquipos.filter((equipo) => equipo.estado === "extraviado").length,
    noPrestables: filteredEquipos.filter((equipo) => !esPrestableEfectivo(equipo)).length,
  };

  // Builds the PDF body. `rowLimit` trims the table for the on-screen preview so
  // typing in the designer stays responsive on large inventories; printing passes none.
  const buildInventarioBody = (rowLimit?: number): string => {
    const summaryCards = inventarioPdf.includeSummary ? `
      <div class="summary cols-5">
        ${[
          ["Disponibles", inventarioSummary.disponibles],
          ["Prestados", inventarioSummary.prestados],
          ["Mantenimiento", inventarioSummary.mantenimiento],
          ["Extraviados", inventarioSummary.extraviados],
          ["Solo inventario", inventarioSummary.noPrestables],
        ]
          .map(
            ([label, value]) => `
              <div class="card">
                <div class="label">${html(String(label))}</div>
                <div class="value">${html(String(value))}</div>
              </div>`,
          )
          .join("")}
      </div>
    ` : "";

    const filtersLine = inventarioPdf.includeFilters
      ? `<div class="meta"><strong>Filtros aplicados:</strong> búsqueda ${html(searchTerm || "ninguna")} | categoría ${html(
          filterCategory ? categorias.find((categoria) => categoria.id === Number(filterCategory))?.nombre || "seleccionada" : "todas",
        )} | estado ${html(filterStatus || "todos")}</div>`
      : "";

    const notesBlock = inventarioPdf.notes.trim()
      ? `<div class="notes">${html(inventarioPdf.notes)}</div>`
      : "";

    const visibleEquipos = rowLimit ? filteredEquipos.slice(0, rowLimit) : filteredEquipos;

    const rows = visibleEquipos
      .map((eq) => {
        const columns = [
          // Mismo criterio que la tabla: con cientos de equipos llamados igual,
          // el identificador solo no distingue nada.
          `<td>${html(eq.nombre_equipo)}${
            inventarioPdf.includeIdentifier
              ? `<br /><span class="muted">${html(
                  [eq.marca, eq.modelo, eq.identificador, eq.id_patrimonial].filter(Boolean).join(" · ") || "S/N"
                )}</span>`
              : ""
          }</td>`,
          inventarioPdf.includeCategory ? `<td>${html(eq.categoria_nombre)}</td>` : "",
          inventarioPdf.includeLoanType ? `<td>${html(esPrestableEfectivo(eq) ? "Prestable" : "Solo inventario")}</td>` : "",
          `<td>${html(eq.estado)}</td>`,
          inventarioPdf.includeResponsible ? `<td>${html(eq.prestamo_activo_profe || "-")}</td>` : "",
          inventarioPdf.includeStock ? `<td>${html(eq.es_granel === 1 ? `${eq.stock_disponible}/${eq.stock_total}` : "1")}</td>` : "",
        ]
          .filter(Boolean)
          .join("");

        return `<tr>${columns}</tr>`;
      })
      .join("");

    const headerColumns = [
      "<th>Equipo</th>",
      inventarioPdf.includeCategory ? "<th>Categoría</th>" : "",
      inventarioPdf.includeLoanType ? "<th>Préstamo</th>" : "",
      "<th>Estado</th>",
      inventarioPdf.includeResponsible ? "<th>Responsable actual</th>" : "",
      inventarioPdf.includeStock ? "<th>Stock</th>" : "",
    ]
      .filter(Boolean)
      .join("");

    const truncatedNotice =
      rowLimit && filteredEquipos.length > rowLimit
        ? `<tr><td colspan="${headerColumns.split("<th>").length - 1}" class="muted">Vista previa: mostrando ${rowLimit} de ${filteredEquipos.length} equipos. El PDF incluye todos.</td></tr>`
        : "";

    return `
        <div class="header">
          <div class="brand">
            ${inventarioPdf.includeLogo ? `<img src="${logoP15}" alt="P15" />` : ""}
            <div>
              <h1>${html(inventarioPdf.title || "Inventario completo P15")}</h1>
              <div class="muted">${html(inventarioPdf.subtitle)}</div>
            </div>
          </div>
          <div style="text-align:right;font-size:12px;">
            <div><strong>Generado:</strong> ${html(formatSqliteDateTime(new Date().toISOString()))}</div>
            <div><strong>Registros:</strong> ${html(String(filteredEquipos.length))}</div>
          </div>
        </div>
        ${summaryCards}
        ${filtersLine}
        ${notesBlock}
        <table>
          <thead><tr>${headerColumns}</tr></thead>
          <tbody>${rows}${truncatedNotice}</tbody>
        </table>
      `;
  };

  const handlePrintInventario = () => {
    printHtmlDocument(inventarioPdf.title || "Inventario completo P15", buildInventarioBody());
  };

  // useDeferredValue keeps the designer inputs snappy: the iframe catches up a tick later.
  const inventarioPreviewDocument = useDeferredValue(
    buildPrintDocument(inventarioPdf.title || "Inventario completo P15", buildInventarioBody(25)),
  );

  if (loading) return <div>Cargando inventario...</div>;

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: "2.5rem", margin: 0 }}>Gestión de Inventario</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
            Total: <strong>{filteredEquipos.length}</strong> equipos {filteredEquipos.length !== equipos.length && `(de ${equipos.length})`}
          </div>
        </div>
      </div>

      {error && <div className="feedback error">{error}</div>}

      <PdfDesignerPanel
        heading="Diseño del PDF de inventario"
        subheading="Personaliza el contenido, revisa la vista previa del documento y genera un PDF más claro antes de imprimir."
        title={inventarioPdf.title}
        subtitle={inventarioPdf.subtitle}
        notes={inventarioPdf.notes}
        onTitleChange={(value) => setInventarioPdf((current) => ({ ...current, title: value }))}
        onSubtitleChange={(value) => setInventarioPdf((current) => ({ ...current, subtitle: value }))}
        onNotesChange={(value) => setInventarioPdf((current) => ({ ...current, notes: value }))}
        options={[
          { key: "includeLogo", label: "Incluir logo" },
          { key: "includeSummary", label: "Incluir resumen" },
          { key: "includeFilters", label: "Incluir filtros usados" },
          { key: "includeIdentifier", label: "Incluir identificador" },
          { key: "includeCategory", label: "Incluir categoría" },
          { key: "includeLoanType", label: "Incluir tipo de préstamo" },
          { key: "includeResponsible", label: "Incluir responsable actual" },
          { key: "includeStock", label: "Incluir stock" },
        ]}
        values={inventarioPdf as unknown as Record<string, boolean>}
        onToggle={(key, checked) => setInventarioPdf((current) => ({ ...current, [key]: checked }))}
        actionLabel="Generar PDF de inventario"
        previewLabel="Resumen del documento"
        previewValue={`${filteredEquipos.length} equipos filtrados`}
        previewMeta={`${inventarioSummary.disponibles} disponibles · ${inventarioSummary.prestados} prestados · ${inventarioSummary.noPrestables} solo inventario`}
        previewDocument={inventarioPreviewDocument}
        onAction={handlePrintInventario}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {/* La pistola está escuchando siempre en esta pestaña; decirlo evita que
            alguien busque el campo de escaneo que aquí no existe. */}
        <span className="admin-escaneo-listo">
          <Icon name="barcode" size="1.05rem" />
          Dispara la pistola contra cualquier etiqueta para abrir su ficha.
        </span>
        <button
          type="button"
          onClick={() => handleNuevoEquipo()}
          style={{ width: 'auto', padding: '0.75rem 1.1rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
        >
          <Icon name="plus" size="1.05rem" />
          Nuevo equipo
        </button>
      </div>

      {escaneoHuerfano && (
        <div className="admin-escaneo-huerfano">
          <Icon name="alert" size="1.4rem" />
          <div>
            <strong><code>{escaneoHuerfano}</code> no existe en el inventario.</strong>
            <span>Nadie reclama esa etiqueta. Puedes darla de alta ahora mismo.</span>
          </div>
          <button type="button" onClick={() => handleNuevoEquipo(escaneoHuerfano)}>
            <Icon name="plus" size="1rem" /> Agregarlo como equipo nuevo
          </button>
          <button type="button" className="admin-escaneo-descartar" onClick={() => setEscaneoHuerfano(null)} aria-label="Descartar">
            <Icon name="x" size="1rem" />
          </button>
        </div>
      )}

      {/* Buscador y Filtros */}
      <div className="admin-filters">
        <div className="admin-filters-search">
          <Icon name="search" size="1.05rem" className="admin-filters-icon" />
          <input
            type="search"
            placeholder="Buscar por nombre o ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={buscadorPistola}
          />
        </div>
        <select
          className={filterCategory ? "is-active" : undefined}
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select
          className={filterStatus ? "is-active" : undefined}
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="prestable:1">Solo prestables</option>
          <option value="prestable:0">Solo inventario</option>
          <option value="disponible">Disponible</option>
          <option value="prestado">Prestado</option>
          <option value="extraviado">Extraviado</option>
          <option value="mantenimiento">Mantenimiento</option>
        </select>
        {hasActiveFilters && (
          <button
            type="button"
            className="admin-filters-clear"
            onClick={() => {
              setSearchTerm("");
              setFilterCategory("");
              setFilterStatus("");
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Status is the filter used most, so it gets one click instead of a select. */}
      <div className="admin-chips">
        {statusChips.map(chip => (
          <button
            key={chip.value || "todos"}
            type="button"
            className={`admin-chip${filterStatus === chip.value ? " is-active" : ""}`}
            onClick={() => setFilterStatus(chip.value)}
          >
            {chip.label}
            <span>{countForStatus(chip.value)}</span>
          </button>
        ))}
      </div>

      {/* The register/edit form used to sit in a permanent 350px column that took
          about half the shell from the table. It is only needed while editing.
          Header and actions are fixed; only the middle scrolls, so the primary
          action never floats on top of a field. */}
      <EquipoFormDialog
        abierto={formAbierto}
        editando={editando}
        categorias={categorias}
        prefill={escaneoHuerfano ? { id_patrimonial: escaneoHuerfano } : undefined}
        onCerrar={handleCancelEdit}
        onGuardado={async () => {
          // El aviso de la etiqueta huérfana se apaga acá y no al cerrar: si se
          // cancela el alta, esa etiqueta sigue sin existir y el aviso sigue
          // siendo cierto. Recién deja de serlo cuando la base la aceptó.
          setEscaneoHuerfano(null);
          handleCancelEdit();
          await loadData();
        }}
      />

      {/* The row menus are absolutely positioned, so the panel must not clip them. */}
      <div className="panel" style={{ padding: '0' }}>
          <table className="admin-table">
            <thead>
              <tr style={{ background: 'var(--surface-sunken)', borderBottom: '2px solid var(--border-subtle)' }}>
                <th className="sortable" style={{ padding: '0.85rem 1rem', width: '30%' }} onClick={() => toggleSort("nombre")}>
                  ID / Nombre{sortArrow("nombre")}
                </th>
                <th className="col-optional sortable" style={{ padding: '0.85rem 1rem', width: '17%' }} onClick={() => toggleSort("categoria")}>
                  Categoría{sortArrow("categoria")}
                </th>
                <th style={{ padding: '0.85rem 1rem', width: '15%' }}>Préstamo</th>
                <th className="sortable" style={{ padding: '0.85rem 1rem', width: '24%' }} onClick={() => toggleSort("estado")}>
                  Estado{sortArrow("estado")}
                </th>
                <th style={{ padding: '0.85rem 1rem', width: '14%', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr className="quick-add-row">
                <td colSpan={5}>
                  <form className="quick-add-form" onSubmit={handleQuickAdd}>
                    <Icon name="plus" size="1rem" />
                    <input
                      value={quickNombre}
                      onChange={e => setQuickNombre(e.target.value)}
                      placeholder="Alta rápida: nombre del equipo"
                      aria-label="Nombre del equipo nuevo"
                    />
                    <select
                      value={quickCategoria}
                      onChange={e => setQuickCategoria(e.target.value)}
                      aria-label="Categoría del equipo nuevo"
                    >
                      <option value="">Categoría...</option>
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                    <button type="submit" disabled={!quickNombre.trim() || !quickCategoria}>Agregar</button>
                  </form>
                </td>
              </tr>
              {filteredEquipos.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No hay equipos que coincidan con la búsqueda
                  </td>
                </tr>
              ) : null}
              {filteredEquipos.slice(0, visibles).map(eq => (
                <tr key={eq.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: editando?.id === eq.id ? 'var(--surface-sunken)' : 'transparent' }}>
                  <td style={{ padding: '0.55rem 1rem' }}>
                    <button type="button" className="row-link" onClick={() => setDetalleId(eq.id)}>
                      {eq.nombre_equipo}
                    </button>
                    {/* Con el inventario de Patrimonio adentro hay cientos de filas
                        llamadas igual ("COMPUTADORA PORTATIL"). La marca, el modelo y
                        el ID de la etiqueta son lo unico que distingue una de otra. */}
                    <br />
                    <small style={{ color: 'var(--text-secondary)' }}>
                      {eq.es_granel === 1
                        ? 'Granel'
                        : [eq.marca, eq.modelo, eq.identificador].filter(Boolean).join(' · ') || 'Sin datos'}
                    </small>
                    {eq.id_patrimonial ? (
                      <>
                        <br />
                        <small style={{ color: 'var(--text-secondary)', letterSpacing: '.04em' }}>
                          <code>{eq.id_patrimonial}</code>
                        </small>
                      </>
                    ) : null}
                  </td>
                  <td className="col-optional" style={{ padding: '0.55rem 1rem' }}>{eq.categoria_nombre}</td>
                  <td style={{ padding: '0.55rem 1rem' }}>
                    <span className={`state ${esPrestableEfectivo(eq) ? 'activo' : 'historico'}`} style={{ width: 'fit-content' }}>
                      {esPrestableEfectivo(eq) ? 'Prestable' : 'Solo inventario'}
                    </span>
                  </td>
                  <td style={{ padding: '0.55rem 1rem' }}>
                    {eq.es_granel === 1 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: '500', color: 'var(--brand-primary)' }}>
                          {eq.stock_disponible} / {eq.stock_total} disponibles
                        </span>
                        {eq.prestamo_activo_profe && (
                          <small style={{ color: 'var(--brand-primary)', fontWeight: '500' }}>
                            Con: {eq.prestamo_activo_profe}
                          </small>
                        )}
                        {eq.prestamo_activo_evento && (
                          <span className="evento-chip-inv" title={`Salió con el evento: ${eq.prestamo_activo_evento}`}>
                            <Icon name="mapPin" />
                            {eq.prestamo_activo_evento}
                          </span>
                        )}
                        {eq.stock_disponible === 0 && (
                          <small style={{ color: 'var(--danger-base)', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Icon name="alert" />
                            Agotado
                          </small>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span className={`state ${eq.estado}`} style={{ width: 'fit-content' }}>{eq.estado}</span>
                        {eq.estado === 'prestado' && eq.prestamo_activo_profe && (
                          <small style={{ color: 'var(--brand-primary)', fontWeight: '500' }}>
                            A: {eq.prestamo_activo_profe}
                          </small>
                        )}
                        {/* Salió con un evento, no con un préstamo suelto. El violeta
                            es la misma señal que usa la tabla de Préstamo Rápido. */}
                        {eq.prestamo_activo_evento && (
                          <span className="evento-chip-inv" title={`Salió con el evento: ${eq.prestamo_activo_evento}`}>
                            <Icon name="mapPin" />
                            {eq.prestamo_activo_evento}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.55rem 1rem' }}>
                    <div className="row-actions">
                      {eq.es_granel === 0 && eq.estado === 'prestado' && eq.prestamo_activo_id && (
                        <button
                          type="button"
                          className="row-action-primary"
                          onClick={() => handleForzarDevolucion(eq.prestamo_activo_id!, eq.id)}
                        >
                          Devolver
                        </button>
                      )}
                      {/* name= lets the browser close any other open row menu. */}
                      <details className="row-menu" name="admin-row-menu">
                        <summary aria-label={`Acciones para ${eq.nombre_equipo}`}>
                          <Icon name="more" size="1.15rem" />
                        </summary>
                        <div className="row-menu-list">
                          <button type="button" onClick={(event) => { closeRowMenu(event); setDetalleId(eq.id); }}>
                            Ver detalle
                          </button>
                          <button type="button" onClick={(event) => { closeRowMenu(event); handleEditInit(eq); }}>
                            Editar equipo
                          </button>
                          {eq.es_granel === 0 && eq.estado === 'prestado' && eq.prestamo_activo_id && (
                            <button type="button" onClick={(event) => { closeRowMenu(event); handleMarcarPerdido(eq.prestamo_activo_id!, eq.id); }}>
                              Marcar como perdido
                            </button>
                          )}
                          <button type="button" className="danger" onClick={(event) => { closeRowMenu(event); handleDelete(eq.id); }}>
                            Eliminar
                          </button>
                        </div>
                      </details>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEquipos.length > visibles && (
                <tr>
                  <td colSpan={5} style={{ padding: '1.1rem', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
                      Mostrando {visibles} de {filteredEquipos.length} equipos
                    </div>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => setVisibles(actual => actual + FILAS_POR_PAGINA)}
                      style={{ width: 'auto', padding: '0.6rem 1.2rem' }}
                    >
                      Mostrar {Math.min(FILAS_POR_PAGINA, filteredEquipos.length - visibles)} más
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
      </div>

      <EquipoDetalleModal
        equipo={detalleId === null ? null : equipos.find(eq => eq.id === detalleId) ?? null}
        onClose={() => setDetalleId(null)}
        onEditar={(eq) => { setDetalleId(null); handleEditInit(eq); }}
      />
    </section>
  );
}

/**
 * Primer préstamo del grupo que tenga foto, o null.
 *
 * Una fila del reporte agrupa varios préstamos (ver `ids` en `ReportePrestamo`),
 * así que hay que revisarlos todos y no solo el que se muestra.
 */
function idConFoto(ids: string | null, conFoto: Set<number>): number | null {
  if (!ids) return null;
  for (const parte of ids.split(",")) {
    const id = Number(parte);
    if (conFoto.has(id)) return id;
  }
  return null;
}

/**
 * Identifica una fila del reporte sin importar de que tabla salio. `id` solo es
 * unico DENTRO de su tabla: `prestamos` #7 y un prestamo rapido de texto libre
 * #7 conviven en la misma lista, asi que la llave lleva el origen adelante.
 */
const claveReporte = (reporte: ReportePrestamo) => `${reporte.fuente}:${reporte.id}`;

function ReportesPanel() {
  // EXPERIMENT: fotos de devolución. Ver docs/QR_CELULAR.md para quitarlo.
  const [conFoto, setConFoto] = useState<Set<number>>(new Set());
  const [fotoAbierta, setFotoAbierta] = useState<string | null>(null);
  const [reportes, setReportes] = useState<ReportePrestamo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [editingObservacionKey, setEditingObservacionKey] = useState<string | null>(null);
  const [adminCondicion, setAdminCondicion] = useState("");
  const [adminNotas, setAdminNotas] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reportePdf, setReportePdf] = useState({
    title: "Reporte de préstamos P15",
    subtitle: "Historial detallado de préstamos, devoluciones y observaciones administrativas.",
    notes: "",
    includeLogo: true,
    includeSummary: true,
    includeFilters: true,
    includeProfessorCode: true,
    includeCategory: true,
    includeProfessorObservations: true,
    includeReturnCondition: true,
    includeAdminObservations: true,
  });

  const loadReportes = useCallback(async () => {
    const isFirstLoad = reportes.length === 0;
    try {
      if (isFirstLoad) {
        setLoading(true);
      } else {
        setIsSearching(true);
      }
      const data = await getReportePrestamos({
        busqueda: debouncedSearch,
        estado: estadoFiltro,
        categoriaId: categoriaFiltro ? Number(categoriaFiltro) : null,
        fechaDesde,
        fechaHasta,
        limit: 1000,
      });
      setReportes(data);
      // Solo los ids: la imagen se pide al abrirla.
      setConFoto(await getPrestamosConFoto());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar reportes");
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  }, [debouncedSearch, estadoFiltro, categoriaFiltro, fechaDesde, fechaHasta, reportes.length]);

  const resetObservaciones = () => {
    setEditingObservacionKey(null);
    setAdminCondicion("");
    setAdminNotas("");
  };

  const handleDelete = async (prestamoId: number) => {
    if (!(await confirmDialog("¿Seguro que deseas eliminar este registro de préstamo histórico?"))) return;
    if (!(await confirmDialog("Esta acción es irreversible y el registro desaparecera permanentemente. ¿Estás absolutamente seguro?"))) return;

    try {
      await deletePrestamo(prestamoId);
      await loadReportes();
    } catch (err) {
      await alertDialog("Error al eliminar el registro: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleEditObservaciones = (reporte: ReportePrestamo) => {
    setEditingObservacionKey(claveReporte(reporte));
    setAdminCondicion(reporte.admin_condicion_entrega || "");
    setAdminNotas(reporte.admin_notas_retorno || "");
  };

  const handleSaveObservaciones = async (prestamoId: number) => {
    try {
      await updatePrestamoObservacionesAdmin(prestamoId, adminCondicion, adminNotas);
      resetObservaciones();
      await loadReportes();
    } catch (err) {
      await alertDialog("Error al guardar observaciones: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 350);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  useEffect(() => {
    getCategorias().then(setCategorias).catch(() => {});
  }, []);

  useEffect(() => {
    void loadReportes();
  }, [loadReportes]);

  // Builds the PDF body. `rowLimit` trims the table for the on-screen preview so
  // typing in the designer stays responsive on large histories; printing passes none.
  const buildReportesBody = (rowLimit?: number): string => {
    const summaryCards = reportePdf.includeSummary ? `
      <div class="summary cols-5">
        ${[
          ["Activos", reportesSummary.activos],
          ["Devueltos", reportesSummary.devueltos],
          ["Históricos", reportesSummary.historicos],
          ["Con obs. admin", reportesSummary.conObsAdmin],
          ["Total items", reportesSummary.totalItems],
        ]
          .map(
            ([label, value]) => `
              <div class="card">
                <div class="label">${html(String(label))}</div>
                <div class="value">${html(String(value))}</div>
              </div>`,
          )
          .join("")}
      </div>
    ` : "";

    const filtersLine = reportePdf.includeFilters
      ? `<div class="meta"><strong>Filtros aplicados:</strong> estado ${html(estadoFiltro || "todos")} | categoría ${html(
          categoriaFiltro ? categorias.find((categoria) => categoria.id === Number(categoriaFiltro))?.nombre || "seleccionada" : "todas",
        )} | desde ${html(fechaDesde || "inicio")} | hasta ${html(fechaHasta || "hoy")} | búsqueda ${html(searchTerm || "ninguna")}</div>`
      : "";

    const notesBlock = reportePdf.notes.trim()
      ? `<div class="notes">${html(reportePdf.notes)}</div>`
      : "";

    const headerColumns = [
      "<th>Profesor</th>",
      "<th>Equipo</th>",
      "<th>Salida</th>",
      "<th>Retorno</th>",
      "<th>Estado</th>",
      reportePdf.includeProfessorObservations ? "<th>Obs. profesor</th>" : "",
      reportePdf.includeReturnCondition ? "<th>Condición devolución</th>" : "",
      reportePdf.includeAdminObservations ? "<th>Obs. Admin</th>" : "",
    ]
      .filter(Boolean)
      .join("");

    const visibleReportes = rowLimit ? reportes.slice(0, rowLimit) : reportes;
    const truncatedNotice =
      rowLimit && reportes.length > rowLimit
        ? `<tr><td colspan="${headerColumns.split("<th>").length - 1}" class="muted">Vista previa: mostrando ${rowLimit} de ${reportes.length} registros. El PDF incluye todos.</td></tr>`
        : "";

    const rows = visibleReportes
      .map((reporte) => {
        const columns = [
          `<td>${html(reporte.nombre_profe)}${reportePdf.includeProfessorCode ? `<br /><span class="muted">${html(reporte.codigo_profe)}</span>` : ""}</td>`,
          `<td>${html(reporte.nombre_equipo)}${reporte.cantidad_prestada > 1 ? `<span style="color:#16a34a;font-weight:700;"> ×${reporte.cantidad_prestada}</span>` : ""}${reportePdf.includeCategory ? `<br /><span class="muted">${html(reporte.categoria_nombre)}</span>` : ""}${reporte.es_rapido ? `<br /><span style="color:#b45309;font-weight:700;font-size:10px;">PRÉSTAMO RÁPIDO${reporte.fuente === "rapido" ? " · SIN INVENTARIO" : ""}</span>` : ""}</td>`,
          `<td>${html(formatSqliteDateTime(reporte.fecha_salida))}</td>`,
          `<td>${html(formatSqliteDateTime(reporte.fecha_retorno))}</td>`,
          `<td>${html(reporte.estado_prestamo)}</td>`,
          reportePdf.includeProfessorObservations ? `<td>${html(reporte.observaciones_entrega || "-")}</td>` : "",
          reportePdf.includeReturnCondition ? `<td>${html(reporte.condicion_regreso || "-")}</td>` : "",
          reportePdf.includeAdminObservations
            ? `<td>${html(reporte.admin_condicion_entrega || "-")}${reporte.admin_notas_retorno ? `<br /><span class="muted">${html(reporte.admin_notas_retorno)}</span>` : ""}</td>`
            : "",
        ]
          .filter(Boolean)
          .join("");

        return `<tr>${columns}</tr>`;
      })
      .join("");

    return `
        <div class="header">
          <div class="brand">
            ${reportePdf.includeLogo ? `<img src="${logoP15}" alt="P15" />` : ""}
            <div>
              <h1>${html(reportePdf.title || "Reporte de préstamos P15")}</h1>
              <div class="muted">${html(reportePdf.subtitle)}</div>
            </div>
          </div>
          <div style="text-align:right;font-size:12px;">
            <div><strong>Generado:</strong> ${html(formatSqliteDateTime(new Date().toISOString()))}</div>
            <div><strong>Registros:</strong> ${html(String(reportes.length))}</div>
          </div>
        </div>
        ${summaryCards}
        ${filtersLine}
        ${notesBlock}
        <table>
          <thead><tr>${headerColumns}</tr></thead>
          <tbody>${rows}${truncatedNotice}</tbody>
        </table>
      `;
  };

  const handlePrintReportes = () => {
    printHtmlDocument(reportePdf.title || "Reporte de préstamos P15", buildReportesBody());
  };

  const reportesSummary = useMemo(() => ({
    activos: reportes.filter((reporte) => reporte.estado_prestamo === "activo").length,
    devueltos: reportes.filter((reporte) => reporte.estado_prestamo === "devuelto").length,
    historicos: reportes.filter((reporte) => reporte.estado_prestamo === "historico").length,
    conObsAdmin: reportes.filter((reporte) => Boolean(reporte.admin_condicion_entrega || reporte.admin_notas_retorno)).length,
    totalItems: reportes.reduce((sum, r) => sum + (r.cantidad_prestada || 1), 0),
  }), [reportes]);

  // useDeferredValue keeps the designer inputs snappy: the iframe catches up a tick later.
  const reportesPreviewDocument = useDeferredValue(
    buildPrintDocument(reportePdf.title || "Reporte de préstamos P15", buildReportesBody(25)),
  );

  if (loading) return <div>Cargando reportes...</div>;

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <PdfDesignerPanel
        heading="Diseño del PDF de reportes"
        subheading="Ajusta el contenido del historial antes de generar el documento final para dirección o seguimiento interno."
        title={reportePdf.title}
        subtitle={reportePdf.subtitle}
        notes={reportePdf.notes}
        onTitleChange={(value) => setReportePdf((current) => ({ ...current, title: value }))}
        onSubtitleChange={(value) => setReportePdf((current) => ({ ...current, subtitle: value }))}
        onNotesChange={(value) => setReportePdf((current) => ({ ...current, notes: value }))}
        options={[
          { key: "includeLogo", label: "Incluir logo" },
          { key: "includeSummary", label: "Incluir resumen" },
          { key: "includeFilters", label: "Incluir filtros usados" },
          { key: "includeProfessorCode", label: "Incluir código profesor" },
          { key: "includeCategory", label: "Incluir categoría" },
          { key: "includeProfessorObservations", label: "Incluir obs. profesor" },
          { key: "includeReturnCondition", label: "Incluir condición devolución" },
          { key: "includeAdminObservations", label: "Incluir observaciones admin" },
        ]}
        values={reportePdf as unknown as Record<string, boolean>}
        onToggle={(key, checked) => setReportePdf((current) => ({ ...current, [key]: checked }))}
        actionLabel="Generar PDF de reportes"
        accent="linear-gradient(135deg, #1f2937, #0f766e)"
        previewLabel="Panorama del historial"
        previewValue={`${reportes.length} registros listos`}
        previewMeta={`${reportesSummary.activos} activos · ${reportesSummary.devueltos} devueltos · ${reportesSummary.conObsAdmin} con observaciones admin`}
        previewDocument={reportesPreviewDocument}
        onAction={handlePrintReportes}
      />

      <div className="panel" style={{ display: 'grid', gap: '0.8rem' }}>
        <div className="admin-form-grid">
          <input
            type="text"
            placeholder="Buscar profesor, código, equipo o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className={estadoFiltro ? "is-active" : undefined}
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="devuelto">Devuelto</option>
            <option value="historico">Histórico</option>
          </select>
          <select
            className={categoriaFiltro ? "is-active" : undefined}
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
            ))}
          </select>
          <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
          <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          {reportes.length} registro(s) en historial
        </div>
      </div>

      <div className="panel" style={{ padding: '0', overflowX: 'auto', position: 'relative' }}>
        {isSearching && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255,255,255,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            borderRadius: 'inherit',
          }}>
            <div style={{
              width: 28,
              height: 28,
              border: '3px solid var(--border-subtle)',
              borderTopColor: '#0f766e',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        )}
        {error && <div className="feedback error" style={{ margin: '1rem' }}>{error}</div>}
          <table className="admin-table">
            <thead>
              <tr style={{ background: 'var(--surface-sunken)', borderBottom: '2px solid var(--border-subtle)' }}>
                <th className="col-optional" style={{ padding: '0.75rem 0.65rem', width: '7%' }}>ID</th>
                <th style={{ padding: '0.75rem 0.65rem', width: '16%' }}>Profesor</th>
                <th style={{ padding: '0.75rem 0.65rem', width: '16%' }}>Equipo</th>
                <th style={{ padding: '0.75rem 0.65rem', width: '19%' }}>Movimiento</th>
                <th style={{ padding: '0.75rem 0.65rem', width: '33%' }}>Observaciones</th>
                <th style={{ padding: '0.75rem 0.65rem', width: '10%', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {reportes.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay reportes de préstamos</td>
                </tr>
              ) : null}
              {reportes.map(r => (
                <tr key={claveReporte(r)} style={{ borderBottom: '1px solid var(--border-subtle)', background: r.estado_prestamo === 'historico' ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                  <td className="col-optional" style={{ padding: '0.75rem 0.65rem', verticalAlign: 'top' }}>
                    <strong style={{ fontSize: '0.88rem' }}>#{r.id}</strong>
                  </td>
                  <td style={{ padding: '0.75rem 0.65rem', verticalAlign: 'top' }}>
                    <strong style={{ fontSize: '0.92rem', lineHeight: 1.35 }}>{r.nombre_profe}</strong>
                    <br />
                    <small style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{r.codigo_profe}</small>
                  </td>
                  <td style={{ padding: '0.75rem 0.65rem', verticalAlign: 'top' }}>
                    <strong style={{ fontSize: '0.92rem', lineHeight: 1.35 }}>{r.nombre_equipo}</strong>
                    <br />
                    <small style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{r.categoria_nombre}</small>
                    {r.es_rapido ? (
                      <>
                        <br />
                        <span
                          title={r.fuente === 'rapido'
                            ? 'Registrado en Préstamo Rápido, sin objeto del inventario'
                            : 'Registrado desde Préstamo Rápido'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            marginTop: '0.25rem',
                            padding: '0.12rem 0.42rem',
                            borderRadius: '999px',
                            background: 'rgba(217, 119, 6, 0.14)',
                            color: '#b45309',
                            fontSize: '0.66rem',
                            fontWeight: 800,
                            letterSpacing: '0.03em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Préstamo rápido{r.fuente === 'rapido' ? ' · sin inventario' : ''}
                        </span>
                      </>
                    ) : null}
                  </td>
                  <td style={{ padding: '0.75rem 0.65rem', verticalAlign: 'top' }}>
                    <div style={{ display: 'grid', gap: '0.45rem' }}>
                      <div style={{ display: 'grid', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                          Salida
                        </span>
                        <small style={{ lineHeight: 1.35 }}>{formatSqliteDateTime(r.fecha_salida)}</small>
                      </div>
                      <div style={{ display: 'grid', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                          Devolución
                        </span>
                        {r.fecha_retorno ? (
                          <>
                            <small style={{ lineHeight: 1.35 }}>{formatSqliteDateTime(r.fecha_retorno)}</small>
                            {r.condicion_regreso ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                width: 'fit-content',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '999px',
                                background: 'rgba(15, 118, 110, 0.12)',
                                color: '#0f766e',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                              }}>
                                {r.condicion_regreso}
                              </span>
                            ) : null}
                            {/* EXPERIMENT: fotos de devolución. Ver docs/QR_CELULAR.md para quitarlo. */}
                            {/* `r.id` es el MIN del grupo, no un préstamo concreto:
                                la foto puede estar en cualquiera de los agrupados. */}
                            {idConFoto(r.ids, conFoto) !== null ? (
                              <button
                                type="button"
                                className="ghost"
                                onClick={() => void getFotoRegreso(idConFoto(r.ids, conFoto)!).then(setFotoAbierta)}
                                style={{
                                  width: 'fit-content',
                                  padding: '0.2rem 0.5rem',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                }}
                              >
                                <Icon name="search" size="0.75rem" />
                                Ver foto
                              </button>
                            ) : null}
                          </>
                        ) : (
                          <small style={{ color: 'var(--text-secondary)' }}>Pendiente</small>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 0.65rem', verticalAlign: 'top' }}>
                    {editingObservacionKey === claveReporte(r) ? (
                      <div style={{ display: 'grid', gap: '0.5rem' }}>
                        <input
                          type="text"
                          value={adminCondicion}
                          onChange={(e) => setAdminCondicion(e.target.value)}
                          placeholder="Ej. Regresó completo"
                        />
                        <textarea
                          value={adminNotas}
                          onChange={(e) => setAdminNotas(e.target.value)}
                          placeholder="Observaciones internas para reportes"
                          rows={3}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button type="button" onClick={() => void handleSaveObservaciones(r.id)} style={{ width: 'auto', padding: '0.45rem 0.7rem' }}>
                            Guardar
                          </button>
                          <button type="button" className="ghost" onClick={resetObservaciones} style={{ width: 'auto', padding: '0.45rem 0.7rem' }}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: '0.55rem' }}>
                        <div style={{ display: 'grid', gap: '0.15rem' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#1d4ed8' }}>
                            Profesor
                          </span>
                          <small style={{ color: r.observaciones_entrega ? 'var(--text-primary)' : 'var(--text-secondary)', lineHeight: 1.4 }}>
                            {r.observaciones_entrega || 'Sin observación del profesor'}
                          </small>
                        </div>
                        <div style={{ display: 'grid', gap: '0.15rem' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                            Admin
                          </span>
                          <small style={{ color: 'var(--text-primary)', lineHeight: 1.4 }}>
                            {r.admin_condicion_entrega || 'Sin observación interna'}
                          </small>
                          {r.admin_notas_retorno ? (
                            <small style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>{r.admin_notas_retorno}</small>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 0.65rem', textAlign: 'right', verticalAlign: 'top' }}>
                    <div style={{ display: 'grid', justifyItems: 'end', gap: '0.35rem' }}>
                      {/* Un préstamo rápido de texto libre no tiene fila en `prestamos`:
                          editarlo o borrarlo desde aquí no escribiría en ningún lado.
                          Se administra desde la pantalla de Préstamo Rápido. */}
                      {r.fuente === 'prestamo' && r.estado_prestamo !== 'activo' && editingObservacionKey !== claveReporte(r) && (
                        <button
                          onClick={() => handleEditObservaciones(r)}
                          style={{ width: '100%', maxWidth: '92px', minWidth: '0', padding: '0.32rem 0.45rem', fontSize: '0.73rem', borderRadius: '6px', color: 'white', border: 'none', fontWeight: 'bold', background: 'var(--brand-primary)', whiteSpace: 'nowrap' }}>
                          Editar
                        </button>
                      )}
                      {r.fuente === 'prestamo' && r.estado_prestamo !== 'activo' && (
                        <button
                          onClick={() => handleDelete(r.id)}
                          style={{ width: '100%', maxWidth: '92px', minWidth: '0', padding: '0.32rem 0.45rem', fontSize: '0.73rem', borderRadius: '6px', color: 'white', border: 'none', fontWeight: 'bold', background: 'var(--danger-base)', whiteSpace: 'nowrap' }}>
                          Borrar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>

      {/* EXPERIMENT: fotos de devolución. Ver docs/QR_CELULAR.md para quitarlo. */}
      {fotoAbierta ? (
        <div
          onClick={() => setFotoAbierta(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            display: 'grid',
            placeItems: 'center',
            padding: '2rem',
            zIndex: 60,
            cursor: 'zoom-out',
          }}
        >
          <img
            src={fotoAbierta}
            alt="Foto de la devolución"
            style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '14px', boxShadow: '0 10px 40px rgba(0,0,0,.4)' }}
          />
        </div>
      ) : null}
    </div>
  );
}

function CategoriasPanel() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [nombre, setNombre] = useState("");
  const [esPrestableCategoria, setEsPrestableCategoria] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [equiposCategoria, setEquiposCategoria] = useState<Equipo[]>([]);
  const [loadingEquiposCategoria, setLoadingEquiposCategoria] = useState(false);
  const [editingEquipoId, setEditingEquipoId] = useState<number | null>(null);
  const [equipoNombre, setEquipoNombre] = useState("");
  const [equipoIdentificador, setEquipoIdentificador] = useState("");
  const [equipoEstado, setEquipoEstado] = useState("disponible");
  const [equipoEsPrestable, setEquipoEsPrestable] = useState(true);
  const [equipoEsGranel, setEquipoEsGranel] = useState(false);
  const [equipoStockTotal, setEquipoStockTotal] = useState("1");
  const [savingLoanabilityId, setSavingLoanabilityId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadEquiposCategoria = async (categoriaId: number) => {
    try {
      setLoadingEquiposCategoria(true);
      const rows = await getEquipos(categoriaId);
      setEquiposCategoria(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los equipos de la categoría.");
    } finally {
      setLoadingEquiposCategoria(false);
    }
  };

  const loadCategorias = async () => {
    try {
      setLoading(true);
      const rows = await getCategorias();
      setCategorias(rows);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las categorías.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCategorias();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    try {
      if (editingId) {
        await updateCategoria(editingId, nombre, esPrestableCategoria);
        await loadCategorias();
        await loadEquiposCategoria(editingId);
      } else {
        await createCategoria(nombre, esPrestableCategoria);
        await loadCategorias();
        setNombre("");
        setEsPrestableCategoria(true);
      }
      if (!editingId) {
        setEditingId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la categoría.");
    }
  };

  const handleEdit = async (categoria: Categoria) => {
    setEditingId(categoria.id);
    setNombre(categoria.nombre);
    setEsPrestableCategoria(categoria.es_prestable === 1);
    setEditingEquipoId(null);
    setEquipoNombre("");
    setEquipoIdentificador("");
    await loadEquiposCategoria(categoria.id);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNombre("");
    setEsPrestableCategoria(true);
    setEquiposCategoria([]);
    setEditingEquipoId(null);
    setEquipoNombre("");
    setEquipoIdentificador("");
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog("¿Seguro que deseas eliminar esta categoría?"))) return;
    try {
      await deleteCategoria(id);
      await loadCategorias();
      if (editingId === id) {
        handleCancelEdit();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la categoría.");
    }
  };

  const handleToggleLoanability = async (categoria: Categoria) => {
    const esPrestable = categoria.es_prestable === 1;

    try {
      setSavingLoanabilityId(categoria.id);
      setError("");
      await updateCategoria(categoria.id, categoria.nombre, !esPrestable);
      await loadCategorias();

      // Evita que un formulario de edición ya abierto vuelva a guardar el valor
      // anterior y deshaga el cambio directo de la tabla.
      if (editingId === categoria.id) {
        setEsPrestableCategoria(!esPrestable);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar el tipo de préstamo de la categoría.");
    } finally {
      setSavingLoanabilityId(null);
    }
  };

  const handleEditEquipo = (eq: Equipo) => {
    setEditingEquipoId(eq.id);
    setEquipoNombre(eq.nombre_equipo);
    setEquipoIdentificador(eq.identificador ?? "");
    setEquipoEstado(eq.estado);
    setEquipoEsPrestable(eq.es_prestable === 1);
    setEquipoEsGranel(eq.es_granel === 1);
    setEquipoStockTotal(String(eq.stock_total || 1));
  };

  const handleCancelEditEquipo = () => {
    setEditingEquipoId(null);
    setEquipoNombre("");
    setEquipoIdentificador("");
    setEquipoEstado("disponible");
    setEquipoEsPrestable(true);
    setEquipoEsGranel(false);
    setEquipoStockTotal("1");
  };

  const handleSaveEquipo = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingId || !editingEquipoId || !equipoNombre.trim()) return;

    // Este panel no toca la ficha de Patrimonio, y no hace falta arrastrarla:
    // `updateEquipo` solo escribe las claves que recibe.
    try {
      await updateEquipo(editingEquipoId, {
        nombre_equipo: equipoNombre,
        identificador: equipoEsGranel ? null : (equipoIdentificador.trim() || null),
        categoria_id: editingId,
        estado: equipoEstado,
        es_prestable: equipoEsPrestable ? 1 : 0,
        es_granel: equipoEsGranel ? 1 : 0,
        stock_total: equipoEsGranel ? Math.max(1, Number(equipoStockTotal) || 1) : 1,
      });
      await loadEquiposCategoria(editingId);
      handleCancelEditEquipo();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el equipo.");
    }
  };

  const filteredCategorias = categorias.filter((c) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return c.nombre.toLowerCase().includes(term);
  });

  return (
    <section>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "1.2rem" }}>Categorías</h1>

      <div className="panel" style={{ marginBottom: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>{editingId ? "Editar Categoría" : "Agregar Categoría"}</h3>
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Nombre de la categoría"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            style={{ flex: 1, minWidth: "280px" }}
            required
          />
          <button
            type="button"
            onClick={() => setEsPrestableCategoria((current) => !current)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.65rem",
              minWidth: "230px",
              padding: "0.62rem 0.8rem",
              borderRadius: "12px",
              border: esPrestableCategoria ? "1px solid rgba(34, 197, 94, 0.28)" : "1px solid rgba(148, 163, 184, 0.18)",
              background: esPrestableCategoria ? "rgba(34, 197, 94, 0.08)" : "rgba(255,255,255,0.92)",
              cursor: "pointer",
              textAlign: "left",
              boxShadow: esPrestableCategoria ? "0 12px 24px rgba(34, 197, 94, 0.08)" : "none",
            }}
            aria-pressed={esPrestableCategoria}
          >
            <div style={{ display: "grid", gap: "0.15rem" }}>
              <strong style={{ color: "var(--text-primary)", fontSize: "0.92rem" }}>Prestable en kiosko</strong>
              <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                {esPrestableCategoria ? "Visible para profesores" : "Solo inventario"}
              </span>
            </div>
            <span
              style={{
                minWidth: "56px",
                padding: "0.32rem 0.6rem",
                borderRadius: "999px",
                background: esPrestableCategoria ? "var(--success-base)" : "rgba(148, 163, 184, 0.24)",
                color: esPrestableCategoria ? "white" : "var(--text-secondary)",
                fontWeight: 800,
                fontSize: "0.78rem",
                textAlign: "center",
              }}
            >
              {esPrestableCategoria ? "Activo" : "Oculto"}
            </span>
          </button>
          <button type="submit" style={{ width: "auto", padding: "0.55rem 0.85rem", fontSize: "0.88rem" }}>
            {editingId ? "Guardar" : "Agregar"}
          </button>
          {editingId && (
            <button type="button" className="ghost" onClick={handleCancelEdit} style={{ width: "auto", padding: "0.55rem 0.85rem", fontSize: "0.88rem" }}>
              Cancelar
            </button>
          )}
        </form>
      </div>

      <div className="panel" style={{ marginBottom: "1rem", display: "flex", gap: "0.8rem", alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Buscar categoría..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, minWidth: "280px" }}
        />
        <small style={{ color: "var(--text-secondary)" }}>
          {loading ? "Cargando..." : `${filteredCategorias.length} resultado(s)`}
        </small>
      </div>

      <div className="panel" style={{ padding: 0, overflowX: "auto" }}>
        {error && <div className="feedback error" style={{ margin: "1rem" }}>{error}</div>}

        <table className="admin-table">
          <thead>
            <tr style={{ background: "var(--surface-sunken)", borderBottom: "2px solid var(--border-subtle)" }}>
              <th className="col-optional" style={{ padding: "1rem", width: "8%" }}>ID</th>
              <th style={{ padding: "1rem", width: "34%" }}>Nombre</th>
              <th style={{ padding: "1rem", width: "14%" }}>Artículos</th>
              <th style={{ padding: "1rem", width: "20%" }}>Préstamo</th>
              <th style={{ padding: "1rem", width: "24%", textAlign: "right" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!loading && filteredCategorias.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "1.5rem", color: "var(--text-secondary)", textAlign: "center" }}>
                  No se encontraron categorías.
                </td>
              </tr>
            ) : null}
            {filteredCategorias.map((c) => (
              <tr key={c.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <td className="col-optional" style={{ padding: "1rem", fontWeight: 700 }}>{c.id}</td>
                <td style={{ padding: "1rem" }}>{c.nombre}</td>
                <td style={{ padding: "1rem" }}>{c.total_articulos}</td>
                <td style={{ padding: "1rem" }}>
                  <button
                    type="button"
                    className={`category-loanability${c.es_prestable === 1 ? " is-loanable" : ""}`}
                    onClick={() => void handleToggleLoanability(c)}
                    disabled={savingLoanabilityId !== null}
                    aria-pressed={c.es_prestable === 1}
                    aria-label={
                      c.es_prestable === 1
                        ? `${c.nombre}: prestable. Cambiar a solo inventario`
                        : `${c.nombre}: solo inventario. Permitir préstamos`
                    }
                  >
                    <strong>{c.es_prestable === 1 ? "Prestable" : "Solo inventario"}</strong>
                    <span>
                      {savingLoanabilityId === c.id
                        ? "Guardando…"
                        : c.es_prestable === 1
                          ? "Cambiar a solo inventario"
                          : "Permitir préstamos"}
                    </span>
                  </button>
                </td>
                <td style={{ padding: "1rem", textAlign: "right" }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.45rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => handleEdit(c)}
                      style={{
                        minWidth: "64px",
                        padding: "0.34rem 0.55rem",
                        borderRadius: "8px",
                        border: "none",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        color: "#fff",
                        background: "var(--warning-base)",
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(c.id)}
                      style={{
                        minWidth: "64px",
                        padding: "0.34rem 0.55rem",
                        borderRadius: "8px",
                        border: "none",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        color: "#fff",
                        background: "var(--danger-base)",
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingId && (
        <div className="panel" style={{ marginTop: "1rem" }}>
          <h3 style={{ marginTop: 0, marginBottom: "0.7rem" }}>Detalle de equipos en esta categoría</h3>
          <div style={{ color: "var(--text-secondary)", marginBottom: "0.8rem" }}>
            {loadingEquiposCategoria ? "Cargando equipos..." : `${equiposCategoria.length} equipo(s) asociado(s)`}
          </div>

          {!loadingEquiposCategoria && equiposCategoria.length === 0 && (
            <div style={{ color: "var(--text-secondary)" }}>No hay equipos asociados a esta categoría.</div>
          )}

          {!loadingEquiposCategoria && equiposCategoria.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table className="admin-table">
                <thead>
                  <tr style={{ background: "var(--surface-sunken)", borderBottom: "2px solid var(--border-subtle)" }}>
                    <th style={{ padding: "0.8rem", width: "24%" }}>Equipo</th>
                    <th className="col-optional" style={{ padding: "0.8rem", width: "16%" }}>Identificador</th>
                    <th style={{ padding: "0.8rem", width: "13%" }}>Estado</th>
                    <th style={{ padding: "0.8rem", width: "15%" }}>Préstamo</th>
                    <th className="col-optional" style={{ padding: "0.8rem", width: "10%" }}>Tipo</th>
                    <th style={{ padding: "0.8rem", width: "10%" }}>Stock</th>
                    <th style={{ padding: "0.8rem", width: "12%", textAlign: "right" }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {equiposCategoria.map((eq) => (
                    <tr key={eq.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "0.8rem" }}>{eq.nombre_equipo}</td>
                      <td className="col-optional" style={{ padding: "0.8rem", color: "var(--text-secondary)" }}>{eq.identificador || "S/N"}</td>
                      <td style={{ padding: "0.8rem" }}>{eq.estado}</td>
                      <td style={{ padding: "0.8rem" }}>{esPrestableEfectivo(eq) ? "Prestable" : "Solo inventario"}</td>
                      <td className="col-optional" style={{ padding: "0.8rem" }}>{eq.es_granel === 1 ? "Granel" : "Único"}</td>
                      <td style={{ padding: "0.8rem" }}>{eq.es_granel === 1 ? `${eq.stock_disponible}/${eq.stock_total}` : "1"}</td>
                      <td style={{ padding: "0.8rem", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => handleEditEquipo(eq)}
                          style={{
                            minWidth: "70px",
                            padding: "0.34rem 0.6rem",
                            borderRadius: "8px",
                            border: "none",
                            fontWeight: 700,
                            fontSize: "0.8rem",
                            color: "#fff",
                            background: "var(--warning-base)",
                          }}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {editingEquipoId && (
            <form onSubmit={handleSaveEquipo} style={{ marginTop: "1rem", display: "grid", gap: "0.6rem" }}>
              <h4 style={{ margin: 0 }}>Editar equipo de la categoría</h4>
              <div className="admin-3col-basic">
                <input
                  type="text"
                  value={equipoNombre}
                  onChange={(e) => setEquipoNombre(e.target.value)}
                  placeholder="Nombre del equipo"
                  required
                />
                <select value={equipoEstado} onChange={(e) => setEquipoEstado(e.target.value)}>
                  <option value="disponible">Disponible</option>
                  <option value="prestado">Prestado</option>
                  <option value="extraviado">Extraviado</option>
                  <option value="mantenimiento">Mantenimiento</option>
                </select>
                <button
                  type="button"
                  onClick={() => setEquipoEsPrestable((current) => !current)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.6rem",
                    width: "100%",
                    padding: "0.7rem 0.8rem",
                    borderRadius: "14px",
                    border: equipoEsPrestable ? "1px solid rgba(34, 197, 94, 0.28)" : "1px solid rgba(148, 163, 184, 0.18)",
                    background: equipoEsPrestable ? "rgba(34, 197, 94, 0.08)" : "rgba(255,255,255,0.92)",
                    cursor: "pointer",
                    textAlign: "left",
                    boxShadow: equipoEsPrestable ? "0 10px 20px rgba(34, 197, 94, 0.08)" : "none",
                  }}
                  aria-pressed={equipoEsPrestable}
                >
                  <div style={{ display: "grid", gap: "0.1rem" }}>
                    <strong style={{ color: "var(--text-primary)", fontSize: "0.9rem" }}>Prestable</strong>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>
                      {equipoEsPrestable ? "Visible en kiosko" : "Solo inventario"}
                    </span>
                  </div>
                  <span
                    style={{
                      minWidth: "54px",
                      padding: "0.28rem 0.5rem",
                      borderRadius: "999px",
                      background: equipoEsPrestable ? "var(--success-base)" : "rgba(148, 163, 184, 0.24)",
                      color: equipoEsPrestable ? "white" : "var(--text-secondary)",
                      fontWeight: 800,
                      fontSize: "0.76rem",
                      textAlign: "center",
                    }}
                  >
                    {equipoEsPrestable ? "Activo" : "Oculto"}
                  </span>
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.6rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={equipoEsGranel}
                    onChange={(e) => setEquipoEsGranel(e.target.checked)}
                    style={{ width: "auto" }}
                  />
                  Granel
                </label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: equipoEsGranel ? "1fr 1fr" : "1fr", gap: "0.6rem" }}>
                {!equipoEsGranel && (
                  <input
                    type="text"
                    value={equipoIdentificador}
                    onChange={(e) => setEquipoIdentificador(e.target.value)}
                    placeholder="Identificador"
                  />
                )}
                {equipoEsGranel && (
                  <input
                    type="number"
                    min="1"
                    value={equipoStockTotal}
                    onChange={(e) => setEquipoStockTotal(e.target.value)}
                    placeholder="Stock total"
                  />
                )}
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="submit" style={{ width: "auto", padding: "0.5rem 0.8rem", fontSize: "0.86rem" }}>
                  Guardar equipo
                </button>
                <button type="button" className="ghost" onClick={handleCancelEditEquipo} style={{ width: "auto", padding: "0.5rem 0.8rem", fontSize: "0.86rem" }}>
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
}

function ProfesoresPanel() {
  const [searchTerm, setSearchTerm] = useState("");
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [esAdmin, setEsAdmin] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProfesores = async () => {
    try {
      setLoading(true);
      const rows = await getProfesores();
      setProfesores(rows);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el directorio.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfesores();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!codigo.trim() || !nombre.trim()) return;

    try {
      if (editingId) {
        await updateProfesor(editingId, { codigo, nombre, es_admin: esAdmin ? 1 : 0, admin_pin: adminPin || null });
      } else {
        await createProfesor({ codigo, nombre, es_admin: esAdmin ? 1 : 0, admin_pin: adminPin || null });
      }
      setEditingId(null);
      setCodigo("");
      setNombre("");
      setEsAdmin(false);
      setAdminPin("");
      await loadProfesores();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el profesor.");
    }
  };

  const handleEdit = (p: Profesor) => {
    setEditingId(p.id);
    setCodigo(p.codigo);
    setNombre(p.nombre);
    setEsAdmin(p.es_admin === 1);
    setAdminPin(p.admin_pin || "");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setCodigo("");
    setNombre("");
    setEsAdmin(false);
    setAdminPin("");
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog("¿Seguro que deseas eliminar este profesor?"))) return;
    try {
      await deleteProfesor(id);
      await loadProfesores();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el profesor.");
    }
  };

  const filteredProfesores = profesores.filter((p) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      p.codigo.toLowerCase().includes(term) ||
      p.nombre.toLowerCase().includes(term)
    );
  });

  return (
    <section>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "1.2rem" }}>Directorio de Profesores</h1>

      <div className="panel" style={{ marginBottom: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>{editingId ? "Editar Profesor" : "Agregar Profesor"}</h3>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.6rem", alignItems: "center" }}>
          <div className="admin-action-grid">
            <input
              type="text"
              placeholder="Código"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Nombre completo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
            <button type="submit" style={{ width: "auto", padding: "0.55rem 0.85rem", fontSize: "0.88rem" }}>
              {editingId ? "Guardar" : "Agregar"}
            </button>
          </div>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", margin: 0 }}>
              <input
                type="checkbox"
                checked={esAdmin}
                onChange={(e) => setEsAdmin(e.target.checked)}
                style={{ width: "auto" }}
              />
              Hacer administrador
            </label>
            {esAdmin ? (
              <input
                type="password"
                placeholder="PIN de administrador"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                style={{ maxWidth: "280px" }}
              />
            ) : null}
          </div>
        </form>
        {editingId && (
          <button type="button" className="ghost" onClick={handleCancelEdit} style={{ marginTop: "0.6rem", width: "auto", padding: "0.5rem 0.8rem", fontSize: "0.86rem" }}>
            Cancelar edición
          </button>
        )}
      </div>

      <div className="panel" style={{ marginBottom: "1rem", display: "flex", gap: "0.8rem", alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Buscar por código o nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, minWidth: "280px" }}
        />
        <small style={{ color: "var(--text-secondary)" }}>
          {loading ? "Cargando..." : `${filteredProfesores.length} resultado(s)`}
        </small>
      </div>

      <div className="panel" style={{ padding: 0, overflowX: "auto" }}>
        {error && <div className="feedback error" style={{ margin: "1rem" }}>{error}</div>}

        <table className="admin-table">
          <thead>
            <tr style={{ background: "var(--surface-sunken)", borderBottom: "2px solid var(--border-subtle)" }}>
              <th style={{ padding: "1rem", width: "16%" }}>Código</th>
              <th style={{ padding: "1rem", width: "38%" }}>Nombre</th>
              <th style={{ padding: "1rem", width: "20%" }}>Rol</th>
              <th style={{ padding: "1rem", width: "26%", textAlign: "right" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!loading && filteredProfesores.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: "1.5rem", color: "var(--text-secondary)", textAlign: "center" }}>
                  No se encontraron profesores con ese criterio.
                </td>
              </tr>
            ) : null}
            {filteredProfesores.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <td style={{ padding: "1rem", fontWeight: 700 }}>{p.codigo}</td>
                <td style={{ padding: "1rem" }}>{p.nombre}</td>
                <td style={{ padding: "1rem" }}>
                  <span className={`state ${p.es_admin === 1 ? "activo" : "historico"}`}>
                    {p.es_admin === 1 ? "Administrador" : "Profesor"}
                  </span>
                </td>
                <td style={{ padding: "1rem", textAlign: "right" }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.45rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => handleEdit(p)}
                      style={{
                        display: "inline-block",
                        minWidth: "74px",
                        padding: "0.36rem 0.65rem",
                        borderRadius: "8px",
                        border: "none",
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        color: "#fff",
                        background: "var(--warning-base)",
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(p.id)}
                      style={{
                        display: "inline-block",
                        minWidth: "74px",
                        padding: "0.36rem 0.65rem",
                        borderRadius: "8px",
                        border: "none",
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        color: "#fff",
                        background: "var(--danger-base)",
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ConfiguracionPanel({ adminUser }: { adminUser: Profesor }) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backupMessage, setBackupMessage] = useState("");
  const [historyMessage, setHistoryMessage] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const [settingsRows, backupRows] = await Promise.all([getSettings(), getBackups()]);
      setSettings(settingsRows);
      setBackups(backupRows);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la configuración.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConfig();
  }, []);

  const handleToggleSetting = async (key: string, checked: boolean) => {
    try {
      setSaving(true);
      await updateSetting(key, checked ? "true" : "false");
      setSettings((current) => ({ ...current, [key]: checked ? "true" : "false" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la configuración.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setSaving(true);
      setError("");
      setHistoryMessage("");
      const backup = await createBackup();
      setBackupMessage(`Respaldo creado en ${backup.backup_path}`);
      await loadConfig();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el respaldo.");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenBackupsFolder = async () => {
    try {
      setError("");
      const folder = await openBackupsFolder();
      setBackupMessage(`Carpeta de respaldos abierta: ${folder}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir la carpeta de respaldos.");
    }
  };

  const handleBackupIntervalChange = async (hours: string) => {
    try {
      setSaving(true);
      setError("");
      await updateSetting("backup_auto_hours", hours);
      setSettings((current) => ({ ...current, backup_auto_hours: hours }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la frecuencia de respaldo.");
    } finally {
      setSaving(false);
    }
  };

  const handleImportBackupClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportBackupSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!selectedFile) {
      return;
    }

    if (!(await confirmDialog(`Se importará el respaldo "${selectedFile.name}" y reemplazará la base actual. Se creará un respaldo de seguridad antes de continuar. ¿Deseas seguir?`))) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setHistoryMessage("");
      const restoreResult = await restoreBackupFromFile(selectedFile);
      setBackupMessage(`Respaldo importado: ${restoreResult.restored_file_name}. Se guardó una copia de seguridad en ${restoreResult.backup_path}. La app se recargará.`);
      window.setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo importar el respaldo.");
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreBackup = async (backup: BackupInfo) => {
    if (!(await confirmDialog(`Se restaurará el respaldo "${backup.file_name}" y reemplazará la base actual. Todo lo que se haya registrado después de esa fecha se perderá. Se creará un respaldo de seguridad antes de continuar. ¿Deseas seguir?`))) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setHistoryMessage("");
      const restoreResult = await restoreBackupFromPath(backup.backup_path);
      setBackupMessage(`Respaldo restaurado: ${restoreResult.restored_file_name}. Se guardó una copia de seguridad en ${restoreResult.backup_path}. La app se recargará.`);
      window.setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo restaurar el respaldo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHistorial = async () => {
    if (!(await confirmDialog("¿Deseas borrar todos los registros históricos de préstamos? Los préstamos activos no se eliminarán."))) return;
    if (!(await confirmDialog("Esta acción es irreversible. Solo quedarán los préstamos activos y los nuevos que se creen a partir de ahora. ¿Continuar?"))) return;

    try {
      setSaving(true);
      setError("");
      setHistoryMessage("");
      await deleteHistorialPrestamos();
      setHistoryMessage("Se borraron los registros históricos existentes. A partir de ahora solo verás los nuevos que se vayan generando.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo borrar el historial.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAllReportes = async () => {
    if (!(await confirmDialog("¿Deseas eliminar todos los reportes y registros de préstamos, incluyendo activos e históricos?"))) return;
    if (!(await confirmDialog("Esta acción es irreversible. También liberará los equipos marcados actualmente como prestados. ¿Continuar con la eliminación total?"))) return;

    try {
      setSaving(true);
      setError("");
      setBackupMessage("");
      setHistoryMessage("");
      await deleteAllReportes();
      setHistoryMessage("Se eliminaron todos los reportes de préstamos y se liberaron los equipos que estaban marcados como prestados.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron eliminar todos los reportes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Cargando configuración...</div>;

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <div className="panel">
        <h1 style={{ fontSize: "2.5rem", marginBottom: "0.6rem" }}>Configuración</h1>
        <p style={{ color: "var(--text-secondary)", margin: 0 }}>
          Controles administrativos y respaldo rápido de la base local.
        </p>
      </div>

      <div className="panel" style={{ display: "grid", gap: "0.8rem" }}>
        <h3 style={{ margin: 0 }}>Kiosko</h3>
        <label style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <input
            type="checkbox"
            checked={settings.kiosk_show_catalogo !== "false"}
            onChange={(e) => void handleToggleSetting("kiosk_show_catalogo", e.target.checked)}
            disabled={saving}
            style={{ width: "auto" }}
          />
          Mostrar catálogo para préstamos
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <input
            type="checkbox"
            checked={settings.kiosk_show_pendientes !== "false"}
            onChange={(e) => void handleToggleSetting("kiosk_show_pendientes", e.target.checked)}
            disabled={saving}
            style={{ width: "auto" }}
          />
          Mostrar préstamos pendientes al profesor
        </label>
      </div>

      <div className="panel" style={{ display: "grid", gap: "0.8rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0 }}>Respaldos</h3>
            <small style={{ color: "var(--text-secondary)" }}>Se guarda una copia de `prestamos.db` en la carpeta `backups` de los datos de la app. Usa "Abrir carpeta" para copiarlos a una USB o a Drive. También puedes importar un respaldo `.db` desde tu equipo.</small>
          </div>
          <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
            <button type="button" onClick={() => void handleCreateBackup()} disabled={saving} style={{ width: "auto", padding: "0.7rem 1rem" }}>
              {saving ? "Procesando..." : "Crear respaldo"}
            </button>
            <button type="button" className="ghost" onClick={() => void handleOpenBackupsFolder()} style={{ width: "auto", padding: "0.7rem 1rem" }}>
              Abrir carpeta
            </button>
            <button type="button" className="ghost" onClick={handleImportBackupClick} disabled={saving} style={{ width: "auto", padding: "0.7rem 1rem" }}>
              Importar respaldo
            </button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", padding: "0.9rem", background: "var(--surface-sunken)", borderRadius: "10px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", margin: 0 }}>
            <input
              type="checkbox"
              checked={settings.backup_auto_enabled !== "false"}
              onChange={(e) => void handleToggleSetting("backup_auto_enabled", e.target.checked)}
              disabled={saving}
              style={{ width: "auto" }}
            />
            Respaldo automático
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", margin: 0 }}>
            <span style={{ color: "var(--text-secondary)" }}>Frecuencia</span>
            <select
              value={String(parseIntervalHours(settings.backup_auto_hours))}
              onChange={(e) => void handleBackupIntervalChange(e.target.value)}
              disabled={saving || settings.backup_auto_enabled === "false"}
              style={{ width: "auto", padding: "0.45rem 0.6rem" }}
            >
              {BACKUP_INTERVAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <small style={{ color: "var(--text-secondary)" }}>
            Se conservan los últimos 20 respaldos automáticos. Los manuales no se borran.
          </small>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".db,.sqlite,.sqlite3,application/octet-stream"
          onChange={(event) => void handleImportBackupSelected(event)}
          style={{ display: "none" }}
        />
        {backupMessage ? <div className="feedback success">{backupMessage}</div> : null}
        {error ? <div className="feedback error">{error}</div> : null}
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr style={{ background: "var(--surface-sunken)", borderBottom: "2px solid var(--border-subtle)" }}>
                <th style={{ padding: "0.9rem", width: "28%" }}>Archivo</th>
                <th style={{ padding: "0.9rem", width: "13%" }}>Tipo</th>
                <th style={{ padding: "0.9rem", width: "18%" }}>Fecha</th>
                <th className="col-optional" style={{ padding: "0.9rem", width: "28%" }}>Ruta</th>
                <th style={{ padding: "0.9rem", width: "13%" }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {backups.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "1.2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                    Aún no hay respaldos creados.
                  </td>
                </tr>
              ) : null}
              {backups.map((backup) => (
                <tr key={backup.backup_path} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "0.9rem", fontWeight: 600 }}>{backup.file_name}</td>
                  <td style={{ padding: "0.9rem", color: "var(--text-secondary)" }}>{BACKUP_KIND_LABELS[backup.kind] ?? backup.kind}</td>
                  <td style={{ padding: "0.9rem" }}>{formatSqliteDateTime(new Date(backup.created_epoch * 1000).toISOString())}</td>
                  <td className="col-optional" style={{ padding: "0.9rem", color: "var(--text-secondary)" }}>{backup.backup_path}</td>
                  <td style={{ padding: "0.9rem" }}>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => void handleRestoreBackup(backup)}
                      disabled={saving}
                      style={{ width: "auto", padding: "0.5rem 0.9rem" }}
                    >
                      Restaurar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel" style={{ display: "grid", gap: "0.8rem" }}>
        <div>
          <h3 style={{ margin: 0 }}>Limpieza de historial</h3>
          <small style={{ color: "var(--text-secondary)" }}>
            Elimina los registros históricos ya cerrados. Los préstamos activos no se tocan.
          </small>
        </div>
        {historyMessage ? <div className="feedback success">{historyMessage}</div> : null}
        <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => void handleDeleteHistorial()}
            disabled={saving}
            style={{ width: "auto", padding: "0.75rem 1rem", background: "var(--danger-base)", borderColor: "var(--danger-base)" }}
          >
            Borrar registros históricos
          </button>
          <button
            type="button"
            onClick={() => void handleDeleteAllReportes()}
            disabled={saving}
            style={{ width: "auto", padding: "0.75rem 1rem", background: "#7f1d1d", borderColor: "#7f1d1d" }}
          >
            Eliminar todos los reportes
          </button>
        </div>
      </div>
      {/* EXPERIMENT: phone access over the LAN. See docs/QR_CELULAR.md to remove. */}
      <RedCelularPanel adminId={adminUser.id} adminNombre={adminUser.nombre} />
    </section>
  );
}

export default function Admin() {
  const [authLoading, setAuthLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<Profesor | null>(null);
  const [loginCodigo, setLoginCodigo] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [activeTab, setActiveTab] = useState("inventario");
  // Mientras dura un recorrido de toma fisica la barra lateral desaparece: son
  // seis pestanas y dos salidas a un clic de robarle el foco al campo de
  // escaneo, y sin foco la pistola dispara al vacio sin avisar. Ver
  // src/components/TomaFisicaPanel.tsx.
  const [recorridoAbierto, setRecorridoAbierto] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await initializeInventoryDb();
        const sessionRaw = window.sessionStorage.getItem("p15_admin_session");
        if (!sessionRaw) {
          return;
        }

        const session = JSON.parse(sessionRaw) as { codigo: string; pin: string };
        const admin = await loginAdmin(session.codigo, session.pin);
        if (admin) {
          setAdminUser(admin);
          setLoginCodigo(session.codigo);
        } else {
          window.sessionStorage.removeItem("p15_admin_session");
        }
      } catch (error) {
        setLoginError(error instanceof Error ? error.message : "No se pudo inicializar el acceso de administrador.");
      } finally {
        setAuthLoading(false);
      }
    };

    void bootstrap();
  }, []);

  const handleAdminLogin = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setLoginError("");
      await initializeInventoryDb();
      const admin = await loginAdmin(loginCodigo, loginPin);
      if (!admin) {
        setLoginError("Código o PIN inválido, o el profesor no tiene permisos de administrador.");
        return;
      }

      setAdminUser(admin);
      window.sessionStorage.setItem("p15_admin_session", JSON.stringify({ codigo: loginCodigo.trim(), pin: loginPin.trim() }));
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "No se pudo iniciar sesión.");
    }
  };

  const handleAdminLogout = () => {
    setAdminUser(null);
    setLoginPin("");
    window.sessionStorage.removeItem("p15_admin_session");
  };

  const tabStyle = (isActive: boolean) => ({
    padding: "1rem 1.5rem",
    background: isActive ? "var(--brand-primary)" : "transparent",
    color: isActive ? "#fff" : "var(--text-primary)",
    border: "none",
    borderRadius: "12px",
    textAlign: "left" as const,
    fontSize: "1.1rem",
    fontWeight: isActive ? "bold" : "normal",
    cursor: "pointer",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    gap: "0.75rem"
  });

  if (authLoading) {
    return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>Cargando acceso administrativo...</main>;
  }

  if (!adminUser) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--background-default)", padding: "2rem" }}>
        <section className="panel" style={{ width: "min(520px, 100%)", padding: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "1rem" }}>
            <img src={logoP15} alt="Logo Preparatoria Quince" style={{ width: "54px", height: "54px", objectFit: "contain" }} />
            <div>
              <h1 style={{ margin: 0, fontSize: "2rem" }}>Acceso Admin P15</h1>
              <small style={{ color: "var(--text-secondary)" }}>Ingresa con código de profesor y PIN de administrador.</small>
            </div>
          </div>
          {loginError ? <div className="feedback error" style={{ marginBottom: "1rem" }}>{loginError}</div> : null}
          <form onSubmit={handleAdminLogin} style={{ display: "grid", gap: "0.8rem" }}>
            <input
              type="text"
              placeholder="Código de profesor"
              value={loginCodigo}
              onChange={(e) => setLoginCodigo(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="PIN de administrador"
              value={loginPin}
              onChange={(e) => setLoginPin(e.target.value)}
              required
            />
            <button type="submit">Entrar al panel</button>
            <Link to="/" style={{ textAlign: "center", color: "var(--text-secondary)", textDecoration: "none", fontWeight: 600 }}>
              Volver a inicio
            </Link>
          </form>
        </section>
      </main>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--background-default)", color: "var(--text-primary)" }}>
      {/* Sidebar */}
      {!recorridoAbierto && <aside className="admin-sidebar" style={{
        background: "var(--surface-sunken)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        boxShadow: "2px 0 10px rgba(0,0,0,0.05)"
      }}>
        <div style={{ padding: "2rem", borderBottom: "1px solid var(--border-subtle)", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "0.4rem" }}>
            <img
              src={logoP15}
              alt="Logo Preparatoria Quince"
              style={{ width: "44px", height: "44px", objectFit: "contain" }}
            />
            <h2 style={{ fontSize: "1.8rem", color: "var(--text-primary)", letterSpacing: "-0.02em", margin: 0 }}>
              <span style={{ color: "var(--brand-primary)" }}>P15</span> Admin
            </h2>
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem", padding: "0 1rem" }}>
          <button style={tabStyle(activeTab === "inventario")} onClick={() => setActiveTab("inventario")}>
            <Icon name="package" size="1.25rem" />
            Inventario
          </button>
          <button style={tabStyle(activeTab === "toma")} onClick={() => setActiveTab("toma")}>
            <Icon name="search" size="1.25rem" />
            Toma de inventario
          </button>
          <button style={tabStyle(activeTab === "categorias")} onClick={() => setActiveTab("categorias")}>
            <Icon name="folder" size="1.25rem" />
            Categorías
          </button>
          <button style={tabStyle(activeTab === "profesores")} onClick={() => setActiveTab("profesores")}>
            <Icon name="users" size="1.25rem" />
            Profesores
          </button>
          <button style={tabStyle(activeTab === "reportes")} onClick={() => setActiveTab("reportes")}>
            <Icon name="clipboard" size="1.25rem" />
            Reportes
          </button>
          <button style={tabStyle(activeTab === "configuracion")} onClick={() => setActiveTab("configuracion")}>
            <Icon name="settings" size="1.25rem" />
            Configuración
          </button>
        </nav>

        <div style={{ marginTop: "auto", padding: "1.5rem", borderTop: "1px solid var(--border-subtle)" }}>
          <div style={{ marginBottom: "0.9rem", color: "var(--text-secondary)", fontSize: "0.92rem" }}>
            Sesión: <strong style={{ color: "var(--text-primary)" }}>{adminUser.nombre}</strong>
          </div>
          <button
            type="button"
            className="ghost"
            onClick={handleAdminLogout}
            style={{ marginBottom: "0.8rem", background: "#7f1d1d", borderColor: "#7f1d1d" }}
          >
            Cerrar sesión admin
          </button>
          <Link to="/" style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            padding: "1rem",
            background: "var(--surface-default)",
            color: "var(--text-primary)",
            textDecoration: "none",
            borderRadius: "8px",
            border: "1px solid var(--border-subtle)",
            fontWeight: "bold",
            transition: "all 0.2s"
          }}>
            <Icon name="home" />
            Volver a Inicio
          </Link>
        </div>
      </aside>}

      {/* Main Content */}
      <main className="admin-main">

        {activeTab === "inventario" && <InventarioPanel />}

        {activeTab === "toma" && <TomaFisicaPanel adminUser={adminUser} onRecorrido={setRecorridoAbierto} />}

        {activeTab === "categorias" && <CategoriasPanel />}

        {activeTab === "profesores" && <ProfesoresPanel />}

        {activeTab === "reportes" && (
          <section>
            <h1 style={{ fontSize: "2.5rem", marginBottom: "2rem" }}>Historial de Préstamos</h1>
            <ReportesPanel />
          </section>
        )}

        {activeTab === "configuracion" && <ConfiguracionPanel adminUser={adminUser} />}

      </main>
    </div>
  );
}
