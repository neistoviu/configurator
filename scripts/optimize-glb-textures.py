#!/usr/bin/env python3
"""Create lighter GLB variants by recompressing embedded PNG textures.

The configurator models already use Draco for geometry, but each current model
contains the same large PNG texture. This script keeps geometry and mesh names
intact, replacing non-alpha embedded PNG images with JPEG.
"""

from __future__ import annotations

import argparse
import io
import json
import struct
from pathlib import Path

from PIL import Image


JSON_CHUNK = b"JSON"
BIN_CHUNK = b"BIN\x00"


def align4(data: bytes, pad: bytes = b"\x00") -> bytes:
    remainder = len(data) % 4
    if not remainder:
        return data
    return data + pad * (4 - remainder)


def read_glb(path: Path) -> tuple[dict, bytes]:
    data = path.read_bytes()
    if data[:4] != b"glTF":
        raise ValueError(f"{path} is not a GLB file")

    offset = 12
    doc = None
    binary = None

    while offset < len(data):
        chunk_len, chunk_type = struct.unpack_from("<I4s", data, offset)
        start = offset + 8
        chunk = data[start : start + chunk_len]
        if chunk_type == JSON_CHUNK:
            doc = json.loads(chunk.rstrip(b"\x00 ").decode("utf-8"))
        elif chunk_type == BIN_CHUNK:
            binary = bytes(chunk)
        offset = start + chunk_len

    if doc is None or binary is None:
        raise ValueError(f"{path} does not contain JSON and BIN chunks")

    return doc, binary


def write_glb(path: Path, doc: dict, binary: bytes) -> None:
    json_bytes = json.dumps(doc, separators=(",", ":")).encode("utf-8")
    json_chunk = align4(json_bytes, b" ")
    bin_chunk = align4(binary, b"\x00")
    total_len = 12 + 8 + len(json_chunk) + 8 + len(bin_chunk)

    with path.open("wb") as fh:
        fh.write(struct.pack("<4sII", b"glTF", 2, total_len))
        fh.write(struct.pack("<I4s", len(json_chunk), JSON_CHUNK))
        fh.write(json_chunk)
        fh.write(struct.pack("<I4s", len(bin_chunk), BIN_CHUNK))
        fh.write(bin_chunk)


def convert_png(data: bytes, quality: int, max_size: int | None) -> bytes:
    image = Image.open(io.BytesIO(data))
    has_alpha = image.mode in ("RGBA", "LA") or (
        image.mode == "P" and "transparency" in image.info
    )
    if has_alpha:
        return data

    image = image.convert("RGB")
    if max_size and max(image.size) > max_size:
        scale = max_size / max(image.size)
        image = image.resize(
            (round(image.width * scale), round(image.height * scale)),
            Image.Resampling.LANCZOS,
        )

    out = io.BytesIO()
    image.save(out, format="JPEG", quality=quality, optimize=True, progressive=True)
    return out.getvalue()


def optimize_glb(src: Path, dest: Path, quality: int, max_size: int | None) -> None:
    doc, binary = read_glb(src)
    buffer_views = doc.get("bufferViews", [])
    images = doc.get("images", [])

    replacements: dict[int, bytes] = {}
    for image in images:
        if image.get("mimeType") != "image/png" or "bufferView" not in image:
            continue
        view_index = image["bufferView"]
        view = buffer_views[view_index]
        start = view.get("byteOffset", 0)
        end = start + view["byteLength"]
        converted = convert_png(binary[start:end], quality, max_size)
        if converted != binary[start:end]:
            replacements[view_index] = converted
            image["mimeType"] = "image/jpeg"

    if not replacements:
        dest.write_bytes(src.read_bytes())
        return

    new_binary = bytearray()
    for index, view in enumerate(buffer_views):
        while len(new_binary) % 4:
            new_binary.append(0)
        old_start = view.get("byteOffset", 0)
        old_end = old_start + view["byteLength"]
        chunk = replacements.get(index, binary[old_start:old_end])
        view["byteOffset"] = len(new_binary)
        view["byteLength"] = len(chunk)
        new_binary.extend(chunk)

    while len(new_binary) % 4:
        new_binary.append(0)

    doc["buffers"][0]["byteLength"] = len(new_binary)
    dest.parent.mkdir(parents=True, exist_ok=True)
    write_glb(dest, doc, bytes(new_binary))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("dest", type=Path)
    parser.add_argument("--quality", type=int, default=85)
    parser.add_argument("--max-size", type=int)
    args = parser.parse_args()

    optimize_glb(args.source, args.dest, args.quality, args.max_size)


if __name__ == "__main__":
    main()
