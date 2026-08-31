# 🎬 Video 2 — Configuración inicial

> Guion de producción. Todo lo que se afirma aquí está verificado contra el código
> del repositorio; cada paso lleva su referencia `archivo:línea`.

| Campo | Valor |
|---|---|
| **Duración real** | 139.6 s (2:20) — medida sobre la narración sintetizada |
| **Público** | La persona que administra: quien deja la app lista la primera vez |
| **Objetivo** | Que la escuela arranque sola, sin depender del desarrollador |
| **Herramienta** | HyperFrames · preset `blue-professional` · voz HeyGen (español), la misma del video 1 |
| **Formato** | 1920×1080, 30 fps |
| **Narración** | Voz en off, español, tono instructivo tranquilo |
| **Estado** | ✅ Renderizado · [`renders/video.mp4`](renders/video.mp4) |
| **Plan de la serie** | [../../VIDEOS_TUTORIALES.md](../../VIDEOS_TUTORIALES.md) |

> ⚠️ **Este video NO es para todo el personal.** El 1 lo ve cualquier profesor; este lo ve
> quien administra. Se habla de PINes y de permisos. Ver § 3.

---

## 1. Mapa del código — dónde vive cada cosa que se muestra

Referencias relativas a `app-prestamos-p15/`.

### Entrar a Admin

| Elemento en pantalla | Dónde vive |
|---|---|
| Pantalla **"Acceso Admin P15"** | `src/pages/Admin.tsx:2761` |
| Subtítulo "Ingresa con código de profesor y PIN de administrador." | `src/pages/Admin.tsx:2762` |
| Campos `Código de profesor` / `PIN de administrador` | `src/pages/Admin.tsx:2769`, `:2776` |
| Error `Código o PIN inválido, o el profesor no tiene permisos de administrador.` | `src/pages/Admin.tsx:2717` |
| Barra lateral con las 6 pestañas | `src/pages/Admin.tsx:2814-2838` |

Las pestañas, en el orden real: **Inventario · Toma de inventario · Categorías · Profesores ·
Reportes · Configuración**. La que abre por omisión es **Inventario** (`Admin.tsx:2676`).

### Pestaña Profesores

| Elemento en pantalla | Dónde vive |
|---|---|
| Título **"Directorio de Profesores"** | `src/pages/Admin.tsx:2196` |
| Tarjeta **"Agregar Profesor"** / "Editar Profesor" | `src/pages/Admin.tsx:2199` |
| Campos `Código` y `Nombre completo` | `src/pages/Admin.tsx:2204`, `:2211` |
| Casilla **"Hacer administrador"** | `src/pages/Admin.tsx:2228` |
| Campo `PIN de administrador` (solo aparece con la casilla marcada) | `src/pages/Admin.tsx:2233` |
| Buscador `Buscar por código o nombre...` | `src/pages/Admin.tsx:2251` |
| Tabla: Código · Nombre · **Rol** · Acciones | `src/pages/Admin.tsx:2267-2270` |
| Etiqueta de rol **"Administrador"** / **"Profesor"** | `src/pages/Admin.tsx:2286` |

### Pestaña Categorías

| Elemento en pantalla | Dónde vive |
|---|---|
| Título **"Categorías"** | `src/pages/Admin.tsx:1779` |
| Campo `Nombre de la categoría` | `src/pages/Admin.tsx:1786` |
| Botón-toggle **"Prestable en kiosko"** con su estado "Visible para profesores" / "Solo inventario" | `src/pages/Admin.tsx:1794-1829` |
| Insignia **"Activo"** / **"Oculto"** del toggle | `src/pages/Admin.tsx:1829` |
| Tabla: Nombre · Artículos · **Préstamo** · Acciones | `src/pages/Admin.tsx:1863-1866` |
| Botón por fila **"Prestable"** / **"Solo inventario"** | `src/pages/Admin.tsx:1885-1895` |

### Formulario de equipo (`EquipoFormDialog`)

| Elemento en pantalla | Dónde vive |
|---|---|
| Sección **"Cómo se cuenta"** | `src/components/EquipoFormDialog.tsx:243` |
| Botones **"Equipo único"** ("Se presta uno por uno") / **"Por cantidad"** ("Cables, controles, stock") | `src/components/EquipoFormDialog.tsx:247-253` |
| `Código o serie` + `ID de Patrimonio` (solo en Equipo único) | `src/components/EquipoFormDialog.tsx:260`, `:268` |
| Ayuda "Escanea la etiqueta blanca con la pistola." | `src/components/EquipoFormDialog.tsx:275` |
| Campo **"¿Cuántas unidades?"** (alta múltiple) | `src/components/EquipoFormDialog.tsx:282-288` |
| Vista previa "Se crearán: `X` … `Y`" | `src/components/EquipoFormDialog.tsx:291-302` |
| Campo **"Cantidad total"** (solo en Por cantidad) | `src/components/EquipoFormDialog.tsx:308` |

### Pestaña Configuración

| Elemento en pantalla | Dónde vive |
|---|---|
| Título **"Configuración"** | `src/pages/Admin.tsx:2508` |
| Bloque **"Kiosko"** | `src/pages/Admin.tsx:2515` |
| Casilla **"Mostrar catálogo para préstamos"** (`kiosk_show_catalogo`) | `src/pages/Admin.tsx:2517-2524` |
| Casilla **"Mostrar préstamos pendientes al profesor"** (`kiosk_show_pendientes`) | `src/pages/Admin.tsx:2527-2534` |

### Escaneo con la pistola desde Inventario

| Qué | Dónde vive |
|---|---|
| La pestaña Inventario escucha la pistola aunque no haya campo de escaneo | `useEscaneoGlobal(!formAbierto, abrirPorEscaneo)` — `src/pages/Admin.tsx:486` |
| Etiqueta conocida → abre la ficha del equipo; desconocida → abre el alta con el código ya puesto | `abrirPorEscaneo` — `src/pages/Admin.tsx:469-481` |
| Mientras el formulario está abierto, el teclado es suyo (el código va al campo de Patrimonio) | `src/pages/Admin.tsx:483-486` |
| Escanear con el cursor en el buscador reemplaza el código, no lo concatena | `useEntradaPistola` — `src/pages/Admin.tsx:490` |

### Reglas que el video enseña

| Regla | Dónde está escrita |
|---|---|
| Un equipo solo se presta si **el equipo Y su categoría** lo permiten | `esPrestableEfectivo` — `src/utils/equipoFicha.ts:49-52` |
| Apagar una categoría apaga todos sus equipos **sin reescribirlos** | comentario en `src/utils/equipoFicha.ts:44-48` |
| Marcar a alguien administrador **con el PIN vacío le pone el PIN de fábrica** | `createProfesor` — `src/hooks/useInventory.ts:672` · `updateProfesor` — `:692` |
| El admin precargado es el código `223992647` | `src/hooks/useInventory.ts:466` |
| Ese código entra **siempre** con el PIN de fábrica, aunque se cambie el guardado | cláusula `OR` en `src/hooks/useInventory.ts:774-777` |

---

## 2. Correcciones al plan de la serie

Cuatro puntos del plan no coinciden con la app. El guion usa la versión correcta:

1. **"Cambiar el PIN del admin precargado (obligatorio)" da a entender que con eso queda cerrado. No queda.** El código `223992647` con el PIN de fábrica sigue entrando aunque se cambie el PIN guardado — hay una cláusula `OR` explícita en la consulta de autenticación (`useInventory.ts:774-777`). Es un acceso de emergencia, no un descuido, pero el video no puede decir "cámbialo y listo".
2. **Falta la trampa del PIN vacío.** Marcar "Hacer administrador" y dejar el campo del PIN en blanco **no deja al usuario sin PIN: le asigna el de fábrica** (`useInventory.ts:672` y `:692`). Es el error más fácil de cometer en toda esta pantalla y el plan no lo menciona.
3. **No se llama "a granel" en la interfaz.** Los botones dicen **"Equipo único"** ("Se presta uno por uno") y **"Por cantidad"** ("Cables, controles, stock") (`EquipoFormDialog.tsx:247-253`).
4. **Falta el alta múltiple.** En "Equipo único" hay un campo **"¿Cuántas unidades?"** que crea N registros separados y los numera a partir del código que escribas (`EquipoFormDialog.tsx:282-302`). Es un tercer caso que el plan reduce a dos.

---

## 3. Advertencia de alcance — quién puede ver este video

Este video muestra la pantalla de PINes. **Recomendación: no menciones el acceso de
emergencia en cámara.** El video 1 lo ve todo el personal, y si estos se distribuyen juntos,
un código de acceso permanente termina en manos de cualquiera.

Lo que sí debe decir el video: *"si dejas el PIN vacío, la app le pone uno por omisión —
escríbelo siempre"*. Eso protege sin revelar nada.

El acceso de emergencia se le pasa a la persona administradora **por separado**, fuera del
video. Si la escuela decide que no lo quiere, se quita del código: es la cláusula `OR` de
`useInventory.ts:774-777`.

---

## 4. Guion escena por escena

Los tiempos son los **reales del render**, medidos sobre la narración sintetizada.

Formato: `⏱ tiempo · TÍTULO` → **Pantalla** (qué se ve) / **Voz** (narración literal) /
**Nota de producción**.

### ⏱ 0:00 – 0:08 · Portada

- **Pantalla:** logo P15. Título: **"Configuración inicial"**. Subtítulo: *Video 2 de 6 · Admin*.
- **Voz:** «Antes de que nadie pida un solo equipo, hay que dejar la app lista. Se hace una vez, y se hace desde aquí.»
- **Nota:** misma retícula y halo que el video 1. La serie tiene que verse como una serie.

### ⏱ 0:08 – 0:19 · Entrar a Admin

- **Pantalla:** pantalla "Acceso Admin P15". Se teclea el código y el PIN, se entra. Aparece la barra lateral con sus seis pestañas; se resaltan **Profesores**, **Categorías** y **Configuración**.
- **Voz:** «Entra con tu código de profesor y tu PIN de administrador. Aquí adentro hay seis secciones; para dejar la app lista solo necesitas tres.»
- **Nota:** el PIN se teclea como puntos, nunca legible. Usa un código ficticio.

### ⏱ 0:19 – 0:30 · Dar de alta a un profesor

- **Pantalla:** pestaña **Profesores** → "Directorio de Profesores". Se llena `Código` y `Nombre completo`, se pulsa **Agregar**. La fila aparece en la tabla con el rol **Profesor**.
- **Voz:** «En Profesores das de alta a quien va a usar el kiosko. Su código UDG y su nombre; nada más. Ese código es el que va a escribir en la terminal.»
- **Nota:** enlaza con el video 1 — este es el código que el profesor teclea allá.

### ⏱ 0:30 – 0:47 · Hacer administrador, y la trampa del PIN

- **Pantalla:** se marca **"Hacer administrador"** y aparece el campo `PIN de administrador`. Primero se muestra el error: guardar con el campo VACÍO. La fila queda como Administrador. Un cartel rojo señala: *"sin PIN propio → queda con el PIN de fábrica"*. Se vuelve a editar y ahora sí se escribe un PIN.
- **Voz:** «Si además va a administrar, marca la casilla y aparece el campo del PIN. Y aquí va la advertencia más importante de este video: si dejas ese campo vacío, la app no lo deja sin PIN. Le pone el de fábrica. Escríbelo siempre.»
- **Nota:** el beat más importante del video. Enséñalo como error primero y corrección después: se recuerda mejor lo que se vio fallar.

### ⏱ 0:47 – 1:00 · El administrador que ya viene puesto

- **Pantalla:** la tabla filtrada muestra la fila del admin precargado. Se pulsa editar y se escribe un PIN nuevo.
- **Voz:** «La app viene con una cuenta de administrador ya creada, para que puedas entrar la primera vez. Cámbiale el PIN hoy mismo, antes de usarla con la escuela.»
- **Nota:** **no** muestres el código ni el PIN de fábrica en pantalla. Difumina la celda del código. Ver § 3.

### ⏱ 1:00 – 1:08 · Crear categorías

- **Pantalla:** pestaña **Categorías**. Se escribe `Nombre de la categoría` y se agrega. Se ven tres o cuatro ya creadas en la tabla, con su columna **Artículos**.
- **Voz:** «En Categorías organizas el equipo: proyectores, laptops, cables. Un nombre y listo.»
- **Nota:** ritmo rápido. Es la parte fácil y el video no debe demorarse.

### ⏱ 1:08 – 1:27 · Prestable o solo inventario

- **Pantalla:** el toggle **"Prestable en kiosko"** cambia entre *Visible para profesores* (Activo, verde) y *Solo inventario* (Oculto, gris). Corte al kiosko: la categoría desaparece del catálogo del profesor. Regresa y se vuelve a encender.
- **Voz:** «Cada categoría decide si se presta o si solo se inventaría. En "Solo inventario" el equipo sigue existiendo, sigue contándose, pero desaparece del catálogo del profesor. Es un interruptor por categoría, y apaga todos sus equipos de golpe.»
- **Nota:** el concepto que más confunde. El corte al kiosko es obligatorio: mostrar la consecuencia, no describirla. Prepara el video 3, donde todo lo importado entra apagado.

### ⏱ 1:27 – 1:49 · Único, por cantidad, o varios de golpe

- **Pantalla:** el formulario de equipo, sección **"Cómo se cuenta"**. Tres estados: (1) **Equipo único**; (2) **Por cantidad** con su `Cantidad total`; (3) de nuevo Equipo único con **"¿Cuántas unidades?"** en 5, mostrando la vista previa "Se crearán: …".
- **Voz:** «Un equipo se cuenta de dos maneras. "Equipo único" para lo que se presta uno por uno, con su número de inventario. "Por cantidad" para cables y controles, donde solo importa cuántos quedan. Y si tienes cinco laptops iguales, no las captures una por una: pon cuántas unidades y la app las crea numeradas.»
- **Nota:** tres estados en dieciocho segundos. La vista previa "Se crearán" es lo que vende el tercero.

### ⏱ 1:49 – 2:02 · Dar de alta con la pistola

- **Pantalla:** pestaña **Inventario**, sin ningún campo enfocado. Se dispara la pistola a una etiqueta: si el equipo existe, se abre su ficha; si no, se abre el alta con el ID de Patrimonio ya escrito.
- **Voz:** «Y en Inventario no necesitas buscar nada: apunta la pistola a la etiqueta. Si el equipo ya está, te abre su ficha. Si no está, te abre el alta con el número ya puesto.»
- **Nota:** los dos resultados en un solo plano. Es el gesto que más tiempo ahorra al capturar.

### ⏱ 2:02 – 2:16 · Ajustar el kiosko

- **Pantalla:** pestaña **Configuración** → bloque **Kiosko**, con sus dos casillas. Se desmarca *Mostrar catálogo para préstamos* y corta al kiosko: el panel derecho ya no está.
- **Voz:** «Por último, en Configuración decides qué ve el profesor en la terminal: el catálogo, sus pendientes, o solo lo que necesites. Se apaga y se enciende cuando quieras.»
- **Nota:** otra vez consecuencia visible. La app y el kiosko lado a lado.

### ⏱ 2:16 – 2:20 · Cierre

- **Pantalla:** logo P15 y la línea *"Se configura una vez. Se usa todos los días."*
- **Voz:** —
- **Nota:** sin voz, como el cierre del video 1.

---

## 5. Datos de demo necesarios

Base de demostración (nunca la de producción):

- **Dos profesores ficticios**, uno de ellos el que se da de alta en cámara.
- **Un administrador ficticio** distinto del precargado, para la escena del PIN.
- **La fila del admin precargado presente pero con el código difuminado** en el video.
- **Cuatro o cinco categorías**, al menos una apagada como "Solo inventario".
- **Equipo en esa categoría apagada**, para que el corte al kiosko muestre la ausencia.
- **Un equipo con `id_patrimonial`** y **una etiqueta cuyo código no exista**, para las dos ramas del escaneo.

## 6. Fuera de alcance de este video

- Importar el Excel de Patrimonio → Video 3.
- Préstamo Rápido y el historial de alumnos → Video 4.
- Toma física → Video 5.
- Respaldos, Drive y dos computadoras → Video 6.
- El acceso de emergencia: **fuera de cámara a propósito** (§ 3).

---

## 7. Cómo se construyó

El proyecto HyperFrames vive en **este mismo directorio**. Comandos, desde `videos/02-configuracion/`:

| Qué | Comando |
|---|---|
| Ver en el navegador | `npm run dev` |
| Validar | `npx hyperframes lint && npx hyperframes check` |
| Fotos de control | `npx hyperframes snapshot --at 4,14,25,40,45,54,64,80,100,116,131,138` |
| Volver a renderizar | `npm run render` |

Comparte todo el método del video 1 — ver [`../01-kiosko/GUION.md`](../01-kiosko/GUION.md) § 6 para
el detalle. Lo específico de este video:

1. **El parche de subtítulos hay que reaplicarlo.** `compositions/captions.html` deja el último
   subtítulo pegado hasta el final del video, y eso ensucia el cierre mudo. Se cambió
   `var end = isLast ? DURATION : …` por `Math.min(DURATION, group.end + 0.3)`. **Se pierde si se
   vuelve a correr `captions.mjs build`.**
2. **Nada de `marginTop` ni `padding` animados.** `hyperframes lint` los rechaza: son propiedades
   de layout que saltan a píxel entero y tiemblan bajo el render cuadro a cuadro. Los campos de
   PIN que se despliegan animan solo `height`; el margen se fija con `tl.set`.
3. **Los `data-layout-allow-overlap` son deliberados**: el catálogo desenfocado detrás de la
   etiqueta (frame 9) y el formulario bajo el cartel de advertencia (frame 4) se tapan a
   propósito.
4. **La duración salió en 2:20 contra 2:15 estimados** — 4% de error, contra el 42% del video 1.
   El factor de corrección aplicado al planear funcionó.
