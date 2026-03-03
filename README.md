# Typhoon Roasters — 3D Configurator

Interactive 3D color configurator for Typhoon roasters. Built with [Three.js](https://threejs.org/).

## Files

| File | Description |
|------|-------------|
| `index.html` | **User-facing configurator** — color picker, model selector |
| `admin.html` | **Admin version** — mesh assignment console, config export |
| `config.json` | Material assignments (body / accent / glass / steel / wood) |
| `1.glb` | 3D model — Typhoon 10 PRO *(tracked via Git LFS)* |

## Adding new models

When `5.glb` (Typhoon 5 PRO) and `2.5.glb` (Typhoon 2.5 PRO) are ready:

1. Place files in the repo root
2. In `index.html`, remove the `disabled` class from the corresponding buttons:
   ```html
   <button class="model-btn" data-model="5pro">Typhoon 5 PRO</button>
   <button class="model-btn" data-model="2pro">Typhoon 2.5 PRO</button>
   ```

## Deployment

### GitHub Pages (recommended)

1. Install Git LFS (required for the `.glb` file):
   ```bash
   brew install git-lfs   # macOS
   git lfs install
   ```
2. Create a new repo on GitHub and push:
   ```bash
   cd typhoon-configurator
   git init
   git lfs install
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```
3. In GitHub → Settings → Pages → set source to `main` branch, root `/`
4. Site will be live at `https://YOUR_USERNAME.github.io/YOUR_REPO/`

### Self-hosted / any web server

Just upload all files to your web server — no build step needed.
The configurator is pure HTML/CSS/JS with no dependencies to install.

> **Note:** The `.glb` model must be served from the same domain as the HTML
> (or CORS headers must be configured). Do not open `index.html` directly as a
> local file — use a web server.

## Updating material assignments

1. Open `http://localhost:8765/admin.html`
2. Use the **⚙ CONSOLE** panel to reassign meshes
3. Click **⬇ Download config.json** to export
4. Replace `config.json` in the repo and push
