//! Lectura del Excel con el directorio de profesores.
//!
//! Igual que `patrimonio.rs`: convierte los bytes de un `.xlsx` en filas limpias
//! y **no toca la base**. Los INSERT/UPDATE viven en `src/hooks/useInventory.ts`,
//! que es el dueno del esquema.
//!
//! El formato lo define la app, no un sistema externo: primera hoja, encabezados
//! en la fila 1, columnas `Código` y `Nombre completo` en cualquier orden.

use calamine::{open_workbook_auto_from_rs, Data, Reader};
use serde::Serialize;
use std::collections::HashMap;
use std::io::Cursor;

use crate::patrimonio::{celda_limpia, normalizar_encabezado};

#[derive(Debug, Serialize, PartialEq)]
pub struct FilaProfesor {
    /// Texto, no numero: convertirlo a entero perderia los ceros a la izquierda.
    pub codigo: String,
    pub nombre: String,
}

#[derive(Debug, Serialize)]
pub struct LecturaProfesores {
    pub filas: Vec<FilaProfesor>,
    /// Filas omitidas o dudosas. Se muestran en la vista previa.
    pub avisos: Vec<String>,
}

/// Encabezados aceptados, ya normalizados. El primero que aparezca gana, asi que
/// `nombre completo` tiene prioridad sobre un `nombre` suelto.
const ALIAS_CODIGO: [&str; 3] = ["codigo", "codigo udg", "codigo siiau"];
const ALIAS_NOMBRE: [&str; 2] = ["nombre completo", "nombre"];

/// `  Maria   Lopez ` -> `Maria Lopez`. Los espacios dobles vienen de copiar y
/// pegar, y harian ver distinto un nombre que es el mismo.
fn colapsar_espacios(texto: &str) -> String {
    texto.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// Interpreta los renglones de la hoja, encabezado incluido.
///
/// Separado de `leer_excel` para poder probarlo con filas en memoria, sin
/// armar un `.xlsx`.
fn interpretar_renglones<'a>(
    mut renglones: impl Iterator<Item = &'a [Data]>,
) -> Result<LecturaProfesores, String> {
    let encabezado = renglones
        .next()
        .ok_or_else(|| "La hoja está vacía.".to_string())?;

    let mut indice: HashMap<String, usize> = HashMap::new();
    for (i, celda) in encabezado.iter().enumerate() {
        let nombre = normalizar_encabezado(&celda.to_string());
        if !nombre.is_empty() {
            indice.entry(nombre).or_insert(i);
        }
    }

    // Por NOMBRE, no por posicion: una columna movida debe fallar diciendo que
    // falta, no importar callada la columna equivocada.
    let buscar = |alias: &[&str]| alias.iter().find_map(|a| indice.get(*a).copied());
    let (Some(col_codigo), Some(col_nombre)) = (buscar(&ALIAS_CODIGO), buscar(&ALIAS_NOMBRE)) else {
        return Err(
            "Al archivo le faltan columnas obligatorias. La primera fila debe tener los encabezados \"Código\" y \"Nombre completo\"."
                .to_string(),
        );
    };

    let celda = |fila: &[Data], i: usize| fila.get(i).and_then(celda_limpia);

    let mut filas = Vec::new();
    let mut avisos = Vec::new();
    let mut vistos: HashMap<String, usize> = HashMap::new();

    for (offset, fila) in renglones.enumerate() {
        // +2: la primera fila del Excel es el encabezado y la gente cuenta desde 1.
        let numero = offset + 2;
        let codigo = celda(fila, col_codigo);
        let nombre = celda(fila, col_nombre).map(|n| colapsar_espacios(&n));

        let (codigo, nombre) = match (codigo, nombre) {
            // Renglon en blanco: no amerita aviso.
            (None, None) => continue,
            (Some(codigo), None) => {
                avisos.push(format!("Fila {numero}: el código {codigo} no tiene nombre. Se omite."));
                continue;
            }
            (None, Some(nombre)) => {
                avisos.push(format!("Fila {numero}: \"{nombre}\" no tiene código. Se omite."));
                continue;
            }
            (Some(codigo), Some(nombre)) => (codigo, nombre),
        };

        // Se conserva la primera aparicion: la repetida no pisa a la anterior.
        if let Some(anterior) = vistos.get(&codigo).copied() {
            avisos.push(format!(
                "Fila {numero}: el código {codigo} ya apareció en la fila {anterior}. Se omite la repetida."
            ));
            continue;
        }
        vistos.insert(codigo.clone(), numero);

        filas.push(FilaProfesor { codigo, nombre });
    }

    if filas.is_empty() {
        return Err("El archivo no trae ningún profesor con código y nombre.".to_string());
    }

    Ok(LecturaProfesores { filas, avisos })
}

/// Lee el `.xlsx` de profesores. Recibe bytes por la misma razon que Patrimonio:
/// el archivo sale de un `<input type="file">` y no hace falta otro plugin.
pub fn leer_excel(bytes: Vec<u8>) -> Result<LecturaProfesores, String> {
    let mut libro = open_workbook_auto_from_rs(Cursor::new(bytes))
        .map_err(|e| format!("No se pudo abrir el archivo como Excel: {e}"))?;

    let hoja = libro
        .worksheet_range_at(0)
        .ok_or_else(|| "El archivo no tiene ninguna hoja.".to_string())?
        .map_err(|e| format!("No se pudo leer la primera hoja: {e}"))?;

    interpretar_renglones(hoja.rows())
}

#[tauri::command]
pub fn leer_excel_profesores(bytes: Vec<u8>) -> Result<LecturaProfesores, String> {
    leer_excel(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn texto(valor: &str) -> Data {
        Data::String(valor.to_string())
    }

    fn leer(hoja: &[Vec<Data>]) -> Result<LecturaProfesores, String> {
        interpretar_renglones(hoja.iter().map(|fila| fila.as_slice()))
    }

    #[test]
    fn encuentra_las_columnas_por_nombre_y_en_cualquier_orden() {
        let hoja = vec![
            vec![texto("Correo"), texto(" NOMBRE  COMPLETO "), texto("Código")],
            vec![texto("x@udg.mx"), texto("Edgar Iván Aguilar Durán"), texto("2958101")],
        ];
        let lectura = leer(&hoja).unwrap();
        assert_eq!(
            lectura.filas,
            vec![FilaProfesor {
                codigo: "2958101".to_string(),
                nombre: "Edgar Iván Aguilar Durán".to_string()
            }]
        );
    }

    #[test]
    fn acepta_los_alias_de_encabezado() {
        let hoja = vec![
            vec![texto("codigo siiau"), texto("Nombre")],
            vec![texto("2104455"), texto("María López")],
        ];
        assert_eq!(leer(&hoja).unwrap().filas.len(), 1);
    }

    #[test]
    fn nombre_completo_gana_sobre_nombre() {
        let hoja = vec![
            vec![texto("Nombre"), texto("Código"), texto("Nombre completo")],
            vec![texto("María"), texto("1"), texto("María López Hernández")],
        ];
        assert_eq!(leer(&hoja).unwrap().filas[0].nombre, "María López Hernández");
    }

    #[test]
    fn falta_una_columna_y_el_error_dice_cuales_se_esperan() {
        let hoja = vec![vec![texto("Clave"), texto("Nombre completo")], vec![texto("1"), texto("A")]];
        let error = leer(&hoja).unwrap_err();
        assert!(error.contains("\"Código\""), "{error}");
        assert!(error.contains("\"Nombre completo\""), "{error}");
    }

    #[test]
    fn limpia_codigo_numerico_y_espacios_del_nombre() {
        let hoja = vec![
            vec![texto("Código"), texto("Nombre completo")],
            // Excel guarda enteros como float: no puede salir `2958101.0`.
            vec![Data::Float(2958101.0), texto("  Edgar   Iván  Aguilar ")],
        ];
        let fila = &leer(&hoja).unwrap().filas[0];
        assert_eq!(fila.codigo, "2958101");
        assert_eq!(fila.nombre, "Edgar Iván Aguilar");
    }

    #[test]
    fn omite_filas_en_blanco_sin_aviso_y_avisa_las_incompletas() {
        let hoja = vec![
            vec![texto("Código"), texto("Nombre completo")],
            vec![texto("1"), texto("Ana")],
            vec![Data::Empty, texto("   ")],
            vec![texto("2"), Data::Empty],
            vec![Data::Empty, texto("Sin Código")],
        ];
        let lectura = leer(&hoja).unwrap();
        assert_eq!(lectura.filas.len(), 1);
        assert_eq!(
            lectura.avisos,
            vec![
                "Fila 4: el código 2 no tiene nombre. Se omite.".to_string(),
                "Fila 5: \"Sin Código\" no tiene código. Se omite.".to_string(),
            ]
        );
    }

    #[test]
    fn un_codigo_repetido_conserva_la_primera_fila() {
        let hoja = vec![
            vec![texto("Código"), texto("Nombre completo")],
            vec![texto("7"), texto("Primera")],
            vec![texto("7"), texto("Segunda")],
            vec![texto("7"), texto("Tercera")],
        ];
        let lectura = leer(&hoja).unwrap();
        assert_eq!(lectura.filas.len(), 1);
        assert_eq!(lectura.filas[0].nombre, "Primera");
        assert!(lectura.avisos[1].contains("ya apareció en la fila 2"), "{:?}", lectura.avisos);
    }

    #[test]
    fn sin_profesores_es_error() {
        let hoja = vec![vec![texto("Código"), texto("Nombre completo")], vec![Data::Empty, Data::Empty]];
        assert!(leer(&hoja).is_err());
        assert!(leer(&[]).is_err());
    }
}
