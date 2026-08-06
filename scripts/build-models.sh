#!/usr/bin/env bash
# Build optimized GLB models for the configurator.
#
#   weld → simplify → webp textures → draco
#
# Mesh names are preserved, so config-*.json assignments keep working.
# Source GLBs stay untouched; only *.opt.glb is regenerated.
#
# Usage:  ./scripts/build-models.sh [ratio]        (default ratio 0.25)

set -euo pipefail

CLI="npx --yes @gltf-transform/cli@4.4.2"
RATIO="${1:-0.25}"
ERROR="0.0008"
QUALITY="80"

cd "$(dirname "$0")/.."
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

build() {
  local src="$1" out="$2"
  echo "── $src → $out (ratio $RATIO)"
  $CLI weld     "$src"          "$TMP/w.glb"  > /dev/null 2>&1
  $CLI simplify "$TMP/w.glb"    "$TMP/s.glb"  --ratio "$RATIO" --error "$ERROR" > /dev/null 2>&1
  $CLI webp     "$TMP/s.glb"    "$TMP/t.glb"  --quality "$QUALITY" > /dev/null 2>&1
  $CLI draco    "$TMP/t.glb"    "$out"        > /dev/null 2>&1
  printf '   %s → %s\n' \
    "$(du -h "$src" | cut -f1)" "$(du -h "$out" | cut -f1)"
}

build new-roaster-3.glb 10pro.opt.glb   # Typhoon 10 PRO
build new-roaster-2.glb 5pro.opt.glb    # Typhoon 5 PRO
build 2.5.glb           2pro.opt.glb    # Typhoon 2.5 PRO

echo
echo "Done. Verify mesh names still match config-*.json:"
echo "  python3 scripts/check-config-coverage.py"
