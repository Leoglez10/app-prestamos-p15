import { useRef, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { validarReporte, TITULO_MAX, DESCRIPCION_MAX } from "../utils/reporteProblema";

export function ReportarProblemaPanel() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const abrirRef = useRef<HTMLButtonElement>(null);
  const tipoRef = useRef<HTMLSelectElement>(null);
  const [tipo, setTipo] = useState("bug");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);

  const disponible = isTauri();

  const abrir = () => {
    setError("");
    setEnviado(false);
    dialogRef.current?.showModal();
    tipoRef.current?.focus();
  };

  const enviar = async (event: React.FormEvent) => {
    event.preventDefault();
    const problema = validarReporte({ tipo, titulo, descripcion });
    if (problema) { setError(problema); return; }
    setEnviando(true);
    setError("");
    try {
      // La versión y el sistema los agrega Rust: el reporte no puede mentir sobre ellos.
      await invoke("reportar_problema", { tipo, titulo, descripcion });
      setTitulo("");
      setDescripcion("");
      setEnviado(true);
      dialogRef.current?.close();
    } catch (err) {
      setError(typeof err === "string" ? err : "No se pudo enviar el reporte. Volvé a intentar en un rato.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="panel" aria-labelledby="reportar-problema-heading">
      <h2 id="reportar-problema-heading">Reportar un problema</h2>
      <p>
        Lo que escribas le llega directamente a quien desarrolla la aplicación. Se adjuntan solos la
        versión instalada y el sistema operativo; no se envía ningún dato de préstamos ni de personas.
      </p>
      {enviado ? <p role="status">Gracias, el reporte se envió.</p> : null}
      {disponible ? (
        <button type="button" ref={abrirRef} onClick={abrir}>Escribir un reporte…</button>
      ) : (
        <p role="status">Los reportes solo se pueden enviar desde la aplicación de escritorio.</p>
      )}

      <dialog
        ref={dialogRef}
        className="admin-dialog"
        aria-label="Reportar un problema"
        onClose={() => abrirRef.current?.focus()}
      >
        <form onSubmit={enviar} style={{ display: "grid", gap: "0.8rem" }}>
          <label htmlFor="reporte-tipo">¿Qué querés contarnos?</label>
          <select id="reporte-tipo" ref={tipoRef} value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="bug">Un problema</option>
            <option value="sugerencia">Una sugerencia</option>
          </select>

          <label htmlFor="reporte-titulo">Título</label>
          <input
            id="reporte-titulo"
            value={titulo}
            maxLength={TITULO_MAX}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="En una línea, qué pasó"
          />

          <label htmlFor="reporte-descripcion">Descripción</label>
          <textarea
            id="reporte-descripcion"
            value={descripcion}
            maxLength={DESCRIPCION_MAX}
            rows={6}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Qué estabas haciendo, qué esperabas que pasara y qué pasó en su lugar."
          />

          {error ? <p role="alert">{error}</p> : null}

          <div className="admin-dialog-actions">
            <button type="button" className="ghost" disabled={enviando} onClick={() => dialogRef.current?.close()}>
              Cancelar
            </button>
            <button type="submit" disabled={enviando}>{enviando ? "Enviando…" : "Enviar reporte"}</button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
