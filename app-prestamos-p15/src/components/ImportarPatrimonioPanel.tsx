/**
 * Importación del Excel de Patrimonio de la UdeG.
 *
 * Dos pasos, nunca uno: primero se lee y se muestra qué va a pasar, después se
 * aplica. Una importación que no se puede mirar antes de correr es una
 * importación que se corre a ciegas sobre el inventario de producción.
 *
 * El archivo se elige con un `<input type="file">` normal: no hace falta
 * `tauri-plugin-dialog` ni tocar `capabilities` para leer 202 KB.
 *
 * Ver `docs/PLAN_IMPORTACION_PATRIMONIO.md`.
 */
import { useRef, useState } from "react";
import { Icon } from "./Icon";
import {
  leerExcelPatrimonio,
  aplicarImportacionPatrimonio,
  type PlanImportacion,
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

export function ImportarPatrimonioPanel({ onImportado }: Props) {
  const archivoRef = useRef<HTMLInputElement>(null);
  const [plan, setPlan] = useState<PlanImportacion | null>(null);
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
      const bytes = new Uint8Array(await archivo.arrayBuffer());
      setPlan(await leerExcelPatrimonio(bytes));
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
      const hecho = await aplicarImportacionPatrimonio(plan);
      setResultado(
        `Listo: ${hecho.altas} equipos nuevos, ${hecho.actualizados} actualizados, ` +
          `${hecho.sinCambio} sin cambios. Respaldo previo: ${hecho.respaldo}`
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

  const nadaQueHacer = plan !== null && plan.altas.length === 0 && plan.cambios.length === 0;

  return (
    <div className="stack" style={{ gap: "0.9rem", marginTop: "2rem" }}>
      <h2 style={{ margin: 0 }}>Importar inventario de Patrimonio</h2>
      <p style={{ color: "var(--text-secondary)", margin: 0, lineHeight: 1.55 }}>
        Toma el archivo de Excel que entrega la Coordinación de Patrimonio de la UdeG.
        Primero verás qué va a pasar; nada se guarda hasta que confirmes.
      </p>

      <div>
        <input
          ref={archivoRef}
          type="file"
          accept=".xlsx,.xls"
          disabled={ocupado}
          hidden
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            if (archivo) void elegirArchivo(archivo);
          }}
        />
        <button
          type="button"
          className="ghost boton-archivo"
          disabled={ocupado}
          onClick={() => archivoRef.current?.click()}
        >
          <Icon name="upload" size="1.05rem" />
          Elegir el Excel de Patrimonio
        </button>
      </div>

      {ocupado && <div style={{ color: "var(--text-secondary)" }}>Trabajando…</div>}
      {error && <div className="feedback error">{error}</div>}
      {resultado && <div className="feedback success">{resultado}</div>}

      {plan && (
        <div className="stack" style={{ gap: "0.9rem" }}>
          <small style={{ color: "var(--text-secondary)" }}>{nombreArchivo}</small>

          <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
            <Cifra valor={plan.altas.length} etiqueta="equipos nuevos" tono="rgba(37, 99, 235, 0.09)" />
            <Cifra valor={plan.cambios.length} etiqueta="se actualizan" tono="rgba(217, 119, 6, 0.10)" />
            <Cifra valor={plan.sinCambio} etiqueta="sin cambios" tono="rgba(148, 163, 184, 0.14)" />
          </div>

          {plan.categoriasNuevas.length > 0 && (
            <div style={{ color: "var(--text-secondary)" }}>
              Se crearán estas categorías: <strong>{plan.categoriasNuevas.join(", ")}</strong>
            </div>
          )}

          <div style={{ padding: "0.8rem 1rem", borderRadius: 12, background: "rgba(148, 163, 184, 0.10)", lineHeight: 1.55 }}>
            Todos los equipos y categorías nuevos entran como <strong>solo inventario</strong>.
            El Excel los organiza, pero nunca decide qué se presta. Puedes habilitar una
            categoría después desde esta misma pantalla.
            <br />
            La importación <strong>no toca</strong> la ubicación, la categoría ni el nombre de
            los equipos que ya existen: eso lo produce la escuela, no Patrimonio.
          </div>

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
            <div className="feedback success">El inventario ya está al día con este archivo.</div>
          ) : (
            <button
              type="button"
              onClick={() => void aplicar()}
              disabled={ocupado}
              style={{ width: "auto", padding: "0.8rem 1.2rem", display: "inline-flex", alignItems: "center", gap: "0.45rem" }}
            >
              <Icon name="plus" size="1.05rem" />
              Aplicar importación
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
