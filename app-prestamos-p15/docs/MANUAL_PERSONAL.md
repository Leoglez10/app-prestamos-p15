---
title: "Manual del personal"
subtitle: "App Préstamos P15 · Control de equipo audiovisual · Preparatoria 15 (UDG)"
lang: es
---

# Índice

- [Antes de empezar](#antes-de-empezar)
- [Qué es la app y qué no es](#qué-es-la-app-y-qué-no-es)
- [Las tres puertas de entrada](#las-tres-puertas-de-entrada)
- [Tareas del día a día](#tareas-del-día-a-día)
- [Importar el Excel de Patrimonio](#importar-el-excel-de-patrimonio)
- [Toma de inventario físico](#toma-de-inventario-físico)
- [Respaldos](#respaldos)
- [Qué hago si algo falla](#qué-hago-si)
- [Actualizaciones](#actualizaciones)
- [Funciones en pruebas](#funciones-en-pruebas)
- [Calendario y checklists](#calendario-de-mantenimiento)
- [Glosario](#glosario)
- [Ayuda, videos y documentación](#dónde-está-lo-demás)

---

# Antes de empezar

## Para quién es este manual

Para la persona que **usa la app todos los días**: quien atiende el mostrador de
audiovisuales, presta y recibe equipo, cuenta el inventario y manda los reportes.

No necesitas saber programar. No necesitas saber qué es una base de datos.
Todo lo que hay que hacer está aquí, paso a paso.

> Si lo que buscas es **modificar el programa** (compilarlo, cambiarle el código,
> sacar una versión nueva), este no es tu documento. Ese es
> `docs/ENGINEERING_HANDBOOK.md`.

## Cómo leerlo

No lo leas de corrido. Está hecho para consultarse:

| Si necesitas… | Ve a… |
|---|---|
| Entender qué es la app y quién usa qué | [Qué es la app](#qué-es-la-app-y-qué-no-es) y [Las tres puertas](#las-tres-puertas-de-entrada) |
| Hacer una tarea concreta (prestar, devolver, dar de alta) | [Tareas del día a día](#tareas-del-día-a-día) |
| **Resolver un problema** | [Qué hago si algo falla](#qué-hago-si) |
| Saber qué toca hacer esta semana | [Calendario de mantenimiento](#calendario-de-mantenimiento) |
| Entender una palabra rara | [Glosario](#glosario) |

## Las cinco reglas de oro

Si solo te acuerdas de cinco cosas, que sean estas:

1. **Respalda antes de cualquier cosa grande.** Importar un Excel, actualizar la
   app, cerrar el ciclo escolar. Siempre.
2. **Restaurar reemplaza TODO.** No mezcla, no fusiona. Lo capturado después de
   la fecha de ese respaldo se pierde.
3. **Una sola computadora para préstamos y cambios de inventario.** La única
   excepción segura es una segunda computadora dedicada a toma física que
   devuelve su trabajo como CSV para fusionarlo, nunca como base `.db`.
4. **Lo importado del Excel NO se presta.** Entra como *solo inventario* a
   propósito. La escuela decide qué se presta, no el Excel.
5. **Cierra sesión antes de irte.** Es una computadora compartida.

---

# Qué es la app y qué no es

## Qué es

Un programa de escritorio que se instala en **una computadora con Windows** y
sirve como la libreta de préstamos de audiovisuales, pero digital.

Responde tres preguntas:

1. ¿Qué equipo prestamos?
2. ¿A quién se lo prestamos?
3. ¿Cuándo nos lo devolvieron?

Y guarda el historial completo: si un equipo está disponible, prestado,
extraviado o en mantenimiento.

## Qué NO es

| No es… | Por qué importa |
|---|---|
| **Una página web** | No se abre en Chrome escribiendo una dirección. Es un ícono en el escritorio. |
| **Un sistema en la nube** | Los datos viven **dentro de esa computadora**. Si se borra la carpeta, se pierden. |
| **Un sistema sincronizado** | Dos computadoras con la app tienen **dos bases separadas**. No se hablan entre ellas. |
| **Un sistema que necesite internet** | Funciona apagada de la red. Solo los respaldos suben a Drive, y eso lo hace Drive, no la app. |

> **La consecuencia práctica de todo lo anterior es una sola:** el respaldo no es
> opcional. Es lo único que separa un accidente de una pérdida total.

## Qué necesita para funcionar

- Windows 10 u 11.
- El componente **WebView2** (Windows 11 ya lo trae; Windows 10 a veces hay que
  instalarlo).
- Una pistola lectora de código de barras USB - opcional, pero hace la toma
  física diez veces más rápida.

---

# Las tres puertas de entrada

Al abrir la app aparecen tres tarjetas grandes. Cada una es un modo distinto,
con distinto nivel de acceso.

| Puerta | Quién entra | Qué necesita | Para qué |
|---|---|---|---|
| **Soy Profesor** (Kiosko) | Cualquier profesor | Solo su **código UDG**. Sin contraseña. | Pedir equipo y devolverlo él mismo |
| **Préstamo Rápido** | Un administrador | Solo su **código**. Sin PIN. | Prestar a **alumnos**, y sacar equipo a **eventos** |
| **Administrador** | Un administrador | **Código + PIN** | Todo lo demás: inventario, categorías, profesores, reportes, respaldos, toma física |

## Por qué el Préstamo Rápido no pide PIN

Es a propósito. Un préstamo a alumno suele ser una urgencia de pasillo, y pedir
un PIN ahí garantiza que alguien deje la sesión abierta. En cambio, el sistema
**guarda quién autorizó** cada préstamo con nombre y código. La trazabilidad
está, aunque el candado no.

## Cuándo termina cada sesión

| Modo | Se cierra… |
|---|---|
| Kiosko (profesor) | A los **3 segundos** de confirmar correctamente un préstamo |
| Préstamo Rápido | La autorización guardada vence a las **8 horas** y se comprueba al volver a cargar la pantalla. No es un cierre por inactividad |
| Admin | Al pulsar **Cerrar sesión admin** o al cerrar la ventana/pestaña. No tiene temporizador de inactividad |

De todas formas, **usa el botón de Cerrar sesión antes de levantarte.**

## Credenciales de fábrica

La app viene con un administrador precargado para poder entrar la primera vez:

| Campo | Valor |
|---|---|
| Código | `223992647` |
| PIN | `#admin*p15#` |

> **Cambia el PIN el primer día.**
>
> Ten presente una cosa: en la versión actual, esa combinación de fábrica sigue
> funcionando como acceso de recuperación **aunque cambies el PIN**. Es útil si
> alguien lo olvida, y es un riesgo si la computadora queda al alcance de
> cualquiera. Úsala solo en la computadora interna de la oficina.

---

# Tareas del día a día

Cada tarea es una receta. Sigue los pasos en orden.

## Inicio y cierre del turno

**Al empezar:**

- [ ] Abre la app y confirma que carga el inicio sin errores.
- [ ] Revisa los préstamos activos o vencidos que necesitan seguimiento.
- [ ] Comprueba que la fecha y hora de Windows sean correctas.

**Antes de irte:**

- [ ] Registra todas las devoluciones que ya están físicamente en la oficina.
- [ ] Cierra cualquier sesión de Kiosko, Préstamo Rápido o Admin.
- [ ] Si hiciste una importación, actualización o captura grande, crea un respaldo manual.

## Prestar equipo a un profesor (Kiosko)

1. Abre la app → **"Soy Profesor"**.
2. El profesor escribe su **código UDG** → Enter.
3. Aparece el catálogo. Para encontrar el equipo:
   - Filtra con los **chips de categoría** de arriba, o
   - Busca por nombre, marca, modelo o ID patrimonial, o
   - **Escanea la etiqueta con la pistola.** El equipo aparece primero y se
     agrega solo. No hay que apretar Enter.
4. Toca el equipo para meterlo al **carrito**. Se pueden pedir varios.
   - Los equipos **a granel** (por ejemplo, 10 adaptadores en una sola fila)
     muestran cuántos quedan.
   - Si pides una **laptop**, la app sugiere agregar un **HDMI** disponible con
     un clic. Acéptalo: es el olvido más común.
5. Opcional: escribe **notas de entrega** ("se lleva el cargador", "cable
   maltratado").
6. **Confirmar.** El equipo queda marcado como prestado con fecha y hora, y la
   sesión se cierra sola en 3 segundos.

## Recibir una devolución (Kiosko)

1. El profesor entra otra vez con su código.
2. Ve sus **préstamos activos**.
3. Devuelve uno por uno, o toca **"Devolver todo"**.

> Si el equipo volvió pero **nadie lo registró**, no lo dejes prestado para
> siempre: usa **Forzar devolución** (ver capítulo 8).

## Prestar equipo a un alumno (Préstamo Rápido)

1. Inicio → **"Préstamo Rápido"**.
2. El administrador entra con su **código**.
3. Llena el formulario:
   - **Tipo**: alumno o profesor.
   - **Nombre y código** de quien se lleva el equipo.
   - **Equipo**: elígelo del inventario, o escríbelo como **texto libre** si es
     algo que no está capturado.
   - **Notas**.
4. El sistema guarda solo **quién autorizó** (tu nombre y código).
5. Cuando el alumno regresa el equipo, márcalo como **devuelto** en el historial
   de abajo.

### Los tres estados del historial

| Estado | Significa |
|---|---|
| `activo` | Aún no se devuelve |
| `vencido` | Lleva **más de 24 horas** sin devolverse |
| `devuelto` | Cerrado |

> **Inventario vs texto libre - la diferencia importa.**
>
> Si eliges el equipo **del inventario**, ese equipo se marca como prestado y
> deja de aparecer disponible. Si lo escribes como **texto libre**, queda el
> registro de que alguien se llevó algo, pero el inventario no se entera -
> porque ese "algo" no existe en el inventario.
>
> Ambos salen en Reportes, marcados con una insignia **Préstamo rápido**. Pero
> las filas de texto libre son de **solo lectura** desde Reportes: se
> administran desde Préstamo Rápido.

## Sacar equipo a un evento

Cuando varios equipos salen juntos al mismo lugar y las mismas fechas -una
ceremonia, un congreso, una feria- no registres un préstamo suelto por cada uno.

1. **Préstamo Rápido** → **"Crear salida a evento"**.
2. Llena el encabezado del evento:
   - **Lugar**.
   - **Rango de fechas** - se elige en un calendario, arrastrando del día de
     salida al día de regreso.
   - **Horas**.
   - **Responsable** y **expositor**.
   - **Notas**.
3. Agrega los equipos que salen.
4. Guarda.

Cada equipo del evento queda como un préstamo normal, así que el inventario y
los reportes los siguen viendo correctamente. En **Inventario** aparecen con un
**chip violeta** que dice que salieron con un evento.

## Cerrar un evento

1. Abre el evento desde Préstamo Rápido.
2. Marca lo que regresó.
3. Cierra el evento.

> **¿Y si falta equipo?** El evento se cierra igual: queda como **cerrado con
> faltantes**, y las filas del equipo que no volvió **siguen activas**. Es lo
> correcto: hay material afuera de verdad, y el sistema no debe fingir que
> regresó. Después decides si se recupera o se marca extraviado.

## Dar de alta un equipo

1. **Admin** → pestaña **Inventario** → **Nuevo**.
2. Llena la ficha. Los campos que de verdad importan:
   - **Nombre / descripción** - qué es.
   - **Categoría**.
   - **ID patrimonial** - el código de la etiqueta de la UdeG. Es el que lee la
     pistola.
   - **Marca, modelo, número de serie** - cápturalos **con el aparato en la
     mano**. Se leen del chasis. Si no se capturan en ese momento, no los
     captura nadie nunca.
   - **Ubicación**.
   - **Prestable** o **solo inventario**.
   - **A granel** - actívalo si son varias piezas idénticas en una sola fila
     (adaptadores, cables) y pon el **stock**.

## Dar de alta un profesor o un administrador

1. **Admin** → pestaña **Profesores** → **Nuevo**.
2. Nombre y **código UDG**.
3. Si también será administrador: marca la casilla y **define su PIN**.

> Un profesor sin dar de alta **no puede usar el kiosko**. Es la causa número uno
> de "mi código no funciona".

## Categorías: prestable vs solo inventario

Este es el concepto que más confusión genera, así que va directo:

| Tipo | Qué pasa |
|---|---|
| **Prestable** | Aparece en el kiosko. Un profesor lo puede pedir. |
| **Solo inventario** | **No** aparece en el kiosko. Existe para llevar el conteo y nada más. |

Un proyector fijo del salón 12 debe ser *solo inventario*: es de la escuela, se
cuenta en la toma física, pero nadie se lo lleva.

Se decide **por categoría** (todos los de esa categoría) o **por equipo**
(uno solo, como excepción).

- **Por categoría:** Admin → **Categorías** → interruptor **Prestable**.
- **Por equipo:** Admin → Inventario → editar el equipo → casilla **Prestable**.

## Sacar reportes y guardarlos como PDF

La app prepara el documento y abre el diálogo de impresión de Windows. **No
guarda un PDF por sí sola**: en ese diálogo elige **Microsoft Print to PDF** y
decide el nombre y la carpeta.

### Reporte de préstamos

1. **Admin** → pestaña **Reportes**.
2. Filtra por **fecha**, **estado** o **categoría** y ajusta título, subtítulo,
   columnas y notas.
   - Los filtros aplicados se **marcan visualmente**. Un filtro olvidado esconde
     medio historial sin avisar: si el reporte se ve vacío o corto, revisa los
     filtros antes que nada.
3. Revisa la vista previa → **Generar PDF de reportes** → **Microsoft Print to
   PDF**.

En el reporte verás observaciones de entrega y devolución, y una insignia
**Préstamo rápido** en las filas que vinieron de ahí.

### Inventario completo

1. **Admin** → **Inventario**.
2. Aplica los filtros que quieras y ajusta el bloque **Diseño del PDF de
   inventario**.
3. Revisa la vista previa → **Generar PDF de inventario** → **Microsoft Print to
   PDF**.

El PDF incluye todos los resultados filtrados aunque la vista previa en pantalla
muestre solo las primeras filas.

---

# Importar el Excel de Patrimonio

Sirve para cargar el inventario oficial de la UdeG sin capturar equipo por
equipo.

## Dónde está

**Admin** → pestaña **Toma de inventario** → botón **Importar Patrimonio**.

## Cómo funciona

1. Elige el archivo `.xlsx` oficial.
2. La app muestra un **plan previo ANTES de tocar nada**:
   - cuántos equipos son nuevos,
   - cuántos se actualizarían,
   - cuántos no cambian,
   - qué categorías nuevas aparecerían,
   - avisos importantes.
3. Si el plan te convence, presiona **Aplicar**.
4. Antes de escribir un solo dato, la app crea un **respaldo previo**.

## Las cuatro reglas de la importación

| Regla | Detalle |
|---|---|
| **Nada se sobreescribe a ciegas** | Los equipos que ya existen conservan su nombre, categoría y ubicación |
| **Lo importado NO es prestable** | Todo equipo y categoría nueva entra como *solo inventario* |
| **Activar préstamo es un paso aparte** | Categorías → marcar **Prestable** en lo que sí se presta |
| **Se puede deshacer** | Configuración → Respaldos → restaurar el respaldo manual que se creó al aplicar |

> **"Importé y ahora nadie puede pedir nada."**
>
> No es un error. Es el diseño. El Excel **organiza**; la escuela **decide** qué
> se presta. Ve a Categorías y activa lo que corresponda.

---

# Toma de inventario físico

Sirve para cuadrar **lo que hay en los estantes** contra **lo que dice la app**.

Está en **Admin** → pestaña **Toma de inventario**.

## Primero: la pistola dispara sola

No todas las pistolas vienen configuradas de fábrica para mandar `Enter` al
final del disparo. Sin ese `Enter`, el código se queda parado en el campo
esperando a que alguien lo teclee - justo lo que un recorrido con pistola quiere
evitar.

La app lo resuelve **por velocidad**: la pistola escribe el código entero en
milisegundos, una persona no. Si detecta la ráfaga, dispara sola. Si estás
tecleando a mano, sigue esperando tu `Enter`.

> **Traducción:** funciona con la pistola que tengas, salga como salga
> configurada. No hay nada que ajustar en el hardware.

## El recorrido, paso a paso

1. Elige el **área** a contar. Usa las ubicaciones recientes o escribe una nueva.
2. Si es la primera vez o estás entrenando a alguien, activa **"Modo prueba ·
   no guarda nada"**.
3. **"Iniciar campaña nueva"** - esto **reinicia toda el área a pendiente** y
   pide doble confirmación. Hazlo en un momento tranquilo.
4. **Escanea equipo por equipo.** Cada disparo da sonido y tarjeta de color:

   | Color | Significa |
   |---|---|
   | Verde - **Nuevo aquí** | Estaba pendiente, ya quedó contado |
   | Azul - **Movido** | Existe, pero su ubicación registrada era otra |
   | Amarillo - **Repetido** | Ya lo escaneaste en esta campaña |

5. ¿Te equivocaste? Botón **deshacer último escaneo**.
6. La columna **"Deberían estar aquí"** lista lo que falta. Cada fila tiene dos
   botones:

   | Botón | Cuándo |
   |---|---|
   | **"Sí está"** | Lo encontraste, pero no se pudo escanear (etiqueta rota o ilegible) |
   | **"No localizada"** | Lo buscaste y **no aparece** |

7. Cuando la columna se vacía, terminaste el área. Exporta el **reporte**.

## Modo prueba: entrenar sin miedo

El botón **"Modo prueba · no guarda nada"** corre **el recorrido completo**: la
pistola, los tonos, el destello, las tarjetas de color, la detección de
repetidos, el botón de deshacer. Se ve y suena exactamente igual.

La diferencia es que **ninguna escritura llega a la base de datos**. Mientras
está activo aparece un distintivo `Prueba · no se guarda` en la barra superior, y
los botones que sí escriben quedan bloqueados con un aviso.

> Es la forma de enseñarle el recorrido a alguien nuevo sin arriesgar el conteo
> real. **Apágalo antes de la campaña de verdad.**

## Alta al vuelo: un código que nadie reclama

Escaneas una etiqueta y la app no reconoce el código. Tienes tres salidas ahí
mismo, sin salir de la toma física:

| Opción | Cuándo usarla |
|---|---|
| **"Es este"** (buscar y ligar) | El equipo **ya está** en la app pero sin etiqueta asignada. Lo buscas por nombre, marca o serie y lo ligas. **Queda ligado para siempre.** |
| **"Agregarlo al inventario"** | Es un equipo nuevo que nunca se capturó. Pide lo mínimo: qué es y su categoría. La etiqueta y la ubicación ya van puestas. |
| **"Editarlo completo"** | Igual que el anterior, pero abre la ficha completa de doce campos con lo que ya escribiste adentro. |

> **Usa "Editarlo completo" cuando el aparato esté en la mano.** La marca, el
> modelo y el número de serie se leen del chasis AHORA.

Todo lo que se da de alta así entra como **solo inventario**. La toma física
nunca activa préstamos por su cuenta.

## El reporte que va a Patrimonio

Se exporta como **CSV** con punto y coma y BOM UTF-8, a propósito: así Excel en
español lo abre en columnas y con los acentos bien.

- **Nombre:** `reporte-inventario-<fecha>.csv`
- **Dónde queda:** `%AppData%\com.p15.prestamos\reportes`
  Es una carpeta **hermana** de `backups`, no está adentro.
- **Columnas:** Id · Descripción · Marca · Modelo · Num Serie · Resguardante ·
  Ubicación · Localizado · Revisado · Revisó

### La columna "Localizado" tiene TRES estados, no dos

| Valor | Significa |
|---|---|
| `S` | Apareció. Alguien lo escaneó o marcó "Sí está" |
| `N` | Se buscó y **no estaba**. Alguien pulsó "No localizada" |
| *(vacío)* | **Nadie llegó todavía a esa área.** No es una pérdida: es trabajo pendiente |

> **Por qué importa tanto:** una celda vacía y una `N` son cosas distintas. Si se
> confunden, el reporte le afirma a Patrimonio pérdidas que nadie comprobó.
>
> Antes de mandar el reporte, revisa que no queden celdas vacías **de un área que
> sí terminaste**.

## Toma física en dos computadoras

La computadora principal **sigue prestando** mientras una segunda camina el
edificio con la pistola. Al final los dos trabajos se juntan sin que ninguno
pierda nada.

**El punto clave:** el respaldo `.db` NO sirve para devolver el trabajo.

| | Qué es | Qué hace al entrar | Cuándo se usa |
|---|---|---|---|
| **Respaldo `.db`** | La base completa | **Reemplaza todo** | Una sola vez, al montar la segunda computadora |
| **Reporte `.csv`** | El resultado del recorrido | **Fusiona** | Cada vez que la segunda termina |

Mandar de vuelta la **base** de la segunda computadora borraría todos los
préstamos que la principal registró mientras tanto. Lo que vuelve es el **CSV**,
y ese fusiona.

**Cómo se usa:**

1. **Al montar la segunda computadora:** instala la app y restaura el respaldo
   más nuevo. Queda con el inventario completo.
2. **Durante la campaña:** la segunda recorre, la principal presta.
   **Ninguna de las dos restaura nada.**
3. **Al terminar:** la segunda exporta el reporte. En la principal entras a
   **Admin → Toma de inventario → "Traer la toma física de otra computadora"** y
   eliges el CSV. Ves la vista previa antes de que se escriba nada.

**Qué escribe la fusión:** solo `revisado`, `quién revisó`, `no localizado` y
`ubicación`. Los préstamos no comparten ninguna de esas columnas - por eso las
dos computadoras pueden trabajar al mismo tiempo sin pisarse.

> **Gana el dato más nuevo equipo por equipo**, no archivo por archivo. Traer el
> mismo reporte dos veces no cambia nada, y un reporte viejo no puede pisar un
> recorrido más reciente.

> Los equipos que la segunda computadora dio de **alta al vuelo** no se fusionan
> solos: salen listados aparte para darlos de alta a mano. El reporte no trae la
> categoría, y elegirla automáticamente sería adivinar.

---

# Respaldos

Este es el capítulo que hay que leer aunque no se lea ningún otro.

## En diez segundos

La app se respalda sola cada 12 horas mientras esté abierta, guarda los
respaldos en una carpeta de la computadora, y si conectas esa carpeta a Google
Drive con el correo de la escuela, cada respaldo sube solo. No hay que acordarse
de nada.

## Los tres tipos de respaldo

Todos viven en `%AppData%\com.p15.prestamos\backups\`. Se distinguen por el
nombre del archivo.

| Tipo | Nombre | Quién lo crea | ¿Se borra solo? |
|---|---|---|---|
| **Automático** | `prestamos-auto-<fecha>.db` | La app, cada 12 horas | **Sí.** Se conservan los 20 más recientes |
| **Manual** | `prestamos-backup-<fecha>.db` | Tú, con el botón "Crear respaldo" | **No.** Se quedan hasta que los borres |
| **Pre-restauración** | `prestamos-pre-restore-<fecha>.db` | La app, justo **antes** de restaurar otro encima | **No.** Es la red de seguridad |

La fecha del nombre va en formato `AÑO-MES-DÍA_HORA-MINUTO-SEGUNDO`, así que al
ordenar la carpeta por nombre quedan del más viejo al más nuevo.

> **El pre-restauración es el que salva.** Si alguien restaura un respaldo viejo
> por equivocación y borra el trabajo del día, ese archivo tiene la base tal como
> estaba un segundo antes.

## El respaldo automático

- **Cada 12 horas** de forma predeterminada. Se cambia en **Admin →
  Configuración → Respaldos**: cada 6 horas, cada 12, una vez al día, una vez por
  semana.
- Mientras la app está abierta, revisa **cada 15 minutos** si ya toca. Si toca,
  lo hace en silencio.
- Se conservan los **20 automáticos más recientes**.
- Se puede apagar, pero **no lo apagues**.

> **La app tiene que estar abierta.** No hay ningún servicio corriendo por detrás
> en Windows. Si la computadora está apagada o la app cerrada, no se genera
> respaldo. Si solo abren la app un rato al día, tendrán **un** respaldo al día,
> no dos.

Además de la calendarizada, **cualquier importación del Excel de Patrimonio crea
un respaldo justo antes de aplicar cambios.**

## Conectar los respaldos a Google Drive

Se hace **una sola vez por computadora**, con la cuenta de correo de la escuela.

1. Instala **Google Drive para Escritorio**
   (<https://www.google.com/drive/download/>).
2. Inicia sesión con la **cuenta institucional**, no con una personal.
3. Drive para Escritorio → **Preferencias** → **Mi computadora** → **Agregar
   carpeta**.
4. Elige la carpeta de respaldos: pega `%AppData%\com.p15.prestamos\backups` en
   la barra de dirección del explorador y selecciónala.
5. Marca **sincronizar con Google Drive** y guarda.
6. **Repite el paso 3 con la carpeta de reportes**:
   `%AppData%\com.p15.prestamos\reportes`. Es una carpeta **hermana** de
   `backups`, no está adentro, así que hay que agregarla por separado. Ahí caen
   los reportes de la toma física.

> **Agrega las dos carpetas por separado. NUNCA agregues la carpeta padre
> `%AppData%\com.p15.prestamos`.**
>
> Ahí vive la base de datos viva (`prestamos.db` y sus archivos `-wal` y `-shm`).
> Drive sube archivos enteros sin saber si la app está a la mitad de una
> escritura, y eso **corrompe la base**.

### Dónde encontrar los respaldos en Drive

[drive.google.com](https://drive.google.com) con el correo de la escuela →
sección **Computadoras** en el menú de la izquierda → nombre de la computadora →
carpeta `backups`.

> **Drive es un espejo, no un archivo histórico.** Cuando la app borra un
> respaldo automático viejo (porque ya hay más de 20), Drive también lo borra de
> la nube. Si un respaldo te importa de verdad, créalo **manual** o muévelo a
> otra carpeta de Drive.

> **Sin internet no hay subida.** Drive espera y sube todo cuando vuelve la
> conexión. El respaldo en el disco sí se crea igual.

## Crear un respaldo a mano

1. **Admin** → **Configuración** → sección Respaldos.
2. Botón **"Crear respaldo"**.
3. Con **"Abrir carpeta"** llegas al archivo y lo puedes copiar a una USB.

Hazlo antes de: importar el Excel, actualizar la app, cerrar el ciclo escolar, o
cualquier cosa que te dé nervios.

## Copiar la base a mano, sin la app

1. **Cierra la app.**
2. Win + R → pega `%AppData%\com.p15.prestamos` → Enter.
3. Copia `prestamos.db` a un lugar seguro.

## Restaurar

1. **Admin** → **Configuración** → sección Respaldos.
2. En la tabla, cada respaldo tiene su botón **"Restaurar"**. También está
   **"Importar respaldo"** para traer un `.db` externo (de una USB o descargado
   de Drive).
3. La app revisa el archivo, crea el respaldo de **pre-restauración**,
   sobreescribe la base actual y limpia los archivos auxiliares.
4. **Reinicia la app.**

> **Restaurar reemplaza TODA la base, no la mezcla.** Lo capturado después de la
> fecha de ese respaldo se pierde. Por eso existe el pre-restauración: si te
> equivocaste de archivo, restaura el `prestamos-pre-restore-...` más reciente.

Si eliges un archivo que no es una base de datos, la app lo rechaza limpiamente:
revisa los primeros bytes del archivo antes de tocar nada.

## Dónde vive todo

```
C:\Users\<TUSUARIO>\AppData\Roaming\com.p15.prestamos\
├── prestamos.db          ← LA BASE DE DATOS. Todo el historial.
├── prestamos.db-wal      ← Cache de escritura. NO BORRAR.
├── prestamos.db-shm      ← Memoria compartida. NO BORRAR.
├── backups\              ← Todos los respaldos
└── reportes\             ← Reportes CSV de la toma física
```

**Atajo para llegar:** Win + R → `%AppData%\com.p15.prestamos` → Enter.

> Si borras esa carpeta, **pierdes todo el historial de préstamos.**

---

# Qué hago si…

Este es el capítulo de consulta. Busca tu caso.

## Problemas con personas y códigos

### Un profesor dice que su código no funciona

**Causa casi siempre:** no está dado de alta.

1. Admin → **Profesores** → búscalo por nombre.
2. Si no aparece, dalo de alta: nombre + código UDG.
3. Si sí aparece, verifica que el código esté escrito **exactamente igual** que
   el de su credencial. Un dígito de más o de menos y no entra.

### Olvidé el PIN del administrador

Entra con el código de fábrica `223992647` y el PIN `#admin*p15#`. Ese acceso de
recuperación sigue activo aunque se haya cambiado el PIN. Una vez adentro,
define uno nuevo en Profesores.

### Alguien dejó la sesión de Admin abierta

Se cierra sola a las 8 horas. Mientras tanto, cualquiera con acceso físico a esa
computadora puede administrar todo. Cierra sesión tú y recuérdaselo. Si pasa
seguido, es un problema de procedimiento, no de la app.

## Problemas con equipos

### Un equipo no aparece en el kiosko

Tres causas, en orden de frecuencia:

1. **Su categoría (o el equipo) está en modo *solo inventario*.** Ve a
   Categorías y actívalo como **Prestable**. Esta es la causa en 8 de cada 10
   casos, sobre todo después de importar el Excel.
2. **Está prestado, extraviado o en mantenimiento.** Revisa su estado en
   Inventario.
3. **El kiosko tiene oculto el catálogo.** Revisa Admin → Configuración.

### Un equipo volvió pero nadie lo registró

**Admin** → **Inventario** → menú de la fila (⋮) → **"Forzar devolución"**.

Úsalo cuando el equipo está físicamente ahí pero el sistema lo cree prestado.
Es el caso del profesor que devolvió el HDMI en el mostrador sin pasar por el
kiosko.

### Un equipo no vuelve / se perdió

1. Primero agota la búsqueda real. Un equipo marcado extraviado deja de aparecer
   para préstamo.
2. **Admin** → **Inventario** → menú de la fila (⋮) → **"Marcar perdido"**.
   También puedes editar el equipo y cambiar su estado a `extraviado`.
3. Anota en las notas del equipo **qué pasó y quién lo tenía**. Dentro de seis
   meses nadie se va a acordar.

### Un equipo se dañó

Edita el equipo y cambia su estado a `mantenimiento`. Deja de aparecer para
préstamo, pero sigue contando en el inventario - que es exactamente lo correcto:
el equipo existe, solo que no se presta.

Cuando vuelva de reparación, regrésalo a `disponible`.

### Se prestó el equipo equivocado

Fuerza la devolución del equipo mal prestado (Inventario → ⋮ → Forzar
devolución) y registra el préstamo correcto. Deja nota de qué pasó.

### El equipo a granel dice que quedan menos de los que hay

El stock a granel se descuenta al prestar y se suma al devolver. Si el número no
cuadra, casi siempre es porque alguien devolvió sin registrar. Fuerza las
devoluciones pendientes; si aun así no cuadra, edita el equipo y **corrige el
stock a mano** después de contarlos físicamente.

## Problemas con préstamos a alumnos y eventos

### Un préstamo rápido lleva días como "vencido"

`vencido` significa activo por más de 24 horas. No es una alarma automática:
alguien tiene que actuar.

1. Busca el registro en el historial de Préstamo Rápido - ahí está el nombre y
   el código del alumno.
2. Contáctalo.
3. Si el equipo regresa, márcalo **devuelto**. Si no va a regresar, márcalo
   devuelto y marca el equipo como **extraviado** en Inventario, con nota.

### Registré un préstamo rápido por error

Elimínalo desde el historial de Préstamo Rápido. Solo hazlo si de verdad fue un
error de captura; si el préstamo existió y ya se devolvió, márcalo como
**devuelto** en lugar de borrarlo. El historial vale más que la limpieza.

### En Reportes no puedo editar ni borrar una fila de préstamo rápido

Es correcto. Las filas de **texto libre** (equipo escrito a mano, no elegido del
inventario) son de solo lectura desde Reportes, porque no existen en la tabla de
préstamos normales. Se administran desde **Préstamo Rápido**.

### Cerré el evento y faltó equipo

El evento queda como **cerrado con faltantes** y las filas de ese equipo siguen
activas. Es a propósito: hay material afuera.

Desde ahí tienes dos caminos:

- El equipo aparece después → devuélvelo normalmente.
- El equipo no aparece → márcalo **extraviado** en Inventario, con nota de a qué
  evento salió y quién era el responsable.

### No encuentro un evento en el historial

El historial de Préstamo Rápido tiene **filtro por tipo de objeto**. Un evento se
filtra por las categorías de **todo** lo que salió con él, así que sí debería
aparecer al filtrar por cualquiera de esos tipos. Si no aparece, revisa que no
tengas también un filtro de estado activo (por ejemplo, viendo solo `activo`
cuando el evento ya está cerrado).

## Problemas con la pistola y las etiquetas

### La pistola no lee nada

1. Prueba la pistola en el Bloc de notas. ¿Escribe el código ahí? Si no, es la
   pistola o el cable USB, no la app.
2. Si escribe en el Bloc de notas pero no en la app, asegúrate de que la ventana
   de la app esté **enfocada** (haz clic en ella una vez).

### La pistola lee pero no se dispara sola

La app detecta el disparo por **velocidad**. Si estás en un campo de texto y
escribes despacio, espera tu `Enter`. Vuelve a disparar sin tocar el teclado.

### El código se pega al anterior

En el buscador, un código nuevo **reemplaza** al anterior, no lo concatena. Si
ves códigos pegados, es que estás en otro campo: limpia el campo y vuelve a
disparar.

### La etiqueta está rota o ilegible

En la toma física, usa el botón **"Sí está"** en la fila del equipo. Queda
contado como localizado sin necesidad de escanear. Después manda a reetiquetar.

### Escaneé un código que la app no reconoce

Ver *Alta al vuelo* en el capítulo 6. Tienes tres salidas ahí mismo: ligarlo a
un equipo existente, darlo de alta rápido, o abrir la ficha completa. **Si el
aparato está en la mano, usa la ficha completa** y captura marca, modelo y serie.

## Problemas con la importación

### Importé el Excel y ahora nada se puede prestar

Es intencional. Ve a Categorías y marca **Prestable** en lo que corresponda.

### Importé el Excel equivocado

**Admin** → **Configuración** → **Respaldos** → restaura el respaldo manual
que la app creó **justo antes** de aplicar la importación. Reconócelo por su
fecha y hora: es el más cercano al momento en que importaste.

### El plan previo muestra números que no esperaba

**No apliques.** El plan existe precisamente para eso. Revisa que el archivo sea
el correcto y de la fecha correcta. Si el plan dice que va a crear 400
categorías nuevas, algo está mal con el archivo, no con la app.

## Problemas con la app misma

### Windows muestra una pantalla azul "Windows protegió su PC"

Normal. La app no tiene certificado comercial de firma.
**"Más información"** → **"Ejecutar de todas formas"**.

### La app abre en blanco

Una causa posible es que falte o esté dañado **WebView2**. Instálalo o repáralo
desde <https://developer.microsoft.com/microsoft-edge/webview2/> y vuelve a
abrir. Si sigue en blanco, anota la versión y pide soporte: una pantalla en
blanco, por sí sola, no demuestra que la base esté dañada.

### La app se cierra sola al arrancar

No asumas la causa sin revisar el mensaje. Si la app alcanza a abrir, restaura
desde Configuración. Si no abre y necesitas recuperación manual:

1. Cierra la app.
2. Copia **toda** la carpeta `%AppData%\\com.p15.prestamos` a una USB antes de
   tocarla.
3. Conserva el `prestamos.db` actual con otro nombre.
4. Copia un respaldo conocido de `backups\\` y nómbralo `prestamos.db`.
5. Solo después de tener esas copias, retira los archivos `-wal` y `-shm` y
   vuelve a abrir.

### Se apagó la computadora a media captura

Abre la app y verifica el último registro que hiciste. SQLite es resistente a
apagones, pero lo que no se alcanzó a confirmar no está. Vuelve a capturarlo.

### Se borró la carpeta de datos

Si tienes respaldo en `backups\`, en una USB, en otra computadora o en Drive:
restáuralo. Si no hay respaldo en ningún lado, **se perdió**.

## Problemas de dos computadoras

### Trabajé en dos computadoras y perdí datos

Esto pasa cuando las dos capturan y una restaura la base de la otra encima.
Restaurar **reemplaza**.

- Para **relevo completo** (una trabaja, luego la otra): pásate el `.db` y
  respeta *una sola computadora activa a la vez*.
- Para **toma física en paralelo** (las dos trabajan a la vez): la segunda
  devuelve el **CSV**, no el `.db`. El CSV fusiona.

Si ya perdiste datos: restaura el `prestamos-pre-restore-...` más reciente de la
computadora afectada.

### Necesito llevarme la app a otra computadora

1. En la computadora original: **Crear respaldo** → **Abrir carpeta** → copia el
   `.db` a una USB (o descárgalo de Drive).
2. En la nueva: instala la app, **Importar respaldo**, elige el `.db`, reinicia.
3. A partir de ahí, **la nueva es la computadora activa**. No captures nada más
   en la vieja.

## Actualizaciones

### Cómo actualizo la app

1. En la versión instalada, crea un respaldo manual y copia ese `.db` fuera de
   la computadora.
2. Anota la versión actual desde la pantalla de inicio.
3. **CIERRA la app.** No actualices con la app abierta.
4. En GitHub Releases, descarga el instalador y el archivo
   `manual-personal-app-prestamos-p15.pdf` de la **misma versión**.
5. Instala el nuevo `.exe` o `.msi` **encima**. No hace falta desinstalar.
6. Abre la app. La base se conserva y las migraciones corren solas.
7. Prueba un inicio de sesión, abre Inventario y confirma que los préstamos
   activos siguen presentes antes de volver a operar.

### Actualicé y algo se ve raro

Restaura el respaldo que creaste en el paso 1 e informa qué pasó. No sigas
capturando sobre un estado que no entiendes.

---

# Funciones en pruebas

Estas funciones existen en la app pero **todavía no están terminadas**. No las
uses como parte del procedimiento diario.

| Función | Dónde | Estado |
|---|---|---|
| **Acceso desde celular con QR** | Admin → Configuración | Experimento. El panel funciona, pero depende de la red de la escuela y no está garantizado. |
| **Fotos de devolución** | Admin | Experimento. |

Si algo de esto se comporta raro, **no es tu culpa y no rompe nada más**.
Simplemente no lo uses todavía.

---

# Calendario de mantenimiento

| Cada… | Tarea |
|---|---|
| **Diario** | Nada especial. Solo **abre la app**: el respaldo automático necesita que esté abierta para correr. |
| **Semanal** | Revisar préstamos activos muy antiguos. ¿Un equipo prestado hace tres semanas? Persíguelo. |
| **Semanal** | Revisar los `vencido` de Préstamo Rápido. |
| **Mensual** | Exportar el reporte del mes (Reportes → filtrar por mes → Imprimir). |
| **Mensual** | Correr una campaña de toma física **por área**. No intentes todo de una vez. |
| **Antes de importar Excel** | Verificar que haya respaldo reciente. |
| **Trimestral** | Con la app cerrada, copiar la carpeta `%AppData%\com.p15.prestamos\` completa a un USB y guardarla **fuera de la oficina**. |
| **Anual** | Archivar el historial del año. Crear un respaldo manual del cierre - esos nunca se borran solos. |

## Checklist del primer día en una computadora nueva

- [ ] Instalar la app.
- [ ] Abrirla una vez (crea la base de datos).
- [ ] Entrar al Admin con las credenciales de fábrica.
- [ ] **Cambiar el PIN.**
- [ ] Dar de alta a los administradores reales.
- [ ] Instalar Google Drive para Escritorio con el correo de la escuela.
- [ ] Conectar la carpeta `backups` a Drive.
- [ ] Conectar la carpeta `reportes` a Drive **por separado**.
- [ ] Verificar que el respaldo automático esté activado (Configuración).
- [ ] Probar la pistola en modo prueba de la toma física.

---

# Glosario

| Palabra | Qué significa aquí |
|---|---|
| **A granel** | Varias piezas idénticas en una sola fila del inventario (10 adaptadores HDMI). Tiene un número de stock. |
| **Campaña** | Una pasada de conteo físico sobre un área. Iniciarla reinicia el área a *pendiente*. |
| **Categoría** | Grupo de equipos (Laptops, Proyectores). Decide de golpe si sus equipos son prestables. |
| **Código UDG** | El número de empleado del profesor. Es su llave para el kiosko. |
| **Extraviado** | Estado de un equipo que se buscó y no apareció. Deja de ofrecerse para préstamo. |
| **Fusionar** | Juntar dos trabajos sin que ninguno borre al otro. Solo el CSV de la toma física fusiona. |
| **ID patrimonial** | El código de la etiqueta oficial de la UdeG. Es el que lee la pistola. |
| **Kiosko** | El modo en el que entra un profesor con solo su código. |
| **PIN** | La contraseña de un administrador. Solo se pide en el modo Admin. |
| **Prestable** | Que aparece en el kiosko y se puede pedir. |
| **Reemplazar** | Poner una base completa encima de otra. Lo que hace *restaurar*. Lo anterior se pierde. |
| **Respaldo** | Una copia congelada de toda la base en un momento dado. Archivo `.db`. |
| **Solo inventario** | Que se cuenta pero no se presta. |
| **Toma física** | El recorrido con pistola para cuadrar estantes contra base de datos. |
| **Vencido** | Préstamo rápido activo por más de 24 horas. |

---

# Dónde está lo demás

## Si necesitas ayuda

Antes de pedir soporte, anota estas cinco cosas. Con eso otra persona puede
ayudarte sin adivinar:

1. La **versión** que aparece en la pantalla de inicio.
2. La pantalla y el botón exactos donde ocurrió.
3. El mensaje completo del error; toma una foto si hace falta.
4. Lo último que funcionó y lo último que cambió.
5. La fecha del respaldo más reciente. **No borres ni reemplaces archivos**
   mientras esperas ayuda.

Entrega esa información a la persona responsable del sistema en la escuela. Si
esa persona mantiene el repositorio, puede abrir un reporte en
<https://github.com/Leoglez10/app-prestamos-p15/issues> sin adjuntar la base de
datos, PINes ni información personal.

## Videos tutoriales

Hay seis videos que muestran en pantalla lo que este manual explica en texto:

1. Kiosko
2. Configuración
3. Importar Excel de Patrimonio
4. Préstamo Rápido
5. Toma física
6. Respaldos

Índice completo en `VIDEOS_TUTORIALES.md`.

## Documentación

| Documento | Para qué |
|---|---|
| `README.md` | La guía general del proyecto, para cualquier persona |
| `docs/INVENTARIO_PATRIMONIO.md` | Formato de las etiquetas y del Excel de Patrimonio |
| `docs/RELEVO_TOMA_FISICA.md` | Detalle completo de la toma física en dos computadoras |
| `docs/ENGINEERING_HANDBOOK.md` | Para quien vaya a **modificar** el programa |
| `CHANGELOG.md` | Qué cambió en cada versión |

## El programa y sus versiones

- **Instaladores:** <https://github.com/Leoglez10/app-prestamos-p15/releases>
- **Código fuente:** <https://github.com/Leoglez10/app-prestamos-p15>

Cada versión publicada trae su instalador de Windows y una copia de este mismo
manual en PDF. **Descarga siempre el manual de la misma versión que tengas
instalada:** las funciones cambian entre versiones.

Quien reciba el mantenimiento del proyecto debe empezar por
`docs/ENGINEERING_HANDBOOK.md`. El flujo de publicación vive en
`scripts/publish-release.sh`; el personal operativo **no debe crear tags ni
editar versiones a mano**.

---

*Manual generado desde `docs/MANUAL_PERSONAL.md` del repositorio del proyecto.
Si algo en la app no coincide con lo que dice aquí, gana la app - y hay que
corregir el manual.*
