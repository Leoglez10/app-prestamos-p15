/**
 * Importación del directorio de profesores desde Excel.
 *
 * Mismo esquema que `ImportarPatrimonioPanel`: primero se lee y se muestra qué
 * va a pasar, después se aplica. La diferencia es que aquí el formato lo define
 * la app, así que se explica ANTES de elegir el archivo: nadie tiene por qué
 * adivinar qué encabezados espera.
 */
import { useRef, useState } from "react";
import { Icon } from "./Icon";
import {
  leerExcelProfesores,
  aplicarImportacionProfesores,
  type PlanImportacionProfesores,
} from "../hooks/useInventory";

type Props = { onImportado: () => void };

const EJEMPLO = [
  { codigo: "2958101", nombre: "Edgar Iván Aguilar Durán" },
  { codigo: "2104455", nombre: "María López Hernández" },
];

const celdaEjemplo = { padding: "0.45rem 0.8rem", borderBottom: "1px solid var(--border-subtle)", textAlign: "left" as const };

function Cifra({ valor, etiqueta, tono }: { valor: number; etiqueta: string; tono: string }) {
  return (
    <div style={{ padding: "0.85rem 1rem", borderRadius: 12, background: tono, minWidth: 130 }}>
      <div style={{ fontSize: "1.8rem", fontWeight: 800, lineHeight: 1 }}>{valor}</div>
      <small style={{ color: "var(--text-secondary)" }}>{etiqueta}</small>
    </div>
  );
}

export function ImportarProfesoresPanel({ onImportado }: Props) {
  const archivoRef = useRef<HTMLInputElement>(null);
  const [plan, setPlan] = useState<PlanImportacionProfesores | null>(null);
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
      setPlan(await leerExcelProfesores(bytes));
      setNombreArchivo(archivo.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      // Permite volver a elegir el mismo archivo después de corregirlo.
      if (archivoRef.current) archivoRef.current.value = "";
      setOcupado(false);
    }
  };

  const aplicar = async () => {
    if (!plan) return;
    setOcupado(true);
    setError("");

    try {
      const hecho = await aplicarImportacionProfesores(plan);
      setResultado(
        `Listo: ${hecho.altas} profesores nuevos, ${hecho.actualizados} nombres actualizados, ` +
          `${hecho.sinCambio} sin cambios. Respaldo previo: ${hecho.respaldo}`
      );
      setPlan(null);
      onImportado();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setOcupado(false);
    }
  };

  const nadaQueHacer = plan !== null && plan.altas.length === 0 && plan.cambios.length === 0;

  return (
    <div className="stack" style={{ gap: "0.9rem" }}>
      <h3 style={{ margin: 0 }}>Importar profesores desde Excel</h3>
      <p style={{ color: "var(--text-secondary)", margin: 0, lineHeight: 1.55 }}>
        Prepara un archivo de Excel con una fila por profesor, con estos encabezados:
      </p>

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", fontSize: "0.9rem", background: "var(--surface-sunken)", borderRadius: 8 }}>
          <thead>
            <tr>
              <th style={celdaEjemplo}>Código</th>
              <th style={celdaEjemplo}>Nombre completo</th>
            </tr>
          </thead>
          <tbody>
            {EJEMPLO.map((fila) => (
              <tr key={fila.codigo}>
                <td style={celdaEjemplo}>{fila.codigo}</td>
                <td style={celdaEjemplo}>{fila.nombre}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
        <li>Se lee solo la primera hoja, con los encabezados en la fila 1.</li>
        <li>Las columnas pueden ir en cualquier orden; las demás columnas se ignoran.</li>
        <li>
          Da formato de <strong>Texto</strong> a la columna Código en Excel para que no se pierdan los ceros a la izquierda.
        </li>
        <li>Los profesores que ya existen se reconocen por su código y solo se actualiza su nombre.</li>
        <li>No se elimina a nadie y no se cambian los permisos de administrador.</li>
        <li>Se hace un respaldo automático antes de aplicar.</li>
      </ul>

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
          Elegir el Excel de profesores
        </button>
      </div>

      {ocupado && <div style={{ color: "var(--text-secondary)" }}>Trabajando…</div>}
      {error && <div className="feedback error">{error}</div>}
      {resultado && <div className="feedback success">{resultado}</div>}

      {plan && (
        <div className="stack" style={{ gap: "0.9rem" }}>
          <small style={{ color: "var(--text-secondary)" }}>{nombreArchivo}</small>

          <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
            <Cifra valor={plan.altas.length} etiqueta="profesores nuevos" tono="rgba(37, 99, 235, 0.09)" />
            <Cifra valor={plan.cambios.length} etiqueta="cambian de nombre" tono="rgba(217, 119, 6, 0.10)" />
            <Cifra valor={plan.sinCambio} etiqueta="sin cambios" tono="rgba(148, 163, 184, 0.14)" />
          </div>

          {plan.cambios.length > 0 && (
            <details open>
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                {plan.cambios.length} cambios de nombre
              </summary>
              <ul style={{ margin: "0.6rem 0 0", paddingLeft: "1.2rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {plan.cambios.slice(0, 50).map((cambio) => (
                  <li key={cambio.id}>
                    <strong>{cambio.codigo}</strong>: {cambio.nombreAnterior} → {cambio.nombre}
                  </li>
                ))}
                {plan.cambios.length > 50 && <li>… y {plan.cambios.length - 50} más</li>}
              </ul>
            </details>
          )}

          {plan.altas.length > 0 && (
            <details>
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                {plan.altas.length} profesores nuevos
              </summary>
              <ul style={{ margin: "0.6rem 0 0", paddingLeft: "1.2rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {plan.altas.slice(0, 50).map((alta) => (
                  <li key={alta.codigo}>
                    <strong>{alta.codigo}</strong>: {alta.nombre}
                  </li>
                ))}
                {plan.altas.length > 50 && <li>… y {plan.altas.length - 50} más</li>}
              </ul>
            </details>
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
            <div className="feedback success">El directorio ya está al día con este archivo.</div>
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
        </div>
      )}
    </div>
  );
}
