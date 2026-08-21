/**
 * EXPERIMENT — printable QR labels, one per equipment item.
 *
 * The label carries only the item's code (`P15-42`), never the server address:
 * that address changes on its own and would turn every printed sheet into
 * garbage. See docs/QR_CELULAR.md.
 */
import { useMemo, useState } from "react";
import qrcode from "qrcode-generator";
import { html, buildPrintDocument, printHtmlDocument } from "../utils/print";
import { codigoDeEquipo } from "../utils/etiquetaQr";
import type { Equipo } from "../hooks/useInventory";

type Props = {
  equipos: Equipo[];
};

export const qrComoImagen = (texto: string): string => {
  // Error correction H survives a scuffed or partly peeled sticker.
  const qr = qrcode(0, "H");
  qr.addData(texto);
  qr.make();

  return qr.createDataURL(4, 0);
};

export const construirHoja = (equipos: Equipo[]): string => {
  if (equipos.length === 0) {
    return "<p>No hay equipos para etiquetar.</p>";
  }

  const etiquetas = equipos
    .map((equipo) => {
      const codigo = codigoDeEquipo(equipo.id);
      const detalle = equipo.identificador ?? equipo.categoria_nombre;

      return `<div class="etiqueta">
        <img src="${qrComoImagen(codigo)}" alt="Código ${html(codigo)}" />
        <div class="datos">
          <strong>${html(equipo.nombre_equipo)}</strong>
          <span>${html(detalle)}</span>
          <code>${html(codigo)}</code>
        </div>
      </div>`;
    })
    .join("");

  return `<style>
    /* Two columns of stickers that survive a cheap office printer. */
    .hoja { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .etiqueta {
      display: flex; align-items: center; gap: 10px;
      border: 1px dashed var(--line); border-radius: 6px; padding: 8px;
      /* Never split a sticker across two sheets. */
      break-inside: avoid; page-break-inside: avoid;
    }
    .etiqueta img { width: 92px; height: 92px; image-rendering: pixelated; }
    .datos { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .datos strong { font-size: 13px; }
    .datos span { font-size: 11px; color: var(--muted); }
    .datos code { font-size: 12px; letter-spacing: .04em; }
  </style>
  <div class="hoja">${etiquetas}</div>`;
};

export function EtiquetasQrPanel({ equipos }: Props) {
  const [previa, setPrevia] = useState("");

  // Building every QR is not free, so it only happens when the list changes.
  const cuerpo = useMemo(() => construirHoja(equipos), [equipos]);

  const titulo = "Etiquetas QR de equipos";

  return (
    <>
      <button
        type="button"
        className="ghost"
        onClick={() => setPrevia(buildPrintDocument(titulo, cuerpo))}
        style={{ width: "auto", padding: "0.75rem 1rem" }}
      >
        Etiquetas QR ({equipos.length})
      </button>

      {previa ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.55)",
            display: "grid",
            placeItems: "center",
            padding: "2rem",
            zIndex: 50
          }}
        >
          <div className="panel" style={{ width: "min(900px, 100%)", display: "grid", gap: "0.8rem" }}>
            <div>
              <h3 style={{ margin: 0 }}>{titulo}</h3>
              <small style={{ color: "var(--text-secondary)" }}>
                Cada etiqueta lleva solo el código del equipo. La dirección del servidor cambia
                sola, así que nunca se imprime: el celular ya la sabe.
              </small>
            </div>
            <iframe
              title="Vista previa de las etiquetas"
              srcDoc={previa}
              sandbox=""
              style={{
                width: "100%",
                height: "50vh",
                border: "1px solid var(--border-subtle)",
                borderRadius: "10px",
                background: "white"
              }}
            />
            <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="ghost"
                onClick={() => setPrevia("")}
                style={{ width: "auto", padding: "0.6rem 1rem" }}
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => printHtmlDocument(titulo, cuerpo)}
                style={{ width: "auto", padding: "0.6rem 1rem" }}
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
