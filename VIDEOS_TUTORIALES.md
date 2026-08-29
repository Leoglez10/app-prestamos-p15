# 🎬 Videos tutoriales — serie para la escuela

Serie corta de videos de capacitación para el personal de la Preparatoria 15: profesores que usan el kiosko y el/la administrador(a) que maneja inventario. La meta es **pocos videos que cubran TODO el uso real de la app**, sin repetir contenido.

- 📄 Plan de producción: este documento
- 📚 Documentación escrita: [README.md](README.md)
- 🎞 Herramienta de producción: HyperFrames (video desde HTML)

## Quick path (orden sugerido para ver)

1. **Kiosko: prestar y devolver** — lo que más se usa día a día
2. **Configuración inicial** — dejar la app lista la primera vez
3. **Importar Excel de Patrimonio** — cargar el inventario oficial sin romper nada
4. **Préstamos de alumnos** — el flujo "Préstamo Rápido"
5. **Inventario sano: toma física + respaldos** — precisión y seguridad de datos

## Resumen de la serie

| # | Video | Duración | Estado |
|---|---|---|---|
| 1 | [Kiosko: prestar y devolver](videos/01-kiosko/GUION.md) | ~78 s | 🟡 Guion listo |
| 2 | Configuración inicial | ~90 s | ⬜ Pendiente |
| 3 | Importar Excel de Patrimonio | ~90 s | ⬜ Pendiente |
| 4 | Préstamos de alumnos (Préstamo Rápido) | ~75 s | ⬜ Pendiente |
| 5 | Inventario sano: toma física + respaldos | ~90 s | ⬜ Pendiente |

---

## Video 1 — Kiosko: prestar y devolver (~78 s)

📄 **Guion de producción:** [videos/01-kiosko/GUION.md](videos/01-kiosko/GUION.md) — escena por escena, con el mapa de dónde vive cada pantalla en el código.

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

## Video 2 — Configuración inicial (~90 s)

**Qué incluye:**

- Admin → pestaña **Profesores**: dar de alta profesores con su código UDG, marcar quién es admin y definir su PIN
- Cambiar el PIN del admin precargado de fábrica (obligatorio)
- Admin → pestaña **Categorías**: crear categorías y entender el toggle **Prestable / Solo inventario**
- Diferencia entre equipo único (1 laptop = 1 registro) y a granel (10 adaptadores en 1 fila)
- Configuración → ajustes del kiosko: mostrar u ocultar catálogo y préstamos pendientes

**Qué resuelve:** la escuela arranca sola, sin depender del desarrollador para dejar todo andando.

## Video 3 — Importar Excel de Patrimonio (~90 s)

**Qué incluye:**

- Dónde está: Admin ▸ Inventario ▸ panel de importación (abajo)
- Elegir el `.xlsx` oficial y revisar el **plan previo**: nuevos / actualizados / sin cambio / nuevas categorías / avisos
- Aplicar: la app crea un **respaldo automático antes de tocar nada**
- Regla clave: **todo lo importado entra como "solo inventario"** — nunca prestable automáticamente
- Después de importar: activar préstamo en Categorías (toggle por categoría) o por equipo individual
- Cómo deshacer una importación: restaurar el respaldo desde Configuración

**Qué resuelve:** el error #1 en producción: importar el Excel y que "nadie pueda pedir nada". El video explica el comportamiento a propósito de la app (el Excel organiza, la escuela decide qué se presta).

## Video 4 — Préstamos de alumnos: Préstamo Rápido (~75 s)

**Qué incluye:**

- Entrar a "Préstamo Rápido" desde el inicio (acceso con solo código de admin, sin PIN)
- Registrar préstamo: tipo (alumno/profesor), nombre/código, equipo (del inventario o texto libre), notas
- Auditoría automática: queda registrado qué admin autorizó
- Historial: búsqueda, filtros (activo / vencido / devuelto)
- Qué significa **"vencido"**: activo por más de 24 horas
- Marcar como devuelto o eliminar un registro
- Exportar el historial a PDF

**Qué resuelve:** aclara la trampa de nombre — "Préstamo Rápido" NO es el kiosko; son dos sistemas paralelos con historiales separados. También documenta el criterio de vencimiento.

## Video 5 — Inventario sano: toma física + respaldos (~90 s)

**Qué incluye:**

- Para qué sirve la toma física: cuadrar lo que hay en el estante contra lo que dice la app
- Admin → **Toma de inventario**: elegir área → "Iniciar campaña nueva" (reinicia todo a pendiente, con doble confirmación)
- El bucle de escaneo: sonidos/tarjetas de nuevo / movido / repetido, marcar automáticamente revisado + ubicación
- Deshacer último escaneo; vincular un código desconocido a un equipo existente
- Columna "Deberían estar aquí": saber cuándo terminar el área
- Progreso y exportación del reporte
- Respaldos: crear respaldo manual, respaldo **automático configurable** (frecuencia, conserva los últimos 20)
- Restaurar: botón **Restaurar por fila** en la tabla de respaldos, e importar un `.db` externo (USB)

**Qué resuelve:** precisión del inventario y no perder datos. Cierra con la regla de oro: siempre hay respaldo antes de tocar la base.

---

## Fuera de alcance (a propósito)

- **RedCelular** (acceso LAN desde celular) y **fotos de devolución**: marcados como experimento en la app; no se capacita sobre funciones experimentales.
- Flujos de desarrollador (compilar, CI, migraciones): viven en [docs/ENGINEERING_HANDBOOK.md](app-prestamos-p15/docs/ENGINEERING_HANDBOOK.md).
