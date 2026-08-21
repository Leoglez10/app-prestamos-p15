import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import logoP15 from "../../img/logo-p15.png";
import {
  PrestamoRapidoAlumno,
  createPrestamoRapidoAlumno,
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

interface FieldError {
  field: string;
  message: string;
}

/** A loan is flagged as overdue once it has been out for more than a full day. */
const VENCIDO_MS = 24 * 60 * 60 * 1000;

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
        item.autorizante_nombre || item.persona_prestamo || "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [historial, busqueda, filtroEstado, now]);

  const validateFields = (): boolean => {
    const errors: FieldError[] = [];
    if (!nombreAlumno.trim()) {
      errors.push({ field: "nombreAlumno", message: "El nombre del alumno es obligatorio." });
    }
    if (!codigoAlumno.trim()) {
      errors.push({ field: "codigoAlumno", message: "El código UDG es obligatorio." });
    } else if (!/^\d+$/.test(codigoAlumno.trim())) {
      errors.push({ field: "codigoAlumno", message: "El código debe contener solo números." });
    }
    if (!nombreEquipo.trim()) {
      errors.push({ field: "nombreEquipo", message: "El objeto prestado es obligatorio." });
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
      await createPrestamoRapidoAlumno({
        nombre_alumno: nombreAlumno,
        codigo_alumno: codigoAlumno,
        nombre_equipo: nombreEquipo,
        observaciones: observaciones,
        admin: state.session.admin,
      });
      const registrado = nombreAlumno.trim();
      setNombreAlumno("");
      setCodigoAlumno("");
      setNombreEquipo("");
      setObservaciones("");
      setFieldErrors([]);
      setSuccessMessage(`Préstamo de ${registrado} registrado.`);
      await loadHistorial();
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
      setErrorMessage("Error al eliminar.");
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
            <p className="form-subtitle">Datos del alumno y el objeto prestado.</p>
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
              Formulario para registrar un préstamo rápido a un alumno.
              Complete todos los campos obligatorios: nombre del alumno, código UDG y
              objeto prestado. La identidad del administrador se registra automáticamente.
            </p>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="nombreAlumno" className="form-label">
                  Nombre del Alumno
                  <span className="required-indicator" aria-hidden="true">*</span>
                </label>
                <input
                  ref={nombreAlumnoRef}
                  id="nombreAlumno"
                  type="text"
                  value={nombreAlumno}
                  onChange={(e) => {
                    setNombreAlumno(e.target.value);
                    setFieldErrors((prev) => prev.filter((err) => err.field !== "nombreAlumno"));
                  }}
                  placeholder="Ej. Juan Pérez López"
                  className={`form-input ${getFieldError("nombreAlumno") ? "input-error" : ""}`}
                  disabled={isSubmitting}
                  autoComplete="name"
                  autoFocus
                  aria-required="true"
                  aria-invalid={getFieldError("nombreAlumno") ? "true" : "false"}
                  aria-describedby={getFieldError("nombreAlumno") ? "nombreAlumno-error" : undefined}
                />
                {getFieldError("nombreAlumno") && (
                  <span id="nombreAlumno-error" className="field-error" role="alert">
                    {getFieldError("nombreAlumno")}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="codigoAlumno" className="form-label">
                  Código UDG del Alumno
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
                <input
                  ref={nombreEquipoRef}
                  id="nombreEquipo"
                  type="text"
                  value={nombreEquipo}
                  onChange={(e) => {
                    setNombreEquipo(e.target.value);
                    setFieldErrors((prev) => prev.filter((err) => err.field !== "nombreEquipo"));
                  }}
                  placeholder="Ej. Proyector, Laptop, HDMI..."
                  className={`form-input ${getFieldError("nombreEquipo") ? "input-error" : ""}`}
                  disabled={isSubmitting}
                  autoComplete="off"
                  aria-required="true"
                  aria-invalid={getFieldError("nombreEquipo") ? "true" : "false"}
                  aria-describedby={getFieldError("nombreEquipo") ? "nombreEquipo-error" : undefined}
                />
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
                  placeholder="Buscar alumno, código u objeto..."
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
                    <th scope="col">Alumno</th>
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
                        <td data-label="Alumno" className="cell-primary">
                          <span className="cell-name">{item.nombre_alumno}</span>
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
        }
        .form-card {
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
          .form-input {
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
