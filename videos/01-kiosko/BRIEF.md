---
workflow: faceless-explainer
flow: automation
storyboard: no
message: "Un profesor puede pedir y devolver equipo en el kiosko sin ayuda de nadie"
destination: embed
aspect: 1920x1080
language: es
audience: "Profesores de la Preparatoria 15 — usuarios finales, sin perfil técnico"
length: 111s
angle: how-to
---

## Intent

Video 1 de una serie de 5 para capacitar al personal de la Preparatoria 15 en la app
de préstamos P15 (Tauri + React, offline, corre en una terminal compartida). Este
cubre el uso diario: pedir equipo en el kiosko y devolverlo.

El tono es instructivo tranquilo, no promocional. La meta es que un profesor lo vea
una vez y ya no necesite ayuda. La app es real y está en producción en la escuela.

## Assets

- ../../app-prestamos-p15/img/logo-p15.png — logo de la Preparatoria 15, para portada y cierre.

## Customizations

- **VO_MODE: verbatim.** El guion en `GUION.md` trae la narración literal escena por
  escena. Se usa tal cual; no se reescribe.
- **Estructura fija.** Las 10 escenas y sus tiempos ya están definidos en `GUION.md`.
  No se reordenan ni se inventan beats nuevos.
- **UI simulada.** No hay captura de pantalla ni sitio web. Cada pantalla de la app se
  recrea en HTML: es lo que hace que esto sea un faceless explainer y no un screencast.

## Notes

- **Fidelidad a la app por encima de todo.** `GUION.md` § 1 trae el mapa
  `archivo:línea` de cada pantalla. Los textos en pantalla deben coincidir LITERALMENTE
  con los de la app, acentos incluidos — la app tiene varios rótulos sin tilde
  ("¿Tambien necesita HDMI?", "Agregar observacion", "Prestamo creado con exito") y así
  deben aparecer, porque el profesor los va a leer así en la terminal.
- **Datos ficticios siempre.** Código de profesor `2958101` (el del placeholder de la
  app). Nunca códigos, nombres ni equipo real del personal.
- La cuenta regresiva del modal de éxito dura 3 s exactos (`SUCCESS_AUTO_LOGOUT_SECONDS`).
  La animación debe respetarlo: es un dato que el profesor va a verificar contra la app.
- El guion de producción vive en `GUION.md`, en este mismo directorio, y está enlazado
  desde `../../VIDEOS_TUTORIALES.md`.
- Faltan los videos 2 a 5 de la serie; este define el estilo visual de todos.
