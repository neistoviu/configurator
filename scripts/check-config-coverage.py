#!/usr/bin/env python3
"""Verify the optimized GLBs still expose every mesh name the configurator
relies on.

Names are compared the way three.js sees them: GLTFLoader runs every node /
mesh name through PropertyBinding.sanitizeNodeName(), which turns whitespace
into "_" and strips [ ] . : / — so a glTF node called "Body1.1-RED MATTE"
reaches the page as "Body11-RED_MATTE", which is what config-*.json stores.

Checks per model:
  1. source GLB  vs  optimized GLB   — did the build drop or rename anything?
  2. config JSON vs  optimized GLB   — is every assigned mesh still present?

Run after scripts/build-models.sh.
"""
import json
import os
import re
import struct
import sys

TRIPLES = [
    ("config-10pro.json", "new-roaster-3.glb", "10pro.opt.glb"),
    ("config-5pro.json", "new-roaster-2.glb", "5pro.opt.glb"),
    ("config-2pro.json", "2.5.glb", "2pro.opt.glb"),
]
GROUPS = ("body", "accent", "glass", "steel", "wood", "skip")

_RESERVED_RE = re.compile(r"[\[\]\.:\/]")


def sanitize(name):
    """Mirror of THREE.PropertyBinding.sanitizeNodeName."""
    return _RESERVED_RE.sub("", re.sub(r"\s", "_", name))


def glb_mesh_names(path):
    """Sanitized names of every node that carries a mesh, plus mesh names."""
    with open(path, "rb") as f:
        f.read(12)
        chunk_len, _ = struct.unpack("<I4s", f.read(8))
        gltf = json.loads(f.read(chunk_len))
    names = set()
    for node in gltf.get("nodes", []):
        if "mesh" in node and node.get("name"):
            names.add(sanitize(node["name"]))
    for mesh in gltf.get("meshes", []):
        if mesh.get("name"):
            names.add(sanitize(mesh["name"]))
    return names


def main():
    os.chdir(os.path.join(os.path.dirname(__file__), ".."))
    failed = False

    for cfg_path, src_path, opt_path in TRIPLES:
        if not os.path.exists(opt_path):
            print(f"⚠  {opt_path} not built — skipping")
            continue

        cfg = json.load(open(cfg_path))
        opt = glb_mesh_names(opt_path)
        src = glb_mesh_names(src_path) if os.path.exists(src_path) else set()
        assigned = {n for g in GROUPS for n in cfg.get(g, [])}

        lost_by_build = sorted(src - opt)
        missing = sorted(assigned - opt)
        uncovered = sorted(opt - assigned)

        ok = not missing and not lost_by_build
        failed = failed or not ok
        print(f"\n{opt_path}: {'OK' if ok else 'BROKEN'}")
        print(f"   source {len(src)} → optimized {len(opt)} names; "
              f"config assigns {len(assigned)}")
        if lost_by_build:
            print(f"   ✗ dropped by build ({len(lost_by_build)}): {lost_by_build[:12]}")
        if missing:
            print(f"   ✗ in config but not in GLB ({len(missing)}): {missing[:12]}")
        if uncovered:
            print(f"   ·  in GLB but unassigned ({len(uncovered)}): {uncovered[:12]}")

    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
