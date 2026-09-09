/**
 * El formulario completo de un equipo, en un diálogo.
 *
 * Vivía dentro de `InventarioPanel` y solo se abría desde la tabla de Admin. La
 * toma física lo necesita también: cuando la pistola lee una etiqueta que la
 * base no conoce, el alta tiene que poder llenar marca, modelo, serie y
 * resguardante ahí mismo — con el aparato en la mano — y no dos pantallas
 * después, cuando ya nadie se acuerda de qué era.
 *
 * Por eso el componente es dueño de su propio estado: quien lo abre solo dice
 * QUÉ está editando (`editando`) o con qué arranca un alta (`prefill`), y se
 * entera de que se guardó por `onGuardado`. Ninguna de las dos pantallas vuelve
 * a cargar con doce `useState` de formulario.
 */
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Icon } from "./Icon";
import {
  addEstadoPersonalizado,
  createCategoria,
  createEquipo,
  getEstadosPersonalizados,
  getUbicacionesConocidas,
  updateEquipo,
  type Categoria,
  type Equipo,
} from "../hooks/useInventory";
import { generarIdentificadores } from "../utils/identificadores";
import { listaEstados, type Estado } from "../utils/estados";
import { promptDialog } from "../utils/confirm";

// Los campos de la ficha se llenan y se limpian en bloque.
const FICHA_VACIA = {
  marca: "",
  modelo: "",
  num_serie: "",
  descripcion: "",
  observaciones: "",
  resguardante_codigo: "",
  resguardante_nombre: "",
  fecha_adquisicion: "",
  ubicacion: "",
};

/** Lo que ya se sabe de un equipo antes de escribir nada. Solo aplica al alta. */
export type PrefillEquipo = {
  id_patrimonial?: string | null;
  ubicacion?: string | null;
  nombre_equipo?: string | null;
  categoria_id?: number | null;
  /**
   * Un equipo dado de alta caminando el edificio es inventario, no algo que se
   * preste: el kiosko se enciende a mano desde Admin. El alta normal sí nace
   * prestable, que es lo que espera quien registra una cámara nueva.
   */
  es_prestable?: boolean;
};

type Props = {
  abierto: boolean;
  /** `null` es un alta. Un equipo es una edición. */
  editando: Equipo | null;
  categorias: Categoria[];
  prefill?: PrefillEquipo;
  onCerrar: () => void;
  /** Se llama SOLO si la base aceptó la escritura. */
  onGuardado: (idPatrimonial: string | null) => void | Promise<void>;
  /**
   * Una categoría creada desde acá ya existe en la base aunque después se
   * cancele el alta. Sin este aviso, la pantalla de atrás sigue mostrando la
   * lista vieja hasta que algo más la recargue.
   */
  onCategoriaCreada?: () => void | Promise<void>;
};

export function EquipoFormDialog({
  abierto,
  editando,
  categorias,
  prefill,
  onCerrar,
  onGuardado,
  onCategoriaCreada,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [nombre, setNombre] = useState("");
  const [identificador, setIdentificador] = useState("");
  const [idPatrimonial, setIdPatrimonial] = useState("");
  const [ficha, setFicha] = useState(FICHA_VACIA);
  const [categoriaId, setCategoriaId] = useState("");
  const [estadoEdit, setEstadoEdit] = useState("disponible");
  const [esPrestable, setEsPrestable] = useState(true);
  const [esGranel, setEsGranel] = useState(false);
  const [stockTotal, setStockTotal] = useState("1");
  const [cantidadUnidades, setCantidadUnidades] = useState("1");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [estadosExtra, setEstadosExtra] = useState<Estado[]>([]);
  const [ubicacionesConocidas, setUbicacionesConocidas] = useState<string[]>([]);
  // Una categoría recién creada tiene que estar en el `<select>` en el mismo
  // gesto. Se guarda aparte de la prop porque el padre recarga su lista después,
  // no durante.
  const [categoriasExtra, setCategoriasExtra] = useState<Categoria[]>([]);

  const opcionesCategoria = useMemo(() => {
    const conocidas = new Set(categorias.map((categoria) => categoria.id));
    return [...categorias, ...categoriasExtra.filter((categoria) => !conocidas.has(categoria.id))];
  }, [categorias, categoriasExtra]);

  const opcionesEstado = useMemo(() => listaEstados(estadosExtra), [estadosExtra]);

  // El formulario se rellena al ABRIR, no en cada render: mientras está abierto
  // lo que manda es lo que la persona escribió, no lo que le pasaron por props.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!abierto) {
      if (dialog.open) dialog.close();
      return;
    }

    setError("");
    setGuardando(false);
    setCantidadUnidades("1");

    // Los dos catálogos que no vienen por props. Se releen en cada apertura
    // porque la toma física agrega ubicaciones mientras la app está abierta.
    void getEstadosPersonalizados().then(setEstadosExtra).catch(() => setEstadosExtra([]));
    void getUbicacionesConocidas().then(setUbicacionesConocidas).catch(() => setUbicacionesConocidas([]));

    if (editando) {
      setNombre(editando.nombre_equipo);
      setIdentificador(editando.identificador ?? "");
      setIdPatrimonial(editando.id_patrimonial ?? "");
      setFicha({
        marca: editando.marca ?? "",
        modelo: editando.modelo ?? "",
        num_serie: editando.num_serie ?? "",
        descripcion: editando.descripcion ?? "",
        observaciones: editando.observaciones ?? "",
        resguardante_codigo: editando.resguardante_codigo ?? "",
        resguardante_nombre: editando.resguardante_nombre ?? "",
        fecha_adquisicion: editando.fecha_adquisicion ?? "",
        ubicacion: editando.ubicacion ?? "",
      });
      setCategoriaId(String(editando.categoria_id));
      setEstadoEdit(editando.estado);
      setEsPrestable(editando.es_prestable === 1);
      setEsGranel(editando.es_granel === 1);
      setStockTotal(String(editando.stock_total));
    } else {
      setNombre(prefill?.nombre_equipo ?? "");
      setIdentificador("");
      setIdPatrimonial(prefill?.id_patrimonial ?? "");
      setFicha({ ...FICHA_VACIA, ubicacion: prefill?.ubicacion ?? "" });
      setCategoriaId(prefill?.categoria_id ? String(prefill.categoria_id) : "");
      setEstadoEdit("disponible");
      setEsPrestable(prefill?.es_prestable ?? true);
      setEsGranel(false);
      setStockTotal("1");
    }

    if (!dialog.open) dialog.showModal();
    // `prefill` es un objeto literal que cambia de identidad en cada render del
    // padre: incluirlo acá reabriría el formulario en blanco a media escritura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, editando]);

  // Las unidades que creará el alta múltiple. Se muestran ANTES de guardar: la
  // numeración no es algo que se deba descubrir después de imprimir etiquetas.
  const identificadoresPrevistos = useMemo(
    () => generarIdentificadores(identificador, editando ? 1 : Number(cantidadUnidades)),
    [identificador, cantidadUnidades, editando]
  );

  // Crear la categoría acá adentro y no "en Inventario, después": quien está
  // registrando un aparato que no encaja en ninguna ya sabe cómo se llama la
  // que falta, y mandarlo a otra pantalla es donde se abandona el alta.
  const agregarCategoria = async () => {
    const nombreNuevo = await promptDialog("Nombre de la categoría nueva", {
      placeholder: "Ej. Proyectores",
    });
    if (!nombreNuevo) return;

    try {
      // Nace no prestable por lo mismo que el alta al vuelo: qué se presta se
      // decide en Inventario, no mientras se registra un aparato.
      const id = await createCategoria(nombreNuevo, false);
      setCategoriasExtra((actuales) => [
        ...actuales,
        { id, nombre: nombreNuevo.trim(), es_prestable: 0, total_articulos: 0 },
      ]);
      setCategoriaId(String(id));
      await onCategoriaCreada?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la categoría");
    }
  };

  const agregarEstado = async () => {
    const nombreNuevo = await promptDialog("Nombre del estado nuevo", {
      placeholder: "Ej. En comodato",
    });
    if (!nombreNuevo) return;

    try {
      const estado = await addEstadoPersonalizado(nombreNuevo);
      setEstadosExtra(await getEstadosPersonalizados());
      setEstadoEdit(estado.valor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el estado");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nombre || !categoriaId || guardando) return;

    setGuardando(true);
    setError("");
    try {
      if (editando) {
        await updateEquipo(editando.id, {
          nombre_equipo: nombre,
          identificador: identificador || null,
          id_patrimonial: idPatrimonial || null,
          ...ficha,
          categoria_id: Number(categoriaId),
          estado: estadoEdit,
          es_prestable: esPrestable ? 1 : 0,
          es_granel: esGranel ? 1 : 0,
          stock_total: Number(stockTotal) || 1,
        });
      } else if (esGranel) {
        await createEquipo({
          nombre_equipo: nombre,
          identificador: identificador || null,
          // El granel nunca pasó por Patrimonio: no tiene etiqueta que leer.
          id_patrimonial: null,
          ...ficha,
          categoria_id: Number(categoriaId),
          estado: estadoEdit,
          es_prestable: esPrestable ? 1 : 0,
          es_granel: 1,
          stock_total: Number(stockTotal) || 1,
        });
      } else {
        // Una fila por unidad: es lo que le da a cada objeto su propia etiqueta y
        // su propio historial. Ver src/utils/identificadores.ts.
        //
        // El ID de Patrimonio y el número de serie NO se autonumeran como el
        // identificador: son propios de cada objeto físico y no son correlativos.
        // Repartir el mismo valor entre N unidades sería inventar el dato, así que
        // solo se asignan cuando el alta es de una sola unidad.
        //
        // El resto de la ficha sí se comparte: cinco laptops iguales compradas
        // juntas tienen la misma marca, modelo, fecha, resguardante y ubicación.
        const unaSolaUnidad = identificadoresPrevistos.length === 1;
        for (const codigo of identificadoresPrevistos) {
          await createEquipo({
            nombre_equipo: nombre,
            identificador: codigo,
            ...ficha,
            id_patrimonial: unaSolaUnidad ? idPatrimonial || null : null,
            num_serie: unaSolaUnidad ? ficha.num_serie || null : null,
            categoria_id: Number(categoriaId),
            estado: estadoEdit,
            es_prestable: esPrestable ? 1 : 0,
            es_granel: 0,
            stock_total: 1,
          });
        }
      }

      await onGuardado(idPatrimonial || null);
    } catch (err) {
      // El error se queda DENTRO del diálogo: si se cerrara para mostrarlo
      // afuera, lo escrito se perdería justo cuando hay que corregirlo.
      setError(err instanceof Error ? err.message : "Error al guardar el equipo");
      setGuardando(false);
    }
  };

  return (
    <dialog ref={dialogRef} className="admin-dialog is-form" onClose={onCerrar}>
      <div className="admin-form-head">
        <h3 style={{ margin: 0 }}>{editando ? "Editar equipo" : "Registrar equipo nuevo"}</h3>
        <button type="button" className="admin-dialog-close" onClick={onCerrar} aria-label="Cerrar">
          <Icon name="x" size="1.1rem" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="admin-form-shell">
        <div className="admin-form-body">
          <div className="admin-dialog-cols">

          <div className="stack" style={{ gap: '0.9rem' }}>
          <div className="admin-form-section">
            <div className="admin-form-section-title">Qué es</div>
            <div>
              <label>Nombre</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Cámara Sony A7" required />
            </div>
            <div>
              <label>Categoría</label>
              <div className="admin-field-con-alta">
                <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)} required>
                  <option value="">-- Seleccionar --</option>
                  {opcionesCategoria.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
                <button type="button" className="ghost" onClick={() => void agregarCategoria()} title="Crear una categoría nueva">
                  <Icon name="plus" /> Nueva
                </button>
              </div>
            </div>
          </div>

          <div className="admin-form-section">
            <div className="admin-form-section-title">Cómo se cuenta</div>
            {/* Two words each: the long paragraphs that used to explain these
                took more room than the whole rest of the form. */}
            <div className="admin-segmented">
              <button type="button" className={esGranel ? '' : 'is-active'} onClick={() => setEsGranel(false)} aria-pressed={!esGranel}>
                Equipo único
                <span>Se presta uno por uno</span>
              </button>
              <button type="button" className={esGranel ? 'is-active' : ''} onClick={() => setEsGranel(true)} aria-pressed={esGranel}>
                Por cantidad
                <span>Cables, controles, stock</span>
              </button>
            </div>

            {!esGranel && (
              <div className="admin-field-pair">
                <div>
                  <label>Código o serie</label>
                  <input value={identificador} onChange={e => setIdentificador(e.target.value)} placeholder="Ej. CAM-01" />
                </div>
                {/* El ID de Patrimonio es único por objeto y no es correlativo, así
                    que el alta múltiple no puede repartirlo entre las unidades. */}
                {(editando !== null || identificadoresPrevistos.length === 1) && (
                  <div>
                    <label>ID de Patrimonio</label>
                    <input
                      value={idPatrimonial}
                      onChange={e => setIdPatrimonial(e.target.value)}
                      placeholder="Ej. 3382871"
                      inputMode="numeric"
                      autoComplete="off"
                    />
                    <small style={{ color: 'var(--text-secondary)' }}>Escanea la etiqueta blanca con la pistola.</small>
                  </div>
                )}
              </div>
            )}

            {!esGranel && !editando && (
              <div>
                <label>¿Cuántas unidades?</label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={cantidadUnidades}
                  onChange={e => setCantidadUnidades(e.target.value)}
                />
                {identificadoresPrevistos.length > 1 && (
                  <div style={{ marginTop: '0.5rem', padding: '0.55rem 0.7rem', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.07)', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                    {identificadoresPrevistos[0] === null ? (
                      <>Se crearán {identificadoresPrevistos.length} unidades sin código. Escribe uno arriba para numerarlas.</>
                    ) : (
                      <>
                        Se crearán: <code>{identificadoresPrevistos[0]}</code>
                        {identificadoresPrevistos.length > 2 ? ' … ' : ', '}
                        <code>{identificadoresPrevistos[identificadoresPrevistos.length - 1]}</code>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
            {esGranel && (
              <div>
                <label>Cantidad total</label>
                <input
                  type="number"
                  min="1"
                  value={stockTotal}
                  onChange={e => setStockTotal(e.target.value)}
                  placeholder="Ej. 10"
                  required
                />
              </div>
            )}
          </div>
          </div>

          <div className="stack" style={{ gap: '0.9rem' }}>
          <div className="admin-form-section">
            <div className="admin-form-section-title">Dónde se ve</div>
            <button
              type="button"
              className={`admin-toggle-card${esPrestable ? ' is-on' : ''}`}
              onClick={() => setEsPrestable((current) => !current)}
              aria-pressed={esPrestable}
            >
              <span>Mostrar en kiosko</span>
              <span className="admin-toggle-pill">{esPrestable ? 'Sí' : 'No'}</span>
            </button>
            {/* El estado también se elige al dar de alta: un aparato que llega
                para baja o que va directo a resguardo entra así, sin tener que
                crearlo disponible y editarlo enseguida. */}
            <div>
              <label>Estado</label>
              <div className="admin-field-con-alta">
                <select value={estadoEdit} onChange={e => setEstadoEdit(e.target.value)} required>
                  {opcionesEstado.map(estado => (
                    <option key={estado.valor} value={estado.valor}>{estado.etiqueta}</option>
                  ))}
                </select>
                <button type="button" className="ghost" onClick={() => void agregarEstado()} title="Crear un estado nuevo">
                  <Icon name="plus" /> Nuevo
                </button>
              </div>
            </div>
          </div>

          {/* Estuvo plegada mientras el alta común era nombre + categoría. Con la
              toma física caminando el edificio, el resguardante es el dato que
              más se corrige, y un acordeón cerrado es un campo que nadie llena. */}
          <div className="admin-form-section ficha-patrimonio">
            <div className="admin-form-section-title">Ficha del equipo</div>
            <div className="admin-field-pair">
              <div>
                <label>Marca</label>
                <input value={ficha.marca} onChange={e => setFicha(f => ({ ...f, marca: e.target.value }))} placeholder="Ej. DELL" />
              </div>
              <div>
                <label>Modelo</label>
                <input value={ficha.modelo} onChange={e => setFicha(f => ({ ...f, modelo: e.target.value }))} placeholder="Ej. OPTIPLEX" />
              </div>
              {(editando !== null || identificadoresPrevistos.length === 1) && (
                <div>
                  <label>Número de serie</label>
                  <input value={ficha.num_serie} onChange={e => setFicha(f => ({ ...f, num_serie: e.target.value }))} placeholder="Ej. MXL3322DP2" />
                </div>
              )}
              <div>
                <label>Ubicación</label>
                {/* `datalist` y no un `select`: la lista son los lugares que ya
                    existen, pero escribir uno nuevo tiene que seguir siendo
                    posible — la mitad del edificio se nombra caminándolo. */}
                <input
                  value={ficha.ubicacion}
                  onChange={e => setFicha(f => ({ ...f, ubicacion: e.target.value }))}
                  placeholder="Ej. Aula 12"
                  list="ubicaciones-conocidas"
                  autoComplete="off"
                />
                <datalist id="ubicaciones-conocidas">
                  {ubicacionesConocidas.map(lugar => <option key={lugar} value={lugar} />)}
                </datalist>
              </div>
              <div>
                <label>Código del resguardante</label>
                <input value={ficha.resguardante_codigo} onChange={e => setFicha(f => ({ ...f, resguardante_codigo: e.target.value }))} placeholder="Ej. 2800829" inputMode="numeric" />
              </div>
              <div>
                <label>Nombre del resguardante</label>
                <input value={ficha.resguardante_nombre} onChange={e => setFicha(f => ({ ...f, resguardante_nombre: e.target.value }))} placeholder="Quien responde por el bien" />
              </div>
              <div>
                <label>Fecha de adquisición</label>
                <input type="date" value={ficha.fecha_adquisicion} onChange={e => setFicha(f => ({ ...f, fecha_adquisicion: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginTop: '0.8rem' }}>
              <label>Descripción</label>
              <textarea
                value={ficha.descripcion}
                onChange={e => setFicha(f => ({ ...f, descripcion: e.target.value }))}
                placeholder="Características: procesador, memoria, medidas…"
                rows={2}
              />
            </div>
            {/* Aparte de la descripción a propósito: una es lo que el aparato
                ES (specs, y eso lo pisa la reimportación de Patrimonio) y la
                otra es lo que le PASA — por qué está obsoleto, qué le falta,
                qué se le hizo. Ese texto lo escribe la casa y no lo toca nadie más. */}
            <div style={{ marginTop: '0.8rem' }}>
              <label>Observaciones</label>
              <textarea
                value={ficha.observaciones}
                onChange={e => setFicha(f => ({ ...f, observaciones: e.target.value }))}
                placeholder="Notas: por qué está así, qué le falta, qué se le hizo…"
                rows={2}
              />
            </div>
          </div>
          </div>

          </div>
        </div>

        {error && <div className="feedback error" style={{ margin: '0 1.2rem' }}>{error}</div>}

        <div className="admin-dialog-actions">
          <button type="submit" style={{ flex: 2 }} disabled={guardando}>{editando ? "Guardar cambios" : (!esGranel && identificadoresPrevistos.length > 1 ? `Guardar ${identificadoresPrevistos.length} unidades` : "Guardar equipo")}</button>
          <button type="button" className="ghost" onClick={onCerrar} style={{ flex: 1 }}>Cancelar</button>
        </div>
      </form>
    </dialog>
  );
}
