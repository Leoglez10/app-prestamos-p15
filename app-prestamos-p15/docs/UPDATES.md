# Actualizaciones de la aplicación

La aplicación busca nuevas versiones al abrirse y cada **6 horas** mientras sigue abierta. Por ahora se distribuyen actualizaciones **solo para Windows x64**, en compilaciones de producción. macOS, Linux y otras arquitecturas muestran que no están disponibles; el navegador no ejecuta llamadas nativas del actualizador.

## Para el personal

1. Si aparece una versión nueva, revisa el aviso al inicio de la pantalla. Las notas se muestran como texto, sin ejecutar HTML.
2. Elige **Más tarde** para ocultar esa versión durante la sesión. **Administración → Configuración → Actualizaciones → Buscar actualizaciones** permite volver a verla.
3. Antes de **Actualizar ahora…**, guarda tu trabajo y termina los préstamos o formularios abiertos. La confirmación final advierte que la aplicación se cerrará.

Buscar no descarga ni instala. Solo la confirmación inicia la descarga y la instalación. Windows cierra la aplicación para ejecutar el instalador en modo pasivo; no permite cancelar desde su interfaz. No se solicita reinicio automático de la aplicación al terminar: vuelve a abrirla. Si la instalación retorna sin cerrar la app, el aviso ofrece un reinicio explícito con nueva confirmación; un error de reinicio nunca vuelve a instalar.

Sin Internet, una búsqueda automática falla sin interrumpir el trabajo; se vuelve a intentar en la próxima búsqueda programada. La búsqueda manual muestra el error y permite reintentar. Una descarga o verificación fallida requiere otra confirmación para reintentar. El progreso puede no conocer el tamaño total.

El actualizador no cierra formularios por su cuenta ni modifica la base de datos o sus migraciones. Tampoco crea un respaldo como parte de la actualización: usa el procedimiento de respaldo habitual cuando corresponda. No reemplaza las medidas de recuperación de datos.

## Firma y builds locales

La clave pública está en `src-tauri/tauri.conf.json`. La firma criptográfica del actualizador **no es Authenticode**: Windows puede seguir mostrando advertencias de editor desconocido o SmartScreen.

Conserva una copia segura, fuera del repositorio, de los archivos de `~/.tauri/app-prestamos-p15/`:

- `updater.key`: clave privada de firma.
- `updater.password`: contraseña de esa clave.

No los pegues en código, chats, logs ni archivos `.env`. Perder la clave impide firmar futuras actualizaciones aceptadas por las instalaciones existentes. No la regeneres para una nueva versión.

Para un build firmado **desde Windows x64**, prepara las variables solamente en la sesión de terminal, mediante el mecanismo seguro del equipo:

| Variable | Valor que debe proporcionar el responsable |
| --- | --- |
| `TAURI_SIGNING_PRIVATE_KEY` | Ruta absoluta al archivo privado, o su contenido inyectado de forma segura |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Contraseña correspondiente, sin imprimirla |

Con Node 24, dependencias instaladas y Rust preparado, ejecuta desde el directorio de la aplicación:

```sh
npm test
npm run tauri -- build --target x86_64-pc-windows-msvc
```

El comando de Tauri ejecuta también el chequeo TypeScript y el build de Vite. `createUpdaterArtifacts: true` genera instaladores y sus archivos `.sig`. No omitas la verificación de firmas, no uses HTTP ni fuerces downgrades. Las compilaciones de desarrollo no consultan el canal de actualizaciones.

## Publicación mediante CI

El workflow `.github/workflows/build-windows.yml` mantiene únicamente Windows x64. Usa Node 24, `npm ci`, tests frontend con lint y tests Rust antes de construir. Verifica que estén configurados los secrets de GitHub **`TAURI_SIGNING_PRIVATE_KEY`** y **`TAURI_SIGNING_PRIVATE_KEY_PASSWORD`**, sin imprimirlos. En CI la variable de clave debe contener la clave privada, no una ruta de otra computadora.

`tauri-apps/tauri-action@v0` recibe esos secrets, sube instaladores y `.sig`, y genera/sube `latest.json` con `includeUpdaterJson: true`. `updaterJsonPreferNsis: true` selecciona NSIS cuando también existe MSI. Se conserva el job que adjunta el manual. Las releases siguen siendo públicas, no borradores: un tag o una ejecución manual del workflow es una acción de publicación, no una prueba inocua.

El canal configurado es:

```text
https://github.com/Leoglez10/app-prestamos-p15/releases/latest/download/latest.json
```

Una release anterior sin `latest.json` puede hacer fallar la búsqueda hasta publicar el primer conjunto completo. Los assets pueden tardar en estar todos disponibles durante la publicación; vuelve a intentar una vez finalizada. Antes de distribuir, verifica que el manifiesto tenga `windows-x86_64`, URL HTTPS, versión y firma correspondientes al instalador publicado.

## Primera instalación y prueba obligatoria en Windows

Las instalaciones anteriores a esta integración necesitan **una instalación manual inicial** del instalador firmado que incluya el actualizador. Luego solo se ofrece una versión semántica **estrictamente mayor**; reconstruir la misma versión no alcanza. Mantén alineadas las versiones de `package.json`, Cargo y la configuración Tauri al preparar una release futura.

Antes de habilitar la distribución al personal, prueba dos builds firmados A y B (B > A), con la misma clave, en Windows x64 y un canal de prueba HTTPS aislado de las releases de producción:

- [ ] Instala A manualmente; ofrece B con su manifiesto y firma. Confirma búsqueda inicial, manual y programada, sin descarga previa al consentimiento.
- [ ] Deja B para después, comprueba que no reaparezca automáticamente y recupérala mediante búsqueda manual. Cancela la confirmación y comprueba que los formularios permanezcan abiertos.
- [ ] Con trabajo guardado, confirma B: verifica progreso, cierre de la aplicación, instalador pasivo y apertura manual de B. Comprueba los datos mediante el procedimiento de validación habitual.
- [ ] En el canal aislado, prueba desconexión, descarga interrumpida y firma inválida: deben fallar sin aceptar el paquete alterado. Recupera el paquete válido y vuelve a intentar.
- [ ] B no debe ofrecer A ni otra copia de B. Si se ofrece el reinicio de respaldo y falla, solo debe reintentar reiniciar, nunca reinstalar.

Los tests unitarios simulan el controlador; no prueban firmas criptográficas reales, WebView2, UAC, SmartScreen ni el instalador Windows. Un build/check de Rust en macOS tampoco sustituye esta prueba. Esta integración no ejecutó builds firmados, instalaciones ni publicaciones.

Referencias: [Updater Tauri v2](https://v2.tauri.app/plugin/updater/) · [Opciones oficiales de tauri-action v0](https://github.com/tauri-apps/tauri-action/blob/v0/action.yml).
