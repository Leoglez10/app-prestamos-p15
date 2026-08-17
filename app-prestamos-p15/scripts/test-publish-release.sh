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
printf '[package]\nversion = "0.1.0"\n\n[dependencies]\nserde = { version = "1.0" }\n' > "$ROOT/src-tauri/Cargo.toml"
cp "$TARGET" "$ROOT/scripts/"

git -C "$TMP" init -q .
git -C "$TMP" config user.email test@example.com
git -C "$TMP" config user.name test
git -C "$TMP" add -A
git -C "$TMP" commit -qm init

# Load only the pure functions; main() would try to push to a remote.
CONF="$ROOT/src-tauri/tauri.conf.json"
PKG="$ROOT/package.json"
CARGO="$ROOT/src-tauri/Cargo.toml"
cd "$ROOT"
eval "$(sed -n '/^write_json_version()/,/^}/p;/^write_version()/,/^}/p;/^rollback_versions()/,/^}/p' "$TARGET")"

SYNC=1
write_version 9.9.9

[ "$(jq -r .version "$CONF")" = "9.9.9" ] || fail "tauri.conf.json not bumped"
[ "$(jq -r .version "$PKG")" = "9.9.9" ] || fail "package.json not bumped (spaces-indented JSON regression)"
grep -q '^version = "9.9.9"$' "$CARGO" || fail "Cargo.toml [package].version not bumped"
grep -q 'serde = { version = "1.0" }' "$CARGO" || fail "Cargo.toml dependency version was clobbered"
grep -q $'^\t"version"' "$CONF" || fail "tab indentation lost in tauri.conf.json"

rollback_versions >/dev/null 2>&1

[ "$(jq -r .version "$CONF")" = "0.1.0" ] || fail "rollback did not restore tauri.conf.json"
[ "$(jq -r .version "$PKG")" = "0.1.0" ] || fail "rollback did not restore package.json"
grep -q '^version = "0.1.0"$' "$CARGO" || fail "rollback did not restore Cargo.toml"

echo "OK: publish-release.sh version write + rollback"
