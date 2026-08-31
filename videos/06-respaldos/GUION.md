# 🎬 Video 6 — No perder datos: respaldos y dos computadoras

> Guion de producción. Todo lo que se afirma aquí está verificado contra el código
> del repositorio; cada paso lleva su referencia `archivo:línea`.

| Campo | Valor |
|---|---|
| **Duración estimada** | ~150 s (2:30) — estimación con el factor de lectura del video 1 (×1.42). La real se mide después de sintetizar la narración |
| **Público** | La persona administradora de la Preparatoria 15 (no técnica) |
| **Objetivo** | Que un error nunca cueste el inventario, y que quede clarísimo que **el `.db` reemplaza y el CSV fusiona** |
| **Herramienta** | HyperFrames · preset `blue-professional` · voz HeyGen (español) |
| **Formato** | 1920×1080, 30 fps |
| **Narración** | Voz en off, español neutro, tono tranquilo de instructivo |
| **Estado** | ⬜ Guion listo · sin producir |
| **Plan de la serie** | [../../VIDEOS_TUTORIALES.md](../../VIDEOS_TUTORIALES.md) |

---

## 1. Mapa del código — dónde vive cada cosa que se muestra

Referencias relativas a `app-prestamos-p15/` (el proyecto anidado).

### Admin ▸ Configuración ▸ sección "Respaldos"

| Elemento en pantalla | Dónde vive |
|---|---|
| Pestaña **Configuración** del Admin | `src/pages/Admin.tsx:2837` · título `:2508` |
| Encabezado **"Respaldos"** | `src/pages/Admin.tsx:2541` |
| Texto explicativo (carpeta `backups`, USB, Drive) | `src/pages/Admin.tsx:2542` |
| Botón **"Crear respaldo"** | `src/pages/Admin.tsx:2545` → `handleCreateBackup` (`:2377`) |
| Botón **"Abrir carpeta"** | `src/pages/Admin.tsx:2548` → `open_backups_dir` (`src-tauri/src/lib.rs:189`) |
| Botón **"Importar respaldo"** | `src/pages/Admin.tsx:2551` → `handleImportBackupSelected` (`:2419`) |
| Selector de archivo (`.db`, `.sqlite`, `.sqlite3`) | `src/pages/Admin.tsx:2588` |
| Interruptor **"Respaldo automático"** | `src/pages/Admin.tsx:2561-2566` (`backup_auto_enabled`) |
| Menú de frecuencia | `src/pages/Admin.tsx:2571-2573` → `BACKUP_INTERVAL_OPTIONS` |
| Letra chica *"Se conservan los últimos 20 respaldos automáticos…"* | `src/pages/Admin.tsx:2582` |
| Tabla de respaldos: **Archivo · Tipo · Fecha · Ruta · Acción** | `src/pages/Admin.tsx:2597-2601` |
| Botón **"Restaurar"** de cada fila | `src/pages/Admin.tsx:2623-2627` → `handleRestoreBackup` (`:2447`) |
| Etiquetas de tipo: Automático / Manual / Previo a restaurar / Otro | `BACKUP_KIND_LABELS` — `src/pages/Admin.tsx:64-68` |
| Estado vacío *"Aún no hay respaldos creados."* | `src/pages/Admin.tsx:2609` |

### Admin ▸ Inventario ▸ "Traer la toma física de otra computadora"

| Elemento en pantalla | Dónde vive |
|---|---|
| Panel de importación del **Excel de Patrimonio** (el de arriba) | `src/pages/Admin.tsx:1070` → `ImportarPatrimonioPanel.tsx` |
| Panel de **fusión del recorrido** (el de abajo) | `src/pages/Admin.tsx:1072` → `ImportarReportePanel.tsx` |
| Título **"Traer la toma física de otra computadora"** | `src/components/ImportarReportePanel.tsx:84` |
| Selector del `.csv` | `src/components/ImportarReportePanel.tsx:92-101` |
| Las cuatro cifras: *aparecieron · no aparecieron · ya estaban al día · sin recorrer* | `src/components/ImportarReportePanel.tsx:112-117` |
| Recuadro *"Esto **fusiona**, no reemplaza"* | `src/components/ImportarReportePanel.tsx:119-125` |
| Desplegable *"N equipos del reporte no existen en esta base"* | `src/components/ImportarReportePanel.tsx:127-141` |
| Aviso de filas sin etiqueta de Patrimonio | `src/components/ImportarReportePanel.tsx:143-148` |
| Botón **"Fusionar el recorrido"** | `src/components/ImportarReportePanel.tsx:167-175` |
| Letra chica *"Se hace un respaldo automático antes de escribir."* | `src/components/ImportarReportePanel.tsx:177-179` |
| Mensaje *"Este inventario ya está al día con el recorrido de ese archivo."* | `src/components/ImportarReportePanel.tsx:162-165` |

### De dónde sale el CSV (video 5)

| Elemento en pantalla | Dónde vive |
|---|---|
| Botón **"Exportar reporte para Patrimonio"** (lateral de la campaña) | `src/components/TomaFisicaPanel.tsx:694` |
| Botón **"Exportar reporte"** (al cerrar un área) | `src/components/TomaFisicaPanel.tsx:824` |
| Nombre del archivo: `reporte-inventario-2026-08-25.csv` | `src/utils/tomaFisica.ts:153-158` |
| Se escribe en la carpeta **`reportes`**, hermana de `backups` | `guardar_reporte_inventario` — `src-tauri/src/lib.rs:166` · carpeta en `:174` |

### Reglas de negocio que el video enseña

| Regla | Dónde está escrita |
|---|---|
| El respaldo automático viene **activado** y corre **cada 12 horas** de fábrica | `DEFAULT_INTERVAL_HOURS = 12` — `src/utils/backupSchedule.ts:8` · toggle por defecto en `Admin.tsx:2561` (`!== "false"`) |
| Las frecuencias son **cuatro y fijas**: 6 h, 12 h, un día, una semana | `BACKUP_INTERVAL_OPTIONS` — `src/utils/backupSchedule.ts:12-17` |
| Mientras la app está abierta, revisa **cada 15 minutos** si ya toca | `CHECK_INTERVAL_MS` — `src/hooks/useAutoBackup.ts:6` · temporizador en `:26-46` |
| **Si la app está cerrada, no hay respaldo.** No hay servicio de Windows detrás | `useAutoBackup` es un `useEffect` de React — `src/hooks/useAutoBackup.ts:26` · montado en `src/App.tsx:10` |
| Se conservan los **20 automáticos** más recientes; manuales y pre-restauración **nunca** se borran solos | `AUTO_BACKUP_KEEP = 20` — `src-tauri/src/lib.rs:23` · clasificación en `backup_kind` (`:69`) |
| Antes de restaurar, la app crea sola un respaldo **pre-restauración** | `restore_backup_from_bytes` (`src-tauri/src/lib.rs:238`) y `restore_backup_from_path` (`:252`) |
| Un archivo que no es base de datos se rechaza limpio | Validación `SQLite format 3\0` — `src-tauri/src/lib.rs:291` |
| Al restaurar se borran los auxiliares `-wal` y `-shm` | `src-tauri/src/lib.rs:332-335` |
| **Restaurar reemplaza TODA la base**, no la mezcla | `restore_from_bytes` — `src-tauri/src/lib.rs:282` |
| La **fusión del CSV** solo escribe `revisado_en`, `revisado_por`, `no_localizado_en`, `no_localizado_por` y `ubicacion` | `src/utils/reporteTomaFisica.ts:11-14` |
| Los préstamos **no comparten ninguna** de esas columnas: por eso las dos máquinas pueden trabajar a la vez | `src/utils/reporteTomaFisica.ts:13-14` |
| Gana **el dato más nuevo, equipo por equipo**; traer el mismo archivo dos veces no cambia nada | `planificarFusionReporte` — `src/utils/reporteTomaFisica.ts:225` · comparaciones en `:266` y `:281-289` |
| Una fila **sin fecha** no se aplica: se avisa y se salta | `src/utils/reporteTomaFisica.ts:255-260` |
| Las columnas del CSV se buscan **por nombre, no por posición** (el archivo puede pasar por Excel) | `COLUMNA` — `src/utils/reporteTomaFisica.ts:142-155` |
| Los equipos dados de **alta al vuelo** en la otra máquina salen listados aparte, para darlos de alta a mano | `desconocidos` — `src/utils/reporteTomaFisica.ts:248-252` · UI en `ImportarReportePanel.tsx:127-141` |

---

## 2. Correcciones al plan de la serie

Seis puntos del plan (o del README) describen la app de forma imprecisa o incompleta. El guion usa la versión correcta:

1. **No es "qué carpeta se sincroniza": son DOS carpetas, y se agregan por separado.** `backups` y `reportes` son **hermanas**, no una dentro de otra (`src-tauri/src/lib.rs:174` vs `:62`). Sin la segunda, el reporte de la toma física nunca llega a la otra computadora. Y **jamás** se sincroniza la carpeta padre: ahí vive `prestamos.db` con sus `-wal`/`-shm`, y Drive la corrompe.
2. **La frecuencia no es libre.** Son cuatro opciones de un menú — cada 6 horas, cada 12 horas, una vez al día, una vez por semana (`src/utils/backupSchedule.ts:12-17`). No se puede escribir un número.
3. **"Conserva los últimos 20" aplica solo a los automáticos.** Los manuales y los de pre-restauración no se borran nunca (`AUTO_BACKUP_KEEP` filtra por `kind == "auto"`, `src-tauri/src/lib.rs:23` y `:69`). Es la razón para crear uno manual antes de algo grande.
4. **La app no pide reiniciar: se recarga sola.** Tras restaurar o importar muestra el mensaje y recarga a los 1.2 segundos (`window.location.reload()` — `src/pages/Admin.tsx:2436-2438` y `:2457-2459`). El README todavía dice "Reinicia la app"; **el video muestra lo que hace la app**.
5. **El panel de fusión no es el mismo que el del Excel.** Están uno debajo del otro en la misma pestaña Inventario (`Admin.tsx:1070` y `:1072`). Confundirlos es el error más fácil de cometer: hay que mostrar los dos títulos en pantalla, juntos, una vez.
6. **La vista previa de la fusión no dice "nuevos / actualizados".** Dice **aparecieron · no aparecieron · ya estaban al día · sin recorrer** (`ImportarReportePanel.tsx:112-117`). Son palabras de recorrido, no de importación; la narración usa esas.

> 📌 **Pendiente real, no de guion:** `docs/RELEVO_TOMA_FISICA.md` marca que la carpeta `reportes` **todavía no está espejada en Drive**. Si sigue así el día de la grabación, la escena 5 se graba igual (enseña cómo se hace) pero **no se puede afirmar que ya esté configurado**.

---

## 3. Guion escena por escena

Formato: `⏱ tiempo · TÍTULO` → **Pantalla** (qué se ve) / **Voz** (narración literal) / **Nota de producción**.

### ⏱ 0:00 – 0:08 · Portada

- **Pantalla:** logo P15 sobre fondo limpio. Título grande: **“No perder datos”**. Subtítulo: *Video 6 de 6 · Respaldos y dos computadoras*.
- **Voz:** «Este es el video que evita el desastre: cómo se respalda la app, cómo se recupera, y cómo trabajar en dos computadoras sin perder nada.»
- **Nota:** logo en `app-prestamos-p15/img/logo-p15.png`.

### ⏱ 0:08 – 0:22 · La regla de oro, antes que nada

- **Pantalla:** dos tarjetas grandes, lado a lado, con iconos distintos. Izquierda, roja: **`.db` REEMPLAZA — la base completa**. Derecha, verde: **`.csv` FUSIONA — solo el recorrido**. Nada más en pantalla.
- **Voz:** «Guárdate esta imagen. El archivo punto d-b es la base completa: cuando entra, reemplaza todo. El archivo c-s-v es solo el resultado de un recorrido: cuando entra, se fusiona con lo que ya hay. Confundirlos es la única forma de perder trabajo en esta app.»
- **Nota:** esta tarjeta vuelve a aparecer en la escena 8 y en la 10. Es el ancla visual del video: **misma posición, mismos colores, sin animación de entrada la segunda vez.**

### ⏱ 0:22 – 0:38 · Los tres tipos de respaldo

- **Pantalla:** la tabla de respaldos del Admin, con tres filas resaltadas una por una en la columna **Tipo**: *Automático*, *Manual*, *Previo a restaurar*. Al resaltar cada una, el nombre del archivo se agranda: `prestamos-auto-…`, `prestamos-backup-…`, `prestamos-pre-restore-…`.
- **Voz:** «Hay tres tipos de respaldo, y los distingues por el nombre del archivo. El automático lo hace la app sola. El manual lo haces tú. Y el de “previo a restaurar” lo crea la app justo antes de sobrescribir algo, sin que se lo pidas: esa es tu red de seguridad.»
- **Nota:** las etiquetas exactas son las de `BACKUP_KIND_LABELS` (`Admin.tsx:64-68`). Copiarlas tal cual, con acento en *Automático*.

### ⏱ 0:38 – 0:54 · El automático ya está encendido

- **Pantalla:** sección Respaldos del Admin. Se resalta el interruptor **“Respaldo automático”** ya encendido, y se despliega el menú de frecuencia mostrando sus cuatro opciones. Abajo, la letra chica de los 20.
- **Voz:** «El respaldo automático viene encendido de fábrica, cada doce horas. Puedes cambiarlo a seis horas, un día o una semana. Se conservan los últimos veinte automáticos: los viejos se van borrando. Ojo con esto, porque los manuales no se borran nunca.»
- **Nota:** el menú tiene **exactamente cuatro** opciones. No inventar “cada hora”.

### ⏱ 0:54 – 1:06 · La app tiene que estar abierta

- **Pantalla:** ilustración simple: una computadora con la app abierta y un reloj marcando *cada 15 min* → aparece el archivo de respaldo. Al lado, la misma computadora apagada y el reloj tachado.
- **Voz:** «Una advertencia importante: la app revisa cada quince minutos si ya toca respaldar, pero solo mientras está abierta. No hay nada corriendo por detrás. Si la computadora está apagada, no se respalda nada.»
- **Nota:** nada de jerga (“servicio de Windows”, “demonio”). La imagen hace el trabajo.

### ⏱ 1:06 – 1:26 · Google Drive: las dos carpetas

- **Pantalla:** vista del explorador de Windows en `com.p15.prestamos`. Se ven tres cosas: la carpeta `backups`, la carpeta `reportes`, y el archivo `prestamos.db`. Un check verde entra sobre `backups`, otro sobre `reportes`. Después, una **X roja grande** sobre la carpeta padre completa.
- **Voz:** "Para que los respaldos también queden en la nube, se conecta Google Drive con el correo de la escuela y se agregan dos carpetas: “backups”, y también “reportes”, que es donde caen los reportes de la toma física. Son carpetas hermanas: hay que agregarlas por separado. Y nunca, nunca agregues la carpeta que las contiene: ahí vive la base de datos viva, y Drive la corrompe."
- **Nota:** es la escena de mayor riesgo real del video. El paso a paso de Drive vive en el README §“Respaldos en Google Drive”; el video **no** enumera los seis pasos, solo muestra qué se agrega y qué no. Mencionar en pantalla, como texto pequeño: *Drive es un espejo, no un archivo: si la app borra un respaldo viejo, Drive también lo borra.*

### ⏱ 1:26 – 1:38 · Un respaldo a mano, antes de algo grande

- **Pantalla:** se pulsa **“Crear respaldo”**, aparece el mensaje verde con la ruta, la tabla gana una fila nueva de tipo *Manual*. Después se pulsa **“Abrir carpeta”** y se abre el explorador.
- **Voz:** «Antes de algo grande —importar el Excel, actualizar la app, cerrar el ciclo escolar— haz uno a mano con “Crear respaldo”. Ese no se borra solo. Con “Abrir carpeta” llegas al archivo para copiarlo a una USB.»
- **Nota:** el mensaje real es `Respaldo creado en …` (`Admin.tsx:2383`). Mostrar la ruta borrosa o acortada; no exponer rutas de una máquina real.

### ⏱ 1:38 – 1:56 · Restaurar

- **Pantalla:** la tabla de respaldos. Se pulsa el **“Restaurar”** de una fila; sale el cuadro de confirmación con su texto completo. Se acepta, aparece el mensaje verde y la app se recarga sola. Corte a: el botón **“Importar respaldo”** eligiendo un `.db` desde una USB.
- **Voz:** «Para volver atrás, cada fila de la tabla trae su botón “Restaurar”. Y si el archivo viene de fuera —de una USB o descargado de Drive— usa “Importar respaldo”. En los dos casos la app te avisa qué va a pasar, guarda ese respaldo de seguridad previo, y se recarga sola al terminar.»
- **Nota:** el cuadro de confirmación dice literalmente *“Todo lo que se haya registrado después de esa fecha se perderá”* (`Admin.tsx:2448`). **Dejarlo legible en pantalla al menos 2 segundos.** La recarga es a los 1.2 s: la animación debe respetarlo.

### ⏱ 1:56 – 2:10 · Por eso el .db no sirve para volver

- **Pantalla:** vuelve la tarjeta roja de la escena 2. Debajo, una animación en dos carriles: *Computadora principal* prestando equipo todo el día, *Segunda computadora* recorriendo el edificio. Una flecha lleva el `.db` de la segunda a la principal y **tacha** todo el carril de préstamos.
- **Voz:** «Aquí está la trampa. Si la segunda computadora te devuelve su base completa, borra todos los préstamos que la principal registró mientras tanto. El punto d-b sirve para montar la segunda computadora, una sola vez. Para traer el trabajo de vuelta, nunca.»
- **Nota:** el tachado tiene que doler visualmente. Es el momento que el video existe para enseñar.

### ⏱ 2:10 – 2:34 · Lo que sí vuelve: el reporte

- **Pantalla:** en la segunda computadora, botón **“Exportar reporte”** → aparece el archivo `reporte-inventario-2026-08-25.csv`. Corte a la principal: **Admin ▸ Inventario**, se baja hasta el panel **“Traer la toma física de otra computadora”** (se ve un instante el panel del Excel arriba, para diferenciarlos), se elige el CSV y salen las cuatro cifras y el recuadro de *fusiona, no reemplaza*. Se pulsa **“Fusionar el recorrido”**.
- **Voz:** «Lo que sí vuelve es el reporte. En la segunda computadora, “Exportar reporte”. En la principal, pestaña Inventario, hasta abajo: “Traer la toma física de otra computadora”. Eliges el archivo y la app te muestra qué va a pasar antes de tocar nada: cuántos aparecieron, cuántos no, y cuántos ya estaban al día. Confirmas, y listo. Solo escribe lo del recorrido. Los préstamos no se tocan.»
- **Nota:** el panel de fusión está **debajo** del de Patrimonio (`Admin.tsx:1070` y `:1072`). El desplazamiento tiene que dejar ver los dos títulos en el mismo cuadro por un segundo.

### ⏱ 2:34 – 2:44 · Lo que no se fusiona solo

- **Pantalla:** el desplegable **“N equipos del reporte no existen en esta base”**, abierto, con tres IDs de ejemplo.
- **Voz:** «Una sola cosa queda pendiente: los equipos que se dieron de alta al vuelo allá todavía no existen aquí. La app te los lista para que los des de alta a mano, porque el reporte no trae su categoría y elegirla por ti sería adivinar.»
- **Nota:** mencionar de paso, sin escena propia, que traer el mismo archivo dos veces no cambia nada — texto pequeño en pantalla: *Gana el dato más nuevo, equipo por equipo.*

### ⏱ 2:44 – 2:50 · Cierre

- **Pantalla:** logo P15 y una sola línea: *“El `.db` reemplaza. El `.csv` fusiona.”*
- **Voz:** —
- **Nota:** sin voz. Es la única frase que tienen que recordar.

> ⏱ **Suma:** 170 s (2:50), por encima de los ~2:30 del plan. Si hay que recortar, **el candidato es la escena 4** (los tres tipos de respaldo se pueden dejar en la tabla, sin resaltarlos uno por uno). **No** recortar las escenas 2, 9 y 10: son el video.

---

## 4. Datos de demo necesarios

Preparar una base de demostración (nunca la de producción) con:

- **Al menos cinco respaldos** en la tabla, cubriendo los tres tipos: dos `prestamos-auto-…`, uno `prestamos-backup-…` y uno `prestamos-pre-restore-…`. La columna Tipo debe mostrar las cuatro etiquetas posibles al menos una vez entre las tomas.
- **Rutas ficticias** en la columna Ruta, o esa columna recortada. Nunca la ruta real de una máquina de la escuela.
- Un **`reporte-inventario-….csv`** de ejemplo que produzca las cuatro cifras distintas de cero: equipos que aparecieron, equipos con `Localizado = N`, equipos ya al día (con `revisado_en` más nuevo que el del archivo) y filas con `Localizado` vacío.
- **Al menos dos IDs patrimoniales del CSV que no existan** en la base de demo, para que salga el desplegable de altas al vuelo.
- **Préstamos activos** en la base de la principal, para que la escena 9 pueda tacharlos y se entienda qué se pierde.
- Una carpeta de ejemplo en el explorador con `backups`, `reportes` y `prestamos.db` visibles al mismo nivel.

## 5. Fuera de alcance de este video

- Cómo se hace la toma física (el recorrido, la pistola, el alta al vuelo) → Video 5.
- Importar el Excel de Patrimonio → Video 3. Aquí solo se menciona que también crea un respaldo antes de aplicar.
- El paso a paso de instalar y configurar Google Drive para Escritorio → README §“Respaldos en Google Drive”. El video enseña **qué carpetas** y **cuál nunca**, no los seis clics.
- `scripts/backup_sqlite.py` y `restore_sqlite.py` → perfil técnico, viven en el README.
- Copiar `prestamos.db` a mano con la app cerrada → README. Es una salida de emergencia, no una rutina.

## 6. Guiones hermanos

- Video 1 — [Kiosko: prestar y devolver](../01-kiosko/GUION.md) ✅ producido
- Videos 2 a 5 — pendientes de guion
