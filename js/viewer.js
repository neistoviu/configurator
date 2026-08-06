// ─────────────────────────────────────────────────────────────────────────────
//  The 3D viewer: renderer, scene, camera, model loading and materials.
//
//  Two things here matter for speed:
//
//   1. Draw-call batching. The CAD export gives us 540 separate meshes on the
//      10 PRO, each one a draw call — twice over, because shadows re-draw the
//      scene. We collapse meshes that end up sharing a material into a single
//      merged mesh, which takes that from ~1080 calls per frame to a couple
//      dozen. Colour changes still work because a whole group shares one
//      material object.
//
//   2. Render on demand. Nothing moves most of the time, so we only draw a
//      frame when something actually changed.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  EnvironmentFactory, buildRoom, hideEnvOnlyFixtures,
  contactShadowTexture, loadEquirect,
} from './scene-presets.js';
import { SCENES } from './data.js';

const DRACO_PATH = 'https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/libs/draco/';
const MERGE_DRAW_CALLS = true;   // flip to false if a model ever renders wrong
const AUTO_SPIN_SPEED = 0.55;    // OrbitControls units (deg/frame at 60fps)

export class Viewer {
  constructor(canvasWrap) {
    this.wrap = canvasWrap;
    this.isCompact = window.matchMedia('(max-width: 768px)').matches;

    // ── Renderer ──
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isCompact,
      powerPreference: 'high-performance',
      stencil: false,
    });
    // The container can still be laid out at 0×0 on the first frame (hidden
    // tab, fonts pending). Falling back to 1 keeps the aspect ratio finite —
    // a NaN aspect silently produces a NaN camera and a black screen.
    const w0 = this.wrap.clientWidth || 1;
    const h0 = this.wrap.clientHeight || 1;

    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.isCompact ? 2 : 1.75));
    this.renderer.setSize(w0, h0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.wrap.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, w0 / h0, 0.05, 200);

    // ── Controls ──
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.75;
    this.controls.zoomSpeed = 0.8;
    // Stop just above the floor so the machine never floats over nothing.
    this.controls.minPolarAngle = 0.20 * Math.PI;
    this.controls.maxPolarAngle = 0.52 * Math.PI;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = AUTO_SPIN_SPEED;
    this.controls.addEventListener('change', () => this.invalidate());
    this.controls.addEventListener('start', () => {
      if (this.onUserInteract) this.onUserInteract();
    });

    // ── Lights (the env map does most of the work; these add shape) ──
    this.lightRig = new THREE.Group();
    this.scene.add(this.lightRig);

    this.key = new THREE.DirectionalLight(0xffffff, 3);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(this.isCompact ? 1024 : 2048, this.isCompact ? 1024 : 2048);
    this.key.shadow.bias = -0.0012;
    this.key.shadow.normalBias = 0.02;
    this.lightRig.add(this.key);
    this.lightRig.add(this.key.target);

    this.fill = new THREE.DirectionalLight(0xffffff, 1.2);
    this.rim = new THREE.DirectionalLight(0xffffff, 1.0);
    this.lightRig.add(this.fill, this.rim);

    // ── The room (rebuilt per scene preset) + contact shadow ──
    this.room = null;

    this.contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: contactShadowTexture(),
        transparent: true,
        depthWrite: false,
        opacity: 0.85,
      }),
    );
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.contactShadow.renderOrder = 1;
    this.scene.add(this.contactShadow);

    this.pivot = new THREE.Group();
    this.scene.add(this.pivot);

    // ── Loading ──
    const draco = new DRACOLoader().setDecoderPath(DRACO_PATH);
    this.loader = new GLTFLoader().setDRACOLoader(draco);
    this.dracoLoader = draco;

    this.envFactory = new EnvironmentFactory(this.renderer);

    // ── Recolourable material groups ──
    this.groupMaterials = { body: [], accent: [] };
    this.groupState = {
      body:   { hex: null, roughness: 0.62, metalness: 0.28 },
      accent: { hex: null, roughness: 0.60, metalness: 0.30 },
    };

    this.currentGltf = null;
    this.sceneKey = null;
    this.needsRender = true;
    this.stats = { drawMeshes: 0, triangles: 0, mergedFrom: 0 };

    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    // Catches the case where the container only gets its real size later.
    this._observer = new ResizeObserver(() => this.resize());
    this._observer.observe(this.wrap);
    this.renderer.setAnimationLoop(() => this._tick());
  }

  // ── Render loop ────────────────────────────────────────────────────────────

  invalidate() { this.needsRender = true; }

  _tick() {
    // Damping and auto-rotation both need a steady update; everything else
    // only redraws when something asked for it.
    const animating = this.controls.autoRotate || this.controls.enableDamping;
    if (animating) this.controls.update();
    if (this.needsRender || this.controls.autoRotate) {
      this.renderer.render(this.scene, this.camera);
      this.needsRender = false;
      if (this.onAfterRender) this.onAfterRender();
    }
  }

  setAutoRotate(on) {
    this.controls.autoRotate = on;
    this.invalidate();
  }

  resize() {
    const w = this.wrap.clientWidth;
    const h = this.wrap.clientHeight;
    if (!w || !h) return;
    const wasDegenerate = this.camera.aspect <= 0 || !Number.isFinite(this.camera.aspect);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    // If we framed the model against a bogus aspect, redo it now.
    if ((wasDegenerate || this._needsReframe) && this._lastSize) {
      this._needsReframe = false;
      this._frame(this._lastSize);
    }
    this.invalidate();
  }

  // ── Scene presets ──────────────────────────────────────────────────────────

  async applyScene(key) {
    const preset = SCENES[key];
    if (!preset) return;
    this.sceneKey = key;

    // Swap in the new room.
    if (this.room) {
      this.scene.remove(this.room);
      this.room.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (o.material.map) o.material.map.dispose();
          o.material.dispose();
        }
      });
    }
    this.room = buildRoom(preset);
    // Racking, sacks and shelving are hundreds of little boxes sharing a
    // handful of materials — collapse them the same way we do the machine.
    if (MERGE_DRAW_CALLS) this._mergeByMaterial(this.room);
    this.scene.add(this.room);

    // Lights first — the environment capture below renders the lit room.
    const apply = (light, spec) => {
      light.color.set(spec.color);
      light.intensity = spec.intensity;
      light.position.set(...spec.pos);
    };
    apply(this.key, preset.key);
    apply(this.fill, preset.fill);
    apply(this.rim, preset.rim);
    this.renderer.toneMappingExposure = preset.exposure ?? 1.1;

    // Reflections come from the room itself, with the product left out.
    this.scene.environment = preset.envUrl
      ? (await loadEquirect(this.renderer, preset.envUrl)).envMap
      : this.envFactory.capture(key, this.scene, [this.pivot, this.contactShadow]);
    this.scene.environmentIntensity = preset.envIntensity ?? 1;
    hideEnvOnlyFixtures(this.room);

    // The room encloses the camera, so no sky is needed behind it.
    this.scene.background = null;
    this.scene.fog = preset.fog
      ? new THREE.Fog(preset.fog.color, preset.fog.near, preset.fog.far)
      : null;

    this.invalidate();
  }

  /** Swings the whole light rig; drives the "Light" slider. */
  setLightAngle(deg) {
    this.lightRig.rotation.y = THREE.MathUtils.degToRad(deg);
    this.invalidate();
  }

  // ── Model loading ──────────────────────────────────────────────────────────

  /**
   * @param {string} url        optimized GLB
   * @param {object} cfg        config-*.json contents
   * @param {object} opts       { displayScale, onProgress }
   */
  loadModel(url, cfg, opts = {}) {
    this.cfg = cfg;
    this.clearModel();

    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        gltf => {
          try {
            this._install(gltf, cfg, opts);
            resolve(this.stats);
          } catch (err) {
            reject(err);
          }
        },
        xhr => {
          if (opts.onProgress && xhr.total) {
            opts.onProgress(Math.min(Math.round((xhr.loaded / xhr.total) * 100), 100));
          }
        },
        reject,
      );
    });
  }

  clearModel() {
    while (this.pivot.children.length) {
      const child = this.pivot.children[0];
      this.pivot.remove(child);
      child.traverse(o => {
        if (o.geometry) o.geometry.dispose();
      });
    }
    // Group materials are rebuilt per model.
    [...this.groupMaterials.body, ...this.groupMaterials.accent].forEach(m => m.dispose());
    this.groupMaterials.body = [];
    this.groupMaterials.accent = [];
    this.pivot.rotation.set(0, 0, 0);
    this.pivot.position.set(0, 0, 0);
    this.pivot.scale.set(1, 1, 1);
    this.currentGltf = null;
  }

  _install(gltf, cfg, opts) {
    const model = gltf.scene;
    // Box3.setFromObject deliberately does not refresh ancestor matrices, so
    // the pivot has to be flushed by hand — otherwise every measurement below
    // is taken against the *previous* model's offset and the machine drifts a
    // little further off the floor with each switch.
    this.pivot.position.set(0, 0, 0);
    this.pivot.rotation.set(0, 0, 0);
    this.pivot.updateMatrixWorld(true);

    this.pivot.add(model);
    this.currentGltf = gltf;

    // ── Shared materials, one per role ──
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc, roughness: this.groupState.body.roughness,
      metalness: this.groupState.body.metalness,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc, roughness: this.groupState.accent.roughness,
      metalness: this.groupState.accent.metalness,
    });
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xb9bcc0, metalness: 0.92, roughness: 0.28,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0.90, 0.95, 1.0),
      transmission: 0.92, transparent: true, opacity: 1,
      roughness: 0.10, metalness: 0, ior: 1.5, thickness: 1.2,
      attenuationColor: new THREE.Color(0.82, 0.94, 1.0),
      attenuationDistance: 14,
      envMapIntensity: 1.4, side: THREE.DoubleSide, depthWrite: false,
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x38200f, metalness: 0, roughness: 0.65,
    });

    this.groupMaterials.body = [bodyMat];
    this.groupMaterials.accent = [accentMat];

    const inBody   = new Set(cfg.body || []);
    const inAccent = new Set(cfg.accent || []);
    const inGlass  = new Set(cfg.glass || []);
    const inSteel  = new Set(cfg.steel || []);
    const inWood   = new Set(cfg.wood || []);
    const fixed    = cfg.fixedColors || {};

    // Materials cloned for a single mesh (textured or fixed-colour) are
    // deduplicated by signature so identical ones can still batch together.
    const uniqueMats = new Map();
    const dedupe = mat => {
      const sig = [
        mat.type, mat.color?.getHexString(), mat.metalness, mat.roughness,
        mat.map?.uuid ?? '-', mat.transparent, mat.opacity,
        mat.emissive?.getHexString() ?? '-',
      ].join('|');
      if (!uniqueMats.has(sig)) uniqueMats.set(sig, mat);
      return uniqueMats.get(sig);
    };

    const meshes = [];
    model.traverse(obj => {
      if (!obj.isMesh) return;
      meshes.push(obj);
      obj.castShadow = true;
      obj.receiveShadow = true;

      const name = obj.name;

      if (inGlass.has(name))      { obj.material = glassMat; obj.castShadow = false; return; }
      if (inSteel.has(name))      { obj.material = steelMat; return; }
      if (inWood.has(name))       { obj.material = woodMat;  return; }
      if (inBody.has(name))       { obj.material = bodyMat;  return; }
      if (inAccent.has(name))     { obj.material = accentMat; return; }

      // Everything else keeps its GLB look. Fixed colours are baked in here.
      const source = Array.isArray(obj.material) ? obj.material[0] : obj.material;
      const mat = source.clone();
      const fixedDef = fixed[name];
      if (fixedDef) {
        const isObj = typeof fixedDef === 'object';
        mat.color?.set(isObj ? fixedDef.color : fixedDef);
        mat.metalness = isObj && fixedDef.metalness !== undefined ? fixedDef.metalness : 0.25;
        mat.roughness = isObj && fixedDef.roughness !== undefined ? fixedDef.roughness : 0.55;
      }
      mat.needsUpdate = true;
      obj.material = dedupe(mat);
    });

    // Defaults from the config.
    if (cfg.defaultBodyHex)   this.setGroupColor('body', cfg.defaultBodyHex);
    if (cfg.defaultAccentHex) this.setGroupColor('accent', cfg.defaultAccentHex);

    // ── Centre, scale, frame ──
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const off = cfg.centerOffset || {};
    model.position.set(
      -center.x + (Number(off.x) || 0),
      -center.y + (Number(off.y) || 0),
      -center.z + (Number(off.z) || 0),
    );
    model.scale.setScalar(opts.displayScale || 1);
    // updateWorldMatrix(true, true) refreshes ancestors as well as descendants.
    // updateMatrixWorld() only walks down, which would leave the pivot's matrix
    // stale — and the merge below would then bake that staleness into vertices.
    model.updateWorldMatrix(true, true);

    this.stats.mergedFrom = meshes.length;
    this.stats.drawMeshes = MERGE_DRAW_CALLS
      ? this._mergeByMaterial(model)
      : meshes.length;

    // Sit the machine on the floor. The merge above added brand-new meshes
    // whose world matrices have never been computed, and Box3 would happily
    // measure them at the origin — so refresh from a known-zero pivot first.
    this.pivot.position.set(0, 0, 0);
    model.updateWorldMatrix(true, true);
    const finalBox = new THREE.Box3().setFromObject(model);
    const floorY = finalBox.min.y;
    const finalSize = finalBox.getSize(new THREE.Vector3());
    const finalCenter = finalBox.getCenter(new THREE.Vector3());
    this.pivot.position.y = -floorY;

    // The shadow rides with the machine so it stays put as the pivot turns.
    const footprint = Math.max(finalSize.x, finalSize.z);
    this.contactShadow.removeFromParent();
    this.pivot.add(this.contactShadow);
    this.contactShadow.scale.set(footprint * 1.9, footprint * 1.9, 1);
    this.contactShadow.position.set(finalCenter.x, floorY + 0.006, finalCenter.z);

    this._frame(finalSize);
    this._aimShadow(finalSize);

    this.pivot.rotation.y = THREE.MathUtils.degToRad(cfg.initialRotationY || 0);
    this.invalidate();
  }

  /**
   * Collapses every mesh that shares a material into one merged mesh.
   * Transparent materials are left alone so depth sorting stays correct.
   * @returns {number} how many meshes remain
   */
  _mergeByMaterial(model) {
    const buckets = new Map();
    let total = 0;
    // Ancestors included: `model` and its meshes must agree on world space, or
    // the relative matrix below picks up the difference and bakes it in.
    model.updateWorldMatrix(true, true);

    // Merged vertices are baked relative to `model`, not to the world, because
    // the merged mesh is re-parented under `model` and would otherwise pick up
    // its position and scale a second time.
    const toModelSpace = new THREE.Matrix4().copy(model.matrixWorld).invert();

    model.traverse(obj => {
      if (!obj.isMesh || !obj.geometry) return;
      total++;
      const mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
      if (!mat || mat.transparent || mat.transmission > 0) return;
      if (!buckets.has(mat)) buckets.set(mat, []);
      buckets.get(mat).push(obj);
    });

    let merged = 0;
    buckets.forEach((group, mat) => {
      if (group.length < 2) return;

      const geoms = [];
      for (const mesh of group) {
        const src = mesh.geometry;
        const pos = src.getAttribute('position');
        if (!pos) return;                       // bail out on this bucket
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', pos.clone());
        if (src.index) g.setIndex(src.index.clone());
        const nrm = src.getAttribute('normal');
        if (nrm) g.setAttribute('normal', nrm.clone());
        g.applyMatrix4(
          new THREE.Matrix4().multiplyMatrices(toModelSpace, mesh.matrixWorld));
        if (!nrm) g.computeVertexNormals();
        geoms.push(g);
      }
      if (geoms.length !== group.length) {
        geoms.forEach(g => g.dispose());
        return;
      }

      const combined = mergeGeometries(geoms, false);
      geoms.forEach(g => g.dispose());
      if (!combined) return;                    // attribute mismatch — keep originals

      const mesh = new THREE.Mesh(combined, mat);
      mesh.castShadow = group.some(m => m.castShadow);
      mesh.receiveShadow = group.some(m => m.receiveShadow);
      mesh.name = `merged:${group.length}`;
      model.add(mesh);

      group.forEach(old => {
        old.geometry.dispose();
        old.removeFromParent();
      });
      merged += group.length - 1;
    });

    return total - merged;
  }

  /**
   * Fits the machine to the viewport on both axes — a wide window needs a
   * different distance than a tall phone screen, so solve for each and take
   * whichever is further back.
   */
  _frame(size) {
    this._lastSize = size;
    const aspect = Number.isFinite(this.camera.aspect) && this.camera.aspect > 0
      ? this.camera.aspect : 1;
    const fovV = THREE.MathUtils.degToRad(this.camera.fov);
    const fovH = 2 * Math.atan(Math.tan(fovV / 2) * aspect);
    const distV = (size.y / 2) / Math.tan(fovV / 2);
    const distH = (Math.max(size.x, size.z) / 2) / Math.tan(fovH / 2);
    // Phones have far less room, so they get a tighter crop and the machine
    // sits a little lower in frame, clear of the floating controls.
    const pad = this.isCompact ? 1.24 : 1.38;
    const dist = Math.max(distV, distH) * pad;

    const targetY = size.y * (this.isCompact ? 0.58 : 0.52);
    this.controls.target.set(0, targetY, 0);
    // Slight three-quarter view — front-on hides the depth of the machine.
    this.camera.position.set(dist * 0.38, targetY + size.y * 0.22, dist * 0.90);
    this.controls.minDistance = dist * 0.4;
    this.controls.maxDistance = dist * 2.0;
    this.controls.update();
    this.controls.saveState();

    this.modelHeight = size.y;
  }

  _aimShadow(size) {
    const r = Math.max(size.x, size.y, size.z) * 1.1;
    const cam = this.key.shadow.camera;
    cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r;
    cam.near = 0.1; cam.far = r * 8;
    cam.updateProjectionMatrix();
    this.key.target.position.set(0, size.y * 0.4, 0);
  }

  // ── Colours ────────────────────────────────────────────────────────────────

  setGroupColor(group, hex) {
    const state = this.groupState[group];
    if (!state) return;
    state.hex = hex;
    const color = new THREE.Color().setStyle(hex);
    this.groupMaterials[group].forEach(m => {
      m.color.copy(color);
      m.needsUpdate = true;
    });
    this.invalidate();
  }

  getGroupColor(group) { return this.groupState[group]?.hex ?? null; }

  // ── Screen projection, for HTML hotspot markers ─────────────────────────────

  project(vec3) {
    const v = vec3.clone().project(this.camera);
    const rect = this.renderer.domElement.getBoundingClientRect();
    return {
      x: (v.x * 0.5 + 0.5) * rect.width,
      y: (-v.y * 0.5 + 0.5) * rect.height,
      behind: v.z > 1,
    };
  }

  /** True when the machine itself stands between the camera and the point. */
  isOccluded(worldPos, raycaster = this._ray || (this._ray = new THREE.Raycaster())) {
    const dir = worldPos.clone().sub(this.camera.position);
    const dist = dir.length();
    raycaster.set(this.camera.position, dir.normalize());
    raycaster.far = dist - 0.03;
    const hits = raycaster.intersectObject(this.pivot, true);
    return hits.length > 0;
  }

  worldFromLocal(arr) {
    const v = new THREE.Vector3(...arr);
    this.pivot.updateMatrixWorld(true);
    return this.pivot.localToWorld(v);
  }

  /**
   * Turns a face-relative anchor into a point that actually sits on the
   * machine's skin, so hotspots land on hardware instead of floating in the
   * air — and keep landing there if a model is ever re-exported.
   *
   * @param {{face:string, u:number, v:number}} anchor
   *        face: front | back | left | right | top; u,v: 0–1 across that face
   * @returns {number[]|null} pivot-local [x, y, z], nudged clear of the surface
   */
  /**
   * @param {{face:string, u:number, v:number}} anchor
   * @param {number} faceShift  quarter-turns to rotate side faces by, so that
   *        "front" means the machine's operator side on every model
   */
  anchorToLocal(anchor, faceShift = 0) {
    const model = this.pivot.children.find(c => c !== this.contactShadow);
    if (!model || !anchor) return null;

    // Work in the model's own axes, not the world's: the pivot carries the
    // opening camera rotation, and an anchor called "front" must mean the
    // machine's front regardless of how it happens to be turned right now.
    model.updateWorldMatrix(true, true);
    const toWorld = model.matrixWorld;
    const toLocal = new THREE.Matrix4().copy(toWorld).invert();
    const box = new THREE.Box3().setFromObject(model).applyMatrix4(toLocal);
    const size = box.getSize(new THREE.Vector3());
    const lerp = (a, b, t) => a + (b - a) * t;
    const pad = Math.max(size.x, size.y, size.z);

    // Start well outside the machine and shoot straight at it.
    let origin, dir;
    const { u, v } = anchor;
    const SIDES = ['front', 'right', 'back', 'left'];
    const face = anchor.face === 'top'
      ? 'top'
      : SIDES[(SIDES.indexOf(anchor.face) + faceShift + 4) % 4];

    if (face === 'top') {
      origin = new THREE.Vector3(
        lerp(box.min.x, box.max.x, u), box.max.y + pad, lerp(box.min.z, box.max.z, v));
      dir = new THREE.Vector3(0, -1, 0);
    } else if (face === 'front' || face === 'back') {
      const sign = face === 'front' ? 1 : -1;
      origin = new THREE.Vector3(
        lerp(box.min.x, box.max.x, u), lerp(box.min.y, box.max.y, v),
        sign > 0 ? box.max.z + pad : box.min.z - pad);
      dir = new THREE.Vector3(0, 0, -sign);
    } else {
      const sign = face === 'right' ? 1 : -1;
      origin = new THREE.Vector3(
        sign > 0 ? box.max.x + pad : box.min.x - pad,
        lerp(box.min.y, box.max.y, v), lerp(box.min.z, box.max.z, u));
      dir = new THREE.Vector3(-sign, 0, 0);
    }

    // Raycasting happens in world space, so carry the ray over.
    const worldOrigin = origin.clone().applyMatrix4(toWorld);
    const worldDir = dir.clone().transformDirection(toWorld).normalize();

    const ray = new THREE.Raycaster(worldOrigin, worldDir, 0, pad * 3);
    const hit = ray.intersectObject(model, true)[0];
    if (!hit) return null;

    // Lift the marker clear of the skin so it is not its own occluder.
    const out = hit.point.clone().add(worldDir.clone().multiplyScalar(-0.055));
    this.pivot.updateWorldMatrix(true, true);
    return this.pivot.worldToLocal(out).toArray().map(n => +n.toFixed(3));
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    this.renderer.setAnimationLoop(null);
    this.clearModel();
    this.envFactory.dispose();
    this.dracoLoader.dispose();
    this.controls.dispose();
    this.renderer.dispose();
  }
}

export { THREE };
