# 🎬 Video 1 — Kiosko: prestar y devolver

> Guion de producción. Todo lo que se afirma aquí está verificado contra el código
> del repositorio; cada paso lleva su referencia `archivo:línea`.

| Campo | Valor |
|---|---|
| **Duración real** | 110.8 s (1:51) — medida sobre la narración sintetizada, no estimada |
| **Público** | Profesores de la Preparatoria 15 (usuarios finales, no técnicos) |
| **Objetivo** | Que un profesor pueda pedir y devolver equipo sin ayuda después de verlo una vez |
| **Herramienta** | HyperFrames · preset `blue-professional` · voz HeyGen (español) |
| **Formato** | 1920×1080, 30 fps |
| **Narración** | Voz en off, español neutro, tono tranquilo de instructivo |
| **Estado** | ✅ Renderizado · [`renders/video.mp4`](renders/video.mp4) |
| **Plan de la serie** | [../../VIDEOS_TUTORIALES.md](../../VIDEOS_TUTORIALES.md) |

---

## 1. Mapa del código — dónde vive cada cosa que se muestra

Referencias relativas a `app-prestamos-p15/` (el proyecto anidado).

### Pantalla de inicio

| Elemento en pantalla | Dónde vive |
|---|---|
| Tarjeta **"Soy Profesor"** → ruta `/kiosko` | `src/pages/Home.tsx:225` |
| Tarjeta **"Préstamo Rápido"** → ruta `/prestamo-rapido` | `src/pages/Home.tsx:235` |
| Enlace **"Administrador"** (engrane, arriba a la derecha) | `src/pages/Home.tsx:211` |
| Reloj y fecha en vivo (se refresca cada 30 s) | `src/pages/Home.tsx:171-175` |
| Tira de métricas: Disponibles / En préstamo / Fuera de servicio | `src/pages/Home.tsx:69-73` · se recarga cada 60 s (`:196`) |
| Botón **"Generar PDF"** de cada métrica | `src/pages/Home.tsx:281` |

### Kiosko — todo el flujo

| Elemento en pantalla | Dónde vive |
|---|---|
| Pantalla **"Ingresa tu Código"** + botón "Identificarse" | `src/pages/Kiosk.tsx:1610-1625` |
| Placeholder del código: `Código (Ej. 2958101)` | `src/pages/Kiosk.tsx:1620` |
| Validación del código (sin PIN) | `verificarProfesorExacto` → `src/pages/Kiosk.tsx:130` |
| Error `Código no encontrado…` | `src/pages/Kiosk.tsx:139` |
| Panel izquierdo **"Por devolver (n)"** | `src/pages/Kiosk.tsx:1640-1681` |
| Botón **"Devolver"** por préstamo | `src/pages/Kiosk.tsx:1673` → `handleDevolucion` (`:244`) |
| Botón **"Devolver todo"** | `src/pages/Kiosk.tsx:1682` |
| Barra inferior: **"Cerrar sesión"** / **"Inicio"** | `src/pages/Kiosk.tsx:1684-1707` |
| Panel derecho **"Tomar equipo nuevo"** | `src/pages/Kiosk.tsx:1709-1713` |
| Lista lateral de categorías + botón **"Todas"** | `src/pages/Kiosk.tsx:1715-1760` |
| Buscador (placeholder largo con "Enter agrega el primero") | `src/pages/Kiosk.tsx:1792` |
| Carrito lateral con contador y animación de vuelo | `src/pages/Kiosk.tsx:1843` · `spawnFlyToCart` (`:374`) |
| **"Agregar observacion"** (desplegable dentro del carrito) | `src/pages/Kiosk.tsx:1934-1947` |
| Barra de acción **"Confirmar y Llevar (n)"** | `src/pages/Kiosk.tsx:2046-2065` → `handlePrestamo` (`:190`) |
| Modal **"¿Tambien necesita HDMI?"** | `src/pages/Kiosk.tsx:2069-2100` |
| Modal de éxito **"Registro confirmado"** + cuenta regresiva | `src/pages/Kiosk.tsx:2101-2136` |
| Modal **"¿Seguro que tienes todas estas cosas?"** | `src/pages/Kiosk.tsx:2138-2210` |

### Reglas de negocio que el video enseña

| Regla | Dónde está escrita |
|---|---|
| La sesión se cierra sola a los **3 segundos** tras un préstamo | `SUCCESS_AUTO_LOGOUT_SECONDS = 3` — `src/pages/Kiosk.tsx:27` · temporizador en `:169-186` |
| El kiosko **solo muestra categorías prestables** | `loadCategorias` filtra `es_prestable === 1` — `src/pages/Kiosk.tsx:102-105` |
| El kiosko **solo muestra equipos prestables** | `loadEquipos` filtra con `esPrestableEfectivo` — `src/pages/Kiosk.tsx:107-115` |
| Al buscar por texto **se ignora la categoría seleccionada** y se busca en todo el inventario | `src/pages/Kiosk.tsx:326-330` |
| El **ID patrimonial exacto le gana al filtro de texto** (evita prestar el equipo equivocado) | `src/pages/Kiosk.tsx:332-343` |
| La búsqueda cubre nombre, categoría, identificador, ID patrimonial, **marca y modelo** | `src/pages/Kiosk.tsx:344-356` |
| Los disponibles se ordenan primero | `src/pages/Kiosk.tsx:355-359` |
| Un equipo se detecta como laptop si su nombre o categoría contiene `laptop` o `lap` | `isLaptopEquipo` — `src/pages/Kiosk.tsx:297-300` |
| Se prefiere un HDMI **directo** sobre un adaptador USB-C | `findPreferredHdmiEquipo` — `src/pages/Kiosk.tsx:318-322` |
| Disponibilidad: a granel mira `stock_disponible`; único mira `estado` | `isEquipoDisponible` — `src/pages/Kiosk.tsx:324` |
| Al devolver, el equipo a granel **no** cambia de estado; el único vuelve a `disponible` | `devolverEquipo` — `src/hooks/useInventory.ts:1251-1258` |
| El catálogo y el panel de pendientes se pueden ocultar desde Configuración | `settings.kiosk_show_catalogo` (`:1709`) y `settings.kiosk_show_pendientes` (`:1640`) |

---

## 2. Correcciones al plan de la serie

Cinco puntos del plan original describen la app de forma imprecisa. El guion usa la versión correcta:

1. **No hay "chips de categoría".** Las categorías son una **columna vertical de botones** de 190 px a la izquierda del catálogo, encabezada por **"Todas"** (`src/pages/Kiosk.tsx:1715-1760`). Los chips que sí existen son los de **estado** de cada equipo: `Listo para llevar`, `N disponibles`, `Agotado` (`getEquipoTone`, `:515-527`).
2. **El botón "Devolver todo" solo aparece con más de un préstamo activo.** Con uno solo, únicamente está el "Devolver" de la tarjeta (`misPrestamos.length > 1` — `src/pages/Kiosk.tsx:1668`).
3. **"Devolver todo" no devuelve y ya:** abre un modal de confirmación con tres salidas — *Cancelar*, *Solo devolver*, y *Sí, devolver y cerrar sesión* (`src/pages/Kiosk.tsx:2185-2207`).
4. **El HDMI no se agrega "automáticamente":** al tocar una laptop se abre un modal que pregunta, con tres botones — *Cancelar*, *No, solo laptop*, *Si, agregar HDMI* (`handleLaptopSelection`, `src/pages/Kiosk.tsx:457`). Lo automático es **cuál** HDMI se elige.
5. **Las notas se llaman "Agregar observacion"** en la interfaz, no "notas de entrega", y viven **dentro del carrito**, no en una pantalla aparte (`src/pages/Kiosk.tsx:1934`).

---

## 3. Guion escena por escena

Los tiempos son los **reales del render**, tomados de la duración medida de cada línea de
narración (el guion original los estimaba leyendo, y se quedaba corto ~30 s).

Formato: `⏱ tiempo · TÍTULO` → **Pantalla** (qué se ve) / **Voz** (narración literal) / **Nota de producción**.

### ⏱ 0:00 – 0:07 · Portada

- **Pantalla:** logo P15 sobre fondo limpio. Título grande: **“Prestar y devolver equipo”**. Subtítulo: *Video 1 de 5 · Kiosko*.
- **Voz:** «Este es el video que necesitas para el día a día: cómo pedir equipo y cómo devolverlo.»
- **Nota:** logo en `app-prestamos-p15/img/logo-p15.png`.

### ⏱ 0:07 – 0:17 · Entrar como profesor

- **Pantalla:** pantalla de inicio completa. El cursor se mueve a la tarjeta azul **“Soy Profesor”** y hace clic. Resaltar la tarjeta con un halo.
- **Voz:** «Desde la pantalla principal, toca “Soy Profesor”. La otra tarjeta, “Préstamo Rápido”, es para alumnos y la vemos en otro video.»
- **Nota:** dejar visible la tira de métricas de abajo un segundo antes del clic; da contexto sin explicarla.

### ⏱ 0:17 – 0:27 · Tu código UDG

- **Pantalla:** pantalla “Ingresa tu Código”. Se teclea un código de ejemplo y se pulsa **Identificarse**. Aparece el nombre del profesor arriba a la izquierda.
- **Voz:** «Escribe tu código de profesor y presiona Identificarse. No necesitas contraseña: el código es suficiente.»
- **Nota:** usar un código ficticio (`2958101`, el del placeholder). **Nunca** un código real de personal.

### ⏱ 0:27 – 0:45 · Encontrar el equipo

- **Pantalla:** dividida. Izquierda, “Por devolver”. Derecha, “Tomar equipo nuevo”. Se hace clic en una categoría de la lista lateral; luego se escribe *“dell”* en el buscador y la lista se reduce.
- **Voz:** «A la derecha está el catálogo. Puedes filtrar por categoría, o escribir directo: busca por nombre, marca, modelo o número de inventario. Ojo, al escribir se busca en todo el equipo de la prepa, no solo en la categoría que elegiste.»
- **Nota:** mostrar los chips verdes de estado — *Listo para llevar* y *N disponibles* — y uno rojo *Agotado* al final de la lista.

### ⏱ 0:45 – 0:59 · La pistola de código de barras

- **Pantalla:** ilustración de la pistola apuntando a una etiqueta de Patrimonio. Al “disparar”, el código aparece en el buscador y el equipo salta solo al carrito con la animación de vuelo.
- **Voz:** «Si el equipo trae etiqueta de Patrimonio, solo escanéalo. Se agrega solo, sin tocar nada más. Y como usa el número exacto de la etiqueta, nunca te va a meter otro equipo parecido.»
- **Nota:** este es el diferenciador del sistema. Vale la pena un plano cerrado del carrito recibiendo el objeto.

### ⏱ 0:59 – 1:13 · La laptop y el HDMI

- **Pantalla:** se toca una laptop del catálogo. Se abre el modal **“¿Tambien necesita HDMI?”** con sus tres botones. Se pulsa **“Si, agregar HDMI”** y entran dos objetos al carrito; el HDMI trae la etiqueta verde *Agregado automaticamente*.
- **Voz:** «Cuando pides una laptop, la app te pregunta si también necesitas HDMI. Si dices que sí, ella escoge uno disponible y lo agrega. Un paso menos, y un cable menos que se te olvide.»
- **Nota:** la etiqueta verde está en `src/pages/Kiosk.tsx:1882`.

### ⏱ 1:13 – 1:23 · Observación y confirmar

- **Pantalla:** se despliega **“Agregar observacion”** dentro del carrito, se escribe una nota corta, y se pulsa la barra inferior **“Confirmar y Llevar (2)”**.
- **Voz:** «Si algo no cuadra —te llevas otro control, falta un cable— déjalo escrito en la observación. Después, Confirmar y Llevar.»
- **Nota:** usar el ejemplo del propio placeholder: *“No estaba este control, me llevo otro en su lugar.”*

### ⏱ 1:23 – 1:32 · Listo, y la sesión se cierra sola

- **Pantalla:** modal verde **“Registro confirmado”** con la lista de lo prestado y el contador `3 · 2 · 1`. Al llegar a cero vuelve la pantalla de código.
- **Voz:** «Listo. La app te muestra lo que te llevas y cierra tu sesión sola en tres segundos, porque esta terminal la usan todos.»
- **Nota:** el contador es real (`SUCCESS_AUTO_LOGOUT_SECONDS = 3`). Respetar los 3 s exactos en la animación.

### ⏱ 1:32 – 1:48 · Devolver

- **Pantalla:** sesión nueva con dos préstamos en “Por devolver”. Primero se pulsa **“Devolver”** en una tarjeta. Después se muestra **“Devolver todo”** y su modal de confirmación, resaltando el botón **“Si, devolver y cerrar sesion”**.
- **Voz:** «Para devolver, entra con tu código otra vez. Puedes devolver uno por uno, o si traes todo, usar “Devolver todo”: te muestra la lista para que revises, y si quieres, cierra tu sesión al terminar.»
- **Nota:** “Devolver todo” solo existe con **dos o más** préstamos. Montar la escena de demo con dos.

### ⏱ 1:48 – 1:51 · Cierre

- **Pantalla:** logo P15 y una sola línea: *“Pedir y devolver, sin ayuda.”*
- **Voz:** —
- **Nota:** sin voz; deja respirar el final.

---

## 4. Datos de demo necesarios

Preparar una base de datos de demostración (nunca la de producción) con:

- **Un profesor ficticio** con código `2958101`.
- **Al menos una categoría prestable** con equipo disponible y una laptop cuyo nombre contenga `laptop`.
- **Un HDMI directo disponible**, cuyo nombre **no** contenga `usb-c`, `usb c`, `tipo c`, `type c` ni `adaptador` — si no, el modal ofrecerá el adaptador en su lugar.
- **Un equipo a granel** con `stock_disponible` bajo (1 o 2), para que salga el chip ámbar.
- **Un equipo agotado**, para el chip rojo.
- **Un equipo con `id_patrimonial`**, para la escena del escaneo.
- **Dos préstamos activos** del profesor ficticio, para que aparezca “Devolver todo”.

## 5. Fuera de alcance de este video

- Configuración inicial y alta de profesores → Video 2.
- Importación del Excel de Patrimonio → Video 3.
- Préstamo Rápido (alumnos) → Video 4.
- Toma física y respaldos → Video 5.
- Ocultar el catálogo o los pendientes desde Configuración → Video 2.

---

## 6. Cómo se construyó (para rehacerlo o editarlo)

El proyecto HyperFrames vive en **este mismo directorio**. Comandos, desde `videos/01-kiosko/`:

| Qué | Comando |
|---|---|
| Ver en el navegador | `npm run dev` |
| Validar | `npx hyperframes lint && npx hyperframes check` |
| Fotos de control | `npx hyperframes snapshot --at 3.4,12.2,22.4,36,52,66,78,88,100,109.5` |
| Volver a renderizar | `npm run render` |

Archivos que importan:

- `BRIEF.md` — la intención cerrada (público, mensaje, idioma, formato). Nada se vuelve a preguntar.
- `STORYBOARD.md` — los 10 frames: narración, duración real y la **secuencia de planos con tiempos**.
- `SCRIPT.md` — la narración hablada, con acentos correctos para el sintetizador.
- `frame.md` — la paleta y la tipografía. Sale del preset `blue-professional` remezclado sobre el azul de la app (`#2563eb`).
- `compositions/frames/NN-*.html` — un archivo por frame, HTML + GSAP.
- `assets/voice/` `assets/bgm/` `assets/sfx/` — audio generado.

### Decisiones que conviene conocer antes de tocar nada

1. **La duración la manda la voz, no el guion.** `audio.mjs sync-durations` reescribe la duración de cada frame con la medida real del audio. Si cambias una línea de `SCRIPT.md`, hay que regenerar el audio, volver a sincronizar y **reajustar los tiempos de las escenas** en `STORYBOARD.md`.
2. **Las fuentes viven en el repo.** `assets/fonts/space-grotesk.woff2` e `inter.woff2` se descargaron a propósito: el render corre en un Chrome headless sin fuentes del sistema, y una fuente que no es un archivo local simplemente no aparece.
3. **`compositions/captions.html` está parcheado a mano.** El generador dejaba el último subtítulo pegado hasta el final del video, así que el cierre mudo arrastraba una frase del frame 9. Se cambió `var end = isLast ? DURATION : …` por `Math.min(DURATION, group.end + 0.3)`. **Si vuelves a correr `captions.mjs build`, el parche se pierde y hay que reaplicarlo.**
4. **Los `data-layout-allow-overlap` son deliberados.** Un modal encima del catálogo es solapamiento a propósito; sin esa marca, `hyperframes check` lo reporta como error.
5. **La UI está reconstruida en HTML, no capturada.** Por eso los rótulos hay que copiarlos a mano de la app — y por eso conservan sus faltas de tilde.
