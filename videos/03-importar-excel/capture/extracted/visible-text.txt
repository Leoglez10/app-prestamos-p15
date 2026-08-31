# 🎬 Video 3 — Importar el Excel de Patrimonio

> Guion de producción. Todo lo que se afirma aquí está verificado contra el código
> del repositorio (`v0.6.0`); cada paso lleva su referencia `archivo:línea`.

| Campo | Valor |
|---|---|
| **Duración estimada** | ~2:25 — estimada, no medida. La real la manda la narración sintetizada |
| **Público** | La persona administradora del inventario (una, dos a lo mucho). No es un video para todo el personal |
| **Objetivo** | Que importe el Excel oficial sin miedo, entienda por qué después "no se puede pedir nada", y sepa deshacerlo |
| **Herramienta** | HyperFrames · preset `blue-professional` · voz HeyGen (español) |
| **Formato** | 1920×1080, 30 fps |
| **Narración** | Voz en off, español neutro, tono tranquilo de instructivo |
| **Estado** | ⬜ Guion listo · falta construir |
| **Plan de la serie** | [../../VIDEOS_TUTORIALES.md](../../VIDEOS_TUTORIALES.md) |

---

## 1. Mapa del código — dónde vive cada cosa que se muestra

Referencias relativas a `app-prestamos-p15/` (el proyecto anidado).

### El panel de importación

| Elemento en pantalla | Dónde vive |
|---|---|
| Pestaña **Inventario** de la barra lateral de Admin | `src/pages/Admin.tsx:2814` → `InventarioPanel` (`:387`) |
| El panel de importación, **al final** de esa pestaña | `src/pages/Admin.tsx:1070` |
| Título **"Importar inventario de Patrimonio"** | `src/components/ImportarPatrimonioPanel.tsx:82` |
| Selector de archivo (`.xlsx`, `.xls`) | `ImportarPatrimonioPanel.tsx:89-98` |
| Indicador **"Trabajando…"** | `ImportarPatrimonioPanel.tsx:101` |
| Cifra **"equipos nuevos"** (azul) | `ImportarPatrimonioPanel.tsx:110` |
| Cifra **"se actualizan"** (ámbar) | `ImportarPatrimonioPanel.tsx:111` |
| Cifra **"sin cambios"** (gris) | `ImportarPatrimonioPanel.tsx:112` |
| Línea **"Se crearán estas categorías: …"** | `ImportarPatrimonioPanel.tsx:115-119` |
| Recuadro gris con la regla de "solo inventario" | `ImportarPatrimonioPanel.tsx:121-128` |
| Desplegable **"N avisos del archivo"** (muestra 50, luego "… y N más") | `ImportarPatrimonioPanel.tsx:130-140` |
| Botón **"Aplicar importación"** | `ImportarPatrimonioPanel.tsx:145-153` |
| Nota **"Se hace un respaldo automático antes de escribir."** | `ImportarPatrimonioPanel.tsx:155-157` |
| Mensaje final: `Listo: N equipos nuevos, N actualizados, N sin cambios. Respaldo previo: …` | `ImportarPatrimonioPanel.tsx:64-67` |
| Estado **"El inventario ya está al día con este archivo."** | `ImportarPatrimonioPanel.tsx:143` |

### Lectura del archivo (Rust)

| Qué pasa | Dónde vive |
|---|---|
| Se lee **la primera hoja** del libro | `src-tauri/src/patrimonio.rs:159-162` |
| Las columnas se ubican **por nombre, no por posición** | `patrimonio.rs:172-178` |
| Columnas obligatorias: **`Id`** y **`Clasificador descripción`** | `COLUMNAS_REQUERIDAS` — `patrimonio.rs:48` |
| Error si falta una: *"Al archivo le faltan columnas obligatorias: … ¿Es el listado de Patrimonio?"* | `patrimonio.rs:185-190` |
| Fila sin `Id`: se salta **en silencio** (es el renglón de totales o el blanco final) | `patrimonio.rs:203-207` |
| Fila sin clasificador → aviso *"el ID … no tiene clasificador. Se omite."* | `patrimonio.rs:209-212` |
| `Id` repetido → aviso *"ya apareció en la fila N. Se omite la repetida."* | `patrimonio.rs:214-219` |
| Texto dañado que no se pudo reparar → aviso *"trae caracteres dañados…"* | `patrimonio.rs:221-226` |
| Fecha que no se entiende → aviso *"no se entendió la fecha … Queda vacía."* | `patrimonio.rs:228-238` |
| `S/N`, `S/M`, `N/A`, `NINGUNA`, `------` se leen como **sin dato** | `SENTINELAS` — `patrimonio.rs:51` · `celda_limpia` (`:96`) |
| `CAÃ\`ON PROYECTOR` se repara a `CAÑON PROYECTOR` | `reparar_mojibake` — `patrimonio.rs:86-88` |
| Archivo sin ninguna fila con ID → error *"El archivo no trae ninguna fila con ID de Patrimonio."* | `patrimonio.rs:253` |

### La decisión: qué se hace con cada fila

| Regla | Dónde está escrita |
|---|---|
| La llave es el **ID de Patrimonio**, y es **texto**, no número | `patrimonio.rs:11-12` · `planificarImportacion` (`src/utils/importacionPatrimonio.ts:141-143`) |
| **Todo entra como "solo inventario"** (`es_prestable: 0`), sin excepción | `destinoDeClasificador` — `src/utils/importacionPatrimonio.ts:99-106` |
| Las categorías nuevas también nacen **no prestables** | `createCategoria(nombre, false)` — `src/hooks/useInventory.ts:1834` |
| 16 clasificadores se agrupan en categorías legibles (Laptops, Cámaras, Audio…) | `CATEGORIA_POR_CLASIFICADOR` — `importacionPatrimonio.ts:75-92` |
| Lo que no está en ese mapeo cae en **"Patrimonio (sin clasificar)"** | `CATEGORIA_SIN_CLASIFICAR` — `importacionPatrimonio.ts:63` |
| Al reimportar **solo se pisan** marca, modelo, num. serie, descripción, resguardante y fecha | `CAMPOS_DE_PATRIMONIO` — `importacionPatrimonio.ts:53-61` |
| **Nunca** se pisan `ubicacion`, `es_prestable`, `categoria_id` ni `nombre_equipo` | `importacionPatrimonio.ts:43-52` |
| Solo se manda lo que de verdad cambió (reimportar el mismo archivo no escribe nada) | `importacionPatrimonio.ts:164-179` |
| El nombre del equipo importado **es el clasificador** (`COMPUTADORA PORTATIL`) | `useInventory.ts:1855` |
| Cada fila entra como pieza **única**: `es_granel: 0`, `stock_total: 1` | `useInventory.ts:1859-1860` |
| La `ubicacion` del Excel solo se usa **al dar de alta**, nunca al actualizar | `useInventory.ts:1868-1870` |

### La escritura

| Regla | Dónde está escrita |
|---|---|
| **Respaldo antes de tocar nada** | `createBackup(false)` — `useInventory.ts:1830` |
| Ese respaldo se llama `prestamos-backup-…` y en la tabla sale como **"Manual"** | `MANUAL_BACKUP_PREFIX` · `backup_kind` — `src-tauri/src/lib.rs:19` y `:69-79` |
| **No lo borra la limpieza automática**: solo se podan los `auto` | `prune_auto_backups` — `src-tauri/src/lib.rs:85-110` |
| Todo o nada: una sola transacción; si truena, no queda nada a medias | `ejecutarEnTransaccion` — `useInventory.ts:1883-1894` |
| ID de Patrimonio duplicado contra la base → *"El Excel trae un ID de Patrimonio que ya esta registrado en otro equipo. No se importo nada."* | `useInventory.ts:1889-1893` |

### Encender el préstamo después

| Elemento en pantalla | Dónde vive |
|---|---|
| **Un equipo se presta solo si el equipo Y su categoría lo permiten** | `esPrestableEfectivo` — `src/utils/equipoFicha.ts:49-52` |
| Botón **Prestable / Solo inventario** por categoría (pestaña Categorías) | `Admin.tsx:1884-1903` → `handleToggleLoanability` (`:1707`) |
| Toggle **"Prestable · Visible en kiosko"** por equipo, dentro de la categoría | `Admin.tsx:2013-2062` |
| Toggle **"Mostrar en kiosko"** en la ficha completa del equipo (pestaña Inventario) | `src/components/EquipoFormDialog.tsx:327-332` |
| Chips de vista **Prestables / Solo inventario** con su conteo | `Admin.tsx:584-585` · `cumpleFiltro` (`:576`) |
| Columna que dice *Prestable* o *Solo inventario* por fila | `Admin.tsx:979-980` |
| El buscador cubre nombre, identificador, **ID patrimonial, marca, modelo, num. serie y ubicación** | `Admin.tsx:560-567` |
| El kiosko solo muestra lo prestable efectivo | `loadEquipos` — `src/pages/Kiosk.tsx:107-115` |

### Deshacer

| Elemento en pantalla | Dónde vive |
|---|---|
| Admin ▸ **Configuración** ▸ tarjeta **Respaldos** | `ConfiguracionPanel` — `Admin.tsx:2337` · tabla (`:2596-2632`) |
| Botón **Restaurar** por fila | `Admin.tsx:2620-2628` → `handleRestoreBackup` (`:2447`) |
| Confirmación: *"…reemplazará la base actual. Todo lo que se haya registrado después de esa fecha se perderá…"* | `Admin.tsx:2448` |
| Antes de restaurar se guarda **otro** respaldo (`pre-restore`) y **la app se recarga** | `Admin.tsx:2456-2461` |

---

## 2. Correcciones al plan de la serie

Tres puntos del plan describen la app de forma imprecisa. El guion usa la versión correcta.

1. **"Activar préstamo en Categorías (toggle por categoría) o por equipo individual" está mal: no es *o*, es *y*.**
   `esPrestableEfectivo` exige las dos cosas (`src/utils/equipoFicha.ts:52`), y la importación deja
   **ambas apagadas** (equipo con `es_prestable: 0` en `importacionPatrimonio.ts:105`, categoría creada con
   `false` en `useInventory.ts:1834`). Prender solo la categoría **no hace aparecer nada en el kiosko**.
   Este es exactamente el error #1 que el video existe para evitar; si el guion lo dice mal, el video
   empeora el problema en vez de arreglarlo.

2. **El respaldo previo no aparece como "automático".** La app lo llama así en pantalla
   (`ImportarPatrimonioPanel.tsx:156`), pero se crea con `createBackup(false)` y el archivo se llama
   `prestamos-backup-…`, así que en la tabla de Configuración la columna **Tipo dice "Manual"**
   (`src-tauri/src/lib.rs:69-79`). Si el video dice "busca el automático", la persona no lo encuentra.
   La buena noticia hay que decirla: **por eso mismo no se borra** — la poda de los 20 solo toca los
   `auto` (`lib.rs:85-110`).

3. **No hay forma masiva de encender equipos.** La tabla de Inventario no tiene casillas de selección
   ni acción en bloque: es uno por uno. El video no puede sugerir "y ya prendes las laptops"; tiene que
   enseñar el criterio real — **encender solo lo que de verdad circula**, que son decenas, no miles.

---

## 3. Guion escena por escena

Formato: `⏱ tiempo · TÍTULO` → **Pantalla** (qué se ve) / **Voz** (narración literal) / **Nota de producción**.

### ⏱ 0:00 – 0:08 · Portada

- **Pantalla:** logo P15 sobre fondo limpio. Título grande: **"Importar el Excel de Patrimonio"**. Subtítulo: *Video 3 de 6 · Administración*.
- **Voz:** «Patrimonio te manda el listado oficial en Excel. Vamos a meterlo a la app sin romper nada de lo que ya tienes.»
- **Nota:** logo en `app-prestamos-p15/img/logo-p15.png`.

### ⏱ 0:08 – 0:22 · Qué es este archivo

- **Pantalla:** una hoja de Excel de ejemplo, con las columnas **Id**, **Clasificador descripción**, Marca, Modelo, Núm. Serie, Ubicación. Resaltar las dos primeras con un halo.
- **Voz:** «Es el listado que entrega la Coordinación de Patrimonio: miles de renglones, uno por cada bien de la escuela. De todas sus columnas, la app necesita dos: el Id y el Clasificador. Las busca por nombre, así que no importa en qué orden vengan.»
- **Nota:** el Excel real trae 2137 filas × 16 columnas. Usar filas inventadas en pantalla, **nunca** el archivo real.

### ⏱ 0:22 – 0:34 · Dónde está el panel

- **Pantalla:** Admin abierto. Clic en **Inventario** en la barra lateral; la página baja hasta el final y aparece **"Importar inventario de Patrimonio"**.
- **Voz:** «El panel vive hasta abajo de la pestaña Inventario, en Administrador. Ahí, y en ningún otro lado.»
- **Nota:** mostrar el scroll completo, no un corte: la queja real es "no lo encuentro".

### ⏱ 0:34 – 0:52 · Elegir el archivo y leer el plan

- **Pantalla:** clic en el selector, se elige el `.xlsx`, parpadea **"Trabajando…"** y aparecen las tres cifras: **equipos nuevos**, **se actualizan**, **sin cambios**, más la línea *"Se crearán estas categorías: Laptops, Proyectores, Patrimonio (sin clasificar)"*.
- **Voz:** «Eliges el archivo y la app te dice qué va a pasar antes de hacerlo: cuántos entran nuevos, cuántos se actualizan y cuántos ya estaban igual. Todavía no se guardó nada.»
- **Nota:** las tres cifras son las tarjetas de `ImportarPatrimonioPanel.tsx:110-112`. Respetar los colores: azul, ámbar, gris.

### ⏱ 0:52 – 1:06 · Los avisos

- **Pantalla:** se abre el desplegable **"12 avisos del archivo"** y se lee la lista: *"Fila 84: el ID 3294832 ya apareció en la fila 51. Se omite la repetida."*, *"Fila 210: no se entendió la fecha «29-05-23». Queda vacía."*
- **Voz:** «Si algo del archivo viene raro —un Id repetido, una fecha que no se entiende, un renglón sin tipo de equipo— aparece aquí en vez de entrar callado a la base. Léelos: no son errores de la app, son cosas del archivo.»
- **Nota:** los textos son literales de `patrimonio.rs:214-238`. Si hay más de 50 avisos, la lista corta y dice *"… y N más"*.

### ⏱ 1:06 – 1:20 · Aplicar

- **Pantalla:** clic en **"Aplicar importación"**. Aparece el mensaje verde: *"Listo: 2137 equipos nuevos, 0 actualizados, 0 sin cambios. Respaldo previo: prestamos-backup-2026-08-29_10-14-02.db"*.
- **Voz:** «Al aplicar, lo primero que hace la app es guardar un respaldo completo. Después escribe todo de un solo golpe: o entra completo, o no entra nada. Nunca a medias.»
- **Nota:** el nombre del respaldo en pantalla debe empezar con `prestamos-backup-`. Es el que se usa en la escena de deshacer; que se lea bien.

### ⏱ 1:20 – 1:42 · La regla que hay que entender

- **Pantalla:** el kiosko, vacío, con el mensaje de que no hay equipos. Corte a la pestaña Inventario con miles de filas, todas con la etiqueta gris **"Solo inventario"**. Rótulo grande: **El Excel organiza. La escuela decide qué se presta.**
- **Voz:** «Y aquí viene lo importante. Todo lo que entra por el Excel queda como "solo inventario": está registrado, pero nadie lo puede pedir. Es a propósito. En ese listado hay ventiladores, escritorios y pizarrones; ninguno se presta. Patrimonio organiza el inventario, pero la escuela decide qué circula.»
- **Nota:** es el corazón del video. Dejar el rótulo en pantalla 3 segundos completos.

### ⏱ 1:42 – 2:06 · Encender lo que sí se presta

- **Pantalla:** dos pasos encadenados, numerados en pantalla. **(1)** Pestaña **Categorías**: clic en el botón de la fila "Laptops", que pasa de *Solo inventario* a **Prestable**. **(2)** Dentro de esa categoría, se abre una laptop y se enciende el toggle **"Prestable · Visible en kiosko"**. Corte al kiosko: ahora sí aparece.
- **Voz:** «Para que algo se pueda pedir hacen falta dos interruptores, no uno: el de la categoría y el del equipo. Si prendes solo la categoría, el kiosko sigue vacío, y esa es la confusión más común. Enciende únicamente lo que de verdad se presta: son unas decenas de aparatos, no miles.»
- **Nota:** el error se ve mejor si se muestra: prender solo la categoría, ir al kiosko, seguir vacío, regresar y prender el equipo. Vale los segundos.

### ⏱ 2:06 – 2:18 · Volver a importar no borra tu trabajo

- **Pantalla:** se importa el mismo archivo otra vez. Sale *"El inventario ya está al día con este archivo."*. Al lado, una tarjeta de equipo conserva su **ubicación**, su **categoría** y su toggle **Prestable** encendido.
- **Voz:** «El mes que viene te mandan el archivo actualizado y lo vuelves a importar sin miedo: actualiza marca, modelo y número de serie, pero nunca toca la ubicación, la categoría ni lo que ya marcaste como prestable. Eso lo pusiste tú, y se queda.»
- **Nota:** la lista exacta de campos que sí se pisan está en `CAMPOS_DE_PATRIMONIO`. No prometer más de esos siete.

### ⏱ 2:18 – 2:30 · Deshacer

- **Pantalla:** Admin ▸ **Configuración** ▸ tarjeta **Respaldos**. Se resalta la fila cuyo **Tipo** dice **Manual**, con la fecha y hora de la importación, y se pulsa **Restaurar**. Aparece el diálogo de confirmación.
- **Voz:** «¿Y si algo salió mal? En Configuración, en la lista de respaldos, busca el que dice "Manual" con la hora de la importación y pulsa Restaurar. Vuelve todo a como estaba. Ojo: también se pierde lo que se haya registrado después de esa hora.»
- **Nota:** el tipo en pantalla dice **Manual**, no "Automático" — verificado en `backup_kind`. No decir "automático" aquí; el video se cae solo.

### ⏱ 2:30 – 2:34 · Cierre

- **Pantalla:** logo P15 y una sola línea: *"El Excel organiza. Tú decides qué se presta."*
- **Voz:** —
- **Nota:** sin voz; deja respirar el final. Misma estructura de cierre que el video 1.

---

## 4. Datos de demo necesarios

Base de demostración (nunca la de producción) y un Excel de mentiras:

- Un **`.xlsx` inventado** con encabezados reales (`Id`, `Clasificador descripción`, `Marca`, `Modelo`, `Num Serie`, `Fecha adquisición`, `Ubicación`) y ~40 filas. **Nunca** el `Listado Equipo Luz.xlsx` real: trae nombres de resguardantes.
- Entre esas filas, a propósito: **un `Id` repetido**, **una fila sin clasificador** y **una fecha con formato roto** — así el desplegable de avisos tiene qué mostrar.
- Al menos un clasificador **mapeado** (`COMPUTADORA PORTATIL` → Laptops) y uno **no mapeado** (p. ej. `VENTILADOR DE TECHO` → *Patrimonio (sin clasificar)*), para que se vean las dos categorías nuevas.
- Una base **con algo previo**: dos o tres equipos ya dados de alta con su `id_patrimonial`, uno de ellos con **ubicación puesta a mano**, para la escena de la reimportación.
- Al menos **una categoría prestable** que ya exista, para contrastar con las nuevas.
- Un respaldo previo en la carpeta, para que la tabla de Configuración no salga vacía.

## 5. Fuera de alcance de este video

- Alta manual de equipos y de categorías → Video 2.
- Toma física y "no localizado" → Video 5.
- Los tres tipos de respaldo, Drive y el relevo entre dos computadoras → Video 6. Aquí solo se usa **una** restauración, la de deshacer esta importación.
- El detalle de por qué el COG no sirve como categoría: es documentación de ingeniería, vive en [`docs/PLAN_IMPORTACION_PATRIMONIO.md`](../../app-prestamos-p15/docs/PLAN_IMPORTACION_PATRIMONIO.md) §2.1.

## 6. Notas para construirlo

Mismo camino que el video 1 (ver [`../01-kiosko/GUION.md`](../01-kiosko/GUION.md) §6). Lo que cambia aquí:

1. **La UI se reconstruye en HTML, no se captura.** Copiar los rótulos tal cual, faltas de tilde incluidas (*"No se importo nada."*, *"Se hace un respaldo automático antes de escribir."*).
2. **Los números en pantalla tienen que ser coherentes entre escenas.** Si la vista previa dice 2137 nuevos, el mensaje verde dice 2137 y la tabla de Inventario muestra esa magnitud. Un número que cambia solo delata la maqueta.
3. **La escena del error (categoría prendida, kiosko vacío) necesita tres planos**: toggle → kiosko vacío → toggle del equipo → kiosko con la laptop. Presupuestar los segundos desde el guion, no recortarlos en la edición.
4. La duración de arriba es **estimada**. Después de sintetizar la narración, `audio.mjs sync-durations` manda; hay que reajustar los tiempos de `STORYBOARD.md` y actualizar la tabla de [`../../VIDEOS_TUTORIALES.md`](../../VIDEOS_TUTORIALES.md) con la real.
