#!/usr/bin/env bash
# CI-only patch release bumper.
#
# Writes the same four version files as publish-release.sh, stamps user-facing docs,
# commits "release: v<X.Y.Z>", and pushes HEAD:main. It deliberately does not tag.
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONF="$ROOT/src-tauri/tauri.conf.json"
PKG="$ROOT/package.json"
CARGO="$ROOT/src-tauri/Cargo.toml"
LOCK="$ROOT/src-tauri/Cargo.lock"
REPO="$(cd "$ROOT/.." && pwd)"
README="$REPO/README.md"
CHANGELOG="$REPO/CHANGELOG.md"
MANUAL="$ROOT/docs/MANUAL_PERSONAL.md"

VERSION="${1:-}"
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Usage: bash scripts/ci-bump-release.sh X.Y.Z" >&2
  exit 64
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required to update JSON version files." >&2
  exit 127
fi

cd "$REPO"

current_json_version() {
  jq -r '.version' "$1"
}

# Same JSON rewrite semantics as publish-release.sh: jq does the edit, tabs and CRLF
# are preserved, and cat keeps the original file mode.
write_json_version() {
  local file="$1" v="$2"
  local jq_flag=""
  if grep -q '^	' "$file"; then
    jq_flag="--tab"
  fi
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

package_name() {
  awk '/^\[package\]/ { inpkg = 1 }
    inpkg && /^name[[:space:]]*=/ { gsub(/^name[[:space:]]*=[[:space:]]*"|"[[:space:]]*$/, ""); print; exit }' "$CARGO"
}

cargo_package_version() {
  awk '/^\[package\]/ { inpkg = 1 }
    inpkg && /^version[[:space:]]*=/ { gsub(/^version[[:space:]]*=[[:space:]]*"|"[[:space:]]*$/, ""); print; exit }' "$CARGO"
}

cargo_lock_package_version() {
  local pkg="$1"
  awk -v pkg="$pkg" '
    $0 == "name = \"" pkg "\"" { found = 1 }
    found && /^version[[:space:]]*=/ { gsub(/^version[[:space:]]*=[[:space:]]*"|"[[:space:]]*$/, ""); print; exit }
  ' "$LOCK"
}

write_version() {
  local v="$1"
  write_json_version "$CONF" "$v"
  write_json_version "$PKG" "$v"

  # Cargo.toml: only [package].version, never dependency versions.
  awk -v v="$v" '
    /^\[package\]/ { inpkg = 1 }
    inpkg && !done && /^version[[:space:]]*=/ {
      print "version = \"" v "\""
      done = 1
      next
    }
    { print }
  ' "$CARGO" > "$CARGO.tmp" && cat "$CARGO.tmp" > "$CARGO" && rm -f "$CARGO.tmp"

  # Cargo.lock: only the block whose name matches this crate.
  local pkg_name
  pkg_name="$(package_name)"
  if [ -n "$pkg_name" ] && [ -f "$LOCK" ]; then
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
}

all_versions_match() {
  local pkg_name="$1"
  [ "$(current_json_version "$CONF")" = "$VERSION" ] && \
    [ "$(current_json_version "$PKG")" = "$VERSION" ] && \
    [ "$(cargo_package_version)" = "$VERSION" ] && \
    [ "$(cargo_lock_package_version "$pkg_name")" = "$VERSION" ]
}

assert_versions_match() {
  local pkg_name="$1"
  local conf_v pkg_v cargo_v lock_v
  conf_v="$(current_json_version "$CONF")"
  pkg_v="$(current_json_version "$PKG")"
  cargo_v="$(cargo_package_version)"
  lock_v="$(cargo_lock_package_version "$pkg_name")"
  if [ "$conf_v" != "$VERSION" ] || [ "$pkg_v" != "$VERSION" ] || [ "$cargo_v" != "$VERSION" ] || [ "$lock_v" != "$VERSION" ]; then
    cat >&2 <<EOF
Version assertion failed after bump:
  $CONF: $conf_v
  $PKG: $pkg_v
  $CARGO: $cargo_v
  $LOCK: $lock_v
Expected all four to be exactly: $VERSION
EOF
    exit 1
  fi
}

stamp_docs() {
  bash "$ROOT/scripts/stamp-release-docs.sh" "$VERSION"
}

stage_release_files() {
  git add "$CONF" "$PKG" "$CARGO" "$LOCK"
  [ -f "$README" ] && git add "$README"
  [ -f "$CHANGELOG" ] && git add "$CHANGELOG"
  [ -f "$MANUAL" ] && git add "$MANUAL"
}

ensure_commit_identity() {
  if ! git config user.email >/dev/null; then
    git config user.email "github-actions[bot]@users.noreply.github.com"
  fi
  if ! git config user.name >/dev/null; then
    git config user.name "github-actions[bot]"
  fi
}

pkg_name="$(package_name)"
if [ -z "$pkg_name" ]; then
  echo "Could not read package name from $CARGO" >&2
  exit 1
fi

if all_versions_match "$pkg_name"; then
  echo "Version files already read $VERSION; skipping version writes."
else
  echo "Bumping version files to $VERSION..."
  write_version "$VERSION"
fi

stamp_docs
assert_versions_match "$pkg_name"
stage_release_files

ensure_commit_identity
if git diff --cached --quiet; then
  echo "No release file changes to commit; pushing current HEAD to main for coherence."
else
  git commit -m "release: v$VERSION"
fi

git push origin HEAD:main
