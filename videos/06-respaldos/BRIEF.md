---
workflow: faceless-explainer
flow: automation
storyboard: no
message: "El archivo .db reemplaza toda la base; el CSV de toma física fusiona solo el recorrido"
destination: embed
aspect: 1920x1080
language: es
audience: "Persona administradora de la Preparatoria 15 — sin perfil técnico"
length: 170s
angle: how-to
voice: "001248bb63f847888d37b766ee8b3a47"
style_preset: blue-professional
---

## Intent

Video 6 de 6 de la serie de capacitación de la app de préstamos P15. Enseña cómo
crear, sincronizar y restaurar respaldos, y cómo traer a la computadora principal
el recorrido hecho en una segunda computadora sin borrar los préstamos del día.

El tono es instructivo, tranquilo y preventivo. El video debe dejar grabada una
sola regla: **`.db` reemplaza; `.csv` fusiona**.

## Assets

- `public/logo-p15.png` — logo local de la Preparatoria 15 para portada y cierre.
- `assets/fonts/space-grotesk.woff2` — tipografía display de la serie.
- `assets/fonts/inter.woff2` — tipografía de interfaz y cuerpo de la serie.

## Customizations

- **VO_MODE: verbatim.** La narración literal viene de `GUION.md`; no se reescribe.
- **Estructura fija.** Las 12 escenas y el orden didáctico de `GUION.md` se conservan.
- **Ancla visual repetida.** La tarjeta doble `.db` REEMPLAZA en rojo / `.csv`
  FUSIONA en verde aparece en las escenas 2, 9 y 11 con la misma geometría.
- **UI simulada.** Las pantallas se reconstruyen en HTML; no hay captura de una base real.

## Notes

- No afirmar que `reportes` ya está espejada en Google Drive. La escena enseña cómo
  agregar `backups` y `reportes` por separado.
- No confundir el panel `Traer la toma física de otra computadora` con el panel
  `Importar Excel de Patrimonio`; ambos títulos deben verse juntos antes del merge.
- La vista previa usa las etiquetas reales: `aparecieron`, `no aparecieron`,
  `ya estaban al día` y `sin recorrer`.
- Rutas, folios y equipos mostrados son ficticios. Nunca usar datos de producción.
