// ─────────────────────────────────────────────────────────────────────────────
//  Procedural rooms.
//
//  Each scene preset builds a real room around the machine — floor, walls,
//  windows, racking, a café counter — out of plain boxes and planes. Real
//  geometry rather than a flat photo backdrop, so the space keeps its
//  perspective as you orbit, the floor catches the machine's shadow, and the
//  windows genuinely light the steel.
//
//  Everything is generated in code: a scene costs ~0 KB and switches instantly.
//  Distance fog does the heavy lifting visually — it hides how coarse the far
//  end of the room is and keeps attention on the product.
//
//  To use a real photo instead, give a preset an `envUrl` pointing at an
//  equirectangular (2:1) image — see loadEquirect() at the bottom.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';

const ROOM = { width: 22, depth: 24, height: 6.4 };

// ── Small helpers ────────────────────────────────────────────────────────────

/** Soft radial blob used as a fake contact shadow under the machine. */
export function contactShadowTexture() {
  const size = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0.00, 'rgba(0,0,0,0.62)');
  grd.addColorStop(0.32, 'rgba(0,0,0,0.36)');
  grd.addColorStop(0.68, 'rgba(0,0,0,0.10)');
  grd.addColorStop(1.00, 'rgba(0,0,0,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Vertical gradient, used for wall shading so flat planes don't read as flat. */
function gradientTexture(stops) {
  const cv = document.createElement('canvas');
  cv.width = 4;
  cv.height = 256;
  const ctx = cv.getContext('2d');
  const grd = ctx.createLinearGradient(0, 0, 0, 256);
  stops.forEach((c, i) => grd.addColorStop(i / (stops.length - 1), c));
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const matte = (color, roughness = 0.9) =>
  new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness, metalness: 0.02 });

const glow = (color, power) =>
  new THREE.MeshBasicMaterial({
    color: new THREE.Color(color).multiplyScalar(power),
    toneMapped: false,
    side: THREE.DoubleSide,
  });

function box(w, h, d, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y + h / 2, z);
  return mesh;
}

// ── Set dressing ─────────────────────────────────────────────────────────────

/** Pallet racking with jute sacks — the read that says "roastery", not "office". */
function warehouseProps(group) {
  const frame = matte('#26292e', 0.8);
  const deck = matte('#34383e', 0.85);
  const jute = [matte('#6d5c3f', 0.98), matte('#5b4c33', 0.98), matte('#7d6a4a', 0.98)];
  const pallet = matte('#584a33', 0.98);

  for (const side of [-1, 1]) {
    for (let bay = 0; bay < 4; bay++) {
      const x = side * 9.4;
      const z = -9.5 + bay * 5.6;
      // Uprights.
      for (const dx of [-1.15, 1.15]) {
        for (const dz of [-1.15, 1.15]) {
          group.add(box(0.14, 4.6, 0.14, frame, x + dx, 0, z + dz));
        }
      }
      // Decks with sacks.
      for (let level = 0; level < 3; level++) {
        const y = 0.2 + level * 1.45;
        group.add(box(2.7, 0.08, 2.5, deck, x, y, z));
        for (let s = 0; s < 3; s++) {
          for (const dz of [-0.42, 0.42]) {
            const h = 0.38 + ((s + level + (dz > 0 ? 1 : 0)) % 3) * 0.05;
            group.add(box(0.8, h, 0.62, jute[(s + level) % 3],
              x - 0.88 + s * 0.88, y + 0.08, z + dz));
          }
        }
      }
    }
  }

  // Ceiling trusses.
  const truss = matte('#1e2126', 0.8);
  for (let i = 0; i < 6; i++) {
    group.add(box(ROOM.width - 2, 0.2, 0.26, truss, 0, ROOM.height - 0.9, -9.5 + i * 3.9));
  }

  // Pallets of green coffee behind the machine.
  for (let i = 0; i < 4; i++) {
    const x = -4.8 + i * 3.2;
    group.add(box(1.45, 0.14, 1.2, matte('#4a3f2c', 0.98), x, 0, -9.6));
    for (let level = 0; level < 3; level++) {
      for (const dz of [-0.3, 0.3]) {
        group.add(box(1.3, 0.36, 0.56, jute[(level + i) % 3], x, 0.14 + level * 0.36, -9.6 + dz));
      }
    }
  }

  // Extraction ducting overhead — instantly reads as a roasting plant.
  const duct = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, ROOM.depth - 3, 14, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x9aa0a8, metalness: 0.85, roughness: 0.42, side: THREE.DoubleSide,
    }),
  );
  duct.rotation.x = Math.PI / 2;
  duct.position.set(-3.6, ROOM.height - 1.5, -1);
  group.add(duct);
}

/** Bar, back shelving and seating. */
function cafeProps(group) {
  const woodDark = matte('#2c1f16', 0.8);
  const woodMid = matte('#43301f', 0.75);
  const stone = matte('#17140f', 0.55);
  const cup = matte('#d8cfc0', 0.8);
  const bag = matte('#8d6a4a', 0.9);

  // Service counter.
  group.add(box(8.4, 1.05, 0.9, woodDark, -1.8, 0, -6.2));
  group.add(box(8.6, 0.1, 1.02, stone, -1.8, 1.05, -6.2));

  // Back bar.
  group.add(box(9.6, 3.2, 0.32, matte('#2e211a', 0.85), -1.4, 0, -7.9));
  for (let level = 0; level < 3; level++) {
    const y = 0.95 + level * 0.78;
    group.add(box(8.8, 0.08, 0.5, woodMid, -1.4, y, -7.6));
    for (let i = 0; i < 11; i++) {
      const x = -5.6 + i * 0.86;
      group.add(level === 1
        ? box(0.22, 0.24, 0.22, cup, x, y + 0.08, -7.6)
        : box(0.26, 0.4, 0.2, bag, x, y + 0.08, -7.6));
    }
  }

  // Tables and chairs on the open side.
  for (let i = 0; i < 3; i++) {
    const z = -3.2 + i * 3.0;
    group.add(box(1.15, 0.74, 1.15, woodMid, 7.4, 0, z));
    group.add(box(0.42, 0.92, 0.42, woodDark, 6.4, 0, z));
    group.add(box(0.42, 0.92, 0.42, woodDark, 8.4, 0, z));
  }

  // Pendant cords so the lamps do not float.
  for (const x of [-2.4, 2.4]) {
    group.add(box(0.03, 1.6, 0.03, matte('#141414', 0.9), x, ROOM.height - 1.6, 1.4));
  }
}

// ── Room construction ────────────────────────────────────────────────────────

/**
 * Builds one room as a THREE.Group. It is added to the live scene, so the
 * machine really stands inside it.
 */
export function buildRoom(preset) {
  const room = new THREE.Group();
  room.name = 'room';

  const [wallTop, wallMid, wallLow] = preset.backdrop;

  // Floor.
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.width + 20, ROOM.depth + 20),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(preset.floor.color),
      roughness: preset.floor.roughness,
      metalness: preset.floor.metalness,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  room.add(floor);
  room.userData.floor = floor;

  // Walls — gradient-shaded so they read as lit surfaces, not paint chips.
  const wallMat = new THREE.MeshStandardMaterial({
    map: gradientTexture([wallTop, wallMid, wallLow]),
    roughness: 0.95,
    metalness: 0.0,
    side: THREE.FrontSide,
  });

  const back = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.width, ROOM.height), wallMat);
  back.position.set(0, ROOM.height / 2, -ROOM.depth / 2);
  back.receiveShadow = true;
  room.add(back);

  const front = back.clone();
  front.position.z = ROOM.depth / 2;
  front.rotation.y = Math.PI;
  room.add(front);

  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.depth, ROOM.height), wallMat);
    wall.position.set((side * ROOM.width) / 2, ROOM.height / 2, 0);
    wall.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    wall.receiveShadow = true;
    room.add(wall);
  }

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.width, ROOM.depth),
    matte(preset.ceiling || '#101216', 0.95),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ROOM.height;
  room.add(ceiling);

  if (preset.props === 'warehouse') warehouseProps(room);
  if (preset.props === 'cafe') cafeProps(room);

  // Emissive fixtures — these are what you see reflected in the machine.
  preset.lights.forEach(light => {
    let mesh;
    if (light.type === 'sphere') {
      mesh = new THREE.Mesh(
        new THREE.SphereGeometry(light.size[0], 18, 14),
        glow(light.color, light.power),
      );
    } else {
      mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(light.size[0], light.size[1]),
        glow(light.color, light.power),
      );
      if (light.faceDown) mesh.rotation.x = Math.PI / 2;
      else mesh.lookAt(new THREE.Vector3(0, light.pos[1], 0));
    }
    mesh.position.set(...light.pos);
    // Softboxes belong in the reflections, not in the shot. Marked fixtures are
    // captured into the environment map and then hidden from the camera, so the
    // steel keeps its highlights without a white rectangle in frame.
    if (preset.hideLights) mesh.userData.envOnly = true;
    room.add(mesh);
  });

  return room;
}

/** Hides fixtures flagged envOnly — call after the environment is captured. */
export function hideEnvOnlyFixtures(room) {
  room.traverse(o => {
    if (o.userData.envOnly) o.visible = false;
  });
}

/**
 * Renders the current scene (minus the product) into an environment map, so
 * reflections always agree with the room the visitor is looking at.
 * Cached per preset key — switching back is instant.
 */
export class EnvironmentFactory {
  constructor(renderer) {
    this.renderer = renderer;
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileEquirectangularShader();
    this.cache = new Map();
  }

  /**
   * @param {string} key      preset id
   * @param {THREE.Scene} scene  live scene, already holding the room
   * @param {THREE.Object3D[]} hide  objects to exclude (the product)
   */
  capture(key, scene, hide = []) {
    if (this.cache.has(key)) return this.cache.get(key);

    const restore = hide.map(o => [o, o.visible]);
    hide.forEach(o => { o.visible = false; });
    const prevEnv = scene.environment;
    const prevBg = scene.background;
    const prevFog = scene.fog;
    scene.environment = null;
    scene.background = null;
    scene.fog = null;

    const envMap = this.pmrem.fromScene(scene, 0.03, 0.2, 60).texture;

    scene.environment = prevEnv;
    scene.background = prevBg;
    scene.fog = prevFog;
    restore.forEach(([o, v]) => { o.visible = v; });

    this.cache.set(key, envMap);
    return envMap;
  }

  dispose() {
    this.cache.forEach(tex => tex.dispose());
    this.cache.clear();
    this.pmrem.dispose();
  }
}

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

export { ROOM };
