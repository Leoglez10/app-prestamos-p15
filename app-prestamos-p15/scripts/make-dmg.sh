#!/usr/bin/env bash
# Builds the macOS DMG with plain hdiutil.
#
# ponytail: replaces Tauri's bundled bundle_dmg.sh, which mounts a scratch volume,
# styles it with AppleScript and then unmounts it. That unmount races with Finder
# and Spotlight; the script retries only on exit code 16, and hdiutil returns other
# codes when the volume is busy, so it aborts on the first attempt. Patching it is
# pointless because Tauri rewrites the file on every build.
# `hdiutil create -srcfolder` never mounts anything, so the race cannot happen.
# Trade-off: no custom window layout or background image. Add create-dmg if that matters.
set -euo pipefail

APP_NAME="App Prestamos P15"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/src-tauri/target/release/bundle/macos/$APP_NAME.app"
OUT_DIR="$ROOT/src-tauri/target/release/bundle/dmg"
VERSION="$(node -p "require('$ROOT/package.json').version")"
ARCH="$(uname -m)"
DMG="$OUT_DIR/${APP_NAME}_${VERSION}_${ARCH}.dmg"

[ -d "$APP" ] || { echo "error: $APP not found. Run the Tauri build first." >&2; exit 1; }

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"

mkdir -p "$OUT_DIR"
rm -f "$DMG"
hdiutil create -volname "$APP_NAME" -srcfolder "$STAGE" -ov -format UDZO "$DMG" >/dev/null

echo "DMG created: $DMG"
