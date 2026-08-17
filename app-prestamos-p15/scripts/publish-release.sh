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
# -E (errtrace): sin esto el trap ERR no se hereda dentro de las funciones y un
# fallo en write_version saldria sin revertir el bump.
set -Eeuo pipefail

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

# Deshace los archivos de version si el script falla despues de escribirlos.
# Sin esto un fallo a mitad de camino deja el tree sucio y el siguiente intento
# muere en ensure_clean (deadlock: no se puede reintentar ni publicar).
rollback_versions() {
  local f
  for f in "$CONF" "$PKG" "$CARGO"; do
    [ -f "$f" ] && git checkout -- "$f" 2>/dev/null || true
  done
  echo "Fallo la publicacion. Versiones revertidas al estado del ultimo commit." >&2
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

  # A partir de aca se tocan archivos: cualquier fallo revierte el bump.
  trap rollback_versions ERR
  write_version "$new_version"

  git add "$CONF"
  # `if` y no `a && b`: con `set -e` una lista `&&` que da falso aborta el script
  # (rompia el modo --no-sync).
  if [ "$SYNC" = "1" ]; then
    if [ -f "$PKG" ]; then git add "$PKG"; fi
    if [ -f "$CARGO" ]; then git add "$CARGO"; fi
  fi

  git commit -m "release: v$new_version"
  git push

  local tag="v$new_version"
  git tag "$tag"
  git push origin "$tag"
  trap - ERR
  echo "Listo. Tag $tag pusheado. La CI va a compilar y publicar el release."
}

main "$@"