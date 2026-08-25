//! Lectura del Excel de inventario de Patrimonio de la UdeG.
//!
//! Este modulo hace UNA cosa: convertir los bytes de un `.xlsx` en filas limpias.
//! **No toca la base.** Todos los INSERT/UPDATE viven en `src/hooks/useInventory.ts`,
//! que ya es dueno del esquema y de las migraciones; tener dos duenos del esquema
//! se paga caro despues. Ver `docs/PLAN_IMPORTACION_PATRIMONIO.md` §6 P3.
//!
//! El analisis del archivo real (2137 filas x 16 columnas) esta en ese mismo
//! documento. Lo que importa aca:
//!
//! - La llave es `Id`. Es texto, no numero: va de 5 a 7 digitos y convertirlo a
//!   entero perderia informacion en silencio.
//! - `Num Serie` NO es llave: trae 11 duplicados y 822 celdas basura.
//! - El archivo llega con mojibake del propio export de Patrimonio (ver
//!   `reparar_mojibake`).

use calamine::{open_workbook_auto_from_rs, Data, Reader};
use serde::Serialize;
use std::collections::HashMap;
use std::io::Cursor;

/// Una fila del Excel, ya limpia. Los `Option` son "sin dato", no cadena vacia.
#[derive(Debug, Serialize, PartialEq)]
pub struct FilaPatrimonio {
    pub id_patrimonial: String,
    /// Columna "Clasificador descripcion": el tipo real del objeto (COMPUTADORA,
    /// MONITOR...). Es lo que termina en `inventario.nombre_equipo`.
    pub clasificador: String,
    pub marca: Option<String>,
    pub modelo: Option<String>,
    pub num_serie: Option<String>,
    pub descripcion: Option<String>,
    pub resguardante_codigo: Option<String>,
    pub resguardante_nombre: Option<String>,
    pub fecha_adquisicion: Option<String>,
    pub ubicacion: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct LecturaExcel {
    pub filas: Vec<FilaPatrimonio>,
    /// Lo que no se pudo leer o quedo dudoso. Se muestra en la vista previa: es
    /// preferible que una persona vea el problema a que entre callado a la base.
    pub avisos: Vec<String>,
}

/// Encabezados que el importador necesita, ya normalizados.
const COLUMNAS_REQUERIDAS: [&str; 2] = ["id", "clasificador descripcion"];

/// Celdas que significan "sin dato" aunque tengan texto. Salen del archivo real.
const SENTINELAS: [&str; 5] = ["S/N", "S/S", "S/M", "N/A", "NINGUNA"];

/// Quita acentos y colapsa espacios, para comparar encabezados sin depender de
/// como los escribio Patrimonio.
fn normalizar_encabezado(texto: &str) -> String {
    texto
        .chars()
        .map(|c| match c {
            'á' | 'à' | 'ä' | 'â' | 'Á' | 'À' | 'Ä' | 'Â' => 'a',
            'é' | 'è' | 'ë' | 'ê' | 'É' | 'È' | 'Ë' | 'Ê' => 'e',
            'í' | 'ì' | 'ï' | 'î' | 'Í' | 'Ì' | 'Ï' | 'Î' => 'i',
            'ó' | 'ò' | 'ö' | 'ô' | 'Ó' | 'Ò' | 'Ö' | 'Ô' => 'o',
            'ú' | 'ù' | 'ü' | 'û' | 'Ú' | 'Ù' | 'Ü' | 'Û' => 'u',
            'ñ' | 'Ñ' => 'n',
            otro => otro.to_ascii_lowercase(),
        })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

/// Repara el doble encoding que trae el export de Patrimonio.
///
/// `CAÑON PROYECTOR` llega partido en dos: 20 filas dicen `CAÃ\`ON PROYECTOR` y
/// una dice el nombre correcto. Sin reparar, el mismo tipo de objeto entra como
/// dos clasificadores distintos.
///
/// **No sirve el truco general** de re-codificar a Latin-1 y decodificar UTF-8.
/// `Ñ` es `C3 91` en UTF-8, pero en el archivo quedo como `Ã` + `` ` `` (0x60), y
/// `Ó` (`C3 93`) quedo como `Ã` + `¿` (0xBF): un segundo paso lossy machaco el
/// byte de continuacion, asi que ya no hay UTF-8 valido que recuperar. Por eso va
/// una tabla de las secuencias que trae este archivo.
///
/// Lo que no este en la tabla NO se adivina: se avisa (ver `revisar_mojibake`).
fn reparar_mojibake(texto: &str) -> String {
    texto.replace("Ã`", "Ñ").replace("Ã¿", "Ó")
}

/// Marca el mojibake que la tabla no cubre, para que se vea en la vista previa.
fn revisar_mojibake(texto: &str) -> bool {
    texto.contains('Ã') || texto.contains('Â')
}

/// Texto util o `None`. Colapsa los sentinelas del archivo (`S/N`, `------`...).
fn celda_limpia(valor: &Data) -> Option<String> {
    let bruto = match valor {
        Data::Empty => return None,
        Data::String(s) => s.clone(),
        Data::Int(n) => n.to_string(),
        Data::Float(f) => {
            // Excel guarda enteros como float. `3294832.0` tiene que salir
            // `3294832`, no `3294832.0`, o la llave no empata con nada.
            if f.fract() == 0.0 {
                format!("{}", *f as i64)
            } else {
                f.to_string()
            }
        }
        otro => otro.to_string(),
    };

    let limpio = reparar_mojibake(bruto.trim()).trim().to_string();

    if limpio.is_empty() {
        return None;
    }
    // `------` y variantes: relleno de Patrimonio para "sin dato".
    if limpio.chars().all(|c| c == '-') {
        return None;
    }
    if SENTINELAS.contains(&limpio.to_uppercase().as_str()) {
        return None;
    }

    Some(limpio)
}

/// `29/05/2023 00:00:00` -> `2023-05-29`, que es lo que espera `<input type="date">`.
///
/// Devuelve `None` si no empata el formato, en vez de inventar una fecha.
fn fecha_iso(texto: &str) -> Option<String> {
    let solo_fecha = texto.split_whitespace().next()?;
    let mut partes = solo_fecha.split('/');

    let dia: u32 = partes.next()?.parse().ok()?;
    let mes: u32 = partes.next()?.parse().ok()?;
    let anio: i32 = partes.next()?.parse().ok()?;
    if partes.next().is_some() {
        return None;
    }

    if !(1..=31).contains(&dia) || !(1..=12).contains(&mes) || !(1900..=2200).contains(&anio) {
        return None;
    }

    Some(format!("{anio:04}-{mes:02}-{dia:02}"))
}

/// Lee el `.xlsx` de Patrimonio y devuelve las filas limpias.
///
/// Recibe los bytes y no una ruta: el archivo lo elige el usuario con un
/// `<input type="file">` normal, sin agregar `tauri-plugin-dialog` ni tocar
/// `capabilities`. El archivo real pesa 202 KB.
pub fn leer_excel(bytes: Vec<u8>) -> Result<LecturaExcel, String> {
    let mut libro = open_workbook_auto_from_rs(Cursor::new(bytes))
        .map_err(|e| format!("No se pudo abrir el archivo como Excel: {e}"))?;

    let hoja = libro
        .worksheet_range_at(0)
        .ok_or_else(|| "El archivo no tiene ninguna hoja.".to_string())?
        .map_err(|e| format!("No se pudo leer la primera hoja: {e}"))?;

    let mut renglones = hoja.rows();
    let encabezado = renglones
        .next()
        .ok_or_else(|| "La hoja esta vacia.".to_string())?;

    // Se ubican las columnas por NOMBRE, no por posicion. Si Patrimonio agrega o
    // mueve una columna, esto falla diciendo cual falta en vez de leer callado la
    // columna equivocada, que es el peor final posible para una importacion.
    let mut indice: HashMap<String, usize> = HashMap::new();
    for (i, celda) in encabezado.iter().enumerate() {
        let nombre = normalizar_encabezado(&celda.to_string());
        if !nombre.is_empty() {
            indice.entry(nombre).or_insert(i);
        }
    }

    let faltantes: Vec<&str> = COLUMNAS_REQUERIDAS
        .iter()
        .copied()
        .filter(|columna| !indice.contains_key(*columna))
        .collect();
    if !faltantes.is_empty() {
        return Err(format!(
            "Al archivo le faltan columnas obligatorias: {}. ¿Es el listado de Patrimonio?",
            faltantes.join(", ")
        ));
    }

    let columna = |fila: &[Data], nombre: &str| -> Option<String> {
        indice.get(nombre).and_then(|i| fila.get(*i)).and_then(celda_limpia)
    };

    let mut filas = Vec::new();
    let mut avisos = Vec::new();
    let mut vistos: HashMap<String, usize> = HashMap::new();

    for (offset, fila) in renglones.enumerate() {
        // +2: la primera fila del Excel es el encabezado y la gente cuenta desde 1.
        let numero = offset + 2;

        let Some(id_patrimonial) = columna(fila, "id") else {
            // Una fila sin Id no se puede ligar a nada. Suele ser el renglon de
            // totales o una fila en blanco al final.
            continue;
        };

        let Some(clasificador) = columna(fila, "clasificador descripcion") else {
            avisos.push(format!("Fila {numero}: el ID {id_patrimonial} no tiene clasificador. Se omite."));
            continue;
        };

        if let Some(anterior) = vistos.insert(id_patrimonial.clone(), numero) {
            avisos.push(format!(
                "Fila {numero}: el ID {id_patrimonial} ya aparecio en la fila {anterior}. Se omite la repetida."
            ));
            continue;
        }

        if revisar_mojibake(&clasificador) {
            avisos.push(format!(
                "Fila {numero}: \"{clasificador}\" trae caracteres dañados que no se pudieron reparar. Revisalo despues de importar."
            ));
        }

        let fecha_cruda = columna(fila, "fecha adquisicion");
        let fecha_adquisicion = match &fecha_cruda {
            Some(texto) => {
                let iso = fecha_iso(texto);
                if iso.is_none() {
                    avisos.push(format!("Fila {numero}: no se entendio la fecha \"{texto}\". Queda vacia."));
                }
                iso
            }
            None => None,
        };

        filas.push(FilaPatrimonio {
            id_patrimonial,
            clasificador,
            marca: columna(fila, "marca"),
            modelo: columna(fila, "modelo"),
            num_serie: columna(fila, "num serie"),
            descripcion: columna(fila, "descripcion"),
            resguardante_codigo: columna(fila, "resguardante"),
            resguardante_nombre: columna(fila, "resguardante nombre"),
            fecha_adquisicion,
            ubicacion: columna(fila, "ubicacion"),
        });
    }

    if filas.is_empty() {
        return Err("El archivo no trae ninguna fila con ID de Patrimonio.".to_string());
    }

    Ok(LecturaExcel { filas, avisos })
}

#[tauri::command]
pub fn leer_excel_patrimonio(bytes: Vec<u8>) -> Result<LecturaExcel, String> {
    leer_excel(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn repara_las_secuencias_del_archivo_real() {
        assert_eq!(reparar_mojibake("CAÃ`ON PROYECTOR"), "CAÑON PROYECTOR");
        assert_eq!(
            reparar_mojibake("EQUIPO DE CREDENCIALIZACIÃ¿N"),
            "EQUIPO DE CREDENCIALIZACIÓN"
        );
        // El texto sano no se toca.
        assert_eq!(reparar_mojibake("CAÑON PROYECTOR"), "CAÑON PROYECTOR");
        assert_eq!(reparar_mojibake("COMPUTADORA"), "COMPUTADORA");
    }

    #[test]
    fn avisa_del_mojibake_que_no_conoce() {
        assert!(revisar_mojibake("ALGO Ã‰XTRAÑO"));
        assert!(!revisar_mojibake(&reparar_mojibake("CAÃ`ON PROYECTOR")));
        assert!(!revisar_mojibake("MICRÓFONO"));
    }

    #[test]
    fn los_sentinelas_quedan_vacios() {
        for basura in ["S/N", "s/n", "S/S", "S/M", "------", "   ", "-", "N/A"] {
            assert_eq!(
                celda_limpia(&Data::String(basura.to_string())),
                None,
                "{basura} deberia quedar vacio"
            );
        }
    }

    #[test]
    fn el_texto_util_sobrevive_recortado() {
        assert_eq!(
            celda_limpia(&Data::String("  DELL  ".to_string())),
            Some("DELL".to_string())
        );
    }

    #[test]
    fn el_id_entero_no_arrastra_decimales() {
        // Excel guarda los enteros como float; `3294832.0` no empataria con nada.
        assert_eq!(
            celda_limpia(&Data::Float(3294832.0)),
            Some("3294832".to_string())
        );
    }

    #[test]
    fn la_fecha_pasa_a_iso() {
        assert_eq!(fecha_iso("29/05/2023 00:00:00"), Some("2023-05-29".to_string()));
        assert_eq!(fecha_iso("01/11/2023"), Some("2023-11-01".to_string()));
    }

    #[test]
    fn la_fecha_rara_queda_vacia_en_vez_de_inventarse() {
        assert_eq!(fecha_iso("sin fecha"), None);
        assert_eq!(fecha_iso("32/01/2023"), None);
        assert_eq!(fecha_iso("29/13/2023"), None);
        assert_eq!(fecha_iso("2023-05-29"), None);
    }

    /// Corre solo si el archivo real esta a mano. No se versiona: son datos del
    /// inventario de la escuela.
    #[test]
    fn lee_el_archivo_real_si_esta_disponible() {
        let ruta = match std::env::var("EXCEL_PATRIMONIO") {
            Ok(ruta) => ruta,
            Err(_) => {
                eprintln!("EXCEL_PATRIMONIO sin definir, se omite la prueba del archivo real");
                return;
            }
        };

        let bytes = std::fs::read(&ruta).expect("no se pudo leer el archivo");
        let lectura = leer_excel(bytes).expect("no se pudo interpretar el archivo");

        assert_eq!(lectura.filas.len(), 2137, "cambio la cantidad de filas");
        assert!(lectura.avisos.is_empty(), "avisos inesperados: {:?}", lectura.avisos);

        let ids: std::collections::HashSet<&str> =
            lectura.filas.iter().map(|f| f.id_patrimonial.as_str()).collect();
        assert_eq!(ids.len(), 2137, "hay IDs repetidos");

        assert!(
            !lectura.filas.iter().any(|f| revisar_mojibake(&f.clasificador)),
            "quedo mojibake sin reparar"
        );
        assert!(
            lectura.filas.iter().any(|f| f.clasificador == "CAÑON PROYECTOR"),
            "el clasificador reparado no aparece"
        );
        // 822 celdas de serie son basura: tienen que haber quedado vacias.
        assert!(
            lectura.filas.iter().filter(|f| f.num_serie.is_some()).count() < 1400,
            "los sentinelas de num_serie no se limpiaron"
        );
    }
}
