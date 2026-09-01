# Changelog

Todos los cambios importantes de **App Prestamos P15**.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa
[versionado semántico](https://semver.org/lang/es/). Cada versión corresponde a un tag `v*` que
disparó la CI y publicó su instalador en [Releases](https://github.com/Leoglez10/app-prestamos-p15/releases).

---

## [0.7.2] — 2026-09-01

### Corregido

- **El Kiosko abría en blanco.** Entrar por **Soy Profesor** dejaba la ventana vacía y sin mensaje en
  las versiones 0.5.0 a 0.7.1. `Kiosk.tsx` tenía dos `return` tempranos —el de *Cargando Kiosko…* y el
  de *Error de Base de Datos*— por encima de la llamada a `usePistola`. El primer render salía en esos
  `return` con menos hooks de los que registraba el segundo, y React aborta con *"Rendered more hooks
  than during the previous render"*. Las dos salidas ahora van debajo de todos los hooks
  (`src/pages/Kiosk.tsx`).

  El fallo entró con `usePistola` en la 0.5.0 y no se notó porque solo golpea al Kiosko: Préstamo
  Rápido y Administrador no tienen `return` encima de sus hooks. Ninguna base de datos estuvo
  involucrada y no se perdió ningún préstamo.

### Añadido

- **Pantalla de error en lugar de ventana en blanco.** Cualquier excepción durante el render ahora
  muestra el mensaje y un botón para volver al inicio. En un build de escritorio no hay consola
  abierta, así que hasta ahora el único síntoma que llegaba era "no abre"
  (`src/components/ErrorBoundary.tsx`).

---

## [0.7.1] — 2026-08-31

### Añadido

- **Manual del personal**, con su PDF generado y adjuntado en cada release por la CI.
- **Formularios guiados de issues** y `CONTRIBUTING.md` para reportar problemas desde GitHub.

---

## [0.7.0] — 2026-08-31

### Añadido

- **Salida a evento.** Varios equipos salen juntos a un lugar y una fecha sin registrar un préstamo
  suelto por cada uno. La tabla `eventos` guarda solo el encabezado —lugar, fechas, responsable,
  expositor—; los equipos que salen son filas normales de `prestamos` ligadas al evento, así que el
  inventario y los reportes los siguen viendo como lo que son
  (`src/utils/evento.ts`, `src/components/EventoSalidaDialog.tsx`,
  `src/components/EventoDetalleModal.tsx`).

  - `CalendarioRango` para elegir el rango de días, en lugar de dos campos de fecha sueltos
    (`src/components/CalendarioRango.tsx`, `src/utils/calendario.ts`).
  - Chip violeta en Inventario para el equipo que salió con un evento.
  - Un evento se cierra aunque falte equipo: queda como **cerrado con faltantes** y sus filas siguen
    activas, porque hay material afuera de verdad.

- **Los préstamos rápidos de texto libre ya aparecen en Reportes.** Un préstamo rápido sin equipo del
  inventario nunca escribía en `prestamos`, así que no salía en ningún reporte: el historial se veía
  completo sin serlo. `getReportePrestamos` ahora une las dos fuentes y marca cada fila con una
  insignia **Préstamo rápido**, en pantalla y en el PDF.

  - Las filas de texto libre son de **solo lectura** desde Reportes: no existen en `prestamos`, así
    que editarlas o borrarlas ahí no escribiría en ningún lado. Se administran desde Préstamo Rápido.

- **Filtro por tipo de objeto en el historial de Préstamo Rápido.** Antes solo se podía acotar por
  estado o por texto, así que responder "¿qué cámaras hay afuera?" obligaba a leer la lista entera.
  Un evento se filtra por las categorías de todo lo que salió con él, para que no se esconda cuando
  sí lleva ese tipo adentro.

### Cambiado

- **Importar Patrimonio** e **Importar reporte de inventario** se mudaron a **Toma de inventario**,
  cada uno con su botón en vez del campo de archivo desnudo.
- Todos los `<select>` de la app usan el mismo chevron. Antes cada uno sin estilo propio mostraba la
  doble flecha nativa de macOS, que no combina con ningún otro control.
- Los filtros de Reportes se marcan cuando están aplicados: un filtro olvidado escondía medio
  historial sin avisar.

### Corregido

- **El id de un INSERT se lee del resultado del INSERT, nunca de `SELECT last_insert_rowid()`.**
  `tauri-plugin-sql` abre un pool de conexiones y `last_insert_rowid()` es por conexión: la lectura
  caía en otra conexión y devolvía `0` o el id de una escritura ajena. Los objetos de un evento
  podían quedar colgados del evento equivocado.
- Los filtros del historial de Préstamo Rápido califican sus columnas: `nombre_equipo` y `estado`
  existen en las dos tablas del JOIN y SQLite los rechazaba como ambiguos.

### Interno

- Índice en `prestamos_rapidos_alumnos (prestamo_app_id)`: el `EXISTS` que marca cada préstamo del
  reporte recorría la tabla espejo una vez por fila.
- Pruebas nuevas de `utils/evento.ts` y `utils/calendario.ts` — 112 en verde.
- Bloque de orientación para IAs en el README y guiones de los seis videos tutoriales versionados
  (solo la fuente; los binarios quedan fuera del repo).

## [0.6.0] — 2026-08-29

### Añadido

- **Toma física en dos computadoras.** La máquina principal sigue prestando mientras una segunda
  camina el edificio con la pistola. Al terminar, el reporte CSV de la segunda se importa en la
  principal desde **Admin ▸ Inventario ▸ "Traer la toma física de otra computadora"** y **fusiona**
  el recorrido en vez de reemplazar la base (`src/utils/reporteTomaFisica.ts`,
  `src/components/ImportarReportePanel.tsx`).

  - Gana el dato más nuevo **equipo por equipo**, no archivo por archivo: importar el mismo reporte
    dos veces no cambia nada, y un reporte viejo no puede pisar un recorrido más reciente.
  - Escribe únicamente `revisado_en`, `revisado_por`, `no_localizado_en`, `no_localizado_por` y
    `ubicacion`. Los préstamos no comparten ninguna de esas columnas, así que no se tocan.
  - Un `revisado` posterior gana sobre un "no apareció" anterior: si el equipo se vio después, está.
  - Vista previa antes de escribir y respaldo automático, igual que la importación del Excel.
  - No crea equipos: las altas al vuelo de la otra máquina salen listadas aparte, porque el reporte
    no trae la categoría.
  - No hizo falta un formato nuevo — reutiliza el mismo CSV que ya exporta la toma física.

- Documentación del relevo entre dos computadoras en
  [docs/RELEVO_TOMA_FISICA.md](app-prestamos-p15/docs/RELEVO_TOMA_FISICA.md).

### Interno

- El reporte se lee con un parser de CSV que respeta comillas, separadores y saltos de línea dentro
  de los campos. Las descripciones de Patrimonio los traen, y partir por separador corría la fila en
  silencio: el `Localizado` de un equipo se habría leído del campo de al lado.
- Las columnas del reporte se buscan por **nombre normalizado**, no por posición, para que un archivo
  que pasó por Excel y volvió con las columnas movidas no importe datos corridos.
- 14 pruebas nuevas (`src/utils/reporteTomaFisica.test.ts`), incluida una de ida y vuelta que exporta
  con `construirReporteCsv` y verifica que el importador reconstruye el recorrido completo.

## [0.5.1] — 2026-08-27

### Corregido

- **Kiosko**: el disparo de la pistola limpia el buscador aunque el equipo escaneado no esté disponible.
  Antes, escanear un equipo ya prestado dejaba el código pegado en el campo y el siguiente disparo se
  concatenaba con el anterior.

### Interno

- Skill de proyecto `/release` para publicar una versión con un solo comando.

## [0.5.0] — 2026-08-27

### Añadido

- **La pistola dispara sola.** El lector ya no depende de que la etiqueta mande `Enter`: la app
  distingue la ráfaga del lector de una persona tecleando por la velocidad entre teclas
  (`src/utils/pistola.ts`).
- **Escaneo global en Inventario.** Apuntar a una etiqueta abre la ficha del equipo sin tener que
  hacer clic en un campo primero. Si hay un campo enfocado, el código va al campo.
- **Alta al vuelo en la toma física.** Un código que nadie reclama se puede dar de alta ahí mismo
  (nombre + categoría), o abrir la ficha completa con **"Editarlo completo"** para capturar marca,
  modelo y serie mientras el aparato está en la mano.

### Cambiado

- El formulario de equipo salió de `Admin.tsx` a su propio componente (`EquipoFormDialog`).

## [0.4.0] — 2026-08-25

### Añadido

- **Importación del Excel oficial de Patrimonio**, con plan previo antes de tocar la base.
- **Toma de inventario físico** con lector de códigos de barras, por áreas y con reporte exportable.
- **Identificación por la etiqueta de Patrimonio de la UdeG** (Code 39).
- **Tres estados en el reporte de Patrimonio**: `S` apareció, `N` se buscó y no estaba, vacío es que
  nadie llegó todavía a esa área. Antes todo lo no revisado salía como `N`, o sea que el reporte
  afirmaba pérdidas que nadie había comprobado.
- **Restaurar un respaldo con un botón**, sin buscar el archivo a mano.

### Cambiado

- La toma de inventario es una pestaña del Admin, no una pantalla aparte.
- La acción masiva vive en la tabla de inventario, no en una segunda lista.

### Corregido

- Marcar una categoría como *solo inventario* ahora apaga sus equipos en **toda** la app; antes la UI
  del Admin leía el campo del equipo y se saltaba el de la categoría.
- La importación del Excel ya no revienta con `database is locked`.
- Equipos con el mismo nombre ya se distinguen entre sí.

## [0.3.0] — 2026-08-24

### Añadido

- **Préstamo Rápido** registra contra el inventario real, contra profesores y con varios objetos.
- **Devolución masiva** en el kiosko y lenguaje de color consistente en las acciones.

## [0.2.1] — 2026-08-21

### Añadido

- Modo administrador en el acceso por celular: ver y devolver los préstamos de todos.

### Corregido

- El QR de entrada apunta al canal seguro.

## [0.2.0] — 2026-08-21

### Añadido

- Acceso desde celular por QR (experimental, LAN) y ficha de detalle por equipo.

## [0.1.5] — 2026-08-20

### Añadido

- **Respaldos automáticos** e ícono propio de la P15.

### Cambiado

- Rediseño del panel de administración.

## [0.1.3] — 2026-08-18

### Añadido

- Botón de cerrar sesión y rediseño del carrito.

## [0.1.2] — 2026-08-17

### Añadido

- Rediseño de Home, Kiosko, Préstamo Rápido y Admin.
- Script `scripts/publish-release.sh` para liberar versiones vía tags `v*`.

### Corregido

- Filtros de inventario en una sola fila, con botón de limpiar.

## [0.1.1] — 2026-08-16

Primera versión publicada con instalador.

### Añadido

- Kiosko de préstamo a profesores, panel de Admin y Préstamo Rápido con login.
- CI que compila el instalador de Windows y publica el Release al crear un tag `v*`.

---

[0.6.0]: https://github.com/Leoglez10/app-prestamos-p15/releases/tag/v0.6.0
[0.5.1]: https://github.com/Leoglez10/app-prestamos-p15/releases/tag/v0.5.1
[0.5.0]: https://github.com/Leoglez10/app-prestamos-p15/releases/tag/v0.5.0
[0.4.0]: https://github.com/Leoglez10/app-prestamos-p15/releases/tag/v0.4.0
[0.3.0]: https://github.com/Leoglez10/app-prestamos-p15/releases/tag/v0.3.0
[0.2.1]: https://github.com/Leoglez10/app-prestamos-p15/releases/tag/v0.2.1
[0.2.0]: https://github.com/Leoglez10/app-prestamos-p15/releases/tag/v0.2.0
[0.1.5]: https://github.com/Leoglez10/app-prestamos-p15/releases/tag/v0.1.5
[0.1.3]: https://github.com/Leoglez10/app-prestamos-p15/releases/tag/v0.1.3
[0.1.2]: https://github.com/Leoglez10/app-prestamos-p15/releases/tag/v0.1.2
[0.1.1]: https://github.com/Leoglez10/app-prestamos-p15/releases/tag/v0.1.1
