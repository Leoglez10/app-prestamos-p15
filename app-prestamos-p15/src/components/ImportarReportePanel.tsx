/**
 * Traer la toma física que se hizo en la OTRA computadora.
 *
 * Dos pasos, nunca uno: primero se lee y se muestra qué va a pasar, después se
 * aplica. Igual que la importación del Excel, y por la misma razón.
 *
 * Lo que lo hace distinto de restaurar un respaldo: esto FUSIONA. Escribe solo
 * las columnas que produce un recorrido, así que la máquina principal puede
 * haber seguido prestando todo el día sin perder nada. Restaurar el `.db` de la
 * otra computadora sí borraría esos préstamos.
 *
 * Ver `src/utils/reporteTomaFisica.ts` y `docs/RELEVO_TOMA_FISICA.md`.
 */
import { useRef, useState } from "react";
import { Icon } from "./Icon";
import {
  leerReporteTomaFisica,
  aplicarFusionReporte,
  type PlanFusion,
} from "../hooks/useInventory";

type Props = { onImportado: () => void };

function Cifra({ valor, etiqueta, tono }: { valor: number; etiqueta: string; tono: string }) {
  return (
    <div style={{ padding: "0.85rem 1rem", borderRadius: 12, background: tono, minWidth: 130 }}>
      <div style={{ fontSize: "1.8rem", fontWeight: 800, lineHeight: 1 }}>{valor}</div>
      <small style={{ color: "var(--text-secondary)" }}>{etiqueta}</small>
    </div>
  );
}

export function ImportarReportePanel({ onImportado }: Props) {
  const archivoRef = useRef<HTMLInputElement>(null);
  const [plan, setPlan] = useState<PlanFusion | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState("");

  const elegirArchivo = async (archivo: File) => {
    setOcupado(true);
    setError("");
    setResultado("");
    setPlan(null);

    try {
      setPlan(await leerReporteTomaFisica(await archivo.text()));
      setNombreArchivo(archivo.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setOcupado(false);
    }
  };

  const aplicar = async () => {
    if (!plan) return;
    setOcupado(true);
    setError("");

    try {
      const hecho = await aplicarFusionReporte(plan);
      setResultado(
        `Listo: ${hecho.aplicados} equipos actualizados con el recorrido de la otra ` +
          `computadora. Respaldo previo: ${hecho.respaldo}`
      );
      setPlan(null);
      if (archivoRef.current) archivoRef.current.value = "";
      onImportado();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setOcupado(false);
    }
  };

  const revisados = plan?.cambios.filter((cambio) => cambio.tipo === "revisado").length ?? 0;
  const perdidos = plan?.cambios.filter((cambio) => cambio.tipo === "no_localizado").length ?? 0;
  const nadaQueHacer = plan !== null && plan.cambios.length === 0;

  return (
    <div className="stack" style={{ gap: "0.9rem", marginTop: "2rem" }}>
      <h2 style={{ margin: 0 }}>Traer la toma física de otra computadora</h2>
      <p style={{ color: "var(--text-secondary)", margin: 0, lineHeight: 1.55 }}>
        Toma el archivo <strong>reporte-inventario-….csv</strong> que exportó la computadora
        que hizo el recorrido. Solo actualiza qué se revisó, quién lo revisó y dónde estaba:
        no toca préstamos, categorías ni nada más. Primero verás qué va a pasar.
      </p>

      <div>
        <input
          ref={archivoRef}
          type="file"
          accept=".csv,text/csv"
          disabled={ocupado}
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            if (archivo) void elegirArchivo(archivo);
          }}
        />
      </div>

      {ocupado && <div style={{ color: "var(--text-secondary)" }}>Trabajando…</div>}
      {error && <div className="feedback error">{error}</div>}
      {resultado && <div className="feedback success">{resultado}</div>}

      {plan && (
        <div className="stack" style={{ gap: "0.9rem" }}>
          <small style={{ color: "var(--text-secondary)" }}>{nombreArchivo}</small>

          <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
            <Cifra valor={revisados} etiqueta="aparecieron" tono="rgba(22, 163, 74, 0.10)" />
            <Cifra valor={perdidos} etiqueta="no aparecieron" tono="rgba(217, 119, 6, 0.10)" />
            <Cifra valor={plan.sinCambio} etiqueta="ya estaban al día" tono="rgba(148, 163, 184, 0.14)" />
            <Cifra valor={plan.sinDecidir} etiqueta="sin recorrer" tono="rgba(148, 163, 184, 0.14)" />
          </div>

          <div style={{ padding: "0.8rem 1rem", borderRadius: 12, background: "rgba(148, 163, 184, 0.10)", lineHeight: 1.55 }}>
            Esto <strong>fusiona</strong>, no reemplaza. Gana el dato más nuevo equipo por
            equipo, así que un reporte viejo no puede pisar un recorrido más reciente, y
            traer el mismo archivo dos veces no cambia nada.
            <br />
            Los préstamos que se registraron aquí mientras tanto <strong>no se tocan</strong>.
          </div>

          {plan.desconocidos.length > 0 && (
            <details>
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                {plan.desconocidos.length} equipos del reporte no existen en esta base
              </summary>
              <p style={{ margin: "0.6rem 0", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                Son altas al vuelo de la otra computadora. Hay que darlos de alta a mano
                aquí: el reporte no trae la categoría, y elegirla por ti sería adivinar.
              </p>
              <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {plan.desconocidos.slice(0, 50).map((id) => <li key={id}>{id}</li>)}
                {plan.desconocidos.length > 50 && <li>… y {plan.desconocidos.length - 50} más</li>}
              </ul>
            </details>
          )}

          {plan.sinEtiqueta > 0 && (
            <div style={{ color: "var(--text-secondary)" }}>
              {plan.sinEtiqueta} filas sin etiqueta de Patrimonio: no hay con qué
              identificarlas, se ignoran.
            </div>
          )}

          {plan.avisos.length > 0 && (
            <details>
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                {plan.avisos.length} avisos del archivo
              </summary>
              <ul style={{ margin: "0.6rem 0 0", paddingLeft: "1.2rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {plan.avisos.slice(0, 50).map((aviso, i) => <li key={i}>{aviso}</li>)}
                {plan.avisos.length > 50 && <li>… y {plan.avisos.length - 50} más</li>}
              </ul>
            </details>
          )}

          {nadaQueHacer ? (
            <div className="feedback success">
              Este inventario ya está al día con el recorrido de ese archivo.
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void aplicar()}
              disabled={ocupado}
              style={{ width: "auto", padding: "0.8rem 1.2rem", display: "inline-flex", alignItems: "center", gap: "0.45rem" }}
            >
              <Icon name="check" size="1.05rem" />
              Fusionar el recorrido
            </button>
          )}
          <small style={{ color: "var(--text-secondary)" }}>
            Se hace un respaldo automático antes de escribir.
          </small>
        </div>
      )}
    </div>
  );
}
