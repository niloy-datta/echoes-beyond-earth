/**
 * 3D models of the spacecraft in the stories. Each has a simplified ORIGINAL in-code stand-in (recognisable silhouettes,
 * not engineering replicas) that renders immediately. Where NASA publishes a model (Apollo LM, Viking, InSight, Ingenuity,
 * Opportunity, Perseverance as the rover beside Ingenuity; LRO/MRO as orbiters — see public/models/nasa/CREDITS.md) `upgrade()` loads NASA's GLB and swaps it in;
 * if loading fails the stand-in simply stays.
 *
 * All sizes are real-world metres so lighting, shadows and camera framing behave consistently.
 */
import * as THREE from "three";
import type { HardwareKind } from "../core/types.ts";
import { canvasTexture, foilTexture } from "./kit.ts";

export interface Hardware {
  root: THREE.Group;
  /** footprint radius and overall height in metres (for camera framing) */
  radius: number;
  height: number;
  /** rocket nozzle positions (local) — flames attach here during descent */
  nozzles: THREE.Vector3[];
  parts: Record<string, THREE.Object3D>;
  /** power 1 = working, 0 = silent. t = seconds, dt = frame delta */
  update(t: number, dt: number, power: number): void;
  /** 0 = clean panels, 1 = buried in dust */
  setDust(k: number): void;
  /** optional async upgrade (e.g. NASA's GLB) */
  upgrade?: (assetBase: string) => Promise<void>;
  dispose(): void;
}

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/**
 * Load a NASA 3D Resources GLB (public domain; NASA/JPL/Ames models vendored in public/models/nasa) through the
 * same-origin Draco decoder. Returns the scene wrapped in a group, untouched except for shadows.
 */
export async function loadGlb(url: string, decoderPath: string): Promise<THREE.Group> {
  const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([
    import("three/examples/jsm/loaders/GLTFLoader.js"),
    import("three/examples/jsm/loaders/DRACOLoader.js"),
  ]);
  const draco = new DRACOLoader();
  draco.setDecoderPath(decoderPath);
  draco.setDecoderConfig({ type: "wasm" });
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  try {
    const gltf = await loader.loadAsync(url);
    const g = new THREE.Group();
    g.add(gltf.scene);
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true; m.receiveShadow = true;
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat && "roughness" in mat) mat.roughness = Math.max(mat.roughness, 0.4);
      }
    });
    return g;
  } finally {
    draco.dispose();
  }
}

/** Scale `g` uniformly so its largest dimension is `size` metres, and stand it on y = 0, centred in x/z. */
export function fitModel(g: THREE.Object3D, size: number) {
  const box = new THREE.Box3().setFromObject(g);
  const d = box.getSize(new THREE.Vector3());
  g.scale.multiplyScalar(size / Math.max(d.x, d.y, d.z, 1e-3));
  const fitted = new THREE.Box3().setFromObject(g);
  const c = fitted.getCenter(new THREE.Vector3());
  g.position.x -= c.x; g.position.z -= c.z; g.position.y -= fitted.min.y;
}


/** Make a loaded GLB react to `setDust`: clone its materials once and blend their colours toward Mars dust. */
function dustable(model: THREE.Object3D, prev: (k: number) => void, dust = 0xb68a60) {
  const mats: Array<{ m: THREE.MeshStandardMaterial; c: THREE.Color }> = [];
  model.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const cloned = list.map((mm) => {
      const c = mm.clone() as THREE.MeshStandardMaterial;
      if (c.color) mats.push({ m: c, c: c.color.clone() });
      return c;
    });
    mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0];
  });
  const target = new THREE.Color(dust);
  return (k: number) => {
    prev(k);
    for (const e of mats) e.m.color.copy(e.c).lerp(target, Math.min(1, k) * 0.7);
  };
}

function std(color: number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.2, ...o });
}

let solarTex: THREE.CanvasTexture | null = null;
function solarTexture() {
  solarTex ??= canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = "#1b3466"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#6a92d4"; g.lineWidth = 1.4;
    for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo((i * w) / 8, 0); g.lineTo((i * w) / 8, h); g.stroke(); g.beginPath(); g.moveTo(0, (i * h) / 8); g.lineTo(w, (i * h) / 8); g.stroke(); }
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "rgba(120,160,255,0.22)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  return solarTex;
}

class Kit {
  readonly gold = std(0xc89b3c, { metalness: 0.95, roughness: 0.38, bumpMap: foilTexture(), bumpScale: 2.2 });
  readonly silver = std(0xc9ccd1, { metalness: 0.85, roughness: 0.32 });
  readonly alu = std(0xaeb3ba, { metalness: 0.7, roughness: 0.45 });
  readonly white = std(0xe8e6e0, { roughness: 0.6, metalness: 0.05 });
  readonly graphite = std(0x34363a, { roughness: 0.65, metalness: 0.35 });
  readonly black = std(0x0e0e10, { roughness: 0.8, metalness: 0.1 });
  readonly bronze = std(0x9b6b3b, { metalness: 0.8, roughness: 0.42 });
  readonly solar = new THREE.MeshStandardMaterial({ map: solarTexture(), color: 0xffffff, roughness: 0.28, metalness: 0.65 });
  readonly led = new THREE.MeshStandardMaterial({ color: 0x0b3a40, emissive: 0x63e6ef, emissiveIntensity: 2, roughness: 0.3 });
  readonly glass = std(0x0a1017, { metalness: 0.9, roughness: 0.15 });
  readonly orange = std(0xe0662f, { roughness: 0.6 });
  private readonly solarClean = new THREE.Color(0xffffff);
  private readonly dustColor = new THREE.Color(0xa07650);
  dust(k: number) { this.solar.color.copy(this.solarClean).lerp(this.dustColor, k); this.solar.roughness = 0.28 + 0.6 * k; this.solar.metalness = 0.65 - 0.55 * k; }
  /** panels share one material per model so `setDust` affects all of them */
}

const add = (p: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, cast = true) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = cast; m.receiveShadow = true;
  p.add(m);
  return m;
};
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt: number, rb: number, h: number, seg = 20) => new THREE.CylinderGeometry(rt, rb, h, seg);

const Y = V(0, 1, 0);
/** A cylinder strut from a to b. */
function strut(parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material) {
  const len = a.distanceTo(b);
  const m = new THREE.Mesh(cyl(r, r, len, 8), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(Y, b.clone().sub(a).normalize());
  m.castShadow = true;
  parent.add(m);
  return m;
}

function dish(parent: THREE.Object3D, radius: number, mat: THREE.Material, x: number, y: number, z: number, tiltX = 0, tiltY = 0) {
  const g = new THREE.Group();
  const bowl = add(g, new THREE.SphereGeometry(radius, 24, 8, 0, Math.PI * 2, 0, 0.55), mat, 0, 0, 0);
  bowl.rotation.x = Math.PI; // concave side up
  bowl.scale.y = 0.55;
  (bowl.material as THREE.Material).side = THREE.DoubleSide;
  add(g, cyl(radius * 0.03, radius * 0.03, radius * 0.5, 8), mat, 0, radius * 0.22, 0);
  add(g, cyl(radius * 0.07, radius * 0.07, radius * 0.12, 8), mat, 0, radius * 0.5, 0);
  g.position.set(x, y, z);
  g.rotation.set(tiltX, tiltY, 0);
  parent.add(g);
  return g;
}

function wheel(r: number, w: number, mat: THREE.Material) {
  const g = new THREE.Group();
  const tyre = add(g, cyl(r, r, w, 20), mat);
  tyre.rotation.z = Math.PI / 2;
  const hub = add(g, cyl(r * 0.5, r * 0.5, w * 1.04, 10), new THREE.MeshStandardMaterial({ color: 0x9a9fa6, metalness: 0.8, roughness: 0.4 }));
  hub.rotation.z = Math.PI / 2;
  for (let i = 0; i < 12; i++) { // grousers
    const gr = add(g, box(w * 1.05, r * 0.14, r * 0.12), mat, 0, 0, 0, false);
    gr.rotation.x = (i / 12) * Math.PI * 2;
    gr.position.set(0, Math.cos(gr.rotation.x) * r, Math.sin(gr.rotation.x) * r);
    gr.rotation.x = -gr.rotation.x;
  }
  return g;
}

interface Base { root: THREE.Group; kit: Kit; parts: Record<string, THREE.Object3D>; nozzles: THREE.Vector3[]; }
function base(): Base { return { root: new THREE.Group(), kit: new Kit(), parts: {}, nozzles: [] }; }
function finish(b: Base, radius: number, height: number, update: Hardware["update"], extra: Partial<Hardware> = {}): Hardware {
  b.root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return {
    root: b.root, radius, height, nozzles: b.nozzles, parts: b.parts, update, setDust: (k) => b.kit.dust(k),
    dispose: () => b.root.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); }),
    ...extra,
  };
}

// ───────────────────────────── Apollo Lunar Module ─────────────────────────────
function lunarModule(): Hardware {
  const b = base();
  const { kit, root } = b;
  const body = new THREE.Group();
  root.add(body);
  const oct = add(body, cyl(2.15, 2.15, 1.7, 8), kit.gold, 0, 2.55, 0);
  oct.rotation.y = Math.PI / 8;
  const deck = add(body, cyl(2.0, 2.0, 0.12, 8), kit.graphite, 0, 3.45, 0); deck.rotation.y = Math.PI / 8;
  add(body, new THREE.ConeGeometry(0.62, 0.9, 20, 1, true), kit.black, 0, 1.25, 0).rotation.x = Math.PI;
  // legs
  const legAngles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
  legAngles.forEach((a, i) => {
    const c = Math.cos(a), s = Math.sin(a);
    const top = V(c * 2.0, 2.95, s * 2.0), foot = V(c * 4.45, 0.18, s * 4.45), mid = V(c * 3.2, 1.2, s * 3.2);
    strut(body, top, foot, 0.07, kit.alu);
    strut(body, V(c * 1.9, 1.95, s * 1.9), mid, 0.05, kit.alu);
    // lateral braces to the neighbouring leg joint
    const a2 = a + Math.PI / 4;
    strut(body, V(Math.cos(a2) * 2.12, 2.2, Math.sin(a2) * 2.12), mid, 0.045, kit.alu);
    add(body, cyl(0.52, 0.52, 0.07, 28), kit.silver, foot.x, 0.07, foot.z);
    add(body, new THREE.SphereGeometry(0.1, 8, 6), kit.alu, foot.x, 0.2, foot.z);
    // contact probe
    strut(body, V(foot.x, 0.35, foot.z), V(foot.x + c * 1.15, -0.05, foot.z + s * 1.15), 0.015, kit.black);
    // ladder on the front leg
    if (i === 3) {
      const nx = -s * 0.17, nz = c * 0.17;
      strut(body, V(top.x + nx, top.y - 0.35, top.z + nz), V(foot.x + nx, foot.y + 0.35, foot.z + nz), 0.02, kit.silver);
      strut(body, V(top.x - nx, top.y - 0.35, top.z - nz), V(foot.x - nx, foot.y + 0.35, foot.z - nz), 0.02, kit.silver);
      for (let r = 0; r < 8; r++) {
        const f = 0.12 + r * 0.11;
        const px = top.x + (foot.x - top.x) * f, py = top.y + (foot.y - top.y) * f, pz = top.z + (foot.z - top.z) * f;
        const rung = add(body, cyl(0.012, 0.012, 0.36, 6), kit.silver, px, py, pz, false);
        rung.rotation.set(0, 0, 0);
        rung.quaternion.setFromUnitVectors(Y, V(nx, 0, nz).normalize());
      }
    }
  });
  // ascent stage (lifts off in the "silence" beat for Apollo stories)
  const ascent = new THREE.Group();
  ascent.position.y = 3.5;
  add(ascent, box(2.9, 1.9, 2.6), kit.silver, 0, 1.0, 0);
  add(ascent, box(3.1, 0.22, 2.8), kit.graphite, 0, 0.1, 0);
  add(ascent, cyl(0.62, 0.62, 0.9, 20), kit.white, 0, 2.15, 0);
  add(ascent, cyl(0.7, 0.7, 0.18, 20), kit.silver, 0, 2.7, 0);
  for (const sx of [-1, 1]) add(ascent, box(0.05, 0.7, 0.55), kit.glass, sx * 0.4, 1.25, 1.31).rotation.z = sx * 0.4;
  add(ascent, cyl(0.46, 0.46, 0.05, 20), kit.white, 0, 0.7, 1.32).rotation.x = Math.PI / 2;
  for (const [x, z] of [[1.55, 1.3], [-1.55, 1.3], [1.55, -1.3], [-1.55, -1.3]]) {
    add(ascent, box(0.32, 0.3, 0.32), kit.graphite, x, 0.95, z);
    add(ascent, cyl(0.04, 0.09, 0.38, 8), kit.black, x * 1.12, 0.95, z * 1.1).rotation.z = Math.PI / 2;
  }
  dish(ascent, 0.42, kit.silver, -0.6, 2.35, -0.2, 0.5, 0.6);
  strut(ascent, V(0.9, 1.9, -0.7), V(1.0, 3.3, -0.7), 0.012, kit.silver); // antenna
  const asc = add(ascent, cyl(0.001, 0.001, 0.001, 3), kit.black, 0, 0, 0);
  asc.visible = false;
  root.add(ascent);
  b.parts.ascent = ascent;
  b.nozzles.push(V(0, 1.0, 0));
  b.parts.ascentNozzle = asc;

  // surface props: seismometer package + retroreflector + flag
  const props = new THREE.Group();
  const seis = new THREE.Group();
  add(seis, cyl(0.28, 0.32, 0.4, 16), kit.gold, 0, 0.2, 0);
  add(seis, box(0.5, 0.04, 0.5), kit.solar, 0.55, 0.24, 0).rotation.z = 0.12;
  add(seis, box(0.5, 0.04, 0.5), kit.solar, -0.55, 0.24, 0).rotation.z = -0.12;
  seis.position.set(-9, 0, 5);
  props.add(seis);
  const mirror = new THREE.Group();
  add(mirror, box(0.65, 0.04, 0.5), kit.graphite, 0, 0.12, 0).rotation.x = -0.6;
  const panel = mirror.children[0] as THREE.Mesh;
  for (let i = 0; i < 10; i++) for (let j = 0; j < 8; j++) {
    const cube = add(mirror, box(0.045, 0.045, 0.045), kit.glass, 0, 0, 0, false);
    cube.position.set(-0.28 + i * 0.062, 0.14, -0.2 + j * 0.056); cube.rotation.x = -0.6; cube.position.applyAxisAngle(V(1, 0, 0), 0);
  }
  mirror.position.set(-7.5, 0.08, 8); mirror.rotation.y = 0.5;
  props.add(mirror);
  b.parts.mirror = mirror; void panel;
  const flagPole = V(10, 0, 4);
  const flag = new THREE.Group();
  strut(flag, V(0, 0, 0), V(0, 2.1, 0), 0.015, kit.silver);
  strut(flag, V(0, 2.08, 0), V(0.95, 2.08, 0), 0.012, kit.silver);
  const flagTex = canvasTexture(190, 100, (g, w, h) => {
    for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? "#f3f1ea" : "#b3202f"; g.fillRect(0, (i * h) / 13, w, h / 13 + 1); }
    g.fillStyle = "#1c2f6b"; g.fillRect(0, 0, w * 0.4, (h * 7) / 13);
    g.fillStyle = "#f3f1ea";
    for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) g.fillRect(6 + c * 12, 6 + r * 11, 3, 3);
  });
  const cloth = add(flag, new THREE.PlaneGeometry(0.95, 0.5, 8, 4), new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.9 }), 0.475, 1.82, 0);
  cloth.castShadow = true;
  flag.position.copy(flagPole);
  flag.rotation.y = -0.4;
  props.add(flag);
  root.add(props);
  b.parts.props = props;
  b.parts.flag = flag;

  // Lunar Roving Vehicle (used by the Apollo 15/16/17 stories; hidden unless the clip asks for it)
  {
    const car = new THREE.Group();
    const wl: THREE.Mesh[] = [];
    add(car, box(1.3, 0.1, 2.9), kit.silver, 0, 0.62, 0);
    add(car, box(1.0, 0.14, 0.9), kit.gold, 0, 0.75, -1.1);   // batteries
    for (const sx of [-1, 1]) {
      add(car, box(0.5, 0.08, 0.55), kit.alu, sx * 0.32, 0.8, 0.1);        // seat pans
      add(car, box(0.5, 0.55, 0.06), kit.alu, sx * 0.32, 1.05, -0.2);      // seat backs
      for (const z of [-1.0, 1.0]) {
        const w = new THREE.Mesh(cyl(0.41, 0.41, 0.22, 18), std(0x8c8d89, { metalness: 0.5, roughness: 0.6 }));
        w.rotation.z = Math.PI / 2; w.position.set(sx * 1.05, 0.41, z); w.castShadow = true; car.add(w); wl.push(w);
        add(car, cyl(0.2, 0.2, 0.26, 12), kit.alu, sx * 1.05, 0.41, z).rotation.z = Math.PI / 2;
        strut(car, V(sx * 0.6, 0.6, z * 0.9), V(sx * 1.0, 0.45, z), 0.04, kit.alu);
      }
    }
    add(car, box(0.55, 0.22, 0.3), kit.graphite, 0, 1.0, 0.55);               // control console
    strut(car, V(0, 0.9, 0.7), V(0, 1.5, 0.85), 0.03, kit.alu);
    dish(car, 0.42, kit.silver, 0.0, 1.55, 0.85, 0.5, 0);
    strut(car, V(0.5, 0.8, 1.35), V(0.5, 1.5, 1.35), 0.02, kit.silver);
    add(car, box(0.22, 0.14, 0.14), kit.graphite, 0.5, 1.55, 1.35);
    car.userData.wheels = wl;
    car.visible = false;
    root.add(car);
    b.parts.lrv = car;
  }

  const led = add(body, new THREE.SphereGeometry(0.06, 10, 8), kit.led, 1.4, 3.56, 1.2);
  const hw = finish(b, 4.8, 6.4, (t, _dt, power) => {
    kit.led.emissiveIntensity = power * (1.2 + Math.sin(t * 3) * 0.8);
    led.visible = true;
  });
  // NASA's Apollo Lunar Module model replaces the stand-in; it is split at the stage line so the ascent stage can still lift off.
  hw.upgrade = async (assetBase: string) => {
    const model = await loadGlb(`${assetBase}/models/nasa/apollo-lm.glb`, `${assetBase}/vendor/draco/`);
    model.position.y -= 0.1; // footpads on y = 0
    root.add(model);
    model.updateMatrixWorld(true);
    const SPLIT = 2.35;
    const ascent = new THREE.Group();
    ascent.position.y = 3.5;
    root.add(ascent);
    ascent.updateMatrixWorld(true);
    const meshes: THREE.Mesh[] = [];
    model.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
    const ascBox = new THREE.Box3();
    for (const m of meshes) {
      const bb = new THREE.Box3().setFromObject(m);
      if (bb.min.y >= SPLIT) { ascent.attach(m); ascBox.union(bb); }
    }
    ascent.userData.baseY = 3.5;
    ascent.userData.nozzleY = ascBox.min.y - 3.5 + 0.2;
    body.visible = false;
    const old = b.parts.ascent; if (old) old.visible = false;
    b.parts.ascent = ascent;
    b.parts.nasaModel = model;
  };
  return hw;
}

// ───────────────────────────── Surveyor ─────────────────────────────
function surveyor(): Hardware {
  const b = base();
  const { kit, root } = b;
  const hub = V(0, 1.45, 0);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    const c = Math.cos(a), s = Math.sin(a);
    const foot = V(c * 2.0, 0.2, s * 2.0), top = V(c * 0.55, 1.5, s * 0.55);
    strut(root, top, foot, 0.045, kit.alu);
    strut(root, V(c * 0.45, 0.95, s * 0.45), V(c * 1.35, 0.65, s * 1.35), 0.03, kit.alu);
    add(root, cyl(0.26, 0.3, 0.14, 16), kit.silver, foot.x, 0.07, foot.z);
    add(root, box(0.2, 0.12, 0.2), kit.gold, c * 0.55, 1.25, s * 0.55); // electronics compartments
    const v = add(root, cyl(0.05, 0.1, 0.34, 10), kit.black, c * 0.75, 1.1, s * 0.75); // vernier engine
    v.rotation.z = Math.PI; b.nozzles.push(V(c * 0.75, 0.9, s * 0.75));
  }
  strut(root, V(0, 1.3, 0), V(0, 2.65, 0), 0.04, kit.alu);
  add(root, new THREE.SphereGeometry(0.34, 18, 12), kit.white, 0, 1.4, 0);
  const panel = new THREE.Group();
  add(panel, box(1.15, 0.04, 1.0), kit.solar, 0, 0, 0);
  add(panel, box(1.2, 0.02, 1.05), kit.graphite, 0, -0.03, 0);
  panel.position.set(0, 2.78, 0); panel.rotation.x = -0.18;
  root.add(panel);
  strut(root, V(0, 2.8, 0), V(0, 3.45, 0), 0.012, kit.silver);
  dish(root, 0.3, kit.silver, 0.45, 2.55, 0.15, 0.2, -0.3);
  // TV camera head on a boom
  const cam = new THREE.Group();
  add(cam, cyl(0.1, 0.1, 0.34, 14), kit.graphite, 0, 0, 0);
  add(cam, cyl(0.05, 0.05, 0.1, 12), kit.glass, 0, 0.22, 0.02);
  add(cam, new THREE.SphereGeometry(0.12, 12, 8), kit.silver, 0, 0.14, 0.08);
  cam.position.set(0.0, 1.95, 0.0);
  root.add(cam);
  b.parts.camera = cam;
  // soil scoop arm
  const arm = new THREE.Group();
  strut(arm, V(0, 0, 0), V(1.35, 0.0, 0.0), 0.022, kit.alu);
  add(arm, box(0.18, 0.1, 0.12), kit.silver, 1.42, -0.04, 0);
  arm.position.set(0.3, 1.0, 0.45);
  arm.rotation.set(0, 0.7, -0.25);
  root.add(arm);
  b.parts.arm = arm;
  const led = add(root, new THREE.SphereGeometry(0.04, 8, 6), kit.led, 0.18, 1.55, 0.3);
  void led;
  return finish(b, 2.6, 3.5, (t, _dt, power) => {
    cam.rotation.y = power > 0.05 ? Math.sin(t * 0.5) * 1.1 * power : cam.rotation.y;
    arm.rotation.z = -0.25 - Math.max(0, Math.sin(t * 0.7)) * 0.35 * power;
    kit.led.emissiveIntensity = power * (1 + Math.sin(t * 4) * 0.8);
  });
}

// ───────────────────────────── Nova-C (Odysseus, Athena) ─────────────────────────────
function novaC(): Hardware {
  const b = base();
  const { kit, root } = b;
  const pivot = new THREE.Group();   // rotate about one foot to "tip over"
  const inner = new THREE.Group();
  const footX = 3.2;
  // tips over the left foot: pivot there, the body offset to the right of it
  pivot.position.set(-footX, 0, 0);
  inner.position.set(footX, 0, 0);
  pivot.add(inner);
  root.add(pivot);
  const hex = add(inner, cyl(1.0, 1.0, 3.0, 6), kit.alu, 0, 2.45, 0);
  hex.rotation.y = Math.PI / 6;
  add(inner, cyl(1.04, 1.04, 0.5, 6), kit.bronze, 0, 3.4, 0).rotation.y = Math.PI / 6;
  add(inner, cyl(0.9, 1.0, 0.18, 6), kit.graphite, 0, 4.02, 0).rotation.y = Math.PI / 6;
  add(inner, cyl(0.55, 0.9, 0.9, 20), kit.graphite, 0, 0.95, 0);
  add(inner, new THREE.ConeGeometry(0.5, 0.8, 24, 1, true), kit.black, 0, 0.72, 0).rotation.x = Math.PI;
  b.nozzles.push(V(0, 0.45, 0));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    const foot = V(c * footX, 0.14, s * footX);
    strut(inner, V(c * 0.95, 2.1, s * 0.95), foot, 0.065, kit.silver);
    strut(inner, V(c * 0.95, 1.0, s * 0.95), V(c * 2.1, 0.8, s * 2.1), 0.04, kit.silver);
    add(inner, cyl(0.4, 0.4, 0.07, 20), kit.silver, foot.x, 0.05, foot.z);
  }
  for (const k of [-1, 1]) add(inner, new THREE.SphereGeometry(0.42, 18, 12), kit.gold, k * 0.78, 2.0, 0.45);
  add(inner, box(1.9, 0.05, 1.3), kit.solar, 0, 4.2, 0).rotation.z = 0.05;
  strut(inner, V(0.3, 4.2, 0.2), V(0.35, 5.0, 0.2), 0.02, kit.silver);
  dish(inner, 0.28, kit.silver, -0.5, 4.2, -0.4, 0.4, 0.2);
  add(inner, cyl(0.07, 0.07, 0.18, 10), kit.glass, 0.7, 3.2, 0.95).rotation.x = Math.PI / 2;
  add(inner, box(0.07, 0.07, 0.07), kit.led, 0.6, 3.9, 0.8);
  b.parts.pivot = pivot;
  b.parts.inner = inner;
  const rock = add(root, new THREE.IcosahedronGeometry(0.9, 0), std(0x55534f, { roughness: 1, flatShading: true }), 1.6, 0.5, 0.4);
  rock.scale.setScalar(1.7);
  rock.visible = false;
  b.parts.rock = rock;
  return finish(b, 4.2, 5.2, (t, _dt, power) => { kit.led.emissiveIntensity = power * (1 + Math.sin(t * 3) * 0.7); });
}

// ───────────────────────────── Viking ─────────────────────────────
function viking(): Hardware {
  const b = base();
  const { kit, root } = b;
  const deck = new THREE.Group();
  deck.position.y = 1.35;
  root.add(deck);
  const hex = add(deck, cyl(1.25, 1.25, 0.55, 6), kit.alu, 0, 0, 0);
  hex.rotation.y = Math.PI / 6;
  add(deck, cyl(1.1, 1.1, 0.12, 6), kit.graphite, 0, 0.34, 0).rotation.y = Math.PI / 6;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const c = Math.cos(a), s = Math.sin(a);
    const foot = V(c * 2.7, 0.18, s * 2.7);
    strut(root, V(c * 1.0, 1.4, s * 1.0), foot, 0.07, kit.alu);
    strut(root, V(c * 1.0, 1.15, s * 1.0), V(c * 1.9, 0.75, s * 1.9), 0.04, kit.alu);
    add(root, cyl(0.38, 0.4, 0.08, 20), kit.silver, foot.x, 0.04, foot.z);
  }
  // RTG power units under wind screens
  for (const k of [-1, 1]) {
    const rtg = new THREE.Group();
    add(rtg, cyl(0.28, 0.28, 0.85, 16), kit.graphite, 0, 0, 0).rotation.z = Math.PI / 2;
    for (let f = 0; f < 6; f++) add(rtg, cyl(0.34, 0.34, 0.025, 16), kit.silver, -0.32 + f * 0.13, 0, 0).rotation.z = Math.PI / 2;
    rtg.position.set(k * 1.05, 0.05, -0.75);
    rtg.rotation.y = k * 0.5;
    deck.add(rtg);
  }
  // high-gain dish, UHF whip, camera towers, met boom
  const hg = dish(deck, 0.55, kit.white, -0.25, 1.5, -0.25, 0.9, 0.5);
  strut(deck, V(-0.25, 0.3, -0.25), V(-0.25, 1.4, -0.25), 0.04, kit.alu);
  b.parts.dish = hg;
  strut(deck, V(0.8, 0.3, -0.2), V(0.8, 1.9, -0.2), 0.012, kit.silver);
  for (const k of [-1, 1]) {
    strut(deck, V(k * 0.5, 0.3, 0.55), V(k * 0.5, 1.05, 0.55), 0.03, kit.alu);
    add(deck, box(0.2, 0.16, 0.16), kit.graphite, k * 0.5, 1.12, 0.55);
    add(deck, cyl(0.04, 0.04, 0.05, 10), kit.glass, k * 0.5, 1.12, 0.65).rotation.x = Math.PI / 2;
  }
  strut(deck, V(0.9, 0.3, 0.2), V(1.9, 1.0, 0.8), 0.015, kit.silver);
  add(deck, new THREE.SphereGeometry(0.05, 8, 6), kit.silver, 1.9, 1.0, 0.8);
  // sampler arm
  const arm = new THREE.Group();
  arm.position.set(-0.4, 0.15, 1.1);
  strut(arm, V(0, 0, 0), V(0, 0, 3.0), 0.03, kit.alu);
  add(arm, box(0.14, 0.1, 0.22), kit.silver, 0, -0.02, 3.05);
  deck.add(arm);
  b.parts.arm = arm;
  arm.scale.z = 0.35;
  add(deck, new THREE.SphereGeometry(0.05, 8, 6), kit.led, 0.4, 0.4, 0.3);
  const hw = finish(b, 3.4, 3.9, (t, _dt, power) => {
    arm.scale.z = 0.35 + (0.5 + Math.sin(t * 0.45) * 0.5) * 0.65 * power + (power < 0.05 ? 0.2 : 0);
    arm.rotation.y = Math.sin(t * 0.3) * 0.5 * power;
    hg.rotation.y += power * 0.003;
    kit.led.emissiveIntensity = power * (1 + Math.sin(t * 3.5) * 0.7);
  });
  // NASA's Viking Lander model replaces the stand-in (the stand-in stays if the file can't load).
  hw.upgrade = async (assetBase: string) => {
    const model = await loadGlb(`${assetBase}/models/nasa/viking-lander.glb`, `${assetBase}/vendor/draco/`);
    fitModel(model, 3.6);
    root.add(model);
    deck.visible = false;
    root.children.forEach((c) => { if (c !== model && c !== deck && c.userData.keep !== true && !(c as THREE.Light).isLight) c.visible = c === model; });
    b.parts.nasaModel = model;
  };
  return hw;
}

// ───────────────────────────── rovers ─────────────────────────────
function roverModel(b: Base, scale: number, big: boolean) {
  const { kit } = b;
  const g = new THREE.Group();
  const body = add(g, box(1.0, 0.45, 1.5), big ? kit.white : kit.gold, 0, 0.78, 0);
  body.scale.setScalar(1);
  const deck = add(g, box(1.7, 0.05, 1.35), big ? kit.graphite : kit.solar, 0, 1.03, -0.05);
  void deck;
  if (!big) for (const sx of [-1, 1]) add(g, box(0.5, 0.04, 1.3), kit.solar, sx * 1.05, 1.03, -0.05);
  // rocker-bogie
  const wheels: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    for (const z of [-0.8, 0, 0.8]) {
      const w = wheel(0.26, 0.2, kit.graphite);
      w.position.set(sx * 0.82, 0.26, z);
      g.add(w); wheels.push(w);
    }
    strut(g, V(sx * 0.82, 0.3, -0.8), V(sx * 0.62, 0.78, -0.05), 0.04, kit.alu);
    strut(g, V(sx * 0.82, 0.3, 0.8), V(sx * 0.82, 0.3, 0.0), 0.04, kit.alu);
    strut(g, V(sx * 0.82, 0.3, 0.0), V(sx * 0.62, 0.78, -0.05), 0.04, kit.alu);
  }
  // mast + camera head
  const mast = new THREE.Group();
  strut(mast, V(0, 0, 0), V(0, 1.05, 0), 0.03, kit.alu);
  add(mast, box(0.42, 0.14, 0.14), kit.graphite, 0, 1.12, 0);
  for (const sx of [-1, 1]) add(mast, cyl(0.04, 0.04, 0.05, 10), kit.glass, sx * 0.14, 1.12, 0.09).rotation.x = Math.PI / 2;
  mast.position.set(0.45, 1.05, 0.45);
  g.add(mast);
  // arm
  if (big) {
    const arm = new THREE.Group();
    strut(arm, V(0, 0, 0), V(0, -0.1, 1.2), 0.04, kit.alu);
    add(arm, cyl(0.16, 0.16, 0.2, 14), kit.graphite, 0, -0.1, 1.25).rotation.x = Math.PI / 2;
    arm.position.set(-0.2, 0.7, 0.55);
    g.add(arm);
    b.parts.roverArm = arm;
  } else {
    const arm = new THREE.Group();
    strut(arm, V(0, 0, 0), V(0, -0.25, 0.9), 0.03, kit.alu);
    add(arm, box(0.18, 0.18, 0.2), kit.graphite, 0, -0.27, 0.95);
    arm.position.set(-0.25, 0.7, 0.7);
    g.add(arm);
    b.parts.roverArm = arm;
  }
  g.scale.setScalar(scale);
  b.parts.wheels = new THREE.Group();
  b.parts.wheelList = Object.assign(new THREE.Group(), { userData: { wheels } });
  b.parts.mast = mast;
  return { g, wheels };
}

/** Opportunity (MER-B). Stand-in model; NASA/Ames' GLB replaces it when `upgrade()` succeeds. */
function opportunity(): Hardware {
  const b = base();
  const { g, wheels } = roverModel(b, 1.0, false);
  b.root.add(g);
  const mast = b.parts.mast;
  let driven = 0;
  const hw = finish(b, 2.3, 2.3, (t, dt, power) => {
    if (power > 0.05) {
      const step = dt * power * 1.1;
      driven += step;
      wheels.forEach((w) => (w.rotation.x -= step / 0.26));
      g.position.z = Math.sin(t * 0.2) * 3.0 * power + g.position.z * (1 - power) * 0;
      mast.rotation.y = Math.sin(t * 0.6) * 0.5;
    }
  });
  hw.parts.rover = g;
  hw.upgrade = async (assetBase: string) => {
    const { loadOpportunity } = await import("../../game/engine/actors");
    const model = await loadOpportunity(`${assetBase}/models/opportunity-mer-b.glb`, `${assetBase}/vendor/draco/`, 1.5);
    g.visible = false;
    model.scale.multiplyScalar(1.45);
    model.rotation.y = Math.PI / 2;
    b.root.add(model);
    b.parts.nasaModel = model;
    b.root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  };
  void driven;
  return hw;
}

// ───────────────────────────── Pathfinder + Sojourner ─────────────────────────────
function pathfinder(): Hardware {
  const b = base();
  const { kit, root } = b;
  const tri = (rad: number) => {
    const s = new THREE.Shape();
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + Math.PI / 2; const x = Math.cos(a) * rad, y = Math.sin(a) * rad; if (i === 0) s.moveTo(x, y); else s.lineTo(x, y); }
    s.closePath();
    return s;
  };
  const baseG = new THREE.ExtrudeGeometry(tri(1.35), { depth: 0.12, bevelEnabled: false });
  baseG.rotateX(-Math.PI / 2);
  add(root, baseG, kit.alu, 0, 0.12, 0);
  const petals: THREE.Group[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2 + Math.PI / 3; // edge midpoint directions
    const edgeR = 1.35 * Math.cos(Math.PI / 3);
    const hinge = new THREE.Group();
    hinge.position.set(Math.cos(a) * edgeR, 0.18, Math.sin(a) * edgeR);
    hinge.rotation.y = -a + Math.PI / 2;
    const petalShape = new THREE.Shape();
    petalShape.moveTo(-1.15, 0); petalShape.lineTo(1.15, 0); petalShape.lineTo(0.0, 1.95); petalShape.closePath();
    const pg = new THREE.ExtrudeGeometry(petalShape, { depth: 0.06, bevelEnabled: false });
    pg.rotateX(-Math.PI / 2);
    pg.translate(0, 0, 0);
    const pm = add(hinge, pg, kit.solar, 0, 0, 0);
    pm.rotation.x = 0;
    pm.position.z = 0;
    pg.rotateY(Math.PI);
    hinge.rotation.x = 0;
    const holder = new THREE.Group();
    holder.add(hinge);
    root.add(holder);
    petals.push(hinge);
    hinge.userData.open = 0;
    hinge.userData.baseRot = hinge.rotation.clone();
  }
  // IMP camera mast + low-gain antenna
  const imp = new THREE.Group();
  strut(imp, V(0, 0, 0), V(0, 1.05, 0), 0.025, kit.alu);
  add(imp, box(0.3, 0.12, 0.12), kit.graphite, 0, 1.12, 0);
  for (const sx of [-1, 1]) add(imp, cyl(0.035, 0.035, 0.05, 10), kit.glass, sx * 0.1, 1.12, 0.07).rotation.x = Math.PI / 2;
  imp.position.set(0.0, 0.25, 0.0);
  root.add(imp);
  b.parts.imp = imp;
  dish(root, 0.22, kit.silver, 0.45, 0.28, -0.2, 0.3, 0);
  strut(root, V(-0.45, 0.25, 0.1), V(-0.45, 0.8, 0.1), 0.012, kit.silver);
  // Sojourner
  const rover = new THREE.Group();
  add(rover, box(0.48, 0.2, 0.63), kit.silver, 0, 0.26, 0);
  add(rover, box(0.46, 0.025, 0.6), kit.solar, 0, 0.375, 0);
  const wl: THREE.Group[] = [];
  for (const sx of [-1, 1]) for (const z of [-0.26, 0, 0.26]) {
    const w = wheel(0.065, 0.065, kit.graphite);
    w.position.set(sx * 0.29, 0.065, z);
    rover.add(w); wl.push(w);
  }
  strut(rover, V(0.29, 0.07, -0.26), V(0.24, 0.24, 0.0), 0.01, kit.alu);
  strut(rover, V(-0.29, 0.07, -0.26), V(-0.24, 0.24, 0.0), 0.01, kit.alu);
  strut(rover, V(0.1, 0.38, -0.2), V(0.1, 0.62, -0.2), 0.008, kit.silver);
  rover.position.set(0.0, 0.16, 2.9);
  rover.scale.setScalar(1.35);
  root.add(rover);
  b.parts.rover = rover;
  b.parts.airbag = new THREE.Group();
  let open = 0;
  return finish(b, 3.2, 1.8, (t, dt, power) => {
    open += ((power > 0.05 ? 1 : 0.55 + (power > 0 ? 0 : 0)) - open) * Math.min(1, dt * 1.2);
    petals.forEach((h, i) => {
      const base0 = h.userData.baseRot as THREE.Euler;
      h.rotation.x = base0.x - (1 - Math.min(1, open)) * 0.0; // petals stay flat; closing is animated by scale of the stack only
    });
    if (power > 0.05) {
      const a = t * 0.18;
      rover.position.x = Math.sin(a) * 3.1;
      rover.position.z = Math.cos(a) * 3.1;
      rover.rotation.y = Math.atan2(Math.cos(a), -Math.sin(a));
      wl.forEach((w) => (w.rotation.x -= dt * power * 4));
    }
    kit.led.emissiveIntensity = power;
  });
}

// ───────────────────────────── Phoenix ─────────────────────────────
function phoenix(): Hardware {
  const b = base();
  const { kit, root } = b;
  const deck = new THREE.Group();
  deck.position.y = 1.25;
  root.add(deck);
  add(deck, cyl(0.85, 0.85, 0.22, 16), kit.alu, 0, 0, 0);
  add(deck, cyl(0.55, 0.8, 0.5, 16), kit.graphite, 0, -0.34, 0);
  add(deck, cyl(0.78, 0.78, 0.04, 16), kit.white, 0, 0.13, 0);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    const c = Math.cos(a), s = Math.sin(a);
    const foot = V(c * 1.7, 0.1, s * 1.7);
    strut(root, V(c * 0.65, 1.15, s * 0.65), foot, 0.05, kit.alu);
    strut(root, V(c * 0.65, 0.95, s * 0.65), V(c * 1.2, 0.5, s * 1.2), 0.03, kit.alu);
    add(root, cyl(0.2, 0.22, 0.05, 14), kit.silver, foot.x, 0.025, foot.z);
  }
  // two round solar arrays with radial spokes
  const arrayTex = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = "#10203c"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#4b6ea8"; g.lineWidth = 2;
    for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.cos((i / 12) * Math.PI * 2) * w, h / 2 + Math.sin((i / 12) * Math.PI * 2) * h); g.stroke(); }
    for (let r = 1; r < 5; r++) { g.beginPath(); g.arc(w / 2, h / 2, (r * w) / 10, 0, Math.PI * 2); g.stroke(); }
  });
  const arrayMat = new THREE.MeshStandardMaterial({ map: arrayTex, roughness: 0.3, metalness: 0.6, side: THREE.DoubleSide });
  const arrays: THREE.Mesh[] = [];
  for (const k of [-1, 1]) {
    const arr = add(deck, new THREE.CircleGeometry(1.15, 40), arrayMat, k * 1.85, 0.1, 0.1);
    arr.rotation.x = -Math.PI / 2 + 0.04; arr.rotation.z = 0;
    add(deck, new THREE.RingGeometry(1.12, 1.19, 40), kit.silver, k * 1.85, 0.105, 0.1).rotation.x = -Math.PI / 2;
    strut(deck, V(k * 0.8, 0.05, 0.1), V(k * 1.0, 0.07, 0.1), 0.03, kit.alu);
    arrays.push(arr);
  }
  // instruments: stereo camera mast, weather mast, ovens, robotic arm with scoop
  strut(deck, V(-0.15, 0.1, 0.45), V(-0.15, 1.05, 0.45), 0.025, kit.alu);
  add(deck, box(0.28, 0.1, 0.1), kit.graphite, -0.15, 1.1, 0.45);
  strut(deck, V(0.4, 0.1, -0.35), V(0.4, 1.4, -0.35), 0.012, kit.silver);
  for (const x of [-0.25, 0.1]) add(deck, cyl(0.1, 0.1, 0.22, 12), kit.gold, x, 0.25, -0.2);
  const arm = new THREE.Group();
  arm.position.set(0.55, 0.15, 0.45);
  const upper = new THREE.Group(); arm.add(upper);
  strut(upper, V(0, 0, 0), V(0, 0, 1.3), 0.035, kit.alu);
  const fore = new THREE.Group(); fore.position.set(0, 0, 1.3); upper.add(fore);
  strut(fore, V(0, 0, 0), V(0, 0, 1.1), 0.03, kit.alu);
  add(fore, box(0.14, 0.12, 0.3), kit.silver, 0, -0.05, 1.15);
  deck.add(arm);
  b.parts.arm = arm;
  b.parts.upper = upper; b.parts.fore = fore;
  upper.rotation.x = 0.55; fore.rotation.x = -0.9;
  add(deck, new THREE.SphereGeometry(0.04, 8, 6), kit.led, 0.1, 0.18, 0.55);
  return finish(b, 3.3, 2.4, (t, _dt, power) => {
    if (power > 0.05) {
      const k = Math.sin(t * 0.55) * 0.5 + 0.5;
      upper.rotation.x = 0.55 + k * 0.55 * power;
      fore.rotation.x = -0.9 + k * 0.5 * power;
      arm.rotation.y = Math.sin(t * 0.3) * 0.4 * power;
    }
    kit.led.emissiveIntensity = power * (1 + Math.sin(t * 4) * 0.7);
  }, { });
}

// ───────────────────────────── InSight ─────────────────────────────
function insight(): Hardware {
  const b = base();
  const { kit, root } = b;
  const deck = new THREE.Group();
  deck.position.y = 1.1;
  root.add(deck);
  add(deck, cyl(0.95, 0.95, 0.16, 6), kit.alu, 0, 0, 0).rotation.y = Math.PI / 6;
  add(deck, cyl(0.75, 0.9, 0.5, 6), kit.graphite, 0, -0.3, 0).rotation.y = Math.PI / 6;
  add(deck, cyl(0.88, 0.88, 0.03, 6), kit.gold, 0, 0.095, 0).rotation.y = Math.PI / 6;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    const c = Math.cos(a), s = Math.sin(a);
    const foot = V(c * 1.7, 0.1, s * 1.7);
    strut(root, V(c * 0.7, 0.95, s * 0.7), foot, 0.05, kit.alu);
    add(root, cyl(0.2, 0.22, 0.05, 14), kit.silver, foot.x, 0.025, foot.z);
  }
  // two large solar discs
  const discTex = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = "#12203a"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#3e5f98"; g.lineWidth = 1.5;
    for (let i = 0; i < 18; i++) { g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.cos((i / 18) * Math.PI * 2) * w, h / 2 + Math.sin((i / 18) * Math.PI * 2) * h); g.stroke(); }
    for (let r = 1; r < 6; r++) { g.beginPath(); g.arc(w / 2, h / 2, (r * w) / 12, 0, Math.PI * 2); g.stroke(); }
  });
  const discMat = new THREE.MeshStandardMaterial({ map: discTex, roughness: 0.3, metalness: 0.6, side: THREE.DoubleSide });
  const dustColor = new THREE.Color(0xa07650);
  for (const k of [-1, 1]) {
    const arr = add(deck, new THREE.CircleGeometry(1.1, 48), discMat, k * 2.0, 0.1, 0);
    arr.rotation.x = -Math.PI / 2 + 0.03; arr.rotation.y = 0;
    add(deck, new THREE.RingGeometry(1.08, 1.15, 48), kit.silver, k * 2.0, 0.105, 0).rotation.x = -Math.PI / 2;
    strut(deck, V(k * 0.85, 0.07, 0), V(k * 1.0, 0.09, 0), 0.03, kit.alu);
  }
  // instruments on the ground: wind & thermal shield over the seismometer, heat-flow probe box
  const shield = add(root, new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), kit.silver, 0.2, 0.0, 2.4);
  shield.scale.y = 0.85;
  add(root, cyl(0.52, 0.52, 0.04, 24), kit.graphite, 0.2, 0.02, 2.4);
  add(root, cyl(0.22, 0.22, 0.45, 14), kit.gold, -1.0, 0.22, 2.2);
  strut(root, V(-1.0, 0.45, 2.2), V(-0.5, 1.0, 0.8), 0.01, kit.black);
  const arm = new THREE.Group();
  arm.position.set(0.4, 0.15, 0.55);
  strut(arm, V(0, 0, 0), V(0, 0.3, 1.0), 0.035, kit.alu);
  add(arm, box(0.18, 0.1, 0.22), kit.graphite, 0, 0.32, 1.1);
  deck.add(arm);
  b.parts.arm = arm;
  dish(deck, 0.3, kit.silver, -0.4, 0.2, -0.45, 0.4, 0.3);
  add(deck, new THREE.SphereGeometry(0.04, 8, 6), kit.led, 0.1, 0.18, 0.5);
  void dustColor;
  // dust makes the panels visibly dull: reuse the kit's solar tint on the discs
  const setDust = (k: number) => {
    discMat.color.setRGB(1, 1, 1).lerp(new THREE.Color(0xb68a60), k);
    discMat.roughness = 0.3 + 0.65 * k;
    discMat.metalness = 0.6 - 0.5 * k;
    kit.dust(k);
  };
  const hw = finish(b, 3.4, 2.0, (t, _dt, power) => {
    arm.rotation.x = power > 0.05 ? Math.sin(t * 0.4) * 0.12 * power : arm.rotation.x;
    kit.led.emissiveIntensity = power * (1 + Math.sin(t * 3.2) * 0.7);
  }, { setDust });
  // NASA's InSight lander model (panels and arm deployed, i.e. the surface configuration) replaces the stand-in.
  hw.upgrade = async (assetBase: string) => {
    const model = await loadGlb(`${assetBase}/models/nasa/insight.glb`, `${assetBase}/vendor/draco/`);
    fitModel(model, 6.0); // the two solar arrays span about 6 m
    root.children.forEach((c) => { c.visible = false; });
    root.add(model);
    model.visible = true;
    const prev = hw.setDust;
    hw.setDust = dustable(model, prev);
    b.parts.nasaModel = model;
  };
  return hw;
}

// ───────────────────────────── Ingenuity (+ a Perseverance-class rover for scale) ─────────────────────────────
function ingenuity(): Hardware {
  const b = base();
  const { kit, root } = b;
  const heli = new THREE.Group();
  root.add(heli);
  add(heli, box(0.19, 0.14, 0.16), kit.gold, 0, 0.55, 0);
  add(heli, cyl(0.014, 0.014, 0.45, 8), kit.graphite, 0, 0.9, 0);
  add(heli, box(0.4, 0.012, 0.3), kit.solar, 0, 1.16, 0);
  const rotors: THREE.Group[] = [];
  const blades: THREE.Mesh[] = [];
  for (const [y, dir] of [[0.9, 1], [1.02, -1]] as const) {
    const r = new THREE.Group(); r.position.y = y;
    for (const k of [-1, 1]) {
      const bl = add(r, box(0.6, 0.006, 0.05), kit.black, k * 0.3, 0, 0);
      blades.push(bl);
    }
    r.userData.dir = dir;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.62, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    disc.rotation.x = -Math.PI / 2; r.add(disc); r.userData.disc = disc;
    heli.add(r); rotors.push(r);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    strut(heli, V(Math.cos(a) * 0.06, 0.5, Math.sin(a) * 0.06), V(Math.cos(a) * 0.26, 0.02, Math.sin(a) * 0.26), 0.007, kit.graphite);
    add(heli, cyl(0.012, 0.012, 0.018, 8), kit.graphite, Math.cos(a) * 0.26, 0.01, Math.sin(a) * 0.26);
  }
  b.parts.heli = heli;
  b.parts.blades = rotors[1];
  b.parts.brokenBlade = blades[3];
  // the rover in the background gives scale
  const roverHolder = new THREE.Group();
  const { g: rv } = roverModel(b, 1.7, true);
  roverHolder.add(rv);
  roverHolder.position.set(-3.9, 0, -3.2);
  roverHolder.rotation.y = 0.9;
  root.add(roverHolder);
  b.parts.rover = roverHolder;
  let flight = 0; // 0..1 hover progress
  let spin = 0;
  let broken = false;
  let glbRotors: THREE.Object3D[] = [];
  const hw = finish(b, 1.5, 2.2, (t, dt, power) => {
    const target = power > 0.05 ? 1 : 0;
    flight += (target - flight) * Math.min(1, dt * 0.9);
    spin += dt * (flight > 0.03 ? 60 * flight : 0);
    rotors[0].rotation.y = spin * rotors[0].userData.dir;
    rotors[1].rotation.y = spin * rotors[1].userData.dir * 0.92;
    for (const r of rotors) (r.userData.disc.material as THREE.MeshBasicMaterial).opacity = 0.14 * Math.min(1, flight * 1.5);
    if (glbRotors.length === 2) { glbRotors[0].rotation.y = spin; glbRotors[1].rotation.y = -spin * 0.92; }
    const lift = flight * 2.6;
    heli.position.set(Math.sin(t * 0.45) * 1.4 * flight, lift, Math.cos(t * 0.37) * 1.1 * flight);
    heli.rotation.set(Math.sin(t * 0.8) * 0.04 * flight, 0, Math.cos(t * 0.6) * 0.04 * flight);
    if (broken) heli.rotation.z = 0.12;
  });
  hw.parts.breakBlade = new THREE.Object3D();
  (hw.parts.breakBlade as THREE.Object3D & { run?: () => void }).run = () => {
    broken = true;
    blades[3].rotation.set(0.5, 0.2, 0.9);
    blades[3].position.y -= 0.05;
  };
  // NASA's Ingenuity model replaces the stand-in body and rotors (true size); the translucent rotor discs are kept.
  hw.upgrade = async (assetBase: string) => {
    // NASA's Perseverance model replaces the stand-in rover that gives scale
    loadGlb(`${assetBase}/models/nasa/perseverance.glb`, `${assetBase}/vendor/draco/`).then((rm) => {
      fitModel(rm, 3.4);
      roverHolder.children.forEach((c) => { c.visible = false; });
      roverHolder.add(rm);
    }).catch(() => { /* the stand-in stays */ });
    const model = await loadGlb(`${assetBase}/models/nasa/ingenuity.glb`, `${assetBase}/vendor/draco/`);
    heli.children.forEach((c) => { if (!rotors.includes(c as THREE.Group)) c.visible = false; });
    blades.forEach((bl) => (bl.visible = false));
    heli.add(model);
    glbRotors = (["rotors_01", "rotors_02"].map((n) => model.getObjectByName(n)).filter(Boolean)) as THREE.Object3D[];
    glbRotors.forEach((r, i) => {
      const bb = new THREE.Box3().setFromObject(r);
      rotors[i].position.y = (bb.min.y + bb.max.y) / 2;
      rotors[i].visible = true;
    });
    // the procedural rotor groups only carry the discs now
    rotors.forEach((r) => (r.rotation.y = 0));
  };
  return hw;
}

export function buildHardware(kind: HardwareKind): Hardware {
  switch (kind) {
    case "lm": return lunarModule();
    case "surveyor": return surveyor();
    case "nova-c": return novaC();
    case "viking": return viking();
    case "pathfinder": return pathfinder();
    case "mer": return opportunity();
    case "phoenix": return phoenix();
    case "insight": return insight();
    case "ingenuity": return ingenuity();
  }
}
