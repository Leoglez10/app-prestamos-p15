use serde::Serialize;
use std::{
    fs,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
struct BackupInfo {
    file_name: String,
    backup_path: String,
    created_epoch: u64,
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

#[tauri::command]
fn get_database_url(app: AppHandle) -> Result<String, String> {
    ensure_app_data_root(&app)?;
    let db_path = database_path(&app)?;
    let normalized_path = db_path.to_string_lossy().replace('\\', "/");
    Ok(format!("sqlite:{normalized_path}"))
}

#[tauri::command]
fn create_backup(app: AppHandle) -> Result<BackupInfo, String> {
    let db_path = database_path(&app)?;
    if !db_path.exists() {
        return Err(format!(
            "No se encontro la base de datos en {}",
            db_path.display()
        ));
    }
    let root = app_data_root(&app)?;
    let backups_dir = root.join("backups");
    fs::create_dir_all(&backups_dir)
        .map_err(|error| format!("No se pudo crear el directorio de respaldos: {error}"))?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("No se pudo calcular el timestamp del respaldo: {error}"))?
        .as_secs();

    let file_name = format!("prestamos-backup-{timestamp}.db");
    let backup_path = backups_dir.join(&file_name);

    fs::copy(&db_path, &backup_path)
        .map_err(|error| format!("No se pudo crear el respaldo: {error}"))?;

    Ok(BackupInfo {
        file_name,
        backup_path: backup_path.display().to_string(),
        created_epoch: timestamp,
    })
}

#[tauri::command]
fn list_backups(app: AppHandle) -> Result<Vec<BackupInfo>, String> {
    let root = app_data_root(&app)?;
    let backups_dir = root.join("backups");
    if !backups_dir.exists() {
        return Ok(Vec::new());
    }

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

        backups.push(BackupInfo {
            file_name: entry.file_name().to_string_lossy().to_string(),
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

    let backups_dir = root.join("backups");
    fs::create_dir_all(&backups_dir)
        .map_err(|error| format!("No se pudo preparar el directorio de respaldos: {error}"))?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("No se pudo calcular el timestamp de restauracion: {error}"))?
        .as_secs();

    let safety_backup_name = format!("prestamos-pre-restore-{timestamp}.db");
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

    let _ = fs::remove_file(&temp_restore_path);

    Ok(RestoreBackupResult {
        restored_file_name: file_name,
        backup_path: safety_backup_path.display().to_string(),
        restored_at_epoch: timestamp,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_database_url,
            create_backup,
            list_backups,
            restore_backup_from_bytes
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
