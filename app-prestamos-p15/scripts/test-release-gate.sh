#!/usr/bin/env bash
# Self-check for scripts/release-gate.sh.
#
# Runs in throwaway git repos. No network, no git mutation outside mktemp.
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$SCRIPT_DIR/release-gate.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

failures=0

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1 -- $2" >&2; failures=$((failures + 1)); }

bash -n "$TARGET" || { echo "FAIL: syntax error in release-gate.sh" >&2; exit 1; }

setup_repo() {
  local name="$1" with_tag="${2:-yes}"
  local repo="$TMP/$name"
  mkdir -p "$repo/app-prestamos-p15/scripts" "$repo/app-prestamos-p15/src-tauri"
  cp "$TARGET" "$repo/app-prestamos-p15/scripts/release-gate.sh"
  printf '{\n  "version": "0.1.0"\n}\n' > "$repo/app-prestamos-p15/src-tauri/tauri.conf.json"
  git -C "$repo" init -q .
  git -C "$repo" config user.email test@example.com
  git -C "$repo" config user.name test
  git -C "$repo" add -A
  git -C "$repo" commit -qm init
  if [ "$with_tag" = "yes" ]; then
    git -C "$repo" tag v0.1.0
  fi
  printf '%s\n' "$repo"
}

run_gate() {
  local repo="$1" range="$2"
  (cd "$repo/app-prestamos-p15" && bash scripts/release-gate.sh --range "$range")
}

value_of() {
  local key="$1" output="$2"
  printf '%s\n' "$output" | awk -F= -v k="$key" '$1 == k { print substr($0, length(k) + 2); exit }'
}

expect_decision() {
  local name="$1" expected_should="$2" expected_reason="$3" expected_previous="$4" range="$5" repo="$6"
  local output should reason previous
  if ! output="$(run_gate "$repo" "$range")"; then
    fail "$name" "gate exited non-zero"
    return
  fi
  should="$(value_of should_release "$output")"
  reason="$(value_of reason "$output")"
  previous="$(value_of previous_tag "$output")"
  if [ "$should" = "$expected_should" ] && [ "$reason" = "$expected_reason" ] && [ "$previous" = "$expected_previous" ]; then
    pass "$name"
  else
    fail "$name" "expected should=$expected_should reason=$expected_reason previous_tag=$expected_previous, got: $(printf '%s' "$output" | tr '\n' ' ')"
  fi
}

# feat-only range -> release.
repo="$(setup_repo feat-only)"
before="$(git -C "$repo" rev-parse HEAD)"
git -C "$repo" commit -q --allow-empty -m "feat: agrega prestamos por curso"
after="$(git -C "$repo" rev-parse HEAD)"
expect_decision "feat-only range releases" "true" "functional_commits_found" "v0.1.0" "$before..$after" "$repo"

# fix-only range -> release.
repo="$(setup_repo fix-only)"
before="$(git -C "$repo" rev-parse HEAD)"
git -C "$repo" commit -q --allow-empty -m "fix: corrige el total diario"
after="$(git -C "$repo" rev-parse HEAD)"
expect_decision "fix-only range releases" "true" "functional_commits_found" "v0.1.0" "$before..$after" "$repo"

# docs+chore-only range -> no release.
repo="$(setup_repo docs-chore-only)"
before="$(git -C "$repo" rev-parse HEAD)"
git -C "$repo" commit -q --allow-empty -m "docs: actualiza ayuda"
git -C "$repo" commit -q --allow-empty -m "chore: ordena scripts"
after="$(git -C "$repo" rev-parse HEAD)"
expect_decision "docs+chore-only range skips" "false" "only_docs_or_maintenance" "v0.1.0" "$before..$after" "$repo"

# head release commit skips even with a feat in range.
repo="$(setup_repo release-head)"
before="$(git -C "$repo" rev-parse HEAD)"
git -C "$repo" commit -q --allow-empty -m "feat: agrega auditoria"
git -C "$repo" commit -q --allow-empty -m "release: v0.12.0"
after="$(git -C "$repo" rev-parse HEAD)"
expect_decision "release head skips even with feat" "false" "head_is_release_commit" "v0.1.0" "$before..$after" "$repo"

# no tags at all -> release with empty previous_tag.
repo="$(setup_repo no-tags no)"
before="$(git -C "$repo" rev-parse HEAD)"
git -C "$repo" commit -q --allow-empty -m "feat: habilita importacion"
after="$(git -C "$repo" rev-parse HEAD)"
expect_decision "no tags releases with empty previous_tag" "true" "functional_commits_found" "" "$before..$after" "$repo"

# scope-qualified feat(area): and breaking fix!: subjects -> release.
repo="$(setup_repo scoped-breaking)"
before="$(git -C "$repo" rev-parse HEAD)"
git -C "$repo" commit -q --allow-empty -m "feat(reportes): agrega filtro por fecha"
git -C "$repo" commit -q --allow-empty -m "fix!: recalcula saldos historicos"
after="$(git -C "$repo" rev-parse HEAD)"
expect_decision "scoped feat and breaking fix release" "true" "functional_commits_found" "v0.1.0" "$before..$after" "$repo"

# Merge commit with no functional subject -> no release.
repo="$(setup_repo merge-only)"
before="$(git -C "$repo" rev-parse HEAD)"
git -C "$repo" checkout -qb maintenance-branch
git -C "$repo" commit -q --allow-empty -m "docs: ajusta texto"
git -C "$repo" checkout -q master
git -C "$repo" merge --no-ff -q maintenance-branch -m "Merge maintenance branch"
after="$(git -C "$repo" rev-parse HEAD)"
expect_decision "merge commit without functional subject skips" "false" "only_docs_or_maintenance" "v0.1.0" "$before..$after" "$repo"

# Missing --range -> usage error with non-zero exit.
repo="$(setup_repo missing-range)"
if (cd "$repo/app-prestamos-p15" && bash scripts/release-gate.sh >/dev/null 2>&1); then
  fail "missing --range usage error" "expected non-zero exit"
else
  pass "missing --range usage error"
fi

if [ "$failures" -ne 0 ]; then
  echo "FAIL: release-gate.sh self-check had $failures failure(s)" >&2
  exit 1
fi

echo "OK: release-gate.sh self-check passed"
