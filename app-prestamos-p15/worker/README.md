# Worker de "Reportar problema"

Recibe los reportes de la app y abre un issue en `Leoglez10/app-prestamos-p15`.
Los usuarios de la app no necesitan cuenta de GitHub: el token vive solo acá.

## Desplegar

```bash
npx wrangler login
npx wrangler deploy
npx wrangler secret put GITHUB_TOKEN
```

## El token

Tiene que ser un **fine-grained personal access token**, no uno clásico:

- Repositorio: solo `Leoglez10/app-prestamos-p15`.
- Permisos: únicamente `Issues: Read and write`.

Con ese alcance, lo peor que puede pasar si se filtra es que alguien abra issues
de spam. No da acceso al código, a los releases ni a ningún otro repositorio.

## Después de desplegar

`wrangler deploy` imprime la URL `*.workers.dev`. Hay que pegarla —con `/report`
al final— en la constante `FEEDBACK_URL` de `src-tauri/src/feedback.rs`.
Ya está puesta: `https://prestamos-p15-feedback.leoeligr10.workers.dev/report`.
