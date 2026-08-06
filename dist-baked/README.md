# Typhoon roasters — standalone 3D files

Three ready-to-publish models. The default paint (**RAL 1015 Light ivory** body,
**RAL 2002 Vermilion** accent) plus steel, glass, wood and all fixed-colour
parts are baked into each file, so they need no config file and no recolouring
code. Drop one into any glTF viewer and it looks the way the configurator looks.

| File | Size | Meshes | Triangles |
|------|------|--------|-----------|
| `typhoon-10pro.glb` | 1.4 MB | 11 | 441,161 |
| `typhoon-5pro.glb`  | 1.1 MB | 16 | 322,841 |
| `typhoon-2pro.glb`  | 968 KB | 14 | 283,579 |

Each model already faces front, stands on `y = 0`, and is centred on `x`/`z`, so
a viewer only has to frame it.

`preview.html` is a working example — open it on a local server to see all three,
or copy it as the starting point for a page.

---

## What was done to them

- Geometry simplified from ~1 M triangles per machine (CAD tessellation is far
  denser than a web page needs)
- Parts sharing a material merged together, so a machine draws in ~11–16 calls
  instead of ~540
- Textures converted to WebP, geometry compressed with Draco

---

## Putting one on a page

Compressed geometry needs the Draco decoder, which both options below load for
you.

**Option A — `<model-viewer>` (least code):**

```html
<script type="module"
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"></script>

<model-viewer
  src="/models/typhoon-5pro.glb"
  alt="Typhoon 5 PRO coffee roaster"
  camera-controls auto-rotate
  shadow-intensity="1"
  environment-image="neutral"
  style="width:100%; height:520px; background:#0b0c0f">
</model-viewer>
```

**Option B — Three.js:** copy `preview.html`. It handles the Draco decoder,
camera framing, orbit controls and the studio environment.

---

## Two things to watch

1. **Lighting is not in the file.** A glTF carries geometry and materials, not
   lights. Without an environment the steel and glass render flat and dark —
   `environment-image="neutral"` on `<model-viewer>`, or the `RoomEnvironment` in
   `preview.html`, is what makes them look like metal.

2. **Inside a Claude Artifact**, a published page cannot fetch files from
   another host, so a `src="https://…/model.glb"` will not load. Either host the
   page and the `.glb` on your own site, or embed the model as a `data:` URI in
   the page itself — at ~1 MB per model that works but makes the page heavy.

---

## Regenerating them

If the source models or the default colours change:

```bash
npx serve . -l 8788
# open http://localhost:8788/scripts/export-baked.html  → three files land in ~/Downloads
./scripts/bake-models.sh
```

The export page reuses the configurator's own material code, so these files
always match what the configurator shows.
