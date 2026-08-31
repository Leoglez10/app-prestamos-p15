# 🎬 Video 5 — Toma física: cuadrar el estante contra la app

> Guion de producción. Todo lo que se afirma aquí está verificado contra el código
> del repositorio (`v0.6.0`); cada paso lleva su referencia `archivo:línea`.

| Campo | Valor |
|---|---|
| **Duración estimada** | **~3:09** — calculada con el ritmo real medido en el video 1 (ver §5) |
| **Público** | La persona administradora del inventario (una o dos personas, no todo el personal) |
| **Objetivo** | Que pueda recorrer un área completa con la pistola, decidir qué falta de verdad y entregarle el reporte a Patrimonio, sin ayuda |
| **Herramienta** | HyperFrames · preset `blue-professional` · voz HeyGen (español) |
| **Formato** | 1920×1080, 30 fps |
| **Narración** | Voz en off, **español neutro de México** (ver §4, nota de voz) |
| **Estado** | ⬜ Guion listo · sin construir |
| **Plan de la serie** | [../../VIDEOS_TUTORIALES.md](../../VIDEOS_TUTORIALES.md) |

---

## 1. Mapa del código — dónde vive cada cosa que se muestra

Referencias relativas a `app-prestamos-p15/` (el proyecto anidado).
Salvo aviso, todo vive en **`src/components/TomaFisicaPanel.tsx`** (1196 líneas, una sola pantalla con tres pasos).

### Cómo se llega

| Elemento en pantalla | Dónde vive |
|---|---|
| Enlace **"Administrador"** (engrane, arriba a la derecha del inicio) | `src/pages/Home.tsx:211` |
| Pantalla **"Acceso Admin P15"** — código de profesor **+ PIN** | `src/pages/Admin.tsx:2761-2777` |
| Pestaña lateral **"Toma de inventario"** (2ª de la barra) | `src/pages/Admin.tsx:2819-2821` |
| La barra lateral **desaparece** mientras dura el recorrido | `src/pages/Admin.tsx:2677-2682` · la dispara `onRecorrido` (`TomaFisicaPanel.tsx:229`) |

### Paso 1 — Pantalla de arranque (elegir área)

| Elemento en pantalla | Dónde vive |
|---|---|
| Título **"Toma de inventario"** + línea "Campaña abierta el … · recorre …" | `:577-583` |
| Métrica **"Revisados en esta campaña"** (verde) | `:587` |
| Métrica **"Faltan por ver"** | `:591` |
| Métrica **"Sin etiqueta de Patrimonio"** (ámbar) | `:595` |
| Métrica **"Buscados y no localizados"** (roja) — **solo aparece si hay al menos uno** | `:598-603` |
| Barra de progreso + porcentaje | `:606-611` |
| **"¿En qué área estás ahora?"** + "Se le pone esta ubicación a todo lo que escanees, hasta que la cambies." | `:616-618` |
| Chips **"Donde estuviste"** (las últimas 6 áreas) | `:622-638` · consulta en `useInventory.ts:2038` |
| Campo de texto **"O escribe una nueva"** · placeholder `Ej. Aula 12, Laboratorio de cómputo, Auditorio` | `:648-657` |
| Botón grande **"Empezar a escanear en {área}"** | `:660-666` |
| Toggle **"Modo prueba · no guarda nada"** | `:668-676` |
| Aside **"La campaña"** → **"Exportar reporte para Patrimonio"** y **"Iniciar campaña nueva"** | `:686-698` |

### Paso 2 — El recorrido (el bucle de escaneo)

| Elemento en pantalla | Dónde vive |
|---|---|
| Barra superior: área + **"N leídos aquí · X/Y en total"** + **"Salir del recorrido"** | `:838-859` |
| Chip ámbar **"Prueba · no se guarda"** | `:843-846` |
| Campo **"Dispara la pistola contra la etiqueta"** · placeholder `El código aparece aquí solo…` | `:864-880` |
| Ayuda **"¿Etiqueta rota? Escribe el número y Enter."** | `:867` |
| Aviso **"El campo perdió el foco: la pistola está disparando al vacío."** + botón **"Recuperarlo"** | `:884-887` |
| Tarjeta **nuevo** — nombre, marca · modelo · ID, y "Anotado en {área}" | `:908-926` |
| Tarjeta **movido** — "Se movió: {equipo}" + `desde → destino` | `:910-919` |
| Tarjeta **repetido** — "Repetido" / "{equipo} ya se leyó aquí." | `:900-906` |
| Botón **"Deshacer"** de la tarjeta | `:928-935` → `revertirRevision` (`useInventory.ts:2020`) |
| Panel **"Nadie reclama este código"** (código huérfano) | `:946-1096` |
| Buscador de candidatos + botón **"Es este"** | `:1035-1065` → `ligar` (`:446`) |
| **"No es ninguno: agregarlo como equipo nuevo en {área}"** | `:1069-1076` |
| Alta corta: **"¿Qué es?"** + **"Categoría"** + "Entra como solo inventario…" | `:962-1022` |
| **"Editarlo completo"** → abre `EquipoFormDialog`, el formulario entero de Inventario | `:1009-1016` · el diálogo en `:1178-1194` |
| **"Saltarlo y seguir escaneando"** | `:1081-1093` |
| Columna **"Leídos aquí"** | `:1100-1118` |
| Columna **"Deberían estar aquí"** + "— según la campaña pasada" | `:1120-1167` → `pendientesDeArea` (`utils/tomaFisica.ts:170`) |
| Nota **"Cuando esta columna queda vacía, el área está terminada."** | `:1164-1166` |
| Botón **"Terminar {área}"** | `:1169-1172` |

### Paso 3 — Cerrar el área

| Elemento en pantalla | Dónde vive |
|---|---|
| Cabecera "{área} · N equipos leídos" + "{min} min de recorrido" | `:712-732` |
| **"Estos N no aparecieron"** + "— decidí antes de irte, después ya no te acordás" | `:737-743` |
| Botones por equipo: **"Sí está"** / **"No localizada"** | `:755-770` → `marcarAMano` (`:423`) y `noAparece` (`:304`) |
| Bloque **"Marcados como no localizados"** + "— van al reporte firmados por {quien}" | `:781-806` |
| **"Seguir en otra área"** / **"Exportar reporte"** / **"Volver a escanear aquí"** | `:813-828` |

### Reglas de negocio que el video enseña

| Regla | Dónde está escrita |
|---|---|
| Un equipo cuenta como revisado **solo si se vio después** de que arrancó la campaña | `fueRevisado` — `utils/tomaFisica.ts:46` |
| Iniciar campaña **no borra nada**: solo mueve la fecha de corte | `iniciarCampanaInventario` — `useInventory.ts:1924` |
| Cada disparo escribe **revisado + quién + ubicación**, y **borra** la marca de "no localizado" | `registrarRevision` — `useInventory.ts:1958-1975` |
| El código de barras se lee **solo por sus dígitos** (funciona con `*2310216*` de Code 39) | `normalizarCodigoPatrimonial` — `utils/codigoPatrimonial.ts:18` |
| La pistola dispara sola **sin el Enter final** | `usePistola` — `hooks/usePistola.ts:24` · enganchada en `TomaFisicaPanel.tsx:404` |
| "Movido" sale de comparar la ubicación guardada contra la del recorrido | `clasificarDisparo` — `utils/tomaFisica.ts:203-206` |
| El alta al vuelo nace **apagada para el kiosko** (`es_prestable: 0`) | `darDeAlta` — `:529` |
| El reporte tiene **tres** estados, no dos: `S`, `N` y **vacío** | `construirReporteCsv` — `utils/tomaFisica.ts:130-133` |
| El reporte sale como **CSV con `;` y BOM UTF-8** para que Excel en español lo abra bien | `utils/tomaFisica.ts:107-113` |
| El reporte se guarda en la carpeta `reportes/` y **la carpeta se abre sola** | `guardar_reporte_inventario` — `src-tauri/src/lib.rs:166-185` |

---

## 2. Correcciones al plan de la serie

Seis puntos del plan describen esta pantalla de forma imprecisa o incompleta. El guion usa la versión correcta:

1. **No hay "doble confirmación" al iniciar campaña.** Es **una sola** ventana con el texto *"Iniciar una campaña nueva marca todo el inventario como pendiente otra vez. No se borra nada, pero el conteo vuelve a cero. ¿Continuar?"* (`:543-549`). El video no debe prometer una segunda red que no existe — al contrario, hay que decir que es un solo clic de confirmación.

2. **El orden del plan está al revés.** "Iniciar campaña nueva" **no** es un paso posterior a elegir el área: vive en el panel lateral **"La campaña"** de la pantalla de arranque (`:686-698`), y es una decisión que se toma una vez cada varios meses. Elegir el área es lo que se hace **cada** recorrido.

3. **El modo prueba no es "el recorrido completo sin escribir".** Ensaya el **bucle de escaneo** — disparo, tono, tarjeta, repetidos — y nada más. Quedan apagados a propósito: ligar una etiqueta desconocida (`ligar`, `:447`), el alta al vuelo (`darDeAlta`, `:516`), "Sí está" (`marcarAMano`, `:425`) y "No está" / "No localizada" (`noAparece`, `:305`). Con un código huérfano el modo prueba solo avisa: *"…no existe en el inventario. Apaga el modo prueba para ligarlo o darlo de alta."* (`:365-370`). Tiene sentido: ligar una etiqueta es para siempre.

4. **"Deshacer" tiene ventana de tiempo.** La tarjeta se va sola, y con ella el botón: **2.5 s** un equipo nuevo, **3.5 s** uno movido, **1.8 s** un repetido (`DURACION`, `:75-79`). El repetido, además, **no trae botón Deshacer** — no escribió nada que deshacer. El video tiene que mostrar el gesto rápido, no un botón que espera.

5. **Deshacer no restaura la marca de "no localizado".** Si el equipo estaba marcado como perdido y un disparo equivocado la limpió, al deshacer queda **pendiente**, no perdido (documentado en `revertirRevision`, `useInventory.ts:2013-2017`). Es a propósito, pero conviene no prometer un "deshacer" absoluto.

6. **Falta en el plan lo más importante de esta pantalla: el foco.** Si el campo de escaneo pierde el foco, **la pistola dispara al vacío** y nadie se entera hasta varios equipos después. La app lo avisa con una franja y un botón "Recuperarlo" (`:884-887`), y por eso Admin **esconde su barra lateral** durante el recorrido (`Admin.tsx:2677-2682`). Esto no puede quedar fuera del video.

---

## 3. Guion escena por escena

Formato: `⏱ tiempo · TÍTULO` → **Pantalla** (qué se ve) / **Voz** (narración literal) / **Nota de producción**.
Los tiempos son **estimados**: cada uno es el conteo de palabras de su línea dividido entre el ritmo medido del video 1 (§5). La duración real manda y se mide después de sintetizar la narración.

### ⏱ 0:00 – 0:07 · Portada

- **Pantalla:** logo P15. Título grande: **"Toma física de inventario"**. Subtítulo: *Video 5 de 6 · Para quien administra*.
- **Voz:** «Este video es para quien administra el inventario. Vamos a cuadrar el estante contra la app.»
- **Nota:** logo en `app-prestamos-p15/img/logo-p15.png`. Marcar desde el subtítulo que **no** es un video para todo el personal.

### ⏱ 0:07 – 0:23 · Para qué sirve

- **Pantalla:** ilustración partida en dos: a la izquierda un estante con equipos; a la derecha la tabla del inventario en la app. Entre las dos, un signo de interrogación.
- **Voz:** «La app dice que la prepa tiene ciento veinte equipos. ¿Siguen ahí? ¿En la misma aula? La toma física es caminar el edificio con la pistola y contestar eso con nombre y fecha.»
- **Nota:** el número es de ejemplo; usar el mismo en toda la demo.

### ⏱ 0:23 – 0:30 · Dónde está

- **Pantalla:** clic en el engrane **"Administrador"** del inicio → pantalla **"Acceso Admin P15"** → se teclea código y PIN → panel de Admin. El cursor se va a la segunda pestaña, **"Toma de inventario"**.
- **Voz:** «Entra como administrador con tu código y tu PIN, y abre la segunda pestaña: Toma de inventario.»
- **Nota:** usar un código ficticio y un PIN tapado. **Nunca** credenciales reales. Ver §4.

### ⏱ 0:30 – 0:48 · La campaña

- **Pantalla:** pantalla de arranque completa. Se resaltan las cuatro métricas de arriba y luego el panel lateral **"La campaña"**. Clic en **"Iniciar campaña nueva"** → ventana de confirmación con su texto literal.
- **Voz:** «Una campaña es un recorrido completo del edificio. Antes de empezar uno nuevo, toca “Iniciar campaña nueva”: el conteo vuelve a cero, pero no se borra nada. Es un solo clic de confirmación, así que léelo antes de aceptar.»
- **Nota:** mostrar el texto real del diálogo (`:544-547`), no una paráfrasis. Después del clic, los contadores de arriba se reinician en cámara: es lo que hace entender la palabra "campaña".

### ⏱ 0:48 – 0:58 · Ensayar sin miedo

- **Pantalla:** clic en el toggle **"Modo prueba · no guarda nada"**. El botón grande cambia su texto a **"Probar la pistola sin guardar nada"** y aparece la leyenda de abajo.
- **Voz:** «Si es tu primera vez, prende el modo prueba: escanea y suena igual, pero no marca nada. Para todo lo demás, apágalo.»
- **Nota:** el "apágalo" es literal. En modo prueba también quedan apagados ligar etiquetas, el alta al vuelo y los botones de "no está" (§2 punto 3). Sobreimprimir esa lista mientras se dice la frase.

### ⏱ 0:58 – 1:14 · Elegir el área

- **Pantalla:** modo prueba apagado. Chips **"Donde estuviste"**; se toca *Aula 12*. Se resalta la línea "Se le pone esta ubicación a todo lo que escanees". Clic en **"Empezar a escanear en Aula 12"**. La barra lateral de Admin desaparece.
- **Voz:** «El área se elige una sola vez, no equipo por equipo. Usa los botones de donde ya estuviste: escribirla a mano termina en “Aula doce”, “aula doce” y “Aula12”, tres aulas distintas para la app.»
- **Nota:** señalar en cámara que la barra lateral se fue. Es a propósito: seis pestañas a un clic de robarle el foco al campo de escaneo.

### ⏱ 1:14 – 1:27 · El disparo

- **Pantalla:** la pistola apunta a una etiqueta de Patrimonio. Sin tocar el teclado, el código aparece en el campo, suena un tono agudo, la pantalla da un destello verde y sale la tarjeta con el nombre del equipo y **"Anotado en Aula 12"**. A la izquierda crece "Leídos aquí".
- **Voz:** «Ahora es apuntar y disparar. Cada escaneo deja escrito qué equipo es, quién lo vio, cuándo, y en qué aula estaba. Sin teclear y sin cambiar de pantalla.»
- **Nota:** el tono agudo (880 Hz) es "lo reconocí"; el grave (320 Hz) es "algo pasa" (`:113-121`). El audio del video **debe** reproducir esa diferencia — quien recorre escucha, no mira.

### ⏱ 1:27 – 1:37 · Se movió

- **Pantalla:** un disparo saca la tarjeta naranja **"Se movió: Proyector Epson"** con `Aula 8 → Aula 12` y la flecha.
- **Voz:** «Y si estaba registrado en otra aula, te lo dice: se movió, de dónde, a dónde. Se corrige con solo escanearlo aquí.»
- **Nota:** la tarjeta de movimiento dura **3.5 s**, más que las otras, justo porque hay que leerla (`:78`). Este es el dato que Patrimonio más valora.

### ⏱ 1:37 – 1:51 · Repetido y deshacer

- **Pantalla:** se dispara dos veces contra la misma etiqueta: tono grave, destello ámbar, tarjeta **"Repetido"**. Después, un disparo contra la etiqueta de al lado por error, y el cursor alcanza a pulsar **"Deshacer"** antes de que la tarjeta se vaya.
- **Voz:** «Si disparas dos veces sobre lo mismo, avisa y no pasa nada. Y si le atinaste a la etiqueta equivocada, “Deshacer” lo regresa como estaba; apúrate, la tarjeta dura dos segundos.»
- **Nota:** cronometrar el gesto: **2.5 s** para un equipo nuevo. El "Repetido" **no** trae Deshacer.

### ⏱ 1:51 – 2:05 · La pistola disparando al vacío

- **Pantalla:** clic fuera del campo. Aparece la franja **"El campo perdió el foco: la pistola está disparando al vacío."** con el botón **"Recuperarlo"**. Se pulsa y el recorrido sigue.
- **Voz:** «Ojo con esto: si el cursor se sale del campo, la pistola dispara y no se guarda nada. La app te avisa. Si ves esa franja, toca “Recuperarlo” antes de seguir.»
- **Nota:** **la escena más importante del video.** Es el único error de esta pantalla que se descubre tarde y obliga a repetir el aula entera.

### ⏱ 2:05 – 2:22 · Un código que nadie reclama

- **Pantalla:** disparo contra una etiqueta desconocida: tono grave y panel **"Nadie reclama este código"** con el número. Se escribe en el buscador, sale un equipo sin etiqueta y se pulsa **"Es este"**. Después, segundo caso: **"No es ninguno: agregarlo como equipo nuevo en Aula 12"** → alta corta con **"¿Qué es?"** y **"Categoría"** → **"Agregarlo al inventario"**.
- **Voz:** «A veces la etiqueta no corresponde a nada. Si el equipo ya existe pero sin etiqueta, búscalo y liga las dos cosas. Y si nunca se dio de alta, lo das de alta ahí mismo, sin soltar la pistola.»
- **Nota:** dos sobreimpresiones, sin narrar: (1) **"Entra como solo inventario"** (`:999`) — lo que aparece caminando el edificio **no** se vuelve prestable solo; (2) **"Editarlo completo"** (`:1015`) — si el aparato está en la mano, marca, modelo y serie se capturan ahora, porque después no las captura nadie.

### ⏱ 2:22 – 2:34 · Cuándo terminar el área

- **Pantalla:** plano de la columna derecha **"Deberían estar aquí"** bajando de 5 a 1. Se resalta la nota de abajo: *"Cuando esta columna queda vacía, el área está terminada."*
- **Voz:** «La columna de la derecha es lo que debería estar en esta aula. Cuando se vacía, terminaste. Sin esa lista, uno dispara hasta que se cansa.»
- **Nota:** los que **no tienen etiqueta** salen con la leyenda *"Sin etiqueta · no se puede escanear"* y un botón **"Sí está"** (`:1140-1152`): son los que hay que marcar a mano.

### ⏱ 2:34 – 2:53 · Lo que no apareció

- **Pantalla:** clic en **"Terminar Aula 12"**. Pantalla de cierre con la cabecera "Aula 12 · 14 equipos leídos · 22 min de recorrido" y el bloque **"Estos 2 no aparecieron"**. Se pulsa **"No localizada"** en uno; pasa al bloque de abajo, firmado.
- **Voz:** «Antes de irte, la app te pregunta por lo que no apareció. Decídelo aquí, parado en el aula. “No localizada” es una afirmación con tu nombre y la fecha: la buscaste y no estaba. Dejarlo pendiente dice otra cosa: que nadie llegó todavía.»
- **Nota:** ésta es la idea que justifica el video. Sobreimprimir las **tres** columnas del reporte: `S` apareció · `N` se buscó y no estaba · **vacío** nadie llegó (`utils/tomaFisica.ts:130-133`).

### ⏱ 2:53 – 3:05 · El reporte

- **Pantalla:** clic en **"Exportar reporte"**. Aparece el mensaje *"Reporte guardado en …"* y **se abre sola** la carpeta `reportes/` con el archivo `reporte-inventario-2026-08-29.csv`. Se abre en Excel: columnas limpias, con acentos.
- **Voz:** «Al terminar, exporta el reporte. Se guarda solo, la carpeta se abre sola, y el archivo se abre en Excel con las mismas columnas que usa Patrimonio.»
- **Nota:** el nombre del archivo lleva la fecha (`nombreDelReporte`, `utils/tomaFisica.ts:154`). Mostrar la columna **Localizado** con los tres valores distintos, incluido el vacío.

### ⏱ 3:05 – 3:09 · Cierre

- **Pantalla:** logo P15 y una línea: *"Saber qué hay, dónde está, y qué falta de verdad."*
- **Voz:** —
- **Nota:** sin voz, como el video 1. Al pie, en chico: *"¿Hiciste la toma en otra computadora? Video 6."*

---

## 4. Datos de demo necesarios

Preparar una base de datos de demostración (**nunca** la de producción) con:

- **Un profesor ficticio con permisos de admin** y su PIN. El PIN se teclea tapado en cámara.
- **Una campaña ya iniciada** con unos 15 equipos revisados, para que las métricas de arranque no salgan en cero.
- **Al menos tres áreas con historial**, para que aparezcan los chips de **"Donde estuviste"** (`getUbicacionesRecientes` trae las últimas 6 — `useInventory.ts:2038`).
- **Un equipo con `ubicacion` distinta al área del recorrido** → dispara la tarjeta **"Se movió"**.
- **Un equipo sin `id_patrimonial` y no granel** → es el candidato del panel "Es este". Los de granel **no** salen en esa lista (`:1029`).
- **Una etiqueta que no existe en la base** → dispara el panel "Nadie reclama este código". Dos, si se quiere mostrar ligar y dar de alta por separado.
- **Cinco equipos con `ubicacion = "Aula 12"`** sin revisar → llenan la columna "Deberían estar aquí"; **uno de ellos sin etiqueta**, para el botón "Sí está".
- **Un equipo con `resguardante_nombre`** → la tarjeta muestra "· resguarda …" (`:922-924`).

> 🎤 **Nota de voz — español neutro.** Varios textos de esta pantalla están escritos en voseo rioplatense: *"seguí con el siguiente"* (`:905`), *"decidí antes de irte, después ya no te acordás"* (`:742`), *"Todavía no disparaste nada en esta área"* (`:1108`). Aparecen en cámara y no hay que cambiarlos para este video, pero **la narración va en español neutro de México** («sigue», «decide», «no te acuerdas»). Corregir esos textos en la app es una tarea aparte, no un bloqueo del video.

## 5. Cómo se calculó la duración

El video 1 salió en **110.8 s** con **239 palabras** de narración; descontando los ~3 s de cierre mudo, son **≈ 2.2 palabras por segundo** — el ritmo real de una voz que enseña, no el de leer en la cabeza.

Este guion tiene **409 palabras** → **184 s de voz + 4 s de cierre mudo ≈ 3:09**.

> ⚠️ **Se pasa del presupuesto del plan (~2:20) por unos 50 segundos**, y no por relleno: es la pantalla con más superficie de toda la app — tres pasos, seis casos de escaneo y un reporte. La primera versión de este guion daba **3:47** y ya se recortó una vez. Si hay que bajarlo más, éste es el orden de sacrificio, **y ninguno antes**:
>
> 1. **"Se movió"** (–10 s): fundirla con la escena del disparo, mostrando la tarjeta sin narrarla.
> 2. **"Repetido y deshacer"** (–7 s): quedarse solo con el "Deshacer", que es lo accionable.
> 3. **"Ensayar sin miedo"** (–10 s): el modo prueba se descubre solo; puede quedar como sobreimpresión.
>
> **No se recortan, en ningún caso:** la escena del **foco perdido** (el único error que se descubre tarde) y la de **"Lo que no apareció"** (la razón de ser del video). Si esas dos no quedan clarísimas, el video no sirve.

## 6. Fuera de alcance de este video

- Cómo se dan de alta equipos y categorías desde cero → Video 2.
- La importación del Excel de Patrimonio y por qué todo entra como "solo inventario" → Video 3.
- Respaldos, relevo por USB y **traer la toma física hecha en otra computadora** → Video 6. El cierre solo lo menciona.
- Habilitar el préstamo de un equipo dado de alta al vuelo → Video 2 (toggle por categoría) y Video 3 (por equipo).

---

## 7. Cómo construirlo

Mismo procedimiento que el video 1 (ver [`../01-kiosko/GUION.md`](../01-kiosko/GUION.md) §6). Desde `videos/05-toma-fisica/`:

| Qué | Comando |
|---|---|
| Ver en el navegador | `npm run dev` |
| Validar | `npx hyperframes lint && npx hyperframes check` |
| Volver a renderizar | `npm run render` |

Recordar la regla que costó 30 s en el video 1: **la duración la manda la voz, no el guion.** `audio.mjs sync-durations` reescribe la duración de cada frame con la medida real del audio; después hay que reajustar los tiempos de las escenas en `STORYBOARD.md`.
