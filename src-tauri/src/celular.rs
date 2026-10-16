//! HTTP server that lets a phone on the same network reach this machine.
//!
//! Design notes live in `docs/QR_CELULAR.md`. Two constraints shape this module:
//!
//! 1. The address of this machine changes, so nothing printed may contain it.
//! 2. This serves plain HTTP, so the desktop admin PIN must never travel over the
//!    wire. A phone authenticates with its own revocable token instead, and losing
//!    that token never costs more than the phone's own access.
//!
//! The token reaches the phone through the QR shown in the admin panel. The first
//! request carries it in the query string; the server then moves it into a cookie
//! and redirects, so the token stops appearing in the address bar and in history.

use std::path::{Path, PathBuf};
use std::thread;

use sha2::{Digest, Sha256};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;
use tiny_http::{Header, Request, Response, Server};

/// Kept in sync by hand with `PUERTO_CELULAR` in `src/components/RedCelularPanel.tsx`.
pub const PUERTO: u16 = 8080;

/// HTTPS lives on its own port because the camera needs a secure context:
/// `getUserMedia` is blocked on plain HTTP, so the live scanner only works here.
/// Kept in sync by hand with `PUERTO_SEGURO` in `src/components/RedCelularPanel.tsx`.
pub const PUERTO_SEGURO: u16 = 8443;

const NOMBRE_COOKIE: &str = "p15_celular";

/// A token is 32 random bytes. Guessing one is not a threat worth rate limiting.
const BYTES_TOKEN: usize = 32;

pub struct Sesion {
    /// Loans are keyed by `codigo_profe`, not by id, so both travel in the session.
    pub codigo: String,
    pub nombre: String,
    /// Un admin ve y devuelve los prestamos de todos, no solo los suyos: es quien
    /// camina recogiendo equipo. Sale de `profesores.es_admin`, no de nada que el
    /// telefono pueda decir de si mismo.
    ///
    /// Esto le da al telefono autoridad sobre prestamos ajenos. El PIN de
    /// administrador sigue sin salir de la computadora, pero un telefono perdido
    /// hay que revocarlo desde Admin.
    pub es_admin: bool,
}

fn huella(token: &str) -> String {
    hex::encode(Sha256::digest(token.as_bytes()))
}

/// Only the hash is stored, so a leaked copy of the database does not hand over
/// working tokens.
pub fn generar_token_aleatorio() -> Result<String, String> {
    let mut bytes = [0u8; BYTES_TOKEN];
    getrandom::fill(&mut bytes)
        .map_err(|error| format!("No se pudo generar un token seguro: {error}"))?;

    Ok(hex::encode(bytes))
}

async fn abrir_pool(db_path: &Path) -> Result<SqlitePool, String> {
    // read_only would be nicer, but the server has to stamp ultimo_uso.
    let opciones = SqliteConnectOptions::new()
        .filename(db_path)
        .create_if_missing(false)
        // The webview writes to this same file, so both sides need WAL and a
        // busy timeout or one of them will see SQLITE_BUSY under load.
        .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
        .busy_timeout(std::time::Duration::from_secs(5));

    SqlitePoolOptions::new()
        .max_connections(4)
        .connect_with(opciones)
        .await
        .map_err(|error| format!("No se pudo abrir la base de datos: {error}"))
}

/// Registers a phone for a teacher and returns the token in clear text. This is
/// the only moment the clear-text token exists, so the caller has to show it (as
/// a QR) right away.
pub async fn registrar_dispositivo(
    db_path: &Path,
    profesor_id: i64,
    etiqueta: &str,
) -> Result<String, String> {
    let pool = abrir_pool(db_path).await?;
    let token = generar_token_aleatorio()?;

    sqlx::query(
        "INSERT INTO celular_dispositivos (profesor_id, token_hash, etiqueta) VALUES (?, ?, ?)",
    )
    .bind(profesor_id)
    .bind(huella(&token))
    .bind(etiqueta)
    .execute(&pool)
    .await
    .map_err(|error| format!("No se pudo registrar el dispositivo: {error}"))?;

    pool.close().await;

    Ok(token)
}

async fn autorizar(pool: &SqlitePool, token: &str) -> Option<Sesion> {
    let (codigo, nombre, es_admin) = sqlx::query_as::<_, (String, String, i64)>(
        "SELECT p.codigo, p.nombre, COALESCE(p.es_admin, 0)
           FROM celular_dispositivos d
           JOIN profesores p ON p.id = d.profesor_id
          WHERE d.token_hash = ? AND d.revocado_en IS NULL
          LIMIT 1",
    )
    .bind(huella(token))
    .fetch_optional(pool)
    .await
    .ok()
    .flatten()?;

    // Best effort: a failed timestamp update must not deny a valid session.
    let _ = sqlx::query(
        "UPDATE celular_dispositivos SET ultimo_uso = CURRENT_TIMESTAMP WHERE token_hash = ?",
    )
    .bind(huella(token))
    .execute(pool)
    .await;

    Some(Sesion {
        codigo,
        nombre,
        es_admin: es_admin == 1,
    })
}

// --- Operaciones sobre el inventario -----------------------------------------
//
// Reglas copiadas de `createPrestamoRapido` y `devolverEquipo` en
// `src/hooks/useInventory.ts`. Si allá cambian, acá también.

pub struct Equipo {
    pub id: i64,
    pub nombre: String,
    pub identificador: Option<String>,
    pub categoria: String,
    pub es_granel: i64,
    pub disponibles: i64,
    pub prestable: bool,
}

pub struct PrestamoActivo {
    pub id: i64,
    pub nombre_equipo: String,
    pub fecha_salida: String,
    /// Sin esto, dos prestamos del mismo equipo se ven identicos en la lista y no
    /// hay forma de saber cual devolver.
    pub identificador: Option<String>,
    pub categoria: String,
    /// Quien lo tiene. Solo se muestra en la vista de admin: en la de un profesor
    /// siempre seria su propio nombre repetido en cada tarjeta.
    pub profesor: String,
}

/// Local time in the exact shape the rest of the app writes
/// (`getCurrentLocalDateTime` in `useInventory.ts`). Writing UTC here would break
/// the ordering of every report, since those compare these strings directly.
fn ahora_local() -> String {
    chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
}

const MESES: [&str; 12] = [
    "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic",
];

/// Convierte `2026-08-21 15:24:07` en algo que se lee de un vistazo.
///
/// La base guarda hora local en ese formato fijo (ver `ahora_local`), asi que se
/// interpreta como local, no como UTC.
fn fecha_legible(fecha: &str) -> String {
    let Ok(momento) = chrono::NaiveDateTime::parse_from_str(fecha, "%Y-%m-%d %H:%M:%S") else {
        // Si el formato no es el esperado, mostrar el crudo es mejor que mentir.
        return fecha.to_string();
    };

    let ahora = chrono::Local::now().naive_local();
    let minutos = (ahora - momento).num_minutes();

    let hora = {
        let hora24 = momento.time().format("%H").to_string().parse::<u32>().unwrap_or(0);
        let minuto = momento.time().format("%M").to_string();
        let (hora12, sufijo) = match hora24 {
            0 => (12, "a.m."),
            1..=11 => (hora24, "a.m."),
            12 => (12, "p.m."),
            _ => (hora24 - 12, "p.m."),
        };
        format!("{hora12}:{minuto} {sufijo}")
    };

    let dia_de = |fecha: chrono::NaiveDate| {
        use chrono::Datelike;
        format!("{} {}", fecha.day(), MESES[(fecha.month() - 1) as usize])
    };

    let hoy = ahora.date();
    let dia = momento.date();

    if minutos < 1 {
        "recién".to_string()
    } else if minutos < 60 {
        format!("hace {minutos} min")
    } else if dia == hoy {
        format!("hoy, {hora}")
    } else if dia == hoy.pred_opt().unwrap_or(hoy) {
        format!("ayer, {hora}")
    } else {
        use chrono::Datelike;
        if dia.year() == hoy.year() {
            dia_de(dia)
        } else {
            format!("{} {}", dia_de(dia), dia.year())
        }
    }
}

async fn listar_equipos(pool: &SqlitePool) -> Result<Vec<Equipo>, String> {
    sqlx::query_as::<_, (i64, String, Option<String>, String, i64, i64, i64)>(
        "SELECT i.id,
                i.nombre_equipo,
                i.identificador,
                c.nombre,
                COALESCE(i.es_granel, 0),
                COALESCE(i.stock_total, 1) - (
                    SELECT COUNT(*) FROM prestamos p
                     WHERE p.equipo_id = i.id AND p.estado_prestamo = 'activo'
                ),
                CASE WHEN COALESCE(i.es_prestable, 1) = 1
                      AND COALESCE(c.es_prestable, 1) = 1
                     AND (COALESCE(i.es_granel, 0) = 1 OR i.estado = 'disponible')
                     THEN 1 ELSE 0 END
           FROM inventario i
           JOIN categorias c ON c.id = i.categoria_id
          ORDER BY c.nombre, i.nombre_equipo",
    )
    .fetch_all(pool)
    .await
    .map_err(|error| format!("No se pudo leer el inventario: {error}"))
    .map(|filas| {
        filas
            .into_iter()
            .map(
                |(id, nombre, identificador, categoria, es_granel, disponibles, prestable)| Equipo {
                    id,
                    nombre,
                    identificador,
                    categoria,
                    es_granel,
                    disponibles,
                    prestable: prestable == 1,
                },
            )
            .collect()
    })
}

async fn listar_prestamos(
    pool: &SqlitePool,
    sesion: &Sesion,
) -> Result<Vec<PrestamoActivo>, String> {
    sqlx::query_as::<_, (i64, String, String, Option<String>, String, String)>(
        // El primer parametro es `es_admin`: cuando vale 1 la condicion del codigo
        // se cumple sola y la lista deja de estar recortada al dueno.
        "SELECT p.id, i.nombre_equipo, p.fecha_salida, i.identificador, c.nombre,
                COALESCE(NULLIF(TRIM(p.nombre_profe), ''), p.codigo_profe)
           FROM prestamos p
           JOIN inventario i ON i.id = p.equipo_id
           JOIN categorias c ON c.id = i.categoria_id
          WHERE p.estado_prestamo = 'activo' AND (? = 1 OR p.codigo_profe = ?)
          ORDER BY p.fecha_salida DESC",
    )
    .bind(i64::from(sesion.es_admin))
    .bind(&sesion.codigo)
    .fetch_all(pool)
    .await
    .map_err(|error| format!("No se pudieron leer los préstamos: {error}"))
    .map(|filas| {
        filas
            .into_iter()
            .map(
                |(id, nombre_equipo, fecha_salida, identificador, categoria, profesor)| {
                    PrestamoActivo {
                        id,
                        nombre_equipo,
                        fecha_salida,
                        identificador,
                        categoria,
                        profesor,
                    }
                },
            )
            .collect()
    })
}

/// Registers a loan.
///
/// The whole check-then-write runs inside `BEGIN IMMEDIATE`. The desktop app
/// writes to this same file, so a plain deferred transaction would let two
/// clients both read "one left" and both take it. `IMMEDIATE` takes the write
/// lock up front, which is what makes the stock check mean anything.
async fn prestar(pool: &SqlitePool, sesion: &Sesion, equipo_id: i64) -> Result<String, String> {
    let mut conexion = pool
        .acquire()
        .await
        .map_err(|error| format!("No se pudo abrir una conexión: {error}"))?;

    sqlx::query("BEGIN IMMEDIATE")
        .execute(&mut *conexion)
        .await
        .map_err(|error| format!("La base está ocupada, intenta de nuevo: {error}"))?;

    let resultado = prestar_dentro_de_transaccion(&mut conexion, sesion, equipo_id).await;

    let cierre = if resultado.is_ok() { "COMMIT" } else { "ROLLBACK" };
    let _ = sqlx::query(cierre).execute(&mut *conexion).await;

    resultado
}

async fn prestar_dentro_de_transaccion(
    conexion: &mut sqlx::SqliteConnection,
    sesion: &Sesion,
    equipo_id: i64,
) -> Result<String, String> {
    let fila = sqlx::query_as::<_, (String, i64, i64, i64, i64, i64)>(
        "SELECT i.nombre_equipo,
                i.estado = 'disponible',
                COALESCE(i.es_granel, 0),
                COALESCE(i.es_prestable, 1),
                COALESCE(c.es_prestable, 1),
                COALESCE(i.stock_total, 1) - (
                    SELECT COUNT(*) FROM prestamos p
                     WHERE p.equipo_id = i.id AND p.estado_prestamo = 'activo'
                )
           FROM inventario i
           JOIN categorias c ON c.id = i.categoria_id
          WHERE i.id = ?",
    )
    .bind(equipo_id)
    .fetch_optional(&mut *conexion)
    .await
    .map_err(|error| format!("No se pudo consultar el equipo: {error}"))?;

    let (nombre, disponible, es_granel, prestable, categoria_prestable, stock) =
        fila.ok_or_else(|| "Ese equipo no existe.".to_string())?;

    if prestable != 1 || categoria_prestable != 1 {
        return Err(format!("{nombre} está marcado como no prestable."));
    }

    if es_granel == 1 {
        if stock < 1 {
            return Err(format!("No quedan unidades disponibles de {nombre}."));
        }
    } else if disponible != 1 {
        return Err(format!("{nombre} no está disponible ahora mismo."));
    }

    sqlx::query(
        "INSERT INTO prestamos (equipo_id, codigo_profe, nombre_profe, fecha_salida, estado_prestamo)
         VALUES (?, ?, ?, ?, 'activo')",
    )
    .bind(equipo_id)
    .bind(&sesion.codigo)
    .bind(&sesion.nombre)
    .bind(ahora_local())
    .execute(&mut *conexion)
    .await
    .map_err(|error| format!("No se pudo registrar el préstamo: {error}"))?;

    // A bulk item stays 'disponible' forever: its availability is derived from
    // the count of active loans, not from this column.
    if es_granel != 1 {
        sqlx::query("UPDATE inventario SET estado = 'prestado' WHERE id = ?")
            .bind(equipo_id)
            .execute(&mut *conexion)
            .await
            .map_err(|error| format!("No se pudo actualizar el equipo: {error}"))?;
    }

    Ok(nombre)
}

/// Returns a loan. Scoped to the session's own loans on purpose: a phone must not
/// be able to close somebody else's loan by guessing an id.
/// Condiciones que puede reportar el telefono. `bien` es la unica que deja el
/// equipo listo para prestarse otra vez.
const CONDICIONES: [(&str, &str, &str); 3] = [
    ("bien", "Bien", "Sin novedad, listo para prestarse otra vez"),
    ("detalle", "Con detalle", "Sirve, pero algo hay que anotar"),
    ("danado", "Dañado", "Pasa a mantenimiento, no se presta"),
];

/// Traduce la clave del formulario a lo que se guarda.
///
/// Se guarda la etiqueta legible, no la clave, porque `condicion_regreso` es texto
/// libre que los reportes imprimen tal cual: el escritorio ya escribe ahi frases
/// como "Devuelto por Admin". Guardar `danado` haria que el PDF dijera "danado".
fn etiqueta_condicion(clave: &str) -> Option<&'static str> {
    CONDICIONES
        .iter()
        .find(|(candidata, _, _)| *candidata == clave)
        .map(|(_, titulo, _)| *titulo)
}

/// Tope de lo que se acepta guardar. El telefono ya reduce antes de subir; esto
/// es la red de seguridad contra un cliente que no lo haga.
const TOPE_FOTO: usize = 400 * 1024;

/// Decodifica base64 sin traer un crate: son 64 simbolos y cuatro lineas.
fn desde_base64(texto: &str) -> Option<Vec<u8>> {
    const ALFABETO: &[u8; 64] =
        b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    let mut acumulador: u32 = 0;
    let mut bits = 0u32;
    let mut salida = Vec::with_capacity(texto.len() / 4 * 3);

    for simbolo in texto.bytes() {
        if simbolo == b'=' || simbolo.is_ascii_whitespace() {
            continue;
        }

        let valor = ALFABETO.iter().position(|c| *c == simbolo)? as u32;
        acumulador = (acumulador << 6) | valor;
        bits += 6;

        if bits >= 8 {
            bits -= 8;
            salida.push((acumulador >> bits) as u8);
        }
    }

    Some(salida)
}

/// Valida un `data:image/jpeg;base64,...` tal como lo arma el telefono y devuelve
/// el mismo texto listo para guardar.
///
/// Se guarda el data URL entero, no los bytes: el telefono ya lo manda asi y un
/// `<img src>` lo consume directo, sin reconvertir nada de un lado ni del otro.
/// Los bytes se decodifican igual, para medir el peso de verdad y confirmar que
/// es base64 valido y no cualquier texto.
fn foto_desde_data_url(valor: &str) -> Result<Option<String>, String> {
    let valor = valor.trim();
    if valor.is_empty() {
        return Ok(None);
    }

    let (cabecera, datos) = valor
        .strip_prefix("data:")
        .and_then(|resto| resto.split_once(";base64,"))
        .ok_or_else(|| "La foto no llegó en un formato que se pueda guardar.".to_string())?;

    if !cabecera.starts_with("image/") {
        return Err("Solo se pueden adjuntar imágenes.".to_string());
    }

    let bytes = desde_base64(datos).ok_or_else(|| "La foto llegó dañada.".to_string())?;

    if bytes.is_empty() {
        return Ok(None);
    }

    if bytes.len() > TOPE_FOTO {
        return Err(format!(
            "La foto pesa {} KB y el límite son {} KB.",
            bytes.len() / 1024,
            TOPE_FOTO / 1024
        ));
    }

    Ok(Some(valor.to_string()))
}

async fn devolver(
    pool: &SqlitePool,
    sesion: &Sesion,
    prestamo_id: i64,
    condicion: &str,
    nota: &str,
    foto: &str,
) -> Result<String, String> {
    let fila = sqlx::query_as::<_, (i64, String, i64)>(
        "SELECT p.equipo_id, i.nombre_equipo, COALESCE(i.es_granel, 0)
           FROM prestamos p
           JOIN inventario i ON i.id = p.equipo_id
          WHERE p.id = ? AND p.estado_prestamo = 'activo'
            AND (? = 1 OR p.codigo_profe = ?)",
    )
    .bind(prestamo_id)
    .bind(i64::from(sesion.es_admin))
    .bind(&sesion.codigo)
    .fetch_optional(pool)
    .await
    .map_err(|error| format!("No se pudo consultar el préstamo: {error}"))?;

    // Un admin llega hasta cualquier prestamo, asi que para el la unica causa
    // posible es que ya se haya devuelto.
    let (equipo_id, nombre, es_granel) = fila.ok_or_else(|| {
        if sesion.es_admin {
            "Ese préstamo ya no está activo.".to_string()
        } else {
            "Ese préstamo no existe o no es tuyo.".to_string()
        }
    })?;

    let Some(etiqueta) = etiqueta_condicion(condicion) else {
        return Err("Elige en qué condición regresa el equipo.".to_string());
    };

    // Se valida antes de escribir nada: si la foto no sirve, la devolución no se
    // registra a medias.
    let adjunto = foto_desde_data_url(foto)?;

    sqlx::query(
        "UPDATE prestamos
            SET estado_prestamo = 'devuelto', fecha_retorno = ?,
                condicion_regreso = ?, notas_regreso = ?
          WHERE id = ?",
    )
    .bind(ahora_local())
    .bind(etiqueta)
    .bind(nota.trim())
    .bind(prestamo_id)
    .execute(pool)
    .await
    .map_err(|error| format!("No se pudo registrar la devolución: {error}"))?;

    if let Some(imagen) = adjunto {
        sqlx::query(
            "INSERT INTO fotos_regreso (prestamo_id, imagen) VALUES (?, ?)
             ON CONFLICT(prestamo_id) DO UPDATE SET imagen = excluded.imagen",
        )
        .bind(prestamo_id)
        .bind(imagen)
        .execute(pool)
        .await
        .map_err(|error| format!("No se pudo guardar la foto: {error}"))?;
    }

    // Un equipo danado no vuelve al catalogo: pasa a mantenimiento y deja de
    // ofrecerse. Uno a granel no lleva estado propio, asi que ahi no aplica.
    if es_granel != 1 {
        let estado = if condicion == "danado" {
            "mantenimiento"
        } else {
            "disponible"
        };

        sqlx::query("UPDATE inventario SET estado = ? WHERE id = ?")
            .bind(estado)
            .bind(equipo_id)
            .execute(pool)
            .await
            .map_err(|error| format!("No se pudo actualizar el equipo: {error}"))?;
    }

    Ok(nombre)
}

fn token_de_query(url: &str) -> Option<String> {
    let (_, query) = url.split_once('?')?;
    query
        .split('&')
        .find_map(|par| par.strip_prefix("t="))
        .map(|valor| valor.to_string())
}

fn token_de_cookie(request: &Request) -> Option<String> {
    let cookies = request
        .headers()
        .iter()
        .find(|header| header.field.equiv("Cookie"))?
        .value
        .as_str()
        .to_string();

    cookies.split(';').find_map(|par| {
        par.trim()
            .strip_prefix(&format!("{NOMBRE_COOKIE}="))
            .map(|valor| valor.to_string())
    })
}

fn header(nombre: &str, valor: &str) -> Header {
    // Both sides are literals from this module, so this cannot fail in practice.
    Header::from_bytes(nombre.as_bytes(), valor.as_bytes())
        .expect("cabecera invalida escrita en el codigo")
}

/// Los valores vienen de `src/App.css`, para que el telefono se vea parte de la
/// misma app y no de otra cosa. Si alla cambian los tokens, aca tambien.
fn pagina(titulo: &str, cuerpo: &str) -> String {
    pagina_con_clase(titulo, cuerpo, "")
}

fn pagina_con_clase(titulo: &str, cuerpo: &str, clase: &str) -> String {
    format!(
        r#"<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light">
<title>{titulo}</title>
<style>
  :root {{
    --fondo: #F0F4F8;
    --superficie: #FFFFFF;
    --hundido: #E2E8F0;
    --borde: #CBD5E1;
    --tinta: #0F172A;
    --tinta-suave: #475569;
    --marca: #2563EB;
    --exito: #059669;
    --peligro: #DC2626;
    --aviso: #D97706;
  }}
  * {{ box-sizing: border-box; }}
  /* Sin !important, un `display` de autor (.boton usa inline-flex) le gana al
     display:none que el navegador aplica por el atributo hidden, y el elemento
     se pinta igual. */
  [hidden] {{ display: none !important; }}
  body {{
    margin: 0;
    font-family: "Bahnschrift", "Segoe UI Variable", "Trebuchet MS", sans-serif;
    background: var(--fondo);
    color: var(--tinta);
    -webkit-font-smoothing: antialiased;
    /* viewport-fit + safe-area evita que el notch y la barra de gestos tapen contenido. */
    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  }}
  main {{ max-width: 34rem; margin: 0 auto; padding: 20px 16px 28px;
          min-height: 100dvh; display: flex; flex-direction: column; }}
  a {{ color: var(--marca); text-decoration: none; }}
  a:hover {{ color: #1D4ED8; }}
  h1 {{ margin: 0; font-size: 1.65rem; font-weight: 700; letter-spacing: -0.015em; }}
  h2 {{ margin: 0; font-size: .8rem; font-weight: 700; letter-spacing: .07em;
        text-transform: uppercase; color: var(--tinta-suave); }}
  p {{ margin: 0; line-height: 1.55; color: var(--tinta-suave); }}
  .crecer {{ flex-grow: 1; }}
  .fila-sup {{ display: flex; align-items: baseline; justify-content: space-between;
               gap: 1rem; margin-bottom: 1.35rem; }}
  .quien {{ font-size: .82rem; color: var(--tinta-suave); }}

  /* 44px es el minimo comodo para un pulgar; la accion principal va mas grande. */
  button, .boton {{
    display: inline-flex; align-items: center; justify-content: center; gap: .55rem;
    min-height: 44px; padding: .7rem 1.1rem; border: none; border-radius: 12px;
    background: var(--marca); color: #fff; font-family: inherit; font-size: 1rem;
    font-weight: 600; text-decoration: none; cursor: pointer;
  }}
  .principal {{ width: 100%; min-height: 68px; border-radius: 16px; font-size: 1.12rem;
                font-weight: 700; box-shadow: 0 6px 16px rgba(37,99,235,.28); }}
  .secundario {{ background: var(--superficie); color: var(--tinta);
                 border: 1px solid var(--borde); font-weight: 600; }}
  .devolver {{ background: var(--superficie); color: var(--exito);
               border: 1.5px solid var(--exito); font-weight: 700; }}
  .confirmar {{ width: 100%; min-height: 62px; border-radius: 16px; font-size: 1.12rem;
                font-weight: 700; background: var(--exito);
                box-shadow: 0 6px 16px rgba(5,150,105,.26); }}
  form {{ margin: 0; }}

  .tarjeta {{ background: var(--superficie); border-radius: 16px; padding: 14px;
              box-shadow: 0 1px 3px rgba(15,23,42,.07); }}
  .lista {{ display: flex; flex-direction: column; gap: 10px; }}
  .prestamo {{ display: flex; align-items: center; gap: 12px; }}
  .prestamo > div {{ flex: 1; display: flex; flex-direction: column; gap: 5px; min-width: 0; }}
  .titulo-obj {{ font-size: 1.06rem; font-weight: 700; }}
  .meta {{ display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
           font-size: .82rem; color: var(--tinta-suave); }}
  .chip {{ font-size: .75rem; padding: 2px 7px; border-radius: 6px;
           background: var(--hundido); color: var(--tinta-suave); }}
  .chip.codigo {{ font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }}
  .conteo {{ min-width: 24px; height: 24px; padding: 0 8px; border-radius: 12px;
             background: var(--hundido); font-size: .82rem; font-weight: 700;
             display: inline-flex; align-items: center; justify-content: center; }}
  .estado {{ display: inline-flex; align-items: center; gap: 6px; font-size: .85rem;
             font-weight: 700; padding: 4px 10px; border-radius: 8px; }}
  .estado.si {{ background: #ECFDF5; color: var(--exito); }}
  .estado.no {{ background: #FEF2F2; color: var(--peligro); }}
  .punto {{ width: 8px; height: 8px; border-radius: 50%; background: currentColor; }}
  .aviso {{ background: #EEF2FF; border-left: 4px solid var(--marca);
            padding: .8rem 1rem; border-radius: 10px; color: var(--tinta); line-height: 1.5; }}
  .aviso.malo {{ background: #FEF2F2; border-left-color: var(--peligro); }}
  .vacio {{ color: #8B8F9A; }}
  .separa {{ border: none; border-top: 1px solid var(--borde); margin: 1.6rem 0 1.1rem; }}
  .movimiento {{ display: flex; justify-content: space-between; align-items: baseline;
                 gap: 1rem; padding: 11px 0; border-bottom: 1px solid var(--hundido);
                 font-size: .92rem; }}
  .movimiento span:last-child {{ color: var(--tinta-suave); white-space: nowrap; }}

  .opcion {{ display: flex; align-items: center; gap: 12px; background: var(--superficie);
             border: 1px solid var(--borde); border-radius: 14px; padding: 15px;
             cursor: pointer; }}
  .opcion input {{ appearance: none; width: 22px; height: 22px; margin: 0; flex-shrink: 0;
                   border: 2px solid var(--borde); border-radius: 50%; }}
  .opcion:has(input:checked) {{ border: 2px solid var(--exito); padding: 14px; }}
  .opcion input:checked {{ border-color: var(--exito); background: var(--exito);
                           box-shadow: inset 0 0 0 4px var(--superficie); }}
  .opcion span {{ display: flex; flex-direction: column; gap: 2px; }}
  .opcion strong {{ font-size: 1.06rem; }}
  .opcion small {{ font-size: .85rem; color: var(--tinta-suave); }}
  textarea {{ width: 100%; min-height: 92px; border: 1px solid var(--borde);
              border-radius: 12px; padding: 13px; font-family: inherit; font-size: 1rem;
              color: var(--tinta); background: var(--superficie); resize: none; }}

</style>
</head>
<body class="{clase}"><main>{cuerpo}</main></body>
</html>"#
    )
}

fn responder_html(request: Request, codigo: u16, html: String, cookie: Option<&str>) {
    let mut respuesta = Response::from_string(html)
        .with_status_code(codigo)
        .with_header(header("Content-Type", "text/html; charset=utf-8"));

    if let Some(token) = cookie {
        // HttpOnly keeps the token out of reach of any script on the page.
        // Secure is deliberately absent: over plain HTTP it would void the cookie.
        respuesta = respuesta.with_header(header(
            "Set-Cookie",
            &format!("{NOMBRE_COOKIE}={token}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Strict"),
        ));
    }

    let _ = request.respond(respuesta);
}

fn redirigir_a_raiz(request: Request, token: &str) {
    let respuesta = Response::from_string("")
        .with_status_code(302)
        .with_header(header("Location", "/"))
        .with_header(header(
            "Set-Cookie",
            &format!("{NOMBRE_COOKIE}={token}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Strict"),
        ));

    let _ = request.respond(respuesta);
}

fn atender(request: Request, pool: &SqlitePool, ca_pem: &str) {
    let url = request.url().to_string();

    // Liveness probe for the admin panel. Unauthenticated on purpose: it says
    // nothing beyond "a server is here", which anyone scanning the port sees anyway.
    // The phone needs this before it can trust HTTPS at all, so it cannot sit
    // behind the token. A CA's public certificate is not a secret.
    if url.starts_with("/ca.crt") {
        let respuesta = Response::from_string(ca_pem.to_string())
            .with_header(header("Content-Type", "application/x-x509-ca-cert"))
            .with_header(header(
                "Content-Disposition",
                "attachment; filename=\"prestamos-p15.crt\"",
            ));
        let _ = request.respond(respuesta);
        return;
    }

    if url.starts_with("/salud") {
        let respuesta = Response::from_string("{\"ok\":true}")
            .with_header(header("Content-Type", "application/json"))
            .with_header(header("Access-Control-Allow-Origin", "*"));
        let _ = request.respond(respuesta);
        return;
    }

    // A token in the query string means the phone just scanned the QR. Move it
    // into a cookie and redirect so it stops showing up in the address bar.
    if let Some(token) = token_de_query(&url) {
        let valido = tauri::async_runtime::block_on(autorizar(pool, &token)).is_some();
        if valido {
            redirigir_a_raiz(request, &token);
        } else {
            responder_html(request, 401, pagina_rechazo(), None);
        }
        return;
    }

    let sesion = token_de_cookie(&request)
        .and_then(|token| tauri::async_runtime::block_on(autorizar(pool, &token)));

    match sesion {
        Some(sesion) => atender_autenticado(request, pool, sesion),
        None => responder_html(request, 401, pagina_rechazo(), None),
    }
}

// --- Formularios --------------------------------------------------------------

/// Minimal `application/x-www-form-urlencoded` decoding. Only what these forms
/// send: no multipart, no nested keys.
fn decodificar(valor: &str) -> String {
    let bytes = valor.as_bytes();
    let mut salida: Vec<u8> = Vec::with_capacity(bytes.len());
    let mut indice = 0;

    while indice < bytes.len() {
        match bytes[indice] {
            b'+' => {
                salida.push(b' ');
                indice += 1;
            }
            b'%' if indice + 2 < bytes.len() => {
                match u8::from_str_radix(&valor[indice + 1..indice + 3], 16) {
                    Ok(byte) => {
                        salida.push(byte);
                        indice += 3;
                    }
                    Err(_) => {
                        salida.push(bytes[indice]);
                        indice += 1;
                    }
                }
            }
            otro => {
                salida.push(otro);
                indice += 1;
            }
        }
    }

    String::from_utf8_lossy(&salida).into_owned()
}

fn leer_campo(cuerpo: &str, campo: &str) -> Option<String> {
    cuerpo
        .split('&')
        .find_map(|par| par.strip_prefix(&format!("{campo}=")))
        .map(decodificar)
}

// --- Pantallas ----------------------------------------------------------------

/// Etiqueta corta que distingue un equipo de otro igual en la lista.
fn distintivo(identificador: &Option<String>, categoria: &str) -> String {
    identificador
        .as_deref()
        .filter(|valor| !valor.trim().is_empty())
        .map(|valor| format!("<span class=\"chip codigo\">{}</span>", escapar(valor)))
        .unwrap_or_else(|| format!("<span class=\"chip\">{}</span>", escapar(categoria)))
}

fn pagina_principal(sesion: &Sesion, prestamos: &[PrestamoActivo], aviso: Option<&str>) -> String {
    let mut cuerpo = format!(
        "<div class=\"fila-sup\"><h1>Préstamos P15</h1>\
         <span class=\"quien\">{}</span></div>",
        escapar(&sesion.nombre)
    );

    if let Some(texto) = aviso {
        cuerpo.push_str(&format!(
            "<p class=\"aviso\" style=\"margin-bottom:1rem\">{}</p>",
            escapar(texto)
        ));
    }

    // Un admin esta viendo el equipo de toda la prepa, no el suyo: el titulo tiene
    // que decirlo o parece que la lista esta mal.
    let (titulo_lista, sin_nada) = if sesion.es_admin {
        ("Prestado ahora", "No hay nada prestado en este momento.")
    } else {
        ("Tienes prestado", "No tienes nada prestado.")
    };

    cuerpo.push_str(&format!(
        "<div class=\"fila-sup\" style=\"margin:1.9rem 0 .75rem\">\
           <h2>{}</h2><span class=\"conteo\">{}</span></div>",
        titulo_lista,
        prestamos.len()
    ));

    if prestamos.is_empty() {
        cuerpo.push_str(&format!("<p class=\"vacio\">{sin_nada}</p>"));
    } else {
        cuerpo.push_str("<div class=\"lista\">");
        for prestamo in prestamos {
            // En la vista de un profesor el nombre seria el suyo en cada tarjeta.
            let quien = if sesion.es_admin {
                format!("<span>{}</span>", escapar(&prestamo.profesor))
            } else {
                String::new()
            };

            cuerpo.push_str(&format!(
                "<div class=\"tarjeta prestamo\">\
                   <div>\
                     <span class=\"titulo-obj\">{}</span>\
                     <span class=\"meta\">{}{}<span>Desde {}</span></span>\
                   </div>\
                   <a class=\"boton devolver\" href=\"/devolver/{}\">Devolver</a>\
                 </div>",
                escapar(&prestamo.nombre_equipo),
                distintivo(&prestamo.identificador, &prestamo.categoria),
                quien,
                escapar(&fecha_legible(&prestamo.fecha_salida)),
                prestamo.id
            ));
        }
        cuerpo.push_str("</div>");
    }

    cuerpo.push_str(
        "<div class=\"crecer\"></div>\
         <a class=\"boton secundario\" style=\"width:100%;min-height:52px;border-radius:14px\" href=\"/equipos\">\
           Ver todo el inventario\
         </a>",
    );

    pagina("Préstamos P15", &cuerpo)
}

fn pagina_equipos(equipos: &[Equipo]) -> String {
    let mut cuerpo = String::from("<h1>Equipos</h1><p><a href=\"/\">&larr; Volver</a></p>");

    if equipos.is_empty() {
        cuerpo.push_str("<p class=\"vacio\">El inventario está vacío.</p>");
    }

    let mut categoria_actual = "";
    for equipo in equipos {
        if equipo.categoria != categoria_actual {
            categoria_actual = &equipo.categoria;
            cuerpo.push_str(&format!("<h2>{}</h2>", escapar(categoria_actual)));
        }

        let detalle = if equipo.es_granel == 1 {
            format!("{} disponibles", equipo.disponibles)
        } else {
            equipo
                .identificador
                .clone()
                .unwrap_or_else(|| "Equipo único".to_string())
        };

        let accion = if equipo.prestable && equipo.disponibles > 0 {
            format!(
                "<form method=\"post\" action=\"/prestar\">\
                   <input type=\"hidden\" name=\"equipo_id\" value=\"{}\">\
                   <button type=\"submit\">Prestar</button>\
                 </form>",
                equipo.id
            )
        } else {
            "<span class=\"vacio\">No disponible</span>".to_string()
        };

        // El nombre lleva a la ficha del equipo. Antes solo se llegaba ahi
        // escaneando el QR; sin escaner, la lista es la unica puerta.
        cuerpo.push_str(&format!(
            "<div class=\"fila\"><div><a href=\"/equipo/{}\"><strong>{}</strong></a><small>{}</small></div>{}</div>",
            equipo.id,
            escapar(&equipo.nombre),
            escapar(&detalle),
            accion
        ));
    }

    pagina("Equipos", &cuerpo)
}


async fn equipo_por_id(pool: &SqlitePool, equipo_id: i64) -> Result<Option<Equipo>, String> {
    sqlx::query_as::<_, (i64, String, Option<String>, String, i64, i64, i64)>(
        "SELECT i.id,
                i.nombre_equipo,
                i.identificador,
                c.nombre,
                COALESCE(i.es_granel, 0),
                COALESCE(i.stock_total, 1) - (
                    SELECT COUNT(*) FROM prestamos p
                     WHERE p.equipo_id = i.id AND p.estado_prestamo = 'activo'
                ),
                CASE WHEN COALESCE(i.es_prestable, 1) = 1
                      AND COALESCE(c.es_prestable, 1) = 1
                     AND (COALESCE(i.es_granel, 0) = 1 OR i.estado = 'disponible')
                     THEN 1 ELSE 0 END
           FROM inventario i
           JOIN categorias c ON c.id = i.categoria_id
          WHERE i.id = ?",
    )
    .bind(equipo_id)
    .fetch_optional(pool)
    .await
    .map_err(|error| format!("No se pudo consultar el equipo: {error}"))
    .map(|fila| {
        fila.map(
            |(id, nombre, identificador, categoria, es_granel, disponibles, prestable)| Equipo {
                id,
                nombre,
                identificador,
                categoria,
                es_granel,
                disponibles,
                prestable: prestable == 1,
            },
        )
    })
}

/// Ultimos movimientos del equipo. Sirve para responder "quien lo tuvo antes"
/// sin salir de la ficha.
async fn movimientos(pool: &SqlitePool, equipo_id: i64) -> Vec<(String, String)> {
    sqlx::query_as::<_, (String, Option<String>, String, Option<String>)>(
        "SELECT p.estado_prestamo, p.nombre_profe, p.fecha_salida, p.fecha_retorno
           FROM prestamos p
          WHERE p.equipo_id = ?
          ORDER BY p.fecha_salida DESC, p.id DESC
          LIMIT 4",
    )
    .bind(equipo_id)
    .fetch_all(pool)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(estado, profe, salida, retorno)| {
        let quien = profe.filter(|n| !n.trim().is_empty()).unwrap_or_else(|| "alguien".into());
        if estado == "activo" {
            (format!("Prestado a {quien}"), fecha_legible(&salida))
        } else {
            let cuando = retorno.unwrap_or(salida);
            (format!("Devuelto por {quien}"), fecha_legible(&cuando))
        }
    })
    .collect()
}

fn pagina_equipo(equipo: &Equipo, historial: &[(String, String)]) -> String {
    let disponible = equipo.prestable && equipo.disponibles > 0;

    let detalle = if equipo.es_granel == 1 {
        format!("{} disponibles", equipo.disponibles)
    } else {
        equipo
            .identificador
            .clone()
            .unwrap_or_else(|| "Equipo único".to_string())
    };

    let estado = if disponible {
        "<span class=\"estado si\"><span class=\"punto\"></span>Disponible</span>"
    } else {
        "<span class=\"estado no\"><span class=\"punto\"></span>No disponible</span>"
    };

    let accion = if disponible {
        format!(
            "<form method=\"post\" action=\"/prestar\">\
               <input type=\"hidden\" name=\"equipo_id\" value=\"{}\">\
               <button type=\"submit\" class=\"principal\" style=\"min-height:62px;margin-top:1rem\">\
                 Prestar a mi nombre\
               </button>\
             </form>",
            equipo.id
        )
    } else {
        "<p class=\"aviso malo\" style=\"margin-top:1rem\">Este equipo no se puede prestar ahora mismo.</p>"
            .to_string()
    };

    let mut cuerpo = format!(
        "<a href=\"/\">&larr; Volver</a>\
         <div class=\"tarjeta\" style=\"border-radius:20px;padding:22px;margin-top:.9rem\">\
           <p style=\"font-size:.92rem\">{}</p>\
           <h1 style=\"font-size:1.75rem;margin:.2rem 0 .9rem\">{}</h1>\
           <span class=\"meta\">{}{}</span>\
         </div>{}",
        escapar(&equipo.categoria),
        escapar(&equipo.nombre),
        distintivo(&equipo.identificador, &detalle),
        estado,
        accion
    );

    if !historial.is_empty() {
        cuerpo.push_str("<hr class=\"separa\"><h2>Últimos movimientos</h2><div style=\"margin-top:.6rem\">");
        for (que, cuando) in historial {
            cuerpo.push_str(&format!(
                "<div class=\"movimiento\"><span>{}</span><span>{}</span></div>",
                escapar(que),
                escapar(cuando)
            ));
        }
        cuerpo.push_str("</div>");
    }

    cuerpo.push_str(
        "<div class=\"crecer\"></div>\
         <a class=\"boton secundario\" style=\"width:100%;min-height:52px;border-radius:14px\" href=\"/\">\
           Escanear otra\
         </a>",
    );

    pagina(&escapar(&equipo.nombre), &cuerpo)
}

/// `/equipo/42` -> `Some(42)`
fn equipo_de_ruta(ruta: &str) -> Option<i64> {
    ruta.strip_prefix("/equipo/")?.parse::<i64>().ok()
}

/// Guion del adjunto de foto.
///
/// Reduce en el telefono antes de subir: una foto de camara ronda los 12
/// megapixeles y no aporta nada frente a 1024px para documentar un raspon. Va
/// como campo de formulario normal en base64, asi no hace falta un parser
/// multipart en el servidor.
const GUION_FOTO: &str = r##"
<script>
(() => {
  const entrada = document.getElementById('foto');
  const campo = document.getElementById('fotoDatos');
  const vista = document.getElementById('vistaFoto');
  const aviso = document.getElementById('avisoFoto');
  const quitar = document.getElementById('quitarFoto');

  const LADO_MAXIMO = 1024;
  const TOPE_BYTES = 400 * 1024;

  const limpiar = () => {
    campo.value = '';
    entrada.value = '';
    vista.hidden = true;
    vista.removeAttribute('src');
    quitar.hidden = true;
    aviso.textContent = '';
  };

  quitar.addEventListener('click', limpiar);

  entrada.addEventListener('change', async () => {
    const archivo = entrada.files && entrada.files[0];
    if (!archivo) return;

    aviso.textContent = 'Preparando la foto...';

    try {
      const mapa = await createImageBitmap(archivo);
      const escala = Math.min(1, LADO_MAXIMO / Math.max(mapa.width, mapa.height));
      const lienzo = document.createElement('canvas');
      lienzo.width = Math.round(mapa.width * escala);
      lienzo.height = Math.round(mapa.height * escala);
      lienzo.getContext('2d').drawImage(mapa, 0, 0, lienzo.width, lienzo.height);

      // Se baja la calidad hasta entrar en el tope. Si ni al minimo entra, se
      // avisa en vez de subir algo que el servidor va a rechazar.
      let datos = '';
      for (const calidad of [0.7, 0.55, 0.4, 0.28]) {
        datos = lienzo.toDataURL('image/jpeg', calidad);
        if (datos.length * 0.75 <= TOPE_BYTES) break;
      }

      if (datos.length * 0.75 > TOPE_BYTES) {
        limpiar();
        aviso.textContent = 'Esa foto es demasiado grande. Toma una más sencilla.';
        return;
      }

      campo.value = datos;
      vista.src = datos;
      vista.hidden = false;
      quitar.hidden = false;
      aviso.textContent = Math.round(datos.length * 0.75 / 1024) + ' KB';
    } catch (error) {
      limpiar();
      aviso.textContent = 'No se pudo leer la foto: ' + error.message;
    }
  });
})();
</script>
"##;

fn pagina_devolucion(prestamo: &PrestamoActivo) -> String {
    let mut opciones = String::new();
    for (indice, (clave, titulo, ayuda)) in CONDICIONES.iter().enumerate() {
        // La primera queda marcada: devolver "bien" es el caso comun y asi la
        // pantalla se puede confirmar de un solo toque.
        let marcado = if indice == 0 { " checked" } else { "" };
        opciones.push_str(&format!(
            "<label class=\"opcion\">\
               <input type=\"radio\" name=\"condicion\" value=\"{clave}\"{marcado}>\
               <span><strong>{titulo}</strong><small>{ayuda}</small></span>\
             </label>"
        ));
    }

    let mut cuerpo = format!(
        "<a href=\"/\">&larr; Cancelar</a>\
         <h1 style=\"margin:.7rem 0 .25rem\">Devolver</h1>\
         <p style=\"font-size:1.02rem\">{}</p>\
         <p class=\"vacio\" style=\"margin-top:-.35rem\">A nombre de {}</p>\
         <form method=\"post\" action=\"/devolver\" style=\"display:flex;flex-direction:column;flex-grow:1\">\
           <input type=\"hidden\" name=\"prestamo_id\" value=\"{}\">\
           <h2 style=\"margin:1.7rem 0 .65rem\">¿Cómo regresa?</h2>\
           <div class=\"lista\">{}</div>\
           <h2 style=\"margin:1.6rem 0 .65rem\">Nota (opcional)</h2>\
           <textarea name=\"nota\" maxlength=\"500\" placeholder=\"Ej: el cargador viene con el cable pelado\"></textarea>\
           <input type=\"hidden\" name=\"foto\" id=\"fotoDatos\">\
           <div style=\"display:flex;align-items:center;gap:.7rem;margin-top:.9rem;flex-wrap:wrap\">\
             <label class=\"boton secundario\">\
               <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z\"/><circle cx=\"12\" cy=\"13\" r=\"3\"/></svg>\
               Agregar foto\
               <input type=\"file\" accept=\"image/*\" capture=\"environment\" id=\"foto\" hidden>\
             </label>\
             <span id=\"avisoFoto\" class=\"vacio\" style=\"font-size:.88rem\"></span>\
             <button type=\"button\" id=\"quitarFoto\" class=\"secundario\" hidden style=\"min-height:38px;padding:.4rem .8rem;font-size:.9rem\">Quitar</button>\
           </div>\
           <img id=\"vistaFoto\" hidden alt=\"Foto adjunta\" style=\"margin-top:.8rem;width:100%;max-height:220px;object-fit:cover;border-radius:12px;border:1px solid var(--borde)\">\
           <div class=\"crecer\"></div>\
           <button type=\"submit\" class=\"confirmar\" style=\"margin-top:1.2rem\">Confirmar devolución</button>\
         </form>",
        escapar(&prestamo.nombre_equipo),
        escapar(&prestamo.profesor),
        prestamo.id,
        opciones
    );

    cuerpo.push_str(GUION_FOTO);

    pagina("Devolver", &cuerpo)
}

/// `/devolver/42` -> `Some(42)`
fn prestamo_de_ruta(ruta: &str) -> Option<i64> {
    ruta.strip_prefix("/devolver/")?.parse::<i64>().ok()
}

// --- Ruteo --------------------------------------------------------------------

fn ruta(url: &str) -> &str {
    url.split('?').next().unwrap_or("/")
}

fn responder_principal(request: Request, pool: &SqlitePool, sesion: &Sesion, aviso: Option<&str>) {
    match tauri::async_runtime::block_on(listar_prestamos(pool, sesion)) {
        Ok(prestamos) => responder_html(request, 200, pagina_principal(sesion, &prestamos, aviso), None),
        Err(error) => responder_html(request, 500, pagina("Error", &escapar(&error)), None),
    }
}

fn atender_autenticado(mut request: Request, pool: &SqlitePool, sesion: Sesion) {
    let url = request.url().to_string();

    match (request.method().as_str(), ruta(&url)) {
        ("GET", "/equipos") => match tauri::async_runtime::block_on(listar_equipos(pool)) {
            Ok(equipos) => responder_html(request, 200, pagina_equipos(&equipos), None),
            Err(error) => responder_html(request, 500, pagina("Error", &escapar(&error)), None),
        },

        ("POST", "/prestar") | ("POST", "/devolver") => {
            let es_prestamo = ruta(&url) == "/prestar";
            let mut cuerpo = String::new();
            if request.as_reader().read_to_string(&mut cuerpo).is_err() {
                responder_html(request, 400, pagina("Error", "No se pudo leer el formulario."), None);
                return;
            }

            let campo = if es_prestamo { "equipo_id" } else { "prestamo_id" };
            let identificador = leer_campo(&cuerpo, campo).and_then(|valor| valor.parse::<i64>().ok());

            let condicion = leer_campo(&cuerpo, "condicion").unwrap_or_default();
            let nota = leer_campo(&cuerpo, "nota").unwrap_or_default();
            let foto = leer_campo(&cuerpo, "foto").unwrap_or_default();

            let resultado = match identificador {
                Some(id) if es_prestamo => tauri::async_runtime::block_on(prestar(pool, &sesion, id)),
                Some(id) => {
                    tauri::async_runtime::block_on(devolver(
                        pool, &sesion, id, &condicion, &nota, &foto,
                    ))
                }
                None => Err("Falta el identificador en el formulario.".to_string()),
            };

            let aviso = match resultado {
                Ok(nombre) if es_prestamo => format!("Prestado: {nombre}."),
                Ok(nombre) => format!("Devuelto: {nombre}."),
                Err(error) => error,
            };

            responder_principal(request, pool, &sesion, Some(&aviso));
        }

        ("GET", camino) if camino.starts_with("/devolver/") => {
            let prestamos = tauri::async_runtime::block_on(listar_prestamos(pool, &sesion));
            let elegido = prestamo_de_ruta(camino).and_then(|id| {
                prestamos
                    .as_ref()
                    .ok()
                    .and_then(|lista| lista.iter().find(|p| p.id == id))
            });

            match elegido {
                Some(prestamo) => responder_html(request, 200, pagina_devolucion(prestamo), None),
                // Si no esta en sus prestamos activos, no es suyo o ya se devolvio.
                None => responder_principal(
                    request,
                    pool,
                    &sesion,
                    Some("Ese préstamo ya no está activo."),
                ),
            }
        }

        ("GET", camino) if camino.starts_with("/equipo/") => {
            match equipo_de_ruta(camino) {
                Some(id) => match tauri::async_runtime::block_on(equipo_por_id(pool, id)) {
                    Ok(Some(equipo)) => {
                        let historial = tauri::async_runtime::block_on(movimientos(pool, id));
                        responder_html(request, 200, pagina_equipo(&equipo, &historial), None)
                    }
                    Ok(None) => responder_principal(
                        request,
                        pool,
                        &sesion,
                        Some("Esa etiqueta no corresponde a ningún equipo."),
                    ),
                    Err(error) => responder_html(request, 500, pagina("Error", &escapar(&error)), None),
                },
                None => responder_html(request, 400, pagina("Error", "Etiqueta inválida."), None),
            }
        }

        ("GET", "/") => responder_principal(request, pool, &sesion, None),

        _ => responder_html(request, 404, pagina("No encontrado", "<h1>No encontrado</h1>"), None),
    }
}

fn pagina_rechazo() -> String {
    pagina(
        "Acceso no autorizado",
        "<h1>Acceso no autorizado</h1>\
         <p>Este dispositivo no está vinculado, o su acceso fue revocado.</p>\
         <p>Para vincularlo, escanea el código QR desde \
         <strong>Administración → Configuración</strong> en la computadora.</p>",
    )
}

/// Names come from the database, so they are escaped before reaching the page.
fn escapar(texto: &str) -> String {
    texto
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

/// Arranca los dos servidores, cada uno en su hilo.
///
/// Se sirven las dos puertas a propósito: la plana en 8080 sigue funcionando para
/// un teléfono que todavía no instaló la autoridad —y es de donde la baja—,
/// mientras que la segura en 8443 es la única donde el navegador permite abrir la
/// cámara. Un fallo acá nunca puede tumbar la app de escritorio.
pub fn iniciar(db_path: PathBuf, carpeta_datos: PathBuf) {
    thread::spawn(move || {
        let pool = match tauri::async_runtime::block_on(abrir_pool(&db_path)) {
            Ok(pool) => pool,
            Err(error) => {
                eprintln!("[celular] no se pudo abrir la base de datos: {error}");
                return;
            }
        };

        // El certificado va atado a la dirección de hoy, así que se emite en cada
        // arranque. La autoridad que lo firma, en cambio, persiste.
        let material = match crate::local_ip()
            .and_then(|ip| ip.parse().map_err(|error| format!("dirección inválida: {error}")))
            .and_then(|ip| crate::certificado::material_para(&carpeta_datos, ip))
        {
            Ok(material) => Some(material),
            Err(error) => {
                eprintln!("[celular] sin HTTPS, la cámara no va a estar disponible: {error}");
                None
            }
        };

        let ca_pem = material
            .as_ref()
            .map(|material| material.ca_pem.clone())
            .unwrap_or_default();

        if let Some(material) = material {
            let pool_seguro = pool.clone();
            let ca_seguro = ca_pem.clone();

            thread::spawn(move || {
                let configuracion = tiny_http::SslConfig {
                    certificate: material.cert_pem.into_bytes(),
                    private_key: material.llave_pem.into_bytes(),
                };

                match Server::https(("0.0.0.0", PUERTO_SEGURO), configuracion) {
                    Ok(servidor) => {
                        println!("[celular] escuchando cifrado en el puerto {PUERTO_SEGURO}");
                        for request in servidor.incoming_requests() {
                            atender(request, &pool_seguro, &ca_seguro);
                        }
                    }
                    Err(error) => {
                        eprintln!("[celular] no se pudo escuchar cifrado: {error}");
                    }
                }
            });
        }

        let server = match Server::http(("0.0.0.0", PUERTO)) {
            Ok(server) => server,
            Err(error) => {
                eprintln!("[celular] no se pudo escuchar en el puerto {PUERTO}: {error}");
                return;
            }
        };

        println!("[celular] escuchando en el puerto {PUERTO}");

        for request in server.incoming_requests() {
            atender(request, &pool, &ca_pem);
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn el_token_es_largo_y_distinto_cada_vez() {
        let uno = generar_token_aleatorio().expect("debe generar");
        let otro = generar_token_aleatorio().expect("debe generar");

        assert_eq!(uno.len(), BYTES_TOKEN * 2, "32 bytes en hexadecimal");
        assert_ne!(uno, otro, "dos tokens seguidos no pueden repetirse");
    }

    /// Base minima en memoria con dos prestamos de dos profesores distintos.
    fn base_con_dos_prestamos() -> SqlitePool {
        tauri::async_runtime::block_on(async {
            let pool = SqlitePool::connect("sqlite::memory:")
                .await
                .expect("no se pudo abrir la base en memoria");

            for sentencia in [
                "CREATE TABLE categorias (id INTEGER PRIMARY KEY, nombre TEXT)",
                "CREATE TABLE inventario (id INTEGER PRIMARY KEY, categoria_id INTEGER,
                    nombre_equipo TEXT, identificador TEXT, estado TEXT, es_granel INTEGER)",
                "CREATE TABLE prestamos (id INTEGER PRIMARY KEY, equipo_id INTEGER,
                    codigo_profe TEXT, nombre_profe TEXT, fecha_salida TEXT,
                    fecha_retorno TEXT, estado_prestamo TEXT, condicion_regreso TEXT,
                    notas_regreso TEXT)",
                "CREATE TABLE fotos_regreso (prestamo_id INTEGER PRIMARY KEY, imagen TEXT)",
                "INSERT INTO categorias VALUES (1, 'Proyector')",
                "INSERT INTO inventario VALUES (1, 1, 'Canon 001', 'C001', 'prestado', 0)",
                "INSERT INTO inventario VALUES (2, 1, 'Canon 002', 'C002', 'prestado', 0)",
                "INSERT INTO prestamos VALUES (1, 1, 'PROF1', 'Janette Aguilar',
                    '2026-08-21 10:00:00', NULL, 'activo', NULL, NULL)",
                "INSERT INTO prestamos VALUES (2, 2, 'ADMIN', 'Administrador P15',
                    '2026-08-21 11:00:00', NULL, 'activo', NULL, NULL)",
            ] {
                sqlx::query(sentencia)
                    .execute(&pool)
                    .await
                    .unwrap_or_else(|error| panic!("fallo preparando la base: {error}\n{sentencia}"));
            }

            pool
        })
    }

    fn sesion(codigo: &str, es_admin: bool) -> Sesion {
        Sesion {
            codigo: codigo.to_string(),
            nombre: codigo.to_string(),
            es_admin,
        }
    }

    #[test]
    fn un_profesor_solo_ve_sus_prestamos_y_el_admin_los_ve_todos() {
        let pool = base_con_dos_prestamos();

        let suyos =
            tauri::async_runtime::block_on(listar_prestamos(&pool, &sesion("PROF1", false)))
                .expect("lista del profesor");
        assert_eq!(suyos.len(), 1, "un profesor no puede ver prestamos ajenos");
        assert_eq!(suyos[0].profesor, "Janette Aguilar");

        let todos = tauri::async_runtime::block_on(listar_prestamos(&pool, &sesion("ADMIN", true)))
            .expect("lista del admin");
        assert_eq!(todos.len(), 2, "el admin ve el equipo de toda la prepa");
    }

    /// Este es el limite que importa: soltar el filtro de la lista no debe soltar
    /// tambien el de la escritura.
    #[test]
    fn un_profesor_no_puede_devolver_el_prestamo_de_otro() {
        let pool = base_con_dos_prestamos();

        // El prestamo 2 es del admin, no de PROF1.
        let intento = tauri::async_runtime::block_on(devolver(
            &pool,
            &sesion("PROF1", false),
            2,
            "bien",
            "",
            "",
        ));
        assert!(intento.is_err(), "un profesor devolvio algo que no era suyo");

        let sigue_activo: i64 = tauri::async_runtime::block_on(
            sqlx::query_scalar("SELECT COUNT(*) FROM prestamos WHERE id = 2 AND estado_prestamo = 'activo'")
                .fetch_one(&pool),
        )
        .expect("consulta");
        assert_eq!(sigue_activo, 1, "el prestamo no debio tocarse");
    }

    #[test]
    fn el_admin_devuelve_a_nombre_de_cualquiera() {
        let pool = base_con_dos_prestamos();

        // El prestamo 1 es de PROF1.
        tauri::async_runtime::block_on(devolver(
            &pool,
            &sesion("ADMIN", true),
            1,
            "bien",
            "",
            "",
        ))
        .expect("el admin debe poder devolver equipo ajeno");

        let estado: String = tauri::async_runtime::block_on(
            sqlx::query_scalar("SELECT estado_prestamo FROM prestamos WHERE id = 1")
                .fetch_one(&pool),
        )
        .expect("consulta");
        assert_eq!(estado, "devuelto");

        let equipo: String = tauri::async_runtime::block_on(
            sqlx::query_scalar("SELECT estado FROM inventario WHERE id = 1").fetch_one(&pool),
        )
        .expect("consulta");
        assert_eq!(equipo, "disponible", "el equipo vuelve al catalogo");
    }

    #[test]
    fn la_huella_no_revela_el_token() {
        let token = "abc123";
        let huella_calculada = huella(token);

        assert_ne!(huella_calculada, token);
        assert_eq!(huella_calculada.len(), 64, "sha256 en hexadecimal");
        assert_eq!(huella_calculada, huella(token), "debe ser estable");
    }

    #[test]
    fn extrae_el_token_de_la_query() {
        assert_eq!(token_de_query("/?t=abc").as_deref(), Some("abc"));
        assert_eq!(token_de_query("/?otro=1&t=abc").as_deref(), Some("abc"));
        assert_eq!(token_de_query("/"), None);
    }

    #[test]
    fn escapa_nombres_con_html() {
        assert_eq!(escapar("<script>"), "&lt;script&gt;");
    }

    #[test]
    fn la_fecha_usa_el_formato_del_resto_de_la_app() {
        // Debe coincidir con getCurrentLocalDateTime() en useInventory.ts:
        // 'YYYY-MM-DD HH:MM:SS' en hora local. Los reportes ordenan comparando
        // estas cadenas como texto, asi que el formato no es cosmetico.
        let ahora = ahora_local();

        assert_eq!(ahora.len(), 19, "esperaba 'YYYY-MM-DD HH:MM:SS'");
        assert_eq!(ahora.as_bytes()[4], b'-');
        assert_eq!(ahora.as_bytes()[7], b'-');
        assert_eq!(ahora.as_bytes()[10], b' ');
        assert_eq!(ahora.as_bytes()[13], b':');
        assert_eq!(ahora.as_bytes()[16], b':');
        assert!(ahora.chars().all(|c| c.is_ascii_digit() || c == '-' || c == ' ' || c == ':'));
    }

    #[test]
    fn las_fechas_se_leen_de_un_vistazo() {
        let ahora = chrono::Local::now().naive_local();
        let como = |momento: chrono::NaiveDateTime| {
            fecha_legible(&momento.format("%Y-%m-%d %H:%M:%S").to_string())
        };

        assert_eq!(como(ahora - chrono::Duration::seconds(20)), "recién");
        assert_eq!(como(ahora - chrono::Duration::minutes(20)), "hace 20 min");
        assert!(como(ahora - chrono::Duration::minutes(90)).starts_with("hoy, ")
            || como(ahora - chrono::Duration::minutes(90)).starts_with("ayer, "));

        // Un formato inesperado se muestra tal cual: peor seria inventar una fecha.
        assert_eq!(fecha_legible("no es una fecha"), "no es una fecha");
    }

    #[test]
    fn la_hora_usa_reloj_de_doce() {
        assert_eq!(fecha_legible("2020-01-01 00:30:00"), "1 ene 2020");
        // Mediodia y medianoche son los dos casos donde el reloj de 12 se rompe.
        let mediodia = fecha_legible("2020-01-01 12:05:00");
        assert!(mediodia.contains("2020"), "fecha vieja muestra el dia: {mediodia}");
    }

    #[test]
    fn solo_se_aceptan_condiciones_conocidas() {
        // Se guarda la etiqueta legible: los reportes imprimen esta columna tal cual.
        assert_eq!(etiqueta_condicion("bien"), Some("Bien"));
        assert_eq!(etiqueta_condicion("danado"), Some("Dañado"));
        // Sin esto, un formulario manipulado escribiria cualquier texto en la
        // columna que decide si un equipo vuelve al catalogo.
        assert_eq!(etiqueta_condicion("perfecto"), None);
        assert_eq!(etiqueta_condicion(""), None);
    }

    #[test]
    fn distingue_dos_equipos_iguales() {
        let con_codigo = distintivo(&Some("LAT-001".into()), "Laptops");
        let sin_codigo = distintivo(&None, "Laptops");
        let vacio = distintivo(&Some("   ".into()), "Laptops");

        assert!(con_codigo.contains("LAT-001"));
        assert!(sin_codigo.contains("Laptops"));
        assert!(vacio.contains("Laptops"), "un identificador en blanco no distingue nada");
    }

    #[test]
    fn decodifica_base64_con_y_sin_relleno() {
        // "Hola" y "Hola!" tienen distinto relleno; los dos casos deben salir bien.
        assert_eq!(desde_base64("SG9sYQ=="), Some(b"Hola".to_vec()));
        assert_eq!(desde_base64("SG9sYSE="), Some(b"Hola!".to_vec()));
        assert_eq!(desde_base64("SG9sYSBtdW5kbw"), Some(b"Hola mundo".to_vec()));
        // Los simbolos 62 y 63 son justo los que suelen romperse.
        assert_eq!(desde_base64("Pz8/Pg=="), Some(b"??\x3f>".to_vec()));
        assert_eq!(desde_base64("no es base64!"), None);
    }

    #[test]
    fn solo_se_aceptan_imagenes_y_dentro_del_tope() {
        let jpeg_minimo = "data:image/jpeg;base64,SG9sYQ==";
        assert_eq!(
            foto_desde_data_url(jpeg_minimo).expect("valida").as_deref(),
            Some(jpeg_minimo)
        );

        // Sin foto no es un error: el adjunto es opcional.
        assert_eq!(foto_desde_data_url("").expect("vacio"), None);

        // Un formulario manipulado no debe poder guardar cualquier cosa.
        assert!(foto_desde_data_url("data:text/html;base64,SG9sYQ==").is_err());
        assert!(foto_desde_data_url("solo texto").is_err());

        // El tope es la red de seguridad contra un cliente que no reduzca.
        let gigante = format!("data:image/jpeg;base64,{}", "A".repeat(TOPE_FOTO * 2));
        let error = foto_desde_data_url(&gigante).expect_err("debe rechazar");
        assert!(error.contains("límite"), "el error debe explicar el tope: {error}");
    }

    #[test]
    fn lee_campos_de_formulario() {
        assert_eq!(leer_campo("equipo_id=42", "equipo_id").as_deref(), Some("42"));
        assert_eq!(leer_campo("otro=1&equipo_id=42", "equipo_id").as_deref(), Some("42"));
        assert_eq!(leer_campo("equipo_id=42", "prestamo_id"), None);
    }

    #[test]
    fn decodifica_texto_de_formulario() {
        assert_eq!(decodificar("hola+mundo"), "hola mundo");
        assert_eq!(decodificar("caf%C3%A9"), "café");
        // Un porcentaje suelto no debe tumbar el parseo.
        assert_eq!(decodificar("100%"), "100%");
    }

    #[test]
    fn la_ruta_ignora_la_query() {
        assert_eq!(ruta("/equipos?x=1"), "/equipos");
        assert_eq!(ruta("/"), "/");
    }
}
