//! Escrituras por lote dentro de UNA transaccion real.
//!
//! Por que existe: `tauri-plugin-sql` abre un pool de 10 conexiones y cada
//! `db.execute()` toma una cualquiera. Mandar `BEGIN` por ahi abre la
//! transaccion en UNA conexion, y las escrituras siguientes salen por otras.
//! En cuanto el pool reusa la conexion de la transaccion, esa se queda con el
//! lock de escritura hasta el `COMMIT` y el resto muere con
//! "database is locked" (SQLite codigo 5). Eso es lo que reventaba al importar
//! el Excel de Patrimonio, que manda miles de sentencias de un golpe.
//!
//! Aca la transaccion vive en una sola conexion del mismo pool, asi que no hay
//! con quien competir.

use serde::Deserialize;
use sqlx::{Sqlite, Transaction};
use tauri::State;
use tauri_plugin_sql::{DbInstances, DbPool};

#[derive(Deserialize)]
pub struct Sentencia {
    sql: String,
    #[serde(default)]
    params: Vec<serde_json::Value>,
}

#[tauri::command]
pub async fn ejecutar_transaccion(
    db_instances: State<'_, DbInstances>,
    db: String,
    sentencias: Vec<Sentencia>,
) -> Result<u64, String> {
    let instancias = db_instances.0.read().await;
    // `DbPool::sqlite()` esta comentado en tauri-plugin-sql 2.4.0, asi que se
    // saca el pool de la variante directamente.
    let Some(DbPool::Sqlite(pool)) = instancias.get(&db) else {
        return Err(format!("La base de datos {db} no esta abierta."));
    };

    let mut tx: Transaction<'_, Sqlite> = pool.begin().await.map_err(|error| error.to_string())?;

    let mut afectadas = 0u64;
    for sentencia in &sentencias {
        let mut consulta = sqlx::query(&sentencia.sql);
        for valor in &sentencia.params {
            consulta = match valor {
                serde_json::Value::Null => consulta.bind(None::<String>),
                serde_json::Value::Bool(booleano) => consulta.bind(*booleano),
                // Los enteros se atan como enteros y no como f64 (que es lo que
                // hace el plugin): un `id` es un entero, no un 3.0.
                serde_json::Value::Number(numero) => match numero.as_i64() {
                    Some(entero) => consulta.bind(entero),
                    None => consulta.bind(numero.as_f64().unwrap_or_default()),
                },
                serde_json::Value::String(texto) => consulta.bind(texto.clone()),
                otro => consulta.bind(otro.to_string()),
            };
        }

        // Salir por `?` suelta `tx` sin commit, y sqlx hace ROLLBACK al dropearla:
        // no hace falta un `ROLLBACK` explicito que a su vez pueda fallar.
        let resultado = consulta
            .execute(&mut *tx)
            .await
            .map_err(|error| error.to_string())?;
        afectadas += resultado.rows_affected();
    }

    tx.commit().await.map_err(|error| error.to_string())?;
    Ok(afectadas)
}
