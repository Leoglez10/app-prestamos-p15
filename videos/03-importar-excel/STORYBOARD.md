---
format: 1920x1080
duration: 126.778s
message: "Importa el Excel de Patrimonio de forma segura y decide qué equipos se prestan."
arc: Archivo → Vista previa → Respaldo → Regla → Dos interruptores → Restaurar
audience: Persona administradora del inventario de la Preparatoria 15
mode: autonomous
music: calm
---

## Video direction
UI de administración recreada con tarjetas, tablas y controles de alto contraste. Fondo claro profesional, azul #2563eb para acciones, ámbar para actualizaciones y gris para inventario. El cursor ilustrado causa clicks, cambios de estado y escenas; se usa una corriente visual hacia la izquierda y cortes duros, nunca crossfades. La banda inferior queda reservada para subtítulos. Cada escena revela información durante la narración; el cierre queda sin narración ni subtítulos.

## Frames

## Frame 1 — Portada

- scene: Portada
- duration: 6.891s
- poster: 4s
- transition_in: cut
- status: animated
- blueprint: cursor-ui-demo (Adapt)
- focal: Interfaz reconstruida para Portada
- roles: UI administrativa = foreground · fondo azul profesional = background · cursor dibujado = supporting
- sfx: soft-riser
- voiceover: "Patrimonio te manda el listado oficial en Excel. Vamos a meterlo a la app sin romper nada de lo que ya tienes."
- src: compositions/frames/01-scene.html

## Frame 2 — Qué es este archivo

- scene: Qué es este archivo
- duration: 14.443s
- poster: 4s
- transition_in: cut
- status: animated
- blueprint: cursor-ui-demo (Adapt)
- focal: Interfaz reconstruida para Qué es este archivo
- roles: UI administrativa = foreground · fondo azul profesional = background · cursor dibujado = supporting
- sfx: whoosh-soft
- voiceover: "Es el listado que entrega la Coordinación de Patrimonio: miles de renglones, uno por cada bien de la escuela. De todas sus columnas, la app necesita dos: el Id y el Clasificador. Las busca por nombre, así que no importa en qué orden vengan."
- src: compositions/frames/02-scene.html

## Frame 3 — Dónde está el panel

- scene: Dónde está el panel
- duration: 6.059s
- poster: 4s
- transition_in: cut
- status: animated
- blueprint: cursor-ui-demo (Adapt)
- focal: Interfaz reconstruida para Dónde está el panel
- roles: UI administrativa = foreground · fondo azul profesional = background · cursor dibujado = supporting
- sfx: click-soft
- voiceover: "El panel vive hasta abajo de la pestaña Inventario, en Administrador. Ahí, y en ningún otro lado."
- src: compositions/frames/03-scene.html

## Frame 4 — Elegir el archivo y leer el plan

- scene: Elegir el archivo y leer el plan
- duration: 10.155s
- poster: 4s
- transition_in: cut
- status: animated
- blueprint: cursor-ui-demo (Adapt)
- focal: Interfaz reconstruida para Elegir el archivo y leer el plan
- roles: UI administrativa = foreground · fondo azul profesional = background · cursor dibujado = supporting
- sfx: click-soft, pop-soft
- voiceover: "Eliges el archivo y la app te dice qué va a pasar antes de hacerlo: cuántos entran nuevos, cuántos se actualizan y cuántos ya estaban igual. Todavía no se guardó nada."
- src: compositions/frames/04-scene.html

## Frame 5 — Los avisos

- scene: Los avisos
- duration: 12.587s
- poster: 4s
- transition_in: cut
- status: animated
- blueprint: cursor-ui-demo (Adapt)
- focal: Interfaz reconstruida para Los avisos
- roles: UI administrativa = foreground · fondo azul profesional = background · cursor dibujado = supporting
- sfx: click-soft
- voiceover: "Si algo del archivo viene raro —un Id repetido, una fecha que no se entiende, un renglón sin tipo de equipo— aparece aquí en vez de entrar callado a la base. Léelos: no son errores de la app, son cosas del archivo."
- src: compositions/frames/05-scene.html

## Frame 6 — Aplicar

- scene: Aplicar
- duration: 10.091s
- poster: 4s
- transition_in: cut
- status: animated
- blueprint: cursor-ui-demo (Adapt)
- focal: Interfaz reconstruida para Aplicar
- roles: UI administrativa = foreground · fondo azul profesional = background · cursor dibujado = supporting
- sfx: click-soft, chime-soft
- voiceover: "Al aplicar, lo primero que hace la app es guardar un respaldo completo. Después escribe todo de un solo golpe: o entra completo, o no entra nada. Nunca a medias."
- src: compositions/frames/06-scene.html

## Frame 7 — La regla que hay que entender

- scene: La regla que hay que entender
- duration: 18.027s
- poster: 4s
- transition_in: cut
- status: animated
- blueprint: cursor-ui-demo (Adapt)
- focal: Interfaz reconstruida para La regla que hay que entender
- roles: UI administrativa = foreground · fondo azul profesional = background · cursor dibujado = supporting
- sfx: whoosh-soft
- voiceover: "Y aquí viene lo importante. Todo lo que entra por el Excel queda como “solo inventario”: está registrado, pero nadie lo puede pedir. Es a propósito. En ese listado hay ventiladores, escritorios y pizarrones; ninguno se presta. Patrimonio organiza el inventario, pero la escuela decide qué circula."
- src: compositions/frames/07-scene.html

## Frame 8 — Encender lo que sí se presta

- scene: Encender lo que sí se presta
- duration: 16.789s
- poster: 4s
- transition_in: cut
- status: animated
- blueprint: cursor-ui-demo (Adapt)
- focal: Interfaz reconstruida para Encender lo que sí se presta
- roles: UI administrativa = foreground · fondo azul profesional = background · cursor dibujado = supporting
- sfx: click-soft, click-soft, chime-soft
- voiceover: "Para que algo se pueda pedir hacen falta dos interruptores, no uno: el de la categoría y el del equipo. Si prendes solo la categoría, el kiosko sigue vacío, y esa es la confusión más común. Enciende únicamente lo que de verdad se presta: son unas decenas de aparatos, no miles."
- src: compositions/frames/08-scene.html

## Frame 9 — Volver a importar no borra tu trabajo

- scene: Volver a importar no borra tu trabajo
- duration: 14.784s
- poster: 4s
- transition_in: cut
- status: animated
- blueprint: cursor-ui-demo (Adapt)
- focal: Interfaz reconstruida para Volver a importar no borra tu trabajo
- roles: UI administrativa = foreground · fondo azul profesional = background · cursor dibujado = supporting
- sfx: chime-soft
- voiceover: "El mes que viene te mandan el archivo actualizado y lo vuelves a importar sin miedo: actualiza marca, modelo y número de serie, pero nunca toca la ubicación, la categoría ni lo que ya marcaste como prestable. Eso lo pusiste tú, y se queda."
- src: compositions/frames/09-scene.html

## Frame 10 — Deshacer

- scene: Deshacer
- duration: 13.952s
- poster: 4s
- transition_in: cut
- status: animated
- blueprint: cursor-ui-demo (Adapt)
- focal: Interfaz reconstruida para Deshacer
- roles: UI administrativa = foreground · fondo azul profesional = background · cursor dibujado = supporting
- sfx: click-soft, whoosh-soft
- voiceover: "¿Y si algo salió mal? En Configuración, en la lista de respaldos, busca el que dice “Manual” con la hora de la importación y pulsa Restaurar. Vuelve todo a como estaba. Ojo: también se pierde lo que se haya registrado después de esa hora."
- src: compositions/frames/10-scene.html

## Frame 11 — Cierre

- scene: Cierre
- duration: 3s
- poster: 4s
- transition_in: cut
- status: animated
- blueprint: cursor-ui-demo (Adapt)
- focal: Interfaz reconstruida para Cierre
- roles: UI administrativa = foreground · fondo azul profesional = background · cursor dibujado = supporting
- sfx: soft-outro
- voiceover: ""
- src: compositions/frames/11-cierre.html
