/**
 * Habilitar el préstamo por tipo de equipo, no fila por fila.
 *
 * De las 2137 filas que entrega Patrimonio apenas unas 470 se prestan, y entran
 * todas como *solo inventario*. Moverlas de a una son cientos de clics — que es
 * exactamente la razón por la que nadie lo haría. Acá se mueven por
 * clasificador: filtrás "COMPUTADORA PORTATIL" y habilitás las 199 de un golpe.
 *
 * Ver `docs/PLAN_IMPORTACION_PATRIMONIO.md` §6 P4.
 */
import { useMemo, useState } from "react";
import { marcarPrestablePorNombre, type Categoria, type Equipo } from "../hooks/useInventory";
import { confirmDialog } from "../utils/confirm";

type Props = {
  equipos: Equipo[];
  categorias: Categoria[];
  onCambio: () => void;
};

type Grupo = {
  nombre: string;
  total: number;
  prestables: number;
};

export function CuraduriaPanel({ equipos, categorias, onCambio }: Props) {
  const [filtro, setFiltro] = useState("");
  const [categoriaDestino, setCategoriaDestino] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const grupos = useMemo<Grupo[]>(() => {
    const mapa = new Map<string, Grupo>();
    for (const equipo of equipos) {
      const nombre = equipo.nombre_equipo;
      const grupo = mapa.get(nombre) ?? { nombre, total: 0, prestables: 0 };
      grupo.total += 1;
      if (equipo.es_prestable === 1) grupo.prestables += 1;
      mapa.set(nombre, grupo);
    }
    return [...mapa.values()].sort((a, b) => b.total - a.total);
  }, [equipos]);

  const termino = filtro.trim().toLowerCase();
  const visibles = termino
    ? grupos.filter((grupo) => grupo.nombre.toLowerCase().includes(termino))
    : grupos.slice(0, 25);

  const cambiar = async (grupo: Grupo, prestable: boolean) => {
    const verbo = prestable ? "habilitar el préstamo de" : "quitar del préstamo";
    if (!(await confirmDialog(`¿Seguro que quieres ${verbo} los ${grupo.total} equipos "${grupo.nombre}"?`))) {
      return;
    }

    setOcupado(true);
    setError("");
    setAviso("");

    try {
      const tocados = await marcarPrestablePorNombre(
        grupo.nombre,
        prestable,
        categoriaDestino ? Number(categoriaDestino) : undefined
      );
      setAviso(`${tocados} equipos "${grupo.nombre}" actualizados.`);
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="stack" style={{ gap: "0.9rem", marginTop: "2rem" }}>
      <h2 style={{ margin: 0 }}>Habilitar préstamo por tipo</h2>
      <p style={{ color: "var(--text-secondary)", margin: 0, lineHeight: 1.55 }}>
        Todo lo que llega de Patrimonio entra como <strong>solo inventario</strong>. Acá decides
        qué tipos se prestan, sin tener que abrir equipo por equipo.
      </p>

      <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 240px" }}>
          <label htmlFor="curaduria-filtro">Buscar tipo</label>
          <input
            id="curaduria-filtro"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Ej. COMPUTADORA PORTATIL"
          />
        </div>
        <div style={{ flex: "1 1 200px" }}>
          <label htmlFor="curaduria-categoria">Mover a categoría (opcional)</label>
          <select
            id="curaduria-categoria"
            value={categoriaDestino}
            onChange={(e) => setCategoriaDestino(e.target.value)}
          >
            <option value="">Dejar donde están</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {aviso && <div className="feedback success">{aviso}</div>}
      {error && <div className="feedback error">{error}</div>}

      <div style={{ display: "grid", gap: "0.5rem" }}>
        {visibles.map((grupo) => (
          <div
            key={grupo.nombre}
            style={{ display: "flex", gap: "1rem", alignItems: "center", padding: "0.65rem 0.9rem", borderRadius: 10, background: "rgba(148,163,184,0.09)" }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {grupo.nombre}
              </strong>
              <small style={{ color: "var(--text-secondary)" }}>
                {grupo.total} equipos · {grupo.prestables} prestables
              </small>
            </div>
            <button
              type="button"
              className="ghost"
              disabled={ocupado || grupo.prestables === grupo.total}
              onClick={() => void cambiar(grupo, true)}
              style={{ width: "auto", padding: "0.45rem 0.8rem" }}
            >
              Prestable
            </button>
            <button
              type="button"
              className="ghost"
              disabled={ocupado || grupo.prestables === 0}
              onClick={() => void cambiar(grupo, false)}
              style={{ width: "auto", padding: "0.45rem 0.8rem" }}
            >
              Solo inventario
            </button>
          </div>
        ))}
      </div>

      {!termino && grupos.length > visibles.length && (
        <small style={{ color: "var(--text-secondary)" }}>
          Mostrando los {visibles.length} tipos más numerosos de {grupos.length}. Usa el buscador
          para llegar al resto.
        </small>
      )}
    </div>
  );
}
