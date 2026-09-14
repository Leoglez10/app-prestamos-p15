---
name: release
description: "Trigger: release, publicar version, sacar version, tag, bump, subir instalador. Publica App Prestamos P15: liga issues, commitea con novedades legibles, testea, bumpea, tagea, verifica tags, CI e issues cerrados."
license: Apache-2.0
metadata:
  author: "Leoglez10"
  version: "1.2"
---

# Release de App Prestamos P15

Un `git push` NO publica nada. Solo el tag `v*` dispara `.github/workflows/build-windows.yml`, que compila el instalador y crea el Release. Esta skill es el unico camino a un tag.

## Las novedades salen de los commits

El paso "Generate release notes" de la CI arma el cuerpo del Release con los **asuntos** (primera linea) de los commits `feat:` y `fix:` entre el tag anterior y el nuevo. Ese cuerpo viaja en `latest.json` y es lo que el personal lee en "Novedades de esta version" al actualizar la app (`UpdateNotice.tsx`, `UpdateApplied.tsx`).

- `feat: ...` → seccion **Novedades**. `fix: ...` → seccion **Correcciones**. La CI solo pone en mayuscula la primera letra.
- Cualquier otro tipo (`refactor`, `test`, `docs`, `ci`, `chore`, `build`, `release`) NO aparece. El cuerpo del commit tampoco.
- Sin ningun `feat`/`fix`, la app muestra el generico "Esta version trae mejoras internas y correcciones menores."

Por eso el asunto de un `feat`/`fix` es texto para profesores: español, sin jerga, dice lo que la persona VE o puede hacer. Ejemplo bueno: `feat(profesores): importar el directorio de profesores desde un Excel`. Malo: `feat: agrega leer_excel_profesores y planificador TS`.

## Hard Rules

- Correr todo desde `app-prestamos-p15/` (el directorio anidado, donde viven `scripts/` y `src-tauri/`). `gh` y `git` funcionan desde ahi igual.
- NUNCA crear el tag a mano. Solo `bash scripts/publish-release.sh <X.Y.Z>`.
- El script exige arbol limpio y `HEAD == origin/main`. Commitear y pushear ANTES.
- No bumpear versiones a mano en `tauri.conf.json`, `package.json` ni `Cargo.toml`: el script los sincroniza.
- Si tests o build fallan, PARAR y reportar. No publicar.
- Los numeros de version de `README.md`, `CHANGELOG.md` y `docs/MANUAL_PERSONAL.md` los escribe `scripts/stamp-release-docs.sh` dentro de publish-release.sh. NUNCA editarlos a mano.
- En CADA release se revisan `README.md` y `docs/MANUAL_PERSONAL.md` contra lo que entra, sin excepcion. Todo `feat`/`fix` que el personal ve tiene que quedar explicado en los dos ANTES de tagear: la CI genera el PDF del manual desde ese Markdown y lo adjunta al Release. Lenguaje simple, para profesores, sin jerga tecnica. Si un release no trae nada visible, decirlo en el reporte en vez de saltarse la revision.
- Una entrada del CHANGELOG escrita a mano gana sobre la generada: el sellador detecta `## [X.Y.Z]` y no la toca.
- Todo cambio que el personal ve va en un `feat`/`fix` con asunto legible. Lo interno va con otro tipo para no ensuciar las novedades.
- Un asunto `feat`/`fix` ya pusheado NO se reescribe (nada de rebase ni force-push a `main`). Si quedo mal, se escribe la entrada del CHANGELOG a mano y se avisa a la persona que las novedades de la app mostraran ese asunto.
- Confirmar con la persona, en UN solo mensaje, antes de tagear: la version nueva, la vista previa de las novedades y los issues que se van a cerrar.

## Decision Gates

| Que entra en la version | Bump |
|---|---|
| Solo correcciones de bugs | patch (0.5.0 → 0.5.1) |
| Alguna funcionalidad nueva | minor (0.5.0 → 0.6.0) |
| Rompe datos, esquema o flujo existente | major |

Sin argumento del usuario, decidir leyendo `git log <ultimo-tag>..HEAD`.

| El trabajo corresponde a un issue abierto | Accion |
|---|---|
| Si, lo resuelve completo | `Closes #N` en el cuerpo del commit que lo resuelve |
| Si, pero solo en parte | `Refs #N` en el cuerpo; el issue queda abierto |
| Dudoso (el titulo no empata claro) | Preguntar a la persona antes de ligarlo |
| No | Nada |

## Execution Steps

1. **Issues primero.** `gh issue list --state open --limit 50 --json number,title,labels,body`. Comparar contra el trabajo pendiente (`git status --short`, `git diff`) y lo ya commiteado sin publicar (`git log --oneline "$(git describe --tags --abbrev=0)"..HEAD`). Anotar que issues resuelve cada unidad de trabajo, con la tabla de arriba.
2. **Commits.** Si hay trabajo sin commitear, invocar la skill `work-unit-commits` para partirlo en commits por unidad de trabajo. En cada uno:
   - Asunto con las reglas de "Las novedades salen de los commits".
   - `Closes #N` / `Refs #N` en el cuerpo, en su propia linea.
   - Revisar que el commit contenga TODOS los archivos de esa unidad: `git show --stat HEAD` contra `git status --short`. Un archivo olvidado (componente nuevo sin agregar, test, script en `package.json`) sale como novedad anunciada que no funciona, o rompe el build de la CI.
3. **Docs (siempre).** Para cada `feat`/`fix` del rango (los del paso 5 mas los que vas a commitear):
   - Buscar si ya esta explicado: `rg -n -i "<palabra clave>" ../README.md docs/MANUAL_PERSONAL.md` (el README vive en la raiz; el manual, dentro del directorio de la app).
   - Si falta, escribirlo en los dos: en el manual, en la seccion de esa pantalla, con pasos que siga un profesor; en el README, en la lista de funciones.
   - La entrada del CHANGELOG solo si los bullets generados no se leerian bien.
   - Commitear los docs JUNTO al `feat`/`fix` que explican; si ese commit ya se pusheo, en uno aparte `docs: ...` (no ensucia las novedades). Armar una tabla `cambio → seccion del README → seccion del manual` para el reporte; ninguna celda vacia salvo cambios invisibles para el personal.
4. **Verificar.** `npx tsc --noEmit`, `npm test`, `npm run build`. Los tres tienen que pasar. Arbol limpio despues: `git status --short` vacio.
5. **Vista previa de las novedades**, con la misma regla que la CI:
   ```bash
   git log --no-merges --format=%s "$(git describe --tags --abbrev=0)"..HEAD \
     | rg '^(feat|fix)(\([^)]*\))?!?:\s*'
   ```
   Si sale vacio pero entro algo visible, o algun asunto tiene jerga, corregirlo ANTES de pushear (commit local: `git commit --amend` o rebase local sobre commits no pusheados).
6. **Push.** `git push origin main`. Confirmar `git rev-parse HEAD` == `git rev-parse origin/main`.
7. **Version.** `jq -r '.version' src-tauri/tauri.conf.json`. Calcular la nueva con la tabla y confirmarla junto con la vista previa y los issues (ver Hard Rules).
8. **Publicar.** `bash scripts/publish-release.sh <X.Y.Z>`.
9. **Verificar tags.**
   - En el remoto: `git ls-remote --tags origin "refs/tags/v<X.Y.Z>*"` tiene que listarlo.
   - Que apunte al commit correcto: `git fetch --tags origin` y luego `git rev-parse "v<X.Y.Z>^{commit}"` == `git rev-parse origin/main`.
   - Que el tag anterior sea el esperado (de ahi sale el rango de novedades): `git describe --tags --abbrev=0 "v<X.Y.Z>^"`.
10. **CI y Release.** `gh run list --limit 1` para el build (~8 min; esperar con Monitor, no con sleep). Al terminar: `gh release view v<X.Y.Z> --json isDraft,isPrerelease,body,assets`. El `body` tiene que coincidir con la vista previa del paso 5 y los assets incluir el instalador, `latest.json` y el PDF del manual. Verificar que el PDF publicado trae lo nuevo, no solo que exista:
   ```bash
   dir=$(mktemp -d) && gh release download v<X.Y.Z> -p '*.pdf' -D "$dir" \
     && pdftotext "$dir"/*.pdf - | rg -i -c "<palabra clave de cada cambio>"
   ```
   (`pdftotext` viene de `brew install poppler`.) Cero coincidencias = el manual del Release no incluye el cambio: reportarlo como falla.
11. **Issues cerrados.** Para cada `#N` ligado con `Closes`: `gh issue view N --json state`. GitHub lo cierra solo al llegar el commit a `main`. Si sigue abierto: `gh issue close N --comment "Incluido en v<X.Y.Z>."`. Si ya estaba cerrado, comentar igual la version: `gh issue comment N --body "Incluido en v<X.Y.Z>."`.

## Output Contract

Reportar: issues ligados y su estado final, los commits que entraron, la tabla cambio → README → manual, la vista previa de novedades vs el `body` real del Release, si el PDF publicado contiene cada cambio, el resultado exacto de tsc/tests/build, la version vieja → nueva, el tag confirmado en el remoto y el commit al que apunta, y el estado de la CI. Si el Release todavia no aparece porque la CI sigue corriendo, decirlo — no darlo por publicado ni cerrar issues a mano antes de tiempo.

## References

- `app-prestamos-p15/scripts/publish-release.sh` — bumpea, sincroniza, commitea, pushea y tagea.
- `app-prestamos-p15/scripts/stamp-release-docs.sh` — sella la version en README, CHANGELOG y manual (misma agrupacion feat/fix que la CI).
- `app-prestamos-p15/scripts/test-publish-release.sh` — autocomprobacion de los dos scripts.
- `.github/workflows/build-windows.yml` — dispara en tags `v*`; el paso "Generate release notes" arma el cuerpo desde los asuntos feat/fix; publica el instalador firmado, el `latest.json` y el PDF del manual.
- `app-prestamos-p15/src/components/UpdateNotice.tsx`, `UpdateApplied.tsx` — donde el personal ve esas novedades.
