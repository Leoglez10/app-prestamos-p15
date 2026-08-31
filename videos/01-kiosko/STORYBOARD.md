---
format: 1920x1080
duration: 111s
message: "Un profesor puede pedir y devolver equipo en el kiosko sin ayuda de nadie"
arc: Promesa → Entrar → Identificarse → Buscar → Escanear → Accesorio → Confirmar → Recibo → Devolver → Cierre
audience: Profesores de la Preparatoria 15 — usuarios finales, sin perfil tecnico
mode: autonomous
music: calm
---

## Video direction

**El caso especial de este video.** La regla general prohibe mockups de interfaz en un
faceless explainer. Aqui aplica la excepcion explicita: **el tema ES la interfaz**. Cada
pantalla de la app se reconstruye a proposito, en HTML, desde cero. Lo que sigue prohibido:
chrome de navegador, barras de scroll reales, cursores del sistema operativo, capturas de
pantalla. El cursor es un elemento dibujado y dirigido, no un puntero real.

**Fidelidad literal de los rotulos.** Los textos en pantalla se copian TAL CUAL de la app,
incluidas sus faltas de tilde: `¿Tambien necesita HDMI?`, `Agregar observacion`, `Prestamo
creado con exito`, `Si, agregar HDMI`, `Si, devolver y cerrar sesion`. Un profesor va a
comparar el video contra su terminal; si no coincide, el video pierde autoridad. La
narracion hablada si lleva acentos correctos — es otra capa.

**Paleta** — de `frame.md`, por rol, nunca inventada. `bg` es el lienzo de la app (superficie
clara); `primary` es el azul de marca de la app y marca SIEMPRE la accion principal (tarjeta
"Soy Profesor", boton "Confirmar y Llevar", categoria activa); `positive` es el verde de
"disponible" y de exito; `negative` es el rojo de "Agotado"; `text` para titulos, `text-muted`
para texto de apoyo, `text-light` para chrome. El ambar de stock bajo se compone tinteando
`negative` hacia el calido, no como color nuevo.

**Gramatica de movimiento** — asentado largo, `power3` por defecto; nada de rebote. El modelo
de revelado es el mismo en todos los frames: en t=0 solo entra lo que la voz esta diciendo, y
cada pieza siguiente aparece cuando la voz la nombra, repartida hacia el 50% final del plano.
El cursor dibujado es el hilo conductor entre frames: se mueve, presiona y suelta con
`cursor-click-ripple` + `press-release-spring`; nunca teletransporta.

**Ritmo — frames sostenidos.** Frame 1 y frame 10 son planos de respiro (un solo movimiento y
quietud). Frame 8 sostiene despues de la cuenta regresiva: la quietud es el punto, el profesor
esta leyendo su recibo. Los demas revelan al ritmo de la voz. Durante un sostenido solo se
permite jitter sutil; jamas respiracion de tarjetas ni paneo lento.

**Banda de subtitulos.** El 17% inferior queda libre. La superficie de la app puede ser
full-bleed como capa de fondo, pero todo lo que hay que LEER — botones, chips, modales, el
carrito — se compone dentro del 83% superior. Cuando un elemento vive abajo en la app real
(la barra "Confirmar y Llevar", la barra de salida), el plano hace `zoom-to-target` para
subirlo al area legible en vez de dejarlo en la banda.

**Lista negra** — sin chrome de navegador, sin barras de scroll, sin cursores del sistema, sin
capturas; sin degradados morado-azul "de IA"; sin bokeh flotante; sin slideshow (volcar todo
al inicio y congelar) y sin salvapantallas (todo flotando por su cuenta); sin datos reales de
personal.

## Frame 1 — Portada

- scene: El titulo "Prestar y devolver equipo" aterriza sobre el fondo claro, con el logo P15
- duration: 6.896s
- poster: 4s
- transition_in: cut
- status: animated
- blueprint: titlecard-reveal (Reproduce)
- focal: el titular "Prestar y devolver equipo"
- roles: titular = foreground subject · retícula de hairlines en `primary` al 8% = background · logo P15 (`public/logo-p15.png`) + eyebrow "Video 1 de 5 · Kiosko" = supporting
- sfx: soft-riser
- voiceover: "Este es el video que necesitas para el dia a dia: como pedir equipo y como devolverlo."
- src: compositions/frames/01-portada.html

Abre en frio con la promesa: al final de estos 78 segundos sabes pedir y devolver. El
subtitulo "Video 1 de 5 · Kiosko" ubica la pieza dentro de la serie sin explicarla. Beat
tranquilo, un solo movimiento: esto es capacitacion, no un promocional.

Scene 1 (0–1.6s): lienzo claro con una retícula de hairlines en `primary` al 8% (background, 3 capas de profundidad con un halo radial suave detras del centro). Solo el eyebrow "VIDEO 1 DE 5 · KIOSKO" entra arriba, spring-pop entrance con asentado largo — Centrado, alineado al tercio superior.
Scene 2 (1.6–4.1s): sobre "como pedir equipo", el titular "Prestar y devolver equipo" se arma con per-word staggered reveal, ~55% del ancho del cuadro, peso display contra el eyebrow ligero. Jerarquia por tamano 3:1 + peso.
Scene 3 (4.1–6.9s): sobre "y como devolverlo", el logo P15 aparece a la izquierda del titular con ambient glow bloom detras, y el plano SE QUEDA QUIETO — hold sostenido, solo jitter sutil en el logo. Sin paneo, sin push.

## Frame 2 — Entrar como profesor

- scene: La pantalla de inicio de la app; el cursor elige la tarjeta azul "Soy Profesor"
- duration: 10.606s
- poster: 6s
- transition_in: crossfade
- status: animated
- blueprint: cursor-ui-demo (Adapt)
- focal: la tarjeta "Soy Profesor"
- roles: las dos tarjetas de inicio = foreground subject · superficie de la app (topbar con logo, reloj, enlace Administrador) = background al ~40% · cursor dibujado + tira de metricas = supporting
- sfx: click-soft
- voiceover: "Desde la pantalla principal, toca 'Soy Profesor'. La otra tarjeta, 'Prestamo Rapido', es para alumnos y la vemos en otro video."
- src: compositions/frames/02-inicio.html

Primer contacto con la app real. Las dos tarjetas se ven juntas para que la eleccion tenga
sentido: se elige una PORQUE existe la otra. Descartar "Prestamo Rapido" aqui es lo que evita
la confusion numero uno del sistema — son dos historiales separados, no dos botones para lo
mismo.

Adapt: se conserva el movimiento firma — cursor que se desplaza, presiona y dispara el ripple sobre el objetivo. Se cambia el encadenado de varias pantallas por UNA sola pantalla reconstruida donde el estado que cambia es cual tarjeta esta viva.

Scene 1 (0–2.6s): la pantalla de inicio entra completa pero atenuada (background, layered-depth: topbar + hero "¿Que necesitas hacer?" + las dos tarjetas). Sobre "Desde la pantalla principal", las dos tarjetas suben juntas con layer-reveal. Nada esta seleccionado todavia — Layered-depth, las tarjetas ocupan ~45% del cuadro.
Scene 2 (2.6–5.8s): en el momento exacto en que la voz dice "Soy Profesor", el cursor dibujado entra desde abajo a la derecha, viaja a la tarjeta azul y hace cursor-click + ripple; la tarjeta responde con press-release-spring y su borde `primary` se enciende. Depth-of-field blur suave sobre todo lo demas.
Scene 3 (5.8–8.7s): sobre "La otra tarjeta, 'Prestamo Rapido'", el foco se invierte: un circulo dibujado a mano (css-marker-patterns) rodea la segunda tarjeta y una etiqueta corta "alumnos → video 4" aparece junto a ella con per-word reveal.
Scene 4 (8.7–10.6s): la etiqueta se desvanece, el circulo se borra en sentido inverso y el cuadro queda quieto con la tarjeta azul aun encendida — hold; el ojo se queda donde va a continuar la historia.

## Frame 3 — Tu codigo

- scene: Se teclea el codigo 2958101 en "Ingresa tu Codigo" y entra la sesion del profesor
- duration: 9.404s
- poster: 6s
- transition_in: cut
- status: animated
- blueprint: prompt-type-submit-generate (Adapt)
- focal: el campo de codigo con el caret escribiendo
- roles: tarjeta de login (h1 "Ingresa tu Codigo", campo, boton "Identificarse") = foreground subject · lienzo claro con halo radial = background · barra de nombre del profesor que aparece al final = supporting
- sfx: key-tap, chime-soft
- voiceover: "Escribe tu codigo de profesor y presiona Identificarse. No necesitas contrasena: el codigo es suficiente."
- src: compositions/frames/03-codigo.html

El miedo del profesor no tecnico es la contrasena que no recuerda. Se despeja de inmediato:
solo el codigo. El pago del beat es ver aparecer su propio nombre arriba — la app lo reconocio.

Adapt: se conserva el movimiento firma — se escribe en un input real del producto y la maquina responde. Se cambia la respuesta: no hay streaming de IA, la respuesta es que la sesion se abre y aparece el nombre del profesor.

Scene 1 (0–1.9s): la tarjeta de login entra sola y centrada sobre el lienzo claro, ~50% del cuadro; el h1 "Ingresa tu Codigo" y el subtitulo se revelan por palabra. El campo esta vacio con su placeholder "Código (Ej. 2958101)" en `text-light` — Centrado, anclado a y ≈ 0.42 de la altura.
Scene 2 (1.9–4.5s): sobre "Escribe tu codigo", type-on con caret parpadeante: `2958101` se teclea digito por digito dentro del campo, que se ilumina con borde `primary` al recibir foco.
Scene 3 (4.5–6.3s): sobre "presiona Identificarse", el cursor baja al boton `primary`, click + ripple, press-release-spring; el boton se hunde y recupera.
Scene 4 (6.3–9.4s): sobre "No necesitas contrasena", la tarjeta de login hace scale-swap con la barra de sesion: sale encogiendo mientras entra "Prof. Ana Ramirez — ID: 2958101" en su lugar. Junto a ella, tachado y en `text-light`, un pequeno rotulo "contraseña" se marca con una linea de scribble y se desvanece. Hold final sin movimiento.

## Frame 4 — Encontrar el equipo

- scene: El catalogo a la derecha; se filtra por categoria y luego se escribe "dell" en el buscador
- duration: 18.233s
- poster: 7s
- transition_in: crossfade
- status: animated
- blueprint: cursor-ui-demo (Reproduce)
- focal: la rejilla de tarjetas de equipo del catalogo
- roles: catalogo + lista lateral de categorias = foreground subject · panel izquierdo "Por devolver" atenuado = background · chips de estado (verde "Listo para llevar", ambar "2 disponibles", rojo "Agotado") + buscador = supporting
- sfx: click-soft, whoosh-soft
- voiceover: "A la derecha esta el catalogo. Puedes filtrar por categoria, o escribir directo: busca por nombre, marca, modelo o numero de inventario. Ojo, al escribir se busca en todo el equipo de la prepa, no solo en la categoria que elegiste."
- src: compositions/frames/04-catalogo.html

Dos caminos hacia lo mismo, y el segundo tiene una trampa que hay que decir en voz alta: al
escribir, el filtro de categoria deja de aplicar. Un profesor que no lo sabe cree que la app
le miente. Los chips de estado (verde, ambar, rojo) entran aqui porque son el lenguaje con el
que la app dice si algo se puede llevar.

Scene 1 (0–4s): la pantalla partida de la sesion iniciada, encuadre asimetrico 30/70 — a la izquierda "Por devolver" atenuado al ~35% (background), a la derecha el panel "Tomar equipo nuevo". Sobre "A la derecha esta el catalogo", zoom-to-target lleva el encuadre al panel derecho y lo sube fuera de la banda de subtitulos.
Scene 2 (4–7.7s): sobre "filtrar por categoria", la columna de categorias se revela de arriba abajo con stagger; el cursor hace click en "Proyector" y la tarjeta activa se enciende en `primary`. La rejilla de equipos se recompone con cluster→outward expansion.
Scene 3 (7.7–11.7s): sobre "busca por nombre, marca, modelo o numero de inventario", type-on con caret escribe `dell` en el buscador; los cuatro criterios aparecen como cuatro etiquetas cortas apiladas junto al campo, una por palabra hablada (per-word staggered reveal).
Scene 4 (11.7–15.7s): sobre "Ojo", el aviso: la categoria activa PIERDE su relleno `primary` (hard-cut, sin fade) y un circulo dibujado a mano la rodea mientras la rejilla se repuebla con equipos de otras categorias. Es el momento clave del frame y ocurre en el ultimo tercio.
Scene 5 (15.7–18.2s): las tarjetas restantes muestran sus chips — verde "Listo para llevar", ambar "2 disponibles", rojo "Agotado" — con asr-keyword-glow encadenado, y el plano se detiene. Hold con jitter sutil.

## Frame 5 — La pistola de codigo de barras

- scene: La pistola dispara sobre una etiqueta de Patrimonio y el equipo vuela solo al carrito
- duration: 14.054s
- poster: 5s
- transition_in: cut
- status: animated
- blueprint: camera-journey (Adapt)
- focal: la etiqueta de Patrimonio con su codigo de barras
- roles: etiqueta + haz de escaneo = foreground subject · superficie del catalogo desenfocada = background · buscador que recibe el codigo + carrito destino = supporting
- sfx: scanner-beep, whoosh-soft, pop-soft
- voiceover: "Si el equipo trae etiqueta de Patrimonio, solo escanealo. Se agrega solo, sin tocar nada mas. Y como usa el numero exacto de la etiqueta, nunca te va a meter otro equipo parecido."
- src: compositions/frames/05-pistola.html

El beat que mas tiempo ahorra y el unico que se siente magico. La camara viaja del disparo a
su consecuencia: causa y efecto en un solo movimiento. La segunda frase no es un adorno — es
la razon tecnica por la que se confia en el escaneo, y responde de antemano al "¿y si agarra
otro?".

Adapt: se conserva el movimiento firma — el viaje motivado de camara (A: ida y vuelta de accion), donde un disparo ocurre y la camara vuela hasta donde se renderiza la consecuencia. Se cambia el clic del cursor por el disparo de la pistola: el gatillo es un haz, no un click.

Scene 1 (0–3.2s): plano cerrado sobre una etiqueta de Patrimonio dibujada (codigo de barras Code 39 con sus asteriscos delimitadores y el numero `2310216` debajo), ~55% del cuadro sobre el catalogo desenfocado — Regla de tercios, la etiqueta en el tercio izquierdo. SVG self-draw traza las barras de izquierda a derecha.
Scene 2 (3.2–5.6s): sobre "solo escanealo", un haz rojo barre la etiqueta de arriba abajo y da el beep; el numero `2310216` se desprende de la etiqueta y sale disparado con motion-blur streak.
Scene 3 (5.6–8.8s): sobre "Se agrega solo", pan / focus-lock: la camara persigue el numero hasta el buscador, donde aterriza como texto, y sigue viajando hasta el carrito, que hace press-release-spring al recibir el articulo. Un solo movimiento continuo, sin corte.
Scene 4 (8.8–14.1s): sobre "el numero exacto", el plano se detiene en el carrito y encima aparece la prueba: dos filas de codigos parecidos (`3005532` y `3382871`), la correcta se marca con highlight `positive` y la otra se tacha en `negative`. Hold; solo la marca de highlight completa su barrido.

## Frame 6 — La laptop y el HDMI

- scene: Se toca una laptop y se abre el modal "¿Tambien necesita HDMI?"; entran dos objetos al carrito
- duration: 14.054s
- poster: 7s
- transition_in: crossfade
- status: animated
- blueprint: cursor-ui-demo (Adapt)
- focal: el modal "¿Tambien necesita HDMI?" con sus tres botones
- roles: modal = foreground subject · catalogo oscurecido detras del overlay = background · tarjeta de laptop de origen + carrito con la etiqueta verde "Agregado automaticamente" = supporting
- sfx: click-soft, pop-soft, chime-soft
- voiceover: "Cuando pides una laptop, la app te pregunta si tambien necesitas HDMI. Si dices que si, ella escoge uno disponible y lo agrega. Un paso menos, y un cable menos que se te olvide."
- src: compositions/frames/06-hdmi.html

La app cuidando al profesor. Importa que se vea que PREGUNTA y no decide sola: el profesor
sigue mandando. El cierre de la linea nombra el dolor real que esto evita — llegar al aula sin
el cable.

Adapt: se conserva el movimiento firma — el cursor conduce la UI y la pantalla cambia de estado tras el click. Se anade una capa de decision: el estado intermedio es un modal con tres salidas, y se ve que el profesor elige una.

Scene 1 (0–3.1s): el catalogo con la tarjeta "Laptop Dell Latitude" viva; el cursor entra y hace click + ripple sobre ella — Centrado sobre el catalogo, ~45% del cuadro.
Scene 2 (3.1–6.2s): sobre "te pregunta", el overlay oscurece el catalogo (depth-of-field blur) y el modal entra con spring-pop entrance de asentado largo: eyebrow "ACCESORIO SUGERIDO", titulo `¿Tambien necesita HDMI?`, y los tres botones revelandose de izquierda a derecha con stagger — `Cancelar`, `No, solo laptop`, `Si, agregar HDMI`.
Scene 3 (6.2–9.3s): sobre "Si dices que si", el cursor va al boton `primary` `Si, agregar HDMI` y lo presiona; el modal hace scale-swap y desaparece.
Scene 4 (9.3–12.1s): sobre "ella escoge uno disponible", dos articulos vuelan al carrito uno tras otro con motion-blur streak; el segundo aterriza con la etiqueta verde `Agregado automaticamente` en `positive`, revelada por palabra.
Scene 5 (12.1–14.1s): sobre "un cable menos que se te olvide", el contador del carrito salta a 2 con value-scaled counter y el plano se detiene. Hold.

## Frame 7 — Observacion y confirmar

- scene: Se escribe una observacion dentro del carrito y se pulsa "Confirmar y Llevar (2)"
- duration: 10.136s
- poster: 5s
- transition_in: cut
- status: animated
- blueprint: panel-edit-live-sync (Reproduce)
- focal: el desplegable "Agregar observacion" con su texto escribiendose
- roles: carrito (lista de 2 articulos + desplegable + barra de accion) = foreground subject · catalogo atenuado a la izquierda = background · la marca "Con nota" y el contador (2) = supporting
- sfx: key-tap, click-soft
- voiceover: "Si algo no cuadra, te llevas otro control, falta un cable, dejalo escrito en la observacion. Despues, Confirmar y Llevar."
- src: compositions/frames/07-observacion.html

La valvula de escape del sistema: la realidad del almacen nunca cuadra al cien, y la app tiene
donde anotarlo. Se escribe y el carrito responde en vivo con la marca "Con nota" — eso es lo
que ensena que quedo guardado.

Scene 1 (0–2.3s): encuadre asimetrico 40/60 — catalogo atenuado a la izquierda (background), carrito abierto a la derecha con sus dos articulos. Sobre "Si algo no cuadra", zoom-to-target sube el carrito y su barra de accion al 83% legible.
Scene 2 (2.3–4.3s): sobre los dos ejemplos hablados, el desplegable `Agregar observacion` se abre con layer-reveal y el area de texto aparece vacia con su placeholder real.
Scene 3 (4.3–7.1s): type-on con caret escribe `No estaba este control, me llevo otro en su lugar.`; en el mismo beat, acoplada, la marca `Con nota` hace spring-pop en la cabecera del carrito — el panel y su objetivo se actualizan juntos, que es el punto del plano.
Scene 4 (7.1–10.1s): sobre "Confirmar y Llevar", el cursor baja a la barra de accion; el boton `primary` `Confirmar y Llevar (2)` recibe click + ripple y press-release-spring. El cuadro se detiene con el boton aun hundido — hold breve que entrega el corte al frame siguiente.

## Frame 8 — Listo, y la sesion se cierra sola

- scene: Modal verde "Registro confirmado" con lo prestado y la cuenta regresiva 3 · 2 · 1
- duration: 9.117s
- poster: 4s
- transition_in: crossfade
- status: animated
- blueprint: dataviz-countup (Adapt)
- focal: el numero de la cuenta regresiva 3 · 2 · 1
- roles: modal de exito (insignia de palomita, "Registro confirmado", lista de lo prestado) = foreground subject · overlay oscurecido sobre el kiosko = background · barra de drenado + linea "La sesion se cierra sola" = supporting
- sfx: chime-soft, tick, tick, tick
- voiceover: "Listo. La app te muestra lo que te llevas y cierra tu sesion sola en tres segundos, porque esta terminal la usan todos."
- src: compositions/frames/08-exito.html

El recibo. La cuenta regresiva es la protagonista y dura exactamente tres segundos, como en la
app. La razon va dicha ("la usan todos") para que nadie sienta que lo expulsaron: es cortesia
con el que sigue en la fila.

Adapt: se conserva el movimiento firma — el numero grande es el heroe del plano y la camara aterriza sobre el. Se invierte el sentido: no es un count-up que sube, es una cuenta REGRESIVA de tres segundos, y su valor es un dato verificable contra la app, no una metrica de mercadotecnia.

Scene 1 (0–1.8s): sobre "Listo", la insignia de palomita entra con spring-pop sobre el overlay oscurecido y el eyebrow `Prestamo creado con exito` en `positive` se revela por palabra — Centrado, anclado a y ≈ 0.42 de la altura.
Scene 2 (1.8–3.9s): sobre "lo que te llevas", el titulo `Registro confirmado` y las dos filas de lo prestado (`Laptop Dell Latitude ×1`, `Cable HDMI ×1`) entran con layer-reveal escalonado, mas la linea `Cuida bien tus equipos.`
Scene 3 (3.9–6.9s): sobre "en tres segundos", el numero de la cuenta regresiva toma el centro y baja 3 → 2 → 1 con hard-cut por segundo (nada de interpolar: son segundos enteros, como en la app), mientras la barra de drenado se vacia exactamente en 3.0 s. `stat-bars-and-fills` acoplado al numero.
Scene 4 (6.9–9.1s): sobre "la usan todos", el numero llega a cero y el modal se queda QUIETO un instante antes del corte — hold deliberado, sin jitter. Es el respiro del video.

## Frame 9 — Devolver

- scene: Panel "Por devolver" con dos prestamos; el boton "Devolver todo" abre su confirmacion
- duration: 15.282s
- poster: 7s
- transition_in: cut
- status: animated
- blueprint: cursor-ui-demo (Adapt)
- focal: el panel "Por devolver (2)" y su modal de confirmacion
- roles: panel de pendientes con dos tarjetas de prestamo = foreground subject · catalogo atenuado a la derecha = background · modal `¿Seguro que tienes todas estas cosas?` con sus tres botones = supporting
- sfx: click-soft, chime-soft
- voiceover: "Para devolver, entra con tu codigo otra vez. Puedes devolver uno por uno, o si traes todo, usar 'Devolver todo': te muestra la lista para que revises, y si quieres, cierra tu sesion al terminar."
- src: compositions/frames/09-devolver.html

La otra mitad del dia. Los dos caminos se muestran en orden de riesgo: primero el seguro, uno
por uno; despues el rapido, que se protege con una lista que el profesor revisa antes de
aceptar. Cierra el circulo que abrio el frame 1.

Adapt: se conserva el movimiento firma — el cursor conduce y la pantalla cambia de estado. Se cambia el objetivo: en vez de avanzar en un flujo, el plano compara DOS caminos para la misma tarea, uno tras otro.

Scene 1 (0–3.4s): encuadre asimetrico 65/35 espejado respecto al frame 4 — el panel `Por devolver (2)` domina a la izquierda, el catalogo queda atenuado a la derecha (background). Sobre "entra con tu codigo otra vez", las dos tarjetas de prestamo entran con layer-reveal, cada una con su kicker ambar `Pendiente por devolver`.
Scene 2 (3.4–6.7s): sobre "uno por uno", el cursor presiona el boton `Devolver` de la primera tarjeta; la tarjeta se marca en `positive` y sale de la lista. El contador de la cabecera baja de (2) a (1) con hard-cut.
Scene 3 (6.7–9.8s): sobre "usar 'Devolver todo'", la lista se restaura al estado de dos (inverse zoom-through, lee como "volvamos a intentarlo por el otro camino") y el cursor sube al boton `Devolver todo` de la cabecera y lo presiona.
Scene 4 (9.8–13.1s): sobre "te muestra la lista para que revises", el modal `¿Seguro que tienes todas estas cosas?` entra con spring-pop sobre el overlay; las dos filas de equipo se revelan escalonadas y los tres botones aparecen de izquierda a derecha — `Cancelar`, `Solo devolver`, `Si, devolver y cerrar sesion`.
Scene 5 (13.1–15.3s): sobre "cierra tu sesion al terminar", asr-keyword-glow enciende el boton `primary` de la derecha y ahi se detiene. Hold con jitter sutil.

## Frame 10 — Cierre

- scene: Logo P15 y la linea "Pedir y devolver, sin ayuda"
- duration: 3s
- poster: 2s
- transition_in: crossfade
- status: animated
- blueprint: titlecard-reveal (Reproduce)
- focal: la linea "Pedir y devolver, sin ayuda."
- roles: linea de cierre = foreground subject · misma retícula de hairlines del frame 1 = background · logo P15 (`public/logo-p15.png`) = supporting
- sfx: soft-outro
- voiceover: ""
- src: compositions/frames/10-cierre.html

Sin narracion, a proposito. La linea final repite la promesa del frame 1 ya cumplida y deja
respirar el video antes del corte.

Scene 1 (0–1.2s): vuelve el lienzo del frame 1 — misma retícula de hairlines, mismo halo radial — y el logo P15 entra centrado con spring-pop de asentado largo. Centrado, anclado al tercio superior. Rima visual con la portada.
Scene 2 (1.2–3s): la linea `Pedir y devolver, sin ayuda.` se revela por palabra debajo del logo, ~45% del ancho, y el cuadro se queda completamente QUIETO hasta el corte final. Sin jitter: el video termina en silencio y en calma.
