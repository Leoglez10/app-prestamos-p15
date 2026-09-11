// Receives reports from the desktop app and opens a GitHub issue with a bot token,
// so the app's users never need a GitHub account.
//
// ponytail: the Worker URL ships inside the app binary, so anyone who unpacks it can
// POST here directly. Per-IP rate limiting mitigates spam; it does not eliminate it.
// If it ever gets abused, the next step is a shared secret or signed requests.

const REPO = "Leoglez10/app-prestamos-p15";
const LABELS = { bug: ["bug"], sugerencia: ["enhancement"] };

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

// Keeps a value on a single line so it cannot forge extra footer lines or markup.
const oneLine = (value) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 60);

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    // No CORS: the client is a Rust process, not a browser.
    if (request.method !== "POST" || pathname !== "/report") return json(404, { error: "No encontrado" });

    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const { success } = await env.RATE_LIMITER.limit({ key: ip });
    if (!success) return json(429, { error: "Demasiados reportes seguidos. Espera un minuto." });

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json(400, { error: "Cuerpo inválido" });
    }

    // Never trust the client: the same bounds are enforced in the app, but only this side counts.
    const tipo = payload?.tipo;
    const titulo = String(payload?.titulo ?? "").trim();
    const descripcion = String(payload?.descripcion ?? "").trim();
    if (tipo !== "bug" && tipo !== "sugerencia") return json(400, { error: "Tipo inválido" });
    if (!titulo || titulo.length > 120) return json(400, { error: "Título inválido" });
    if (!descripcion || descripcion.length > 4000) return json(400, { error: "Descripción inválida" });
    if (String(payload?.version ?? "").length > 60 || String(payload?.so ?? "").length > 60) {
      return json(400, { error: "Metadatos inválidos" });
    }

    // User text first, footer last: a report can add text but never rewrite the footer.
    const version = oneLine(payload?.version) || "desconocida";
    const so = oneLine(payload?.so) || "desconocido";
    const body = `${descripcion}\n\n---\nReportado desde la app · Versión: ${version} · Sistema: ${so}`;

    const response = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        // GitHub rejects API requests without a User-Agent.
        "User-Agent": "app-prestamos-p15-feedback",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ title: titulo, body, labels: LABELS[tipo] }),
    });
    // Never echo GitHub's response: it can carry token or repository detail.
    if (!response.ok) return json(502, { error: "No se pudo registrar el reporte" });

    return json(200, { ok: true });
  },
};
