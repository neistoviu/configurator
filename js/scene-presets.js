// ─────────────────────────────────────────────────────────────────────────────
//  Backdrops.
//
//  A product configurator is a photo studio, not a diorama: the machine is the
//  subject and everything else exists to light it and get out of the way. So a
//  backdrop here is a seamless gradient, a floor that dissolves into it, and a
//  set of softboxes that live only in the reflections.
//
//  Nothing is downloaded — a backdrop costs ~0 KB and switches instantly.
//  Nothing is added to the scene except one floor disc, so there is no set
//  dressing to render, light or cast shadows.
//
//  To use a real photo instead, give a preset an `envUrl` pointing at an
//  equirectangular (2:1) image — see loadEquirect() at the bottom.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';

const FLOOR_RADIUS = 14;

// ── Canvas helpers ───────────────────────────────────────────────────────────

function canvasTexture(cv) {
  const tex = new THREE.CanvasTexture(cv);
  // Canvas holds sRGB values. Without saying so, everything renders washed out.
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Vertical gradient — the seamless backdrop behind the machine. */
function gradientTexture(stops) {
  const cv = document.createElement('canvas');
  cv.width = 8;
  cv.height = 512;
  const ctx = cv.getContext('2d');
  const grd = ctx.createLinearGradient(0, 0, 0, 512);
  stops.forEach((c, i) => grd.addColorStop(i / (stops.length - 1), c));
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 8, 512);
  return canvasTexture(cv);
}

/** Soft blob under the machine — reads as ambient occlusion against the floor. */
export function contactShadowTexture() {
  const size = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0.00, 'rgba(0,0,0,0.50)');
  grd.addColorStop(0.34, 'rgba(0,0,0,0.28)');
  grd.addColorStop(0.70, 'rgba(0,0,0,0.07)');
  grd.addColorStop(1.00, 'rgba(0,0,0,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  return canvasTexture(cv);
}

/**
 * Radial fade used as the floor's alpha. The disc is opaque under the machine
 * and gone by its rim, so the floor melts into the backdrop instead of ending
 * at a hard horizon line.
 */
function floorFadeTexture() {
  const size = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0.00, '#ffffff');
  grd.addColorStop(0.34, '#ffffff');
  grd.addColorStop(0.72, '#6e6e6e');
  grd.addColorStop(1.00, '#000000');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.NoColorSpace;   // read as a mask, not as colour
  return tex;
}

// ── Floor ────────────────────────────────────────────────────────────────────

/** One disc, created once and re-tinted per preset. */
export function buildFloor() {
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(FLOOR_RADIUS, 64),
    new THREE.MeshStandardMaterial({
      color: 0xe9ebef,
      roughness: 0.6,
      metalness: 0.05,
      transparent: true,
      alphaMap: floorFadeTexture(),
      depthWrite: false,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.name = 'floor';
  return floor;
}

// ── Environment ──────────────────────────────────────────────────────────────

/**
 * A miniature studio, rendered offscreen only. Its softboxes are what the
 * steel and glass reflect; none of it is ever drawn to the screen, so the
 * frame cost is zero.
 */
function buildLightbox(preset) {
  const room = new THREE.Scene();

  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(24, 24, 18),
    new THREE.MeshBasicMaterial({
      map: gradientTexture(preset.env || preset.backdrop),
      side: THREE.BackSide,
      toneMapped: false,
    }),
  );
  room.add(shell);

  preset.lights.forEach(light => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(light.size[0], light.size[1]),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(light.color).multiplyScalar(light.power),
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    mesh.position.set(...light.pos);
    if (light.faceDown) mesh.rotation.x = Math.PI / 2;
    else mesh.lookAt(new THREE.Vector3(0, light.pos[1], 0));
    room.add(mesh);
  });

  return room;
}

/** Renders each preset's lightbox into an environment map, cached by key. */
export class EnvironmentFactory {
  constructor(renderer) {
    this.renderer = renderer;
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileEquirectangularShader();
    this.cache = new Map();
    this.rooms = [];
  }

  get(key, preset) {
    if (this.cache.has(key)) return this.cache.get(key);
    const room = buildLightbox(preset);
    const envMap = this.pmrem.fromScene(room, 0.02, 0.5, 60).texture;
    this.rooms.push(room);
    this.cache.set(key, envMap);
    return envMap;
  }

  dispose() {
    this.cache.forEach(tex => tex.dispose());
    this.cache.clear();
    this.rooms.forEach(room => room.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (o.material.map) o.material.map.dispose();
        o.material.dispose();
      }
    }));
    this.rooms = [];
    this.pmrem.dispose();
  }
}

export { gradientTexture };

/**
 * Optional escape hatch: load a real equirectangular photo or HDRI as the
 * environment. Wire it up by adding `envUrl` to a preset in data.js.
 */
export function loadEquirect(renderer, url) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, texture => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      const envMap = pmrem.fromEquirectangular(texture).texture;
      pmrem.dispose();
      resolve({ background: texture, envMap });
    }, undefined, reject);
  });
}
