---
workflow: faceless-explainer
flow: automation
storyboard: no
message: "Del catálogo cuenta. A mano, no."
destination: embed
aspect: 1920x1080
language: es
audience: "La persona administradora y el personal del área de cómputo de la Preparatoria 15"
length: "La duración real de la narración; el estimado de 140s no es un límite"
angle: how-to
voice: "HeyGen starfish 001248bb63f847888d37b766ee8b3a47"
actual_voice: "Kokoro am_michael (fallback local de previsualización; HeyGen bloqueado por HTTP 402 de cuota TTS)"
style_preset: blue-professional
---

## Intent

Video 4 de 6 para capacitar al personal autorizado de la Preparatoria 15 en el flujo
de Préstamo Rápido: entrar, registrar a una persona, elegir objetos, encontrar el
registro y devolverlo sin descuadrar el inventario. El tono es instructivo, tranquilo
y sobrio; se mantiene la identidad visual establecida por el Video 1.

## Assets

- `public/logo-p15.png` — logo exacto de P15 para portada y cierre.
- `assets/fonts/space-grotesk.woff2` — tipografía local de display y chrome.
- `assets/fonts/inter.woff2` — tipografía local de cuerpo.
- `assets/bgm/track.mp3` — cama musical calmada de la serie, reutilizada localmente.

## Customizations

- **VO_MODE: verbatim.** La narración hablada de `GUION.md` se conserva completa; solo
  se normaliza la puntuación defectuosa de apertura en la escena 5 y se elimina el
  marcado Markdown que no se pronuncia.
- **Estructura fija.** Las 11 escenas de `GUION.md` se construyen completas, incluidas
  portada y cierre mudo. La duración real de la voz manda sobre el estimado antiguo.
- **UI reconstruida.** No hay capturas ni fetches de red en tiempo de render. Todas las
  pantallas se reconstruyen como HTML determinista dentro de un único shell administrativo.

## Notes

- La frase central es: “Del catálogo cuenta. A mano, no.”
- Los datos son ficticios: admin `María López` / `9001001`, alumno `Diego Ramírez` /
  `219876543`, y equipos de demostración sin relación con personas o inventario reales.
- La copia visible respeta los rótulos del guion y del mapa de código de Video 4.
- El 17% inferior queda reservado para subtítulos. El contenido principal termina por
  encima de `y=896px`; solo fondos full-bleed pueden ocupar toda la altura.
- No se renderiza el MP4 final hasta recibir aprobación del Studio preview.
