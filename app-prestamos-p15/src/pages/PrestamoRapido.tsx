import { FormEvent, KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import logoP15 from "../../img/logo-p15.png";
import {
  Equipo,
  PersonaRapida,
  Profesor,
  PrestamoRapidoAlumno,
  createPrestamoRapidoAlumno,
  createPrestamoRapidoDesdeInventario,
  getEquipos,
  getPersonasRapidas,
  getProfesores,
  getPrestamosRapidosAlumnos,
  marcarPrestamoRapidoDevuelto,
  deletePrestamoRapidoAlumno,
  getRuntimeStorageReason,
  initializeInventoryDb,
} from "../hooks/useInventory";
import { parseSqliteDate, formatSqliteDateTime } from "../utils/datetime";
import { useAuth } from "../auth/AuthContext";
import { LoginForm } from "../auth/LoginForm";
import { SessionBadge } from "../auth/SessionBadge";
import { Icon } from "../components/Icon";
import { confirmDialog } from "../utils/confirm";

type FilterEstado = "todos" | "activo" | "vencido" | "devuelto";
type TipoPersona = "alumno" | "profesor";

interface FieldError {
  field: string;
  message: string;
}

/** A loan is flagged as overdue once it has been out for more than a full day. */
const VENCIDO_MS = 24 * 60 * 60 * 1000;

/** Inventory estados shown in the combobox; anything else falls back to raw text. */
const ESTADO_INVENTARIO_LABELS: Record<string, string> = {
  disponible: "Disponible",
  prestado: "Prestado",
  extraviado: "Extraviado",
};

const isVencido = (item: PrestamoRapidoAlumno, now: number): boolean => {
  if (item.estado !== "activo") return false;
  const salida = parseSqliteDate(item.fecha_salida);
  return salida ? now - salida.getTime() > VENCIDO_MS : false;
};

const timeAgo = (dateStr: string | null, now: number): string => {
  const date = parseSqliteDate(dateStr);
  if (!date) return "—";
  const minutes = Math.floor((now - date.getTime()) / 60000);
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} ${days === 1 ? "día" : "días"}`;
};

export default function PrestamoRapido() {
  const { state, login, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);

  const [nombreAlumno, setNombreAlumno] = useState("");
  const [codigoAlumno, setCodigoAlumno] = useState("");
  const [nombreEquipo, setNombreEquipo] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // 'alumno' | 'profesor': relabels the person fields and is persisted per loan.
  const [tipoPersona, setTipoPersona] = useState<TipoPersona>("alumno");

  // Inventory-backed combobox for "Objeto Prestado": the full catalog loads once
  // after DB init and filtering happens in memory (no query per keystroke).
  // Person autocomplete: the profesores table is the real catalog, and past
  // Prestamo Rapido rows act as the history for anyone typed as free text.
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [personasRapidas, setPersonasRapidas] = useState<PersonaRapida[]>([]);
  const [personaComboOpen, setPersonaComboOpen] = useState(false);
  const [personaHighlight, setPersonaHighlight] = useState(-1);

  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [selectedEquipos, setSelectedEquipos] = useState<Equipo[]>([]);
  const [comboOpen, setComboOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const [historial, setHistorial] = useState<PrestamoRapidoAlumno[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FilterEstado>("activo");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Elapsed labels and the overdue flag must keep moving on a screen that stays
  // open all day, so re-evaluate them once a minute.
  const [now, setNow] = useState(() => Date.now());

  const nombreAlumnoRef = useRef<HTMLInputElement>(null);
  const codigoAlumnoRef = useRef<HTMLInputElement>(null);
  const nombreEquipoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeInventoryDb();
        await loadHistorial();
        try {
          setEquipos(await getEquipos());
        } catch (err) {
          // The catalog only feeds the autocomplete; if it fails, free-text
          // capture must keep working.
          console.warn("No se pudo cargar el inventario para la búsqueda", err);
        }
        try {
          const [profes, personas] = await Promise.all([getProfesores(), getPersonasRapidas()]);
          setProfesores(profes);
          setPersonasRapidas(personas);
        } catch (err) {
          console.warn("No se pudo cargar el directorio de personas", err);
        }
      } catch (error) {
        const reason = getRuntimeStorageReason();
        setErrorMessage(reason || "Error al inicializar.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Success feedback must clear itself, otherwise it stays on screen while the
  // admin is already typing the next loan.
  useEffect(() => {
    if (!successMessage) return;
    const id = setTimeout(() => setSuccessMessage(""), 3500);
    return () => clearTimeout(id);
  }, [successMessage]);

  // The whole (capped) history is loaded once and filtered in memory: it keeps
  // the counters honest and removes a database round trip per keystroke.
  const loadHistorial = async () => {
    const rows = await getPrestamosRapidosAlumnos();
    setHistorial(rows);
  };

  const counts = useMemo(() => {
    let activos = 0;
    let vencidos = 0;
    let devueltos = 0;
    for (const item of historial) {
      if (item.estado === "activo") {
        activos += 1;
        if (isVencido(item, now)) vencidos += 1;
      } else {
        devueltos += 1;
      }
    }
    return { activos, vencidos, devueltos, total: historial.length };
  }, [historial, now]);

  const filtrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    return historial.filter((item) => {
      if (filtroEstado === "activo" && item.estado !== "activo") return false;
      if (filtroEstado === "devuelto" && item.estado !== "devuelto") return false;
      if (filtroEstado === "vencido" && !isVencido(item, now)) return false;
      if (!term) return true;
      const haystack = [
        item.nombre_alumno,
        item.codigo_alumno,
        item.nombre_equipo,
        item.tipo_persona || "alumno",
        item.autorizante_nombre || item.persona_prestamo || "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [historial, busqueda, filtroEstado, now]);

  // Dynamic copy for the person fields ("Nombre del alumno/profesor", etc.).
  const personaNoun = tipoPersona === "profesor" ? "profesor" : "alumno";
  const nombreLabel = tipoPersona === "profesor" ? "Nombre del Profesor" : "Nombre del Alumno";
  const codigoLabel = tipoPersona === "profesor" ? "Código del Profesor" : "Código UDG del Alumno";
  const nombrePlaceholder = tipoPersona === "profesor" ? "Ej. Laura Méndez Ríos" : "Ej. Juan Pérez López";

  // Person suggestions for the active tipo: the profesores catalog (only when
  // registering a profesor) plus everyone seen before in Prestamo Rapido.
  // Deduped by codigo, catalog first so the official name wins over a typo.
  const personaPool = useMemo(() => {
    const byCodigo = new Map<string, { nombre: string; codigo: string; fuente: "directorio" | "historial" }>();
    if (tipoPersona === "profesor") {
      for (const profe of profesores) {
        byCodigo.set(profe.codigo, { nombre: profe.nombre, codigo: profe.codigo, fuente: "directorio" });
      }
    }
    for (const persona of personasRapidas) {
      if ((persona.tipo_persona || "alumno") !== tipoPersona) continue;
      if (byCodigo.has(persona.codigo)) continue;
      byCodigo.set(persona.codigo, { nombre: persona.nombre, codigo: persona.codigo, fuente: "historial" });
    }
    return [...byCodigo.values()];
  }, [tipoPersona, profesores, personasRapidas]);

  const personaResults = useMemo(() => {
    const term = nombreAlumno.trim().toLowerCase();
    const pool = term
      ? personaPool.filter(
          (persona) =>
            persona.nombre.toLowerCase().includes(term) || persona.codigo.toLowerCase().includes(term)
        )
      : personaPool;
    return pool.slice(0, 8);
  }, [personaPool, nombreAlumno]);

  const personaActiveIndex =
    personaResults.length > 0
      ? Math.min(Math.max(personaHighlight, 0), personaResults.length - 1)
      : -1;

  // Picking a suggestion fills both fields, so the code never has to be typed
  // for someone who has borrowed before.
  const selectPersona = (persona: { nombre: string; codigo: string }) => {
    setNombreAlumno(persona.nombre);
    setCodigoAlumno(persona.codigo);
    setPersonaComboOpen(false);
    setPersonaHighlight(-1);
    setFieldErrors((prev) =>
      prev.filter((err) => err.field !== "nombreAlumno" && err.field !== "codigoAlumno")
    );
    codigoAlumnoRef.current?.focus();
  };

  const handlePersonaKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && !personaComboOpen) {
      setPersonaComboOpen(true);
      setPersonaHighlight(-1);
      event.preventDefault();
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        if (!personaComboOpen) return;
        event.preventDefault();
        setPersonaHighlight((idx) => Math.min(idx + 1, personaResults.length - 1));
        break;
      case "ArrowUp":
        if (!personaComboOpen) return;
        event.preventDefault();
        setPersonaHighlight((idx) => Math.max(idx - 1, 0));
        break;
      case "Enter":
        if (personaComboOpen && personaActiveIndex >= 0 && personaResults[personaActiveIndex]) {
          event.preventDefault();
          selectPersona(personaResults[personaActiveIndex]);
        }
        break;
      case "Escape":
        if (personaComboOpen) {
          setPersonaComboOpen(false);
          setPersonaHighlight(-1);
        }
        break;
    }
  };

  // Client-side inventory search: match name, category or identifier; capped
  // at 8 rows so the dropdown never grows with the catalog.
  const equipoResults = useMemo(() => {
    const term = nombreEquipo.trim().toLowerCase();
    // Items already added to this loan are dropped from the list so the same
    // unit cannot be picked twice.
    const picked = new Set(selectedEquipos.map((equipo) => equipo.id));
    const pool = equipos.filter((equipo) => {
      if (picked.has(equipo.id)) return false;
      if (!term) return true;
      if (equipo.nombre_equipo.toLowerCase().includes(term)) return true;
      if (equipo.categoria_nombre.toLowerCase().includes(term)) return true;
      return (equipo.identificador ?? "").toLowerCase().includes(term);
    });
    return pool.slice(0, 8);
  }, [equipos, nombreEquipo, selectedEquipos]);

  // Highlight clamped to the live result count keeps keyboard nav valid even
  // while the list shrinks between keystrokes.
  const activeOptionIndex =
    equipoResults.length > 0
      ? Math.min(Math.max(highlightIndex, 0), equipoResults.length - 1)
      : -1;

  const validateFields = (): boolean => {
    const errors: FieldError[] = [];
    if (!nombreAlumno.trim()) {
      errors.push({ field: "nombreAlumno", message: `El nombre del ${personaNoun} es obligatorio.` });
    }
    if (!codigoAlumno.trim()) {
      errors.push({
        field: "codigoAlumno",
        message: tipoPersona === "profesor" ? "El código del profesor es obligatorio." : "El código UDG es obligatorio.",
      });
    } else if (!/^\d+$/.test(codigoAlumno.trim())) {
      errors.push({ field: "codigoAlumno", message: "El código debe contener solo números." });
    }
    if (!nombreEquipo.trim() && selectedEquipos.length === 0) {
      errors.push({ field: "nombreEquipo", message: "Agrega al menos un objeto prestado." });
    }
    setFieldErrors(errors);
    if (errors.length > 0) {
      const refs: Record<string, HTMLInputElement | null> = {
        nombreAlumno: nombreAlumnoRef.current,
        codigoAlumno: codigoAlumnoRef.current,
        nombreEquipo: nombreEquipoRef.current,
      };
      refs[errors[0].field]?.focus();
    }
    return errors.length === 0;
  };

  const getFieldError = (field: string): string | undefined => {
    return fieldErrors.find((e) => e.field === field)?.message;
  };

  // Switching alumno/profesor keeps typed values; only the errors of the
  // relabeled fields become stale wording and are dropped.
  const handleTipoChange = (tipo: TipoPersona) => {
    setTipoPersona(tipo);
    setPersonaComboOpen(false);
    setPersonaHighlight(-1);
    setFieldErrors((prev) =>
      prev.filter((err) => err.field !== "nombreAlumno" && err.field !== "codigoAlumno")
    );
  };

  // Adding an item empties the search box so the next one can be typed right
  // away; the list stays open to keep picking without the mouse.
  const selectEquipo = (equipo: Equipo) => {
    setSelectedEquipos((prev) =>
      prev.some((item) => item.id === equipo.id) ? prev : [...prev, equipo]
    );
    setNombreEquipo("");
    setComboOpen(true);
    setHighlightIndex(-1);
    setFieldErrors((prev) => prev.filter((err) => err.field !== "nombreEquipo"));
    nombreEquipoRef.current?.focus();
  };

  // × on a chip: drop that item from the loan.
  const removeEquipo = (id: number) => {
    setSelectedEquipos((prev) => prev.filter((item) => item.id !== id));
    nombreEquipoRef.current?.focus();
  };

  const handleEquipoInputChange = (value: string) => {
    setNombreEquipo(value);
    setComboOpen(true);
    setHighlightIndex(-1);
    setFieldErrors((prev) => prev.filter((err) => err.field !== "nombreEquipo"));
  };

  const handleEquipoKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && !comboOpen) {
      // Arrows reopen the list from any closed state (fresh or after a pick).
      setComboOpen(true);
      setHighlightIndex(-1);
      event.preventDefault();
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        if (!comboOpen) return;
        event.preventDefault();
        setHighlightIndex((idx) => Math.min(idx + 1, equipoResults.length - 1));
        break;
      case "ArrowUp":
        if (!comboOpen) return;
        event.preventDefault();
        setHighlightIndex((idx) => Math.max(idx - 1, 0));
        break;
      case "Enter":
        if (comboOpen && activeOptionIndex >= 0 && equipoResults[activeOptionIndex]) {
          event.preventDefault();
          selectEquipo(equipoResults[activeOptionIndex]);
        }
        break;
      case "Escape":
        if (comboOpen) {
          setComboOpen(false);
          setHighlightIndex(-1);
        }
        break;
    }
  };

  const handleLogin = async (codigo: string, _pin: string): Promise<void> => {
    try {
      await initializeInventoryDb();
      await login(codigo, _pin);
    } catch (error) {
      // The LoginForm owns its own error display, so we just re-throw.
      throw error;
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!validateFields()) return;
    if (state.status !== "authenticated") {
      setErrorMessage("Tu sesión expiró. Vuelve a iniciar sesión.");
      return;
    }

    setIsSubmitting(true);
    try {
      // One record per object: each one is returned (and updates inventory)
      // on its own, so a loan of N objects is N rows sharing the person.
      for (const equipo of selectedEquipos) {
        // Real inventory item: creates the prestamos row AND the rapido record,
        // linked so devoluciones keep both sides in sync.
        await createPrestamoRapidoDesdeInventario({
          nombre_alumno: nombreAlumno,
          codigo_alumno: codigoAlumno,
          nombre_equipo: equipo.nombre_equipo,
          observaciones: observaciones,
          admin: state.session.admin,
          tipo_persona: tipoPersona,
          equipoId: equipo.id,
        });
      }
      if (nombreEquipo.trim()) {
        // Free text: unchanged legacy path.
        await createPrestamoRapidoAlumno({
          nombre_alumno: nombreAlumno,
          codigo_alumno: codigoAlumno,
          nombre_equipo: nombreEquipo,
          observaciones: observaciones,
          admin: state.session.admin,
          tipo_persona: tipoPersona,
        });
      }
      const registrado = nombreAlumno.trim();
      const totalObjetos = selectedEquipos.length + (nombreEquipo.trim() ? 1 : 0);
      setNombreAlumno("");
      setCodigoAlumno("");
      setNombreEquipo("");
      setObservaciones("");
      setSelectedEquipos([]);
      setComboOpen(false);
      setHighlightIndex(-1);
      setFieldErrors([]);
      setSuccessMessage(
        totalObjetos === 1
          ? `Préstamo de ${registrado} registrado.`
          : `Préstamo de ${registrado} registrado (${totalObjetos} objetos).`
      );
      await loadHistorial();
      try {
        // The person just captured must be findable on the next loan.
        setPersonasRapidas(await getPersonasRapidas());
      } catch {
        // Autocomplete only; a stale list never blocks the capture.
      }
      // Back to the first field so several loans can be captured in a row
      // without touching the mouse.
      nombreAlumnoRef.current?.focus();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error al registrar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setNombreAlumno("");
    setCodigoAlumno("");
    setNombreEquipo("");
    setObservaciones("");
    setSelectedEquipos([]);
    setComboOpen(false);
    setHighlightIndex(-1);
    setPersonaComboOpen(false);
    setPersonaHighlight(-1);
    setFieldErrors([]);
    setErrorMessage("");
    setSuccessMessage("");
    nombreAlumnoRef.current?.focus();
  };

  const handleMarcarDevuelto = async (id: number) => {
    try {
      await marcarPrestamoRapidoDevuelto(id);
      await loadHistorial();
      setSuccessMessage("Marcado como devuelto.");
    } catch (err) {
      setErrorMessage("Error al marcar devuelto.");
    }
  };

  const handleEliminar = async (item: PrestamoRapidoAlumno) => {
    const confirmado = await confirmDialog(
      `¿Eliminar el registro de ${item.nombre_alumno} (${item.nombre_equipo})?\n\nEsta acción no se puede deshacer.`
    );
    if (!confirmado) return;
    try {
      await deletePrestamoRapidoAlumno(item.id);
      await loadHistorial();
      setSuccessMessage("Registro eliminado.");
    } catch (err) {
      // The inventory-link guard throws actionable copy; show it verbatim.
      setErrorMessage(err instanceof Error ? err.message : "Error al eliminar.");
    }
  };

  if (loading) {
    return (
      <div className="loading-state" role="status" aria-live="polite">
        <Icon name="spinner" className="loading-spinner" />
        <p>Cargando...</p>
      </div>
    );
  }

  if (state.status !== "authenticated") {
    return (
      <div className="prestamo-auth-page">
        <header className="prestamo-auth-header">
          <Link to="/" className="prestamo-auth-back" aria-label="Volver a la página principal">
            <Icon name="arrowLeft" />
            <span>Volver</span>
          </Link>
          <img src={logoP15} alt="Preparatoria Quince" className="prestamo-auth-header-logo" />
        </header>
        <main className="prestamo-auth-gate">
          <section className="prestamo-auth-card" aria-labelledby="prestamo-auth-title">
            <div className="prestamo-auth-intro">
              <div className="prestamo-auth-logo-wrap" aria-hidden="true">
                <img src={logoP15} alt="" />
              </div>
              <div>
                <p className="prestamo-auth-eyebrow">Préstamos rápidos · P15</p>
                <h1 id="prestamo-auth-title">Acceso administrativo</h1>
                <p>Identifícate para registrar y administrar préstamos.</p>
              </div>
            </div>
            <div className="prestamo-auth-notice" role="note">
              <Icon name="check" className="prestamo-auth-notice-icon" />
              <div>
                <strong>Solo personal autorizado</strong>
                <span>Administradores y responsables del área de cómputo con permisos vigentes.</span>
              </div>
            </div>
            <LoginForm onSubmit={handleLogin} />
          </section>
        </main>
      </div>
    );
  }

  const chips: Array<{ value: FilterEstado; label: string; count: number; tone: string }> = [
    { value: "activo", label: "En préstamo", count: counts.activos, tone: "activo" },
    { value: "vencido", label: "Más de 1 día", count: counts.vencidos, tone: "vencido" },
    { value: "devuelto", label: "Devueltos", count: counts.devueltos, tone: "devuelto" },
    { value: "todos", label: "Todos", count: counts.total, tone: "todos" },
  ];

  return (
    <div className="prestamo-rapido-page">
      <header className="page-header">
        <Link to="/" className="back-link" aria-label="Volver a la página principal">
          <Icon name="arrowLeft" />
          <span>Volver</span>
        </Link>
        <SessionBadge session={state.session} onLogout={logout} />
        <img src={logoP15} alt="Logo Preparatoria Quince" className="header-logo" />
      </header>

      <div className="content-wrapper">
        <section className="form-card" aria-labelledby="form-title">
          <div className="form-card-header">
            <h1 id="form-title" className="form-title">
              <Icon name="package" className="form-icon" />
              Nuevo préstamo
            </h1>
            <p className="form-subtitle">Datos del {personaNoun} y el objeto prestado.</p>
          </div>

          {errorMessage && (
            <div className="alert alert-error" role="alert" aria-live="assertive">
              <Icon name="alert" className="alert-icon" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="alert alert-success" role="status" aria-live="polite">
              <Icon name="checkCircle" className="alert-icon" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate aria-describedby="form-description">
            <p id="form-description" className="visually-hidden">
              Formulario para registrar un préstamo rápido a una persona (alumno o profesor).
              Complete todos los campos obligatorios: nombre, código y objeto prestado.
              La identidad del administrador se registra automáticamente.
            </p>

            <div className="form-group tipo-persona-group">
              <span className="form-label" id="tipo-persona-label">
                Registrar préstamo para
              </span>
              <div className="segmented-toggle" role="group" aria-labelledby="tipo-persona-label">
                <button
                  type="button"
                  className={`segment-btn ${tipoPersona === "alumno" ? "is-active" : ""}`}
                  aria-pressed={tipoPersona === "alumno"}
                  onClick={() => handleTipoChange("alumno")}
                  disabled={isSubmitting}
                >
                  Alumno
                </button>
                <button
                  type="button"
                  className={`segment-btn ${tipoPersona === "profesor" ? "is-active" : ""}`}
                  aria-pressed={tipoPersona === "profesor"}
                  onClick={() => handleTipoChange("profesor")}
                  disabled={isSubmitting}
                >
                  Profesor
                </button>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="nombreAlumno" className="form-label">
                  {nombreLabel}
                  <span className="required-indicator" aria-hidden="true">*</span>
                </label>
                <div className="combo">
                  <input
                    ref={nombreAlumnoRef}
                    id="nombreAlumno"
                    type="text"
                    role="combobox"
                    aria-expanded={personaComboOpen}
                    aria-controls="persona-listbox"
                    aria-autocomplete="list"
                    aria-activedescendant={
                      personaComboOpen && personaActiveIndex >= 0
                        ? `persona-opt-${personaActiveIndex}`
                        : undefined
                    }
                    value={nombreAlumno}
                    onChange={(e) => {
                      setNombreAlumno(e.target.value);
                      setPersonaComboOpen(true);
                      setPersonaHighlight(-1);
                      setFieldErrors((prev) => prev.filter((err) => err.field !== "nombreAlumno"));
                    }}
                    onKeyDown={handlePersonaKeyDown}
                    onBlur={() => setPersonaComboOpen(false)}
                    placeholder={nombrePlaceholder}
                    className={`form-input ${getFieldError("nombreAlumno") ? "input-error" : ""}`}
                    disabled={isSubmitting}
                    autoComplete="off"
                    autoFocus
                    aria-required="true"
                    aria-invalid={getFieldError("nombreAlumno") ? "true" : "false"}
                    aria-describedby={getFieldError("nombreAlumno") ? "nombreAlumno-error" : undefined}
                  />
                  <span className="combo-glyph" aria-hidden="true">
                    <Icon name="search" />
                  </span>
                  {personaComboOpen && (
                    personaResults.length > 0 ? (
                      <ul
                        id="persona-listbox"
                        role="listbox"
                        aria-label={`Coincidencias de ${personaNoun}`}
                        className="combo-options"
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {personaResults.map((persona, index) => (
                          <li
                            key={`${persona.codigo}-${persona.fuente}`}
                            id={`persona-opt-${index}`}
                            role="option"
                            aria-selected={index === personaActiveIndex}
                            className={`combo-option ${index === personaActiveIndex ? "is-highlighted" : ""}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectPersona(persona)}
                          >
                            <span className="combo-option-name">{persona.nombre}</span>
                            <span className="combo-option-meta">{persona.codigo}</span>
                            <span
                              className={`persona-fuente persona-fuente-${persona.fuente}`}
                            >
                              {persona.fuente === "directorio" ? "Directorio" : "Ya prestó antes"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : nombreAlumno.trim() ? (
                      <div className="combo-empty">
                        Sin coincidencias · se guardará como {personaNoun} nuevo
                      </div>
                    ) : null
                  )}
                </div>
                {getFieldError("nombreAlumno") && (
                  <span id="nombreAlumno-error" className="field-error" role="alert">
                    {getFieldError("nombreAlumno")}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="codigoAlumno" className="form-label">
                  {codigoLabel}
                  <span className="required-indicator" aria-hidden="true">*</span>
                </label>
                <input
                  ref={codigoAlumnoRef}
                  id="codigoAlumno"
                  type="text"
                  value={codigoAlumno}
                  onChange={(e) => {
                    setCodigoAlumno(e.target.value);
                    setFieldErrors((prev) => prev.filter((err) => err.field !== "codigoAlumno"));
                  }}
                  placeholder="Ej. 315890102"
                  className={`form-input ${getFieldError("codigoAlumno") ? "input-error" : ""}`}
                  disabled={isSubmitting}
                  autoComplete="off"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  aria-required="true"
                  aria-invalid={getFieldError("codigoAlumno") ? "true" : "false"}
                  aria-describedby={getFieldError("codigoAlumno") ? "codigoAlumno-error" : undefined}
                />
                {getFieldError("codigoAlumno") && (
                  <span id="codigoAlumno-error" className="field-error" role="alert">
                    {getFieldError("codigoAlumno")}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="nombreEquipo" className="form-label">
                  Objeto Prestado
                  <span className="required-indicator" aria-hidden="true">*</span>
                </label>
                {selectedEquipos.length > 0 && (
                  <ul className="equipo-chip-list" aria-label="Objetos agregados al préstamo">
                    {selectedEquipos.map((equipo) => (
                      <li key={equipo.id} className="equipo-selected-chip">
                        <Icon name="checkCircle" className="equipo-chip-icon" />
                        <span className="equipo-chip-text">{equipo.nombre_equipo}</span>
                        <button
                          type="button"
                          className="equipo-chip-remove"
                          onClick={() => removeEquipo(equipo.id)}
                          aria-label={`Quitar ${equipo.nombre_equipo} del préstamo`}
                        >
                          <Icon name="x" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="combo">
                  <input
                    ref={nombreEquipoRef}
                    id="nombreEquipo"
                    type="text"
                    role="combobox"
                    aria-expanded={comboOpen}
                    aria-controls="equipo-listbox"
                    aria-autocomplete="list"
                    aria-activedescendant={
                      comboOpen && activeOptionIndex >= 0
                        ? `equipo-opt-${activeOptionIndex}`
                        : undefined
                    }
                    value={nombreEquipo}
                    onChange={(e) => handleEquipoInputChange(e.target.value)}
                    onKeyDown={handleEquipoKeyDown}
                    onBlur={() => setComboOpen(false)}
                    placeholder={
                      selectedEquipos.length > 0
                        ? "Agregar otro objeto..."
                        : "Ej. Proyector, Laptop, HDMI..."
                    }
                    className={`form-input ${getFieldError("nombreEquipo") ? "input-error" : ""}`}
                    disabled={isSubmitting}
                    autoComplete="off"
                    aria-required="true"
                    aria-invalid={getFieldError("nombreEquipo") ? "true" : "false"}
                    aria-describedby={
                      getFieldError("nombreEquipo") || selectedEquipos.length > 0
                        ? getFieldError("nombreEquipo")
                          ? "nombreEquipo-error"
                          : "nombreEquipo-hint"
                        : undefined
                    }
                  />
                  <span className="combo-glyph" aria-hidden="true">
                    <Icon name="search" />
                  </span>
                  {comboOpen && (
                    equipoResults.length > 0 ? (
                      <ul
                        id="equipo-listbox"
                        role="listbox"
                        aria-label="Coincidencias del inventario"
                        className="combo-options"
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {equipoResults.map((equipo, index) => (
                          <li
                            key={equipo.id}
                            id={`equipo-opt-${index}`}
                            role="option"
                            aria-selected={index === activeOptionIndex}
                            className={`combo-option ${index === activeOptionIndex ? "is-highlighted" : ""}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectEquipo(equipo)}
                          >
                            <span className="combo-option-name">{equipo.nombre_equipo}</span>
                            <span className="combo-option-meta">
                              {equipo.categoria_nombre}
                              {equipo.identificador ? ` · ${equipo.identificador}` : ""}
                            </span>
                            {equipo.es_granel === 1 ? (
                              <span
                                className={`combo-option-stock ${
                                  Math.max(equipo.stock_disponible, 0) > 0 ? "is-ok" : "is-out"
                                }`}
                              >
                                {Math.max(equipo.stock_disponible, 0)} de {equipo.stock_total} disponibles
                              </span>
                            ) : (
                              <span className={`estado-dot estado-${equipo.estado} ${ESTADO_INVENTARIO_LABELS[equipo.estado] ? "" : "estado-otro"}`}>
                                {ESTADO_INVENTARIO_LABELS[equipo.estado] ?? equipo.estado}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : nombreEquipo.trim() ? (
                      <div className="combo-empty">
                        Sin coincidencias en el inventario · se guardará como texto libre
                      </div>
                    ) : null
                  )}
                </div>
                {!getFieldError("nombreEquipo") && selectedEquipos.length > 0 && (
                  <span id="nombreEquipo-hint" className="equipo-field-hint">
                    {selectedEquipos.length === 1
                      ? "Se registrará 1 objeto contra el inventario. La devolución lo actualizará automáticamente."
                      : `Se registrarán ${selectedEquipos.length} objetos contra el inventario, cada uno se devuelve por separado.`}
                  </span>
                )}
                {getFieldError("nombreEquipo") && (
                  <span id="nombreEquipo-error" className="field-error" role="alert">
                    {getFieldError("nombreEquipo")}
                  </span>
                )}
              </div>

              <div className="form-group form-group-full">
                <label htmlFor="observaciones" className="form-label">
                  Observaciones
                  <span className="optional-indicator">(opcional)</span>
                </label>
                <textarea
                  id="observaciones"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Algún detalle adicional sobre el préstamo..."
                  className="form-input form-textarea"
                  disabled={isSubmitting}
                  rows={2}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={handleClear}
                className="btn btn-secondary"
                disabled={isSubmitting}
                aria-label="Limpiar todos los campos del formulario"
              >
                <Icon name="refresh" />
                Limpiar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Icon name="spinner" className="btn-spinner" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Icon name="save" />
                    Registrar Préstamo
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        <section className="historial-card" aria-labelledby="historial-title">
          <div className="historial-header">
            <div className="historial-heading-row">
              <h2 id="historial-title" className="historial-title">
                <Icon name="clipboard" />
                Historial
              </h2>
              <div className="search-wrapper">
                <label htmlFor="busqueda-historial" className="visually-hidden">Buscar en historial</label>
                <input
                  id="busqueda-historial"
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar persona, código u objeto..."
                  className="search-input"
                  aria-label="Buscar en historial de préstamos"
                />
              </div>
            </div>

            <div className="hist-chips" role="group" aria-label="Filtrar historial por estado">
              {chips.map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => setFiltroEstado(chip.value)}
                  className={`hist-chip hist-chip-${chip.tone} ${filtroEstado === chip.value ? "is-active" : ""}`}
                  aria-pressed={filtroEstado === chip.value}
                >
                  <span className="hist-chip-count">{chip.count}</span>
                  <span className="hist-chip-label">{chip.label}</span>
                </button>
              ))}
            </div>
          </div>

          {filtrados.length === 0 ? (
            <div className="empty-state" role="status">
              <Icon name={historial.length === 0 ? "inbox" : "search"} className="empty-icon" />
              <p className="empty-message">
                {historial.length === 0 ? "No hay registros todavía." : "Nada coincide con este filtro."}
              </p>
              <p className="empty-hint">
                {historial.length === 0
                  ? "Los préstamos que registres aparecerán en esta lista."
                  : "Prueba con otro estado o limpia la búsqueda."}
              </p>
            </div>
          ) : (
            <div className="table-wrapper" role="region" aria-label="Tabla de historial de préstamos" tabIndex={0}>
              <table className="historial-table">
                <caption className="visually-hidden">
                  Historial de préstamos rápidos registrados en el sistema.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Persona</th>
                    <th scope="col">Objeto</th>
                    <th scope="col">Tiempo</th>
                    <th scope="col">Estado</th>
                    <th scope="col"><span className="visually-hidden">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((item) => {
                    const vencido = isVencido(item, now);
                    const autorizante = item.autorizante_nombre || item.persona_prestamo || "—";
                    return (
                      <tr key={item.id} className={vencido ? "row-vencido" : undefined}>
                        <td data-label="Persona" className="cell-primary">
                          <span className="cell-name">{item.nombre_alumno}</span>
                          {item.tipo_persona === "profesor" && (
                            <span className="tipo-badge">Profesor</span>
                          )}
                          <span className="cell-meta">
                            {item.codigo_alumno} · autorizó {autorizante}
                          </span>
                        </td>
                        <td data-label="Objeto">
                          <span className="cell-name">{item.nombre_equipo}</span>
                          {item.observaciones?.trim() && (
                            <span className="cell-meta">{item.observaciones}</span>
                          )}
                        </td>
                        <td data-label="Tiempo" className="cell-tiempo">
                          <span
                            className={vencido ? "tiempo-vencido" : undefined}
                            title={`Salida: ${formatSqliteDateTime(item.fecha_salida)}`}
                          >
                            {timeAgo(item.fecha_salida, now)}
                          </span>
                          {item.estado === "devuelto" && item.fecha_retorno && (
                            <span className="cell-meta">
                              devuelto {timeAgo(item.fecha_retorno, now)}
                            </span>
                          )}
                        </td>
                        <td data-label="Estado">
                          <span
                            className={`status-badge status-${vencido ? "vencido" : item.estado}`}
                            aria-label={`Estado: ${vencido ? "Vencido, más de un día" : item.estado === "activo" ? "Activo" : "Devuelto"}`}
                          >
                            {vencido ? (
                              <>
                                <Icon name="alert" />
                                Más de 1 día
                              </>
                            ) : item.estado === "activo" ? (
                              <>
                                <Icon name="dot" />
                                En préstamo
                              </>
                            ) : (
                              <>
                                <Icon name="check" />
                                Devuelto
                              </>
                            )}
                          </span>
                        </td>
                        <td data-label="Acciones" className="cell-actions">
                          {item.estado === "activo" && (
                            <button
                              onClick={() => handleMarcarDevuelto(item.id)}
                              className="action-btn action-success"
                              aria-label={`Marcar como devuelto el equipo ${item.nombre_equipo} prestado a ${item.nombre_alumno}`}
                            >
                              Devolver
                            </button>
                          )}
                          <button
                            onClick={() => handleEliminar(item)}
                            className="action-btn action-delete"
                            title="Eliminar registro"
                            aria-label={`Eliminar registro de ${item.nombre_alumno}`}
                          >
                            <Icon name="trash" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <style>{`
        .prestamo-rapido-page {
          height: 100dvh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          gap: clamp(0.6rem, 1.4vh, 1rem);
          background: var(--surface-sunken);
          padding: clamp(0.6rem, 1.6vh, 1rem) clamp(0.75rem, 2vw, 1.5rem);
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100dvh;
          background: var(--surface-sunken);
          gap: 1rem;
        }
        .loading-spinner {
          font-size: 2.5rem;
          color: var(--brand-primary);
          animation: spin 1s linear infinite;
        }

        .page-header {
          display: flex;
          align-items: center;
          gap: clamp(0.6rem, 1.5vw, 1.2rem);
          max-width: 1600px;
          width: 100%;
          margin: 0 auto;
          flex-shrink: 0;
        }
        .page-header .session-badge {
          margin-left: auto;
          padding: 0.45rem 0.8rem;
          font-size: 0.88rem;
        }

        .back-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          color: var(--brand-primary);
          font-weight: 600;
          font-size: clamp(0.85rem, 1.4vw, 1rem);
          padding: 0.5rem 0.9rem;
          border-radius: 12px;
          border: 1.5px solid var(--border-subtle);
          background: var(--surface-default);
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .back-link:hover {
          background: var(--surface-sunken);
          border-color: var(--brand-primary);
          transform: translateY(-1px);
        }
        .back-link:focus-visible {
          outline: 2px solid var(--brand-primary);
          outline-offset: 2px;
        }

        .header-logo {
          height: clamp(32px, 4.5vh, 46px);
          flex-shrink: 0;
          filter: drop-shadow(0 4px 8px rgba(15, 23, 42, 0.15));
        }

        .content-wrapper {
          max-width: 1600px;
          width: 100%;
          margin: 0 auto;
          flex: 1;
          min-height: 0;
          display: grid;
          grid-template-columns: minmax(320px, 400px) 1fr;
          gap: clamp(0.75rem, 1.5vw, 1.25rem);
          align-items: stretch;
        }

        .form-card,
        .historial-card {
          background: var(--surface-default);
          border-radius: 20px;
          padding: clamp(1rem, 2vh, 1.6rem);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
          border: 1px solid rgba(148, 163, 184, 0.12);
          min-height: 0;
          min-width: 0;
        }
        .form-card {
          overflow-x: hidden;
          overflow-y: auto;
        }
        .historial-card {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .form-card-header {
          margin-bottom: 1.1rem;
        }

        .form-title {
          font-size: clamp(1.15rem, 2.2vh, 1.5rem);
          font-weight: 800;
          color: var(--text-primary);
          margin: 0 0 0.25rem 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          letter-spacing: -0.02em;
        }
        .form-icon {
          font-size: 1.2em;
        }

        .form-subtitle {
          font-size: clamp(0.82rem, 1.5vh, 0.95rem);
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.4;
        }

        .alert {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          margin-bottom: 1rem;
          font-weight: 600;
          font-size: clamp(0.82rem, 1.4vh, 0.92rem);
          animation: slideDown 0.3s ease;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .alert-icon {
          font-size: 1.15em;
          flex-shrink: 0;
        }
        .alert-error {
          background: linear-gradient(135deg, #fef2f2, #fee2e2);
          border: 1px solid #fecaca;
          color: #991b1b;
          border-left: 5px solid #ef4444;
        }
        .alert-success {
          background: linear-gradient(135deg, #f0fdf4, #dcfce7);
          border: 1px solid #bbf7d0;
          color: #166534;
          border-left: 5px solid #22c55e;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.9rem;
          margin-bottom: 1.1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .form-group-full {
          grid-column: 1 / -1;
        }

        .form-label {
          font-size: clamp(0.8rem, 1.4vh, 0.92rem);
          font-weight: 700;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .required-indicator {
          color: #ef4444;
          font-size: 0.85em;
        }
        .optional-indicator {
          color: var(--text-secondary);
          font-weight: 500;
          font-size: 0.85em;
        }

        .form-input {
          padding: 0.7rem 0.95rem;
          border-radius: 12px;
          border: 2px solid var(--border-subtle);
          background: var(--surface-sunken);
          color: var(--text-primary);
          font-size: clamp(0.88rem, 1.5vh, 1rem);
          font-family: inherit;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
          width: 100%;
          box-sizing: border-box;
        }
        .form-input::placeholder {
          color: var(--text-secondary);
          opacity: 0.7;
        }
        .form-input:hover:not(:disabled) {
          border-color: #94a3b8;
        }
        .form-input:focus {
          outline: none;
          border-color: var(--brand-primary);
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
          background: var(--surface-default);
        }
        .form-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .form-input.input-error {
          border-color: #ef4444;
          background: #fef2f2;
        }
        .form-input.input-error:focus {
          border-color: #ef4444;
          box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.12);
        }

        .form-textarea {
          resize: vertical;
          min-height: 62px;
        }

        .field-error {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: clamp(0.75rem, 1.2vh, 0.85rem);
          font-weight: 600;
          color: #ef4444;
        }
        /* Same warning glyph as <Icon name="alert" />, as a mask so it picks up
           the text color. CSS content: cannot hold an inline SVG element. */
        .field-error::before {
          content: "";
          width: 0.95em;
          height: 0.95em;
          flex-shrink: 0;
          background: currentColor;
          -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 4 2.5 20h19zM12 10v4M12 17.4v.2'/%3E%3C/svg%3E") center / contain no-repeat;
          mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 4 2.5 20h19zM12 10v4M12 17.4v.2'/%3E%3C/svg%3E") center / contain no-repeat;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.7rem;
          flex-wrap: wrap;
          padding-top: 0.75rem;
          border-top: 1px solid var(--border-subtle);
        }

        /* --- Alumno / Profesor segmented toggle --- */
        .tipo-persona-group {
          margin-bottom: 0.9rem;
        }
        .segmented-toggle {
          display: inline-flex;
          gap: 4px;
          padding: 4px;
          border-radius: 14px;
          background: var(--surface-sunken);
          border: 1.5px solid var(--border-subtle);
          width: max-content;
        }
        .segment-btn {
          padding: 0.55rem 1.25rem;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-family: inherit;
          font-size: clamp(0.85rem, 1.4vh, 0.95rem);
          font-weight: 700;
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .segment-btn:hover:not(:disabled):not(.is-active) {
          color: var(--text-primary);
        }
        .segment-btn:focus-visible {
          outline: 2px solid var(--brand-primary);
          outline-offset: 2px;
        }
        .segment-btn.is-active {
          background: var(--brand-primary);
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
        }
        .segment-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* --- Inventory combobox for "Objeto Prestado" --- */
        .combo {
          position: relative;
        }
        .combo .form-input {
          padding-right: 2.4rem;
        }
        .combo-glyph {
          position: absolute;
          right: 0.85rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-secondary);
          display: inline-flex;
          pointer-events: none;
        }
        .combo-options {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          z-index: 30;
          margin: 0;
          padding: 0.35rem;
          list-style: none;
          background: var(--surface-default);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
          max-height: min(320px, 40vh);
          overflow-y: auto;
        }
        .combo-option {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
          padding: 0.55rem 0.7rem;
          border-radius: 10px;
          cursor: pointer;
        }
        .combo-option:hover,
        .combo-option.is-highlighted {
          background: var(--surface-sunken);
        }
        .combo-option.is-highlighted .combo-option-name {
          color: var(--brand-primary);
        }
        .combo-option-name {
          font-weight: 700;
          font-size: clamp(0.84rem, 1.4vh, 0.95rem);
          color: var(--text-primary);
          line-height: 1.3;
        }
        .combo-option-meta {
          font-size: 0.78rem;
          color: var(--text-secondary);
          line-height: 1.3;
        }
        .combo-option-stock,
        .estado-dot {
          align-self: flex-start;
          margin-top: 0.15rem;
          font-size: 0.74rem;
          font-weight: 700;
        }
        .combo-option-stock {
          padding: 0.12rem 0.5rem;
          border-radius: 999px;
        }
        .combo-option-stock.is-ok {
          background: #dcfce7;
          color: #166534;
        }
        .combo-option-stock.is-out {
          background: #fee2e2;
          color: #991b1b;
        }
        .estado-dot {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }
        .estado-dot::before {
          content: "";
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 999px;
          background: currentColor;
          flex-shrink: 0;
        }
        .estado-disponible {
          color: #15803d;
        }
        .estado-prestado {
          color: #b45309;
        }
        .estado-extraviado {
          color: #b91c1c;
        }
        .estado-otro {
          color: var(--text-secondary);
        }
        /* Tells apart an official directory entry from someone remembered
           from a previous loan. */
        .persona-fuente {
          align-self: flex-start;
          margin-top: 0.15rem;
          padding: 0.12rem 0.5rem;
          border-radius: 999px;
          font-size: 0.68rem;
          font-weight: 800;
          white-space: nowrap;
        }
        .persona-fuente-directorio {
          background: #dbeafe;
          color: #1e40af;
          border: 1px solid #bfdbfe;
        }
        .persona-fuente-historial {
          background: var(--surface-sunken);
          color: var(--text-secondary);
          border: 1px solid var(--border-subtle);
        }

        .combo-empty {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          z-index: 30;
          padding: 0.6rem 0.75rem;
          background: var(--surface-default);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
          font-size: clamp(0.78rem, 1.3vh, 0.86rem);
          color: var(--text-secondary);
        }

        /* One chip per inventory item added to the loan. */
        .equipo-chip-list {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          list-style: none;
          margin: 0;
          padding: 0;
          min-width: 0;
        }
        .equipo-selected-chip {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 0.45rem;
          padding: 0.45rem 0.65rem;
          border-radius: 10px;
          background: linear-gradient(135deg, #ecfdf5, #d1fae5);
          border: 1px solid #6ee7b7;
          color: #065f46;
          font-size: clamp(0.78rem, 1.3vh, 0.88rem);
        }
        .equipo-chip-icon {
          flex-shrink: 0;
          font-size: 1.05em;
        }
        .equipo-chip-text {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .equipo-chip-remove {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border: none;
          border-radius: 8px;
          background: rgba(6, 95, 70, 0.12);
          color: #065f46;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }
        .equipo-chip-remove:hover {
          background: rgba(6, 95, 70, 0.22);
        }
        .equipo-chip-remove:focus-visible {
          outline: 2px solid var(--brand-primary);
          outline-offset: 2px;
        }
        .equipo-field-hint {
          font-size: clamp(0.72rem, 1.2vh, 0.82rem);
          color: var(--text-secondary);
        }

        /* Subtle person-type pill in the historial rows. */
        .tipo-badge {
          display: inline-flex;
          align-items: center;
          align-self: flex-start;
          width: max-content;
          padding: 0.14rem 0.55rem;
          border-radius: 999px;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.02em;
          background: linear-gradient(135deg, #ede9fe, #ddd6fe);
          color: #5b21b6;
          border: 1px solid #c4b5fd;
          margin-top: 0.12rem;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.7rem 1.3rem;
          border-radius: 12px;
          border: none;
          font-size: clamp(0.88rem, 1.5vh, 1rem);
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          min-height: 46px;
        }
        .btn:focus-visible {
          outline: 2px solid var(--brand-primary);
          outline-offset: 2px;
        }
        .btn-primary {
          background: linear-gradient(135deg, #10b981, #059669);
          color: #ffffff;
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
          flex: 1;
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(16, 185, 129, 0.4);
          filter: brightness(1.05);
        }
        .btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }
        .btn-primary:disabled {
          background: #9ca3af;
          box-shadow: none;
          cursor: not-allowed;
        }
        .btn-secondary {
          background: var(--surface-sunken);
          color: var(--text-secondary);
          border: 1.5px solid var(--border-subtle);
        }
        .btn-secondary:hover:not(:disabled) {
          background: var(--surface-default);
          border-color: var(--brand-primary);
          color: var(--brand-primary);
          transform: translateY(-1px);
        }
        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-spinner {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .historial-header {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 0.9rem;
          flex-shrink: 0;
        }
        .historial-heading-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .historial-title {
          font-size: clamp(1.05rem, 1.9vh, 1.35rem);
          font-weight: 800;
          color: var(--text-primary);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .search-wrapper {
          flex: 1;
          min-width: 200px;
          max-width: 340px;
        }
        .search-input {
          padding: 0.6rem 0.95rem;
          border-radius: 12px;
          border: 1.5px solid var(--border-subtle);
          background: var(--surface-sunken);
          color: var(--text-primary);
          font-size: clamp(0.84rem, 1.4vh, 0.94rem);
          font-family: inherit;
          width: 100%;
          box-sizing: border-box;
          transition: all 0.2s ease;
        }
        .search-input:focus {
          outline: none;
          border-color: var(--brand-primary);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
          background: var(--surface-default);
        }
        .search-input::placeholder {
          color: var(--text-secondary);
        }

        .hist-chips {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .hist-chip {
          display: flex;
          align-items: baseline;
          gap: 0.4rem;
          padding: 0.45rem 0.85rem;
          border-radius: 999px;
          border: 1.5px solid var(--border-subtle);
          background: var(--surface-sunken);
          color: var(--text-secondary);
          font-family: inherit;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .hist-chip:hover {
          border-color: #94a3b8;
          transform: translateY(-1px);
        }
        .hist-chip:focus-visible {
          outline: 2px solid var(--brand-primary);
          outline-offset: 2px;
        }
        .hist-chip-count {
          font-size: 1.05rem;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1;
        }
        .hist-chip.is-active {
          background: var(--brand-primary);
          border-color: var(--brand-primary);
          color: #ffffff;
        }
        .hist-chip.is-active .hist-chip-count {
          color: #ffffff;
        }
        .hist-chip-vencido .hist-chip-count {
          color: #dc2626;
        }
        .hist-chip-vencido.is-active {
          background: #dc2626;
          border-color: #dc2626;
        }
        .hist-chip-vencido.is-active .hist-chip-count {
          color: #ffffff;
        }

        .empty-state {
          text-align: center;
          padding: 2.5rem 1.5rem;
          background: var(--surface-sunken);
          border-radius: 16px;
        }
        .empty-icon {
          font-size: 2.5rem;
          display: block;
          margin: 0 auto 0.75rem;
          color: var(--text-secondary);
          stroke-width: 1.5;
        }
        .empty-message {
          font-size: clamp(0.92rem, 1.7vh, 1.05rem);
          color: var(--text-primary);
          font-weight: 600;
          margin: 0 0 0.3rem;
        }
        .empty-hint {
          font-size: clamp(0.8rem, 1.3vh, 0.9rem);
          color: var(--text-secondary);
          margin: 0;
        }

        .table-wrapper {
          flex: 1;
          min-height: 0;
          overflow: auto;
          border-radius: 12px;
          border: 1px solid var(--border-subtle);
        }
        .table-wrapper:focus-visible {
          outline: 2px solid var(--brand-primary);
          outline-offset: 2px;
        }

        .historial-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 520px;
        }
        .historial-table th {
          position: sticky;
          top: 0;
          z-index: 1;
          background: var(--surface-sunken);
          padding: 0.7rem 0.85rem;
          text-align: left;
          font-size: clamp(0.68rem, 1.1vh, 0.78rem);
          font-weight: 800;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 2px solid var(--border-subtle);
        }
        .historial-table td {
          padding: 0.6rem 0.85rem;
          font-size: clamp(0.8rem, 1.35vh, 0.9rem);
          color: var(--text-primary);
          vertical-align: middle;
          border-bottom: 1px solid var(--border-subtle);
        }
        .historial-table tbody tr {
          transition: background 0.15s ease;
        }
        .historial-table tbody tr:hover {
          background: rgba(37, 99, 235, 0.04);
        }
        .historial-table tbody tr:last-child td {
          border-bottom: none;
        }
        .historial-table tbody tr.row-vencido {
          background: rgba(220, 38, 38, 0.05);
        }
        .historial-table tbody tr.row-vencido td:first-child {
          box-shadow: inset 3px 0 0 #dc2626;
        }

        .cell-primary {
          font-weight: 700;
        }
        .cell-name {
          display: block;
          line-height: 1.3;
        }
        .cell-meta {
          display: block;
          font-size: 0.78em;
          font-weight: 500;
          color: var(--text-secondary);
          line-height: 1.3;
          margin-top: 0.1rem;
        }
        .cell-tiempo {
          white-space: nowrap;
          font-weight: 600;
        }
        .tiempo-vencido {
          color: #dc2626;
          font-weight: 800;
        }
        .cell-actions {
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
          padding: 0.28rem 0.7rem;
          border-radius: 999px;
          font-size: 0.74rem;
          font-weight: 800;
          gap: 0.3rem;
        }
        .status-activo {
          background: linear-gradient(135deg, #dcfce7, #bbf7d0);
          color: #166534;
          border: 1px solid #86efac;
        }
        .status-vencido {
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          color: #991b1b;
          border: 1px solid #fca5a5;
        }
        .status-devuelto {
          background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .action-btn {
          padding: 0.4rem 0.85rem;
          border-radius: 10px;
          border: none;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        .action-btn:focus-visible {
          outline: 2px solid var(--brand-primary);
          outline-offset: 2px;
        }
        .action-success {
          background: linear-gradient(135deg, #10b981, #059669);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
        }
        .action-success:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.35);
          filter: brightness(1.05);
        }
        /* Destructive action kept quiet and pushed away from "Devolver" so it
           is never the button an admin hits by reflex. */
        .action-delete {
          margin-left: auto;
          background: transparent;
          color: var(--text-secondary);
          opacity: 0.45;
          padding: 0.35rem 0.5rem;
          font-size: 0.95rem;
          line-height: 1;
        }
        .action-delete:hover {
          opacity: 1;
          background: #fee2e2;
          color: #991b1b;
        }

        .visually-hidden {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        /* Below this width the two columns stop fitting, so the page goes back
           to a single scrolling column. */
        @media (max-width: 1100px) {
          .prestamo-rapido-page {
            height: auto;
            min-height: 100dvh;
            overflow: visible;
          }
          .content-wrapper {
            grid-template-columns: 1fr;
          }
          .form-card {
            overflow: visible;
          }
          .historial-card {
            overflow: visible;
          }
          .table-wrapper {
            max-height: 60vh;
          }
        }

        @media (max-width: 768px) {
          .page-header {
            flex-wrap: wrap;
          }
          .page-header .session-badge {
            order: 3;
            width: 100%;
            margin-left: 0;
          }
          .header-logo {
            margin-left: auto;
          }
          .form-card,
          .historial-card {
            padding: 1.1rem;
            border-radius: 16px;
          }
          .historial-heading-row {
            flex-direction: column;
            align-items: stretch;
          }
          .search-wrapper {
            max-width: none;
          }
          .table-wrapper {
            max-height: none;
            border: none;
          }

          .historial-table,
          .historial-table tbody {
            display: block;
            min-width: 0;
          }
          .historial-table thead {
            display: none;
          }
          .historial-table tbody tr {
            display: block;
            margin-bottom: 0.75rem;
            border: 1px solid var(--border-subtle);
            border-radius: 14px;
            padding: 0.6rem;
            background: var(--surface-default);
          }
          .historial-table tbody tr.row-vencido td:first-child {
            box-shadow: none;
          }
          .historial-table td {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 0.75rem;
            padding: 0.35rem 0.4rem;
            border-bottom: 1px solid var(--border-subtle);
          }
          .historial-table td:last-child {
            border-bottom: none;
          }
          .historial-table td::before {
            content: attr(data-label);
            font-weight: 700;
            font-size: 0.78rem;
            color: var(--text-secondary);
            flex-shrink: 0;
          }
          .cell-name,
          .cell-meta {
            text-align: right;
          }
          .form-actions {
            flex-direction: column-reverse;
          }
          .btn {
            width: 100%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .btn,
          .back-link,
          .hist-chip,
          .action-btn,
          .form-input,
          .segment-btn,
          .equipo-chip-remove,
          .combo-option {
            transition: none;
          }
          .alert {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
