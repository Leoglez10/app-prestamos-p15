mod celular;
mod certificado;
mod patrimonio;

use chrono::Local;
use serde::Serialize;
use std::{
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;

/// Backups created by the scheduled job. These are the only ones pruned automatically.
const AUTO_BACKUP_PREFIX: &str = "prestamos-auto-";
/// Backups the user asked for explicitly. Never pruned.
const MANUAL_BACKUP_PREFIX: &str = "prestamos-backup-";
/// Safety copy taken right before a restore overwrites the live database. Never pruned.
const PRE_RESTORE_BACKUP_PREFIX: &str = "prestamos-pre-restore-";
/// How many automatic backups to keep before deleting the oldest ones.
const AUTO_BACKUP_KEEP: usize = 20;
/// Local timestamp format used in backup file names. Sorts chronologically as plain text.
const BACKUP_TIMESTAMP_FORMAT: &str = "%Y-%m-%d_%H-%M-%S";

#[derive(Serialize)]
struct BackupInfo {
    file_name: String,
    backup_path: String,
    created_epoch: u64,
    /// "auto" | "manual" | "pre-restore" | "otro"
    kind: String,
}

#[derive(Serialize)]
struct RestoreBackupResult {
    restored_file_name: String,
    backup_path: String,
    restored_at_epoch: u64,
}

fn app_data_root(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map_err(|error| format!("No se pudo resolver el directorio de datos de la app: {error}"))
}

fn database_path(app: &AppHandle) -> Result<PathBuf, String> {
    let root = app_data_root(app)?;
    let db_path = root.join("prestamos.db");
    Ok(db_path)
}

fn ensure_app_data_root(app: &AppHandle) -> Result<PathBuf, String> {
    let root = app_data_root(app)?;
    fs::create_dir_all(&root)
        .map_err(|error| format!("No se pudo preparar el directorio de datos de la app: {error}"))?;
    Ok(root)
}

fn backups_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app_data_root(app)?.join("backups");
    fs::create_dir_all(&dir)
        .map_err(|error| format!("No se pudo preparar el directorio de respaldos: {error}"))?;
    Ok(dir)
}

fn backup_kind(file_name: &str) -> &'static str {
    if file_name.starts_with(AUTO_BACKUP_PREFIX) {
        "auto"
    } else if file_name.starts_with(PRE_RESTORE_BACKUP_PREFIX) {
        "pre-restore"
    } else if file_name.starts_with(MANUAL_BACKUP_PREFIX) {
        "manual"
    } else {
        "otro"
    }
}

/// Keep only the newest AUTO_BACKUP_KEEP automatic backups.
///
/// Manual and pre-restore backups are deliberate user actions and are never deleted here.
/// File names embed a sortable timestamp, so sorting by name sorts by date.
fn prune_auto_backups(dir: &Path) {
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };

    let mut auto_backups: Vec<PathBuf> = entries
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| {
            path.extension().and_then(|value| value.to_str()) == Some("db")
                && path
                    .file_name()
                    .and_then(|value| value.to_str())
                    .is_some_and(|name| name.starts_with(AUTO_BACKUP_PREFIX))
        })
        .collect();

    if auto_backups.len() <= AUTO_BACKUP_KEEP {
        return;
    }

    auto_backups.sort();
    let excess = auto_backups.len() - AUTO_BACKUP_KEEP;
    for path in auto_backups.iter().take(excess) {
        let _ = fs::remove_file(path);
    }
}

#[tauri::command]
fn get_database_url(app: AppHandle) -> Result<String, String> {
    ensure_app_data_root(&app)?;
    let db_path = database_path(&app)?;
    let normalized_path = db_path.to_string_lossy().replace('\\', "/");
    Ok(format!("sqlite:{normalized_path}"))
}

/// Copy the live database into the backups folder.
///
/// The caller must checkpoint the WAL before invoking this (see `createBackup` in
/// `src/hooks/useInventory.ts`); otherwise recent transactions still sitting in the
/// `-wal` file would be missing from the copy.
#[tauri::command]
fn create_backup(app: AppHandle, auto: Option<bool>) -> Result<BackupInfo, String> {
    let db_path = database_path(&app)?;
    if !db_path.exists() {
        return Err(format!(
            "No se encontro la base de datos en {}",
            db_path.display()
        ));
    }
    let backups_dir = backups_dir(&app)?;

    let now = Local::now();
    let prefix = if auto.unwrap_or(false) {
        AUTO_BACKUP_PREFIX
    } else {
        MANUAL_BACKUP_PREFIX
    };

    let file_name = format!("{prefix}{}.db", now.format(BACKUP_TIMESTAMP_FORMAT));
    let backup_path = backups_dir.join(&file_name);

    fs::copy(&db_path, &backup_path)
        .map_err(|error| format!("No se pudo crear el respaldo: {error}"))?;

    prune_auto_backups(&backups_dir);

    Ok(BackupInfo {
        kind: backup_kind(&file_name).to_string(),
        file_name,
        backup_path: backup_path.display().to_string(),
        created_epoch: now.timestamp().max(0) as u64,
    })
}

/// Guarda el reporte de la toma fisica y abre la carpeta, para que el usuario
/// pueda mandarselo a Patrimonio.
///
/// Va junto a los respaldos y no en Descargas: es la carpeta que el usuario ya
/// conoce de esta app, y `open_backups_dir` ya le enseño el camino.
#[tauri::command]
fn guardar_reporte_inventario(app: AppHandle, nombre: String, contenido: String) -> Result<String, String> {
    // El nombre lo arma la app, pero igual se recorta a su ultimo componente:
    // un `..` o una barra escribirian fuera de la carpeta.
    let nombre_seguro = Path::new(&nombre)
        .file_name()
        .and_then(|parte| parte.to_str())
        .ok_or_else(|| "Nombre de archivo invalido.".to_string())?;

    let dir = app_data_root(&app)?.join("reportes");
    fs::create_dir_all(&dir)
        .map_err(|error| format!("No se pudo preparar el directorio de reportes: {error}"))?;

    let destino = dir.join(nombre_seguro);
    fs::write(&destino, contenido)
        .map_err(|error| format!("No se pudo escribir el reporte: {error}"))?;

    let _ = app.opener().open_path(dir.display().to_string(), None::<&str>);

    Ok(destino.display().to_string())
}

/// Open the backups folder in the system file explorer so the user can copy files out.
#[tauri::command]
fn open_backups_dir(app: AppHandle) -> Result<String, String> {
    let dir = backups_dir(&app)?;
    let dir_display = dir.display().to_string();
    app.opener()
        .open_path(dir_display.clone(), None::<&str>)
        .map_err(|error| format!("No se pudo abrir la carpeta de respaldos: {error}"))?;
    Ok(dir_display)
}

#[tauri::command]
fn list_backups(app: AppHandle) -> Result<Vec<BackupInfo>, String> {
    let backups_dir = backups_dir(&app)?;

    let mut backups = Vec::new();
    let entries = fs::read_dir(&backups_dir)
        .map_err(|error| format!("No se pudo leer el directorio de respaldos: {error}"))?;

    for entry in entries {
        let entry = entry.map_err(|error| format!("No se pudo leer un respaldo: {error}"))?;
        let path = entry.path();
        if path.extension().and_then(|value| value.to_str()) != Some("db") {
            continue;
        }

        let metadata = entry
            .metadata()
            .map_err(|error| format!("No se pudo leer metadatos del respaldo: {error}"))?;

        let created_epoch = metadata
            .modified()
            .ok()
            .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
            .map(|value| value.as_secs())
            .unwrap_or(0);

        let file_name = entry.file_name().to_string_lossy().to_string();
        backups.push(BackupInfo {
            kind: backup_kind(&file_name).to_string(),
            file_name,
            backup_path: path.display().to_string(),
            created_epoch,
        });
    }

    backups.sort_by(|left, right| right.created_epoch.cmp(&left.created_epoch));
    Ok(backups)
}

#[tauri::command]
fn restore_backup_from_bytes(
    app: AppHandle,
    file_name: String,
    bytes: Vec<u8>,
) -> Result<RestoreBackupResult, String> {
    if bytes.len() < 16 {
        return Err("El archivo seleccionado es demasiado pequeno para ser un respaldo SQLite valido.".into());
    }

    if &bytes[..16] != b"SQLite format 3\0" {
        return Err("El archivo seleccionado no parece ser una base SQLite valida.".into());
    }

    let db_path = database_path(&app)?;
    let root = app_data_root(&app)?;
    fs::create_dir_all(&root)
        .map_err(|error| format!("No se pudo preparar el directorio de datos de la app: {error}"))?;

    let backups_dir = backups_dir(&app)?;

    let now = Local::now();
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("No se pudo calcular el timestamp de restauracion: {error}"))?
        .as_secs();

    let safety_backup_name = format!(
        "{PRE_RESTORE_BACKUP_PREFIX}{}.db",
        now.format(BACKUP_TIMESTAMP_FORMAT)
    );
    let safety_backup_path = backups_dir.join(&safety_backup_name);

    if db_path.exists() {
        fs::copy(&db_path, &safety_backup_path).map_err(|error| {
            format!(
                "No se pudo crear el respaldo de seguridad antes de restaurar: {error}"
            )
        })?;
    }

    let temp_restore_path = root.join(format!("prestamos.restore-{timestamp}.tmp"));
    fs::write(&temp_restore_path, &bytes)
        .map_err(|error| format!("No se pudo escribir el archivo temporal de restauracion: {error}"))?;

    fs::copy(&temp_restore_path, &db_path)
        .map_err(|error| format!("No se pudo restaurar la base de datos seleccionada: {error}"))?;

    // IMPORTANT: SQLite uses Write-Ahead Logging (WAL). When we overwrite the database, 
    // we MUST delete any existing -wal and -shm files, or else SQLite will apply the 
    // previous database's pending transactions onto the newly imported one.
    let wal_path = db_path.with_extension("db-wal");
    let shm_path = db_path.with_extension("db-shm");
    let _ = fs::remove_file(&wal_path);
    let _ = fs::remove_file(&shm_path);

    let _ = fs::remove_file(&temp_restore_path);

    Ok(RestoreBackupResult {
        restored_file_name: file_name,
        backup_path: safety_backup_path.display().to_string(),
        restored_at_epoch: timestamp,
    })
}

/// Links a phone to a teacher and returns its token once, so the caller can turn
/// it into a QR. The token is never retrievable again: only its hash is stored.
#[tauri::command]
async fn celular_registrar_dispositivo(
    app: AppHandle,
    profesor_id: i64,
    etiqueta: String,
) -> Result<String, String> {
    let db_path = database_path(&app)?;
    celular::registrar_dispositivo(&db_path, profesor_id, etiqueta.trim()).await
}

#[tauri::command]
fn local_ip() -> Result<String, String> {
    // A UDP "connect" sends no packets. It only asks the OS which local interface
    // would be used to reach the target, which is the LAN address a phone on the
    // same network has to dial. No extra crate needed for this.
    // ponytail: this fails when the machine has no default route; the UI falls back
    // to asking the admin to read the address from System Settings.
    let socket = std::net::UdpSocket::bind("0.0.0.0:0")
        .map_err(|error| format!("No se pudo abrir un socket local: {error}"))?;
    socket
        .connect("8.8.8.8:80")
        .map_err(|error| format!("No se pudo determinar la interfaz de red activa: {error}"))?;
    let address = socket
        .local_addr()
        .map_err(|error| format!("No se pudo leer la direccion local: {error}"))?;

    Ok(address.ip().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // The phone server is optional: if it cannot start, the desktop app
            // must keep working, so failures are logged inside `iniciar`.
            match (database_path(&app.handle()), ensure_app_data_root(&app.handle())) {
                (Ok(db_path), Ok(carpeta)) => celular::iniciar(db_path, carpeta),
                (Err(error), _) | (_, Err(error)) => {
                    eprintln!("[celular] sin ruta de datos: {error}")
                }
            }
            Ok(())
        })
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_database_url,
            create_backup,
            list_backups,
            open_backups_dir,
            restore_backup_from_bytes,
            local_ip,
            celular_registrar_dispositivo,
            patrimonio::leer_excel_patrimonio,
            guardar_reporte_inventario
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
