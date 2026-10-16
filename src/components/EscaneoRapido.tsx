import { useRef, useState, type FormEvent } from "react";
import { buscarPorIdPatrimonial, type Equipo } from "../hooks/useInventory";
import { usePistola } from "../hooks/usePistola";
import { Icon } from "./Icon";

/** Inventory lookup only: never registers a review or changes a location. */
export function EscaneoRapido({ onCerrar }: { onCerrar: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pending = useRef(false);
  const [codigo, setCodigo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [resultado, setResultado] = useState<{ codigo: string; equipo: Equipo | null } | null>(null);
  const [error, setError] = useState("");
  const [foco, setFoco] = useState(true);

  const consultar = async (event?: FormEvent) => {
    event?.preventDefault();
    const valor = codigo.trim();
    if (!valor || pending.current) return;
    pending.current = true;
    setOcupado(true);
    setCodigo("");
    setError("");
    setResultado(null);
    try {
      setResultado({ codigo: valor, equipo: await buscarPorIdPatrimonial(valor) });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      pending.current = false;
      setOcupado(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };
  usePistola(codigo, () => void consultar());

  return (
    <section className="toma-recorrido toma-consulta">
      <header className="toma-barra">
        <div className="toma-barra-area"><Icon name="search" /><strong>Escaneo rápido</strong></div>
        <button type="button" className="ghost toma-salir" onClick={onCerrar} disabled={ocupado}>
          <Icon name="arrowLeft" /> Volver a toma de inventario
        </button>
      </header>
      <p className="toma-nota">Solo consulta: no cambia la ubicación, no marca equipos como revisados ni modifica la campaña.</p>
      <form className={`toma-escaneo${foco ? "" : " sin-foco"}`} onSubmit={(event) => void consultar(event)}>
        <div className="toma-escaneo-texto">
          <label htmlFor="consulta-codigo"><Icon name="barcode" /> Escanea una etiqueta</label>
          <small>También puedes escribir el número y presionar Enter.</small>
        </div>
        <input id="consulta-codigo" ref={inputRef} autoFocus autoComplete="off" inputMode="numeric"
          placeholder="Código de Patrimonio" value={codigo} onChange={(event) => setCodigo(event.target.value)}
          onFocus={() => setFoco(true)} onBlur={() => setFoco(false)} />
        <button type="submit" disabled={ocupado || !codigo.trim()}>Consultar</button>
      </form>
      {<div className={`toma-sin-foco-aviso${foco ? " is-focused" : ""}`} aria-hidden={foco}><Icon name="alert" /> Activa el campo para seguir escaneando.
        <button type="button" onClick={() => inputRef.current?.focus()}>Recuperar foco</button>
      </div>}
      <div aria-live="polite" aria-atomic="true">
        {ocupado && <p>Buscando en el inventario…</p>}
        {error && <p className="feedback error">{error}</p>}
        {resultado && (resultado.equipo ? (
          <article className="toma-consulta-resultado">
            <h2><Icon name="checkCircle" /> Está en el inventario</h2>
            <h3>{resultado.equipo.nombre_equipo}</h3>
            <p>{[resultado.equipo.marca, resultado.equipo.modelo, resultado.equipo.id_patrimonial].filter(Boolean).join(" · ")}</p>
            <p><Icon name="mapPin" /> Ubicación registrada: <strong>{resultado.equipo.ubicacion || "Sin ubicación registrada"}</strong></p>
          </article>
        ) : <p className="feedback">El código {resultado.codigo} no está en el inventario. No se modificó ningún registro.</p>)}
      </div>
    </section>
  );
}
