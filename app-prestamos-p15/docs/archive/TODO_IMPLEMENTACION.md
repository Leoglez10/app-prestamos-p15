# TODO Implementacion P15

## Hecho en esta fase
- Corregir parseo de fechas SQLite en admin y kiosko.
- Agregar filtros de historial por busqueda, categoria, estado y rango de fechas.
- Separar observaciones internas de administracion para devoluciones.
- Agregar columna de cantidad de articulos por categoria.
- Permitir marcar categorias y articulos como prestables o solo inventario.
- Agregar pestaña de configuracion con respaldo simple de `prestamos.db`.

## Siguiente fase recomendada
- Generacion de PDF de reportes filtrados.
- Reporte de inventario completo con estado actual.
- Reporte historico de prestamos por rango de fechas.
- Guardado de reportes generados para consulta posterior.
- Boton de compartir/exportar reportes.

## Fase posterior
- Migracion o depuracion de registros historicos legacy despues de validar respaldos.
- Evaluar exportacion PDF con flujo estable para Tauri.
