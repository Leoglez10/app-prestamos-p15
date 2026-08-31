---
format: 1920x1080
duration: 140s
message: "La escuela deja la app lista sola, y sin dejar un PIN de fabrica puesto"
arc: Encuadre → Entrar → Profesores → El PIN → El admin de fabrica → Categorias → Prestable o no → Como se cuenta → La pistola → El kiosko → Cierre
audience: La persona que administra la app en la Preparatoria 15 — no todo el personal
mode: autonomous
music: calm
---

## Video direction

**El caso especial de esta serie.** El tema ES la interfaz, asi que las pantallas se
reconstruyen a proposito en HTML. Sigue prohibido: chrome de navegador, barras de scroll
reales, cursores del sistema, capturas de pantalla. El cursor es un elemento dibujado.

**Continuidad con el video 1.** Misma reticula de hairlines, mismo halo radial, mismo cursor,
mismo cierre. Quien vea los seis seguidos tiene que sentir que es una sola serie.

**Fidelidad de los rotulos.** Se copian literal de `Admin.tsx`. A diferencia de los modales
del kiosko, aqui casi todos llevan acento correcto: `Directorio de Profesores`, `Hacer
administrador`, `PIN de administrador`, `Prestable en kiosko`, `Solo inventario`, `Equipo
unico`, `Por cantidad`, `Mostrar catalogo para prestamos`.

**Nada de PINes legibles.** Los campos de PIN se tecleaN como puntos. El codigo del admin
precargado va DIFUMINADO en la unica escena donde aparece su fila. Es una decision de
alcance, no un detalle de estilo — ver `GUION.md` § 3.

**Paleta** — de `frame.md`, por rol. `primary` es el azul de la app y marca la accion
principal; `positive` el verde de "activo/prestable"; `negative` el rojo de la advertencia
del PIN; `text` titulos, `text-muted` apoyo.

**Gramatica de movimiento** — asentado largo, `power3`, sin rebote. En t=0 solo entra lo que
la voz esta diciendo; cada pieza aparece cuando la voz la nombra, repartida hacia el 50%
final. El cursor dibujado nunca teletransporta: se mueve, presiona y suelta.

**Ritmo — frames sostenidos.** El 1 y el 11 son planos de respiro. El **frame 4 sostiene
despues de la correccion**: la advertencia del PIN necesita quedarse quieta en pantalla para
que se lea. Los demas revelan al ritmo de la voz. Durante un sostenido, solo jitter sutil.

**Banda de subtitulos.** El 17% inferior queda libre. La superficie de la app puede ser
full-bleed como fondo, pero todo lo que hay que LEER se compone dentro del 83% superior.

**Lista negra** — sin chrome de navegador, sin cursores del sistema, sin capturas; sin
degradados morado-azul; sin slideshow ni salvapantallas; sin datos reales de personal; **sin
ningun PIN ni codigo de administrador legible en pantalla.**

## Frame 1 — Portada

- scene: El titulo "Configuracion inicial" aterriza sobre el fondo claro, con el logo P15
- duration: 7.941s
- poster: 5s
- transition_in: cut
- status: animated
- blueprint: titlecard-reveal (Reproduce)
- focal: el titular "Configuracion inicial"
- roles: titular = foreground subject · reticula de hairlines en `primary` al 8% = background · logo P15 (`public/logo-p15.png`) + eyebrow "Video 2 de 6 · Admin" = supporting
- sfx: soft-riser
- voiceover: "Antes de que nadie pida un solo equipo, hay que dejar la app lista. Se hace una vez, y se hace desde aqui."
- src: compositions/frames/01-portada.html

Encuadra el video: esto se hace UNA vez y desde UN lugar. Rima visual exacta con la portada
del video 1 para que se lea como serie.

Scene 1 (0–1.8s): lienzo claro con la reticula de hairlines (background, halo radial detras del centro). Solo el eyebrow "VIDEO 2 DE 6 · ADMIN" entra arriba con spring-pop entrance de asentado largo — Centrado, tercio superior.
Scene 2 (1.8–4.8s): sobre "dejar la app lista", el titular "Configuracion inicial" se arma con per-word staggered reveal, ~55% del ancho.
Scene 3 (4.8–7.941s): sobre "se hace desde aqui", el logo P15 entra a la izquierda con ambient glow bloom y el plano SE QUEDA QUIETO — hold, solo jitter sutil.

## Frame 2 — Entrar a Admin

- scene: Pantalla "Acceso Admin P15"; se entra y aparece la barra de seis pestanas
- duration: 11.102s
- poster: 9s
- transition_in: crossfade
- status: animated
- blueprint: prompt-type-submit-generate (Adapt)
- focal: la tarjeta de acceso y, despues, la barra lateral de pestanas
- roles: tarjeta "Acceso Admin P15" = foreground subject · lienzo claro con halo = background · barra de seis pestanas con tres resaltadas = supporting
- sfx: key-tap, click-soft, chime-soft
- voiceover: "Entra con tu codigo de profesor y tu PIN de administrador. Aqui adentro hay seis secciones; para dejar la app lista solo necesitas tres."
- src: compositions/frames/02-acceso.html

La puerta. Lo que importa del beat no es el login sino lo que hay detras: seis secciones que
podrian abrumar, reducidas a tres.

Adapt: se conserva el movimiento firma — se escribe en un input real y la maquina responde. La respuesta no es una generacion, es que se abre el panel y aparece la barra de secciones.

Scene 1 (0–2.2s): la tarjeta "Acceso Admin P15" entra centrada con su subtitulo real; los dos campos vacios — Centrado, anclado a y ≈ 0.42 de la altura, ~48% del cuadro.
Scene 2 (2.2–5s): sobre "tu codigo de profesor", type-on con caret escribe el codigo; sobre "y tu PIN", el segundo campo se llena de PUNTOS, nunca legible.
Scene 3 (5–7s): el cursor presiona Entrar con click + ripple y press-release-spring; la tarjeta hace scale-swap y sale.
Scene 4 (7–11.102s): sobre "seis secciones", la barra lateral se revela de arriba abajo con layer-reveal escalonado — Inventario, Toma de inventario, Categorias, Profesores, Reportes, Configuracion. Sobre "solo necesitas tres", asr-keyword-glow enciende Categorias, Profesores y Configuracion y las otras tres bajan a opacidad ~35%. Hold.

## Frame 3 — Dar de alta a un profesor

- scene: Directorio de Profesores: se llenan codigo y nombre, y la fila aparece con rol "Profesor"
- duration: 10.606s
- poster: 11s
- transition_in: cut
- status: animated
- blueprint: cursor-ui-demo (Reproduce)
- focal: la tarjeta "Agregar Profesor"
- roles: formulario de alta = foreground subject · tabla del directorio = background que se vuelve protagonista al final · fila nueva con su etiqueta de rol = supporting
- sfx: key-tap, click-soft, pop-soft
- voiceover: "En Profesores das de alta a quien va a usar el kiosko. Su codigo UDG y su nombre; nada mas. Ese codigo es el que va a escribir en la terminal."
- src: compositions/frames/03-profesores.html

La parte facil, y la que conecta con el video 1: el codigo que se escribe aqui es el mismo
que el profesor teclea en la terminal.

Scene 1 (0–2.3s): la pantalla "Directorio de Profesores" entra completa; el formulario "Agregar Profesor" arriba y la tabla debajo con tres filas — Asimetrico vertical, el formulario ocupa el tercio superior.
Scene 2 (2.3–4.5s): sobre "su codigo UDG", type-on con caret llena el campo `Codigo`.
Scene 3 (4.5–6.4s): sobre "y su nombre", se llena `Nombre completo`. La frase "nada mas" cierra con los dos campos llenos y el resto del formulario quieto.
Scene 4 (6.4–8.2s): el cursor presiona `Agregar`; la fila nueva entra en la tabla con spring-pop y su etiqueta de rol `Profesor`.
Scene 5 (8.2–10.606s): sobre "el que va a escribir en la terminal", zoom-to-target sobre la celda del codigo y, al lado, una miniatura del kiosko del video 1 con ese mismo codigo en su campo. Hold.

## Frame 4 — Hacer administrador, y la trampa del PIN

- scene: Se marca "Hacer administrador" con el PIN vacio, falla, y se corrige escribiendolo
- duration: 17.424s
- poster: 13s
- transition_in: crossfade
- status: animated
- blueprint: panel-edit-live-sync (Adapt)
- focal: el campo `PIN de administrador`
- roles: casilla "Hacer administrador" + campo del PIN = foreground subject · fila del profesor en la tabla = target acoplado · cartel rojo de advertencia = supporting
- sfx: click-soft, key-tap, alert-soft
- voiceover: "Si ademas va a administrar, marca la casilla y aparece el campo del PIN. Y aqui va la advertencia mas importante de este video: si dejas ese campo vacio, la app no lo deja sin PIN. Le pone el de fabrica. Escribelo siempre."
- src: compositions/frames/04-pin.html

**El beat que justifica el video.** Se ensena como error primero y correccion despues: se
recuerda mejor lo que se vio fallar. El plano tiene que sostener la advertencia en pantalla
el tiempo suficiente para leerla dos veces.

Adapt: se conserva el movimiento firma — el panel y su objetivo cambian en el mismo beat. Lo que se acopla no es un valor visible sino una CONSECUENCIA invisible: el campo vacio y lo que la app guarda por debajo.

Scene 1 (0–3.3s): el formulario con la casilla `Hacer administrador` sin marcar. El cursor la marca con click + ripple y el campo `PIN de administrador` se despliega con layer-reveal, vacio — Asimetrico 55/45, formulario a la izquierda, fila del profesor a la derecha.
Scene 2 (3.3–6.8s): el cursor va directo a `Guardar` SIN tocar el PIN. La fila cambia su rol a `Administrador` en `positive`. Todo parece bien: ese es el punto.
Scene 3 (6.8–11.6s): sobre "la advertencia mas importante", el plano se oscurece un paso y un cartel en `negative` entra con spring-pop debajo del campo vacio: `sin PIN propio → queda con el PIN de fabrica`. Una linea dibujada (css-marker-patterns) une el campo vacio con el cartel.
Scene 4 (11.6–14.9s): sobre "Escribelo siempre", el cursor vuelve al campo y type-on lo llena de PUNTOS; el cartel rojo hace scale-swap con uno en `positive`: `PIN propio, guardado`.
Scene 5 (14.9–17.424s): hold deliberado sobre el estado corregido. Sin jitter. Es la imagen que tiene que quedarse.

## Frame 5 — El administrador que ya viene puesto

- scene: La fila del admin precargado, con su codigo difuminado, recibe un PIN nuevo
- duration: 12.513s
- poster: 8s
- transition_in: cut
- status: animated
- blueprint: cursor-ui-demo (Adapt)
- focal: la fila del administrador precargado
- roles: fila con el codigo difuminado = foreground subject · resto de la tabla = background · sello "Cambialo hoy" = supporting
- sfx: click-soft, key-tap
- voiceover: "La app viene con una cuenta de administrador ya creada, para que puedas entrar la primera vez. Cambiale el PIN hoy mismo, antes de usarla con la escuela."
- src: compositions/frames/05-admin-fabrica.html

Cierra el hueco que deja el frame 4: no basta con poner bien los PINes nuevos, hay uno que ya
estaba puesto. **El codigo va difuminado a proposito** — ver `GUION.md` § 3.

Adapt: se conserva el cursor que conduce y cambia el estado. Se cambia el objetivo: no se crea nada, se corrige algo que la app dejo puesto de fabrica.

Scene 1 (0–3.1s): la tabla del directorio con la fila del admin precargado destacada; su celda de codigo entra YA difuminada, con un candado pequeno al lado — Centrado sobre la tabla, ~50% del cuadro.
Scene 2 (3.1–6.5s): sobre "para que puedas entrar la primera vez", la fila se ilumina y su etiqueta `Administrador` late una vez con asr-keyword-glow.
Scene 3 (6.5–9.8s): sobre "Cambiale el PIN hoy mismo", el cursor presiona editar, el campo del PIN se abre y type-on lo llena de PUNTOS.
Scene 4 (9.8–12.513s): un sello en `primary` entra rotado sobre la fila: `Cambialo hoy`. Hold con jitter sutil.

## Frame 6 — Crear categorias

- scene: Se escribe el nombre de una categoria y la lista se va poblando
- duration: 8.046s
- poster: 9s
- transition_in: crossfade
- status: animated
- blueprint: grid-card-assemble (Adapt)
- focal: la lista de categorias armandose
- roles: filas de categoria = foreground subject · formulario `Nombre de la categoria` = supporting · panel de fondo = background
- sfx: key-tap, pop-soft
- voiceover: "En Categorias organizas el equipo: proyectores, laptops, cables. Un nombre y listo."
- src: compositions/frames/06-categorias.html

La parte facil, y va rapido a proposito: el video no puede demorarse aqui porque lo que
importa viene en el frame siguiente.

Adapt: se conserva el movimiento firma — los elementos se auto-ensamblan en cascada escalonada. Lo que se ensambla no es una rejilla decorativa sino la tabla real de categorias, y cada fila entra cuando la voz nombra su categoria.

Scene 1 (0–1.7s): la pantalla `Categorias` con el formulario arriba y la tabla vacia debajo — Asimetrico vertical, tabla ocupando el 60% inferior del area legible.
Scene 2 (1.7–3.4s): sobre "organizas el equipo", type-on escribe `Proyector` en el campo y el cursor presiona agregar; la primera fila entra con spring-pop.
Scene 3 (3.4–5.8s): sobre "proyectores, laptops, cables", las otras dos filas entran en cascada escalonada, una por palabra hablada, cada una con su columna `Articulos`.
Scene 4 (5.8–8.046s): sobre "un nombre y listo", una cuarta fila entra sola y la tabla queda completa. Hold.

## Frame 7 — Prestable o solo inventario

- scene: El toggle cambia de "Visible para profesores" a "Solo inventario" y el kiosko pierde la categoria
- duration: 18.704s
- poster: 16s
- transition_in: cut
- status: animated
- blueprint: comparison-split (Adapt)
- focal: el toggle `Prestable en kiosko` en sus dos estados
- roles: tarjeta de categoria con su toggle = foreground subject · miniatura del kiosko del profesor = target acoplado · insignias `Activo` / `Oculto` = supporting
- sfx: click-soft, whoosh-soft, chime-soft
- voiceover: "Cada categoria decide si se presta o si solo se inventaria. En 'Solo inventario' el equipo sigue existiendo, sigue contandose, pero desaparece del catalogo del profesor. Es un interruptor por categoria, y apaga todos sus equipos de golpe."
- src: compositions/frames/07-prestable.html

**El concepto que mas confunde de toda la app**, y el que prepara el video 3 (donde todo lo
importado entra apagado). La regla vive en `esPrestableEfectivo`: un equipo solo se presta si
el equipo Y su categoria lo permiten. Por eso apagar la categoria apaga todo sin reescribir
nada.

Adapt: se conserva el movimiento firma — dos elementos de igual peso entran desde lados opuestos con inclinaciones 3D espejadas y se sostienen lado a lado. Los dos elementos no son productos: son los DOS ESTADOS del mismo interruptor, y debajo de cada uno cuelga su consecuencia en el kiosko.

Scene 1 (0–3.4s): entra sola la tarjeta de la categoria `Proyector` con su toggle en `Prestable en kiosko` · `Visible para profesores` · insignia verde `Activo` — Centrado, ~45% del cuadro.
Scene 2 (3.4–7.3s): sobre "si se presta o si solo se inventaria", el cuadro se abre en split: la tarjeta viaja al ala izquierda y desde el ala derecha entra su gemela con inclinacion espejada, en estado `Solo inventario` · insignia gris `Oculto`.
Scene 3 (7.3–11.4s): sobre "sigue existiendo, sigue contandose", bajo la tarjeta derecha entra la fila del inventario con su contador de articulos INTACTO y una marca `positive`: el equipo no se borro.
Scene 4 (11.4–15.6s): sobre "desaparece del catalogo del profesor", bajo la misma tarjeta derecha entra una miniatura del kiosko del video 1 y la categoria se apaga de su lista con hard-cut. La miniatura izquierda la mantiene encendida. La comparacion queda completa.
Scene 5 (15.6–18.704s): sobre "apaga todos sus equipos de golpe", cuatro chips de equipo bajo la tarjeta derecha se apagan en cascada rapida. Hold.

## Frame 8 — Unico, por cantidad, o varios de golpe

- scene: La seccion "Como se cuenta" recorre sus tres casos sin que el formulario se mueva
- duration: 22.648s
- poster: 13s
- transition_in: crossfade
- status: animated
- blueprint: fixed-anchor-cycle (Reproduce)
- focal: el par de botones `Equipo unico` / `Por cantidad`
- roles: formulario de equipo = ancla fija que nunca se mueve · region "Como se cuenta" = foreground subject que cicla · vista previa "Se creara n:" = supporting
- sfx: click-soft, pop-soft
- voiceover: "Un equipo se cuenta de dos maneras. 'Equipo unico' para lo que se presta uno por uno, con su numero de inventario. 'Por cantidad' para cables y controles, donde solo importa cuantos quedan. Y si tienes cinco laptops iguales, no las captures una por una: pon cuantas unidades y la app las crea numeradas."
- src: compositions/frames/08-como-se-cuenta.html

Tres casos en dieciocho segundos. El tercero — el alta multiple — es el que el plan original
no mencionaba y el que mas captura ahorra. La vista previa "Se creara n:" es lo que lo vende.

Scene 1 (0–4.5s): el formulario de equipo entra completo y se ANCLA: de aqui en adelante no se mueve. La seccion `Como se cuenta` queda vacia — Centrado, formulario ~55% del cuadro.
Scene 2 (4.5–10.1s): sobre "'Equipo unico'", el par de botones entra y el izquierdo se activa; debajo aparecen `Codigo o serie` e `ID de Patrimonio` con su ayuda real "Escanea la etiqueta blanca con la pistola."
Scene 3 (10.1–15.1s): sobre "'Por cantidad'", hard-cut al segundo boton: los campos anteriores se van y entra `Cantidad total` con un 10. El formulario alrededor no se movio ni un pixel — ese es el punto.
Scene 4 (15.1–19.6s): sobre "cinco laptops iguales", hard-cut de vuelta a `Equipo unico` y entra el campo `¿Cuantas unidades?` con un 5.
Scene 5 (19.6–22.648s): la vista previa `Se creara n: LAP-01 … LAP-05` entra con per-word reveal debajo del campo. Hold.

## Frame 9 — Dar de alta con la pistola

- scene: Un disparo abre la ficha de un equipo conocido; el siguiente abre el alta de uno desconocido
- duration: 13.035s
- poster: 9s
- transition_in: cut
- status: animated
- blueprint: camera-journey (Adapt)
- focal: la etiqueta de Patrimonio y las dos pantallas que abre
- roles: etiqueta + haz de escaneo = foreground subject · pestana Inventario desenfocada = background · ficha del equipo y formulario de alta = los dos destinos
- sfx: scanner-beep, whoosh-soft, pop-soft
- voiceover: "Y en Inventario no necesitas buscar nada: apunta la pistola a la etiqueta. Si el equipo ya esta, te abre su ficha. Si no esta, te abre el alta con el numero ya puesto."
- src: compositions/frames/09-pistola.html

Dos ramas del mismo gesto en un solo plano. Es el mismo movimiento que el frame 5 del video 1,
pero aqui el destino se BIFURCA — eso es lo nuevo.

Adapt: se conserva el viaje motivado de camara donde un disparo ocurre y la camara vuela hasta su consecuencia. Se recorre DOS veces, con dos consecuencias distintas: la camara vuelve al origen y sale hacia el otro lado.

Scene 1 (0–3.3s): la pestana `Inventario` de fondo, desenfocada; una etiqueta de Patrimonio dibujada entra en el tercio izquierdo con su codigo `3382871` — Regla de tercios.
Scene 2 (3.3–7.2s): sobre "Si el equipo ya esta", un haz barre la etiqueta y la camara viaja a la derecha, donde se abre la ficha del equipo con su nombre y su categoria.
Scene 3 (7.2–10.4s): la camara vuelve al centro; una segunda etiqueta con un codigo distinto (`9911042`) entra y se dispara.
Scene 4 (10.4–13.035s): sobre "te abre el alta con el numero ya puesto", la camara sale hacia el otro lado y se abre el formulario de alta VACIO salvo el campo `ID de Patrimonio`, que ya trae `9911042` resaltado en `primary`. Hold.

## Frame 10 — Ajustar el kiosko

- scene: Se apaga "Mostrar catalogo para prestamos" y el kiosko pierde su panel derecho
- duration: 13.531s
- poster: 9s
- transition_in: crossfade
- status: animated
- blueprint: panel-edit-live-sync (Reproduce)
- focal: las dos casillas del bloque `Kiosko`
- roles: bloque Kiosko de Configuracion = panel editor · miniatura del kiosko del profesor = superficie acoplada · rotulos de las casillas = supporting
- sfx: click-soft, whoosh-soft
- voiceover: "Por ultimo, en Configuracion decides que ve el profesor en la terminal: el catalogo, sus pendientes, o solo lo que necesites. Se apaga y se enciende cuando quieras."
- src: compositions/frames/10-kiosko.html

Cierra el circulo: la ultima seccion de las tres, y otra vez la consecuencia se ve, no se
describe. El editor y su objetivo comparten el plano de principio a fin.

Scene 1 (0–3.4s): split — a la izquierda el bloque `Kiosko` de Configuracion con sus dos casillas marcadas; a la derecha la miniatura del kiosko completa, con catalogo y pendientes — Split 45/55.
Scene 2 (3.4–7.2s): sobre "el catalogo", el cursor desmarca `Mostrar catalogo para prestamos` y en el MISMO beat el panel derecho de la miniatura se desmonta con layer-reveal inverso.
Scene 3 (7.2–10.6s): sobre "sus pendientes", se desmarca la segunda casilla y el panel izquierdo de la miniatura tambien se va; queda una terminal minima.
Scene 4 (10.6–13.531s): sobre "se apaga y se enciende cuando quieras", ambas casillas se vuelven a marcar y la miniatura se rearma completa. Hold.

## Frame 11 — Cierre

- scene: Logo P15 y la linea "Se configura una vez. Se usa todos los dias."
- duration: 4s
- poster: 3s
- transition_in: crossfade
- status: animated
- blueprint: titlecard-reveal (Reproduce)
- focal: la linea de cierre
- roles: linea de cierre = foreground subject · misma reticula del frame 1 = background · logo P15 (`public/logo-p15.png`) = supporting
- sfx: soft-outro
- voiceover: ""
- src: compositions/frames/11-cierre.html

Sin narracion, igual que el cierre del video 1. La linea resume el trato: el costo es de una
sola vez, el beneficio es diario.

Scene 1 (0–1.6s): vuelve el lienzo del frame 1 — misma reticula, mismo halo — y el logo P15 entra centrado con spring-pop de asentado largo. Centrado, tercio superior.
Scene 2 (1.6–4s): la linea `Se configura una vez. Se usa todos los dias.` se revela por palabra debajo del logo y el cuadro se queda completamente QUIETO. Sin jitter.
