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
import "../App.css";
import { BACKUP_INTERVAL_OPTIONS, parseIntervalHours } from "../utils/backupSchedule";
import { formatSqliteDateTime } from "../utils/datetime";
import { generarIdentificadores } from "../utils/identificadores";
import { html, buildPrintDocument, printHtmlDocument } from "../utils/print";
import { Icon } from "../components/Icon";
// EXPERIMENT: phone access over the LAN. See docs/QR_CELULAR.md to remove.
import { RedCelularPanel } from "../components/RedCelularPanel";
import { EtiquetasQrPanel } from "../components/EtiquetasQrPanel";
import { EquipoDetalleModal } from "../components/EquipoDetalleModal";
import { confirmDialog, alertDialog } from "../utils/confirm";

const BACKUP_KIND_LABELS: Record<string, string> = {
  auto: "Automático",
  manual: "Manual",
  "pre-restore": "Previo a importar",
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

  // Form states
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nombre, setNombre] = useState("");
  const [identificador, setIdentificador] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [estadoEdit, setEstadoEdit] = useState("disponible");
  const [esPrestable, setEsPrestable] = useState(true);
  const [esGranel, setEsGranel] = useState(false);
  const [stockTotal, setStockTotal] = useState("1");
  const [cantidadUnidades, setCantidadUnidades] = useState("1");

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortKey, setSortKey] = useState<"nombre" | "categoria" | "estado">("nombre");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [quickNombre, setQuickNombre] = useState("");
  const [quickCategoria, setQuickCategoria] = useState("");
  const formDialogRef = useRef<HTMLDialogElement>(null);
  const [detalleId, setDetalleId] = useState<number | null>(null);
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

  // Las unidades que creará el alta múltiple. Se muestran ANTES de guardar: la
  // numeración no es algo que se deba descubrir después de imprimir etiquetas.
  const identificadoresPrevistos = useMemo(
    () => generarIdentificadores(identificador, editingId ? 1 : Number(cantidadUnidades)),
    [identificador, cantidadUnidades, editingId]
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nombre || !categoriaId) return;

    try {
      if (editingId) {
        await updateEquipo(editingId, {
          nombre_equipo: nombre,
          identificador: identificador || null,
          categoria_id: Number(categoriaId),
          estado: estadoEdit,
          es_prestable: esPrestable ? 1 : 0,
          es_granel: esGranel ? 1 : 0,
          stock_total: Number(stockTotal) || 1
        });
      } else if (esGranel) {
        await createEquipo({
          nombre_equipo: nombre,
          identificador: identificador || null,
          categoria_id: Number(categoriaId),
          es_prestable: esPrestable ? 1 : 0,
          es_granel: 1,
          stock_total: Number(stockTotal) || 1
        });
      } else {
        // Una fila por unidad: es lo que le da a cada objeto su propio QR y su
        // propio historial. Ver src/utils/identificadores.ts.
        for (const codigo of identificadoresPrevistos) {
          await createEquipo({
            nombre_equipo: nombre,
            identificador: codigo,
            categoria_id: Number(categoriaId),
            es_prestable: esPrestable ? 1 : 0,
            es_granel: 0,
            stock_total: 1
          });
        }
      }
      handleCancelEdit();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el equipo");
    }
  };

  const handleEditInit = (eq: Equipo) => {
    formDialogRef.current?.showModal();
    setEditingId(eq.id);
    setNombre(eq.nombre_equipo);
    setIdentificador(eq.identificador || "");
    setCategoriaId(eq.categoria_id.toString());
    setEstadoEdit(eq.estado);
    setEsPrestable(eq.es_prestable === 1);
    setEsGranel(eq.es_granel === 1);
    setStockTotal(eq.stock_total.toString());
    setCantidadUnidades("1");
  };

  const handleCancelEdit = () => {
    formDialogRef.current?.close();
    setEditingId(null);
    setNombre("");
    setIdentificador("");
    setCategoriaId("");
    setEstadoEdit("disponible");
    setEsPrestable(true);
    setEsGranel(false);
    setStockTotal("1");
    setCantidadUnidades("1");
  };

  // Reset first so the dialog never opens showing the equipment edited last.
  const handleNuevoEquipo = () => {
    handleCancelEdit();
    formDialogRef.current?.showModal();
  };

  // Name + category is the whole cost of adding one more unique item; the full
  // form stays for stock, serial numbers and kiosk visibility.
  const handleQuickAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!quickNombre.trim() || !quickCategoria) return;
    try {
      await createEquipo({
        nombre_equipo: quickNombre.trim(),
        identificador: null,
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
  const baseEquipos = equipos.filter(eq => {
    const matchesSearch = eq.nombre_equipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (eq.identificador && eq.identificador.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory ? eq.categoria_id.toString() === filterCategory : true;
    return matchesSearch && matchesCategory;
  });

  const statusChips = [
    { value: "", label: "Todos" },
    { value: "disponible", label: "Disponibles" },
    { value: "prestado", label: "Prestados" },
    { value: "extraviado", label: "Extraviados" },
    { value: "mantenimiento", label: "Mantenimiento" },
  ];

  const countForStatus = (value: string) =>
    value ? baseEquipos.filter(eq => eq.estado === value).length : baseEquipos.length;

  const sortValue = (eq: Equipo) =>
    sortKey === "categoria" ? eq.categoria_nombre : sortKey === "estado" ? eq.estado : eq.nombre_equipo;

  const filteredEquipos = baseEquipos
    .filter(eq => (filterStatus ? eq.estado === filterStatus : true))
    .sort((a, b) => (sortDir === "asc" ? 1 : -1) * sortValue(a).localeCompare(sortValue(b), "es", { numeric: true }));

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
    noPrestables: filteredEquipos.filter((equipo) => equipo.es_prestable !== 1).length,
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
          `<td>${html(eq.nombre_equipo)}${inventarioPdf.includeIdentifier ? `<br /><span class="muted">${html(eq.identificador || "S/N")}</span>` : ""}</td>`,
          inventarioPdf.includeCategory ? `<td>${html(eq.categoria_nombre)}</td>` : "",
          inventarioPdf.includeLoanType ? `<td>${html(eq.es_prestable === 1 ? "Prestable" : "Solo inventario")}</td>` : "",
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

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginBottom: '0.75rem' }}>
        {/* EXPERIMENT: etiquetas QR por equipo. Ver docs/QR_CELULAR.md para quitarlo. */}
        <EtiquetasQrPanel equipos={filteredEquipos} />
        <button
          type="button"
          onClick={handleNuevoEquipo}
          style={{ width: 'auto', padding: '0.75rem 1.1rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
        >
          <Icon name="plus" size="1.05rem" />
          Nuevo equipo
        </button>
      </div>

      {/* Buscador y Filtros */}
      <div className="admin-filters">
        <div className="admin-filters-search">
          <Icon name="search" size="1.05rem" className="admin-filters-icon" />
          <input
            type="search"
            placeholder="Buscar por nombre o ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
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
          about half the shell from the table. It is only needed while editing. */}
      <dialog ref={formDialogRef} className="admin-dialog is-form" onClose={handleCancelEdit}>
        <div className="stack">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.85rem' }}>
            <div style={{ display: 'grid', gap: '0.25rem' }}>
              <h3 style={{ margin: 0 }}>{editingId ? "Editar equipo" : "Registrar equipo nuevo"}</h3>
              <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Agrega un artículo al inventario y define si se controlará por unidad o por cantidad.
              </div>
            </div>
            <button type="button" className="admin-dialog-close" onClick={handleCancelEdit} aria-label="Cerrar">
              <Icon name="x" size="1.1rem" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="stack" style={{ gap: '0.8rem' }}>
            <div className="admin-dialog-cols">
            <div className="stack" style={{ gap: '0.8rem' }}>
            <div className="admin-form-section">
              <div className="admin-form-section-title">
                Datos del equipo
              </div>
              <div>
                <label>Categoría</label>
                <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)} required>
                  <option value="">-- Seleccionar --</option>
                  {categorias.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Nombre visible</label>
                <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Cámara Sony A7" required />
                <small style={{ color: 'var(--text-secondary)' }}>Así aparecerá en inventario y kiosko.</small>
              </div>
            </div>

            <div className="admin-form-section">
              <div className="admin-form-section-title">
                Tipo de registro
              </div>
              <div style={{ display: 'grid', gap: '0.55rem' }}>
                <button
                  type="button"
                  onClick={() => setEsGranel(false)}
                  style={{
                    textAlign: 'left',
                    padding: '0.8rem',
                    borderRadius: '16px',
                    border: esGranel ? '1px solid rgba(148, 163, 184, 0.18)' : '1px solid rgba(37, 99, 235, 0.28)',
                    background: esGranel ? 'rgba(255,255,255,0.9)' : 'rgba(37, 99, 235, 0.08)',
                    cursor: 'pointer',
                    boxShadow: esGranel ? 'none' : '0 12px 24px rgba(37, 99, 235, 0.08)',
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>Equipo único</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.45 }}>
                    Cada unidad se presta individualmente y puede tener identificador propio.
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setEsGranel(true)}
                  style={{
                    textAlign: 'left',
                    padding: '0.8rem',
                    borderRadius: '16px',
                    border: esGranel ? '1px solid rgba(37, 99, 235, 0.28)' : '1px solid rgba(148, 163, 184, 0.18)',
                    background: esGranel ? 'rgba(37, 99, 235, 0.08)' : 'rgba(255,255,255,0.9)',
                    cursor: 'pointer',
                    boxShadow: esGranel ? '0 12px 24px rgba(37, 99, 235, 0.08)' : 'none',
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>Equipo por cantidad</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.45 }}>
                    Ideal para cables, adaptadores o controles que se administran por stock.
                  </div>
                </button>
              </div>

              {!esGranel && (
                <div>
                  <label>Código o serie</label>
                  <input value={identificador} onChange={e => setIdentificador(e.target.value)} placeholder="Ej. CAM-01" />
                  <small style={{ color: 'var(--text-secondary)' }}>Opcional, útil para control interno del equipo.</small>
                </div>
              )}
              {!esGranel && !editingId && (
                <div>
                  <label>¿Cuántas unidades?</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={cantidadUnidades}
                    onChange={e => setCantidadUnidades(e.target.value)}
                  />
                  <small style={{ color: 'var(--text-secondary)' }}>
                    Cada unidad se registra por separado, con su propio QR e historial.
                  </small>
                  {identificadoresPrevistos.length > 1 && (
                    <div style={{ marginTop: '0.5rem', padding: '0.55rem 0.7rem', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.07)', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                      {identificadoresPrevistos[0] === null ? (
                        <>Se crearán {identificadoresPrevistos.length} unidades sin código. Escribe uno arriba para numerarlas.</>
                      ) : (
                        <>
                          Se crearán: <code>{identificadoresPrevistos[0]}</code>
                          {identificadoresPrevistos.length > 2 ? ' … ' : ', '}
                          <code>{identificadoresPrevistos[identificadoresPrevistos.length - 1]}</code>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
              {esGranel && (
                <div>
                  <label>Cantidad total</label>
                  <input
                    type="number"
                    min="1"
                    value={stockTotal}
                    onChange={e => setStockTotal(e.target.value)}
                    placeholder="Ej. 10"
                    required
                  />
                  <small style={{ color: 'var(--text-secondary)' }}>Este equipo se controlará por stock disponible.</small>
                </div>
              )}
            </div>

            </div>

            <div className="stack" style={{ gap: '0.8rem' }}>
            <div className="admin-form-section">
              <div className="admin-form-section-title">
                Disponibilidad y vista rápida
              </div>
              <button
                type="button"
                onClick={() => setEsPrestable((current) => !current)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.8rem',
                  width: '100%',
                  padding: '0.8rem 0.9rem',
                  borderRadius: '16px',
                  border: esPrestable ? '1px solid rgba(34, 197, 94, 0.28)' : '1px solid rgba(148, 163, 184, 0.18)',
                  background: esPrestable ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255,255,255,0.92)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: esPrestable ? '0 12px 24px rgba(34, 197, 94, 0.08)' : 'none',
                }}
                aria-pressed={esPrestable}
              >
                <div style={{ display: 'grid', gap: '0.2rem' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Mostrar en kiosko de profesores</strong>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {esPrestable ? 'Visible para préstamo inmediato.' : 'Oculto del kiosko; solo visible en inventario.'}
                  </span>
                </div>
                <span
                  style={{
                    minWidth: '64px',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '999px',
                    background: esPrestable ? 'var(--success-base)' : 'rgba(148, 163, 184, 0.24)',
                    color: esPrestable ? 'white' : 'var(--text-secondary)',
                    fontWeight: 800,
                    textAlign: 'center',
                  }}
                >
                  {esPrestable ? 'Activo' : 'Oculto'}
                </span>
              </button>
              {editingId && (
                <div>
                  <label>Estado administrativo</label>
                  <select value={estadoEdit} onChange={e => setEstadoEdit(e.target.value)} required>
                    <option value="disponible">Disponible</option>
                    <option value="prestado">Prestado (No remueve el préstamo)</option>
                    <option value="extraviado">Extraviado</option>
                    <option value="mantenimiento">Mantenimiento</option>
                  </select>
                </div>
              )}
              <div style={{ borderRadius: '15px', padding: '0.75rem 0.85rem', background: 'white', border: '1px solid rgba(148, 163, 184, 0.16)', display: 'grid', gap: '0.25rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--brand-primary)' }}>
                  Vista rápida
                </div>
                <strong style={{ fontSize: '1rem' }}>{nombre || 'Sin nombre todavía'}</strong>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {categoriaId ? `Categoría: ${categorias.find((c) => c.id === Number(categoriaId))?.nombre || 'Seleccionada'}` : 'Elige una categoría'}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Tipo: {esGranel ? `Por cantidad (${stockTotal || 1} total)` : `Equipo único${!editingId && identificadoresPrevistos.length > 1 ? ` × ${identificadoresPrevistos.length}` : ''}`}
                </div>
                <div style={{ color: esPrestable ? 'var(--success-base)' : 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 700 }}>
                  {esPrestable ? 'Visible para préstamo' : 'Solo inventario interno'}
                </div>
              </div>
            </div>

            </div>
            </div>

            <div className="admin-dialog-actions">
              <button type="submit" style={{ flex: 2 }}>{editingId ? "Guardar cambios" : (!esGranel && identificadoresPrevistos.length > 1 ? `Guardar ${identificadoresPrevistos.length} unidades` : "Guardar equipo")}</button>
              <button type="button" className="ghost" onClick={handleCancelEdit} style={{ flex: 1 }}>Cancelar</button>
            </div>
          </form>
        </div>
      </dialog>

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
              {filteredEquipos.map(eq => (
                <tr key={eq.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: editingId === eq.id ? 'var(--surface-sunken)' : 'transparent' }}>
                  <td style={{ padding: '0.55rem 1rem' }}>
                    <button type="button" className="row-link" onClick={() => setDetalleId(eq.id)}>
                      {eq.nombre_equipo}
                    </button>
                    {eq.es_granel === 0 ? (
                      <>
                        <br />
                        <small style={{ color: 'var(--text-secondary)' }}>{eq.identificador || 'S/N'}</small>
                      </>
                    ) : (
                      <>
                        <br />
                        <small style={{ color: 'var(--text-secondary)' }}>Granel</small>
                      </>
                    )}
                  </td>
                  <td className="col-optional" style={{ padding: '0.55rem 1rem' }}>{eq.categoria_nombre}</td>
                  <td style={{ padding: '0.55rem 1rem' }}>
                    <span className={`state ${eq.es_prestable === 1 ? 'activo' : 'historico'}`} style={{ width: 'fit-content' }}>
                      {eq.es_prestable === 1 ? 'Prestable' : 'Solo inventario'}
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
  const [editingObservacionId, setEditingObservacionId] = useState<number | null>(null);
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
    setEditingObservacionId(null);
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
    setEditingObservacionId(reporte.id);
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
          `<td>${html(reporte.nombre_equipo)}${reporte.cantidad_prestada > 1 ? `<span style="color:#16a34a;font-weight:700;"> ×${reporte.cantidad_prestada}</span>` : ""}${reportePdf.includeCategory ? `<br /><span class="muted">${html(reporte.categoria_nombre)}</span>` : ""}</td>`,
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
          <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="devuelto">Devuelto</option>
            <option value="historico">Histórico</option>
          </select>
          <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)}>
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
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: r.estado_prestamo === 'historico' ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
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
                    {editingObservacionId === r.id ? (
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
                      {r.estado_prestamo !== 'activo' && editingObservacionId !== r.id && (
                        <button
                          onClick={() => handleEditObservaciones(r)}
                          style={{ width: '100%', maxWidth: '92px', minWidth: '0', padding: '0.32rem 0.45rem', fontSize: '0.73rem', borderRadius: '6px', color: 'white', border: 'none', fontWeight: 'bold', background: 'var(--brand-primary)', whiteSpace: 'nowrap' }}>
                          Editar
                        </button>
                      )}
                      {r.estado_prestamo !== 'activo' && (
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
                  <span className={`state ${c.es_prestable === 1 ? "activo" : "historico"}`}>
                    {c.es_prestable === 1 ? "Prestable" : "Solo inventario"}
                  </span>
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
                      <td style={{ padding: "0.8rem" }}>{eq.es_prestable === 1 ? "Prestable" : "Solo inventario"}</td>
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
                <th style={{ padding: "0.9rem", width: "30%" }}>Archivo</th>
                <th style={{ padding: "0.9rem", width: "14%" }}>Tipo</th>
                <th style={{ padding: "0.9rem", width: "20%" }}>Fecha</th>
                <th className="col-optional" style={{ padding: "0.9rem", width: "36%" }}>Ruta</th>
              </tr>
            </thead>
            <tbody>
              {backups.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: "1.2rem", textAlign: "center", color: "var(--text-secondary)" }}>
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
      <aside className="admin-sidebar" style={{
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
      </aside>

      {/* Main Content */}
      <main className="admin-main">

        {activeTab === "inventario" && <InventarioPanel />}

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
