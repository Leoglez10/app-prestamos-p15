# Plan: de app de préstamos a app de inventario

Estado: **P1 a P4 implementados. Queda P5.** Fecha: 2026-08-25.

## El cambio de alcance

La app deja de ser *solo* el sistema de préstamos y pasa a ser el **inventario de
la escuela**, conservando los préstamos intactos como una función más.

El objetivo declarado: **que con el código de barras se ubiquen más rápido los
objetos.** Eso no es una pantalla nueva de consulta — es la *toma física de
inventario*, el trabajo que hoy se hace con hoja de papel y que es el verdadero
dolor de la escuela.

Ese objetivo reordena todo lo demás en este documento. Ver §3.

Reemplaza a `docs/INVENTARIO_PATRIMONIO.md` §7, que decía *"el Excel todavía no
está en nuestras manos"*. Ya llegó: `Listado Equipo Luz.xlsx`, **2137 filas × 16
columnas**.

Hermanos: [`INVENTARIO_PATRIMONIO.md`](INVENTARIO_PATRIMONIO.md) (leer la etiqueta
UdeG en vez de reetiquetar), [`ROADMAP.md`](ROADMAP.md) §§4-6, [`QR_CELULAR.md`](QR_CELULAR.md).

---

## 1. Las columnas reales

| # | Columna | Distintos | Veredicto |
| --- | --- | --- | --- |
| A | Tipo | **1** (`Equipo`) | Constante. Se descarta. |
| B | **Id** | **2137 únicos** | **La llave.** → `id_patrimonial` |
| C | COG Descripción | 20 | Partida contable, **no** categoría. Se descarta (§2.1). |
| D | **Clasificador descripción** | 190 | El tipo real. → `nombre_equipo` + mapeo de categoría |
| E | Resguardante | 59 | Código de empleado. → `resguardante_codigo` |
| F | Resguardante nombre | 59 | → `resguardante_nombre` |
| G | Fecha adquisición | 359 | `dd/mm/yyyy 00:00:00` → `fecha_adquisicion` (a ISO) |
| H | Descripción | 642 | Specs libres (RAM, procesador…). → `descripcion` |
| I | Estatus | **1** (`Activo`) | Constante. Se descarta. |
| J | Origen | 3 | `PATME`/`SICI`/`Histórico`. Sin uso operativo. Se descarta. |
| K | Observaciones | 19 filas útiles | Ruido. Se descarta. |
| L | **Ubicación** | 150 filas útiles (7%) | **Entra, y es central.** Ver §3.2. |
| M | Marca | 224 (383 con `S/M`) | → `marca` |
| N | Modelo | 422 (611 con `S/M`) | → `modelo` |
| O | Num Serie | 1313 reales, **11 duplicados** | **No es llave.** → `num_serie`, informativo |
| P | **Localizado** | **1** (`S`) | **No es un descarte: es la salida.** Ver §3.3. |

---

## 2. Las tres minas

Ninguna se ve abriendo el archivo. Las tres cambian el diseño.

### 2.1 El COG no es padre del Clasificador

La intuición natural es un árbol: 20 COGs arriba, 190 clasificadores colgando.
**No funciona.** 46 de los 190 clasificadores aparecen en más de un COG:

| Clasificador | Aparece en… |
| --- | --- |
| `COMPUTADORA` | `Equipo de cómputo y de tecnologías de la información` **y** `Equipo informático` |
| `CAMARA` | **7** COGs distintos |
| `EQUIPO DE AIRE ACONDICIONADO` | `Otros mobiliarios…` **y** `Sistemas de aire acondicionado…` |

El COG es la **partida presupuestal con la que se compró el bien**, no una
clasificación del objeto. Dos laptops idénticas compradas en años distintos caen
en COGs distintos.

Consecuencia: **ninguna de las dos columnas sirve como `categorias`.**

- `categorias = COG` (20) → árbol que miente; buscás laptops en dos lados.
- `categorias = Clasificador` (190) → 190 chips en el kiosco. Inusable.

**Decisión: `categorias` se sigue curando a mano.** El clasificador entra como
`nombre_equipo`; un mapeo fijo en el importador manda los ~15 tipos préstables a
las categorías que ya existen, y todo lo demás cae en `Patrimonio (sin clasificar)`.

### 2.2 Mojibake en el archivo de origen

```
20 filas  CAÃ`ON PROYECTOR
 1 fila   CAÑON PROYECTOR
```

El **mismo** clasificador partido en dos por doble encoding en el export de
Patrimonio (UTF-8 leído como Latin-1). También `EQUIPO DE CREDENCIALIZACIÃ¿N`.

Se repara **en el importador**, no a mano en el Excel: el archivo va a salir con el
mismo defecto la próxima vez que Patrimonio lo genere.

### 2.3 El 78% del inventario no se presta — y eso ahora está bien

De 2137 filas, la mayoría es infraestructura fija:

```
339 COMPUTADORA (escritorio)   79 BALANZA        45 EQUIPO DE AIRE ACONDICIONADO
112 MONITOR                    77 MICROSCOPIO    39 PINTARRON
 82 NO BREAK                   73 VENTILADOR     36 MESA / 32 EXTINTOR
```

Préstables reales: ~**450-500 (22%)** — `COMPUTADORA PORTATIL` (199), `MICRÓFONO`
(57), `CAMARA` (52), `SISTEMA INALAMBRICO` (38), `PROYECTOR` (35), `CAÑON PROYECTOR`
(21), `VIDEO CAMARA` (15), `TABLETA ELECTRONICA` (14) y unos pocos más.

Con el alcance nuevo **las 2137 entran igual**: un ventilador de techo no se presta
pero sí se inventaría. Lo que separa los dos mundos es `es_prestable`.

**Regla: todo entra con `es_prestable = 0`**, y se habilita por tipo, no fila por fila.

> **Ya funciona solo.** `Kiosk.tsx:106` y `:111` filtran `es_prestable === 1` del
> lado del cliente. Con el default en 0, las 2137 filas entran **sin ensuciar la
> pantalla de préstamos**, sin tocar una línea del kiosco.

---

## 3. El inventariado: lo que realmente se está pidiendo

### 3.1 El flujo, tal como pasa en la realidad

Alguien camina el edificio con la pistola. En cada aula:

1. Elige la ubicación **una vez** (`Aula 12`).
2. Dispara contra cada etiqueta. Cada escaneo, en un solo paso:
   - resuelve el objeto y **muestra qué es** (`COMPUTADORA PORTATIL · DELL · Latitude`),
   - lo marca **visto hoy**,
   - le **estampa la ubicación** actual.
3. Si el código no existe en la base → *"¿qué equipo es este?"*, se liga y sigue.

Sin teclear, sin cambiar de pantalla entre disparo y disparo. Ese bucle es el
producto. Todo lo demás en este plan existe para que ese bucle funcione.

### 3.2 Por qué `ubicacion` pasa a ser un campo de primera

En el plan anterior la había descartado: 150 filas útiles de 2137 es 7% de
cobertura, no justifica una columna.

**Con el alcance nuevo el razonamiento se invierte.** Ubicar objetos rápido es el
objetivo declarado, y la ubicación no viene del Excel — **la produce la toma de
inventario**. Se entra con 7% lleno y se sale con 90%, caminando con la pistola.
La columna no guarda lo que Patrimonio sabe; guarda lo que la escuela averigua.

### 3.3 `Localizado` no es un descarte: es la salida

Que la columna `Localizado` traiga `S` en las 2137 filas la hacía parecer basura
constante. No lo es: es el **resultado de la última toma física** de Patrimonio.

Es exactamente la columna que la app va a **producir**. Ahí está el valor concreto
que la escuela puede enseñar: un Excel de vuelta, con qué se localizó, dónde, y
qué no apareció.

Por eso **exportar sube de prioridad**: es el entregable de una toma de inventario,
no un extra.

#### `Localizado` tiene tres estados, no dos

La primera versión mandaba `S` para lo revisado y `N` para todo lo demás. Eso
convertía "todavía no llegué a esa aula" en "este equipo no aparece", firmado por
quien recorre. Un reporte que afirma pérdidas que nadie comprobó no sirve.

| Valor | Qué significa | De dónde sale |
| --- | --- | --- |
| `S` | Apareció | `revisado_en` dentro de la campaña |
| `N` | Se buscó y no estaba | `no_localizado_en` dentro de la campaña |
| *(vacío)* | Nadie recorrió esa área todavía | ninguna de las dos |

`Revisado` y `Revisó` acompañan al valor: llevan la fecha y el nombre de quien
confirmó la presencia **o** de quien afirmó la ausencia. Encontrar un equipo
limpia su marca de no localizado — lo hace `registrarRevision`, así que vale para
todos los caminos que ven un equipo.

---

## 4. Qué cambia en la base

Nueve columnas nuevas en `inventario`, todas nullable, por el mismo patrón
`PRAGMA table_info` que ya usa `prepareDatabase()` en `src/hooks/useInventory.ts`.

> **`revisado_en` y `revisado_por` llegaron en P4**, junto con la pantalla que
> las escribe. Quedan deliberadamente **fuera** de la lista blanca de
> `equipoFicha.ts`: solo las toca `registrarRevision`, así ni la importación ni
> el formulario de Admin pueden pisarlas por accidente.

```sql
-- Identidad y ficha (del Excel)
ALTER TABLE inventario ADD COLUMN id_patrimonial      TEXT;
ALTER TABLE inventario ADD COLUMN marca               TEXT;
ALTER TABLE inventario ADD COLUMN modelo              TEXT;
ALTER TABLE inventario ADD COLUMN num_serie           TEXT;
ALTER TABLE inventario ADD COLUMN descripcion         TEXT;
ALTER TABLE inventario ADD COLUMN resguardante_codigo TEXT;
ALTER TABLE inventario ADD COLUMN resguardante_nombre TEXT;
ALTER TABLE inventario ADD COLUMN fecha_adquisicion   TEXT;

-- Toma física (la produce la app, no el Excel)
ALTER TABLE inventario ADD COLUMN ubicacion           TEXT;
ALTER TABLE inventario ADD COLUMN revisado_en         TEXT;
ALTER TABLE inventario ADD COLUMN revisado_por        TEXT;
ALTER TABLE inventario ADD COLUMN no_localizado_en    TEXT;
ALTER TABLE inventario ADD COLUMN no_localizado_por   TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventario_id_patrimonial
  ON inventario (id_patrimonial);
```

El índice único es lo que hace que **reimportar actualice en vez de duplicar**. En
SQLite los `NULL` no chocan entre sí en un índice único, así que el granel — que
nunca tuvo número de Patrimonio — convive sin problema.

### Por qué no hay tabla `revisiones`

Dos columnas y una fecha de corte en `app_settings` dan el reporte completo:

```sql
-- Pendientes de la campaña actual
WHERE revisado_en IS NULL OR revisado_en < :inicio_campana
```

Una tabla de historial de revisiones da *cuándo se vio cada cosa cada vez*. Nadie
pidió eso, y se puede agregar después sin migrar nada de lo de arriba. Se agrega
el día que alguien pregunte "¿dónde estaba esto el año pasado?".

---

## 5. Lo que no entra

| Columna | Por qué |
| --- | --- |
| `Observaciones` | 19 filas útiles de 2137. El resto es `------`. |
| `Origen`, `COG` | Contabilidad de la Universidad, no de la escuela. |
| `Tipo`, `Estatus` | Un solo valor en las 2137 filas. |

La importación es idempotente por `id_patrimonial`: si mañana hace falta alguna, se
agrega la columna y se vuelve a correr el archivo. No se rehace nada.

---

## 6. Prioridades

### ✅ P1 — La llave, la pistola, y no colgar Admin — **IMPLEMENTADO** (2026-08-25)

Lo más barato, y **no depende del Excel**.

1. `id_patrimonial` + índice único.
2. `src/utils/codigoPatrimonial.ts` — normalizador con test: quita todo lo que no
   sea dígito, para que `*3382871*` y `3382871` resuelvan igual.
3. **Kiosco: coincidencia exacta antes que difusa.** Hoy `Kiosk.tsx:333` filtra con
   `includes()` y `Enter` agrega el primer resultado. Con 2137 equipos, escanear
   `3382871` puede empatar contra un número de serie ajeno que contenga esos dígitos
   y **prestar el equipo equivocado**. Nueva regla: match exacto sobre
   `id_patrimonial` → si hay exactamente uno, ese; si no, el difuso de siempre.
   Este bug solo aparece a esta escala.
4. **Borrar el camino QR de equipos** (§7). Además de liberar el camino, se lleva
   puesto el peor cuello de Admin: `Admin.tsx:772` le pasa `filteredEquipos` a
   `EtiquetasQrPanel`, y `EtiquetasQrPanel.tsx:70` hace
   `useMemo(() => construirHoja(equipos), [equipos])`, que genera **un QR por
   equipo**. Pero `filteredEquipos` se calcula inline en la línea 593
   (`.filter().sort()`), o sea **array nuevo en cada render**: el `useMemo` nunca
   acierta. Hoy con 2 equipos no se nota; con 2137 serían **2137 QR regenerados en
   cada tecla** del buscador. Borrar el panel es el arreglo.
5. **Paginar la tabla de Admin.** `Admin.tsx:1109` renderiza `filteredEquipos.map(...)`
   sin paginar: 2137 filas de DOM. Este sí hay que arreglarlo, no se borra solo.
6. Campo manual de ID patrimonial en el alta/edición de Admin.

Con esto la pistola ya sirve para lo que se capture a mano, sin importador.

> **Falta cerrar un dato de un minuto** (`INVENTARIO_PATRIMONIO.md` §8): pasar
> cualquier lector por una etiqueta real y anotar **qué devuelve exactamente**
> (`3382871` pelón, `*3382871*` con delimitadores, o un dígito verificador de más).
> Sin eso el normalizador se escribe adivinando.

### ✅ P2 — Los campos de inventario — **IMPLEMENTADO** (2026-08-25)

Las 10 columnas restantes de §4, el tipo `Equipo` en `useInventory.ts`, el
formulario de Admin y la ficha `EquipoDetalleModal`. Va **antes** del importador:
el importador necesita dónde escribir.

### ✅ P3 — El importador (Rust + calamine) — **IMPLEMENTADO** (2026-08-25)

**Reparto:** Rust hace lo único que solo Rust puede hacer — leer el `.xlsx`. **Todos
los `INSERT`/`UPDATE` se quedan en TypeScript**, en el mismo `useInventory.ts` que ya
es dueño del esquema y de las migraciones. Escribir desde Rust deja dos dueños del
esquema, y eso se paga caro después.

**Rust** — `src-tauri/src/patrimonio.rs`, un comando que es función pura:

```rust
#[tauri::command]
fn leer_excel_patrimonio(bytes: Vec<u8>) -> Result<Vec<FilaPatrimonio>, String>
```

- `calamine = "0.26"`, `open_workbook_auto_from_rs(Cursor::new(bytes))`.
- Limpieza en la misma pasada: reparar mojibake (§2.2), `trim()`, y colapsar a
  `None` los sentinelas `S/N`, `s/n`, `S/S`, `S/M`, `------`.
- Fecha `dd/mm/yyyy 00:00:00` → `YYYY-MM-DD` con `chrono`, que ya es dependencia.
- Un `#[test]` contra el archivo real: 2137 filas, 2137 ids únicos, cero mojibake
  a la salida. Corre solo si se le pasa la ruta (`EXCEL_PATRIMONIO=... cargo test`);
  el archivo no se versiona porque son datos del inventario de la escuela.

> **El mojibake NO se arregla con la regla general.** El truco habitual
> —re-codificar a Latin-1 y decodificar UTF-8— no sirve acá: `Ñ` es `C3 91` en
> UTF-8 pero en el archivo quedó como `Ã` + `` ` `` (0x60), y `Ó` (`C3 93`) como
> `Ã` + `¿` (0xBF). Un segundo paso lossy machacó el byte de continuación, así que
> ya no hay UTF-8 válido que recuperar. Va una tabla de dos secuencias, y lo que
> no esté en la tabla **se avisa en vez de adivinarse**.

> **Las columnas se ubican por nombre, no por posición.** Si Patrimonio agrega o
> mueve una columna, la importación falla diciendo cuál falta, en vez de leer
> callada la columna equivocada — que es el peor final posible para una
> importación.

**Frontend** — sin plugin nuevo de Tauri y sin tocar `capabilities`:
`<input type="file" accept=".xlsx">` → `arrayBuffer()` → `invoke(...)`. El archivo
pesa 202 KB; no justifica agregar `tauri-plugin-dialog`.

**Dos pasos, no uno:**

1. **Vista previa, no escribe nada.** Cuántos nuevos, cuántos se actualizan, cuántos
   quedan igual, qué clasificadores no están en el mapeo, qué filas fallaron. Una
   importación que no se puede ver antes de correr es una importación que se corre a
   ciegas sobre el inventario de producción.
2. **Aplicar.** `createBackup()` forzado antes de escribir — el sistema de respaldo
   ya existe, se reusa tal cual. Después el alta y la actualización, **todo dentro
   de una transacción**: son miles de filas de un golpe y un inventario a medias
   es peor que uno sin importar, porque nadie sabe dónde quedó.

**Lo que la importación NO pisa nunca:** `ubicacion`, `es_prestable`,
`categoria_id` y `nombre_equipo`. Son datos de la escuela, no de Patrimonio.
Reimportar el Excel no puede borrar el trabajo de una toma física ni deshacer la
curaduría de categorías. `ubicacion` sí se toma **al dar de alta**: ahí es el
único dato que hay.

Tampoco pisa nada una **celda vacía** del Excel: Patrimonio manda sobre lo que
trae, no sobre lo que dejó en blanco.

La lógica de qué se escribe vive pura y probada en
`src/utils/importacionPatrimonio.ts` (10 tests), y se apoya en que `updateEquipo`
es parcial desde P2.

### ✅ P4 — Modo inventariado — **IMPLEMENTADO** (2026-08-25)

El bucle de §3.1:

- **Toma física**: pestaña de Admin (no pantalla aparte: quien hace el recorrido
  ya entró como administrador, y una ruta propia sería un segundo login y una
  segunda navegación para el mismo trabajo). Elegir ubicación → disparar N veces. Cada escaneo
  muestra qué es, marca `revisado_en`/`revisado_por` y estampa `ubicacion`.
  Contador en vivo de la campaña: *"Aula 12 — 14 leídos · 312 de 2137 en total"*.
- **Vinculación por escaneo** (el Camino B de `INVENTARIO_PATRIMONIO.md` §7): código
  desconocido → *"¿qué equipo es este?"* → queda ligado. Sigue haciendo falta para
  todo lo que el Excel no cubra, que siempre es más de lo que uno cree.
- **Exportar a Excel** — el entregable para Patrimonio: localizado, dónde, por quién,
  y qué no apareció.
- **Acción masiva**: una barra sobre la tabla de inventario que actúa sobre lo
  que ya está filtrado. Buscás `COMPUTADORA PORTATIL`, la tabla deja 199, y las
  marcás prestables de un golpe.

  > No lleva su propia lista ni sus propios filtros. La tabla ya sabe buscar por
  > nombre, marca, modelo, ID de Patrimonio y ubicación, y filtrar por categoría
  > y por prestable; un panel aparte sería la misma pantalla dos veces y dos
  > maneras distintas de elegir el mismo equipo.

### 🔵 P5 — Puede esperar

- Tabla de historial de revisiones (§4).
- Columnas `observaciones` / `origen`.
- Reporte de conciliación: qué está en el Excel y no en la base, y al revés.
- **Etiquetas Code 128 propias** para el granel, si algún día hace falta (§7.3).

> **`zxing-wasm` salió de la lista.** Era el ítem de más riesgo del plan —
> reemplazar el escáner del celular que hoy funciona en campo. Al borrar las
> etiquetas QR y quedarse solo con la pistola, deja de tener sentido.

---

## 7. El camino QR de equipos se borra

Decidido el 2026-08-25. Las etiquetas `P15-<id>` no se van a imprimir nunca, así
que el código que las genera y las lee se va. Un solo tipo de código en todo el
sistema: **el de barras que la UdeG ya tiene pegado, leído con la pistola USB.**

### 7.1 Son dos sistemas de QR, y solo se borra uno

Esta es la parte que hay que no equivocar. En el repo hay **dos** usos de QR sin
relación entre sí:

| | Para qué | Destino |
| --- | --- | --- |
| **Etiquetas de equipo** `P15-<id>` | Pegarse en cada objeto. **Nunca se imprimieron.** | **Se borra** |
| **QR de acceso del celular** (`RedCelularPanel.tsx`) | Abre la URL del servidor en el teléfono y vincula el dispositivo. **Funciona en producción.** | **Se queda** |

Consecuencia directa: **`qrcode-generator` NO se desinstala.** El panel del celular
la sigue usando. Ver `docs/QR_CELULAR.md`.

### 7.2 Qué se borra

```
src/utils/etiquetaQr.ts                 codigoDeEquipo / equipoDesdeCodigo
src/utils/etiquetaQr.test.ts            + el script test:etiquetas de package.json
src/components/EtiquetasQrPanel.tsx     el panel y la hoja imprimible
src-tauri/assets/jsqr.js                el decodificador vendorizado
```

Y los puntos donde se usan:

- `Admin.tsx:49` (import) y `:772` (el panel)
- `EquipoDetalleModal.tsx:14,15,44,47` — el QR de la ficha del equipo
- `celular.rs:1017-1150` — el escáner del teléfono, y `:1488` la ruta `/jsqr.js`

**El escáner del celular se puede quitar sin romper nada.** Solo hace
`irAlEquipo(id)` → navega a `/equipo/<id>`. Es un atajo, no un paso obligatorio: el
profe llega al mismo lugar desde su lista de préstamos. Se pierde la comodidad, no
la función.

### 7.3 El hueco que queda, y cómo se tapa si molesta

El granel — cables, adaptadores, controles, plumones — **nunca pasó por Patrimonio
y no tiene etiqueta UdeG**. El QR `P15-<id>` existía justamente para eso. Sin él,
esos objetos no tienen código escaneable.

**Hoy no es un problema:** se buscan por nombre en el kiosco y así funciona desde
siempre. Nadie se quejó.

Si algún día molesta, la salida limpia **no es volver al QR**: es imprimir un
**Code 128 del id interno**. Lo lee la misma pistola, y el sistema sigue teniendo un
solo tipo de código. Queda anotado en P5, no se construye ahora.
