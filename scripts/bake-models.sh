#!/usr/bin/env bash
# Compress the baked GLBs exported by scripts/export-baked.html.
#
# Those exports carry the default paint inside the file, so they are standalone:
# no config JSON, no recolouring code. This step just makes them small enough to
# put on a page — the exporter writes raw geometry and PNG textures.
#
# Usage:
#   1. serve the project     npx serve . -l 8788
#   2. open                  http://localhost:8788/scripts/export-baked.html
#      (three files land in ~/Downloads)
#   3. ./scripts/bake-models.sh
#
# Output lands in dist-baked/.

set -euo pipefail

CLI="npx --yes @gltf-transform/cli@4.4.2"
SRC="${1:-$HOME/Downloads}"

cd "$(dirname "$0")/.."
OUT="dist-baked"
mkdir -p "$OUT"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

for key in 10pro 5pro 2pro; do
  in="$SRC/typhoon-$key-baked.glb"
  out="$OUT/typhoon-$key.glb"
  if [ ! -f "$in" ]; then
    echo "⚠  missing $in — run the export page first"
    continue
  fi
  echo "── $key"
  $CLI prune  "$in"          "$TMP/p.glb" > /dev/null 2>&1
  $CLI webp   "$TMP/p.glb"   "$TMP/t.glb" --quality 80 > /dev/null 2>&1
  $CLI draco  "$TMP/t.glb"   "$out"       > /dev/null 2>&1
  printf '   %s → %s\n' "$(du -h "$in" | cut -f1)" "$(du -h "$out" | cut -f1)"
done

echo
echo "Done → $OUT/"
