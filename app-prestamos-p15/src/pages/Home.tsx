import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";
import logoP15 from "../../img/logo-p15.png";
import { getEquipos, type Equipo } from "../hooks/useInventory";
import { formatSqliteDateTime, formatSqliteLoanDate } from "../utils/datetime";
import { html, printHtmlDocument } from "../utils/print";

type StatKey = "disponibles" | "enPrestamo" | "fueraDeServicio";

type StatItem = {
  id: number;
  nombre: string;
  detalle: string;
  cantidad: number;
};

type StatBucket = {
  total: number;
  items: StatItem[];
};

type HomeStats = Record<StatKey, StatBucket>;

const OUT_OF_SERVICE = new Set(["mantenimiento", "extraviado"]);

const emptyBucket = (): StatBucket => ({ total: 0, items: [] });

const push = (bucket: StatBucket, equipo: Equipo, cantidad: number, detalle: string) => {
  if (cantidad <= 0) {
    return;
  }
  bucket.total += cantidad;
  bucket.items.push({ id: equipo.id, nombre: equipo.nombre_equipo, detalle, cantidad });
};

const summarizeEquipos = (equipos: Equipo[]): HomeStats => {
  const stats: HomeStats = {
    disponibles: emptyBucket(),
    enPrestamo: emptyBucket(),
    fueraDeServicio: emptyBucket(),
  };

  for (const equipo of equipos) {
    const total = Math.max(equipo.stock_total ?? 1, 0);
    const libres = Math.min(Math.max(equipo.stock_disponible ?? 0, 0), total);
    const estado = (equipo.estado ?? "").toLowerCase();
    const categoria = equipo.categoria_nombre || "Sin categoría";

    if (OUT_OF_SERVICE.has(estado)) {
      push(stats.fueraDeServicio, equipo, total, `${categoria} · ${estado}`);
      continue;
    }

    const responsable = equipo.prestamo_activo_profe?.trim();
    const desde = equipo.prestamo_activo_fecha
      ? formatSqliteLoanDate(equipo.prestamo_activo_fecha)
      : null;
    const detallePrestamo =
      [responsable, desde && `desde ${desde}`].filter(Boolean).join(" · ") || categoria;
    push(stats.enPrestamo, equipo, total - libres, detallePrestamo);

    if (equipo.es_prestable && (equipo.categoria_es_prestable ?? 1)) {
      push(stats.disponibles, equipo, libres, equipo.identificador?.trim() || categoria);
    }
  }

  return stats;
};

const STAT_META: Array<{ key: StatKey; label: string; tone: string; vacio: string }> = [
  { key: "disponibles", label: "Disponibles", tone: "is-ok", vacio: "No hay equipo disponible ahora mismo." },
  { key: "enPrestamo", label: "En préstamo", tone: "is-busy", vacio: "No hay equipo prestado." },
  { key: "fueraDeServicio", label: "Fuera de servicio", tone: "is-down", vacio: "Todo el equipo está en servicio." },
];

const buildStatPdfBody = (
  meta: (typeof STAT_META)[number],
  bucket: StatBucket,
  logoSrc: string,
): string => {
  const rows = bucket.items
    .map(
      (item) => `<tr>
        <td>${html(item.nombre)}</td>
        <td class="muted">${html(item.detalle)}</td>
        <td>${html(String(item.cantidad))}</td>
      </tr>`,
    )
    .join("");

  const table = rows
    ? `<table>
        <thead><tr><th>Equipo</th><th>Detalle</th><th>Cantidad</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`
    : `<p class="muted">${html(meta.vacio)}</p>`;

  return `
    <div class="header">
      <div class="brand">
        <img src="${logoSrc}" alt="P15" />
        <div>
          <h1>${html(meta.label)}</h1>
          <div class="muted">Estado del inventario · Preparatoria Quince</div>
        </div>
      </div>
      <div style="text-align:right;font-size:12px;">
        <div><strong>Generado:</strong> ${html(formatSqliteDateTime(new Date().toISOString()))}</div>
        <div><strong>Total:</strong> ${html(String(bucket.total))}</div>
      </div>
    </div>
    ${table}
  `;
};

const IconCap = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 9 12 4 2 9l10 5 10-5Z" />
    <path d="M6 11.4V17c0 1.2 2.7 3 6 3s6-1.8 6-3v-5.6" />
    <path d="M22 9v6.5" />
  </svg>
);

const IconBox = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 8.5v7a1.8 1.8 0 0 1-.95 1.6l-7 3.7a1.8 1.8 0 0 1-1.7 0l-7-3.7A1.8 1.8 0 0 1 3 15.5v-7a1.8 1.8 0 0 1 .95-1.6l7-3.7a1.8 1.8 0 0 1 1.7 0l7 3.7A1.8 1.8 0 0 1 21 8.5Z" />
    <path d="m3.3 7.6 8.7 4.6 8.7-4.6" />
    <path d="M12 21.3v-9.1" />
  </svg>
);

const IconGear = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.7 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.7 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.7a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.7a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.3 9v.03a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
  </svg>
);

const IconChevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 15 6-6 6 6" />
  </svg>
);

const IconArrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

export default function Home() {
  const [now, setNow] = useState(() => new Date());
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [openStat, setOpenStat] = useState<StatKey | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      try {
        const equipos = await getEquipos();
        if (!cancelled) {
          setStats(summarizeEquipos(equipos));
        }
      } catch {
        // ponytail: sin base de datos (modo navegador) la tira de métricas se oculta y la navegación sigue funcionando.
        if (!cancelled) {
          setStats(null);
          setOpenStat(null);
        }
      }
    };

    void loadStats();
    const timer = window.setInterval(() => void loadStats(), 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <main className="home-main">
      <header className="home-topbar">
        <div className="home-brand">
          <img src={logoP15} alt="" className="home-brand-logo" />
          <span className="home-brand-name">Preparatoria Quince</span>
        </div>

        <div className="home-topbar-right">
          <div className="home-clock">
            <span className="home-clock-time">
              {now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="home-clock-date">
              {now.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
            </span>
          </div>

          <Link to="/admin" className="home-admin-link">
            <span className="home-admin-icon"><IconGear /></span>
            Administrador
          </Link>
        </div>
      </header>

      <section className="home-hero">
        <p className="home-eyebrow">Sistema de préstamos P15</p>
        <h1 className="home-title">¿Qué necesitas hacer?</h1>
      </section>

      <nav className="home-actions" aria-label="Acciones principales">
        <Link to="/kiosko" className="home-card home-card-primary">
          <span className="home-card-icon"><IconCap /></span>
          <span className="home-card-body">
            <span className="home-card-title">Soy Profesor</span>
            <span className="home-card-text">
              Presta y devuelve equipo con tu código UDG. Consulta lo que tienes pendiente.
            </span>
          </span>
          <span className="home-card-arrow"><IconArrow /></span>
        </Link>

        <Link to="/prestamo-rapido" className="home-card home-card-secondary">
          <span className="home-card-icon"><IconBox /></span>
          <span className="home-card-body">
            <span className="home-card-title">Préstamo Rápido</span>
            <span className="home-card-text">
              Registro de préstamos a alumnos. Requiere código administrativo.
            </span>
          </span>
          <span className="home-card-arrow"><IconArrow /></span>
        </Link>
      </nav>

      {stats && (
        <section
          className="home-stats"
          aria-label="Estado del inventario"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpenStat(null);
            }
          }}
        >
          <div className="home-stats-row">
            {STAT_META.map(({ key, label, tone }) => {
              const isOpen = openStat === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={`home-stat ${tone}${isOpen ? " is-open" : ""}`}
                  aria-expanded={isOpen}
                  aria-controls="home-stat-panel"
                  onClick={() => setOpenStat(isOpen ? null : key)}
                >
                  <span className="home-stat-dot" aria-hidden="true" />
                  <strong className="home-stat-value">{stats[key].total}</strong>
                  <span className="home-stat-label">{label}</span>
                  <span className={`home-stat-chevron${isOpen ? " is-open" : ""}`} aria-hidden="true">
                    <IconChevron />
                  </span>
                </button>
              );
            })}
          </div>

          {openStat && (
            <>
            <div className="home-stat-panel-head">
              <span className="home-stat-panel-title">
                {STAT_META.find((meta) => meta.key === openStat)?.label}
              </span>
              <button
                type="button"
                className="home-stat-pdf"
                onClick={() => {
                  const meta = STAT_META.find((item) => item.key === openStat);
                  if (!meta) {
                    return;
                  }
                  printHtmlDocument(
                    `${meta.label} P15`,
                    buildStatPdfBody(meta, stats[openStat], logoP15),
                  );
                }}
              >
                Generar PDF
              </button>
            </div>
            <div className="home-stat-panel" id="home-stat-panel">
              {stats[openStat].items.length === 0 ? (
                <p className="home-stat-empty">
                  {STAT_META.find((meta) => meta.key === openStat)?.vacio}
                </p>
              ) : (
                <ul className="home-stat-list">
                  {stats[openStat].items.map((item) => (
                    <li key={item.id} className="home-stat-item">
                      <span className="home-stat-item-name">{item.nombre}</span>
                      <span className="home-stat-item-detail">{item.detalle}</span>
                      {item.cantidad > 1 && (
                        <span className="home-stat-item-qty">×{item.cantidad}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            </>
          )}
        </section>
      )}
    </main>
  );
}
