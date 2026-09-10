---
name: release
description: "Trigger: release, publicar version, sacar version, tag, bump, subir instalador. Publica App Prestamos P15: valida, testea, bumpea, tagea y verifica la CI."
license: Apache-2.0
metadata:
  author: "Leoglez10"
  version: "1.0"
---

# Release de App Prestamos P15

Un `git push` NO publica nada. Solo el tag `v*` dispara `.github/workflows/build-windows.yml`, que compila el instalador y crea el Release. Esta skill es el unico camino a un tag.

## Hard Rules

- Correr todo desde `app-prestamos-p15/` (el directorio anidado, donde viven `scripts/` y `src-tauri/`).
- NUNCA crear el tag a mano. Solo `bash scripts/publish-release.sh <X.Y.Z>`.
- El script exige arbol limpio y `HEAD == origin/main`. Commitear y pushear ANTES.
- No bumpear versiones a mano en `tauri.conf.json`, `package.json` ni `Cargo.toml`: el script los sincroniza.
- Si tests o build fallan, PARAR y reportar. No publicar.
- Los numeros de version de `README.md`, `CHANGELOG.md` y `docs/MANUAL_PERSONAL.md` los escribe `scripts/stamp-release-docs.sh` dentro de publish-release.sh. NUNCA editarlos a mano.
- Si la version cambia algo que el personal VE (pantalla, boton, flujo, funcion nueva), actualizar `README.md` y `docs/MANUAL_PERSONAL.md` ANTES de tagear: la CI genera el PDF del manual desde ese Markdown y lo adjunta al Release. Lenguaje simple, para profesores, sin jerga tecnica.
- Una entrada del CHANGELOG escrita a mano gana sobre la generada: el sellador detecta `## [X.Y.Z]` y no la toca.
- Confirmar el numero de version con la persona antes de tagear.

## Decision Gates

| Que entra en la version | Bump |
|---|---|
| Solo correcciones de bugs | patch (0.5.0 → 0.5.1) |
| Alguna funcionalidad nueva | minor (0.5.0 → 0.6.0) |
| Rompe datos, esquema o flujo existente | major |

Sin argumento del usuario, decidir leyendo `git log <ultimo-tag>..HEAD`.

## Execution Steps

1. `git status --short` y `git log --oneline origin/main..HEAD`. Si hay trabajo pendiente, invocar la skill `work-unit-commits` para partirlo en commits por unidad de trabajo, y pushear.
2. Docs: si entra algo que el personal ve, escribir el cambio en `README.md` y `docs/MANUAL_PERSONAL.md`, y la entrada del CHANGELOG si los bullets generados no se leerian bien. Commitear junto al trabajo funcional.
3. Verificar: `npx tsc --noEmit`, `npm test`, `npm run build`. Los tres tienen que pasar.
4. Leer la version actual: `jq -r '.version' src-tauri/tauri.conf.json`. Calcular la nueva con la tabla de arriba y confirmarla.
5. `bash scripts/publish-release.sh <X.Y.Z>`.
6. Verificar el tag EN EL REMOTO, no en local: `git ls-remote --tags origin | grep v<X.Y.Z>`.
7. `gh run list --limit 1` para el build (tarda ~8 min) y `gh release list --limit 1` para el Release publicado.

## Output Contract

Reportar: los commits que entraron, el resultado exacto de tsc/tests/build, la version vieja → nueva, el tag confirmado en el remoto, y el estado de la CI. Si el Release todavia no aparece porque la CI sigue corriendo, decirlo — no darlo por publicado.

## References

- `app-prestamos-p15/scripts/publish-release.sh` — bumpea, sincroniza, commitea, pushea y tagea.
- `app-prestamos-p15/scripts/stamp-release-docs.sh` — sella la version en README, CHANGELOG y manual.
- `app-prestamos-p15/scripts/test-publish-release.sh` — autocomprobacion de los dos scripts.
- `.github/workflows/build-windows.yml` — dispara en tags `v*`, publica el instalador firmado, el `latest.json` y el PDF del manual.
