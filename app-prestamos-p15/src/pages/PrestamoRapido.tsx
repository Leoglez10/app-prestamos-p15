import { FormEvent, useEffect, useRef, useState } from "react";
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

type FilterEstado = "todos" | "activo" | "devuelto";

interface FieldError {
  field: string;
  message: string;
}

export default function PrestamoRapido() {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);

  const [nombreAlumno, setNombreAlumno] = useState("");
  const [codigoAlumno, setCodigoAlumno] = useState("");
  const [nombreEquipo, setNombreEquipo] = useState("");
  const [personaPrestamo, setPersonaPrestamo] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [historial, setHistorial] = useState<PrestamoRapidoAlumno[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FilterEstado>("todos");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const firstErrorRef = useRef<HTMLInputElement | null>(null);
  const nombreAlumnoRef = useRef<HTMLInputElement>(null);
  const codigoAlumnoRef = useRef<HTMLInputElement>(null);
  const nombreEquipoRef = useRef<HTMLInputElement>(null);
  const personaPrestamoRef = useRef<HTMLInputElement>(null);

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

  const loadHistorial = async () => {
    const filters: { busqueda?: string; estado?: string } = {};
    if (busqueda.trim()) filters.busqueda = busqueda.trim();
    if (filtroEstado !== "todos") filters.estado = filtroEstado;
    const rows = await getPrestamosRapidosAlumnos(filters);
    setHistorial(rows);
  };

  useEffect(() => {
    if (!loading) {
      loadHistorial().catch(console.error);
    }
  }, [busqueda, filtroEstado]);

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
    if (!personaPrestamo.trim()) {
      errors.push({ field: "personaPrestamo", message: "La persona que presta es obligatoria." });
    }
    setFieldErrors(errors);
    if (errors.length > 0 && firstErrorRef.current) {
      firstErrorRef.current.focus();
    }
    return errors.length === 0;
  };

  const getFieldError = (field: string): string | undefined => {
    return fieldErrors.find((e) => e.field === field)?.message;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!validateFields()) return;

    setIsSubmitting(true);
    try {
      await createPrestamoRapidoAlumno({
        nombre_alumno: nombreAlumno,
        codigo_alumno: codigoAlumno,
        nombre_equipo: nombreEquipo,
        persona_prestamo: personaPrestamo,
        observaciones: observaciones,
      });
      setNombreAlumno("");
      setCodigoAlumno("");
      setNombreEquipo("");
      setPersonaPrestamo("");
      setObservaciones("");
      setFieldErrors([]);
      setSuccessMessage("Préstamo registrado correctamente.");
      await loadHistorial();
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
    setPersonaPrestamo("");
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

  const handleEliminar = async (id: number) => {
    if (!confirm("¿Eliminar este registro?")) return;
    try {
      await deletePrestamoRapidoAlumno(id);
      await loadHistorial();
      setSuccessMessage("Registro eliminado.");
    } catch (err) {
      setErrorMessage("Error al eliminar.");
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="loading-state" role="status" aria-live="polite">
        <div className="loading-spinner" aria-hidden="true">⏳</div>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="prestamo-rapido-page">
      <header className="page-header">
        <Link to="/" className="back-link" aria-label="Volver a la página principal">
          <span aria-hidden="true">←</span>
          <span>Volver</span>
        </Link>
        <img src={logoP15} alt="Logo Preparatoria Quince" className="header-logo" />
      </header>

      <div className="content-wrapper">
        <section className="form-card" aria-labelledby="form-title">
          <div className="form-card-header">
            <h1 id="form-title" className="form-title">
              <span className="form-icon" aria-hidden="true">📦</span>
              Registro de Préstamo Rápido
            </h1>
            <p className="form-subtitle">
              Complete los datos del alumno y el objeto prestado.
            </p>
          </div>

          {errorMessage && (
            <div className="alert alert-error" role="alert" aria-live="assertive">
              <span className="alert-icon" aria-hidden="true">⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="alert alert-success" role="status" aria-live="polite">
              <span className="alert-icon" aria-hidden="true">✅</span>
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate aria-describedby="form-description">
            <p id="form-description" className="visually-hidden">
              Formulario para registrar un préstamo rápido a un alumno.
              Complete todos los campos obligatorios: nombre del alumno, código UDG,
              objeto prestado y persona que realiza el préstamo.
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

              <div className="form-group">
                <label htmlFor="personaPrestamo" className="form-label">
                  Persona que Prestó
                  <span className="required-indicator" aria-hidden="true">*</span>
                </label>
                <input
                  ref={personaPrestamoRef}
                  id="personaPrestamo"
                  type="text"
                  value={personaPrestamo}
                  onChange={(e) => {
                    setPersonaPrestamo(e.target.value);
                    setFieldErrors((prev) => prev.filter((err) => err.field !== "personaPrestamo"));
                  }}
                  placeholder="Ej. Prof. Edgar Aguilar"
                  className={`form-input ${getFieldError("personaPrestamo") ? "input-error" : ""}`}
                  disabled={isSubmitting}
                  autoComplete="off"
                  aria-required="true"
                  aria-invalid={getFieldError("personaPrestamo") ? "true" : "false"}
                  aria-describedby={getFieldError("personaPrestamo") ? "personaPrestamo-error" : undefined}
                />
                {getFieldError("personaPrestamo") && (
                  <span id="personaPrestamo-error" className="field-error" role="alert">
                    {getFieldError("personaPrestamo")}
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
                  rows={3}
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
                <span aria-hidden="true">↺</span>
                Limpiar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="btn-spinner" aria-hidden="true">⏳</span>
                    Guardando...
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">💾</span>
                    Registrar Préstamo
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        <section className="historial-card" aria-labelledby="historial-title">
          <div className="historial-header">
            <h2 id="historial-title" className="historial-title">
              <span aria-hidden="true">📋</span>
              Historial de Préstamos
            </h2>
            <div className="historial-controls">
              <div className="search-wrapper">
                <label htmlFor="busqueda-historial" className="visually-hidden">Buscar en historial</label>
                <input
                  id="busqueda-historial"
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar..."
                  className="search-input"
                  aria-label="Buscar en historial de préstamos"
                />
              </div>
              <label htmlFor="filtro-estado" className="visually-hidden">Filtrar por estado</label>
              <select
                id="filtro-estado"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as FilterEstado)}
                className="filter-select"
                aria-label="Filtrar préstamos por estado"
              >
                <option value="todos">Todos</option>
                <option value="activo">Activos</option>
                <option value="devuelto">Devueltos</option>
              </select>
            </div>
          </div>

          {historial.length === 0 ? (
            <div className="empty-state" role="status">
              <span className="empty-icon" aria-hidden="true">📭</span>
              <p className="empty-message">No hay registros todavía.</p>
              <p className="empty-hint">Los préstamos que registres aparecerán en esta lista.</p>
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
                    <th scope="col">Código</th>
                    <th scope="col">Objeto</th>
                    <th scope="col">Prestó</th>
                    <th scope="col">Fecha Salida</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((item) => (
                    <tr key={item.id}>
                      <td data-label="Alumno" className="cell-primary">{item.nombre_alumno}</td>
                      <td data-label="Código" className="cell-secondary">{item.codigo_alumno}</td>
                      <td data-label="Objeto">{item.nombre_equipo}</td>
                      <td data-label="Prestó" className="cell-secondary">{item.persona_prestamo}</td>
                      <td data-label="Fecha" className="cell-secondary">{formatDate(item.fecha_salida)}</td>
                      <td data-label="Estado">
                        <span className={`status-badge status-${item.estado}`} aria-label={`Estado: ${item.estado === "activo" ? "Activo" : "Devuelto"}`}>
                          {item.estado === "activo" ? "● Activo" : "✓ Devuelto"}
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
                          onClick={() => handleEliminar(item.id)}
                          className="action-btn action-danger"
                          aria-label={`Eliminar registro de ${item.nombre_alumno}`}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <style>{`
        .prestamo-rapido-page {
          min-height: 100dvh;
          background: var(--surface-sunken);
          padding: clamp(0.75rem, 2vh, 1.5rem);
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
          animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.95); }
        }

        .page-header {
          display: flex;
          align-items: center;
          gap: clamp(0.6rem, 1.5vw, 1.2rem);
          max-width: 1200px;
          margin: 0 auto 1.5rem;
          padding: 0 0.5rem;
        }

        .back-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          color: var(--brand-primary);
          font-weight: 600;
          font-size: clamp(0.9rem, 1.5vw, 1.1rem);
          padding: 0.6rem 1rem;
          border-radius: 12px;
          border: 1.5px solid var(--border-subtle);
          background: var(--surface-default);
          transition: all 0.2s ease;
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
          height: clamp(36px, 5vh, 52px);
          margin-left: auto;
          filter: drop-shadow(0 4px 8px rgba(15, 23, 42, 0.15));
        }

        .content-wrapper {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }

        .form-card,
        .historial-card {
          background: var(--surface-default);
          border-radius: 24px;
          padding: clamp(1.25rem, 3vh, 2.5rem);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
          border: 1px solid rgba(148, 163, 184, 0.12);
          transition: box-shadow 0.3s ease;
        }
        .form-card:hover,
        .historial-card:hover {
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
        }

        .form-card-header {
          margin-bottom: 1.75rem;
        }

        .form-title {
          font-size: clamp(1.35rem, 2.5vh, 1.9rem);
          font-weight: 800;
          color: var(--text-primary);
          margin: 0 0 0.4rem 0;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          letter-spacing: -0.02em;
        }
        .form-icon {
          font-size: 1.2em;
        }

        .form-subtitle {
          font-size: clamp(0.88rem, 1.8vh, 1.05rem);
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.5;
        }

        .alert {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          border-radius: 14px;
          margin-bottom: 1.25rem;
          font-weight: 600;
          font-size: clamp(0.88rem, 1.5vh, 0.98rem);
          animation: slideDown 0.3s ease;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .alert-icon {
          font-size: 1.2em;
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
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .form-group-full {
          grid-column: 1 / -1;
        }

        .form-label {
          font-size: clamp(0.85rem, 1.5vh, 0.98rem);
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
          padding: 0.85rem 1.1rem;
          border-radius: 14px;
          border: 2px solid var(--border-subtle);
          background: var(--surface-sunken);
          color: var(--text-primary);
          font-size: clamp(0.9rem, 1.5vh, 1rem);
          font-family: inherit;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
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
          transform: translateY(-1px);
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
          min-height: 100px;
        }

        .field-error {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: clamp(0.78rem, 1.3vh, 0.88rem);
          font-weight: 600;
          color: #ef4444;
          margin-top: 0.15rem;
        }
        .field-error::before {
          content: "⚠️";
          font-size: 0.85em;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.85rem;
          flex-wrap: wrap;
          padding-top: 0.5rem;
          border-top: 1px solid var(--border-subtle);
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.85rem 1.75rem;
          border-radius: 14px;
          border: none;
          font-size: clamp(0.9rem, 1.5vh, 1rem);
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          min-height: 48px;
        }
        .btn:focus-visible {
          outline: 2px solid var(--brand-primary);
          outline-offset: 2px;
        }
        .btn-primary {
          background: linear-gradient(135deg, #10b981, #059669);
          color: #ffffff;
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
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
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .historial-title {
          font-size: clamp(1.15rem, 2vh, 1.55rem);
          font-weight: 800;
          color: var(--text-primary);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.55rem;
        }

        .historial-controls {
          display: flex;
          gap: 0.65rem;
          flex-wrap: wrap;
        }

        .search-wrapper {
          position: relative;
        }
        .search-input {
          padding: 0.65rem 1rem 0.65rem 2.5rem;
          border-radius: 12px;
          border: 1.5px solid var(--border-subtle);
          background: var(--surface-sunken);
          color: var(--text-primary);
          font-size: clamp(0.85rem, 1.4vh, 0.95rem);
          width: auto;
          min-width: 180px;
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

        .filter-select {
          padding: 0.65rem 2rem 0.65rem 0.9rem;
          border-radius: 12px;
          border: 1.5px solid var(--border-subtle);
          background: var(--surface-sunken);
          color: var(--text-primary);
          font-size: clamp(0.85rem, 1.4vh, 0.95rem);
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
          transition: all 0.2s ease;
        }
        .filter-select:focus {
          outline: none;
          border-color: var(--brand-primary);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .empty-state {
          text-align: center;
          padding: 3.5rem 1.5rem;
          background: var(--surface-sunken);
          border-radius: 18px;
        }
        .empty-icon {
          font-size: 3rem;
          display: block;
          margin-bottom: 1rem;
        }
        .empty-message {
          font-size: clamp(0.95rem, 1.8vh, 1.1rem);
          color: var(--text-primary);
          font-weight: 600;
          margin: 0 0 0.35rem;
        }
        .empty-hint {
          font-size: clamp(0.82rem, 1.4vh, 0.92rem);
          color: var(--text-secondary);
          margin: 0;
        }

        .table-wrapper {
          overflow-x: auto;
          border-radius: 14px;
          border: 1px solid var(--border-subtle);
        }
        .table-wrapper:focus {
          outline: 2px solid var(--brand-primary);
          outline-offset: 2px;
        }

        .historial-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 650px;
        }
        .historial-table thead {
          background: var(--surface-sunken);
        }
        .historial-table th {
          padding: 0.9rem 1rem;
          text-align: left;
          font-size: clamp(0.72rem, 1.2vh, 0.82rem);
          font-weight: 800;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 2px solid var(--border-subtle);
        }
        .historial-table td {
          padding: 0.85rem 1rem;
          font-size: clamp(0.82rem, 1.4vh, 0.92rem);
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

        .cell-primary {
          font-weight: 700;
        }
        .cell-secondary {
          color: var(--text-secondary);
        }
        .cell-actions {
          white-space: nowrap;
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.3rem 0.8rem;
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 800;
          gap: 0.35rem;
        }
        .status-activo {
          background: linear-gradient(135deg, #dcfce7, #bbf7d0);
          color: #166534;
          border: 1px solid #86efac;
        }
        .status-devuelto {
          background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .action-btn {
          padding: 0.45rem 0.9rem;
          border-radius: 10px;
          border: none;
          font-size: 0.82rem;
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
        .action-danger {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
        }
        .action-danger:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(239, 68, 68, 0.35);
          filter: brightness(1.05);
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

        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
          .form-card,
          .historial-card {
            padding: 1.25rem;
            border-radius: 18px;
          }
          .page-header {
            flex-wrap: wrap;
          }
          .header-logo {
            margin-left: 0;
          }
          .historial-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .historial-controls {
            width: 100%;
          }
          .search-wrapper,
          .search-input,
          .filter-select {
            width: 100%;
            min-width: 0;
          }

          .historial-table,
          .historial-table thead,
          .historial-table tbody {
            display: block;
          }
          .historial-table thead {
            display: none;
          }
          .historial-table tbody tr {
            margin-bottom: 1rem;
            border: 1px solid var(--border-subtle);
            border-radius: 14px;
            padding: 0.75rem;
            background: var(--surface-default);
          }
          .historial-table td {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.4rem 0.5rem;
            border-bottom: 1px solid var(--border-subtle);
          }
          .historial-table td:last-child {
            border-bottom: none;
            justify-content: flex-start;
            flex-wrap: wrap;
            gap: 0.5rem;
          }
          .historial-table td::before {
            content: attr(data-label);
            font-weight: 700;
            font-size: 0.8rem;
            color: var(--text-secondary);
            flex-shrink: 0;
          }
          .form-actions {
            flex-direction: column;
          }
          .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}