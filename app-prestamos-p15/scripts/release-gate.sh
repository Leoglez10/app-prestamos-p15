#!/usr/bin/env bash
# Pure release decision gate for CI and local dry runs.
#
# Usage:
#   bash scripts/release-gate.sh --range <before-sha>..<after-sha>
#
# Prints key=value lines and never mutates git, files, tags, or the network.
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(cd "$ROOT/.." && pwd)"
CONF="$ROOT/src-tauri/tauri.conf.json"

RANGE=""
LAST_TAG_OVERRIDE="__unset__"
EVENT_NAME="${GITHUB_EVENT_NAME:-}"
REF_TYPE="${GITHUB_REF_TYPE:-}"
REF_NAME="${GITHUB_REF_NAME:-}"
TARGET_SHA="${GITHUB_SHA:-}"
DRY_RUN="false"

usage() {
  cat >&2 <<'USAGE'
Usage: bash scripts/release-gate.sh --range <before-sha>..<after-sha> [--last-tag <tag>]

CI may also pass --event-name, --ref-type, --ref-name, --sha and --dry-run.
USAGE
}

fail_usage() {
  usage
  exit 64
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --range)
      [ "$#" -ge 2 ] || fail_usage
      RANGE="$2"
      shift 2
      ;;
    --last-tag)
      [ "$#" -ge 2 ] || fail_usage
      LAST_TAG_OVERRIDE="$2"
      shift 2
      ;;
    --event-name)
      [ "$#" -ge 2 ] || fail_usage
      EVENT_NAME="$2"
      shift 2
      ;;
    --ref-type)
      [ "$#" -ge 2 ] || fail_usage
      REF_TYPE="$2"
      shift 2
      ;;
    --ref-name)
      [ "$#" -ge 2 ] || fail_usage
      REF_NAME="$2"
      shift 2
      ;;
    --sha)
      [ "$#" -ge 2 ] || fail_usage
      TARGET_SHA="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail_usage
      ;;
  esac
done

if ! command -v git >/dev/null 2>&1; then
  echo "git is required" >&2
  exit 127
fi

cd "$REPO"

is_zero_sha() {
  local sha="$1"
  [ -z "$sha" ] || [[ "$sha" =~ ^0+$ ]]
}

json_version() {
  node -e 'const fs = require("fs"); const p = process.argv[1]; console.log(JSON.parse(fs.readFileSync(p, "utf8")).version);' "$CONF"
}

next_patch_version() {
  local version major minor patch
  version="$(json_version)"
  if ! [[ "$version" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
    echo "Invalid version in $CONF: $version" >&2
    exit 65
  fi
  major="${BASH_REMATCH[1]}"
  minor="${BASH_REMATCH[2]}"
  patch="${BASH_REMATCH[3]}"
  printf '%s.%s.%s\n' "$major" "$minor" "$((patch + 1))"
}

last_tag_at() {
  local sha="$1"
  if [ "$LAST_TAG_OVERRIDE" != "__unset__" ]; then
    printf '%s\n' "$LAST_TAG_OVERRIDE"
    return 0
  fi
  git describe --tags --abbrev=0 "$sha" 2>/dev/null || true
}

previous_tag_for_tag() {
  local tag="$1"
  if [ "$LAST_TAG_OVERRIDE" != "__unset__" ]; then
    printf '%s\n' "$LAST_TAG_OVERRIDE"
    return 0
  fi
  git describe --tags --abbrev=0 "${tag}^" 2>/dev/null || true
}

emit() {
  local should_release="$1" reason="$2" previous_tag="$3" release_tag="$4" functional_commits="$5" target_sha="$6" release_version="${7:-}"
  printf 'should_release=%s\n' "$should_release"
  printf 'reason=%s\n' "$reason"
  printf 'previous_tag=%s\n' "$previous_tag"
  printf 'release_tag=%s\n' "$release_tag"
  printf 'functional_commits=%s\n' "$functional_commits"
  printf 'target_sha=%s\n' "$target_sha"
  printf 'release_version=%s\n' "$release_version"
}

range_before=""
range_after=""
if [ -n "$RANGE" ]; then
  case "$RANGE" in
    *..*)
      range_before="${RANGE%%..*}"
      range_after="${RANGE#*..}"
      ;;
    *)
      fail_usage
      ;;
  esac
  if [ -z "$range_after" ]; then
    range_after="HEAD"
  fi
  TARGET_SHA="$range_after"
fi

if [ -z "$TARGET_SHA" ]; then
  fail_usage
fi

# Normalize to a commit-ish that git commands can read. Keep the printed target as
# the caller supplied sha/ref when possible, but fail on impossible targets.
if ! git rev-parse --verify --quiet "${TARGET_SHA}^{commit}" >/dev/null; then
  echo "Unknown target sha/ref: $TARGET_SHA" >&2
  exit 66
fi

if [ "$DRY_RUN" = "true" ]; then
  previous_tag="$(last_tag_at "$TARGET_SHA")"
  emit "false" "dry_run" "$previous_tag" "" "0" "$TARGET_SHA" ""
  exit 0
fi

if [ "$REF_TYPE" = "tag" ]; then
  previous_tag="$(previous_tag_for_tag "$REF_NAME")"
  emit "true" "tag_flow" "$previous_tag" "$REF_NAME" "0" "$TARGET_SHA" ""
  exit 0
fi

if [ "$EVENT_NAME" = "workflow_dispatch" ]; then
  current_version="$(json_version)"
  previous_tag="$(last_tag_at "$TARGET_SHA")"
  emit "true" "manual_dispatch" "$previous_tag" "v$current_version" "0" "$TARGET_SHA" ""
  exit 0
fi

head_subject="$(git log -1 --format=%s "$TARGET_SHA")"
if [[ "$head_subject" =~ ^release:\ v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  previous_tag="$(last_tag_at "$TARGET_SHA")"
  emit "false" "head_is_release_commit" "$previous_tag" "" "0" "$TARGET_SHA" ""
  exit 0
fi

previous_tag="$(last_tag_at "$TARGET_SHA")"
scan_range=""
if [ -n "$RANGE" ]; then
  if is_zero_sha "$range_before"; then
    scan_range="$TARGET_SHA"
  else
    scan_range="$range_before..$TARGET_SHA"
  fi
elif [ -n "$previous_tag" ]; then
  scan_range="$previous_tag..$TARGET_SHA"
else
  scan_range="$TARGET_SHA"
fi

functional_commits="$(git log --no-merges --format=%s "$scan_range" | awk '/^(feat|fix)(\([^)]+\))?!?: .+/ { count++ } END { print count + 0 }')"
if [ "$functional_commits" -gt 0 ]; then
  release_version="$(next_patch_version)"
  emit "true" "functional_commits_found" "$previous_tag" "v$release_version" "$functional_commits" "$TARGET_SHA" "$release_version"
else
  emit "false" "only_docs_or_maintenance" "$previous_tag" "" "0" "$TARGET_SHA" ""
fi
