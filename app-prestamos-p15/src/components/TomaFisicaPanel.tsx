/**
 * Toma física de inventario con la pistola de código de barras.
 *
 * El bucle es el producto: eliges la ubicación UNA vez y disparás contra cada
 * etiqueta. Cada escaneo resuelve el objeto, lo marca visto y le estampa dónde
 * estaba — sin teclear y sin cambiar de pantalla entre disparo y disparo.
 *
 * Por eso el foco vuelve SIEMPRE al campo de escaneo: si se pierde, el siguiente
 * disparo de la pistola se escribe en la nada y la persona no se entera hasta
 * varios equipos después.
 *
 * Vive como pestaña de Admin y no como pantalla aparte: quien hace el recorrido
 * ya entró como administrador, y una ruta propia significaría un segundo login y
 * una segunda navegación para el mismo trabajo. Mientras el recorrido está
 * abierto avisa con `onRecorrido` para que Admin esconda su barra lateral: seis
 * pestañas a un clic de robarle el foco al campo de escaneo son una trampa, y
 * quien recorre no está administrando nada.
 *
 * Ver `docs/PLAN_IMPORTACION_PATRIMONIO.md` §3.
 */
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";
import {
  buscarPorIdPatrimonial,
  exportarReporteInventario,
  getEquipos,
  getInicioCampana,
  getUbicacionesRecientes,
  iniciarCampanaInventario,
  limpiarNoLocalizado,
  marcarNoLocalizado,
  registrarRevision,
  revertirRevision,
  vincularIdPatrimonial,
  type Equipo,
  type Profesor,
} from "../hooks/useInventory";
import {
  calcularProgreso,
  clasificarDisparo,
  pendientesDeArea,
  type EquipoRevisable,
} from "../utils/tomaFisica";
import { normalizarCodigoPatrimonial } from "../utils/codigoPatrimonial";
import { confirmDialog } from "../utils/confirm";

/** Lo que hay que guardar para poder deshacer un disparo. */
type Previo = {
  revisado_en: string | null;
  revisado_por: string | null;
  ubicacion: string | null;
};

type Leido = {
  equipo: Equipo;
  cuando: string;
  previo: Previo;
};

/**
 * La respuesta al último disparo, que es lo único que la persona mira: está de
 * pie, a un metro de la pantalla, con la pistola en la mano.
 */
type Ultimo =
  | { tipo: "nuevo" | "movido"; equipo: Equipo; desde: string | null; previo: Previo; disparo: number }
  | { tipo: "repetido"; equipo: Equipo; disparo: number }
  | null;

/** Cuánto vive cada tarjeta. La de movimiento dura más porque hay que leerla. */
const DURACION: Record<NonNullable<Ultimo>["tipo"], number> = {
  nuevo: 2500,
  repetido: 1800,
  movido: 3500,
};

const comoRevisable = (equipo: Equipo): EquipoRevisable => ({
  id: equipo.id,
  nombre_equipo: equipo.nombre_equipo,
  id_patrimonial: equipo.id_patrimonial,
  ubicacion: equipo.ubicacion,
  revisado_en: equipo.revisado_en,
  revisado_por: equipo.revisado_por,
  no_localizado_en: equipo.no_localizado_en,
  no_localizado_por: equipo.no_localizado_por,
  marca: equipo.marca,
  modelo: equipo.modelo,
  num_serie: equipo.num_serie,
  resguardante_nombre: equipo.resguardante_nombre,
});

const comoPrevio = (equipo: Equipo): Previo => ({
  revisado_en: equipo.revisado_en,
  revisado_por: equipo.revisado_por,
  ubicacion: equipo.ubicacion,
});

const detalleDe = (equipo: Equipo): string =>
  [equipo.marca, equipo.modelo, equipo.id_patrimonial].filter(Boolean).join(" · ");

/**
 * Dos tonos cortos: uno para "lo reconocí" y otro para "algo pasa".
 *
 * La pistola ya pita al leer, pero ese pitido solo dice que capturó caracteres:
 * suena igual con un código que no existe. Quien recorre está mirando el
 * proyector del techo, no el monitor, así que el oído es el canal que de verdad
 * llega. Se sintetiza con WebAudio para no cargar ningún archivo.
 */
const tono = (ok: boolean) => {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const vol = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = ok ? 880 : 320;
    vol.gain.setValueAtTime(0.09, ctx.currentTime);
    vol.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);
    osc.connect(vol).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.17);
    osc.onended = () => void ctx.close();
  } catch {
    // Sin audio se sigue trabajando: el flash y la tarjeta ya dicen lo mismo.
  }
};

export function TomaFisicaPanel({
  adminUser,
  onRecorrido,
}: {
  adminUser: Profesor;
  onRecorrido?: (abierto: boolean) => void;
}) {
  const escaneoRef = useRef<HTMLInputElement>(null);

  const [cargando, setCargando] = useState(true);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [inicioCampana, setInicioCampana] = useState<string | null>(null);
  const [recientes, setRecientes] = useState<string[]>([]);

  const [ubicacion, setUbicacion] = useState("");
  const [ubicacionFijada, setUbicacionFijada] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [leidos, setLeidos] = useState<Leido[]>([]);
  const [ultimo, setUltimo] = useState<Ultimo>(null);
  // Cuenta los disparos solo para que la tarjeta se vuelva a animar cuando se
  // repite el MISMO equipo dos veces seguidas: sin esto React reusa el nodo y
  // el sacudon no vuelve a correr, que es justo cuando mas hace falta.
  const [disparos, setDisparos] = useState(0);
  const [flash, setFlash] = useState<"ok" | "alerta" | null>(null);
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");
  const [desconocido, setDesconocido] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [foco, setFoco] = useState(true);
  // El area se cierra a mano, no se abandona: es el unico momento en que la
  // persona todavia se acuerda de que busco debajo del escritorio.
  const [cerrando, setCerrando] = useState(false);
  const [abiertoEn, setAbiertoEn] = useState<number | null>(null);
  const [noLocalizados, setNoLocalizados] = useState<number[]>([]);
  // Modo prueba: el bucle completo (pistola, tonos, tarjetas, repetidos) sin
  // tocar la base. Es la unica forma de ensayar el recorrido con equipos reales
  // sin dejar la campana llena de revisiones falsas que despues hay que limpiar.
  const [prueba, setPrueba] = useState(false);

  const quienRevisa = adminUser.nombre;

  const recargar = useCallback(async () => {
    const [filas, inicio, areas] = await Promise.all([
      getEquipos(),
      getInicioCampana(),
      getUbicacionesRecientes(),
    ]);
    setEquipos(filas);
    setInicioCampana(inicio);
    setRecientes(areas);
  }, []);

  useEffect(() => {
    let vivo = true;

    void (async () => {
      try {
        await recargar();
        if (!vivo) return;
      } catch (err) {
        if (vivo) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (vivo) setCargando(false);
      }
    })();

    return () => {
      vivo = false;
    };
  }, [recargar]);

  // El foco es la funcion critica de esta pantalla: sin el, la pistola dispara
  // al vacio. Vuelve tras cada escaneo y tras fijar la ubicacion.
  const enfocarEscaneo = useCallback(() => {
    requestAnimationFrame(() => escaneoRef.current?.focus());
  }, []);

  useEffect(() => {
    if (ubicacionFijada && !desconocido) enfocarEscaneo();
  }, [ubicacionFijada, desconocido, enfocarEscaneo]);

  // Admin esconde su barra lateral mientras dura el recorrido.
  useEffect(() => {
    onRecorrido?.(ubicacionFijada);
    return () => onRecorrido?.(false);
  }, [ubicacionFijada, onRecorrido]);

  // La tarjeta del disparo se va sola: nadie va a soltar la pistola para
  // cerrarla, y el tiempo que dura es la ventana para deshacer.
  useEffect(() => {
    if (!ultimo) return;
    const id = window.setTimeout(() => setUltimo(null), DURACION[ultimo.tipo]);
    return () => window.clearTimeout(id);
  }, [ultimo]);

  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(null), 500);
    return () => window.clearTimeout(id);
  }, [flash]);

  const progreso = calcularProgreso(equipos.map(comoRevisable), inicioCampana);

  const pendientes = useMemo(
    () =>
      pendientesDeArea(equipos.map(comoRevisable), ubicacion, inicioCampana).filter(
        (equipo) => !leidos.some((leido) => leido.equipo.id === equipo.id)
      ),
    [equipos, ubicacion, inicioCampana, leidos]
  );

  /** Candidatos para un código huérfano: primero los de esta área. */
  const candidatos = useMemo(() => {
    const texto = busqueda.trim().toLocaleLowerCase();
    const area = ubicacion.trim().toLocaleLowerCase();

    return equipos
      .filter((equipo) => !equipo.id_patrimonial && equipo.es_granel === 0)
      .filter((equipo) =>
        !texto
          ? true
          : [equipo.nombre_equipo, equipo.marca, equipo.modelo, equipo.identificador, equipo.num_serie]
              .filter(Boolean)
              .join(" ")
              .toLocaleLowerCase()
              .includes(texto)
      )
      .sort((a, b) => {
        const enArea = (equipo: Equipo) =>
          (equipo.ubicacion ?? "").trim().toLocaleLowerCase() === area ? 0 : 1;
        return enArea(a) - enArea(b) || a.nombre_equipo.localeCompare(b.nombre_equipo);
      })
      .slice(0, 12);
  }, [equipos, busqueda, ubicacion]);

  const abrirRecorrido = (donde: string) => {
    const limpia = donde.trim();
    if (!limpia) return;
    setUbicacion(limpia);
    setUbicacionFijada(true);
    setAbiertoEn(Date.now());
    setNoLocalizados([]);
    setCerrando(false);
    setAviso("");
    setError("");
  };

  const cerrarRecorrido = () => {
    setUbicacionFijada(false);
    setCerrando(false);
    setLeidos([]);
    setUltimo(null);
    setNoLocalizados([]);
    setAbiertoEn(null);
    setAviso("");
  };

  /** "Lo busque y no aparecio", firmado. Distinto de "todavia no llegue ahi". */
  const noAparece = async (equipoId: number) => {
    if (ocupado || prueba) return;
    setOcupado(true);
    try {
      await marcarNoLocalizado(equipoId, quienRevisa);
      setNoLocalizados((actuales) => [...actuales, equipoId]);
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setOcupado(false);
    }
  };

  const volverAPendiente = async (equipoId: number) => {
    if (ocupado || prueba) return;
    setOcupado(true);
    try {
      await limpiarNoLocalizado(equipoId);
      setNoLocalizados((actuales) => actuales.filter((id) => id !== equipoId));
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setOcupado(false);
    }
  };

  const escanear = async (e: FormEvent) => {
    e.preventDefault();
    const leido = codigo.trim();
    if (!leido || ocupado) return;

    setOcupado(true);
    setError("");
    setAviso("");
    setCodigo("");
    const disparo = disparos + 1;
    setDisparos(disparo);

    try {
      const equipo = await buscarPorIdPatrimonial(leido);

      if (!equipo) {
        // No es un error: es la puerta de entrada para ligar lo que Patrimonio
        // nunca etiqueto o lo que el Excel no cubrio.
        tono(false);
        setFlash("alerta");
        setBusqueda("");
        if (prueba) {
          // Ligar una etiqueta es para siempre: en prueba solo se avisa.
          setAviso(`${normalizarCodigoPatrimonial(leido)} no existe en el inventario.`);
          enfocarEscaneo();
          return;
        }
        setDesconocido(normalizarCodigoPatrimonial(leido));
        return;
      }

      const que = clasificarDisparo(
        comoRevisable(equipo),
        ubicacion,
        leidos.map((leido) => leido.equipo.id)
      );

      if (que === "repetido") {
        tono(false);
        setFlash("alerta");
        setUltimo({ tipo: "repetido", equipo, disparo });
        enfocarEscaneo();
        return;
      }

      // El estado previo se guarda ANTES de escribir: es lo unico que hace
      // posible el deshacer sin una tabla de historial.
      const previo = comoPrevio(equipo);
      if (!prueba) await registrarRevision(equipo.id, ubicacion, quienRevisa);

      tono(true);
      setFlash("ok");
      setUltimo({ tipo: que, equipo, desde: previo.ubicacion, previo, disparo });
      setLeidos((actuales) => [
        { equipo, cuando: new Date().toLocaleTimeString(), previo },
        ...actuales,
      ]);
      if (!prueba) await recargar();
      enfocarEscaneo();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      enfocarEscaneo();
    } finally {
      setOcupado(false);
    }
  };

  /** Vuelve atrás el último disparo. La pistola dispara contra lo que se le ponga enfrente. */
  const deshacer = async (equipoId: number, previo: Previo) => {
    setOcupado(true);
    try {
      if (!prueba) await revertirRevision(equipoId, previo);
      setLeidos((actuales) => actuales.filter((leido) => leido.equipo.id !== equipoId));
      setUltimo(null);
      if (!prueba) await recargar();
      enfocarEscaneo();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setOcupado(false);
    }
  };

  /** Marca a mano lo que no se puede escanear porque nunca tuvo etiqueta. */
  const marcarAMano = async (equipoId: number) => {
    const equipo = equipos.find((item) => item.id === equipoId);
    if (!equipo || ocupado || prueba) return;

    setOcupado(true);
    try {
      const previo = comoPrevio(equipo);
      await registrarRevision(equipoId, ubicacion, quienRevisa);
      setLeidos((actuales) => [
        { equipo, cuando: new Date().toLocaleTimeString(), previo },
        ...actuales,
      ]);
      tono(true);
      setFlash("ok");
      await recargar();
      enfocarEscaneo();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setOcupado(false);
    }
  };

  const ligar = async (equipoId: number) => {
    if (!desconocido || prueba) return;
    setOcupado(true);
    setError("");

    try {
      const equipo = equipos.find((item) => item.id === equipoId);
      await vincularIdPatrimonial(equipoId, desconocido);
      await registrarRevision(equipoId, ubicacion, quienRevisa);
      if (equipo) {
        const ligado = { ...equipo, id_patrimonial: desconocido };
        setLeidos((actuales) => [
          { equipo: ligado, cuando: new Date().toLocaleTimeString(), previo: comoPrevio(equipo) },
          ...actuales,
        ]);
        tono(true);
        setFlash("ok");
      }
      setDesconocido(null);
      setBusqueda("");
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setOcupado(false);
    }
  };

  const nuevaCampana = async () => {
    const sigue = await confirmDialog(
      "Iniciar una campaña nueva marca todo el inventario como pendiente otra vez. " +
        "No se borra nada, pero el conteo vuelve a cero. ¿Continuar?"
    );
    if (!sigue) return;

    setInicioCampana(await iniciarCampanaInventario());
    setLeidos([]);
    await recargar();
  };

  const exportar = async () => {
    setOcupado(true);
    setError("");
    try {
      const ruta = await exportarReporteInventario(equipos.map(comoRevisable), inicioCampana);
      setAviso(`Reporte guardado en ${ruta}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setOcupado(false);
    }
  };

  if (cargando) {
    return <section>Cargando inventario…</section>;
  }

  // Paso 1: la ubicación se elige UNA vez por recorrido, no por objeto.
  if (!ubicacionFijada) {
    return (
      <section className="toma-inicio">
        <div className="toma-inicio-titulo">
          <h1>Toma de inventario</h1>
          <p>
            {inicioCampana
              ? `Campaña abierta el ${inicioCampana.slice(0, 10)} · recorre ${quienRevisa}`
              : "Todavía no arrancaste ninguna campaña."}
          </p>
        </div>

        <div className="toma-metricas">
          <article>
            <span>Revisados en esta campaña</span>
            <strong style={{ color: "var(--success-base)" }}>{progreso.revisados}</strong>
          </article>
          <article>
            <span>Faltan por ver</span>
            <strong>{progreso.pendientes}</strong>
          </article>
          <article>
            <span>Sin etiqueta de Patrimonio</span>
            <strong style={{ color: "var(--warning-base)" }}>{progreso.sinEtiqueta}</strong>
          </article>
          {progreso.noLocalizados > 0 && (
            <article>
              <span>Buscados y no localizados</span>
              <strong style={{ color: "var(--danger-base)" }}>{progreso.noLocalizados}</strong>
            </article>
          )}
        </div>

        <div className="toma-barra-progreso-fila">
          <div className="toma-barra-progreso">
            <div style={{ width: `${progreso.porcentaje}%` }} />
          </div>
          <span>{progreso.porcentaje}%</span>
        </div>

        <div className="toma-inicio-cuerpo">
          <div className="toma-picker">
            <div>
              <h2>¿En qué área estás ahora?</h2>
              <p>Se le pone esta ubicación a todo lo que escanees, hasta que la cambies.</p>
            </div>

            {recientes.length > 0 && (
              <div className="toma-chips-bloque">
                <span className="toma-etiqueta">Donde estuviste</span>
                <div className="toma-chips">
                  {recientes.map((area) => (
                    <button
                      key={area}
                      type="button"
                      className={`toma-chip${area === ubicacion ? " is-activo" : ""}`}
                      onClick={() => setUbicacion(area)}
                    >
                      {area === ubicacion && <Icon name="check" />}
                      {area}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                abrirRecorrido(ubicacion);
              }}
              className="stack"
              style={{ gap: "0.9rem" }}
            >
              <div>
                <label htmlFor="ubicacion">
                  {recientes.length > 0 ? "O escribe una nueva" : "Ubicación"}
                </label>
                <input
                  id="ubicacion"
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  placeholder="Ej. Aula 12, Laboratorio de cómputo, Auditorio"
                  autoFocus
                />
              </div>
              <button type="submit" disabled={!ubicacion.trim()} className="toma-cta">
                <Icon name="barcode" size="1.4rem" />
                {prueba
                  ? "Probar la pistola sin guardar nada"
                  : ubicacion.trim()
                    ? `Empezar a escanear en ${ubicacion.trim()}`
                    : "Empezar a escanear"}
              </button>
              <button
                type="button"
                className={`toma-chip${prueba ? " is-activo" : ""}`}
                aria-pressed={prueba}
                onClick={() => setPrueba((activo) => !activo)}
                style={{ alignSelf: "start" }}
              >
                {prueba && <Icon name="check" />}
                Modo prueba · no guarda nada
              </button>
              {prueba && (
                <small>
                  Escanea, suena y muestra las tarjetas igual, pero no marca nada como revisado
                  ni liga etiquetas. Para ensayar el recorrido.
                </small>
              )}
            </form>
          </div>

          <aside className="toma-lateral">
            <h2>La campaña</h2>
            <p>
              Una campaña es un recorrido completo del edificio. Lo que se revisó antes de que
              arrancara no cuenta.
            </p>
            <div className="toma-lateral-acciones">
              <button type="button" className="ghost" onClick={() => void exportar()} disabled={ocupado}>
                <Icon name="save" /> Exportar reporte para Patrimonio
              </button>
              <button type="button" className="toma-link-danger" onClick={() => void nuevaCampana()} disabled={ocupado}>
                Iniciar campaña nueva
              </button>
            </div>
          </aside>
        </div>

        {aviso && <div className="feedback success">{aviso}</div>}
        {error && <div className="feedback error">{error}</div>}
      </section>
    );
  }

  // Paso 3: cerrar el área. Lo que no apareció se decide acá, de pie en el aula,
  // y no cuando el reporte ya está en el escritorio de Patrimonio.
  if (cerrando) {
    const minutos = abiertoEn ? Math.max(1, Math.round((Date.now() - abiertoEn) / 60000)) : null;
    const marcadosAhora = equipos.filter((equipo) => noLocalizados.includes(equipo.id));

    return (
      <section className="toma-recorrido">
        <div className="toma-cierre">
          <header className="toma-cierre-cabeza">
            <div className="toma-tarjeta-icono">
              <Icon name="check" size="2rem" strokeWidth={2.5} />
            </div>
            <div>
              <strong>
                {ubicacion} · {leidos.length} {leidos.length === 1 ? "equipo leído" : "equipos leídos"}
              </strong>
              <span>
                {minutos ? `${minutos} min de recorrido` : "Recorrido terminado"}
                {marcadosAhora.length > 0 && ` · ${marcadosAhora.length} sin localizar`}
              </span>
            </div>
          </header>

          <div className="toma-cierre-cuerpo">
            {pendientes.length > 0 ? (
              <>
                <div className="toma-columna-titulo">
                  <h2>
                    {pendientes.length === 1
                      ? "Este no apareció"
                      : `Estos ${pendientes.length} no aparecieron`}
                  </h2>
                  <small>— decidí antes de irte, después ya no te acordás</small>
                </div>
                <ul className="toma-lista">
                  {pendientes.map((equipo) => (
                    <li key={equipo.id}>
                      <div>
                        <strong>{equipo.nombre_equipo}</strong>
                        <span>
                          {[equipo.marca, equipo.id_patrimonial ?? "sin etiqueta de Patrimonio"]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => void marcarAMano(equipo.id)}
                        disabled={ocupado || prueba}
                      >
                        Sí está
                      </button>
                      <button
                        type="button"
                        className="toma-btn-perdido"
                        onClick={() => void noAparece(equipo.id)}
                        disabled={ocupado || prueba}
                      >
                        No localizada
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="toma-vacio es-listo">
                <Icon name="checkCircle" /> No quedó nada pendiente en {ubicacion}.
              </p>
            )}

            {marcadosAhora.length > 0 && (
              <>
                <div className="toma-columna-titulo">
                  <h2>Marcados como no localizados</h2>
                  <small>— van al reporte firmados por {quienRevisa}</small>
                </div>
                <ul className="toma-lista">
                  {marcadosAhora.map((equipo) => (
                    <li key={equipo.id} className="es-perdido">
                      <Icon name="alert" />
                      <div>
                        <strong>{equipo.nombre_equipo}</strong>
                        <span>{equipo.id_patrimonial ?? "sin etiqueta de Patrimonio"}</span>
                      </div>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => void volverAPendiente(equipo.id)}
                        disabled={ocupado}
                      >
                        Deshacer
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        {error && <div className="feedback error">{error}</div>}
        {aviso && <div className="feedback success">{aviso}</div>}

        <div className="toma-cierre-acciones">
          <button type="button" className="toma-cta" onClick={cerrarRecorrido}>
            <Icon name="mapPin" size="1.3rem" /> Seguir en otra área
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => void exportar()}
            disabled={ocupado}
          >
            <Icon name="save" /> Exportar reporte
          </button>
          <button type="button" className="toma-link-danger" onClick={() => setCerrando(false)}>
            Volver a escanear aquí
          </button>
        </div>
      </section>
    );
  }

  // Paso 2: el bucle. Disparar, ver qué era, disparar otra vez.
  return (
    <section className="toma-recorrido">
      {flash && <div className={`toma-flash is-${flash}`} aria-hidden="true" />}

      <header className="toma-barra">
        <div className="toma-barra-area">
          <Icon name="mapPin" size="1.5rem" style={{ color: "var(--brand-primary)" }} />
          <strong>{ubicacion}</strong>
          {prueba && (
            <span className="toma-chip is-activo" style={{ color: "var(--warning-base)" }}>
              Prueba · no se guarda
            </span>
          )}
        </div>
        <div className="toma-barra-cuenta">
          <span>
            <strong>{leidos.length}</strong> leídos aquí · {progreso.revisados}/{progreso.total} en total
          </span>
          <div className="toma-barra-progreso">
            <div style={{ width: `${progreso.porcentaje}%` }} />
          </div>
        </div>
        <button type="button" className="ghost toma-salir" onClick={cerrarRecorrido}>
          <Icon name="x" /> Salir del recorrido
        </button>
      </header>

      <form onSubmit={escanear} className={`toma-escaneo${foco ? "" : " sin-foco"}`}>
        <div className="toma-escaneo-texto">
          <label htmlFor="escaneo">
            <Icon name="barcode" size="1.6rem" /> Dispara la pistola contra la etiqueta
          </label>
          <small>¿Etiqueta rota? Escribe el número y Enter.</small>
        </div>
        <input
          id="escaneo"
          ref={escaneoRef}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          onFocus={() => setFoco(true)}
          onBlur={() => setFoco(false)}
          placeholder="El código aparece aquí solo…"
          inputMode="numeric"
          autoComplete="off"
          disabled={desconocido !== null}
        />
      </form>

      {!foco && !desconocido && (
        <div className="toma-sin-foco-aviso">
          <Icon name="alert" /> El campo perdió el foco: la pistola está disparando al vacío.
          <button type="button" onClick={enfocarEscaneo}>Recuperarlo</button>
        </div>
      )}

      {ultimo && (
        <div className={`toma-tarjeta is-${ultimo.tipo}`} key={ultimo.disparo}>
          <div className="toma-tarjeta-icono">
            <Icon
              name={ultimo.tipo === "nuevo" ? "check" : ultimo.tipo === "repetido" ? "refresh" : "arrowRight"}
              size="2.2rem"
              strokeWidth={2.5}
            />
          </div>

          {ultimo.tipo === "repetido" ? (
            <div className="toma-tarjeta-cuerpo">
              <strong>Repetido</strong>
              <span>{ultimo.equipo.nombre_equipo} ya se leyó aquí.</span>
              <small>No pasa nada: seguí con el siguiente.</small>
            </div>
          ) : (
            <>
              <div className="toma-tarjeta-cuerpo">
                <strong>
                  {ultimo.tipo === "movido" ? `Se movió: ${ultimo.equipo.nombre_equipo}` : ultimo.equipo.nombre_equipo}
                </strong>
                {ultimo.tipo === "movido" ? (
                  <span className="toma-movimiento">
                    <em>{ultimo.desde}</em>
                    <Icon name="arrowRight" />
                    <em className="es-destino">{ubicacion}</em>
                  </span>
                ) : (
                  <span>{detalleDe(ultimo.equipo) || "Sin marca ni modelo registrados"}</span>
                )}
                <small>
                  {ultimo.equipo.resguardante_nombre
                    ? `Anotado en ${ubicacion} · resguarda ${ultimo.equipo.resguardante_nombre}`
                    : `Anotado en ${ubicacion}`}
                </small>
              </div>
              <button
                type="button"
                className="toma-deshacer"
                onClick={() => void deshacer(ultimo.equipo.id, ultimo.previo)}
                disabled={ocupado}
              >
                Deshacer
              </button>
            </>
          )}

          <div className="toma-tarjeta-tiempo" style={{ animationDuration: `${DURACION[ultimo.tipo]}ms` }} />
        </div>
      )}

      {aviso && <div className="feedback">{aviso}</div>}
      {error && <div className="feedback error">{error}</div>}

      {desconocido && (
        <div className="toma-huerfano">
          <div className="toma-huerfano-cabeza">
            <Icon name="alert" size="2rem" />
            <div>
              <strong>Nadie reclama este código</strong>
              <span>¿A qué equipo pertenece? Queda ligado para siempre.</span>
            </div>
            <code>{desconocido}</code>
          </div>

          <div className="toma-huerfano-cuerpo">
            <div className="toma-buscador">
              <Icon name="search" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Busca por nombre, marca o serie…"
                autoFocus
              />
            </div>

            {candidatos.length === 0 ? (
              <p className="toma-vacio">
                Ningún equipo sin etiqueta coincide. Dalo de alta desde la pestaña Inventario.
              </p>
            ) : (
              <ul className="toma-candidatos">
                {candidatos.map((equipo) => {
                  const enArea =
                    (equipo.ubicacion ?? "").trim().toLocaleLowerCase() ===
                    ubicacion.trim().toLocaleLowerCase();
                  return (
                    <li key={equipo.id}>
                      <div>
                        <strong>
                          {equipo.nombre_equipo}
                          {equipo.ubicacion ? ` · ${equipo.ubicacion}` : ""}
                        </strong>
                        <span>
                          {[equipo.marca, equipo.modelo, equipo.num_serie, equipo.resguardante_nombre]
                            .filter(Boolean)
                            .join(" · ") || "Sin datos de Patrimonio"}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={enArea ? "" : "ghost"}
                        onClick={() => void ligar(equipo.id)}
                        disabled={ocupado}
                      >
                        Es este
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <button
              type="button"
              className="toma-link-danger"
              onClick={() => {
                setDesconocido(null);
                setBusqueda("");
              }}
            >
              Saltarlo y seguir escaneando
            </button>
          </div>
        </div>
      )}

      <div className="toma-columnas">
        <div>
          <div className="toma-columna-titulo">
            <h2>Leídos aquí</h2>
            <span style={{ color: "var(--success-base)" }}>{leidos.length}</span>
          </div>
          <ul className="toma-lista">
            {leidos.length === 0 && <li className="toma-vacio">Todavía no disparaste nada en esta área.</li>}
            {leidos.map((leido) => (
              <li key={leido.equipo.id} className="es-leido">
                <Icon name="check" />
                <div>
                  <strong>{leido.equipo.nombre_equipo}</strong>
                  <span>{detalleDe(leido.equipo)}</span>
                </div>
                <small>{leido.cuando}</small>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="toma-columna-titulo">
            <h2>Deberían estar aquí</h2>
            <span style={{ color: "var(--warning-base)" }}>{pendientes.length}</span>
            <small>— según la campaña pasada</small>
          </div>
          <ul className="toma-lista">
            {pendientes.length === 0 ? (
              <li className="toma-vacio es-listo">
                <Icon name="checkCircle" /> No queda nada pendiente en {ubicacion}.
              </li>
            ) : (
              pendientes.map((equipo) => (
                <li key={equipo.id}>
                  <div>
                    <strong>{equipo.nombre_equipo}</strong>
                    <span>
                      {equipo.id_patrimonial
                        ? [equipo.marca, equipo.id_patrimonial].filter(Boolean).join(" · ")
                        : "Sin etiqueta · no se puede escanear"}
                    </span>
                  </div>
                  {!equipo.id_patrimonial && (
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => void marcarAMano(equipo.id)}
                      disabled={ocupado || prueba}
                    >
                      Sí está
                    </button>
                  )}
                  <button
                    type="button"
                    className="toma-btn-perdido"
                    onClick={() => void noAparece(equipo.id)}
                    disabled={ocupado || prueba}
                  >
                    No está
                  </button>
                </li>
              ))
            )}
          </ul>
          <p className="toma-nota">
            Cuando esta columna queda vacía, el área está terminada.
          </p>
        </div>
      </div>

      <button type="button" className="ghost toma-terminar" onClick={() => setCerrando(true)}>
        <Icon name="checkCircle" size="1.3rem" /> Terminar {ubicacion}
      </button>
    </section>
  );
}
