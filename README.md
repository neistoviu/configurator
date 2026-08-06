# Typhoon Roasters — 3D Configurator

Interactive 3D colour configurator for Typhoon roasters. A static HTML/CSS/JS
page built on Three.js — no build step, no framework, no bundler.

Visitors pick a model, turn it, and paint it in any RAL colour.

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | The page: markup, styles, and the loading screen |
| `js/data.js` | **Everything editable** — models, specs, backdrop, RAL palette, colour presets |
| `js/scene-presets.js` | Builds the backdrop, the floor and the reflection lightbox |
| `js/viewer.js` | Three.js: renderer, camera, model loading, materials, draw-call batching |
| `js/app.js` | Wires the UI together and handles the offer form |
| `admin.html` | Mesh-assignment console and config export |
| `config-*.json` | Which mesh belongs to which colour group, per model |
| `*.opt.glb` | The models the page actually loads |
| `legacy.html` | The previous single-file version, for side-by-side comparison. Not deployed |

**To change wording, numbers or colours, edit `js/data.js`.** Nothing
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

## How the backdrop works

There are no background images. The preset in `js/data.js` describes a seamless
gradient, a floor tint and a set of softboxes, and `js/scene-presets.js` renders
those softboxes into an environment map offscreen. The machine reflects them;
nothing but one floor disc is ever drawn to screen. It costs no download.

Grey rather than white on purpose — most Typhoon machines are painted pale, and
pale paint on a white sweep loses its edges.

**To use a real photo of your own roastery instead**, add `envUrl` to the preset
pointing at an equirectangular (2:1) image and the viewer will use it in place
of the procedural environment.

---

## What the viewer deliberately does not do

- **No zoom, no free orbit.** Dragging turns the machine on one axis and that is
  all; `_frame()` pins the polar angle to whatever framing chose. Free orbit
  mostly lets visitors end up under the floor, and a scroll-jacked page is worse
  than one that scrolls.
- **No clickable feature markers.** An earlier version pinned six of them to the
  machine. They cluttered the shot people came to look at, and keeping them
  glued to the geometry cost ~244 ms per frame — the roaster is the product,
  and the viewport is for looking at it.
- **No 3D room.** A procedural roastery and café were tried and dropped:
  primitives at that scale read as cheap and undercut the machine.

---

## On a phone

The machine gets the whole screen and the palette lives in a sheet that slides
up over it, so it can be pushed out of the way to look at the roaster or
photograph it. The chosen paint stays on screen in a badge over the viewport —
that is what makes a screenshot self-explanatory — and the machine lifts clear
of the sheet when it opens.

`--sheet-peek` and `--sheet-height` in `index.html` control the collapsed and
expanded sizes.

---

## Keeping it fast

- **Shadows are rendered on demand.** Only the camera orbits; the machine and
  the light rig stand still, so `shadowMap.autoUpdate` is off and the map is
  refreshed only when the model or the light angle changes.
- **Frames are drawn on demand** — nothing is rendered while nothing moves.
- **Meshes sharing a material are merged**, which takes the 10 PRO from ~1085
  draw calls to 27.

Steady frames cost well under a millisecond of main-thread time. If you add
anything that runs per frame, measure it before trusting it:

```js
const v = window.__typhoon.viewer;
const t0 = performance.now();
for (let i = 0; i < 30; i++) v.renderer.render(v.scene, v.camera);
console.log((performance.now() - t0) / 30, 'ms/frame');
```

---

## Deployment

Static site on Vercel; the project root is the output directory. `vercel.json`
marks the models as immutable so returning visitors never re-download them —
which means **a changed model must be given a new filename**, otherwise browsers
will keep serving the old one for a year.

`.vercelignore` keeps source GLBs, the legacy page, and local tooling out of
production.
