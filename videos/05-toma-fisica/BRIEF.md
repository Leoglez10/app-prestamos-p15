---
workflow: faceless-explainer
flow: automation
storyboard: no
message: "La toma física permite saber qué hay, dónde está y qué falta de verdad, con evidencia firmada para Patrimonio"
destination: embed
aspect: 1920x1080
language: es-MX
audience: "La persona administradora del inventario de la Preparatoria 15"
length: 189s
angle: how-to-process
style_preset: blue-professional
voice: "William Shanks (HeyGen starfish · 001248bb63f847888d37b766ee8b3a47)"
---

## Intent

Video 5 de una serie de 6 para capacitar al personal de la Preparatoria 15 en la app
de préstamos P15. Enseña a la persona administradora a recorrer un área con la pistola,
resolver movimientos y etiquetas desconocidas, decidir lo que no apareció y exportar
el reporte para Patrimonio sin ayuda.

El tono es instructivo, tranquilo y preciso; nunca promocional. La narración usa español
neutro de México aunque algunos rótulos literales de la app estén escritos con voseo.

## Assets

- `public/logo-p15.png` — logo local de la Preparatoria 15 para portada y cierre.
- `assets/fonts/space-grotesk.woff2` — tipografía de display de la serie.
- `assets/fonts/inter.woff2` — tipografía de lectura de la serie.

## Customizations

- **VO_MODE: verbatim.** La narración de `GUION.md` se conserva palabra por palabra.
- **Secuencia fija.** Se respeta el orden de las 15 escenas fuente. Para producir los 16
  cuadros solicitados, la escena "Un código que nadie reclama" se divide en dos cuadros
  consecutivos: ligar un equipo existente y dar de alta uno nuevo. Sus dos oraciones de
  voz siguen intactas y en el mismo orden.
- **UI sintética.** Todas las pantallas se recrean en HTML; no se captura la app ni se usa
  una base de producción.
- **Audio funcional.** El tono agudo de 880 Hz significa lectura reconocida y el grave de
  320 Hz significa advertencia. Ambos se entregan como archivos locales distintos.

## Notes

- `GUION.md` es la fuente autoritativa y no debe modificarse.
- Los rótulos de UI deben coincidir con el guion; la narración mantiene español neutro de México.
- Usar únicamente datos ficticios: 120 equipos, Aula 12, Proyector Epson, código admin de demo y PIN oculto.
- Mantener el sistema visual de `videos/01-kiosko`: preset `blue-professional`, 1920×1080,
  Space Grotesk + Inter, superficies azul profesional sin sombras y subtítulos de la serie.
