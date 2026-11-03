# Saludos especiales después de actualizar

Una versión puede incluir un saludo opcional, además de sus notas de actualización.
El aviso aparece en Inicio después de cambiar de versión, sin bloquear la aplicación.
No aparece en una primera instalación ni vuelve a salir al abrir la misma versión.

## Preparar un saludo

En `src/updates/specialAnnouncements.ts`, agrega una entrada al objeto
`announcements` con la **versión exacta que se publicará**, sin la `v`:

```ts
"0.16.1": {
  title: "¡Actualización lista!",
  message: "¡Saludos al equipo de cómputo! :) Gracias por todo lo que hacen cada día.",
  signature: "Leo",
},
```

- `title` y `message` son texto normal, no HTML ni Markdown.
- `signature` es opcional.
- Si la versión no tiene entrada, se conserva el aviso normal con **Entendido**.
- Con saludo, **¡Gracias!** cierra el aviso completo; las novedades siguen visibles
  mientras esté abierto.
- El confeti y el saludo animado terminan en menos de dos segundos, no tienen sonido
  y se desactivan con la preferencia del sistema de reducir movimiento.

La entrada no publica una versión por sí sola. Debe viajar en el código del release
correspondiente. Si cambia el número previsto, cambia también la clave del saludo.
No es necesario tocar la base de datos, las notas remotas ni el instalador.

## Verificación local

```sh
node --test src/utils/specialAnnouncements.test.ts src/utils/updateHistory.test.ts
npm test
npm run build
```

Para una vista previa aislada, renderiza `UpdateAppliedCard` con un `VersionChange`
de ejemplo y un callback de cierre. Esto no necesita Tauri ni modifica el historial
real de actualizaciones. Comprueba también una versión sin saludo, el botón de
cierre y la preferencia de movimiento reducido.
