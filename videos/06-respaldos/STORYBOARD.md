---
format: 1920x1080
duration: 170s
message: "El archivo .db reemplaza toda la base; el CSV de toma física fusiona solo el recorrido"
arc: Promesa → Regla de oro → Red de seguridad → Automatización → Límite → Nube segura → Manual → Restaurar → Riesgo → Fusión → Pendientes → Recordatorio
audience: Persona administradora de la Preparatoria 15 — sin perfil técnico
mode: autonomous
music: calm
---

## Video direction

**Sistema visual de la serie.** `frame.md` manda: fondo `#f8fafc`, texto `#0f172a`,
azul P15 `#2563eb`, Space Grotesk para titulares y números, Inter para interfaz.
Tarjetas tintadas sin sombra. El rojo `#dc2626` se reserva para reemplazo/riesgo y el
verde `#15803d` para fusión/seguridad.

**Ancla inmutable.** La comparación `.db` / `.csv` usa SIEMPRE dos tarjetas de 660×430,
separadas por 48px y centradas sobre el eje real de la pantalla. Izquierda: rojo,
`.db`, `REEMPLAZA`, `LA BASE COMPLETA`. Derecha: verde, `.csv`, `FUSIONA`,
`SOLO EL RECORRIDO`. La geometría y la jerarquía no cambian en las escenas 2, 9 y 12.

**UI reconstruida.** Las pantallas del Admin son HTML deliberadamente legible, sin
chrome de navegador, sin captura y sin datos reales. El cursor es un SVG de 112px que
entra físicamente desde fuera del cuadro, aterriza con la punta y cada clic causa el
cambio de estado en el mismo fotograma.

**Movimiento.** Corriente dominante hacia la izquierda. Cada escena revela información
cuando la voz la nombra; cero respiraciones o flotación de relleno. Los sostenidos son
quietos. Los cortes maestros siguen cut-the-curve en X; el paso al peligro del `.db`
usa rojo como única ruptura semántica. Los fondos son capas `.clip` full-bleed.

**Subtítulos.** Son overlay, no banda reservada. La composición usa el centro real. Solo
se evita colocar texto crítico pequeño en los 80px inferiores del centro.

## Frame 1 — Portada

- scene: Logo P15 y título “No perder datos” sobre una ruta de dos computadoras
- duration: 8s
- poster: 4s
- transition_in: cut
- status: outline
- blueprint: titlecard-reveal (Adapt)
- focal: el titular “No perder datos”
- roles: logo P15 = apoyo · dos monitores unidos por una línea azul = midground · retícula azul = fondo
- sfx: soft-riser
- voiceover: "Este es el video que evita el desastre: cómo se respalda la app, cómo se recupera, y cómo trabajar en dos computadoras sin perder nada."
- src: compositions/frames/01-portada.html

Scene 1 (0–1.8s): el eyebrow `VIDEO 6 DE 6 · RESPALDOS` entra con waterfall entry.
Scene 2 (1.8–5.5s): `No perder datos` se arma por palabras; dos monitores aparecen a ambos lados y una línea azul los conecta.
Scene 3 (5.5–8s): el logo P15 aterriza y todo queda quieto.

## Frame 2 — La regla de oro

- scene: Las tarjetas `.db` REEMPLAZA y `.csv` FUSIONA quedan enfrentadas
- duration: 14s
- poster: 8s
- transition_in: cut
- status: outline
- blueprint: comparison-split (Adapt)
- focal: la pareja de tarjetas roja y verde
- roles: `.db` roja = riesgo · `.csv` verde = camino seguro · línea divisoria = contraste
- sfx: whoosh-soft, chime-soft
- voiceover: "Guárdate esta imagen. El archivo punto d-b es la base completa: cuando entra, reemplaza todo. El archivo c-s-v es solo el resultado de un recorrido: cuando entra, se fusiona con lo que ya hay. Confundirlos es la única forma de perder trabajo en esta app."
- src: compositions/frames/02-regla-oro.html

Scene 1 (0–2s): título `LA REGLA DE ORO`; las dos tarjetas entran juntas desde el centro.
Scene 2 (2–7s): la tarjeta `.db` recibe un barrido rojo y revela `REEMPLAZA · la base completa`.
Scene 3 (7–11.5s): la tarjeta `.csv` recibe un barrido verde y revela `FUSIONA · solo el recorrido`.
Scene 4 (11.5–14s): aparece `NO LOS CONFUNDAS` entre ambas y la pareja sostiene.

## Frame 3 — Los tres tipos de respaldo

- scene: Tabla de Respaldos con Automático, Manual y Previo a restaurar
- duration: 16s
- poster: 8s
- transition_in: cut
- status: outline
- blueprint: grid-card-assemble (Adapt)
- focal: la columna Tipo de la tabla
- roles: tabla Admin = sujeto · filas resaltadas = secuencia · rutas ficticias = detalle
- sfx: click-soft, pop-soft
- voiceover: "Hay tres tipos de respaldo, y los distingues por el nombre del archivo. El automático lo hace la app sola. El manual lo haces tú. Y el de “previo a restaurar” lo crea la app justo antes de sobrescribir algo, sin que se lo pidas: esa es tu red de seguridad."
- src: compositions/frames/03-tipos.html

Scene 1 (0–3s): entra la sección `Respaldos` y la tabla completa.
Scene 2 (3–7s): se ilumina `Automático` y crece `prestamos-auto-2026…db`.
Scene 3 (7–10.5s): se ilumina `Manual` y crece `prestamos-backup-2026…db`.
Scene 4 (10.5–16s): se ilumina `Previo a restaurar`; un escudo azul aparece junto a `red de seguridad`.

## Frame 4 — El automático ya está encendido

- scene: Configuración de respaldo automático con cuatro frecuencias fijas
- duration: 16s
- poster: 8s
- transition_in: cut
- status: outline
- blueprint: settings-toggle-flow (Adapt)
- focal: el interruptor “Respaldo automático” encendido
- roles: toggle = acción · menú de cuatro opciones = prueba · nota de 20 = regla
- sfx: click-soft
- voiceover: "El respaldo automático viene encendido de fábrica, cada doce horas. Puedes cambiarlo a seis horas, un día o una semana. Se conservan los últimos veinte automáticos: los viejos se van borrando. Ojo con esto, porque los manuales no se borran nunca."
- src: compositions/frames/04-automatico.html

Scene 1 (0–3s): el toggle verde ya aparece activo junto a `Respaldo automático`.
Scene 2 (3–9s): el selector se abre y muestra exactamente `Cada 6 horas`, `Cada 12 horas`, `Una vez al día`, `Una vez por semana`.
Scene 3 (9–13s): `20 automáticos` toma el foco y una pila elimina el más viejo.
Scene 4 (13–16s): `Los manuales no se borran solos` queda subrayado en azul.

## Frame 5 — La app tiene que estar abierta

- scene: Dos computadoras comparan app abierta contra computadora apagada
- duration: 12s
- poster: 6s
- transition_in: cut
- status: outline
- blueprint: split-cards (Compose)
- focal: el reloj `cada 15 min` de la computadora abierta
- roles: monitor abierto = funciona · monitor apagado = no funciona · archivo `.db` = resultado
- sfx: tick, chime-soft
- voiceover: "Una advertencia importante: la app revisa cada quince minutos si ya toca respaldar, pero solo mientras está abierta. No hay nada corriendo por detrás. Si la computadora está apagada, no se respalda nada."
- src: compositions/frames/05-abierta.html

Scene 1 (0–3s): aparecen los dos monitores, el izquierdo con la app, el derecho apagado.
Scene 2 (3–7s): el reloj del izquierdo avanza `cada 15 min` y genera `prestamos-auto…db`.
Scene 3 (7–10s): una X roja cubre el reloj del monitor apagado.
Scene 4 (10–12s): `APP CERRADA = SIN RESPALDO` queda quieto.

## Frame 6 — Google Drive: dos carpetas

- scene: Explorador con `backups`, `reportes` y `prestamos.db` como hermanos
- duration: 20s
- poster: 11s
- transition_in: cut
- status: outline
- blueprint: file-flow-diagram (Compose)
- focal: las carpetas `backups` y `reportes` con check verde
- roles: explorador = sujeto · checks Drive = acciones · carpeta padre con X = prohibición
- sfx: pop-soft, error-soft
- voiceover: "Para que los respaldos también queden en la nube, se conecta Google Drive con el correo de la escuela y se agregan dos carpetas: “backups”, y también “reportes”, que es donde caen los reportes de la toma física. Son carpetas hermanas: hay que agregarlas por separado. Y nunca, nunca agregues la carpeta que las contiene: ahí vive la base de datos viva, y Drive la corrompe."
- src: compositions/frames/06-drive.html

Scene 1 (0–4s): la ventana `com.p15.prestamos` muestra tres hijos al mismo nivel.
Scene 2 (4–9s): check verde de Drive sobre `backups`; etiqueta `Agregar por separado`.
Scene 3 (9–13s): otro check sobre `reportes`; nota `Aquí cae la toma física`.
Scene 4 (13–18s): el marco de la carpeta padre se pinta rojo y una X lo cruza; `prestamos.db` pulsa una vez como peligro.
Scene 5 (18–20s): nota pequeña `Drive es un espejo: si se borra aquí, también se borra allá.`

## Frame 7 — Un respaldo a mano

- scene: Crear respaldo agrega una fila Manual y Abrir carpeta lleva al archivo
- duration: 12s
- poster: 7s
- transition_in: cut
- status: outline
- blueprint: cursor-ui-demo (Adapt)
- focal: botón `Crear respaldo`
- roles: botones = acciones · mensaje verde = confirmación · fila Manual = resultado
- sfx: click-soft, chime-soft
- voiceover: "Antes de algo grande —importar el Excel, actualizar la app, cerrar el ciclo escolar— haz uno a mano con “Crear respaldo”. Ese no se borra solo. Con “Abrir carpeta” llegas al archivo para copiarlo a una USB."
- src: compositions/frames/07-manual.html

Scene 1 (0–3s): cursor entra desde abajo y apunta a `Crear respaldo`.
Scene 2 (3–6s): clic; aparece `Respaldo creado en …` con ruta abreviada.
Scene 3 (6–9s): la tabla gana una fila `Manual`.
Scene 4 (9–12s): cursor hace clic en `Abrir carpeta`; una USB aparece junto al archivo.

## Frame 8 — Restaurar

- scene: Restaurar e Importar respaldo muestran advertencia y recarga automática
- duration: 18s
- poster: 10s
- transition_in: cut
- status: outline
- blueprint: cursor-ui-demo (Adapt)
- focal: el modal con “Todo lo que se haya registrado después de esa fecha se perderá”
- roles: botón Restaurar = camino interno · Importar respaldo = camino USB · recarga = resultado
- sfx: click-soft, warning-soft, chime-soft
- voiceover: "Para volver atrás, cada fila de la tabla trae su botón “Restaurar”. Y si el archivo viene de fuera —de una USB o descargado de Drive— usa “Importar respaldo”. En los dos casos la app te avisa qué va a pasar, guarda ese respaldo de seguridad previo, y se recarga sola al terminar."
- src: compositions/frames/08-restaurar.html

Scene 1 (0–4s): cursor pulsa `Restaurar` en una fila.
Scene 2 (4–8s): modal centrado; la advertencia completa permanece legible al menos 2s.
Scene 3 (8–12s): aparece `Previo a restaurar` en la tabla y un mensaje verde.
Scene 4 (12–15s): la app se recarga con un barrido azul de 1.2s.
Scene 5 (15–18s): corte a `Importar respaldo` con un archivo USB `prestamos-backup…db`.

## Frame 9 — Por eso el .db no sirve para volver

- scene: La tarjeta roja `.db` domina y borra el carril de préstamos de la principal
- duration: 14s
- poster: 8s
- transition_in: cut
- status: outline
- blueprint: comparison-split (Adapt)
- focal: tarjeta roja `.db REEMPLAZA`
- roles: carril principal = préstamos · carril segunda PC = recorrido · flecha `.db` = peligro
- sfx: warning-soft, scratch
- voiceover: "Aquí está la trampa. Si la segunda computadora te devuelve su base completa, borra todos los préstamos que la principal registró mientras tanto. El punto d-b sirve para montar la segunda computadora, una sola vez. Para traer el trabajo de vuelta, nunca."
- src: compositions/frames/09-db-peligro.html

Scene 1 (0–2s): reaparece la pareja de tarjetas sin animación de entrada; la roja queda al 100%, la verde al 35%.
Scene 2 (2–7s): dos carriles muestran `Principal · préstamos del día` y `Segunda PC · toma física`.
Scene 3 (7–10.5s): el `.db` viaja de la segunda a la principal y una X roja tacha tres préstamos.
Scene 4 (10.5–14s): `PARA VOLVER: NUNCA` queda debajo de la tarjeta roja.

## Frame 10 — Lo que sí vuelve: el reporte

- scene: Exportar reporte en la segunda PC y fusionarlo en el panel correcto de Inventario
- duration: 24s
- poster: 14s
- transition_in: cut
- status: outline
- blueprint: screen-flow-carousel (Adapt)
- focal: el panel `Traer la toma física de otra computadora`
- roles: exportación CSV = origen · dos paneles de Inventario = orientación · cuatro cifras = vista previa · botón Fusionar = acción
- sfx: click-soft, whoosh-soft, chime-soft
- voiceover: "Lo que sí vuelve es el reporte. En la segunda computadora, “Exportar reporte”. En la principal, pestaña Inventario, hasta abajo: “Traer la toma física de otra computadora”. Eliges el archivo y la app te muestra qué va a pasar antes de tocar nada: cuántos aparecieron, cuántos no, y cuántos ya estaban al día. Confirmas, y listo. Solo escribe lo del recorrido. Los préstamos no se tocan."
- src: compositions/frames/10-csv-fusion.html

Scene 1 (0–4s): en la segunda PC, cursor pulsa `Exportar reporte`; nace `reporte-inventario-2026-08-25.csv`.
Scene 2 (4–8s): el CSV viaja hacia la principal con una estela verde.
Scene 3 (8–12s): `Admin · Inventario` muestra juntos `Importar Excel de Patrimonio` arriba y `Traer la toma física de otra computadora` abajo.
Scene 4 (12–17s): el encuadre baja al panel correcto y aparecen `18 aparecieron · 3 no aparecieron · 9 ya estaban al día · 2 sin recorrer`.
Scene 5 (17–21s): recuadro `Esto fusiona, no reemplaza`; cursor pulsa `Fusionar el recorrido`.
Scene 6 (21–24s): tres chips azules `préstamos intactos` permanecen inmóviles mientras la toma física se actualiza.

## Frame 11 — Lo que no se fusiona solo

- scene: Desplegable de equipos que no existen y recordatorio del dato más nuevo
- duration: 10s
- poster: 6s
- transition_in: cut
- status: outline
- blueprint: panel-edit-live-sync (Adapt)
- focal: `3 equipos del reporte no existen en esta base`
- roles: lista de IDs = pendientes · categoría vacía = razón · sello dato más nuevo = regla
- sfx: click-soft
- voiceover: "Una sola cosa queda pendiente: los equipos que se dieron de alta al vuelo allá todavía no existen aquí. La app te los lista para que los des de alta a mano, porque el reporte no trae su categoría y elegirla por ti sería adivinar."
- src: compositions/frames/11-pendientes.html

Scene 1 (0–3s): se abre el desplegable y revela `P15-ALTA-041`, `P15-ALTA-052`, `P15-ALTA-063`.
Scene 2 (3–7s): cada ID recibe la etiqueta `Dar de alta a mano`; una categoría con `?` explica el motivo.
Scene 3 (7–10s): sello azul `Gana el dato más nuevo, equipo por equipo` y nota `Traerlo otra vez no cambia nada`.

## Frame 12 — Cierre

- scene: Logo P15 y la regla final `.db reemplaza · .csv fusiona`
- duration: 6s
- poster: 3s
- transition_in: cut
- status: outline
- blueprint: titlecard-reveal (Adapt)
- focal: la pareja de tarjetas inmutable
- roles: tarjetas = regla · logo P15 = firma · retícula azul = fondo
- sfx: soft-outro
- voiceover: ""
- src: compositions/frames/12-cierre.html

Scene 1 (0–1s): aparece la pareja de tarjetas en la misma geometría de la escena 2, sin entrada.
Scene 2 (1–3s): debajo se revela `El .db reemplaza. El .csv fusiona.` y el logo P15.
Scene 3 (3–6s): silencio absoluto y cuadro completamente quieto.
