# Typhoon Roasters — 3D Configurator

Interactive 3D colour configurator for Typhoon roasters. A static HTML/CSS/JS
page built on Three.js — no build step, no framework, no bundler.

Visitors pick a model, paint it in any RAL colour, place it in a roastery or a
café, and open feature cards pinned to the machine itself.

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | The page: markup, styles, and the loading screen |
| `js/data.js` | **Everything editable** — models, specs, hotspot copy, scenes, RAL palette, colour presets |
| `js/scene-presets.js` | Builds the procedural rooms (studio / roastery / café) |
| `js/viewer.js` | Three.js: renderer, camera, model loading, materials, draw-call batching |
| `js/hotspots.js` | HTML markers pinned to points on the model, plus the placement editor |
| `js/app.js` | Wires the UI together and handles the offer form |
| `admin.html` | Mesh-assignment console and config export |
| `config-*.json` | Which mesh belongs to which colour group, per model |
| `*.opt.glb` | The models the page actually loads |
| `legacy.html` | The previous single-file version, for side-by-side comparison. Not deployed |

**To change wording, numbers, colours or scenes, edit `js/data.js`.** Nothing
else needs touching for content changes.

---

## Running it locally

Do not open `index.html` from the file system — GLB and config loading need a
web server.

```bash
npx serve . -l 8788
```

Then open:

- Configurator — <http://localhost:8788/>
- Old version, for comparison — <http://localhost:8788/legacy.html>
- Mesh admin — <http://localhost:8788/admin.html>

### URL parameters

| Parameter | Effect |
|-----------|--------|
| `?model=10pro` · `5pro` · `2pro` | Opens on that machine |
| `?scene=studio` · `roastery` · `cafe` | Opens in that room |
| `?edit=hotspots` | Hotspot placement mode — click the model to capture points |

---

## Building the models

Source GLBs are CAD exports: over a million triangles each, and hundreds of
separate parts. `scripts/build-models.sh` cuts them down without touching mesh
names, so `config-*.json` keeps working:

```bash
./scripts/build-models.sh
python3 scripts/check-config-coverage.py
```

The pipeline is weld → simplify → WebP textures → Draco.

Then confirm in a browser that nothing was renamed — this is the check that
actually matters, because Three.js generates the `_1`, `_2` name suffixes at
load time and only a real load can prove they still line up:

<http://localhost:8788/scripts/verify-mesh-names.html> — every model must
report **PARITY**.

Pass a different ratio to trade size against detail (default `0.25`):

```bash
./scripts/build-models.sh 0.4
```

Source files (`new-roaster-*.glb`, `2.5.glb`) stay in the repo for rollback and
are excluded from deploys.

---

## How the scenes work

There are no background images. Each preset in `js/data.js` describes a room —
wall colours, floor, fog, light fixtures, and which set dressing to use — and
`js/scene-presets.js` builds it out of boxes and planes at runtime. That room is
then rendered once into an environment map, so what the steel reflects always
matches the room you can see behind it.

The upshot: a scene costs no download at all and switches instantly.

**To use a real photo of your own roastery instead**, add `envUrl` to a preset
pointing at an equirectangular (2:1) image and the viewer will use it in place
of the procedural environment.

---

## How hotspots stay attached

`HOTSPOT_ANCHORS` in `js/data.js` does not store coordinates. It names a face of
the machine and a position across it, and at load time the viewer fires a ray at
that spot and pins the marker to whatever hardware it hits — so markers survive
a model being re-exported.

To place one by hand instead, open `?edit=hotspots`, click the model, and paste
the printed block into `HOTSPOT_POSITIONS`. Explicit positions win over anchors.

`MODELS[].frontFace` tells the viewer which way each machine faces. If a
re-exported model comes back turned around, correcting that one value fixes the
opening camera angle and every hotspot at once.

---

## Deployment

Static site on Vercel; the project root is the output directory. `vercel.json`
marks the models as immutable so returning visitors never re-download them —
which means **a changed model must be given a new filename**, otherwise browsers
will keep serving the old one for a year.

`.vercelignore` keeps source GLBs, the legacy page, and local tooling out of
production.
