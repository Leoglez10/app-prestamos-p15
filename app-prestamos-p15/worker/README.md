# Worker de "Reportar problema"

Recibe los reportes de la app y abre un issue en `Leoglez10/app-prestamos-p15`.
Los usuarios de la app no necesitan cuenta de GitHub: el token vive solo acá.

- Worker desplegado: `prestamos-p15-feedback`
- URL de producción: `https://prestamos-p15-feedback.leoeligr10.workers.dev/report`

---

## Desplegar

**Siempre desde esta carpeta (`worker/`), nunca desde la raíz del repositorio.**

```bash
cd worker
npx wrangler login
npx wrangler deploy
npx wrangler secret put GITHUB_TOKEN    # el valor se pega en el prompt interactivo
```

> ⚠️ **Correr `wrangler deploy` en la raíz del repositorio hace otra cosa por completo.**
> Wrangler 4.x no falla cuando no encuentra `wrangler.toml`: detecta el proyecto Vite y
> **publica el frontend de la aplicación** en un Worker nuevo con un nombre distinto.
> Pasó una vez. Si ocurre, hay que borrar ese Worker (`npx wrangler delete --name <nombre>`)
> y revertir con `git checkout --` los cambios que Wrangler mete en `vite.config.ts`,
> `package.json` y `.gitignore`.

### La forma correcta de cargar el secreto

`wrangler secret put` toma el **nombre** del secreto como argumento; el **valor** se escribe
después, en el prompt interactivo, que no lo imprime ni lo guarda en disco.

```bash
npx wrangler secret put GITHUB_TOKEN    # correcto
```

Nunca pases el token como argumento:

```bash
npx wrangler secret put <el-token>      # MAL: queda en texto plano en los logs
```

Wrangler escribe un log por invocación en `~/Library/Preferences/.wrangler/logs/` (macOS) y
ese log **incluye los argumentos de la línea de comandos**. Cualquier credencial pasada por
argumento termina escrita ahí.

---

## El token

Tiene que ser un **fine-grained personal access token**, no uno clásico:

- Repositorio: solo `Leoglez10/app-prestamos-p15`.
- Permisos: únicamente `Issues: Read and write`.
- **Vencimiento: ponle una fecha.** No lo crees "sin expiración".

Con ese alcance, lo peor que puede pasar si se filtra es que alguien abra issues de spam.
No da acceso al código, a los releases ni a ningún otro repositorio.

### Rotar el token

Cada vez que venza, o ante cualquier sospecha de filtración:

1. GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens**.
2. Revoca el token viejo. Antes de generar el nuevo, verifica que nada más lo esté usando.
3. Crea el nuevo con el mismo alcance (un repositorio, `Issues: Read and write`, con vencimiento).
4. Cárgalo en el Worker:

   ```bash
   cd worker
   npx wrangler secret put GITHUB_TOKEN
   ```

5. Verifica que el token viejo ya no sirva y que el nuevo sí, con una prueba que **no**
   ensucie el repositorio (ver abajo).

Los secretos de Cloudflare se reemplazan sobrescribiendo el mismo nombre: no hay que borrar nada.

---

## Límite de peticiones

El Worker limita a **5 reportes por minuto por IP**, con el binding nativo
`RATE_LIMITER` de `wrangler.toml` (no hace falta KV ni ningún recurso extra).

Dos cosas que conviene saber:

- El limitador corre **antes** de validar el cuerpo, así que incluso las peticiones
  inválidas consumen cuota.
- El laboratorio sale a Internet por **una sola IP pública** (NAT), así que ese límite es
  compartido entre todas las máquinas de la escuela, no por computadora.
- **Justo después de un `wrangler deploy` el limitador tarda unos segundos en empezar a
  contar.** En esa ventana las peticiones pasan aunque superen el límite. Si estás
  verificando y ves `400` donde esperabas `429`, espera unos segundos y vuelve a probar:
  no está roto.

---

## Verificar el Worker sin ensuciar el repositorio

Estas pruebas se pueden correr en cualquier momento y **no crean issues**:

```bash
# Debe responder 404 {"error":"No encontrado"}
curl -s -o /dev/null -w "%{http_code}\n" \
  https://prestamos-p15-feedback.leoeligr10.workers.dev/

# Debe responder 400 {"error":"Tipo inválido"} — consume cuota, pero no llega a GitHub
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"tipo":"invalido","titulo":"x","descripcion":"y"}' \
  -w "\n%{http_code}\n" \
  https://prestamos-p15-feedback.leoeligr10.workers.dev/report
```

Enviar payloads inválidos es la forma de probar el límite de peticiones y la validación sin
generar ruido en el tracker: como el limitador corre antes de validar, consumen cuota pero
nunca llegan a la API de GitHub.

Para probar el camino completo **sí** hace falta un POST válido, y eso abre un issue de
verdad: conviene escribir en el título que es una prueba, y cerrarlo después.

---

## Cambiar la URL del Worker

Si el Worker se vuelve a desplegar con otro nombre de subdominio, `wrangler deploy` imprime
la URL nueva. Hay que pegarla —con `/report` al final— en la constante `FEEDBACK_URL` de
`src-tauri/src/feedback.rs` y **publicar una versión nueva**: la URL viaja dentro del binario.

Estado actual:

```rust
const FEEDBACK_URL: &str = "https://prestamos-p15-feedback.leoeligr10.workers.dev/report";
```

---

## Un límite conocido y aceptado

La URL del Worker viaja dentro del binario de la aplicación, así que cualquiera que desempaquete
el instalador puede encontrarla y hacer POST directamente. El límite por IP lo mitiga; no lo
elimina. Si alguna vez se vuelve un problema real, el siguiente paso es un secreto compartido o
firmar las peticiones.
