#!/usr/bin/env bash
# Stamps the release version into the user-facing docs, so README, CHANGELOG and
# the staff manual never lag behind the published installer.
#
# Usage: bash scripts/stamp-release-docs.sh 0.12.0
#
# Called by publish-release.sh right after the version files are bumped, so the
# "release: vX.Y.Z" commit carries the docs too and the manual PDF the CI builds
# from the tag is already the right one.
#
# What it rewrites:
#   README.md               version badge, "La versión actual es ...", installer filenames
#   CHANGELOG.md            new "## [X.Y.Z] — <date>" section from the feat/fix commits
#   docs/MANUAL_PERSONAL.md installer filename example
#
# The CHANGELOG section is skipped when one for this version already exists, so a
# hand-written entry always wins over the generated one.
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# README and CHANGELOG live at the git root, one level above the app directory.
REPO="$(cd "$ROOT/.." && pwd)"
README="$REPO/README.md"
CHANGELOG="$REPO/CHANGELOG.md"
MANUAL="$ROOT/docs/MANUAL_PERSONAL.md"

VERSION="${1:-}"
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Uso: bash scripts/stamp-release-docs.sh X.Y.Z" >&2
  exit 1
fi

# perl (not sed): BSD and GNU sed disagree on -i, and perl ships with both mac and
# linux. No `use utf8`: the patterns are matched as UTF-8 bytes against UTF-8 files.
stamp_readme() {
  [ -f "$README" ] || return 0
  # Programa en comillas simples y version por entorno: si no, bash se come los
  # backslashes del regex y expande $1 como su propio argumento.
  V="$VERSION" perl -pi -e '
    s{(badge/versi%C3%B3n-)\d+\.\d+\.\d+}{$1$ENV{V}}g;
    s{(La versión actual es \*\*)\d+\.\d+\.\d+}{$1$ENV{V}}g;
    s{(P15[._ ])\d+\.\d+\.\d+(_x64)}{$1$ENV{V}$2}g;
  ' "$README"
}

stamp_manual() {
  [ -f "$MANUAL" ] || return 0
  V="$VERSION" perl -pi -e 's{(P15[._ ])\d+\.\d+\.\d+(_x64)}{$1$ENV{V}$2}g;' "$MANUAL"
}

# Same grouping the CI uses for the release body (Conventional Commits feat/fix
# between the previous tag and HEAD), so the release notes, the CHANGELOG and the
# in-app "Notas de la versión" tell the same story.
changelog_entry() {
  local previous range added=() fixed=()
  previous="$(git -C "$REPO" describe --tags --abbrev=0 2>/dev/null || true)"
  if [ -n "$previous" ]; then range="$previous..HEAD"; else range="HEAD"; fi

  local subject type text
  while IFS= read -r subject; do
    [[ "$subject" =~ ^(feat|fix)(\([^\)]*\))?!?:[[:space:]]*(.+)$ ]] || continue
    type="${BASH_REMATCH[1]}"
    text="${BASH_REMATCH[3]}"
    # Capitalize the first letter so the bullet reads like a sentence, not a log line.
    text="$(printf '%s' "$text" | perl -pe 's/^(.)/\u$1/')"
    if [ "$type" = "feat" ]; then added+=("- $text"); else fixed+=("- $text"); fi
  done < <(git -C "$REPO" log --no-merges --format=%s $range)

  if [ "${#added[@]}" = "0" ] && [ "${#fixed[@]}" = "0" ]; then
    return 1
  fi

  printf '## [%s] — %s\n' "$VERSION" "$(date +%F)"
  if [ "${#added[@]}" != "0" ]; then
    printf '\n### Añadido\n\n'
    printf '%s\n' "${added[@]}"
  fi
  if [ "${#fixed[@]}" != "0" ]; then
    printf '\n### Corregido\n\n'
    printf '%s\n' "${fixed[@]}"
  fi
  printf '\n---\n'
}

stamp_changelog() {
  [ -f "$CHANGELOG" ] || return 0
  if grep -q "^## \[$VERSION\]" "$CHANGELOG"; then
    echo "CHANGELOG: la entrada de $VERSION ya existe, se respeta la escrita a mano."
    return 0
  fi

  local entry
  if ! entry="$(changelog_entry)"; then
    echo "CHANGELOG: sin commits feat/fix desde el tag anterior, no se agregó entrada." >&2
    return 0
  fi

  # Insert above the newest released section, keeping the intro block intact.
  printf '%s\n' "$entry" > "$CHANGELOG.entry"
  awk -v entry="$CHANGELOG.entry" '
    !done && /^## \[/ {
      while ((getline line < entry) > 0) print line
      print ""
      done = 1
    }
    { print }
    END {
      if (!done) {
        while ((getline line < entry) > 0) print line
      }
    }
  ' "$CHANGELOG" > "$CHANGELOG.tmp"
  cat "$CHANGELOG.tmp" > "$CHANGELOG" && rm -f "$CHANGELOG.tmp" "$CHANGELOG.entry"
}

stamp_readme
stamp_manual
stamp_changelog
echo "Docs actualizados a $VERSION (README, CHANGELOG, manual)."
