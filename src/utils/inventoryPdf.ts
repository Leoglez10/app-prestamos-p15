import type { Equipo } from "../hooks/useInventory";
import { esPrestableEfectivo } from "./equipoFicha.ts";
import { html } from "./print.ts";

type InventoryPdfColumns = {
  includeIdentifier: boolean;
  includeCategory: boolean;
  includeLoanType: boolean;
  includeResponsible: boolean;
  includeStock: boolean;
};

/** Shared table for the inventory preview and the complete printed report. */
export const buildInventoryPdfTable = (
  filteredEquipos: Equipo[],
  inventarioPdf: InventoryPdfColumns,
  rowLimit?: number,
): string => {
  const sortedEquipos = [...filteredEquipos].sort((a, b) => a.id - b.id);
  const visibleEquipos = rowLimit ? sortedEquipos.slice(0, rowLimit) : sortedEquipos;

  const rows = visibleEquipos
    .map((eq) => {
      const columns = [
        `<td>${html(String(eq.id))}</td>`,
        // Mismo criterio que la tabla: con cientos de equipos llamados igual,
        // el identificador solo no distingue nada.
        `<td>${html(eq.nombre_equipo)}${
          inventarioPdf.includeIdentifier
            ? `<br /><span class="muted">${html(
                [eq.marca, eq.modelo, eq.identificador, eq.id_patrimonial].filter(Boolean).join(" · ") || "S/N"
              )}</span>`
            : ""
        }</td>`,
        inventarioPdf.includeCategory ? `<td>${html(eq.categoria_nombre)}</td>` : "",
        inventarioPdf.includeLoanType ? `<td>${html(esPrestableEfectivo(eq) ? "Prestable" : "Solo inventario")}</td>` : "",
        `<td>${html(eq.ubicacion || "-")}</td>`,
        `<td>${html(eq.estado)}</td>`,
        inventarioPdf.includeResponsible ? `<td>${html(eq.prestamo_activo_profe || "-")}</td>` : "",
        inventarioPdf.includeStock ? `<td>${html(eq.es_granel === 1 ? `${eq.stock_disponible}/${eq.stock_total}` : "1")}</td>` : "",
        `<td>${html(eq.observaciones || "-")}</td>`,
      ]
        .filter(Boolean)
        .join("");

      return `<tr>${columns}</tr>`;
    })
    .join("");

  const headerColumns = [
    "<th>ID</th>",
    "<th>Equipo</th>",
    inventarioPdf.includeCategory ? "<th>Categoría</th>" : "",
    inventarioPdf.includeLoanType ? "<th>Préstamo</th>" : "",
    "<th>Ubicación</th>",
    "<th>Estado</th>",
    inventarioPdf.includeResponsible ? "<th>Responsable actual</th>" : "",
    inventarioPdf.includeStock ? "<th>Stock</th>" : "",
    "<th>Observaciones</th>",
  ]
    .filter(Boolean)
    .join("");

  const truncatedNotice =
    rowLimit && filteredEquipos.length > rowLimit
      ? `<tr><td colspan="${headerColumns.split("<th>").length - 1}" class="muted">Vista previa: mostrando ${rowLimit} de ${filteredEquipos.length} equipos. El PDF incluye todos.</td></tr>`
      : "";

  return `<table>
        <thead><tr>${headerColumns}</tr></thead>
        <tbody>${rows}${truncatedNotice}</tbody>
      </table>`;
};
