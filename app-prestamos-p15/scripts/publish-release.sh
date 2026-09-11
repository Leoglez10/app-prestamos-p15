#!/usr/bin/env bash
# Publica un release de "App Prestamos P15" en GitHub via tag v<version>.
#
# Uso:
#   bash scripts/publish-release.sh                 # tag con la version actual de tauri.conf.json
#   bash scripts/publish-release.sh 0.1.2           # bump a 0.1.2 + commit + push + tag
#   bash scripts/publish-release.sh 0.1.2 --no-sync # bump solo tauri.conf.json (no toca package.json ni Cargo.toml)
#
# Que hace:
#   1. Lee la version de src-tauri/tauri.conf.json.
#   2. Si se pasa una nueva version, la escribe en tauri.conf.json y (por defecto)
#      la sincroniza en package.json y src-tauri/Cargo.toml.
#   3. Verifica working tree limpio y HEAD pusheado a origin/main.
#   4. Sella la version en los docs de cara al usuario (README, CHANGELOG y manual)
#      con scripts/stamp-release-docs.sh, para que el PDF del manual que arma la CI
#      desde el tag ya sea el de esta version.
#   5. Commitea "release: vX.Y.Z" (solo si hubo bump).
#   6. Crea el tag v<version> y lo pushea. La CI (.github/workflows/build-windows.yml)
#      se dispara en tags v* y publica el Release con el instalador .exe/.msi.
#
# Requisitos:
#   - git, jq
#   - origin configurado
# -E (errtrace): sin esto el trap ERR no se hereda dentro de las funciones y un
# fallo en write_version saldria sin revertir el bump.
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONF="$ROOT/src-tauri/tauri.conf.json"
PKG="$ROOT/package.json"
CARGO="$ROOT/src-tauri/Cargo.toml"
LOCK="$ROOT/src-tauri/Cargo.lock"
# README y CHANGELOG viven en la raiz del repo, un nivel arriba del directorio de la app.
REPO="$(cd "$ROOT/.." && pwd)"
README="$REPO/README.md"
CHANGELOG="$REPO/CHANGELOG.md"
MANUAL="$ROOT/docs/MANUAL_PERSONAL.md"

# Estado de avance de la publicacion. El rollback lo necesita para no prometer una
# reversion que ya es imposible: una vez creado el commit, "devolver los archivos"
# no significa nada (ver rollback_versions).
PRE_SHA=""
TAG_NAME=""
COMMIT_DONE=0
COMMIT_PUSHED=0
TAG_CREATED=0

cd "$ROOT"

if ! command -v jq >/dev/null 2>&1; then
  echo "Falta jq. Instalalo: brew install jq (mac) o apt install jq (linux)." >&2
  exit 1
fi

current_version() {
  jq -r '.version' "$CONF"
}

# Escribe la version en un JSON preservando la indentacion y el modo del archivo.
# `cat` (en vez de `mv`) mantiene los permisos originales.
write_json_version() {
  local file="$1" v="$2"
  # jq siempre reindenta; --tab cuando el archivo original usa tabs.
  # Variable simple y no array: bash 3.2 (el de macOS) con `set -u` falla al
  # expandir un array vacio.
  local jq_flag=""
  if grep -q '^	' "$file"; then
    jq_flag="--tab"
  fi
  # jq tambien normaliza los saltos de linea a LF: si el archivo venia con CRLF
  # hay que restaurarlo, si no el diff marca el archivo entero como cambiado.
  local crlf=0
  if grep -q $'\r' "$file"; then
    crlf=1
  fi
  jq ${jq_flag:+"$jq_flag"} --arg v "$v" '.version = $v' "$file" > "$file.tmp"
  if [ "$crlf" = "1" ]; then
    awk '{ printf "%s\r\n", $0 }' "$file.tmp" > "$file.tmp2" && mv "$file.tmp2" "$file.tmp"
  fi
  cat "$file.tmp" > "$file" && rm -f "$file.tmp"
}

write_version() {
  local v="$1"
  write_json_version "$CONF" "$v"
  if [ -f "$PKG" ] && [ "${SYNC:-1}" = "1" ]; then
    write_json_version "$PKG" "$v"
  fi
  if [ -f "$CARGO" ] && [ "${SYNC:-1}" = "1" ]; then
    # Cargo.toml: solo la linea `version = "..."` de [package]. BSD sed no
    # soporta rangos `0,/re/`, asi que awk lo hace igual en mac y linux y no
    # toca las versiones de las dependencias.
    awk -v v="$v" '
      /^\[package\]/ { inpkg = 1 }
      inpkg && !done && /^version[[:space:]]*=/ {
        print "version = \"" v "\""
        done = 1
        next
      }
      { print }
    ' "$CARGO" > "$CARGO.tmp" && cat "$CARGO.tmp" > "$CARGO" && rm -f "$CARGO.tmp"

    # Cargo.lock guarda la version del propio crate. Si no se actualiza aca,
    # cargo la reescribe en la primera compilacion y deja el tree sucio, lo que
    # bloquea el siguiente release en ensure_clean. Solo el bloque cuyo `name`
    # coincide con el del [package]; las dependencias no se tocan.
    if [ -f "$LOCK" ]; then
      local pkg_name
      pkg_name="$(awk '/^\[package\]/ { inpkg = 1 }
        inpkg && /^name[[:space:]]*=/ { gsub(/^name[[:space:]]*=[[:space:]]*"|"[[:space:]]*$/, ""); print; exit }' "$CARGO")"
      if [ -n "$pkg_name" ]; then
        awk -v v="$v" -v pkg="$pkg_name" '
          $0 == "name = \"" pkg "\"" { found = 1 }
          found && !done && /^version[[:space:]]*=/ {
            print "version = \"" v "\""
            done = 1
            next
          }
          { print }
        ' "$LOCK" > "$LOCK.tmp" && cat "$LOCK.tmp" > "$LOCK" && rm -f "$LOCK.tmp"
      fi
    fi
  fi
}

ensure_clean() {
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "Working tree sucio. Commitea o stashea antes de publicar." >&2
    exit 1
  fi
}

ensure_pushed() {
  local head branch
  head="$(git rev-parse HEAD)"
  branch="$(git rev-parse --abbrev-ref HEAD)"
  if [ "$branch" != "main" ] && [ "$branch" != "master" ]; then
    echo "No estas en main/master (estas en $branch)." >&2
    exit 1
  fi
  if ! git rev-parse --verify "origin/$branch" >/dev/null 2>&1; then
    echo "origin/$branch no existe. Hugo git push primero." >&2
    exit 1
  fi
  if [ "$head" != "$(git rev-parse "origin/$branch")" ]; then
    echo "HEAD no coincide con origin/$branch. Corre: git push" >&2
    exit 1
  fi
}

# Deshace la publicacion si el script falla despues de tocar archivos.
#
# Que hace depende de hasta donde llego, porque las tres etapas finales son
# irreversibles de forma distinta:
#   - antes del commit  -> los archivos se pueden devolver a PRE_SHA
#   - commit sin pushear-> se puede deshacer el commit local y volver a PRE_SHA
#   - commit ya pusheado-> NO se revierte: el estado es correcto y solo falta el tag
# Sin esta distincion, un fallo al pushear el tag decia "versiones revertidas" sin
# revertir nada y empujaba a elegir una version mayor cuando solo faltaba el push.
rollback_versions() {
  local base="${PRE_SHA:-HEAD}"
  local tag="${TAG_NAME:-v?}"
  local f
  local msg="Fallo la publicacion."

  if [ "${TAG_CREATED:-0}" = "1" ]; then
    echo "$msg El commit y el tag $tag ya existen en local, pero el tag no llego al remoto." >&2
    echo "Completa la publicacion con: git push origin $tag" >&2
    echo "No vuelvas a correr el script: elegiria una version mayor sin necesidad." >&2
    return 0
  fi

  if [ "${COMMIT_PUSHED:-0}" = "1" ]; then
    echo "$msg El commit de release ya esta en origin y los archivos quedaron correctos." >&2
    echo "Falta solo el tag. Completa la publicacion con: git tag $tag && git push origin $tag" >&2
    return 0
  fi

  if [ "${COMMIT_DONE:-0}" = "1" ]; then
    git reset --hard "$base" >/dev/null 2>&1 || true
    echo "$msg Se deshizo el commit de release local y el arbol volvio a $base." >&2
    return 0
  fi

  for f in "$CONF" "$PKG" "$CARGO" "$LOCK" "$README" "$CHANGELOG" "$MANUAL"; do
    # `checkout <sha> --` y no `checkout --`: los docs ya pueden estar en el index
    # cuando algo falla, y restaurar desde el index devolveria el archivo sellado.
    [ -f "$f" ] && git checkout "$base" -- "$f" 2>/dev/null || true
  done
  echo "$msg Versiones revertidas al estado previo ($base)." >&2
}

# Sella la version en los docs de cara al usuario y los deja en el index. El commit
# de release los lleva junto a los archivos de version: asi el tag siempre apunta a
# un README, un CHANGELOG y un manual que hablan de la version que se publica.
stamp_docs() {
  local v="$1" f
  bash "$ROOT/scripts/stamp-release-docs.sh" "$v"
  for f in "$README" "$CHANGELOG" "$MANUAL"; do
    if [ -f "$f" ]; then git add "$f"; fi
  done
}

main() {
  local new_version="${1:-}"
  local no_sync="${2:-}"

  if [ "$no_sync" = "--no-sync" ]; then
    SYNC=0
  else
    SYNC=1
  fi

  local cur
  cur="$(current_version)"
  echo "Version actual en tauri.conf.json: $cur"

  if [ -z "$new_version" ]; then
    # Solo tag con la version actual
    ensure_clean
    ensure_pushed
    local tag="v$cur"
    if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
      echo "El tag $tag ya existe. Sube la version en tauri.conf.json y vuelve a intentar." >&2
      exit 1
    fi
    # Aun sin bump los docs pueden estar atrasados (por ejemplo, commits feat/fix
    # sin entrada en el CHANGELOG). Se sellan y, si cambian, viajan en su propio
    # commit antes del tag.
    #
    # El trap se mantiene armado durante el commit y el tag, no solo durante el
    # sellado: un fallo al pushear necesita decir que paso de verdad.
    PRE_SHA="$(git rev-parse HEAD)"
    TAG_NAME="$tag"
    trap rollback_versions ERR
    stamp_docs "$cur"
    if ! git diff --cached --quiet; then
      git commit -m "docs: actualiza los documentos a v$cur"
      COMMIT_DONE=1
      git push
      COMMIT_PUSHED=1
    fi
    git tag "$TAG_NAME"
    TAG_CREATED=1
    git push origin "$TAG_NAME"
    trap - ERR
    echo "Listo. Tag $TAG_NAME pusheado. La CI va a compilar y publicar el release."
    return
  fi

  # Bump a new_version
  if ! [[ "$new_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Version invalida: '$new_version'. Formato esperado: X.Y.Z (ej 0.1.2)." >&2
    exit 1
  fi
  if [ "$new_version" = "$cur" ]; then
    echo "La version nueva ($new_version) es igual a la actual. No hay nada que bumpaer." >&2
    exit 1
  fi
  if git rev-parse -q --verify "refs/tags/v$new_version" >/dev/null; then
    echo "El tag v$new_version ya existe. Elige una version mayor." >&2
    exit 1
  fi

  echo "Bumpeando a $new_version (sync=$([ "$SYNC" = "1" ] && echo "package.json+Cargo.toml" || echo "solo tauri.conf.json"))..."
  ensure_clean
  ensure_pushed

  # Punto de retorno: a partir de aca se tocan archivos, se crea un commit y se
  # crea un tag. Cada bandera se enciende DESPUES del paso que representa, asi el
  # rollback nunca confunde un paso completado con uno que no llego a terminar.
  PRE_SHA="$(git rev-parse HEAD)"
  TAG_NAME="v$new_version"
  trap rollback_versions ERR
  write_version "$new_version"
  stamp_docs "$new_version"

  git add "$CONF"
  # `if` y no `a && b`: con `set -e` una lista `&&` que da falso aborta el script
  # (rompia el modo --no-sync).
  if [ "$SYNC" = "1" ]; then
    if [ -f "$PKG" ]; then git add "$PKG"; fi
    if [ -f "$CARGO" ]; then git add "$CARGO"; fi
    if [ -f "$LOCK" ]; then git add "$LOCK"; fi
  fi

  git commit -m "release: v$new_version"
  COMMIT_DONE=1
  git push
  COMMIT_PUSHED=1

  git tag "$TAG_NAME"
  TAG_CREATED=1
  git push origin "$TAG_NAME"
  trap - ERR
  echo "Listo. Tag $TAG_NAME pusheado. La CI va a compilar y publicar el release."
}

main "$@"