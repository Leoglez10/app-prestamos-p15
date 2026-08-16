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
#   4. Commitea "release: vX.Y.Z" (solo si hubo bump).
#   5. Crea el tag v<version> y lo pushea. La CI (.github/workflows/build-windows.yml)
#      se dispara en tags v* y publica el Release con el instalador .exe/.msi.
#
# Requisitos:
#   - git, jq
#   - origin configurado
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONF="$ROOT/src-tauri/tauri.conf.json"
PKG="$ROOT/package.json"
CARGO="$ROOT/src-tauri/Cargo.toml"

cd "$ROOT"

if ! command -v jq >/dev/null 2>&1; then
  echo "Falta jq. Instalalo: brew install jq (mac) o apt install jq (linux)." >&2
  exit 1
fi

current_version() {
  jq -r '.version' "$CONF"
}

write_version() {
  local v="$1"
  jq --arg v "$v" '.version = $v' "$CONF" > "$CONF.tmp" && mv "$CONF.tmp" "$CONF"
  if [ -f "$PKG" ] && [ "${SYNC:-1}" = "1" ]; then
    jq --arg v "$v" '.version = $v' "$PKG" > "$PKG.tmp" && mv "$PKG.tmp" "$PKG"
  fi
  if [ -f "$CARGO" ] && [ "${SYNC:-1}" = "1" ]; then
    # Cargo.toml: reemplaza la primera linea `version = "..."` luego de `name =`
    if [[ "$(uname)" == "Darwin" ]]; then
      /usr/bin/sed -i '' -E "0,/^name = .*/{s/^version = .*/version = \"$v\"/}" "$CARGO"
    else
      sed -i -E "0,/^name = .*/{s/^version = .*/version = \"$v\"/}" "$CARGO"
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
      echo "El tag $tag ya existe. Subi la version en tauri.conf.json y reintentá." >&2
      exit 1
    fi
    git tag "$tag"
    git push origin "$tag"
    echo "Listo. Tag $tag pusheado. La CI va a compilar y publicar el release."
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
    echo "El tag v$new_version ya existe. Elegi una version mayor." >&2
    exit 1
  fi

  echo "Bumpeando a $new_version (sync=$([ "$SYNC" = "1" ] && echo "package.json+Cargo.toml" || echo "solo tauri.conf.json"))..."
  ensure_clean
  ensure_pushed
  write_version "$new_version"

  git add "$CONF"
  [ "$SYNC" = "1" ] && [ -f "$PKG" ] && git add "$PKG"
  [ "$SYNC" = "1" ] && [ -f "$CARGO" ] && git add "$CARGO"

  git commit -m "release: v$new_version"
  git push

  local tag="v$new_version"
  git tag "$tag"
  git push origin "$tag"
  echo "Listo. Tag $tag pusheado. La CI va a compilar y publicar el release."
}

main "$@"