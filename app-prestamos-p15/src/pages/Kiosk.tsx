import { CSSProperties, FormEvent, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logoP15 from "../../img/logo-p15.png";
import {
  Categoria,
  Equipo,
  Profesor,
  PrestamoActivo,
  createPrestamoRapido,
  getCategorias,
  getEquipos,
  getRuntimeStorageMode,
  getRuntimeStorageReason,
  initializeInventoryDb,
  verificarProfesorExacto,
  getPrestamosActivosProfesor,
  devolverEquipo,
  getSettings,
} from "../hooks/useInventory";
import { formatSqliteLoanDate } from "../utils/datetime";

export default function Kiosk() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [loginCodigo, setLoginCodigo] = useState("");
  const [loggedInProfesor, setLoggedInProfesor] = useState<Profesor | null>(null);
  const [misPrestamos, setMisPrestamos] = useState<PrestamoActivo[]>([]);

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [selectedCategoriaId, setSelectedCategoriaId] = useState<number | null>(null);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [allEquipos, setAllEquipos] = useState<Equipo[]>([]);
  const [equipoSearchTerm, setEquipoSearchTerm] = useState("");
  const [selectedEquipoIds, setSelectedEquipoIds] = useState<number[]>([]);
  const [itemCantidades, setItemCantidades] = useState<Record<number, number>>({});
  const [autoAddedEquipoIds, setAutoAddedEquipoIds] = useState<number[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [observacionesEntrega, setObservacionesEntrega] = useState("");
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [hdmiPromptEquipo, setHdmiPromptEquipo] = useState<Equipo | null>(null);
  const [cartPulse, setCartPulse] = useState(0);
  const [flyToCartItems, setFlyToCartItems] = useState<Array<{ id: number; label: string; startX: number; startY: number; endX: number; endY: number }>>([]);
  const [returnAllModalOpen, setReturnAllModalOpen] = useState(false);
  const cartRef = useRef<HTMLDivElement | null>(null);

  // Contador de equipos disponibles (para referencia futura)
  // const availableCount = useMemo(
  //   () => equipos.filter((equipo) => 
  //     equipo.es_granel === 1 ? equipo.stock_disponible > 0 : equipo.estado === "disponible"
  //   ).length,
  //   [equipos],
  // );

  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeInventoryDb();
        const loadedSettings = await getSettings();
        setSettings(loadedSettings || {});
        await Promise.all([loadCategorias(), loadEquipos(), loadAllEquipos()]);
      } catch (error) {
        const reason = getRuntimeStorageReason();
        setErrorMessage(
          reason || (error instanceof Error ? error.message : "No se pudo inicializar la app."),
        );
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, []);

  useEffect(() => {
    const state = location.state as { prefillCodigo?: string } | null;
    const codigo = state?.prefillCodigo?.trim();
    if (codigo) {
      setLoginCodigo(codigo);
    }
  }, [location.state]);

  useEffect(() => {
    void loadEquipos(selectedCategoriaId).catch((error) => {
      console.error(error);
    });
  }, [selectedCategoriaId]);

  const loadCategorias = async () => {
    const rows = await getCategorias();
    setCategorias(rows.filter((categoria) => categoria.es_prestable === 1));
  };

  const loadEquipos = async (categoriaId?: number | null) => {
    const rows = await getEquipos(categoriaId);
    setEquipos(rows.filter((equipo) => equipo.es_prestable === 1 && equipo.categoria_es_prestable === 1));
  };

  const loadAllEquipos = async () => {
    const rows = await getEquipos();
    setAllEquipos(rows.filter((equipo) => equipo.es_prestable === 1 && equipo.categoria_es_prestable === 1));
  };

  // Helper: cambiar categoría y limpiar búsqueda para evitar confusión de filtros activos
  const setCategoriaAndClearSearch = (id: number | null) => {
    setSelectedCategoriaId(id);
    setEquipoSearchTerm("");
  };

  const cargarPrestamos = async (codigo: string) => {
    const activos = await getPrestamosActivosProfesor(codigo);
    setMisPrestamos(activos);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setStatusMessage("");

    if (!loginCodigo.trim()) return;

    try {
      const profe = await verificarProfesorExacto(loginCodigo);
      if (!profe) {
        setErrorMessage("Código no encontrado. Verifica que esté escrito correctamente.");
        return;
      }
      setLoggedInProfesor(profe);
      await cargarPrestamos(profe.codigo);
    } catch (err) {
      setErrorMessage("Error al verificar código.");
    }
  };

  const handleLogout = () => {
    setLoggedInProfesor(null);
    setLoginCodigo("");
    setMisPrestamos([]);
setSelectedEquipoIds([]);
      setItemCantidades({});
      setAutoAddedEquipoIds([]);
      setObservacionesEntrega("");
      setConfirmModalOpen(false);
      setSuccessModalOpen(false);
      setHdmiPromptEquipo(null);
      setReturnAllModalOpen(false);
      setCartPulse(0);
      setStatusMessage("");
      setErrorMessage("");
  };

  const handlePrestamo = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage("");
    setStatusMessage("");

    if (!loggedInProfesor) return;
    if (selectedEquipoIds.length === 0) {
      setErrorMessage("Por favor selecciona al menos un equipo disponible.");
      return;
    }

    setConfirmModalOpen(true);
  };

  const handleConfirmPrestamo = async () => {
    if (!loggedInProfesor) return;

    const expandedIds: number[] = [];
    for (const [id, cantidad] of Object.entries(itemCantidades)) {
      for (let i = 0; i < cantidad; i++) {
        expandedIds.push(Number(id));
      }
    }

    try {
      await createPrestamoRapido({
        equipoIds: expandedIds,
        profesorCodigo: loggedInProfesor.codigo,
        profesorNombre: loggedInProfesor.nombre,
        observacionesEntrega,
      });

      await loadEquipos(selectedCategoriaId);
      await loadAllEquipos();
      await cargarPrestamos(loggedInProfesor.codigo);
      const totalItems = expandedIds.length;
      setStatusMessage(`Prestamo registrado exitosamente. (${totalItems} equipos).`);
      setSelectedEquipoIds([]);
      setItemCantidades({});
      setAutoAddedEquipoIds([]);
      setObservacionesEntrega("");
      setConfirmModalOpen(false);
      setSuccessModalOpen(true);
    } catch (error) {
      const msg = typeof error === 'string' ? error : (error instanceof Error ? error.message : "Error desconocido");
      setErrorMessage(`No se pudo procesar: ${msg}`);
    }
  };

  const handleDevolucion = async (prestamoId: number, equipoId: number) => {
    try {
      await devolverEquipo(prestamoId, equipoId, "", "");
      await loadEquipos(selectedCategoriaId);
      await loadAllEquipos();
      await cargarPrestamos(loggedInProfesor!.codigo);
      setStatusMessage("✅ ¡Devolución exitosa! Muchas gracias.");
    } catch (err) {
      setErrorMessage("Hubo un error al registrar tu devolución.");
    }
  };

  const handleDevolverTodo = async () => {
    if (!loggedInProfesor || misPrestamos.length === 0) return;

    try {
      for (const prestamo of misPrestamos) {
        await devolverEquipo(prestamo.id, prestamo.equipo_id, "", "");
      }

      await loadEquipos(selectedCategoriaId);
      await loadAllEquipos();
      await cargarPrestamos(loggedInProfesor.codigo);
      setReturnAllModalOpen(false);
      setStatusMessage("Todos los equipos fueron devueltos correctamente.");
    } catch (error) {
      const msg = typeof error === "string" ? error : error instanceof Error ? error.message : "Error desconocido";
      setErrorMessage(`No se pudieron devolver todos los equipos: ${msg}`);
    }
  };

  if (loading) return <main className="kiosk-main"><div style={{ margin: 'auto' }}>Cargando Kiosko...</div></main>;
  if (getRuntimeStorageMode() === "blocked") return <main className="kiosk-main"><div style={{ margin: 'auto', color: 'red' }}>Error de Base de Datos.</div></main>;

  const isLaptopEquipo = (equipo: Equipo) => {
    const source = `${equipo.nombre_equipo} ${equipo.categoria_nombre}`.toLowerCase();
    return source.includes("laptop") || source.includes("lap");
  };

  const isHdmiEquipo = (equipo: Equipo) => {
    const source = `${equipo.nombre_equipo} ${equipo.categoria_nombre} ${equipo.identificador ?? ""}`.toLowerCase();
    return source.includes("hdmi");
  };

  const isUsbCAdapter = (equipo: Equipo) => {
    const source = `${equipo.nombre_equipo} ${equipo.categoria_nombre} ${equipo.identificador ?? ""}`.toLowerCase();
    return (
      source.includes("usb-c") ||
      source.includes("usb c") ||
      source.includes("tipo c") ||
      source.includes("type c") ||
      source.includes("adaptador")
    );
  };

  const findPreferredHdmiEquipo = () => {
    const availableHdmi = allEquipos.filter((equipo) => isHdmiEquipo(equipo) && isEquipoDisponible(equipo));
    const directHdmi = availableHdmi.find((equipo) => !isUsbCAdapter(equipo));
    return directHdmi ?? availableHdmi[0];
  };

  const isEquipoDisponible = (equipo: Equipo) =>
    equipo.es_granel === 1 ? equipo.stock_disponible > 0 : equipo.estado === "disponible";

  const filteredEquipos = equipos.filter((eq) => {
    const term = equipoSearchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      eq.nombre_equipo.toLowerCase().includes(term) ||
      eq.categoria_nombre.toLowerCase().includes(term) ||
      (eq.identificador ?? "").toLowerCase().includes(term)
    );
  }).sort((a, b) => {
    const aDisponible = isEquipoDisponible(a) ? 1 : 0;
    const bDisponible = isEquipoDisponible(b) ? 1 : 0;
    return bDisponible - aDisponible;
  });

  const selectedEquiposSummary = Array.from(
    selectedEquipoIds.reduce((map, id) => {
      map.set(id, (map.get(id) ?? 0) + 1);
      return map;
    }, new Map<number, number>()).entries(),
  )
    .map(([id, count]) => {
      const equipo = allEquipos.find((item) => item.id === id) ?? equipos.find((item) => item.id === id);
      return equipo ? { equipo, count } : null;
    })
    .filter((item): item is { equipo: Equipo; count: number } => item !== null);

  const spawnFlyToCart = (equipo: Equipo, sourceElement?: HTMLElement | null) => {
    if (!cartRef.current) return;
    const cartRect = cartRef.current.getBoundingClientRect();
    const sourceRect = sourceElement?.getBoundingClientRect();
    const id = Date.now() + Math.floor(Math.random() * 1000);

    setFlyToCartItems((prev) => [
      ...prev,
      {
        id,
        label: equipo.nombre_equipo,
        startX: sourceRect ? sourceRect.left + sourceRect.width / 2 : window.innerWidth / 2,
        startY: sourceRect ? sourceRect.top + sourceRect.height / 2 : window.innerHeight / 2,
        endX: cartRect.left + cartRect.width - 40,
        endY: cartRect.top + 34,
      },
    ]);

    window.setTimeout(() => {
      setFlyToCartItems((prev) => prev.filter((item) => item.id !== id));
    }, 700);
  };

  const handleToggleEquipo = (equipo: Equipo, sourceElement?: HTMLElement | null) => {
    if (!isEquipoDisponible(equipo)) return;

    if (selectedEquipoIds.includes(equipo.id)) {
      setSelectedEquipoIds((prev) => prev.filter((id) => id !== equipo.id));
      setItemCantidades((prev) => {
        const updated = { ...prev };
        delete updated[equipo.id];
        return updated;
      });
      setAutoAddedEquipoIds((prev) => prev.filter((id) => id !== equipo.id));
      setCartPulse((value) => value + 1);
      return;
    }

    if (isLaptopEquipo(equipo)) {
      setHdmiPromptEquipo(equipo);
      return;
    }

    setSelectedEquipoIds((prev) => [...prev, equipo.id]);
    setItemCantidades((prev) => ({ ...prev, [equipo.id]: 1 }));
    setCartPulse((value) => value + 1);
    spawnFlyToCart(equipo, sourceElement);
    setEquipoSearchTerm("");
  };

  const handleLaptopSelection = (includeHdmi: boolean) => {
    if (!hdmiPromptEquipo) return;

    const nextIds = [hdmiPromptEquipo.id];
    let nextStatusMessage = "";
    const flyEquipos: Equipo[] = [hdmiPromptEquipo];

    if (includeHdmi) {
      const availableHdmi = findPreferredHdmiEquipo();
      if (!availableHdmi) {
        setErrorMessage("No hay ningun HDMI disponible para agregar en este momento.");
      } else {
        nextIds.push(availableHdmi.id);
        flyEquipos.push(availableHdmi);
        nextStatusMessage = `Se agrego ${availableHdmi.nombre_equipo} junto con la laptop.`;
      }
    }

    setSelectedEquipoIds((prev) => {
      const updated = [...prev, ...nextIds];
      return updated;
    });
    setItemCantidades((prev) => {
      const updated = { ...prev };
      for (const id of nextIds) {
        updated[id] = (updated[id] ?? 0) + 1;
      }
      return updated;
    });
    setAutoAddedEquipoIds(includeHdmi && flyEquipos.length > 1 ? [flyEquipos[1].id] : []);
    setCartPulse((value) => value + 1);
    if (nextStatusMessage) {
      setStatusMessage(nextStatusMessage);
    }
    flyEquipos.forEach((equipo, index) => {
      window.setTimeout(() => spawnFlyToCart(equipo, cartRef.current), index * 80);
    });
    setHdmiPromptEquipo(null);
  };

  const handleRemoveSelectedEquipo = (equipoId: number) => {
    setSelectedEquipoIds((prev) => {
      const index = prev.indexOf(equipoId);
      if (index === -1) return prev;
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
    setItemCantidades((prev) => {
      const updated = { ...prev };
      delete updated[equipoId];
      return updated;
    });
    setAutoAddedEquipoIds((prev) => prev.filter((id) => id !== equipoId));
    setCartPulse((value) => value + 1);
  };

  const cartProgress = Math.min(100, selectedEquipoIds.length === 0 ? 18 : 30 + selectedEquipoIds.length * 20);

  const getEquipoTone = (equipo: Equipo) => {
    if (!isEquipoDisponible(equipo)) return { border: "#ef4444", surface: "rgba(239, 68, 68, 0.10)", text: "#b91c1c", label: "Agotado" };
    if (equipo.es_granel === 1 && equipo.stock_disponible <= 2) {
      return { border: "#f59e0b", surface: "rgba(245, 158, 11, 0.12)", text: "#b45309", label: "Ultimas unidades" };
    }
    return { border: "#22c55e", surface: "rgba(34, 197, 94, 0.10)", text: "#166534", label: "Listo para llevar" };
  };

  const getEquipoSupportingText = (equipo: Equipo) => {
    if (!isEquipoDisponible(equipo)) {
      if (equipo.es_granel === 1) {
        return equipo.prestamo_activo_profe
          ? `Sin stock ahora. Ultimo registro activo: ${equipo.prestamo_activo_profe}`
          : "Sin stock disponible por ahora";
      }
      return equipo.prestamo_activo_profe
        ? `Prestado actualmente a ${equipo.prestamo_activo_profe}`
        : "No disponible por ahora";
    }
    if (equipo.es_granel === 1) {
      return equipo.stock_disponible <= 2
        ? `Solo quedan ${equipo.stock_disponible} disponibles`
        : `${equipo.stock_disponible} disponibles ahora`;
    }
    return "Disponible de inmediato";
  };

  return (
    <main className="kiosk-main">
      <style>
        {`
        .kiosk-main {
          min-height: 100vh;
          padding: 2rem 4rem;
          background:
            radial-gradient(circle at top right, rgba(59, 130, 246, 0.14), transparent 20%),
            radial-gradient(circle at top left, rgba(34, 197, 94, 0.12), transparent 22%),
            linear-gradient(180deg, #f8fbff 0%, #eef5fb 48%, #edf7f2 100%);
          display: flex;
          flex-direction: column;
          color: var(--text-primary);
          font-family: 'Inter', system-ui, sans-serif;
        }
        .kiosk-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        .kiosk-brand {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .kiosk-brand img {
          width: 72px;
          height: 72px;
          object-fit: contain;
          filter: drop-shadow(0 6px 10px rgba(15, 23, 42, 0.2));
        }
        .kiosk-brand span {
          font-weight: 800;
          letter-spacing: 0.02em;
          color: var(--text-primary);
          font-size: 1.55rem;
          line-height: 1;
        }
        .nav-btn {
          padding: 0.8rem 1.5rem;
          background: var(--surface-sunken);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          color: var(--text-primary);
          text-decoration: none;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
        .nav-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0,0,0,0.1);
          background: var(--surface-default);
        }
        .glass-card {
          background: var(--surface-default);
          border-radius: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.08);
          border: 1px solid var(--border-subtle);
          padding: 3rem;
          position: relative;
          overflow: hidden;
        }
        .glass-card::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0; height: 6px;
          background: linear-gradient(90deg, var(--brand-primary), #00d2ff);
        }
        .kiosk-input {
          width: 100%;
          padding: 1.5rem;
          font-size: 2rem;
          font-weight: 700;
          letter-spacing: 4px;
          border: 2px solid var(--border-subtle);
          border-radius: 16px;
          background: var(--surface-sunken);
          color: var(--text-primary);
          text-align: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .kiosk-input:focus {
          outline: none;
          border-color: var(--brand-primary);
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15);
          transform: scale(1.02);
        }
        .kiosk-btn-primary {
          background: var(--brand-primary);
          color: white;
          border: none;
          border-radius: 16px;
          padding: 1.2rem 2.5rem;
          font-size: 1.3rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
          width: 100%;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .kiosk-btn-primary:hover:not(:disabled) {
          transform: translateY(-3px) scale(1.01);
          box-shadow: 0 12px 25px rgba(37, 99, 235, 0.4);
        }
        .kiosk-btn-primary:active:not(:disabled) {
          transform: translateY(1px);
        }
        .kiosk-btn-primary:disabled {
          background: var(--surface-sunken);
          color: var(--text-secondary);
          box-shadow: none;
          cursor: not-allowed;
        }
        .eq-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 1.5rem;
          margin-top: 1rem;
          margin-left: -0.5rem;
          max-height: 480px;
          overflow-y: auto;
          /* Safe padding to prevent hover scale/translate clipping */
          padding: 8px 1rem 12px 0.5rem;
        }
        .eq-grid::-webkit-scrollbar { width: 8px; }
        .eq-grid::-webkit-scrollbar-track { background: var(--surface-sunken); border-radius: 4px; }
        .eq-grid::-webkit-scrollbar-thumb { background: var(--border-subtle); border-radius: 4px; }

        .eq-item {
          padding: 1.5rem;
          border-radius: 22px;
          background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.94));
          border: 1px solid rgba(148, 163, 184, 0.18);
          cursor: pointer;
          transition: all 0.22s ease;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          text-align: left;
          box-shadow: 0 16px 32px rgba(15, 23, 42, 0.06);
        }
        .eq-item.available:hover {
          border-color: rgba(37, 99, 235, 0.35);
          background: var(--surface-default);
          transform: translateY(-4px) scale(1.01);
          box-shadow: 0 18px 32px rgba(37, 99, 235, 0.12);
        }
        .eq-item.selected {
          border-color: rgba(37, 99, 235, 0.4);
          background: linear-gradient(180deg, rgba(219, 234, 254, 0.78), rgba(255,255,255,0.96));
          box-shadow: 0 18px 36px rgba(37, 99, 235, 0.14);
          transform: scale(1.02);
        }
        .eq-item.unavailable {
          opacity: 0.58;
          cursor: not-allowed;
          filter: grayscale(0.2);
        }
        .eq-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.8rem;
        }
        .eq-state-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.35rem 0.7rem;
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.02em;
        }
        .eq-support {
          font-size: 0.92rem;
          line-height: 1.5;
          color: var(--text-secondary);
        }
        .eq-meta-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.8rem;
          margin-top: auto;
        }
        .eq-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.38rem 0.7rem;
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 800;
          background: rgba(15, 23, 42, 0.06);
          color: var(--text-secondary);
        }
        .loan-card {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.1rem;
          background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(248,250,252,0.94));
          border: 1px solid rgba(251, 191, 36, 0.26);
          border-left: 5px solid #f59e0b;
          border-radius: 18px;
          margin-bottom: 0.9rem;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 14px 28px rgba(15, 23, 42, 0.06);
        }
        .loan-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 32px rgba(15, 23, 42, 0.1);
        }
        .kiosk-btn-outline {
          background: transparent;
          border: 2px solid #ff9800;
          color: #ff9800;
          border-radius: 10px;
          padding: 0.8rem 1.5rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
        }
        .kiosk-btn-outline:hover {
          background: #ff9800;
          color: white;
        }
        .category-select {
          padding: 0.8rem 1.5rem;
          border-radius: 12px;
          border: 2px solid var(--border-subtle);
          background: var(--surface-default);
          color: var(--text-primary);
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          z-index: 40;
          backdrop-filter: blur(6px);
        }
        .modal-card {
          width: min(720px, 100%);
          background: linear-gradient(180deg, var(--surface-default), #f6f8fb);
          border: 1px solid var(--border-subtle);
          border-radius: 24px;
          box-shadow: 0 30px 80px rgba(15, 23, 42, 0.3);
          padding: 2rem;
          display: grid;
          gap: 1rem;
        }
        .success-modal-card {
          width: min(620px, 100%);
          background:
            radial-gradient(circle at top left, rgba(134, 239, 172, 0.6), transparent 38%),
            radial-gradient(circle at top right, rgba(74, 222, 128, 0.35), transparent 28%),
            linear-gradient(180deg, #f0fdf4, #dcfce7 62%, #c9f7d7 100%);
          border: 1px solid rgba(34, 197, 94, 0.22);
          box-shadow: 0 36px 90px rgba(22, 101, 52, 0.28);
        }
        .success-hero {
          display: grid;
          justify-items: center;
          text-align: center;
          gap: 0.8rem;
          padding: 0.2rem 0 0.6rem;
        }
        .success-badge {
          width: 96px;
          height: 96px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: radial-gradient(circle at 30% 30%, #86efac, #16a34a);
          color: white;
          font-size: 2.6rem;
          font-weight: 900;
          box-shadow: 0 18px 40px rgba(34, 197, 94, 0.32);
        }
        .success-panel {
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.62);
          border: 1px solid rgba(34, 197, 94, 0.18);
          padding: 1rem 1.15rem;
          color: #166534;
          text-align: center;
          line-height: 1.6;
        }
        .success-actions {
          display: grid;
          grid-template-columns: 1fr 1.15fr;
          gap: 0.9rem;
          align-items: stretch;
        }
        .success-secondary-btn {
          border: 1px solid rgba(21, 128, 61, 0.18);
          background: rgba(255, 255, 255, 0.72);
          color: #166534;
          border-radius: 16px;
          padding: 1rem 1.2rem;
          font-weight: 800;
          font-size: 1rem;
          cursor: pointer;
          transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease;
        }
        .success-secondary-btn:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 12px 24px rgba(22, 101, 52, 0.08);
        }
        .success-primary-btn {
          width: 100%;
          min-width: 0;
          padding: 1.1rem 1.5rem;
          font-size: 1.08rem;
          border-radius: 16px;
          background: linear-gradient(180deg, #16a34a, #15803d);
          box-shadow: 0 18px 34px rgba(22, 163, 74, 0.24);
        }
        .success-primary-btn:hover:not(:disabled) {
          box-shadow: 0 22px 40px rgba(22, 163, 74, 0.32);
        }
        .success-footer-note {
          text-align: center;
          color: rgba(20, 83, 45, 0.8);
          font-size: 0.92rem;
          font-weight: 600;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.8rem;
          flex-wrap: wrap;
        }
        .modal-actions-centered {
          justify-content: center;
          align-items: center;
        }
        .modal-secondary-btn {
          padding: 0.9rem 1.2rem;
          border-radius: 12px;
          border: 1px solid var(--border-subtle);
          background: var(--surface-sunken);
          color: var(--text-primary);
          font-weight: 700;
          cursor: pointer;
        }
        .selection-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.55rem 0.9rem;
          border-radius: 999px;
          background: rgba(37, 99, 235, 0.08);
          color: var(--brand-primary);
          font-weight: 700;
          font-size: 0.95rem;
        }
        .kiosk-textarea {
          width: 100%;
          min-height: 120px;
          resize: vertical;
          border-radius: 16px;
          border: 2px solid var(--border-subtle);
          background: var(--surface-sunken);
          color: var(--text-primary);
          padding: 1rem;
          font-size: 1rem;
          font-family: inherit;
        }
        .cart-shell {
          position: sticky;
          top: 1rem;
          z-index: 5;
          margin-bottom: 1rem;
        }
        .cart-panel {
          border-radius: 20px;
          border: 1px solid rgba(37, 99, 235, 0.16);
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(255, 255, 255, 0.96), rgba(16, 185, 129, 0.08));
          padding: 1.1rem;
          display: grid;
          gap: 0.9rem;
          transition: transform 220ms ease, box-shadow 220ms ease;
          box-shadow: 0 18px 40px rgba(37, 99, 235, 0.08);
        }
        .cart-panel.pulse {
          animation: cartPulse 320ms ease;
        }
        .cart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .cart-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 42px;
          height: 42px;
          padding: 0 0.9rem;
          border-radius: 999px;
          background: var(--brand-primary);
          color: white;
          font-weight: 800;
          box-shadow: 0 10px 20px rgba(37, 99, 235, 0.24);
        }
        .cart-items {
          display: grid;
          gap: 0.65rem;
        }
        .cart-item {
          display: grid;
          grid-template-columns: 1fr auto auto;
          align-items: center;
          gap: 0.8rem;
          padding: 0.85rem 1rem;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(37, 99, 235, 0.1);
          animation: cartItemIn 240ms ease;
        }
        .cart-item-remove {
          border: none;
          background: rgba(239, 68, 68, 0.12);
          color: var(--danger-base);
          border-radius: 10px;
          padding: 0.45rem 0.75rem;
          font-weight: 700;
          cursor: pointer;
        }
        .cart-empty {
          padding: 0.9rem 1rem;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.7);
          color: var(--text-secondary);
          text-align: center;
        }
        .cart-progress-track {
          height: 10px;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.18);
          overflow: hidden;
        }
        .cart-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #2563eb, #10b981);
          transition: width 220ms ease;
        }
        .quick-filter-row {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }
        .quick-chip {
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: rgba(255,255,255,0.85);
          color: var(--text-primary);
          border-radius: 999px;
          padding: 0.55rem 0.9rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 180ms ease;
        }
        .quick-chip.active {
          background: rgba(37, 99, 235, 0.1);
          border-color: rgba(37, 99, 235, 0.26);
          color: #1d4ed8;
          box-shadow: 0 10px 24px rgba(37, 99, 235, 0.08);
        }
        .quick-chip:focus-visible {
          outline: 2px solid var(--brand-primary);
          outline-offset: 2px;
        }
        .inventory-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }
        .section-kicker {
          color: var(--brand-primary);
          font-size: 0.82rem;
          fontWeight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .muted-metric {
          color: var(--text-secondary);
          font-size: 0.95rem;
        }
        @media (max-width: 1100px) {
          .kiosk-main {
            padding: 1.2rem;
          }
          .success-actions {
            grid-template-columns: 1fr;
          }
        }
        .fly-token {
          position: fixed;
          left: 0;
          top: 0;
          z-index: 60;
          pointer-events: none;
          padding: 0.5rem 0.75rem;
          border-radius: 999px;
          background: rgba(37, 99, 235, 0.95);
          color: white;
          font-size: 0.8rem;
          font-weight: 800;
          box-shadow: 0 16px 30px rgba(37, 99, 235, 0.28);
          transform: translate(calc(var(--start-x) * 1px), calc(var(--start-y) * 1px)) scale(1);
          animation: flyToCart 680ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        @keyframes cartPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.015); }
          100% { transform: scale(1); }
        }
        @keyframes cartItemIn {
          0% { opacity: 0; transform: translateY(10px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes flyToCart {
          0% {
            opacity: 0;
            transform: translate(calc(var(--start-x) * 1px), calc(var(--start-y) * 1px)) scale(0.95);
          }
          15% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(calc(var(--end-x) * 1px), calc(var(--end-y) * 1px)) scale(0.42);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .fly-token {
            animation: none;
            opacity: 0;
          }
          .eq-item,
          .cart-panel,
          .loan-card,
          .nav-btn {
            transition: none;
          }
        }
        .a11y-sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        `}
      </style>

      <nav className="kiosk-nav">
        <div className="kiosk-brand">
          <img src={logoP15} alt="Logo Preparatoria Quince" />
          <span>Preparatoria 15</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {loggedInProfesor && (
            <button className="nav-btn" onClick={handleLogout} style={{ border: 'none', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger-base)' }}>
              Cerrar Sesión
            </button>
          )}
          <Link to="/" className="nav-btn">
            🏠 Volver a Inicio
          </Link>
        </div>
      </nav>

      {(statusMessage || errorMessage) && (
        <div style={{
          padding: '1.5rem',
          borderRadius: '16px',
          marginBottom: '2rem',
          background: errorMessage ? '#feeceb' : '#e6f4ea',
          color: errorMessage ? '#d32f2f' : '#1e8e3e',
          border: `1px solid ${errorMessage ? '#f4c3c2' : '#c3e6cb'}`,
          fontSize: '1.2rem',
          fontWeight: 600,
          textAlign: 'center',
          animation: 'fadeIn 0.3s ease'
        }}>
          {errorMessage || statusMessage}
        </div>
      )}

      {!loggedInProfesor ? (
        <section style={{ margin: 'auto', maxWidth: '600px', width: '100%', textAlign: 'center' }}>
          <div className="glass-card">
            <h1 style={{ fontSize: '3.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Ingresa tu Código</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginBottom: '3rem' }}>
              Por favor ingresa tu código de profesor.
            </p>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <input
                className="kiosk-input"
                type="text"
                value={loginCodigo}
                onChange={e => setLoginCodigo(e.target.value)}
                placeholder="Código (Ej. 2958101)"
                autoFocus
              />
              <button type="submit" className="kiosk-btn-primary">
                Identificarse
              </button>
            </form>
          </div>
        </section>
      ) : (
        <>
        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 2fr', gap: '2rem', flex: 1 }}>

          {/* Left Column: Profile & Active Loans */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="glass-card" style={{ padding: '2rem' }}>
              <div className="section-kicker" style={{ marginBottom: '0.55rem' }}>
                Colaborador Activo
              </div>
              <h1 style={{ fontSize: '2rem', margin: 0, lineHeight: 1.1 }}>{loggedInProfesor.nombre}</h1>
              <div style={{ color: 'var(--text-secondary)', marginTop: '0.45rem', fontSize: '1.02rem' }}>ID: {loggedInProfesor.codigo}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.75rem', marginTop: '1.2rem' }}>
                <div style={{ padding: '0.85rem', borderRadius: '18px', background: 'rgba(37, 99, 235, 0.08)' }}>
                  <div className="muted-metric">En carrito</div>
                  <strong style={{ fontSize: '1.45rem' }}>{selectedEquipoIds.length}</strong>
                </div>
                <div style={{ padding: '0.85rem', borderRadius: '18px', background: 'rgba(34, 197, 94, 0.08)' }}>
                  <div className="muted-metric">Pendientes</div>
                  <strong style={{ fontSize: '1.45rem' }}>{misPrestamos.length}</strong>
                </div>
                <div style={{ padding: '0.85rem', borderRadius: '18px', background: 'rgba(245, 158, 11, 0.10)' }}>
                  <div className="muted-metric">Sesion</div>
                  <strong style={{ fontSize: '1.05rem' }}>Activa</strong>
                </div>
              </div>
            </div>

            {settings.kiosk_show_pendientes !== 'false' && (
              <div className="glass-card" style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                  <div>
                    <div className="section-kicker">Devoluciones</div>
                    <h2 style={{ fontSize: '1.55rem', margin: '0.25rem 0 0', color: 'var(--text-primary)' }}>Tus pendientes activos</h2>
                  </div>
                  {misPrestamos.length > 1 ? (
                    <button
                      type="button"
                      className="modal-secondary-btn"
                      style={{ minWidth: '160px' }}
                      onClick={() => setReturnAllModalOpen(true)}
                    >
                      Devolver todo
                    </button>
                  ) : null}
                </div>
                {misPrestamos.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem 1rem', background: 'var(--surface-sunken)', borderRadius: '16px' }}>
                    <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🙌</span>
                    No tienes equipos por devolver. Todo esta en orden.
                  </div>
                ) : (
                  <div>
                    {misPrestamos.map(p => (
                      <div key={p.id} className="loan-card">
                        <div>
                          <div className="section-kicker" style={{ color: '#b45309', fontSize: '0.72rem', marginBottom: '0.35rem' }}>Pendiente por devolver</div>
                          <strong style={{ fontSize: '1.1rem', display: 'block', color: 'var(--text-primary)' }}>{p.nombre_equipo}</strong>
                          <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.15rem' }}>
                            Prestamo: {formatSqliteLoanDate(p.fecha_salida)}
                          </small>
                        </div>
                        <button onClick={() => handleDevolucion(p.id, p.equipo_id)} className="kiosk-btn-outline" style={{ minWidth: '138px' }}>
                          Devolver
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: New Loan */}
          {settings.kiosk_show_catalogo !== 'false' && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="inventory-toolbar">
                <div>
                  <div className="section-kicker">Catalogo de prestamo</div>
                  <h2 style={{ fontSize: '1.9rem', margin: '0.25rem 0 0.2rem' }}>Tomar equipo nuevo</h2>
                  <div className="muted-metric">Explora por categoria, filtra rapido y agrega al carrito con un solo toque.</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: '500px' }}>
                {/* Categories Sidebar */}
                <div style={{
                  flex: '0 0 240px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.8rem',
                  overflowY: 'auto',
                  paddingRight: '0.5rem'
                }}>
                  <button
                    type="button"
                    onClick={() => setCategoriaAndClearSearch(null)}
                    style={{
                      padding: '1rem 1.05rem',
                      fontSize: '1.1rem',
                      borderRadius: '18px',
                      border: selectedCategoriaId === null ? '1px solid rgba(37, 99, 235, 0.28)' : '1px solid rgba(148, 163, 184, 0.14)',
                      background: selectedCategoriaId === null ? 'rgba(37, 99, 235, 0.09)' : 'rgba(248, 250, 252, 0.95)',
                      color: selectedCategoriaId === null ? 'var(--brand-primary)' : 'var(--text-secondary)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      textAlign: 'left',
                      boxShadow: selectedCategoriaId === null ? '0 4px 12px rgba(37, 99, 235, 0.15)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    aria-pressed={selectedCategoriaId === null}
                    aria-label="Ver todos los equipos"
                    >
                      <span>Todas</span>
                    </button>
                  {categorias.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoriaAndClearSearch(c.id)}
                      style={{
                        padding: '1rem 1.05rem',
                        fontSize: '1.1rem',
                        borderRadius: '18px',
                        border: selectedCategoriaId === c.id ? '1px solid rgba(37, 99, 235, 0.28)' : '1px solid rgba(148, 163, 184, 0.14)',
                        background: selectedCategoriaId === c.id ? 'rgba(37, 99, 235, 0.09)' : 'rgba(248, 250, 252, 0.95)',
                        color: selectedCategoriaId === c.id ? 'var(--brand-primary)' : 'var(--text-secondary)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        textAlign: 'left',
                        boxShadow: selectedCategoriaId === c.id ? '0 4px 12px rgba(37, 99, 235, 0.15)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span>{c.nombre}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {allEquipos.filter((equipo) => equipo.categoria_id === c.id && isEquipoDisponible(equipo)).length}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Equipment Area */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div className="cart-shell" ref={cartRef}>
                    <div className={`cart-panel ${cartPulse > 0 ? 'pulse' : ''}`} key={cartPulse}>
                      <div className="cart-header">
                        <div>
                          <div style={{ color: 'var(--brand-primary)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.8rem' }}>
                            Carrito de prestamo
                          </div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            Seleccion actual
                          </div>
                        </div>
                        <div className="cart-count">{selectedEquipoIds.length}</div>
                      </div>
                      <div>
                        <div className="muted-metric" style={{ marginBottom: '0.45rem' }}>
                          {selectedEquipoIds.length === 0
                            ? 'Agrega equipos para avanzar a la confirmacion.'
                            : `${selectedEquipoIds.length} articulo(s) listos para confirmar`}
                        </div>
                        <div className="cart-progress-track">
                          <div className="cart-progress-fill" style={{ width: `${cartProgress}%` }} />
                        </div>
                      </div>

                      {selectedEquiposSummary.length === 0 ? (
                        <div className="cart-empty">
                          Selecciona equipos y apareceran aqui de forma inmediata.
                        </div>
                      ) : (
                        <div className="cart-items">
                          {selectedEquiposSummary.map(({ equipo }) => {
                              const cantidad = itemCantidades[equipo.id] ?? 1;
                              const isGranel = equipo.es_granel === 1;
                              const maxStock = equipo.stock_disponible ?? 1;
                              return (
                                <div key={`cart-${equipo.id}`} className="cart-item">
                                  <div>
                                    <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{equipo.nombre_equipo}</div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                                      <span>{equipo.categoria_nombre}</span>
                                      {autoAddedEquipoIds.includes(equipo.id) ? (
                                        <span style={{ color: '#15803d', fontWeight: 800 }}>Agregado automaticamente</span>
                                      ) : null}
                                    </div>
                                  </div>
                                  {isGranel ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (cantidad <= 1) {
                                            handleRemoveSelectedEquipo(equipo.id);
                                          } else {
                                            setItemCantidades((prev) => ({ ...prev, [equipo.id]: cantidad - 1 }));
                                            setSelectedEquipoIds((prev) => {
                                              const updated = [...prev];
                                              const idx = updated.indexOf(equipo.id);
                                              if (idx !== -1) updated.splice(idx, 1);
                                              return updated;
                                            });
                                          }
                                        }}
                                        style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1.5px solid #d1d5db', background: 'white', cursor: 'pointer', fontWeight: 800, fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}
                                      >
                                        −
                                      </button>
                                      <span style={{ fontWeight: 800, fontSize: '1rem', minWidth: '24px', textAlign: 'center' }}>{cantidad}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (cantidad < maxStock) {
                                            setItemCantidades((prev) => ({ ...prev, [equipo.id]: cantidad + 1 }));
                                            setSelectedEquipoIds((prev) => [...prev, equipo.id]);
                                          }
                                        }}
                                        disabled={cantidad >= maxStock}
                                        style={{ width: '28px', height: '28px', borderRadius: '8px', border: cantidad >= maxStock ? '1.5px solid #e5e7eb' : '1.5px solid #d1d5db', background: cantidad >= maxStock ? '#f3f4f6' : 'white', cursor: cantidad >= maxStock ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: cantidad >= maxStock ? '#9ca3af' : '#374151' }}
                                      >
                                        +
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="selection-pill">1</span>
                                  )}
                                  <button type="button" className="cart-item-remove" onClick={() => handleRemoveSelectedEquipo(equipo.id)}>
                                    Quitar
                                  </button>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>

                  <form onSubmit={handlePrestamo} style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flex: 1, minWidth: '320px', maxWidth: '720px' }}>
                      <input
                        type="text"
                        value={equipoSearchTerm}
                        onChange={(e) => setEquipoSearchTerm(e.target.value)}
                        placeholder="🔍 Buscar equipo por nombre, categoría o identificador..."
                        aria-label="Buscar equipo"
                        style={{
                          flex: 1,
                          minWidth: '240px',
                          margin: 0,
                          borderRadius: '16px',
                          border: '2px solid rgba(148, 163, 184, 0.18)',
                          background: 'rgba(255,255,255,0.95)',
                          fontSize: '1rem',
                          padding: '0.9rem 1rem',
                          boxShadow: '0 12px 24px rgba(15, 23, 42, 0.05)',
                          transition: 'box-shadow 180ms ease, border-color 180ms ease'
                        }}
                        onFocus={(e) => {
                          (e.target as HTMLInputElement).style.boxShadow = '0 8px 24px rgba(37, 99, 235, 0.14)';
                          (e.target as HTMLInputElement).style.borderColor = 'rgba(37, 99, 235, 0.6)';
                        }}
                        onBlur={(e) => {
                          (e.target as HTMLInputElement).style.boxShadow = '0 12px 24px rgba(15, 23, 42, 0.05)';
                          (e.target as HTMLInputElement).style.borderColor = 'rgba(148, 163, 184, 0.18)';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setEquipoSearchTerm("")}
                        title="Limpiar búsqueda"
                        style={{
                          padding: '0.65rem 0.9rem',
                          borderRadius: '12px',
                          border: '1px solid rgba(148,163,184,0.12)',
                          background: 'white',
                          cursor: 'pointer',
                          boxShadow: '0 8px 20px rgba(15,23,42,0.06)'
                        }}
                      >
                        Limpiar
                      </button>
                    </div>
                    <button
                      type="submit"
                      className="kiosk-btn-primary"
                      disabled={selectedEquipoIds.length === 0}
                      style={{ padding: '1rem 2rem', fontSize: '1.05rem', margin: 0, width: 'auto', minWidth: '240px' }}
                    >
                      Confirmar y Llevar {selectedEquipoIds.length > 0 ? `(${selectedEquipoIds.length})` : ''}
                    </button>
                  </form>

                  <div className="eq-grid">
                    {filteredEquipos.length === 0 ? (
                      <div style={{
                        gridColumn: '1 / -1',
                        textAlign: 'center',
                        color: 'var(--text-secondary)',
                        background: 'var(--surface-sunken)',
                        borderRadius: '14px',
                        padding: '2rem 1rem'
                      }}>
                        No se encontraron equipos con ese criterio.
                      </div>
                    ) : null}
                    {filteredEquipos.map(eq => {
                      const isGranel = eq.es_granel === 1;
                      const isAvail = isEquipoDisponible(eq);
                      const isSelected = selectedEquipoIds.includes(eq.id);
                      const selectedCount = selectedEquipoIds.filter((id) => id === eq.id).length;
                      const tone = getEquipoTone(eq);
                      return (
<button
                          key={eq.id}
                          type="button"
                          className={`eq-item ${isAvail ? 'available' : 'unavailable'} ${isSelected ? 'selected' : ''}`}
                          onClick={(event) => handleToggleEquipo(eq, event.currentTarget)}
                          disabled={!isAvail}
                          style={{ borderColor: isSelected ? tone.border : undefined }}
                          aria-pressed={isAvail ? isSelected : undefined}
                          aria-label={`${eq.nombre_equipo} de ${eq.categoria_nombre}. ${isAvail ? getEquipoSupportingText(eq) : 'No disponible'}${isSelected ? '. Ya seleccionado' : ''}`}
                        >
                          <div className="eq-card-top">
                            <span
                              className="eq-state-chip"
                              style={{ background: tone.surface, color: tone.text }}
                            >
                              {tone.label}
                            </span>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>
                              {eq.categoria_nombre}
                            </span>
                                <strong style={{ fontSize: '1.18rem', color: isAvail ? 'var(--text-primary)' : 'var(--text-secondary)', display: 'block', marginTop: '0.35rem', lineHeight: 1.25 }}>
                                  {eq.nombre_equipo}
                                </strong>
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.28rem' }}>Haz clic para agregar</div>
                          </div>
                          <div className="eq-support">
                            {getEquipoSupportingText(eq)}
                          </div>
                          <div className="eq-meta-row">
                            <span className="eq-tag">
                              {isGranel ? `${eq.stock_disponible}/${eq.stock_total} stock` : eq.estado}
                            </span>
                            {!isAvail && eq.prestamo_activo_profe ? (
                              <span className="selection-pill" style={{ background: 'rgba(14, 116, 144, 0.10)', color: '#155e75' }}>
                                Con: {eq.prestamo_activo_profe}
                              </span>
                            ) : null}
                            {selectedCount > 1 ? <span className="selection-pill">x{selectedCount} seleccionados</span> : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

        </section>
        </>
      )}

      {hdmiPromptEquipo ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="hdmi-modal-title">
          <div className="modal-card" style={{ width: 'min(620px, 100%)', textAlign: 'center' }}>
            <div>
              <div style={{ color: 'var(--brand-primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                Accesorio sugerido
              </div>
              <h3 id="hdmi-modal-title" style={{ margin: 0, fontSize: '1.8rem' }}>¿Tambien necesita HDMI?</h3>
            </div>
            <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto' }}>
              Se selecciono <strong style={{ color: 'var(--text-primary)' }}>{hdmiPromptEquipo.nombre_equipo}</strong>. Si tambien necesita HDMI, se agrega al prestamo ahora mismo.
            </div>
            <div className="modal-actions modal-actions-centered">
              <button type="button" className="modal-secondary-btn" style={{ minWidth: '140px' }} onClick={() => setHdmiPromptEquipo(null)}>
                Cancelar
              </button>
              <button type="button" className="modal-secondary-btn" style={{ minWidth: '140px' }} onClick={() => handleLaptopSelection(false)}>
                No, solo laptop
              </button>
              <button type="button" className="kiosk-btn-primary" style={{ width: 'auto', minWidth: '170px', padding: '0.9rem 1.4rem', fontSize: '1rem' }} onClick={() => handleLaptopSelection(true)}>
                Si, agregar HDMI
              </button>
            </div>
          </div>
        </div>
      ) : null}

{confirmModalOpen ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
          <div className="modal-card">
            <div>
              <div style={{ color: 'var(--brand-primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                Confirmar prestamo
              </div>
              <h3 id="confirm-modal-title" style={{ margin: 0, fontSize: '1.9rem' }}>Revisa lo que se va a registrar</h3>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }} role="list" aria-label="Equipos seleccionados">
              {selectedEquiposSummary.map(({ equipo, count }) => (
                <span key={`${equipo.id}-${count}`} className="selection-pill" role="listitem">
                  {equipo.nombre_equipo}{count > 1 ? ` x${count}` : ""}
                </span>
              ))}
            </div>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <label htmlFor="observaciones-modal" style={{ fontWeight: 700 }}>Observaciones del profesor</label>
              <textarea
                id="observaciones-modal"
                className="kiosk-textarea"
                value={observacionesEntrega}
                onChange={(e) => setObservacionesEntrega(e.target.value)}
                placeholder="Ej. No estaba este control, me llevo otro en su lugar."
                aria-describedby="observaciones-help"
              />
              <span id="observaciones-help" className="a11y-sr-only">Ingrese cualquier observación adicional sobre el préstamo.</span>
            </div>
            <div className="modal-actions">
              <button type="button" className="modal-secondary-btn" onClick={() => setConfirmModalOpen(false)}>
                Seguir editando
              </button>
              <button type="button" className="kiosk-btn-primary" style={{ width: 'auto', padding: '0.95rem 1.6rem', fontSize: '1rem' }} onClick={() => void handleConfirmPrestamo()}>
                Registrar prestamo
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {successModalOpen ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="success-modal-title" aria-live="polite">
          <div className="modal-card success-modal-card">
            <div className="success-hero">
              <div className="success-badge" aria-hidden="true">✓</div>
              <div style={{ color: '#15803d', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '0.9rem' }}>
                Prestamo creado con exito
              </div>
              <h3 id="success-modal-title" style={{ margin: 0, fontSize: '2.3rem', color: '#14532d', lineHeight: 1.05 }}>
                Registro confirmado
              </h3>
            </div>
            <div className="success-panel" role="status">
              El prestamo quedo guardado correctamente. Puedes registrar algo mas o cerrar la sesion del profesor actual.
              <br />
              <strong>Cuida bien tus equipos.</strong>
            </div>
            <div className="success-actions">
              <button
                type="button"
                className="success-secondary-btn"
                onClick={() => {
                  setSuccessModalOpen(false);
                  setStatusMessage("");
                }}
              >
                Registrar algo mas
              </button>
              <button
                type="button"
                className="kiosk-btn-primary success-primary-btn"
                onClick={handleLogout}
              >
                Cerrar sesion
              </button>
            </div>
            <div className="success-footer-note" role="status">
              La sesion sigue activa hasta que elijas una de estas opciones.
            </div>
          </div>
        </div>
      ) : null}

      {returnAllModalOpen ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="return-all-modal-title">
          <div className="modal-card" style={{ width: 'min(680px, 100%)' }}>
            <div>
              <div style={{ color: 'var(--brand-primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                Devolucion masiva
              </div>
              <h3 id="return-all-modal-title" style={{ margin: 0, fontSize: '1.9rem' }}>¿Seguro que tienes todas estas cosas?</h3>
            </div>
            <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Este proceso devolvera todos los prestamos activos del profesor actual para agilizar la entrega.
            </div>
            <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '320px', overflowY: 'auto', paddingRight: '0.25rem' }} role="list" aria-label="Equipos a devolver">
              {misPrestamos.map((prestamo) => (
                <div
                  key={`return-all-${prestamo.id}`}
                  role="listitem"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.9rem 1rem',
                    borderRadius: '14px',
                    background: 'var(--surface-sunken)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{prestamo.nombre_equipo}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
                      Prestamo: {formatSqliteLoanDate(prestamo.fecha_salida)}
                    </div>
                  </div>
                  <span className="selection-pill">#{prestamo.id}</span>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-secondary-btn"
                onClick={() => setReturnAllModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="kiosk-btn-primary"
                style={{ width: 'auto', minWidth: '220px', padding: '1rem 1.7rem', fontSize: '1rem' }}
                onClick={() => void handleDevolverTodo()}
              >
                Si, devolver todo
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {flyToCartItems.map((item) => (
        <div
          key={item.id}
          className="fly-token"
          style={
            {
              ["--start-x" as string]: item.startX,
              ["--start-y" as string]: item.startY,
              ["--end-x" as string]: item.endX,
              ["--end-y" as string]: item.endY,
            } as CSSProperties
          }
        >
          {item.label}
        </div>
      ))}
    </main>
  );
}
