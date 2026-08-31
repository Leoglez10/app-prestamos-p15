---
workflow: faceless-explainer
flow: automation
storyboard: no
message: "La escuela deja la app lista sola, y sin dejar un PIN de fábrica puesto"
destination: embed
aspect: 1920x1080
language: es
audience: "La persona que administra la app en la Preparatoria 15 — no todo el personal"
length: 135s
angle: how-to
---

## Intent

Video 2 de una serie de 6 para capacitar al personal de la Preparatoria 15 en la app de
préstamos P15. Cubre la puesta a punto: profesores, administradores y su PIN, categorías,
cómo se cuenta un equipo, y los ajustes del kiosko.

Tono instructivo tranquilo, igual que el video 1. La diferencia es el público: este lo ve
quien administra, no todo el personal.

## Assets

- ../01-kiosko/public/logo-p15.png — logo de la Preparatoria 15, para portada y cierre.

## Customizations

- **VO_MODE: verbatim.** La narración literal está en `GUION.md`, escena por escena.
- **Continuidad con el video 1.** Mismo preset (`blue-professional`), misma retícula de fondo,
  mismo cursor dibujado, mismo cierre. La serie tiene que verse como una serie.
- **UI reconstruida en HTML**, no capturada. El tema ES la interfaz.

## Notes

- **El beat más importante es la trampa del PIN vacío** (escena 0:34–0:52): marcar
  "Hacer administrador" con el campo del PIN en blanco le asigna el PIN de fábrica
  (`useInventory.ts:672` y `:692`). Se enseña como error primero y corrección después.
- **El acceso de emergencia NO va en cámara.** El código del admin precargado se muestra
  difuminado. Decisión registrada en `GUION.md` § 3.
- Rótulos en pantalla copiados LITERAL de la app. Aquí casi todos llevan acento correcto
  (`Admin.tsx` sí los usa), a diferencia de los modales del kiosko.
- Datos ficticios siempre. Ningún código, nombre ni PIN real del personal.
- El guion de producción vive en `GUION.md`, en este mismo directorio.
