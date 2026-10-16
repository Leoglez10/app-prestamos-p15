//! In-app problem reports.
//!
//! The POST lives in Rust, not in the webview, for one reason: the version and the
//! operating system are read from the process itself, so a report cannot lie about
//! them. The webview only supplies what the user typed.
//!
//! The request goes to a Cloudflare Worker that holds the GitHub token and opens the
//! issue. Shipping a token inside the binary was never an option. See `worker/README.md`.

/// Deployed Worker that holds the GitHub token. Redeploying keeps this URL; it only
/// changes if the Worker is renamed in `worker/wrangler.toml` (see `worker/README.md`).
const FEEDBACK_URL: &str = "https://prestamos-p15-feedback.leoeligr10.workers.dev/report";

/// Same bounds as the Worker, so bad input fails here instead of after a round trip.
fn validar(tipo: &str, titulo: &str, descripcion: &str) -> Result<(), String> {
    if tipo != "bug" && tipo != "sugerencia" {
        return Err("Elegí si es un problema o una sugerencia.".into());
    }
    if titulo.is_empty() || titulo.chars().count() > 120 {
        return Err("El título no puede quedar vacío ni pasar de 120 caracteres.".into());
    }
    if descripcion.is_empty() || descripcion.chars().count() > 4000 {
        return Err("La descripción no puede quedar vacía ni pasar de 4000 caracteres.".into());
    }
    Ok(())
}

#[tauri::command]
pub async fn reportar_problema(
    app: tauri::AppHandle,
    tipo: String,
    titulo: String,
    descripcion: String,
) -> Result<(), String> {
    let titulo = titulo.trim().to_string();
    let descripcion = descripcion.trim().to_string();
    validar(&tipo, &titulo, &descripcion)?;

    let version = app.package_info().version.to_string();
    let so = format!("{} {}", std::env::consts::OS, std::env::consts::ARCH);
    let cuerpo = serde_json::json!({
        "tipo": tipo,
        "titulo": titulo,
        "descripcion": descripcion,
        "version": version,
        "so": so,
    });

    let respuesta = reqwest::Client::new()
        .post(FEEDBACK_URL)
        .json(&cuerpo)
        .send()
        .await
        .map_err(|_| "No se pudo conectar. Revisá la conexión a Internet y volvé a intentar.".to_string())?;

    if respuesta.status().as_u16() == 429 {
        return Err("Enviaste varios reportes seguidos. Esperá un minuto y volvé a intentar.".into());
    }
    if !respuesta.status().is_success() {
        return Err("El servidor no aceptó el reporte. Volvé a intentar en un rato.".into());
    }
    Ok(())
}
