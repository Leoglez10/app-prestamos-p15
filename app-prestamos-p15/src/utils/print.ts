const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const html = (value: string | null | undefined): string => escapeHtml(value ?? "");

export const printHtmlDocument = (title: string, bodyContent: string): void => {
  const documentTitle = html(title);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-modals allow-same-origin allow-scripts");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  document.body.appendChild(iframe);

  const printDocument = iframe.contentWindow?.document;
  if (!printDocument || !iframe.contentWindow) {
    iframe.remove();
    throw new Error("No se pudo preparar la vista de impresión.");
  }

  printDocument.open();
  printDocument.write(`<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${documentTitle}</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #0f172a;
        --muted: #475569;
        --line: #cbd5e1;
        --panel: #f8fafc;
      }
      * {
        box-sizing: border-box;
      }
      html, body {
        margin: 0;
        padding: 0;
        font-family: "Segoe UI", Tahoma, sans-serif;
        color: var(--ink);
        background: #fff;
      }
      body {
        padding: 24px;
      }
      h1, h2, h3, p {
        margin: 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }
      th, td {
        padding: 8px;
        border-bottom: 1px solid var(--line);
        vertical-align: top;
        text-align: left;
      }
      th {
        border-bottom: 1px solid var(--ink);
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        border-bottom: 3px solid var(--ink);
        padding-bottom: 14px;
        margin-bottom: 14px;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .brand img {
        width: 64px;
        height: 64px;
        object-fit: contain;
      }
      .muted {
        color: var(--muted);
      }
      .summary {
        display: grid;
        gap: 10px;
        margin-bottom: 14px;
      }
      .summary.cols-4 {
        grid-template-columns: repeat(4, 1fr);
      }
      .summary.cols-5 {
        grid-template-columns: repeat(5, 1fr);
      }
      .card {
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 10px 12px;
        background: var(--panel);
      }
      .label {
        font-size: 11px;
        color: var(--muted);
        text-transform: uppercase;
      }
      .value {
        font-size: 18px;
        font-weight: 700;
      }
      .notes {
        margin-bottom: 14px;
        padding: 10px 12px;
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 10px;
        font-size: 12px;
        white-space: pre-wrap;
      }
      .meta {
        font-size: 12px;
        color: var(--muted);
        margin-bottom: 12px;
      }
      @media print {
        body {
          padding: 12mm;
        }
      }
    </style>
  </head>
  <body>
    ${bodyContent}
  </body>
</html>`);
  printDocument.close();

  const cleanup = () => {
    window.setTimeout(() => {
      iframe.remove();
    }, 500);
  };

  iframe.onload = () => {
    window.setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      cleanup();
    }, 250);
  };
};
