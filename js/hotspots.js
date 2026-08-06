// ─────────────────────────────────────────────────────────────────────────────
//  Hotspots — HTML markers pinned to points on the 3D model.
//
//  The markers are plain DOM, not 3D objects: they stay crisp at any zoom, are
//  readable by screen readers, and cost nothing to style. Every rendered frame
//  we project their world position to screen space and move them.
//
//  Place or re-place them with ?edit=hotspots — see HotspotEditor at the bottom.
// ─────────────────────────────────────────────────────────────────────────────
import { FEATURES, HOTSPOT_ANCHORS, HOTSPOT_POSITIONS } from './data.js';

export class Hotspots {
  /**
   * @param {HTMLElement} layer  overlay element sitting on top of the canvas
   * @param {import('./viewer.js').Viewer} viewer
   */
  constructor(layer, viewer) {
    this.layer = layer;
    this.viewer = viewer;
    this.items = [];
    this.openId = null;
    this.visible = true;

    // Close on outside click / Esc.
    this.layer.addEventListener('click', e => {
      if (e.target === this.layer) this.close();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.close();
    });
  }

  setModel(modelKey, faceShift = 0) {
    this.clear();
    const anchors = HOTSPOT_ANCHORS[modelKey] || {};
    const overrides = HOTSPOT_POSITIONS[modelKey] || {};

    // Resolve each anchor against the loaded geometry; drop any that miss.
    const positions = {};
    Object.keys({ ...anchors, ...overrides }).forEach(id => {
      const pos = overrides[id] || this.viewer.anchorToLocal(anchors[id], faceShift);
      if (pos) positions[id] = pos;
      else console.warn(`[typhoon] hotspot "${id}" found no surface — skipped`);
    });

    Object.entries(positions).forEach(([id, pos], index) => {
      const feature = FEATURES[id];
      if (!feature) return;

      const el = document.createElement('div');
      el.className = 'hs enter';
      el.innerHTML = `
        <button class="hs-dot" type="button"
                aria-expanded="false" aria-label="${feature.title}">
          <span class="hs-glyph">${feature.icon}</span>
          <span class="hs-ring"></span>
        </button>
        <div class="hs-card" role="dialog" aria-label="${feature.title}">
          <div class="hs-card-metric">${feature.metric}</div>
          <h3 class="hs-card-title">${feature.title}</h3>
          <p class="hs-card-text">${feature.text}</p>
        </div>`;
      el.style.setProperty('--i', index);

      const dot = el.querySelector('.hs-dot');
      dot.addEventListener('click', event => {
        event.stopPropagation();
        this.toggle(id);
      });

      this.layer.appendChild(el);
      this.items.push({ id, el, dot, world: this.viewer.worldFromLocal(pos), local: pos });
    });

    // Drop the entrance class once it has had its moment, so a throttled tab
    // can never strand a marker on the animation's first frame.
    clearTimeout(this._enterTimer);
    this._enterTimer = setTimeout(() => {
      this.items.forEach(item => item.el.classList.remove('enter'));
    }, 1400);

    this.update();
  }

  clear() {
    this.items.forEach(item => item.el.remove());
    this.items = [];
    this.openId = null;
  }

  toggle(id) {
    this.openId = this.openId === id ? null : id;
    this.items.forEach(item => {
      const open = item.id === this.openId;
      item.el.classList.toggle('open', open);
      item.el.classList.toggle('muted', Boolean(this.openId) && !open);
      item.dot.setAttribute('aria-expanded', String(open));
    });
    // A card that drifts across the screen while you read it is unusable.
    if (this.onOpenChange) this.onOpenChange(Boolean(this.openId));
    this.viewer.invalidate();
  }

  close() {
    if (!this.openId) return;
    this.toggle(this.openId);
  }

  setVisible(on) {
    this.visible = on;
    this.layer.classList.toggle('hidden', !on);
    if (!on) this.close();
    this.viewer.invalidate();
  }

  /** Called after every render; keeps markers glued to the machine. */
  update() {
    if (!this.visible || !this.items.length) return;
    const rect = this.layer.getBoundingClientRect();

    for (const item of this.items) {
      // The pivot rotates, so recompute world position each frame.
      item.world = this.viewer.worldFromLocal(item.local);
      const p = this.viewer.project(item.world);

      const off = p.behind
        || p.x < -40 || p.y < -40
        || p.x > rect.width + 40 || p.y > rect.height + 40;

      if (off) {
        item.el.style.display = 'none';
        continue;
      }
      item.el.style.display = '';
      item.el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;

      // Dim markers that have rotated behind the machine.
      const hidden = this.viewer.isOccluded(item.world);
      item.el.classList.toggle('behind', hidden && item.id !== this.openId);

      // Flip the card to whichever side has room.
      item.el.classList.toggle('flip-x', p.x > rect.width * 0.58);
      item.el.classList.toggle('flip-y', p.y > rect.height * 0.62);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Editor mode: open the page with ?edit=hotspots, click anywhere on the
//  machine, and it prints a block ready to paste into HOTSPOT_POSITIONS.
// ─────────────────────────────────────────────────────────────────────────────
export class HotspotEditor {
  constructor(viewer, modelKey, THREE) {
    this.viewer = viewer;
    this.modelKey = modelKey;
    this.THREE = THREE;
    this.points = [];
    this.raycaster = new THREE.Raycaster();

    this.panel = document.createElement('div');
    this.panel.className = 'hs-editor';
    this.panel.innerHTML = `
      <div class="hs-editor-h">Hotspot editor — ${modelKey}</div>
      <p class="hs-editor-hint">Click the model to capture a point.
         Shift-click a row to delete it.</p>
      <pre class="hs-editor-out" id="hs-out">(no points yet)</pre>
      <button class="hs-editor-copy" type="button">Copy JSON</button>`;
    document.body.appendChild(this.panel);

    this.out = this.panel.querySelector('#hs-out');
    this.panel.querySelector('.hs-editor-copy').addEventListener('click', () => {
      navigator.clipboard.writeText(this.out.textContent);
    });

    viewer.renderer.domElement.addEventListener('pointerdown', e => this._pick(e));
  }

  _pick(event) {
    const rect = this.viewer.renderer.domElement.getBoundingClientRect();
    const ndc = new this.THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.viewer.camera);
    const hit = this.raycaster.intersectObject(this.viewer.pivot, true)[0];
    if (!hit) return;

    // Store in pivot-local space so the value survives auto-rotation.
    const local = this.viewer.pivot.worldToLocal(hit.point.clone());
    this.points.push([
      Number(local.x.toFixed(3)),
      Number(local.y.toFixed(3)),
      Number(local.z.toFixed(3)),
    ]);
    this._render();
  }

  _render() {
    const keys = Object.keys(FEATURES);
    const lines = this.points.map((p, i) => {
      const key = keys[i] || `slot${i}`;
      return `    ${key}:${' '.repeat(Math.max(1, 12 - key.length))}[${p.join(', ')}],`;
    });
    this.out.textContent = `  '${this.modelKey}': {\n${lines.join('\n')}\n  },`;
  }
}
