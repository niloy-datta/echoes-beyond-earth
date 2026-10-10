/**
 * Shared Three.js building blocks for Mission Stories (cinematic clips and the VR world):
 * renderer/stage, procedural Moon & Mars terrain, skies, Earth, dust and thruster effects.
 * Everything is generated in code — no third-party asset is used here.
 */
import * as THREE from "three";
import type { Body } from "../core/types.ts";

export type QualityName = "low" | "medium" | "high";
export interface Quality { name: QualityName; dpr: number; shadows: boolean; shadowSize: number; terrainSeg: number; rocks: number; stars: number; dust: number }
export const QUALITY: Record<QualityName, Quality> = {
  low: { name: "low", dpr: 1, shadows: false, shadowSize: 512, terrainSeg: 90, rocks: 140, stars: 900, dust: 260 },
  medium: { name: "medium", dpr: 1.5, shadows: true, shadowSize: 1024, terrainSeg: 150, rocks: 320, stars: 1800, dust: 520 },
  high: { name: "high", dpr: 2, shadows: true, shadowSize: 2048, terrainSeg: 220, rocks: 560, stars: 3000, dust: 900 },
};

export function pickQuality(forced?: string | null): Quality {
  if (forced && forced in QUALITY) return QUALITY[forced as QualityName];
  const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (coarse || mem <= 2 || cores <= 2) return QUALITY.low;
  if (mem >= 8 && cores >= 8) return QUALITY.high;
  return QUALITY.medium;
}

export function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

// ── deterministic noise ───────────────────────────────────────────────────────
const hash = (x: number, z: number) => {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
function vnoise(x: number, z: number): number {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x: number, z: number, oct = 4): number {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, z * f); f *= 2.03; a *= 0.5; }
  return s;
}
export const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ── stage (renderer + loop) ───────────────────────────────────────────────────
export interface StageOptions { canvas: HTMLCanvasElement; quality: Quality; onContextLost?: () => void; xr?: boolean }

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(52, 1, 0.05, 3000);
  private raf = 0;
  private last = 0;
  private running = false;
  private readonly host: HTMLElement;
  private ro: ResizeObserver;
  private tickers: Array<(dt: number, t: number) => void> = [];
  private clock = 0;
  private lostHandler: (e: Event) => void;
  private visHandler: () => void;
  private onLost?: () => void;
  /** frames rendered; handy for tests */
  frames = 0;
  /** adaptive-quality governor: 0 = as requested, 1 = lower resolution, 2 = lower resolution, no shadows, 3 = minimum */
  governorLevel = 0;
  onGovern?: (level: number) => void;
  private gov = { acc: 0, n: 0, slow: 0, age: 0 };
  private baseDpr = 1;

  constructor(readonly opts: StageOptions) {
    const { canvas, quality } = opts;
    this.onLost = opts.onContextLost;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality.name !== "low", powerPreference: "high-performance", preserveDrawingBuffer: false });
    this.baseDpr = Math.min(window.devicePixelRatio || 1, quality.dpr);
    this.renderer.setPixelRatio(this.baseDpr);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.host = canvas.parentElement ?? canvas;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.host);
    this.resize();
    this.lostHandler = (e) => { e.preventDefault(); this.stop(); this.onLost?.(); };
    canvas.addEventListener("webglcontextlost", this.lostHandler);
    this.visHandler = () => { if (document.hidden) this.pause(); else if (this.wantRun) this.start(); };
    document.addEventListener("visibilitychange", this.visHandler);
  }

  private wantRun = false;
  resize() {
    const w = Math.max(2, this.host.clientWidth), h = Math.max(2, this.host.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
  onTick(fn: (dt: number, t: number) => void) { this.tickers.push(fn); return () => { this.tickers = this.tickers.filter((f) => f !== fn); }; }

  /**
   * Adaptive quality. Real devices differ a lot and the frame rate cannot be known in advance, so the live loop watches
   * its own frame time: after ~2 s of sustained <30 fps it steps the render quality down (never back up, so it cannot
   * oscillate). Level 1/2 shrink the pixel ratio, level 2 also drops shadows, level 3 is the floor.
   * Ignores the first second (shader compile), hidden-tab gaps and single long stalls.
   */
  private govern(rawMs: number) {
    const g = this.gov;
    g.age += rawMs;
    if (g.age < 1200 || rawMs > 400 || this.governorLevel >= 3) return;
    g.acc += rawMs; g.n++;
    if (g.acc < 1000) return;
    const avg = g.acc / g.n;
    g.acc = 0; g.n = 0;
    g.slow = avg > 34 ? g.slow + 1 : 0;
    if (g.slow < 2) return;
    g.slow = 0;
    this.setGovernorLevel(this.governorLevel + 1);
  }
  setGovernorLevel(level: number) {
    this.governorLevel = Math.min(3, Math.max(0, level));
    const scale = [1, 0.75, 0.6, 0.5][this.governorLevel];
    if (!this.renderer.xr.isPresenting) this.renderer.setPixelRatio(Math.max(0.5, this.baseDpr * scale));
    if (this.governorLevel >= 2 && this.renderer.shadowMap.enabled) {
      this.renderer.shadowMap.enabled = false;
      this.scene.traverse((o) => {
        const mat = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((x) => { x.needsUpdate = true; });
      });
    }
    this.resize();
    this.onGovern?.(this.governorLevel);
  }

  /** Render one frame without the loop (reduced-motion stills, tests). */
  renderOnce(dt = 0) {
    this.clock += dt;
    for (const f of this.tickers) f(dt, this.clock);
    this.renderer.render(this.scene, this.camera);
    this.frames++;
  }
  start() {
    this.wantRun = true;
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const raw = now - this.last;
      const dt = Math.min(0.05, raw / 1000);
      this.last = now;
      this.govern(raw);
      this.renderOnce(dt);
    };
    this.raf = requestAnimationFrame(loop);
  }
  /** WebXR drives its own loop. */
  startXR(fn: (dt: number, t: number, frame?: XRFrame) => void) {
    this.pause();
    let lastT = 0;
    this.renderer.setAnimationLoop((now: number, frame?: XRFrame) => {
      const dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0;
      if (lastT) this.govern(now - lastT);
      lastT = now;
      this.clock += dt;
      fn(dt, this.clock, frame);
      for (const f of this.tickers) f(dt, this.clock);
      this.renderer.render(this.scene, this.camera);
      this.frames++;
    });
  }
  stopXR() { this.renderer.setAnimationLoop(null); }
  pause() { this.running = false; cancelAnimationFrame(this.raf); }
  stop() { this.wantRun = false; this.pause(); }
  dispose() {
    this.stop();
    this.stopXR();
    this.ro.disconnect();
    document.removeEventListener("visibilitychange", this.visHandler);
    this.opts.canvas.removeEventListener("webglcontextlost", this.lostHandler);
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((x) => { for (const v of Object.values(x)) if (v instanceof THREE.Texture) v.dispose(); x.dispose(); });
    });
    this.renderer.dispose();
  }
}

// ── textures made on a canvas ─────────────────────────────────────────────────
export function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, srgb = true): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d")!, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

let softSprite: THREE.CanvasTexture | null = null;
export function softDot(): THREE.CanvasTexture {
  softSprite ??= canvasTexture(64, 64, (g) => {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,255,255,1)");
    r.addColorStop(0.35, "rgba(255,255,255,0.55)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  });
  return softSprite;
}

/** Crinkled-foil bump map shared by gold-foil parts. */
let foilBump: THREE.CanvasTexture | null = null;
export function foilTexture(): THREE.CanvasTexture {
  foilBump ??= canvasTexture(256, 256, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const n = fbm(x / 9, y / 9, 3) * 0.7 + hash(x * 0.37, y * 0.37) * 0.3;
      const v = Math.floor(n * 255);
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, false);
  foilBump.wrapS = foilBump.wrapT = THREE.RepeatWrapping;
  return foilBump;
}

// ── world (terrain, sky, light) ───────────────────────────────────────────────
export interface World {
  root: THREE.Group;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  earth: THREE.Object3D | null;
  gravity: number;
  heightAt: (x: number, z: number) => number;
  /** 0 = bright working day, 1 = dusk/dark (the "silence"). */
  setDusk: (k: number) => void;
  /** direction FROM the origin TO the sun */
  sunDir: THREE.Vector3;
  update: (dt: number, t: number) => void;
}

const BODY = {
  moon: { gravity: 1.62, ground: [0.54, 0.53, 0.5], rock: 0x6f6e6a, fog: null as number | null },
  mars: { gravity: 3.71, ground: [0.66, 0.38, 0.23], rock: 0x6b3f2c, fog: 0xc89066 as number | null },
};

function earthTexture(): THREE.CanvasTexture {
  return canvasTexture(1024, 512, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h;
      const land = fbm(u * 7 + 3.1, v * 4 + 1.7, 5);
      const lat = Math.abs(v - 0.5) * 2;
      let r: number, gr: number, b: number;
      if (land > 0.52) {
        const dry = fbm(u * 9 + 20, v * 6, 3);
        r = 70 + dry * 110; gr = 100 + dry * 70 - lat * 20; b = 55 + dry * 40;
      } else { const d = 0.55 + land * 0.5; r = 12 * d; gr = 55 * d + 15; b = 130 * d + 30; }
      if (lat > 0.86) { r = 235; gr = 240; b = 245; }
      const cl = fbm(u * 11 + 8, v * 7 + 4, 5);
      const cloud = smooth(0.52, 0.72, cl) * 0.85;
      r = r + (250 - r) * cloud; gr = gr + (250 - gr) * cloud; b = b + (252 - b) * cloud;
      const i = (y * w + x) * 4;
      img.data[i] = r; img.data[i + 1] = gr; img.data[i + 2] = b; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  });
}

export function buildWorld(body: Body, q: Quality, assetBase: string): World {
  const cfg = BODY[body];
  const root = new THREE.Group();
  const sunDir = new THREE.Vector3(0.55, 0.45, 0.45).normalize();

  // terrain height: a flat pad at the origin (hardware sits here), gentle relief beyond, craters on the Moon
  const craters = Array.from({ length: body === "moon" ? 16 : 6 }, (_, i) => ({
    x: (hash(i, 1.3) - 0.5) * 220, z: (hash(i, 7.9) - 0.5) * 220, r: 7 + hash(i, 3.3) * 26, d: 0.5 + hash(i, 9.1) * 1.5,
  })).filter((c) => Math.hypot(c.x, c.z) > c.r + 18);
  const heightAt = (x: number, z: number) => {
    const r = Math.hypot(x, z);
    const pad = smooth(14, 40, r);
    let h = (fbm(x * 0.018, z * 0.018, 4) - 0.5) * (body === "moon" ? 5 : 7) * pad;
    h += (fbm(x * 0.12, z * 0.12, 3) - 0.5) * 0.35 * smooth(6, 20, r);
    if (body === "mars") h += Math.sin(x * 0.35 + fbm(x * 0.05, z * 0.05) * 9) * 0.07 * smooth(8, 30, r);
    for (const c of craters) {
      const d = Math.hypot(x - c.x, z - c.z) / c.r;
      if (d < 1.35) h -= c.d * (d < 1 ? (1 - d * d) : 0) - (d > 0.9 && d < 1.35 ? c.d * 0.35 * Math.sin((d - 0.9) / 0.45 * Math.PI) : 0);
    }
    return h;
  };

  // ground
  const size = 460, seg = q.terrainSeg;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
    const n = 0.82 + fbm(x * 0.09, z * 0.09, 3) * 0.36;
    col[i * 3] = cfg.ground[0] * n; col[i * 3 + 1] = cfg.ground[1] * n; col[i * 3 + 2] = cfg.ground[2] * n;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 });
  const ground = new THREE.Mesh(geo, groundMat);
  ground.receiveShadow = true;
  root.add(ground);
  // detail textures (original, vendored with the game) — optional; the vertex-coloured ground already reads fine
  const tl = new THREE.TextureLoader();
  const rep = (t: THREE.Texture, srgb: boolean) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(150, 150); t.anisotropy = 4; if (srgb) t.colorSpace = THREE.SRGBColorSpace; groundMat.needsUpdate = true; return t; };
  // the shipped albedo is Mars-coloured: use it for Mars only (the Moon keeps its grey vertex colours + the normal map)
  if (body === "mars") tl.load(`${assetBase}/textures/game/regolith-base.webp`, (t) => { groundMat.map = rep(t, true); }, undefined, () => {});
  tl.load(`${assetBase}/textures/game/regolith-normal.webp`, (t) => { groundMat.normalMap = rep(t, false); groundMat.normalScale.set(0.5, 0.5); }, undefined, () => {});

  // rocks (instanced)
  const rockGeo = new THREE.IcosahedronGeometry(1, 1);
  const rp = rockGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < rp.count; i++) {
    const k = 0.78 + hash(rp.getX(i) * 9, rp.getZ(i) * 9 + rp.getY(i)) * 0.45;
    rp.setXYZ(i, rp.getX(i) * k, rp.getY(i) * k * 0.7, rp.getZ(i) * k);
  }
  rockGeo.computeVertexNormals();
  const rocks = new THREE.InstancedMesh(rockGeo, new THREE.MeshStandardMaterial({ color: cfg.rock, roughness: 0.95, flatShading: true }), q.rocks);
  const m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), eu = new THREE.Euler();
  for (let i = 0; i < q.rocks; i++) {
    const a = hash(i, 2.2) * Math.PI * 2;
    const d = 9 + Math.pow(hash(i, 5.5), 1.7) * 150;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    const s = 0.12 + Math.pow(hash(i, 8.8), 3) * (d > 60 ? 2.6 : 1.1);
    sc.set(s * (0.8 + hash(i, 1.1) * 0.7), s * (0.6 + hash(i, 4.4) * 0.5), s * (0.8 + hash(i, 6.6) * 0.7));
    ps.set(x, heightAt(x, z) + s * 0.25, z);
    eu.set(hash(i, 3.3) * 6, hash(i, 9.9) * 6, hash(i, 7.7) * 6);
    qt.setFromEuler(eu);
    m4.compose(ps, qt, sc);
    rocks.setMatrixAt(i, m4);
  }
  rocks.castShadow = q.shadows; rocks.receiveShadow = true;
  root.add(rocks);

  // distant ridge so the horizon is not a flat line
  const ridgeMat = new THREE.MeshStandardMaterial({ color: body === "moon" ? 0x4c4b48 : 0x7b4a33, roughness: 1, flatShading: true });
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + hash(i, 0.4) * 0.2;
    const d = 215 + hash(i, 1.9) * 25;
    const hh = 8 + hash(i, 5.1) * 30;
    const m = new THREE.Mesh(new THREE.ConeGeometry(18 + hash(i, 6.2) * 26, hh, 6 + (i % 3), 1), ridgeMat);
    m.position.set(Math.cos(a) * d, hh / 2 - 2, Math.sin(a) * d);
    m.rotation.y = hash(i, 2.7) * 6;
    root.add(m);
  }

  // lights
  const sun = new THREE.DirectionalLight(0xfff2de, body === "moon" ? 3.6 : 2.8);
  sun.castShadow = q.shadows;
  sun.shadow.mapSize.set(q.shadowSize, q.shadowSize);
  const sc2 = sun.shadow.camera;
  sc2.left = -16; sc2.right = 16; sc2.top = 16; sc2.bottom = -16; sc2.near = 1; sc2.far = 90;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  root.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(body === "moon" ? 0x40485a : 0xe8b48c, body === "moon" ? 0x15151a : 0x5a3320, body === "moon" ? 0.28 : 0.85);
  root.add(hemi);

  // sky
  const starGeo = new THREE.BufferGeometry();
  const sp = new Float32Array(q.stars * 3);
  for (let i = 0; i < q.stars; i++) {
    const u = hash(i, 11.1) * 2 - 1, a = hash(i, 13.7) * Math.PI * 2, r = Math.sqrt(1 - u * u);
    sp[i * 3] = Math.cos(a) * r * 1400; sp[i * 3 + 1] = Math.abs(u) * 1400 * 0.98 + 10; sp[i * 3 + 2] = Math.sin(a) * r * 1400;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.1, sizeAttenuation: false, transparent: true, opacity: body === "moon" ? 0.95 : 0, depthWrite: false, fog: false });
  const stars = new THREE.Points(starGeo, starMat);
  root.add(stars);

  let skyMat: THREE.ShaderMaterial | null = null;
  let earth: THREE.Object3D | null = null;
  let earthGlow: THREE.Mesh | null = null;
  if (body === "mars") {
    skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uSun: { value: sunDir.clone() }, uDusk: { value: 0 } },
      vertexShader: "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: `varying vec3 vDir; uniform vec3 uSun; uniform float uDusk;
        void main(){
          vec3 d = normalize(vDir);
          float h = clamp(d.y, 0.0, 1.0);
          vec3 horizon = mix(vec3(0.80,0.56,0.40), vec3(0.20,0.19,0.28), uDusk);
          vec3 zenith  = mix(vec3(0.36,0.31,0.34), vec3(0.015,0.02,0.05), uDusk);
          vec3 col = mix(horizon, zenith, pow(h, 0.5));
          float s = max(dot(d, normalize(uSun)), 0.0);
          vec3 halo = mix(vec3(1.0,0.82,0.62), vec3(0.42,0.62,1.0), uDusk);
          col += halo * (pow(s, 20.0) * 0.5 + pow(s, 220.0) * 0.8);
          col += vec3(1.0,0.97,0.9) * smoothstep(0.9992, 0.9997, s) * 2.0;
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), skyMat);
    root.add(dome);
    root.userData.fog = new THREE.FogExp2(cfg.fog!, 0.0042);
  } else {
    // the Moon: black sky, a lit Earth and the Sun's glare
    const eg = new THREE.Group();
    const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.MeshStandardMaterial({ map: earthTexture(), roughness: 0.8, metalness: 0, emissive: 0x0a1a33, emissiveIntensity: 0.55, fog: false }));
    eg.add(globe);
    earthGlow = new THREE.Mesh(new THREE.SphereGeometry(1.07, 32, 16), new THREE.MeshBasicMaterial({ color: 0x5aa8ff, transparent: true, opacity: 0.18, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    eg.add(earthGlow);
    eg.scale.setScalar(52);
    eg.position.set(-640, 200, -760);
    eg.rotation.set(0.3, 1.2, 0.4);
    root.add(eg);
    earth = eg;
  }
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: body === "moon" ? 0xfff6e0 : 0xffe6c0, transparent: true, opacity: body === "moon" ? 0.9 : 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  sunGlow.scale.setScalar(body === "moon" ? 260 : 360);
  root.add(sunGlow);

  const placeSun = () => {
    sun.position.copy(sunDir).multiplyScalar(60);
    sunGlow.position.copy(sunDir).multiplyScalar(1200);
    skyMat?.uniforms.uSun.value.copy(sunDir);
  };
  placeSun();

  let dusk = 0;
  const base = { sunI: sun.intensity, hemiI: hemi.intensity };
  const setDusk = (k: number) => {
    dusk = Math.min(1, Math.max(0, k));
    // the sun slides toward the horizon and cools; ambient fades
    const el = THREE.MathUtils.lerp(0.55, 0.07, dusk);
    sunDir.set(Math.cos(0.8) * Math.cos(el), Math.sin(el), Math.sin(0.8) * Math.cos(el)).normalize();
    placeSun();
    sun.intensity = base.sunI * THREE.MathUtils.lerp(1, 0.42, dusk);
    sun.color.setRGB(1, THREE.MathUtils.lerp(0.95, 0.62, dusk), THREE.MathUtils.lerp(0.87, 0.4, dusk));
    hemi.intensity = base.hemiI * THREE.MathUtils.lerp(1, body === "moon" ? 0.6 : 0.3, dusk);
    if (skyMat) skyMat.uniforms.uDusk.value = dusk;
    if (body === "mars") starMat.opacity = smooth(0.55, 1, dusk) * 0.9;
    const fog = root.userData.fog as THREE.FogExp2 | undefined;
    if (fog) fog.color.setRGB(...(([0.78, 0.56, 0.4] as const).map((v, i) => THREE.MathUtils.lerp(v, [0.16, 0.16, 0.22][i], dusk)) as [number, number, number]));
  };
  setDusk(0);

  return {
    root, sun, hemi, earth, gravity: cfg.gravity, heightAt, setDusk, sunDir,
    update: (_dt, t) => {
      if (earth) earth.rotation.y = 1.2 + t * 0.012;
      stars.rotation.y = t * 0.002;
    },
  };
}

// ── dust / particles ──────────────────────────────────────────────────────────
export class Dust {
  readonly points: THREE.Points;
  private pos: Float32Array;
  private vel: Float32Array;
  private life: Float32Array;
  private max: Float32Array;
  private next = 0;
  constructor(private count: number, private gravity: number, private heightAt: (x: number, z: number) => number, color: number, private drag: number) {
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(count * 3).fill(0);
    for (let i = 0; i < count; i++) this.pos[i * 3 + 1] = -999;
    this.vel = new Float32Array(count * 3);
    this.life = new Float32Array(count);
    this.max = new Float32Array(count).fill(1);
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    const m = new THREE.PointsMaterial({ color, size: 0.9, map: softDot(), transparent: true, opacity: 0.55, depthWrite: false, sizeAttenuation: true });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
  }
  emit(origin: THREE.Vector3, n: number, spreadH: number, speedUp: number, life: number) {
    for (let k = 0; k < n; k++) {
      const i = this.next++ % this.count;
      const a = Math.random() * Math.PI * 2, s = spreadH * (0.3 + Math.random() * 0.7);
      this.pos[i * 3] = origin.x + (Math.random() - 0.5) * 0.4; this.pos[i * 3 + 1] = origin.y + 0.05; this.pos[i * 3 + 2] = origin.z + (Math.random() - 0.5) * 0.4;
      this.vel[i * 3] = Math.cos(a) * s; this.vel[i * 3 + 1] = Math.random() * speedUp; this.vel[i * 3 + 2] = Math.sin(a) * s;
      this.life[i] = this.max[i] = life * (0.6 + Math.random() * 0.8);
    }
  }
  update(dt: number) {
    const mat = this.points.material as THREE.PointsMaterial;
    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.pos[i * 3 + 1] = -999; continue; }
      this.vel[i * 3 + 1] -= this.gravity * dt;
      const d = Math.max(0, 1 - this.drag * dt);
      this.vel[i * 3] *= d; this.vel[i * 3 + 2] *= d;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const gy = this.heightAt(this.pos[i * 3], this.pos[i * 3 + 2]) + 0.03;
      if (this.pos[i * 3 + 1] < gy) { this.pos[i * 3 + 1] = gy; this.vel[i * 3 + 1] *= -0.15; this.vel[i * 3] *= 0.8; this.vel[i * 3 + 2] *= 0.8; }
    }
    (this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    mat.opacity = 0.55;
  }
}

/** A rocket flame: hot core + orange plume, additive, with flicker. */
export class Flame {
  readonly root = new THREE.Group();
  private core: THREE.Mesh;
  private plume: THREE.Mesh;
  private light: THREE.PointLight;
  private k = 0;
  constructor(length = 5, radius = 0.55) {
    const mk = (r: number, l: number, color: number, op: number) => {
      // ConeGeometry: apex at +y, wide base at -y. Move the apex to the origin so the plume widens downward.
      const g = new THREE.ConeGeometry(r, l, 20, 1, true);
      g.translate(0, -l / 2, 0);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      this.root.add(m);
      return m;
    };
    this.plume = mk(radius, length, 0xff8a2b, 0.55);
    this.core = mk(radius * 0.45, length * 0.55, 0xfff1c9, 0.85);
    this.light = new THREE.PointLight(0xffa24a, 0, 40, 1.6);
    this.light.position.y = -1;
    this.root.add(this.light);
    this.root.visible = false;
  }
  set(k: number) { this.k = k; this.root.visible = k > 0.01; }
  update(t: number) {
    if (this.k <= 0.01) return;
    const f = 0.88 + Math.sin(t * 47) * 0.07 + Math.sin(t * 91) * 0.05;
    this.root.scale.set(1, this.k * f, 1);
    this.light.intensity = 90 * this.k * f;
  }
}
