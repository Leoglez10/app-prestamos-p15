# 🎬 Video 4 — Préstamo Rápido: préstamos a alumnos

> Guion de producción. Todo lo que se afirma aquí está verificado contra el código
> del repositorio; cada paso lleva su referencia `archivo:línea`.

| Campo | Valor |
|---|---|
| **Duración estimada** | ~2:10 — estimación con el factor del video 1 aplicado (+42% sobre lectura). La real se mide después de sintetizar la narración |
| **Público** | La persona administradora y el personal del área de cómputo. **No** el profesorado en general |
| **Objetivo** | Que quien atiende el mostrador registre un préstamo a un alumno, lo encuentre después y lo devuelva sin dejar el inventario descuadrado |
| **Herramienta** | HyperFrames · preset `blue-professional` · voz HeyGen (español) |
| **Formato** | 1920×1080, 30 fps |
| **Narración** | Voz en off, español neutro, tono tranquilo de instructivo |
| **Estado** | ⬜ Guion listo · sin producir |
| **Plan de la serie** | [../../VIDEOS_TUTORIALES.md](../../VIDEOS_TUTORIALES.md) |

---

## 1. Mapa del código — dónde vive cada cosa que se muestra

Referencias relativas a `app-prestamos-p15/` (el proyecto anidado).

### Entrada y acceso

| Elemento en pantalla | Dónde vive |
|---|---|
| Tarjeta **"Préstamo Rápido"** en el inicio → ruta `/prestamo-rapido` | `src/pages/Home.tsx:233-242` |
| Texto de la tarjeta: *"Registro de préstamos a alumnos. Requiere código administrativo."* | `src/pages/Home.tsx:238-240` |
| Pantalla **"Acceso administrativo"** | `src/pages/PrestamoRapido.tsx:551` |
| Aviso **"Solo personal autorizado"** | `src/pages/PrestamoRapido.tsx:558` |
| Formulario de un solo campo: **"Código de acceso"** | `src/auth/LoginForm.tsx:52-73` |
| Botón **"Acceder a préstamos"** / *"Verificando acceso..."* | `src/auth/LoginForm.tsx:80-82` |
| Badge **"Sesión: <nombre> (<código>)"** + **"Cerrar sesión"** | `src/auth/SessionBadge.tsx:11-24` |

### Formulario "Nuevo préstamo"

| Elemento en pantalla | Dónde vive |
|---|---|
| Título **"Nuevo préstamo"** | `src/pages/PrestamoRapido.tsx:592` |
| Toggle **"Registrar préstamo para"** → *Alumno* / *Profesor* | `src/pages/PrestamoRapido.tsx:619-641` |
| Campo **"Nombre del Alumno"** / **"Nombre del Profesor"** (combobox) | `src/pages/PrestamoRapido.tsx:645-723` · etiquetas en `:184-187` |
| Etiqueta **"Directorio"** / **"Ya prestó antes"** en cada sugerencia | `src/pages/PrestamoRapido.tsx:706-709` |
| Mensaje *"Sin coincidencias · se guardará como alumno nuevo"* | `src/pages/PrestamoRapido.tsx:714-715` |
| Campo **"Código UDG del Alumno"** / **"Código del Profesor"** | `src/pages/PrestamoRapido.tsx:726-754` |
| Campo **"Objeto Prestado"** (combobox del inventario) | `src/pages/PrestamoRapido.tsx:757-874` |
| Chips de los objetos agregados, con **×** para quitar | `src/pages/PrestamoRapido.tsx:762-778` |
| Mensaje *"Sin coincidencias en el inventario · se guardará como texto libre"* | `src/pages/PrestamoRapido.tsx:861-862` |
| Aviso *"Se registrará 1 objeto contra el inventario. La devolución lo actualizará automáticamente."* | `src/pages/PrestamoRapido.tsx:868-873` |
| Campo **"Observaciones (opcional)"** | `src/pages/PrestamoRapido.tsx:881-895` |
| Botones **"Limpiar"** y **"Registrar Préstamo"** | `src/pages/PrestamoRapido.tsx:899-925` |

### Historial

| Elemento en pantalla | Dónde vive |
|---|---|
| Buscador *"Buscar persona, código u objeto..."* | `src/pages/PrestamoRapido.tsx:940-949` |
| Chips de filtro con contador | `src/pages/PrestamoRapido.tsx:569-574` · render en `:952-967` |
| Columnas: Persona · Objeto · Tiempo · Estado | `src/pages/PrestamoRapido.tsx:987-993` |
| Línea *"<código> · autorizó <nombre>"* | `src/pages/PrestamoRapido.tsx:1005-1008` |
| Badge **"Profesor"** en la celda de persona | `src/pages/PrestamoRapido.tsx:1001-1003` |
| Tiempo transcurrido (*recién · hace N min · hace N h · hace N días*) | `timeAgo` — `src/pages/PrestamoRapido.tsx:51-60` |
| Botón **"Devolver"** | `src/pages/PrestamoRapido.tsx:1052-1060` → `handleMarcarDevuelto` (`:499`) |
| Botón de basurero (eliminar) + confirmación | `src/pages/PrestamoRapido.tsx:1061-1068` → `handleEliminar` (`:509`) |

### Reglas de negocio que el video enseña

| Regla | Dónde está escrita |
|---|---|
| Se entra **solo con el código de administrador**, sin PIN. El código debe existir en `profesores` con `es_admin = 1` | `loginAdminByCode` — `src/hooks/useInventory.ts:784-795` |
| La sesión **se guarda y sobrevive al cerrar la app**. No hay caducidad ni bloqueo por inactividad | `src/auth/AuthContext.tsx:3-4, 49-66` |
| Al restaurar la sesión se **re-valida contra la base**: un `localStorage` alterado a mano no da acceso | `verifyAdminStoredSession` — `src/hooks/useInventory.ts:800-806` |
| **"Vencido" = activo por más de 24 horas exactas** | `VENCIDO_MS = 24 * 60 * 60 * 1000` — `src/pages/PrestamoRapido.tsx:36` · `isVencido` (`:45-49`) |
| El código de la persona **debe ser solo números** | `src/pages/PrestamoRapido.tsx:301-303` |
| Un objeto elegido del catálogo **crea un préstamo real en `prestamos`** y marca el equipo como `prestado` | `createPrestamoRapidoDesdeInventario` — `src/hooks/useInventory.ts:1615-1706` |
| Devolver desde aquí **cierra también el préstamo real** y libera el equipo | `marcarPrestamoRapidoDevuelto` — `src/hooks/useInventory.ts:1715-1752` |
| Un registro ligado a un préstamo **activo no se puede eliminar** | `deletePrestamoRapidoAlumno` — `src/hooks/useInventory.ts:1754-1775` |
| El equipo no prestable, el único ya prestado o el granel sin stock **se rechazan con mensaje** | `src/hooks/useInventory.ts:1657-1670` |
| Un objeto a granel **no cambia de estado**; su disponibilidad sale de contar préstamos activos | `src/hooks/useInventory.ts:1683-1686` |
| El texto libre **no toca el inventario**: es el camino de siempre | `createPrestamoRapidoAlumno` — `src/hooks/useInventory.ts:1574-1602` |
| Cada objeto es **un registro propio**: un préstamo de tres cosas son tres filas | `src/pages/PrestamoRapido.tsx:429-448` |
| El nombre y el código de quien autorizó se guardan solos | `id_admin`, `autorizante_codigo`, `autorizante_nombre` — `src/hooks/useInventory.ts:1693-1704` |
| El historial carga **las últimas 500 filas** y se filtra en memoria | `src/hooks/useInventory.ts:1546` |
| Los tiempos y el aviso de "más de 1 día" **se refrescan cada minuto** | `src/pages/PrestamoRapido.tsx:105-108` |
| `fecha_salida` se escribe en **hora local**, no en UTC — si no, el tiempo transcurrido mentiría | `src/hooks/useInventory.ts:1584-1586` |

---

## 2. Correcciones al plan de la serie

El plan de la serie describe este video con tres puntos que ya no coinciden con la app. **El primero cambia el mensaje central del video.**

1. **Ya NO son "dos sistemas paralelos con historiales separados".** Cuando el objeto se elige del catálogo del inventario, `createPrestamoRapidoDesdeInventario` (`src/hooks/useInventory.ts:1615`) inserta **también** una fila en `prestamos`, marca el equipo como `prestado` y amarra ambos registros por `prestamo_app_id` / `equipo_id`. Devolver desde el Préstamo Rápido cierra el préstamo real y libera el equipo (`:1715`). Lo único que sigue fuera del inventario es el **texto libre**. El video tiene que enseñar exactamente esa frontera: *lo que eliges del catálogo cuenta; lo que escribes a mano, no.*

2. **No hay exportación a PDF en esta pantalla.** No existe ningún botón de PDF en `PrestamoRapido.tsx`. Los dos diseñadores de PDF viven en Admin (`src/pages/Admin.tsx:760` para inventario y `:1333` para reportes) y el de reportes trabaja sobre los préstamos del **kiosko** — sus opciones son *código profesor*, *obs. profesor*, *condición devolución*. **Quitar este punto del video.**

3. **"Vencido" nunca aparece escrito en pantalla.** El chip dice **"Más de 1 día"** y el badge de la fila también (`src/pages/PrestamoRapido.tsx:571, 1037`). La narración debe usar las palabras de la interfaz, no las del código.

Además, tres cosas que el plan no menciona y sí valen video:

4. **Se pueden registrar varios objetos en un mismo préstamo.** Se agregan como chips y **cada uno se devuelve por separado** (`src/pages/PrestamoRapido.tsx:762-778, 429-448`).
5. **El campo de la persona es un autocompletado con dos fuentes:** el directorio de profesores y todo aquel que ya haya pedido algo antes (`personaPool` — `src/pages/PrestamoRapido.tsx:189-206`).
6. **La sesión no se cierra sola.** A diferencia del kiosko, que cierra a los 3 segundos, aquí la sesión persiste hasta que alguien pulse "Cerrar sesión" — incluso después de cerrar la app (`src/auth/AuthContext.tsx:49-66`). En una máquina de mostrador eso importa, y el video lo tiene que decir.

---

## 3. Guion escena por escena

Formato: `⏱ tiempo · TÍTULO` → **Pantalla** (qué se ve) / **Voz** (narración literal) / **Nota de producción**.

### ⏱ 0:00 – 0:07 · Portada

- **Pantalla:** logo P15 sobre fondo limpio. Título grande: **"Préstamos a alumnos"**. Subtítulo: *Video 4 de 6 · Préstamo Rápido*.
- **Voz:** «Un alumno necesita un cable. No tiene código de profesor. Para eso existe el Préstamo Rápido.»
- **Nota:** logo en `app-prestamos-p15/img/logo-p15.png`. Mantener el mismo tratamiento de portada del video 1.

### ⏱ 0:07 – 0:22 · Dónde entra y para quién es

- **Pantalla:** pantalla de inicio. Las dos tarjetas visibles. El cursor pasa de largo por "Soy Profesor" y se detiene en la tarjeta gris **"Préstamo Rápido"**, resaltada con un halo. Se lee su texto: *"Requiere código administrativo."*
- **Voz:** «Esta pantalla no es para el profesorado: es para quien atiende el mostrador. Se llama Préstamo Rápido porque registra en segundos lo que el kiosko no puede — un préstamo a alguien que no tiene código de profesor.»
- **Nota:** no repetir el flujo del kiosko. Un solo plano de la tarjeta basta.

### ⏱ 0:22 – 0:35 · Entrar: solo tu código

- **Pantalla:** pantalla **"Acceso administrativo"** con el aviso *"Solo personal autorizado"*. Se teclea un código en el único campo y se pulsa **"Acceder a préstamos"**. Arriba aparece el badge **"Sesión: <nombre>"**.
- **Voz:** «Se entra con tu código de administrador. Un campo, sin contraseña. Y esta sesión no se cierra sola: cuando termines tu turno, pulsa Cerrar sesión arriba. Si no lo haces, sigue abierta aunque cierres la aplicación.»
- **Nota:** usar un código ficticio. **Nunca** el de una persona real, y **jamás** el código de emergencia de fábrica. Hacer un plano cerrado del botón "Cerrar sesión" del badge mientras se dice esa frase — es el punto de seguridad del video.

### ⏱ 0:35 – 0:48 · Alumno o profesor

- **Pantalla:** el formulario **"Nuevo préstamo"**. Se pulsa el toggle **Alumno / Profesor** y las etiquetas de los campos cambian en vivo: *"Nombre del Alumno"* → *"Nombre del Profesor"*, *"Código UDG del Alumno"* → *"Código del Profesor"*.
- **Voz:** «Primero, para quién es. Al cambiar entre Alumno y Profesor, los campos se renombran solos. Sí: también puedes registrar a un profesor aquí, cuando el préstamo lo autorizas tú en el mostrador y no él desde el kiosko.»
- **Nota:** grabar el cambio de etiquetas como una transición suave; es el detalle que hace evidente el toggle.

### ⏱ 0:48 – 1:05 · La persona: se escribe una vez

- **Pantalla:** se empieza a escribir un nombre. Baja la lista de sugerencias con sus etiquetas de color: una fila con **"Directorio"** y otra con **"Ya prestó antes"**. Se elige una con la flecha y Enter; **el nombre y el código se llenan solos**. Después se borra y se escribe un nombre nuevo: aparece *"Sin coincidencias · se guardará como alumno nuevo"*.
- **Voz:** "Al escribir el nombre, la app propone. Los profesores salen del directorio; los alumnos, de quienes ya pidieron algo antes. Eliges uno y el código se llena solo. Si es la primera vez de esa persona, escribe su nombre y su código completos: la próxima vez ya va a estar en la lista.»
- **Nota:** el código **solo acepta números** (`src/pages/PrestamoRapido.tsx:301-303`). Mostrar de refilón el error *"El código debe contener solo números."* si el tiempo lo permite; si no, omitir.

### ⏱ 1:05 – 1:25 · El objeto: la parte que sí cuenta

- **Pantalla:** se escribe en **"Objeto Prestado"** y baja la lista del inventario: nombre, categoría, identificador y a la derecha el estado — *Disponible* o *N de M disponibles*. Se elige uno. Aparece el chip verde con el nombre y, debajo, el aviso: *"Se registrará 1 objeto contra el inventario. La devolución lo actualizará automáticamente."*
- **Voz:** «Aquí está lo importante. Si eliges el objeto del catálogo, esto **no** es una libreta aparte: la app lo marca como prestado en el inventario real, igual que si lo hubiera pedido un profesor en el kiosko. Deja de aparecer como disponible, y vuelve cuando lo devuelvas desde aquí.»
- **Nota:** **la escena clave del video.** Partir la pantalla: a la izquierda el formulario; a la derecha, el mismo equipo en el inventario cambiando de *Disponible* a *Prestado* al registrar. Sin esa comparación el concepto no entra.

### ⏱ 1:25 – 1:40 · Varios objetos, y el texto libre

- **Pantalla:** se agregan dos objetos más; quedan tres chips en fila, cada uno con su **×**. Después se escribe algo que no está en el inventario —*"cargador prestado por el alumno"*— y aparece *"Sin coincidencias en el inventario · se guardará como texto libre"*.
- **Voz:** «Puedes agregar varios objetos al mismo préstamo. Cada uno queda como su propio registro, y se devuelve por separado. Y si lo que prestas no está en el inventario, escríbelo tal cual: se guarda como texto, pero ese no descuenta nada. Solo cuenta lo que eliges del catálogo.»
- **Nota:** el aviso del inventario cambia de texto con más de un objeto: *"Se registrarán 3 objetos contra el inventario, cada uno se devuelve por separado."* (`src/pages/PrestamoRapido.tsx:872`). Mostrarlo.

### ⏱ 1:40 – 1:50 · Registrar, y quién autorizó

- **Pantalla:** se escribe una observación corta, se pulsa **"Registrar Préstamo"**. Alerta verde: *"Préstamo de <nombre> registrado (3 objetos)."* El cursor vuelve solo al primer campo. En el historial aparecen las filas nuevas, con la línea *"<código> · autorizó <nombre del admin>"* resaltada.
- **Voz:** «Registrar. El formulario se limpia y el cursor vuelve arriba, para el siguiente. Y fíjate en la letra chica de cada registro: la app anota sola quién autorizó el préstamo. No hay que escribirlo, y no se puede cambiar.»
- **Nota:** el aviso verde desaparece solo a los 3.5 s (`src/pages/PrestamoRapido.tsx:137-141`). Respetar ese tiempo.

### ⏱ 1:50 – 2:03 · Encontrar un préstamo después

- **Pantalla:** el panel **Historial**. Los cuatro chips con sus contadores: **En préstamo · Más de 1 día · Devueltos · Todos**. Se pulsa **"Más de 1 día"** y quedan dos filas en rojo. Se escribe un apellido en el buscador y la lista se reduce.
- **Voz:** «El historial abre siempre en lo que está prestado. El chip de "Más de 1 día" te muestra lo que lleva fuera más de veinticuatro horas — esos son los que hay que ir a buscar. Y el buscador encuentra por nombre, por código o por objeto.»
- **Nota:** la columna Tiempo dice *"hace 3 h"*, *"hace 2 días"*. Usar datos de demo que produzcan al menos un *"hace 2 días"* en rojo.

### ⏱ 2:03 – 2:16 · Devolver, y por qué a veces no deja borrar

- **Pantalla:** se pulsa **"Devolver"** en una fila. La fila pasa a **"Devuelto"** y, en la mitad derecha, el equipo vuelve a *Disponible* en el inventario. Después se intenta el basurero en una fila **activa y ligada**: aparece el mensaje *"Este préstamo está ligado al inventario. Márcalo como devuelto antes de eliminarlo."*
- **Voz:** «Cuando regresen el equipo, Devolver. Eso libera el objeto en el inventario, no solo aquí. Y si intentas borrar un registro que todavía está prestado, la app no te deja: te pide devolverlo primero. Es a propósito — borrarlo dejaría un equipo marcado como prestado para siempre.»
- **Nota:** segunda escena crítica. Volver a partir la pantalla como en 1:05, para cerrar el círculo del inventario.

### ⏱ 2:16 – 2:20 · Cierre

- **Pantalla:** logo P15 y una línea: *"Del catálogo cuenta. A mano, no."*
- **Voz:** —
- **Nota:** sin voz. Es la frase que debe quedarse.

---

## 4. Datos de demo necesarios

Preparar una base de datos de demostración (nunca la de producción) con:

- **Un administrador ficticio** en `profesores` con `es_admin = 1` y un código inventado.
- **Un profesor más en el directorio**, para que salga la etiqueta *"Directorio"* al cambiar el toggle a Profesor.
- **Dos o tres préstamos rápidos previos a alumnos**, para que el autocompletado tenga filas con *"Ya prestó antes"*.
- **Un equipo único disponible y prestable** para la escena del inventario.
- **Un equipo a granel** con stock parcial, para ver *"N de M disponibles"* en la lista.
- **Un préstamo activo con más de 24 horas** de antigüedad, para el chip rojo *"Más de 1 día"*.
- **Un préstamo activo ligado al inventario**, para la escena del borrado bloqueado.
- **Un registro devuelto**, para el chip *"Devueltos"* y la línea *"devuelto hace N h"*.

> ⚠️ El equipo de la escena del inventario debe ser **prestable de verdad**: si su categoría está
> en *Solo inventario*, o el equipo tiene `es_prestable = 0`, la app rechaza el préstamo con
> *"está marcado como no prestable"* (`esPrestableEfectivo` — `src/hooks/useInventory.ts:1662`).
> Es el mismo tropiezo que explica el video 3.

## 5. Fuera de alcance de este video

- El kiosko y el flujo del profesorado → Video 1.
- Alta de administradores, PIN y el toggle *Prestable / Solo inventario* → Video 2.
- Por qué lo importado del Excel entra como *solo inventario* → Video 3.
- Toma física → Video 5.
- Respaldos y la segunda computadora → Video 6.
- Los PDF de inventario y de reportes de Admin: **no salen aquí**, no pertenecen a esta pantalla.

## 6. Producción

Todavía no existe el proyecto HyperFrames de este video. Al crearlo, seguir la estructura de
`videos/01-kiosko/` y leer su §6 antes de tocar nada — sobre todo estos tres puntos, que
cuestan tiempo si se descubren tarde:

1. **La duración la manda la voz.** `audio.mjs sync-durations` reescribe la duración de cada frame con la medida real. Los tiempos de arriba son estimados y hay que reajustarlos después de sintetizar.
2. **Las fuentes van dentro del repo.** El render corre en un Chrome headless sin fuentes del sistema.
3. **`captions.mjs build` pisa el parche del último subtítulo.** Si se regeneran los subtítulos, hay que volver a aplicarlo.
