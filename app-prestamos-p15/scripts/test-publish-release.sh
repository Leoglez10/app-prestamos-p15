#!/usr/bin/env bash
# Self-check for scripts/publish-release.sh version writing + rollback.
#
# Runs in a throwaway git repo. Verifies the pieces that actually broke before:
#   - bash 3.2 (macOS) with `set -u`: no unbound-variable crash on a spaces-indented JSON
#   - tab indentation preserved in tauri.conf.json
#   - Cargo.toml: only [package].version rewritten, dependency versions untouched
#   - rollback_versions restores all three files after a mid-run failure
#
# Usage: bash scripts/test-publish-release.sh
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$SCRIPT_DIR/publish-release.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

fail() { echo "FAIL: $1" >&2; exit 1; }

bash -n "$TARGET" || fail "syntax error in publish-release.sh"

ROOT="$TMP/proj"
mkdir -p "$ROOT/src-tauri" "$ROOT/scripts"
printf '{\n\t"version": "0.1.0",\n\t"productName": "X"\n}\n' > "$ROOT/src-tauri/tauri.conf.json"
printf '{\n  "version": "0.1.0"\n}\n' > "$ROOT/package.json"
printf '[package]\nname = "app-prestamos-p15"\nversion = "0.1.0"\n\n[dependencies]\nserde = { version = "1.0" }\n' > "$ROOT/src-tauri/Cargo.toml"
# Lock with a same-named dependency block BEFORE the crate's own, so a naive
# "first version line wins" rewrite would corrupt the dependency instead.
printf '[[package]]\nname = "serde"\nversion = "1.0.0"\n\n[[package]]\nname = "app-prestamos-p15"\nversion = "0.1.0"\ndependencies = [\n "serde",\n]\n' > "$ROOT/src-tauri/Cargo.lock"
cp "$TARGET" "$ROOT/scripts/"

# Docs de cara al usuario: README y CHANGELOG en la raiz del repo, el manual en la app.
mkdir -p "$ROOT/docs"
cat > "$TMP/README.md" <<'EOF'
[![Versión](https://img.shields.io/badge/versi%C3%B3n-0.1.0-blue)](CHANGELOG.md)
Ejemplo: `App Prestamos P15_0.1.0_x64-setup.exe` y `App Prestamos P15_0.1.0_x64_en-US.msi`.
La versión actual es **0.1.0**.
EOF
cat > "$TMP/CHANGELOG.md" <<'EOF'
# Changelog

Intro que no se debe mover.

---

## [0.1.0] — 2026-01-01

### Añadido

- Primera versión.

---
EOF
printf 'Descarga `App.Prestamos.P15_0.1.0_x64-setup.exe`.\n' > "$ROOT/docs/MANUAL_PERSONAL.md"
cp "$SCRIPT_DIR/stamp-release-docs.sh" "$ROOT/scripts/"

git -C "$TMP" init -q .
git -C "$TMP" config user.email test@example.com
git -C "$TMP" config user.name test
git -C "$TMP" add -A
git -C "$TMP" commit -qm init

# Load only the pure functions; main() would try to push to a remote.
CONF="$ROOT/src-tauri/tauri.conf.json"
PKG="$ROOT/package.json"
CARGO="$ROOT/src-tauri/Cargo.toml"
LOCK="$ROOT/src-tauri/Cargo.lock"
REPO="$TMP"
README="$TMP/README.md"
CHANGELOG="$TMP/CHANGELOG.md"
MANUAL="$ROOT/docs/MANUAL_PERSONAL.md"
cd "$ROOT"
eval "$(sed -n '/^write_json_version()/,/^}/p;/^write_version()/,/^}/p;/^rollback_versions()/,/^}/p' "$TARGET")"

SYNC=1
write_version 9.9.9

[ "$(jq -r .version "$CONF")" = "9.9.9" ] || fail "tauri.conf.json not bumped"
[ "$(jq -r .version "$PKG")" = "9.9.9" ] || fail "package.json not bumped (spaces-indented JSON regression)"
grep -q '^version = "9.9.9"$' "$CARGO" || fail "Cargo.toml [package].version not bumped"
grep -q 'serde = { version = "1.0" }' "$CARGO" || fail "Cargo.toml dependency version was clobbered"
grep -q $'^\t"version"' "$CONF" || fail "tab indentation lost in tauri.conf.json"
grep -q '^version = "9.9.9"$' "$LOCK" || fail "Cargo.lock crate version not bumped"
grep -q '^version = "1.0.0"$' "$LOCK" || fail "Cargo.lock dependency version was clobbered"

rollback_versions >/dev/null 2>&1

[ "$(jq -r .version "$CONF")" = "0.1.0" ] || fail "rollback did not restore tauri.conf.json"
[ "$(jq -r .version "$PKG")" = "0.1.0" ] || fail "rollback did not restore package.json"
grep -q '^version = "0.1.0"$' "$CARGO" || fail "rollback did not restore Cargo.toml"
grep -q '^version = "0.1.0"$' "$LOCK" || fail "rollback did not restore Cargo.lock"

# Docs sellados y ya en el index: el rollback tiene que volver a HEAD, no al index.
bash "$ROOT/scripts/stamp-release-docs.sh" 9.9.9 >/dev/null
git -C "$TMP" add -A
rollback_versions >/dev/null 2>&1
grep -q 'badge/versi%C3%B3n-0.1.0-blue' "$README" || fail "rollback did not restore README"
grep -q '^## \[0.1.0\]' "$CHANGELOG" || fail "rollback did not restore CHANGELOG"
grep -q 'P15.0.1.0_x64-setup.exe' "$MANUAL" || fail "rollback did not restore the manual"
git -C "$TMP" reset -q

# --- rollback despues del commit: tres desenlaces distintos ----------------------
# El bug que esto cubre: el rollback restauraba desde HEAD, y despues del commit HEAD
# ya era el commit de release. Un fallo al pushear el tag decia "versiones revertidas"
# sin revertir nada, y empujaba a elegir una version mayor cuando solo faltaba el push.
PRISTINE="$(git -C "$TMP" rev-parse HEAD)"

# (a) Commit local sin pushear: se deshace entero y el arbol vuelve atras.
write_version 9.9.9
git -C "$TMP" add -A
git -C "$TMP" commit -qm "release: v9.9.9"
PRE_SHA="$PRISTINE"; TAG_NAME="v9.9.9"
COMMIT_DONE=1; COMMIT_PUSHED=0; TAG_CREATED=0
out="$(rollback_versions 2>&1 || true)"
[ "$(git -C "$TMP" rev-parse HEAD)" = "$PRISTINE" ] || fail "(a) el commit de release local no se deshizo"
[ "$(jq -r .version "$CONF")" = "0.1.0" ] || fail "(a) quedo la version bumpeada tras deshacer el commit"
case "$out" in *"Se deshizo el commit"*) ;; *) fail "(a) no informa que deshizo el commit: $out" ;; esac

# (b) Commit ya pusheado: NO se revierte (el estado es correcto) y falta solo el tag.
write_version 9.9.9
git -C "$TMP" add -A
git -C "$TMP" commit -qm "release: v9.9.9"
PRE_SHA="$PRISTINE"; TAG_NAME="v9.9.9"
COMMIT_DONE=1; COMMIT_PUSHED=1; TAG_CREATED=0
out="$(rollback_versions 2>&1 || true)"
[ "$(git -C "$TMP" rev-parse HEAD)" != "$PRISTINE" ] || fail "(b) revirtio un commit que ya estaba pusheado"
[ "$(jq -r .version "$CONF")" = "9.9.9" ] || fail "(b) rompio los archivos de un commit ya pusheado"
case "$out" in *"git tag v9.9.9 && git push origin v9.9.9"*) ;; *) fail "(b) no indica como crear el tag: $out" ;; esac

# (c) Tag creado pero sin pushear: NO se revierte y avisa que no hay que subir version.
git -C "$TMP" tag v9.9.9
TAG_CREATED=1
out="$(rollback_versions 2>&1 || true)"
case "$out" in *"git push origin v9.9.9"*) ;; *) fail "(c) no indica como pushear el tag: $out" ;; esac
case "$out" in *"No vuelvas a correr el script"*) ;; *) fail "(c) falta la advertencia sobre elegir una version mayor: $out" ;; esac

# Volver al estado limpio para el resto del test.
git -C "$TMP" tag -d v9.9.9 >/dev/null
git -C "$TMP" reset -q --hard "$PRISTINE"
PRE_SHA=""; TAG_NAME=""
COMMIT_DONE=0; COMMIT_PUSHED=0; TAG_CREATED=0

[ "$(jq -r .version "$CONF")" = "0.1.0" ] || fail "el entorno quedo sucio despues de los casos de rollback"

echo "OK: publish-release.sh version write + rollback (3 desenlaces tras el commit)"

# --- stamp-release-docs.sh ------------------------------------------------------
# Same layout as the real repo: README/CHANGELOG at the git root, app in a subdir.
STAMP="$SCRIPT_DIR/stamp-release-docs.sh"
bash -n "$STAMP" || fail "syntax error in stamp-release-docs.sh"

git -C "$TMP" tag v0.1.0
git -C "$TMP" commit -q --allow-empty -m "feat(kiosko): muestra el aviso de devolución"
git -C "$TMP" commit -q --allow-empty -m "fix: corrige el PIN del admin"
git -C "$TMP" commit -q --allow-empty -m "chore: ruido que no va al changelog"

bash "$ROOT/scripts/stamp-release-docs.sh" 0.2.0 >/dev/null

grep -q 'badge/versi%C3%B3n-0.2.0-blue' "$TMP/README.md" || fail "README badge not stamped"
grep -q 'La versión actual es \*\*0.2.0\*\*' "$TMP/README.md" || fail "README current version not stamped"
grep -q 'P15_0.2.0_x64-setup.exe' "$TMP/README.md" || fail "README setup.exe example not stamped"
grep -q 'P15_0.2.0_x64_en-US.msi' "$TMP/README.md" || fail "README msi example not stamped"
grep -q 'P15.0.2.0_x64-setup.exe' "$ROOT/docs/MANUAL_PERSONAL.md" || fail "manual example not stamped"

grep -q '^## \[0.2.0\]' "$TMP/CHANGELOG.md" || fail "CHANGELOG section not inserted"
grep -q '^- Muestra el aviso de devolución$' "$TMP/CHANGELOG.md" || fail "feat commit missing from CHANGELOG"
grep -q '^- Corrige el PIN del admin$' "$TMP/CHANGELOG.md" || fail "fix commit missing from CHANGELOG"
if grep -q 'ruido que no va' "$TMP/CHANGELOG.md"; then fail "non feat/fix commit leaked into CHANGELOG"; fi
[ "$(head -1 "$TMP/CHANGELOG.md")" = "# Changelog" ] || fail "CHANGELOG intro was clobbered"
# The new section goes above the previous one, not below.
[ "$(grep -n '^## \[' "$TMP/CHANGELOG.md" | head -1 | cut -d: -f2-)" = "## [0.2.0] — $(date +%F)" ] \
  || fail "new CHANGELOG section is not the first one"

# Idempotent: a second run must not duplicate the section.
bash "$ROOT/scripts/stamp-release-docs.sh" 0.2.0 >/dev/null
[ "$(grep -c '^## \[0.2.0\]' "$TMP/CHANGELOG.md")" = "1" ] || fail "CHANGELOG section duplicated on re-run"

echo "OK: stamp-release-docs.sh README + manual + CHANGELOG"
