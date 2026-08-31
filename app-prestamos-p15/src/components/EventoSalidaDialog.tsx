/**
 * Alta de una salida a evento.
 *
 * Es un formulario aparte, no una variante del préstamo rápido, porque captura
 * algo distinto: un evento tiene lugar, horario, responsable y —a veces— un
 * expositor externo, y saca varios objetos de una sola vez. Meter esos campos
 * en el formulario de siempre lo habría vuelto un cuestionario para el caso
 * común, que es prestar un cable en veinte segundos.
 *
 * Dos decisiones que ahorran código:
 * - El expositor no tiene columna booleana. La casilla "Habrá expositor" solo
 *   muestra u oculta los campos; lo que se guarda es el nombre, y no tenerlo ES
 *   el "no". Un booleano aparte sería una segunda verdad que puede contradecir
 *   al nombre.
 * - El selector de objetos es una lista con casillas, no el autocompletado del
 *   préstamo rápido. Para un evento se eligen cinco o diez cosas de un jalón y
 *   verlas todas juntas es más rápido que escribir cada una.
 */
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";
import { CalendarioRango } from "./CalendarioRango";
import { createEventoSalida, type Equipo, type PersonaRapida, type Profesor } from "../hooks/useInventory";
import { esPrestableEfectivo } from "../utils/equipoFicha";
import { hoyLocal, validarEvento, type ErrorCampo, type EventoInput, type TipoPersonaEvento } from "../utils/evento";
import type { AdminUser } from "../auth/types";

type Props = {
  abierto: boolean;
  admin: AdminUser | null;
  equipos: Equipo[];
  profesores: Profesor[];
  personas: PersonaRapida[];
  onCerrar: () => void;
  onGuardado: (mensaje: string) => void;
};

/**
 * Franjas de 15 minutos, "00:00" a "23:45".
 *
 * Las horas se eligen de un <select> y no de un `<input type="time">` por lo
 * mismo que las fechas usan `CalendarioRango`: el WebView de la app dibuja el
 * campo segmentado pero nunca confirma el valor, así que `onChange` no dispara
 * y el evento terminaba guardándose sin horario.
 */
const FRANJAS_HORARIAS = Array.from({ length: 96 }, (_, i) => {
  const hora = `${Math.floor(i / 4)}`.padStart(2, "0");
  const minuto = `${(i % 4) * 15}`.padStart(2, "0");
  return `${hora}:${minuto}`;
});

/** Un objeto solo puede salir si el inventario dice que hay unidad libre. */
const estaDisponible = (equipo: Equipo): boolean => {
  if (!esPrestableEfectivo(equipo)) return false;
  return equipo.es_granel === 1 ? equipo.stock_disponible > 0 : equipo.estado === "disponible";
};

export function EventoSalidaDialog({
  abierto,
  admin,
  equipos,
  profesores,
  personas,
  onCerrar,
  onGuardado,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [nombre, setNombre] = useState("");
  const [lugar, setLugar] = useState("");
  const [fechaInicio, setFechaInicio] = useState(hoyLocal);
  const [fechaFin, setFechaFin] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [responsableTipo, setResponsableTipo] = useState<TipoPersonaEvento>("profesor");
  const [responsableNombre, setResponsableNombre] = useState("");
  const [responsableCodigo, setResponsableCodigo] = useState("");
  const [hayExpositor, setHayExpositor] = useState(false);
  const [expositorNombre, setExpositorNombre] = useState("");
  const [expositorContacto, setExpositorContacto] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [busquedaEquipo, setBusquedaEquipo] = useState("");

  const [errores, setErrores] = useState<ErrorCampo[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (abierto && !dialog.open) dialog.showModal();
    if (!abierto && dialog.open) dialog.close();
  }, [abierto]);

  // Cada apertura arranca en blanco: un evento de ayer no debe sugerir los datos
  // del siguiente, y el error más caro aquí es guardar el lugar equivocado.
  useEffect(() => {
    if (!abierto) return;
    setNombre("");
    setLugar("");
    setFechaInicio(hoyLocal());
    setFechaFin("");
    setHoraInicio("");
    setHoraFin("");
    setResponsableTipo("profesor");
    setResponsableNombre("");
    setResponsableCodigo("");
    setHayExpositor(false);
    setExpositorNombre("");
    setExpositorContacto("");
    setObservaciones("");
    setSeleccionados([]);
    setBusquedaEquipo("");
    setErrores([]);
    setErrorMessage("");
  }, [abierto]);

  const disponibles = useMemo(() => equipos.filter(estaDisponible), [equipos]);

  const listado = useMemo(() => {
    const term = busquedaEquipo.trim().toLowerCase();
    if (!term) return disponibles;
    return disponibles.filter((equipo) =>
      [equipo.nombre_equipo, equipo.categoria_nombre, equipo.identificador ?? "", equipo.id_patrimonial ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [disponibles, busquedaEquipo]);

  const elegidos = useMemo(
    () => equipos.filter((equipo) => seleccionados.includes(equipo.id)),
    [equipos, seleccionados],
  );

  // El directorio de profesores y la gente que ya pidió antes, sin repetir.
  // Va en un <datalist>: el navegador ya sabe autocompletar, no hace falta un
  // combobox propio para un campo que se llena una vez por evento.
  const sugerencias = useMemo(() => {
    const porCodigo = new Map<string, { nombre: string; codigo: string }>();
    for (const profe of profesores) {
      porCodigo.set(profe.codigo, { nombre: profe.nombre, codigo: profe.codigo });
    }
    for (const persona of personas) {
      if (!porCodigo.has(persona.codigo)) {
        porCodigo.set(persona.codigo, { nombre: persona.nombre, codigo: persona.codigo });
      }
    }
    return [...porCodigo.values()];
  }, [profesores, personas]);

  const errorDe = (campo: string): string | undefined =>
    errores.find((error) => error.field === campo)?.message;

  const toggleEquipo = (id: number) => {
    setErrores((prev) => prev.filter((error) => error.field !== "equipos"));
    setSeleccionados((prev) => (prev.includes(id) ? prev.filter((actual) => actual !== id) : [...prev, id]));
  };

  const armarInput = (): EventoInput => ({
    nombre,
    lugar,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    hora_inicio: horaInicio,
    hora_fin: horaFin,
    responsable_nombre: responsableNombre,
    responsable_codigo: responsableCodigo,
    responsable_tipo: responsableTipo,
    // Apagar la casilla borra al expositor aunque quedara texto escrito.
    expositor_nombre: hayExpositor ? expositorNombre : null,
    expositor_contacto: hayExpositor ? expositorContacto : null,
    observaciones,
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage("");

    const input = armarInput();
    const encontrados = validarEvento(input, seleccionados.length);
    setErrores(encontrados);
    if (encontrados.length > 0) return;

    if (!admin) {
      setErrorMessage("Tu sesión expiró. Vuelve a iniciar sesión.");
      return;
    }

    setGuardando(true);
    try {
      await createEventoSalida({ evento: input, equipoIds: seleccionados, admin });
      onGuardado(
        `Salida a evento registrada: ${seleccionados.length} objeto${seleccionados.length === 1 ? "" : "s"}.`,
      );
      onCerrar();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "No se pudo registrar el evento.");
    } finally {
      setGuardando(false);
    }
  };

  const nombreLabel = responsableTipo === "profesor" ? "Nombre del profesor" : "Nombre del alumno";
  const codigoLabel = responsableTipo === "profesor" ? "Código del profesor" : "Código UDG del alumno";

  return (
    <dialog ref={dialogRef} className="admin-dialog is-form evento-dialog" onClose={onCerrar}>
      <form className="admin-form-shell" onSubmit={handleSubmit} noValidate>
        <div className="admin-form-head">
          <span className="evento-head-icon" aria-hidden="true">
            <Icon name="mapPin" size="1.2rem" />
          </span>
          <div>
            <h3>Crear salida a evento</h3>
            <p className="evento-head-sub">Todo lo que sale del almacén para un evento, en un solo registro.</p>
          </div>
          <button type="button" className="admin-dialog-close" onClick={onCerrar} aria-label="Cerrar">
            <Icon name="x" size="1.1rem" />
          </button>
        </div>

        <div className="admin-form-body">
          {errorMessage && (
            <div className="evento-alert" role="alert">
              <Icon name="alert" />
              <span>{errorMessage}</span>
            </div>
          )}

          <fieldset className="evento-fieldset">
            <legend>El evento</legend>
            <div className="evento-grid">
              <label className="evento-campo">
                Nombre del evento <span className="evento-opcional">(opcional)</span>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Feria de ciencias"
                />
              </label>
              <label className="evento-campo">
                Lugar del evento <span className="evento-req">*</span>
                <input
                  type="text"
                  value={lugar}
                  onChange={(e) => {
                    setLugar(e.target.value);
                    setErrores((prev) => prev.filter((error) => error.field !== "lugar"));
                  }}
                  placeholder="Ej. Auditorio central"
                  aria-invalid={errorDe("lugar") ? "true" : "false"}
                />
                {errorDe("lugar") && <small className="evento-error">{errorDe("lugar")}</small>}
              </label>
            </div>

            <div className="evento-fechas">
              <div className="evento-campo">
                <span>
                  ¿Qué día es? <span className="evento-req">*</span>
                </span>
                <CalendarioRango
                  inicio={fechaInicio}
                  fin={fechaFin}
                  onCambio={({ inicio, fin }) => {
                    setFechaInicio(inicio);
                    setFechaFin(fin);
                    setErrores((prev) =>
                      prev.filter((error) => error.field !== "fechaInicio" && error.field !== "fechaFin"),
                    );
                  }}
                  error={errorDe("fechaInicio") ?? errorDe("fechaFin")}
                />
              </div>

              <div className="evento-horas">
                <label className="evento-campo">
                  Hora de inicio
                  <select value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)}>
                    <option value="">Sin hora</option>
                    {FRANJAS_HORARIAS.map((franja) => (
                      <option key={franja} value={franja}>
                        {franja}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="evento-campo">
                  Hora de fin
                  <select
                    value={horaFin}
                    aria-invalid={errorDe("horaFin") ? "true" : "false"}
                    onChange={(e) => {
                      setHoraFin(e.target.value);
                      setErrores((prev) => prev.filter((error) => error.field !== "horaFin"));
                    }}
                  >
                    <option value="">Sin hora</option>
                    {FRANJAS_HORARIAS.map((franja) => (
                      <option key={franja} value={franja}>
                        {franja}
                      </option>
                    ))}
                  </select>
                  {errorDe("horaFin") && <small className="evento-error">{errorDe("horaFin")}</small>}
                </label>
              </div>
            </div>
          </fieldset>

          <fieldset className="evento-fieldset">
            <legend>Responsable</legend>
            <div className="evento-segment" role="group" aria-label="Tipo de responsable">
              {(["profesor", "alumno"] as const).map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  className={`evento-segment-btn ${responsableTipo === tipo ? "is-active" : ""}`}
                  aria-pressed={responsableTipo === tipo}
                  onClick={() => setResponsableTipo(tipo)}
                >
                  {tipo === "profesor" ? "Profesor" : "Alumno"}
                </button>
              ))}
            </div>
            <div className="evento-grid">
              <label className="evento-campo">
                {nombreLabel} <span className="evento-req">*</span>
                <input
                  type="text"
                  list="evento-personas"
                  value={responsableNombre}
                  onChange={(e) => {
                    const valor = e.target.value;
                    setResponsableNombre(valor);
                    setErrores((prev) => prev.filter((error) => error.field !== "responsableNombre"));
                    // Elegir del listado también llena el código: es el dato que
                    // más se teclea mal y el que amarra el préstamo a la persona.
                    const match = sugerencias.find((persona) => persona.nombre === valor);
                    if (match) setResponsableCodigo(match.codigo);
                  }}
                  autoComplete="off"
                />
                {errorDe("responsableNombre") && (
                  <small className="evento-error">{errorDe("responsableNombre")}</small>
                )}
              </label>
              <label className="evento-campo">
                {codigoLabel} <span className="evento-req">*</span>
                <input
                  type="text"
                  value={responsableCodigo}
                  onChange={(e) => {
                    setResponsableCodigo(e.target.value);
                    setErrores((prev) => prev.filter((error) => error.field !== "responsableCodigo"));
                  }}
                  autoComplete="off"
                />
                {errorDe("responsableCodigo") && (
                  <small className="evento-error">{errorDe("responsableCodigo")}</small>
                )}
              </label>
            </div>
            <datalist id="evento-personas">
              {sugerencias.map((persona) => (
                <option key={persona.codigo} value={persona.nombre}>
                  {persona.codigo}
                </option>
              ))}
            </datalist>
          </fieldset>

          <fieldset className="evento-fieldset">
            <legend>Expositor</legend>
            <label className="evento-check">
              <input
                type="checkbox"
                checked={hayExpositor}
                onChange={(e) => {
                  setHayExpositor(e.target.checked);
                  setErrores((prev) => prev.filter((error) => error.field !== "expositorNombre"));
                }}
              />
              <span>Habrá expositor</span>
            </label>
            {hayExpositor && (
              <div className="evento-grid">
                <label className="evento-campo">
                  ¿Quién es?
                  <input
                    type="text"
                    value={expositorNombre}
                    onChange={(e) => {
                      setExpositorNombre(e.target.value);
                      setErrores((prev) => prev.filter((error) => error.field !== "expositorNombre"));
                    }}
                    placeholder="Nombre del expositor"
                  />
                  {errorDe("expositorNombre") && (
                    <small className="evento-error">{errorDe("expositorNombre")}</small>
                  )}
                </label>
                <label className="evento-campo">
                  Contacto
                  <input
                    type="text"
                    value={expositorContacto}
                    onChange={(e) => setExpositorContacto(e.target.value)}
                    placeholder="Teléfono o correo"
                  />
                </label>
              </div>
            )}
          </fieldset>

          <fieldset className="evento-fieldset">
            <legend>
              Objetos que salen <span className="evento-req">*</span>
              <span className="evento-conteo">{seleccionados.length} seleccionado{seleccionados.length === 1 ? "" : "s"}</span>
            </legend>

            {elegidos.length > 0 && (
              <ul className="evento-chips">
                {elegidos.map((equipo) => (
                  <li key={equipo.id}>
                    <button type="button" onClick={() => toggleEquipo(equipo.id)}>
                      <span>{equipo.nombre_equipo}</span>
                      <Icon name="x" />
                      <span className="visually-hidden">Quitar {equipo.nombre_equipo}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <input
              type="search"
              className="evento-buscar"
              value={busquedaEquipo}
              onChange={(e) => setBusquedaEquipo(e.target.value)}
              placeholder="Buscar objeto por nombre, categoría o etiqueta..."
              aria-label="Buscar objetos disponibles"
            />

            <div className="evento-lista" role="group" aria-label="Objetos disponibles">
              {listado.length === 0 ? (
                <p className="evento-vacio">
                  {disponibles.length === 0
                    ? "No hay objetos disponibles en el inventario."
                    : "Nada coincide con esa búsqueda."}
                </p>
              ) : (
                listado.map((equipo) => (
                  <label key={equipo.id} className="evento-item">
                    <input
                      type="checkbox"
                      checked={seleccionados.includes(equipo.id)}
                      onChange={() => toggleEquipo(equipo.id)}
                    />
                    <span className="evento-item-nombre">{equipo.nombre_equipo}</span>
                    <span className="evento-item-meta">
                      {equipo.categoria_nombre}
                      {equipo.identificador ? ` · ${equipo.identificador}` : ""}
                      {equipo.es_granel === 1 ? ` · ${equipo.stock_disponible} disponibles` : ""}
                    </span>
                  </label>
                ))
              )}
            </div>
            {errorDe("equipos") && <small className="evento-error">{errorDe("equipos")}</small>}
          </fieldset>

          <label className="evento-campo">
            Observaciones
            <textarea
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas de la salida (opcional)"
            />
          </label>
        </div>

        <div className="admin-dialog-actions">
          <button type="submit" className="evento-btn-primario" disabled={guardando}>
            {guardando ? "Guardando..." : "Registrar salida a evento"}
          </button>
          <button type="button" className="evento-btn-secundario" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
        </div>
      </form>
    </dialog>
  );
}
