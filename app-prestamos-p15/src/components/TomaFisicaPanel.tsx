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
 * una segunda navegación para el mismo trabajo.
 *
 * Ver `docs/PLAN_IMPORTACION_PATRIMONIO.md` §3.
 */
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import {
  buscarPorIdPatrimonial,
  exportarReporteInventario,
  getEquipos,
  getInicioCampana,
  iniciarCampanaInventario,
  registrarRevision,
  vincularIdPatrimonial,
  type Equipo,
  type Profesor,
} from "../hooks/useInventory";
import { calcularProgreso, type EquipoRevisable } from "../utils/tomaFisica";
import { normalizarCodigoPatrimonial } from "../utils/codigoPatrimonial";
import { confirmDialog } from "../utils/confirm";

type Leido = {
  equipo: Equipo;
  cuando: string;
};

const comoRevisable = (equipo: Equipo): EquipoRevisable => ({
  id: equipo.id,
  nombre_equipo: equipo.nombre_equipo,
  id_patrimonial: equipo.id_patrimonial,
  ubicacion: equipo.ubicacion,
  revisado_en: equipo.revisado_en,
  revisado_por: equipo.revisado_por,
  marca: equipo.marca,
  modelo: equipo.modelo,
  num_serie: equipo.num_serie,
  resguardante_nombre: equipo.resguardante_nombre,
});

export function TomaFisicaPanel({ adminUser }: { adminUser: Profesor }) {
  const escaneoRef = useRef<HTMLInputElement>(null);

  const [cargando, setCargando] = useState(true);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [inicioCampana, setInicioCampana] = useState<string | null>(null);

  const [ubicacion, setUbicacion] = useState("");
  const [ubicacionFijada, setUbicacionFijada] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [leidos, setLeidos] = useState<Leido[]>([]);
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");
  const [desconocido, setDesconocido] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const quienRevisa = adminUser.nombre;

  const recargar = useCallback(async () => {
    const [filas, inicio] = await Promise.all([getEquipos(), getInicioCampana()]);
    setEquipos(filas);
    setInicioCampana(inicio);
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

  const progreso = calcularProgreso(equipos.map(comoRevisable), inicioCampana);

  const escanear = async (e: FormEvent) => {
    e.preventDefault();
    const disparo = codigo.trim();
    if (!disparo || ocupado) return;

    setOcupado(true);
    setError("");
    setAviso("");
    setCodigo("");

    try {
      const equipo = await buscarPorIdPatrimonial(disparo);

      if (!equipo) {
        // No es un error: es la puerta de entrada para ligar lo que Patrimonio
        // nunca etiqueto o lo que el Excel no cubrio.
        setDesconocido(normalizarCodigoPatrimonial(disparo));
        return;
      }

      const yaLeido = leidos.some((leido) => leido.equipo.id === equipo.id);
      if (yaLeido) {
        setAviso(`${equipo.nombre_equipo} ya se había leído en esta ubicación.`);
        enfocarEscaneo();
        return;
      }

      await registrarRevision(equipo.id, ubicacion, quienRevisa);
      setLeidos((actuales) => [{ equipo, cuando: new Date().toLocaleTimeString() }, ...actuales]);
      await recargar();
      enfocarEscaneo();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      enfocarEscaneo();
    } finally {
      setOcupado(false);
    }
  };

  const ligar = async (equipoId: number) => {
    if (!desconocido) return;
    setOcupado(true);
    setError("");

    try {
      await vincularIdPatrimonial(equipoId, desconocido);
      await registrarRevision(equipoId, ubicacion, quienRevisa);
      const equipo = equipos.find((item) => item.id === equipoId);
      if (equipo) {
        setLeidos((actuales) => [
          { equipo: { ...equipo, id_patrimonial: desconocido }, cuando: new Date().toLocaleTimeString() },
          ...actuales,
        ]);
      }
      setDesconocido(null);
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
      <section>
        <div style={{ maxWidth: 620 }}>
          <h1 style={{ fontSize: "2.5rem", marginTop: 0 }}>Toma de inventario</h1>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.55 }}>
            ¿En qué área estás ahora? Se le va a poner esta ubicación a todo lo que escanees,
            hasta que la cambies.
          </p>

          <form
            onSubmit={(e) => { e.preventDefault(); if (ubicacion.trim()) setUbicacionFijada(true); }}
            className="stack"
            style={{ gap: "0.9rem" }}
          >
            <div>
              <label htmlFor="ubicacion">Ubicación</label>
              <input
                id="ubicacion"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                placeholder="Ej. Aula 12, Laboratorio de cómputo, Auditorio"
                autoFocus
              />
            </div>
            <button type="submit" disabled={!ubicacion.trim()} style={{ width: "auto", padding: "0.8rem 1.3rem" }}>
              Empezar a escanear
            </button>
          </form>

          <div style={{ marginTop: "2rem", padding: "1rem", borderRadius: 12, background: "rgba(148,163,184,0.10)", lineHeight: 1.6 }}>
            <strong>{progreso.revisados}</strong> de <strong>{progreso.total}</strong> equipos
            revisados en esta campaña ({progreso.porcentaje}%).
            {progreso.sinEtiqueta > 0 && (
              <div style={{ color: "var(--text-secondary)", marginTop: "0.4rem" }}>
                {progreso.sinEtiqueta} sin etiqueta de Patrimonio: esos hay que buscarlos por nombre.
              </div>
            )}
            <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.9rem", flexWrap: "wrap" }}>
              <button type="button" className="ghost" onClick={() => void exportar()} disabled={ocupado} style={{ width: "auto", padding: "0.6rem 1rem" }}>
                Exportar reporte
              </button>
              <button type="button" className="ghost" onClick={() => void nuevaCampana()} disabled={ocupado} style={{ width: "auto", padding: "0.6rem 1rem" }}>
                Iniciar campaña nueva
              </button>
            </div>
          </div>

          {aviso && <div className="feedback success" style={{ marginTop: "1rem" }}>{aviso}</div>}
          {error && <div className="feedback error" style={{ marginTop: "1rem" }}>{error}</div>}
        </div>
      </section>
    );
  }

  // Paso 2: el bucle. Disparar, ver qué era, disparar otra vez.
  return (
    <section>
      <div className="toma-barra">
        <button
          type="button"
          className="ghost"
          onClick={() => { setUbicacionFijada(false); setLeidos([]); setAviso(""); }}
          style={{ width: "auto", padding: "0.5rem 0.9rem" }}
        >
          <Icon name="arrowLeft" /> Cambiar ubicación
        </button>
        <strong style={{ fontSize: "1.35rem" }}>{ubicacion}</strong>
        <span style={{ marginLeft: "auto", color: "var(--text-secondary)" }}>
          {leidos.length} aquí · {progreso.revisados}/{progreso.total} en total ({progreso.porcentaje}%)
        </span>
      </div>

      <div style={{ maxWidth: 760 }}>
        <form onSubmit={escanear}>
          <label htmlFor="escaneo" style={{ fontSize: "1.1rem" }}>Dispara la pistola contra la etiqueta</label>
          <input
            id="escaneo"
            ref={escaneoRef}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="El código aparece aquí solo…"
            inputMode="numeric"
            autoComplete="off"
            disabled={desconocido !== null}
            style={{ fontSize: "1.6rem", padding: "0.9rem 1rem", letterSpacing: ".06em" }}
          />
        </form>

        {aviso && <div className="feedback" style={{ marginTop: "0.9rem" }}>{aviso}</div>}
        {error && <div className="feedback error" style={{ marginTop: "0.9rem" }}>{error}</div>}

        {desconocido && (
          <div style={{ marginTop: "1rem", padding: "1rem", borderRadius: 12, background: "rgba(217,119,6,0.10)" }}>
            <strong>El código {desconocido} no está en el inventario.</strong>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.55 }}>
              Elegí a qué equipo pertenece y queda ligado para siempre. Si no aparece, cancelá y
              dalo de alta desde Admin.
            </p>
            <select
              defaultValue=""
              onChange={(e) => { if (e.target.value) void ligar(Number(e.target.value)); }}
              disabled={ocupado}
            >
              <option value="">¿Qué equipo es este?</option>
              {equipos
                .filter((equipo) => !equipo.id_patrimonial && equipo.es_granel === 0)
                .map((equipo) => (
                  <option key={equipo.id} value={equipo.id}>
                    {equipo.nombre_equipo}
                    {equipo.identificador ? ` · ${equipo.identificador}` : ""}
                  </option>
                ))}
            </select>
            <button
              type="button"
              className="ghost"
              onClick={() => setDesconocido(null)}
              style={{ width: "auto", padding: "0.55rem 0.9rem", marginTop: "0.7rem" }}
            >
              Cancelar y seguir escaneando
            </button>
          </div>
        )}

        <ul style={{ listStyle: "none", padding: 0, marginTop: "1.5rem", display: "grid", gap: "0.6rem" }}>
          {leidos.map((leido) => (
            <li
              key={leido.equipo.id}
              style={{ padding: "0.8rem 1rem", borderRadius: 12, background: "rgba(34,197,94,0.10)", display: "flex", gap: "1rem", alignItems: "baseline" }}
            >
              <Icon name="check" />
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: "1.1rem" }}>{leido.equipo.nombre_equipo}</strong>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.92rem" }}>
                  {[leido.equipo.marca, leido.equipo.modelo, leido.equipo.id_patrimonial]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
              <small style={{ color: "var(--text-secondary)" }}>{leido.cuando}</small>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
