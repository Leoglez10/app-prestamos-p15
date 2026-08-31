# 🎬 Videos tutoriales — serie para la escuela

Serie corta de videos de capacitación para el personal de la Preparatoria 15: profesores que usan el kiosko y el/la administrador(a) que maneja inventario. La meta es **pocos videos que cubran TODO el uso real de la app**, sin repetir contenido.

- 📄 Plan de producción: este documento
- 📚 Documentación escrita: [README.md](README.md)
- 🎞 Herramienta de producción: HyperFrames (video desde HTML)

> ⏱ **Cómo leer las duraciones.** El video 1 se planeó a 78 s leyendo el guion y salió en
> **1:51** — un 42% más. La voz que enseña va más lenta que la lectura en la cabeza. Las
> duraciones de los videos pendientes ya traen ese factor aplicado, pero siguen siendo
> estimaciones: la real se mide después de sintetizar la narración, y es la que manda
> (`audio.mjs sync-durations` reescribe las duraciones de cada escena).

## Quick path (orden sugerido para ver)

1. **Kiosko: prestar y devolver** — lo que más se usa día a día
2. **Configuración inicial** — dejar la app lista la primera vez
3. **Importar Excel de Patrimonio** — cargar el inventario oficial sin romper nada
4. **Préstamos de alumnos** — el flujo "Préstamo Rápido"
5. **Toma física** — cuadrar el estante contra la app
6. **No perder datos: respaldos y dos computadoras** — el video que evita el desastre

## Resumen de la serie

| # | Video | Duración | Estado |
|---|---|---|---|
| 1 | [Kiosko: prestar y devolver](videos/01-kiosko/GUION.md) | 1:51 | ✅ Renderizado |
| 2 | [Configuración inicial](videos/02-configuracion/GUION.md) | 2:20 | ✅ Renderizado |
| 3 | [Importar Excel de Patrimonio](videos/03-importar-excel/GUION.md) | 2:07 | ✅ Renderizado |
| 4 | [Préstamos de alumnos (Préstamo Rápido)](videos/04-prestamo-rapido/GUION.md) | ~2:20 | 📝 Guion listo |
| 5 | [Toma física](videos/05-toma-fisica/GUION.md) | ~3:09 | 📝 Guion listo |
| 6 | [No perder datos: respaldos y dos computadoras](videos/06-respaldos/GUION.md) | ~2:50 | 📝 Guion listo |

> 📌 **Por qué son seis y no cinco.** El plan original juntaba toma física y respaldos en un
> solo video de ~90 s. Desde entonces entraron los respaldos en Drive, el relevo por USB y la
> **fusión de la toma física hecha en otra computadora** (v0.6.0). Todo junto pasaba de los
> 4 minutos — eso ya no es capacitación, es una clase, y nadie la termina. Se partió en dos.

---

## Video 1 — Kiosko: prestar y devolver (1:51)

📄 **Guion de producción:** [videos/01-kiosko/GUION.md](videos/01-kiosko/GUION.md) — escena por escena, con el mapa de dónde vive cada pantalla en el código.
🎬 **Video:** `videos/01-kiosko/renders/video.mp4` — proyecto HyperFrames completo en esa carpeta.

**Qué incluye:**

- Entrar a "Soy Profesor" desde la pantalla de inicio y escribir el código UDG
- Catálogo: lista lateral de categorías, búsqueda por nombre/marca/modelo/ID patrimonial (al escribir se busca en TODO el inventario, no solo en la categoría activa)
- Escanear código de barras: el match exacto gana sobre el filtro de texto
- Agregar al carrito; equipos a granel muestran cuántos hay disponibles
- Prestar una laptop → la app pregunta "¿Tambien necesita HDMI?" y, si aceptas, elige uno disponible por ti
- "Agregar observacion" (opcional, dentro del carrito) → "Confirmar y Llevar"
- Modal de éxito con cierre de sesión automático a los 3 segundos (terminal compartida)
- Devolver: préstamo por préstamo, o "Devolver todo" (solo aparece con 2 o más) con su modal de confirmación

**Qué resuelve:** es el video de uso diario. Todo profesor debería poder pedir y devolver equipo sin ayuda después de verlo.

## Video 2 — Configuración inicial (2:20)

📄 **Guion de producción:** [videos/02-configuracion/GUION.md](videos/02-configuracion/GUION.md) — escena por escena, con el mapa de dónde vive cada pantalla en el código.

> 🔒 **No es para todo el personal.** Muestra la pantalla de PINes; se distribuye solo a quien administra. Ver § 3 del guion.

**Qué incluye:**

- Admin → pestaña **Profesores**: dar de alta profesores con su código UDG, marcar quién es admin y definir su PIN
- Cambiar el PIN del admin precargado (obligatorio) — y la trampa: **marcar administrador con el PIN vacío le asigna el PIN de fábrica** (`useInventory.ts:672`)
- Admin → pestaña **Categorías**: crear categorías y entender el toggle **Prestable / Solo inventario**
- Cómo se cuenta un equipo: **"Equipo único"** (1 laptop = 1 registro), **"Por cantidad"** (10 adaptadores en 1 fila) y el alta múltiple ("¿Cuántas unidades?", crea N registros numerados)
- Configuración → ajustes del kiosko: mostrar u ocultar catálogo y préstamos pendientes
- Admin ▸ **Inventario**: dar de alta equipo escaneando su etiqueta, sin tocar el teclado (la pestaña escucha la pistola aunque no haya campo de escaneo)

**Qué resuelve:** la escuela arranca sola, sin depender del desarrollador para dejar todo andando.

> 🔐 **Decisión pendiente antes de grabar:** existe un acceso de emergencia **permanente** — el código `223992647` con el PIN de fábrica entra siempre, aunque se cambie el PIN guardado (`useInventory.ts:774-777`). **La recomendación es NO mostrarlo en el video** y pasárselo a la persona administradora por separado: un video de capacitación lo ve todo el personal.

## Video 3 — Importar Excel de Patrimonio (2:07)

📄 **Guion de producción:** [videos/03-importar-excel/GUION.md](videos/03-importar-excel/GUION.md) · 🎬 **Video:** [renders/video.mp4](videos/03-importar-excel/renders/video.mp4) — 2:07, 1920×1080, 30 fps.

**Qué incluye:**

- Dónde está: Admin ▸ Inventario ▸ panel de importación (abajo)
- Elegir el `.xlsx` oficial y revisar el **plan previo**: nuevos / actualizados / sin cambio / nuevas categorías / avisos
- Aplicar: la app crea un **respaldo automático antes de tocar nada**
- Regla clave: **todo lo importado entra como "solo inventario"** — nunca prestable automáticamente
- Después de importar: **hacen falta los dos interruptores**, el de la categoría y el del equipo (`esPrestableEfectivo` exige ambos). Prender solo la categoría deja el kiosko vacío
- Cómo deshacer una importación: restaurar el respaldo desde Configuración — en la tabla sale como **"Manual"**, no como "Automático"

**Qué resuelve:** el error #1 en producción: importar el Excel y que "nadie pueda pedir nada". El video explica el comportamiento a propósito de la app (el Excel organiza, la escuela decide qué se presta).

## Video 4 — Préstamos de alumnos: Préstamo Rápido (~2:20)

📄 **Guion de producción:** [videos/04-prestamo-rapido/GUION.md](videos/04-prestamo-rapido/GUION.md) — escena por escena, con el mapa de dónde vive cada pantalla en el código.

**Qué incluye:**

- Entrar a "Préstamo Rápido" desde el inicio (acceso con solo código de admin, sin PIN)
- La sesión **no se cierra sola**: a diferencia del kiosko, persiste hasta que alguien pulse "Cerrar sesión"
- Toggle **Alumno / Profesor**: renombra los campos en vivo y se guarda con el registro
- Autocompletado de la persona con dos fuentes: **Directorio** (profesores) y **Ya prestó antes** (historial)
- **El objeto sale del catálogo del inventario** — y eso marca el equipo como prestado de verdad
- Varios objetos en un mismo préstamo: chips, y cada uno se devuelve por separado
- **Texto libre** para lo que no está en el inventario: se guarda, pero no descuenta nada
- Auditoría automática: queda registrado qué admin autorizó, sin escribirlo y sin poder cambiarlo
- Historial: buscador y chips **En préstamo / Más de 1 día / Devueltos / Todos** con contador
- Qué significa **"Más de 1 día"**: activo por más de 24 horas exactas
- Devolver (libera el equipo en el inventario) y el borrado bloqueado mientras siga prestado

**Qué resuelve:** el préstamo de mostrador a quien no tiene código de profesor, sin que el inventario quede descuadrado.

> 🔄 **Ya no son dos sistemas paralelos, y ese es el mensaje del video.** El plan original decía que
> el Préstamo Rápido llevaba un historial aparte del kiosko. Eso dejó de ser cierto: elegir el objeto
> del catálogo inserta también la fila en `prestamos` y marca el equipo como prestado
> (`createPrestamoRapidoDesdeInventario`, `useInventory.ts:1615`); devolver desde aquí cierra el
> préstamo real y libera el equipo (`:1715`). Lo único que sigue fuera del inventario es el **texto libre**.
> El video tiene que dejar esa frontera clarísima: *lo del catálogo cuenta, lo escrito a mano no.*

> ❌ **No hay exportación a PDF en esta pantalla.** El plan lo listaba y es falso: los dos diseñadores
> de PDF viven en Admin (`Admin.tsx:760` inventario, `:1333` reportes) y el de reportes trabaja sobre
> los préstamos del **kiosko**, no sobre estos.

## Video 5 — Toma física (~3:09)

📄 **Guion de producción:** [videos/05-toma-fisica/GUION.md](videos/05-toma-fisica/GUION.md) — escena por escena, con el mapa de dónde vive cada pantalla en el código y **seis correcciones** a lo que sigue abajo.

**Qué incluye:**

- Para qué sirve la toma física: cuadrar lo que hay en el estante contra lo que dice la app
- Admin → **Toma de inventario**: "Iniciar campaña nueva" (reinicia el conteo a pendiente, con **una** confirmación) y luego elegir el área — una sola vez por recorrido, no equipo por equipo
- **Modo prueba**: ensayar el bucle de escaneo sin escribir en la base. Solo el bucle: ligar etiquetas y las altas quedan apagadas
- El bucle de escaneo: sonidos y tarjetas de nuevo / movido / repetido, marcar automáticamente revisado + ubicación
- **El foco**: si el campo de escaneo lo pierde, la pistola dispara al vacío. La app avisa, y Admin esconde su barra lateral por esa misma razón
- Deshacer el último escaneo (ventana de 2 a 3 segundos); vincular un código desconocido a un equipo existente
- **Alta al vuelo**: dar de alta un equipo huérfano sin salir del recorrido (alta corta, o "Editarlo completo" con el formulario entero)
- Columna "Deberían estar aquí": saber cuándo terminar el área
- Cerrar el área: la app pregunta por lo que no apareció ahí mismo, antes de irse
- **"No localizado" ≠ "nadie lo buscó"**: la diferencia que hace que el reporte sirva — tres estados en el CSV, no dos
- Progreso y exportación del reporte (CSV para Patrimonio; la carpeta se abre sola)

**Qué resuelve:** precisión del inventario. Al terminar, la escuela sabe qué tiene, dónde está, y qué falta de verdad.

## Video 6 — No perder datos: respaldos y dos computadoras (~2:50)

📄 **Guion de producción:** [videos/06-respaldos/GUION.md](videos/06-respaldos/GUION.md) — escena por escena, con el mapa de dónde vive cada pantalla en el código.

**Qué incluye:**

- Los tres tipos de respaldo y cuándo entra cada uno
- **Respaldo automático** (viene activado): frecuencia configurable, conserva los últimos 20, corre mientras la app está abierta
- **Respaldos en Google Drive** con el correo de la escuela: qué carpeta se sincroniza y cómo comprobar que subió
- Crear un respaldo a mano antes de cualquier cosa arriesgada
- Restaurar: botón **Restaurar por fila** en la tabla de respaldos, e importar un `.db` externo (USB)
- **Relevo por USB** para trabajar en dos computadoras
- **Traer la toma física de otra computadora**: Admin ▸ Inventario ▸ elegir el CSV, ver la vista previa, aplicar

**Qué resuelve:** que un error no cueste el inventario entero. Es el video que evita el desastre.

> ⚠️ **El concepto más difícil de toda la app, y el motivo de este video:** el **`.db` reemplaza**, el **CSV fusiona**. Devolver la base de la segunda computadora borra los préstamos que la principal registró mientras tanto. Lo que vuelve es el reporte CSV, y ese solo escribe `revisado`, `quién revisó`, `no localizado` y `ubicación` — columnas que los préstamos no tocan. Si el video no deja esto clarísimo, no sirve.

> 📎 Los equipos dados de **alta al vuelo** en la segunda computadora **no** se fusionan solos: salen listados aparte para darlos de alta a mano. El reporte no trae la categoría, y elegirla sería adivinar.

📚 Detalle escrito: [README.md](README.md) §"Respaldo y recuperación" y [docs/RELEVO_TOMA_FISICA.md](app-prestamos-p15/docs/RELEVO_TOMA_FISICA.md)

---

## Fuera de alcance (a propósito)

- **RedCelular** (acceso LAN desde celular) y **fotos de devolución**: siguen marcados como experimento en el código (`RedCelularPanel.tsx:2`, `Admin.tsx:33`). No se capacita sobre funciones experimentales — si dejan de serlo, entran al video 6.
- **Respaldo automatizado con Python** (`scripts/backup_sqlite.py`): es opcional y de perfil técnico. Vive en el README; no va a video.
- Flujos de desarrollador (compilar, CI, migraciones): viven en [docs/ENGINEERING_HANDBOOK.md](app-prestamos-p15/docs/ENGINEERING_HANDBOOK.md).

---

## Cobertura verificada contra el código

Última revisión: **2026-08-29**, contra `v0.6.0`. El plan original se escribió en la v0.4.0
(`e0825a8`) y se quedó atrás tres releases; esto es lo que se agregó al revisarlo:

| Función | Entró en | Ahora se cubre en |
|---|---|---|
| La pistola dispara sin el Enter final | v0.5.0 `e628d84` | Video 1 ✅ |
| El Inventario de Admin escucha la pistola | v0.5.0 `d0bcc77` | Video 2 |
| Alta al vuelo en la toma física | v0.5.0 `5d609eb` | Video 5 |
| Modo prueba de la toma física | `TomaFisicaPanel.tsx` | Video 5 |
| "No localizado" ≠ "nadie lo buscó" | `f2e44c7` | Video 5 |
| Respaldos en Google Drive | README §"Respaldos en Google Drive" | Video 6 |
| Relevo por USB entre dos PCs | v0.5.1 `bd51606` | Video 6 |
| **Fusión de la toma física de otra computadora** | v0.6.0 `36e1386` | Video 6 |
| Préstamo Rápido ligado al inventario real | `useInventory.ts:1615` | Video 4 ✅ |
| Varios objetos por préstamo + autocompletado de persona | `PrestamoRapido.tsx` | Video 4 ✅ |

**Antes de escribir cada guion, revisa el código, no este documento.** Al escribir el guion
del video 1 aparecieron cinco descripciones que ya no coincidían con la app. Un video que
enseña una app que no existe es peor que no tener video.
