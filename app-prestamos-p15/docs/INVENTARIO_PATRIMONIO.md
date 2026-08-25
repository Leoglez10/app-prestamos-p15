# Etiquetas de Patrimonio (UdeG) e inventario

Estado: **análisis cerrado, sin una línea de código escrita.** Este documento
recoge lo que se decidió el 2026-08-21 al descubrir que la Universidad ya tiene
etiquetado casi todo el inventario de la prepa.

Es el documento que desbloquea los puntos 4, 5 y 6 de `docs/ROADMAP.md`, que
llevaban meses detenidos esperando justamente esta definición.

Documentos hermanos: `docs/QR_CELULAR.md` (el canal del celular y el formato
`P15-<id>`), `docs/ROADMAP.md` (la lista completa de pendientes).

---

## 1. La etiqueta que ya está pegada

La Coordinación General de Patrimonio de la UdeG etiqueta cada bien de la
escuela. La etiqueta es de papel blanco, va pegada al equipo, y trae un **código
de barras 1D vertical** en el margen izquierdo.

Ejemplo real (una laptop Dell de la prepa):

```
[||||||||]  Universidad de Guadalajara
 ID:        Secretaria General
 3382871    Coordinacion General de Patrimonio
            Cladmin: 4.2.15
            ESCUELA PREPARATORIA NO. 15 SAN JUAN DE OCOTAN
            Clasificacion: C00336
            COMPUTADORA PORTATIL
            Resguardante: 2800829 - JAZMIN ROBLES LAMAS
```

Qué sirve de cada campo:

| Campo en la etiqueta | Ejemplo | Para qué nos sirve |
| --- | --- | --- |
| **ID (el código de barras)** | `3382871` | **La llave única por objeto.** Es el único campo que identifica una unidad física concreta. |
| Clasificación | `C00336` | Tipo de bien. Mapea contra nuestra tabla `categorias`. |
| Descripción | `COMPUTADORA PORTATIL` | Mapea contra `inventario.nombre_equipo`. |
| Resguardante | `2800829 - JAZMIN ROBLES LAMAS` | Código de empleado + nombre. Mapea contra `profesores`. |
| Cladmin / Dependencia | `4.2.15` / Prepa 15 | Constantes para toda la escuela. **No son dato**, no se guardan. |

> **Ojo con el ID.** Se guarda como texto, nunca como número. Puede traer ceros a
> la izquierda, y según la simbología el lector puede devolver delimitadores
> (`*3382871*`) o un dígito verificador extra. Convertirlo a entero pierde
> información de forma silenciosa.

---

## 2. La decisión que manda todo el diseño

**No se reetiqueta el inventario existente.** La app aprende a leer los códigos
de barras que ya están pegados.

El QR propio `P15-<id>` se sigue usando, pero **solo para lo que Patrimonio nunca
etiquetó**: cables, adaptadores, controles remotos, plumones, y cualquier compra
nueva que todavía no pasó por el trámite.

### Por qué, y por qué antes se había decidido al revés

En la primera pasada de este análisis se propuso lo contrario: pegarle el QR
propio a **todo**, incluso a lo que ya tenía etiqueta UdeG. Eso tenía una ventaja
técnica grande — el celular nunca habría necesitado leer códigos 1D, y se
ahorraba una librería completa.

Se descartó porque **medía el costo en el lugar equivocado**. Pegar etiquetas en
cientos de equipos ya inventariados son días de trabajo físico de una persona.
Leer 1D son unas horas de programación que se hacen una sola vez. El trabajo
manual es el caro, no el código.

Queda anotado porque es el tipo de error que se repite: optimizar la parte que se
ve (el código) a costa de la que no se ve (la mano de obra de alguien más).

---

## 3. Cómo conviven los dos códigos

Los dos formatos resuelven al **mismo** `inventario.id`. Un solo resolvedor,
alimentado por cualquiera de las dos entradas:

| Lo que se escanea | De dónde sale | Cómo resuelve |
| --- | --- | --- |
| `P15-42` | QR propio, impreso por la app | Directo: id interno `42`. |
| `3382871` | Código de barras UdeG ya pegado | `SELECT id FROM inventario WHERE id_patrimonial = ?` |

`prestamos.equipo_id` sigue apuntando al id interno de siempre. **Nada del
historial de préstamos existente se toca ni se migra.** Los dos caminos son
puertas distintas al mismo registro.

Un equipo puede tener las dos etiquetas encima sin ningún conflicto: ambas llevan
al mismo lugar.

---

## 4. Qué cambia en la base de datos

Una sola columna nueva:

```sql
ALTER TABLE inventario ADD COLUMN id_patrimonial TEXT; -- UNIQUE, puede ser NULL
```

Va en `prepareDatabase` (`src/hooks/useInventory.ts`), que ya migra revisando
`PRAGMA table_info`. Es una entrada más en un patrón que ya existe, no una
mecánica nueva.

**Es nullable a propósito:** el granel nunca pasó por Patrimonio y nunca va a
tener ese número. Forzarlo a obligatorio dejaría fuera del sistema justo a los
objetos que más se prestan.

### Por qué no se reusó la columna `identificador`

Era la opción más barata y se evaluó primero. Pierde por tres motivos concretos:

1. `identificador` guarda **texto libre** — "Aula 3", números de serie, lo que
   alguien haya escrito. No es un espacio limpio.
2. Lo usa `generarIdentificadores()` para autonumerar altas por lote (`REM-001`,
   `REM-002`). Meter ahí un ID patrimonial rompe esa lógica.
3. **No tiene restricción `UNIQUE`**, y la importación de Excel necesita una
   llave de deduplicado garantizada para que reimportar actualice en vez de
   duplicar.

---

## 5. El lector del celular

**jsQR no alcanza.** La librería vendorizada en `src-tauri/src/celular.rs` lee
**solo QR, por diseño**. No decodifica Code 39 ni Code 128 y nunca lo va a hacer.

**Propuesta: que `zxing-wasm` reemplace a jsQR, no que convivan.** zxing
decodifica QR y códigos 1D en la misma pasada, así que queda un decodificador y
un solo camino de código, en vez de dos corriendo en paralelo.

Advertencia honesta: el camino QR de hoy **funciona y está probado en campo**.
Reemplazarlo tiene riesgo real. Se acepta ese riesgo porque mantener dos
decodificadores en paralelo envejece peor.

**`BarcodeDetector` nativo del navegador queda descartado.** Safari en iOS no lo
soporta, y el uso principal es iPhone. Ya está descartado también en
`docs/QR_CELULAR.md` §2 por el tema del contexto seguro.

> ### Gotcha que va a parecer un bug
>
> El código de barras de la etiqueta UdeG está impreso **vertical** (rotado 90°).
> zxing barre líneas **horizontales** por defecto. Si no se rota el frame o no se
> activa `tryHarder`, la lectura falla y va a parecer que el escáner está roto,
> cuando en realidad está mirando de lado.

---

## 6. La pistola de códigos de barras

Sigue siendo lo más barato de toda la lista, y ahora es todavía más barato de lo
que decía `docs/ROADMAP.md` §5.

La pistola es un **teclado USB**: escanea, teclea los dígitos, manda `Enter`. Sin
driver, sin SDK, sin permisos de Tauri.

Y el buscador del kiosko (`src/pages/Kiosk.tsx`) **ya** filtra por nombre,
categoría e identificador, y ya agrega el primer resultado al presionar `Enter`.
Sumando `id_patrimonial` a ese predicado, la pistola funciona **sin una sola
pantalla nueva**: apuntás, dispara, el equipo entra al carrito.

---

## 7. El camino crítico: poblar `id_patrimonial`

**El escáner no sirve de nada hasta que los números estén capturados.** Escanear
`3382871` no resuelve a ningún equipo si nadie metió antes ese número. Son
cientos de capturas y es el verdadero cuello de botella del proyecto.

Hay dos caminos, y no se estorban:

### Camino A — el Excel de Patrimonio

Existe un inventario en Excel que, según la escuela, ya tiene todo registrado.
Sería la carga masiva de un jalón.

**Todavía no está en nuestras manos.** Y el importador no se debe construir a
ciegas: el 90% del trabajo de una importación es pelearse con las columnas
reales, los encabezados a media hoja y las celdas combinadas. Escribirlo antes de
ver el archivo garantiza rehacerlo.

### Camino B — vinculación por escaneo (RECOMENDADO para empezar)

Se escanea un código desconocido, la app pregunta *"¿qué equipo es este?"*, se
elige de la lista y queda ligado para siempre.

Ventaja decisiva: **no depende de que Patrimonio entregue nada.** Se puebla
caminando con la pistola o el celular. Y cuando llegue el Excel, sigue sirviendo
para todo lo que el archivo no cubra — que siempre es más de lo que uno espera.

---

## 8. Lo que falta confirmar antes de escribir código

**La simbología exacta del código de barras.** No se puede determinar desde una
foto. Los candidatos son Code 39 y Code 128, ambos comunes en etiquetado
institucional.

No cambia la elección de librería (zxing lee los dos), pero **sí cambia cómo se
normaliza el código antes de buscarlo**. Si se adivina mal, la pistola y la
cámara devuelven strings distintos para la misma etiqueta y nada empata.

Cómo resolverlo, en un minuto: pasar cualquier lector por una etiqueta y anotar
**qué devuelve exactamente**:

- ¿`3382871` pelón?
- ¿`*3382871*` con delimitadores? (típico de Code 39)
- ¿Un dígito de más al final? (verificador)

**Estado: esperando ese dato.**

---

## 9. Opciones descartadas

| Opción | Por qué se descartó |
| --- | --- |
| Pegar el QR propio a **todo** el inventario | Días de trabajo físico contra horas de código. El costo estaba mal medido. |
| Usar el código UdeG como **única** llave | El granel (cables, controles, plumones) nunca pasó por Patrimonio y quedaría fuera del sistema. |
| Reusar la columna `identificador` | Texto libre, sin `UNIQUE`, y ya la ocupa el autonumerado de altas por lote. |
| `BarcodeDetector` nativo | Safari/iOS no lo soporta y el uso principal es iPhone. |
| Agregar zxing **junto a** jsQR | Dos decodificadores en paralelo para el mismo trabajo. zxing solo hace ambas cosas. |
| Guardar `id_patrimonial` como INTEGER | Pierde ceros a la izquierda y delimitadores en silencio. |
| Escribir el importador de Excel ahora | El archivo todavía no existe. Se rehace completo al verlo. |

---

## 10. Qué se desbloquea en el ROADMAP

Este hallazgo responde preguntas que tenían frenado el proyecto:

- **§4 (campos de inventario)** — la fila "Número de inventario oficial de la
  prepa" pasa de `?` a **entra, y es la llave**. La pregunta 2 ("¿el número de
  serie es único?") deja de importar: no hace falta la serie, el ID patrimonial
  ya es único por objeto.
- **§5 (pistola)** — el párrafo que dice que el trabajo real es imprimir y pegar
  etiquetas en cada objeto **ya no aplica** a la mayoría del inventario: las
  etiquetas ya están puestas.
- **§6 (Excel)** — cambia la naturaleza del problema. Ver la nota siguiente.

### Tensión con la regla de "plantilla fija" (§6)

`docs/ROADMAP.md` §6 fija una regla: *la app define una plantilla de columnas y
el usuario la llena*. El Excel de Patrimonio **no** va a respetar esa plantilla,
llega con el formato que tiene.

La regla se mantiene, con una excepción acotada: se acepta un mapeo fijo para
**esta única fuente conocida**. Lo que la regla previene es mantener mapeos
arbitrarios para "cualquier Excel" de por vida; un mapeo contra un formato
institucional estable no es ese caso.
