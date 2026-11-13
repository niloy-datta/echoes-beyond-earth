// THE EXPLORER — original rigged astronaut, authored procedurally.
// Output: public/models/game/explorer-{ultra,high,low}.glb (skinned mesh, 23-bone
// skeleton, 12 animation clips, PBR materials with generated WebP textures).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GlbBuilder } from "./lib/gltf.mjs";
import { emblem, encode, hardShell, suitFabric } from "./lib/textures.mjs";
import { smooth } from "./lib/noise.mjs";
import { along, boxUv, ellipsoid, roundBox, roundCone, sculpt, simplify, smax, smin, sphere } from "./lib/sdf.mjs";

// ── Skeleton (bind pose, metres, character faces +Z, left = +X) ─────────────
const BONES = [
  ["root", null, [0, 0, 0]],
  ["hips", "root", [0, 0.98, 0]],
  ["spine", "hips", [0, 1.08, 0]],
  ["chest", "spine", [0, 1.28, 0]],
  ["neck", "chest", [0, 1.52, 0]],
  ["head", "neck", [0, 1.6, 0.0]],
];
for (const [s, x] of [["L", 1], ["R", -1]]) {
  BONES.push(
    [`shoulder_${s}`, "chest", [0.09 * x, 1.46, 0]],
    [`upperArm_${s}`, `shoulder_${s}`, [0.205 * x, 1.45, 0]],
    [`lowerArm_${s}`, `upperArm_${s}`, [0.225 * x, 1.16, 0]],
    [`hand_${s}`, `lowerArm_${s}`, [0.235 * x, 0.9, 0.0]],
    [`upperLeg_${s}`, "hips", [0.105 * x, 0.93, 0]],
    [`lowerLeg_${s}`, `upperLeg_${s}`, [0.11 * x, 0.5, 0.0]],
    [`foot_${s}`, `lowerLeg_${s}`, [0.115 * x, 0.09, 0.0]],
    [`toe_${s}`, `foot_${s}`, [0.115 * x, 0.03, 0.13]],
  );
}
const INDEX = new Map(BONES.map((b, i) => [b[0], i]));
const HEAD = new Map(BONES.map((b) => [b[0], new THREE.Vector3(...b[2])]));
const TAIL = new Map();
for (const [name] of BONES) {
  const child = BONES.find((b) => b[1] === name && !b[0].startsWith("shoulder") && !b[0].startsWith("upperLeg"));
  const h = HEAD.get(name);
  if (child) TAIL.set(name, HEAD.get(child[0]).clone());
  else if (name === "head") TAIL.set(name, h.clone().add(new THREE.Vector3(0, 0.26, 0)));
  else if (name.startsWith("hand")) TAIL.set(name, h.clone().add(new THREE.Vector3(0, -0.16, 0.01)));
  else if (name.startsWith("toe")) TAIL.set(name, h.clone().add(new THREE.Vector3(0, 0, 0.08)));
  else TAIL.set(name, h.clone().add(new THREE.Vector3(0, 0.1, 0)));
}

function segDist(p, a, b) {
  const ab = b.clone().sub(a), t = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / Math.max(ab.lengthSq(), 1e-9), 0, 1);
  return p.distanceTo(a.clone().addScaledVector(ab, t));
}

/** Envelope skinning: inverse-distance weights to candidate bone segments (top 4). */
function skinWeights(geo, candidates) {
  const n = geo.attributes.position.count;
  const joints = new Uint16Array(n * 4), weights = new Float32Array(n * 4);
  const p = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    p.fromBufferAttribute(geo.attributes.position, i);
    const ws = candidates.map((b) => [INDEX.get(b), 1 / Math.pow(Math.max(segDist(p, HEAD.get(b), TAIL.get(b)), 0.004), 7)]);
    ws.sort((a, b) => b[1] - a[1]);
    const top = ws.slice(0, 4);
    const sum = top.reduce((s, w) => s + w[1], 0);
    top.forEach(([j, w], k) => { joints[i * 4 + k] = j; weights[i * 4 + k] = w / sum; });
  }
  return { joints, weights };
}

// ── Geometry helpers ───────────────────────────────────────────────────────
/** Tapered tube from a → b; `radii(t)` gives the radius along the length, with optional bellows. */
function tube(a, b, radii, radial, rows, { bellows = null, ellipse = 1 } = {}) {
  const dir = new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
  const len = dir.length();
  const pts = [];
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    let r = radii(t);
    if (bellows && t > bellows[0] && t < bellows[1]) r += 0.0045 * Math.sin(((t - bellows[0]) / (bellows[1] - bellows[0])) * Math.PI * 10);
    pts.push(new THREE.Vector2(Math.max(r, 0.002), t * len));
  }
  pts.unshift(new THREE.Vector2(0.0001, 0));
  pts.push(new THREE.Vector2(0.0001, len));
  const g = new THREE.LatheGeometry(pts, radial);
  g.scale(1, 1, ellipse);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
  g.translate(...a);
  scaleUv(g, 3, len * 3);
  return g;
}
const scaleUv = (g, su, sv) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return g; };
const at = (g, x, y, z) => { g.translate(x, y, z); return g; };
const rbox = (w, h, d, r, seg) => new RoundedBoxGeometry(w, h, d, seg, r);
function prep(g) {
  // Normalise attribute sets (and make every part indexed) so parts merge cleanly.
  if (!g.index) { const n = g.attributes.position.count; g.setIndex(Array.from({ length: n }, (_, i) => i)); }
  for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k);
  if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  return g;
}

// ── Sculpted suit (signed-distance field) ──────────────────────────────────
// One continuous pressure-garment surface: brief, waist, hard upper torso,
// shoulders, arms and legs blended with smooth unions; convolute bellows at
// elbows and knees; low fabric folds. Bone candidates per component keep the
// envelope skinning anatomical (an armpit never follows a thigh).
const V = (x, y, z) => [x, y, z];
function suitComponents() {
  const c = [];
  const add = (name, f, bones, k) => c.push({ name, f, bones, k });
  add("brief", ellipsoid(V(0, 0.955, 0.0), V(0.175, 0.135, 0.135)), ["hips"], 0.05);
  add("waist", roundCone(V(0, 0.97, 0), V(0, 1.17, 0.01), 0.158, 0.168, 0.8), ["hips", "spine"], 0.06);
  add("hut", ellipsoid(V(0, 1.335, 0.005), V(0.215, 0.175, 0.155)), ["spine", "chest"], 0.05);
  add("collar", roundCone(V(0, 1.44, 0), V(0, 1.52, 0), 0.15, 0.13, 0.85), ["chest"], 0.04);
  for (const [s, k] of [["L", 1], ["R", -1]]) {
    add(`shoulder_${s}`, sphere(V(0.198 * k, 1.425, -0.005), 0.088), ["chest", `upperArm_${s}`], 0.05);
    add(`upperArm_${s}`, roundCone(V(0.205 * k, 1.42, 0), V(0.225 * k, 1.165, 0.005), 0.074, 0.063), ["chest", `upperArm_${s}`, `lowerArm_${s}`], 0.03);
    add(`forearm_${s}`, roundCone(V(0.225 * k, 1.16, 0.005), V(0.235 * k, 0.94, 0.01), 0.062, 0.05), [`upperArm_${s}`, `lowerArm_${s}`, `hand_${s}`], 0.025);
    add(`thigh_${s}`, roundCone(V(0.1 * k, 0.9, 0.005), V(0.11 * k, 0.52, 0.01), 0.1, 0.077, 0.95), ["hips", `upperLeg_${s}`, `lowerLeg_${s}`], 0.06);
    add(`calf_${s}`, roundCone(V(0.11 * k, 0.5, 0.01), V(0.115 * k, 0.16, 0.0), 0.075, 0.062), [`upperLeg_${s}`, `lowerLeg_${s}`, `foot_${s}`], 0.03);
    add(`calfBulge_${s}`, ellipsoid(V(0.112 * k, 0.37, -0.012), V(0.07, 0.11, 0.072)), [`lowerLeg_${s}`], 0.03);
  }
  return c;
}

/** Convolute bellows: ring ridges along a joint section of a limb. */
const bellows = (a, b, from, to, pitch, amp) => {
  const t = along(a, b), len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  return (x, y, z) => {
    const u = t(x, y, z);
    if (u < from || u > to) return 0;
    const w = Math.sin(((u - from) / (to - from)) * Math.PI);
    return -amp * w * (0.5 + 0.5 * Math.cos(((u * len) / pitch) * Math.PI * 2));
  };
};

function suitField(components) {
  const ridges = [];
  for (const k of [1, -1]) {
    ridges.push({ near: 0.12, a: V(0.205 * k, 1.42, 0), f: bellows(V(0.205 * k, 1.42, 0), V(0.225 * k, 1.165, 0.005), 0.72, 1, 0.024, 0.0045) });
    ridges.push({ near: 0.12, a: V(0.225 * k, 1.16, 0.005), f: bellows(V(0.225 * k, 1.16, 0.005), V(0.235 * k, 0.94, 0.01), 0, 0.24, 0.022, 0.0042) });
    ridges.push({ near: 0.14, a: V(0.1 * k, 0.9, 0.005), f: bellows(V(0.1 * k, 0.9, 0.005), V(0.11 * k, 0.52, 0.01), 0.8, 1, 0.03, 0.0055) });
    ridges.push({ near: 0.14, a: V(0.11 * k, 0.5, 0.01), f: bellows(V(0.11 * k, 0.5, 0.01), V(0.115 * k, 0.16, 0), 0, 0.2, 0.028, 0.005) });
  }
  const limbs = components.filter((c) => /^(upperArm|forearm|thigh|calf)_/.test(c.name));
  return (x, y, z) => {
    let d = components[0].f(x, y, z);
    for (let i = 1; i < components.length; i++) d = smin(d, components[i].f(x, y, z), components[i].k);
    // Bellows only where the limb itself is the surface (not the torso next to it).
    let limb = Infinity;
    for (const c of limbs) limb = Math.min(limb, c.f(x, y, z));
    if (limb < 0.02) for (const r of ridges) d += r.f(x, y, z);
    // Soft fabric folds: low, irregular creases.
    d += 0.0016 * Math.sin(y * 61 + Math.sin(x * 23) * 2.1) * Math.sin(z * 37 + x * 19 + y * 7);
    // Waist bearing seat and the lower edge of the hard upper torso.
    d += 0.004 * Math.exp(-Math.pow((y - 1.005) / 0.008, 2));
    if (y > 1.1 && Math.abs(x) < 0.2) d -= 0.0035 * Math.exp(-Math.pow((y - 1.19) / 0.006, 2));
    return d;
  };
}

function gloveField(k) {
  const x0 = 0.236 * k;
  const palm = roundBox(V(x0, 0.852, 0.008), V(0.022, 0.048, 0.042), 0.02);
  const cuff = roundCone(V(0.234 * k, 0.95, 0.008), V(0.236 * k, 0.895, 0.008), 0.058, 0.05);
  const fingers = [-0.026, -0.009, 0.008, 0.025].map((z, i) =>
    roundCone(V(x0 - 0.002 * k, 0.81, z + 0.012), V(x0 - 0.006 * k, 0.74 + (i % 2) * 0.006 + (i === 3 ? 0.012 : 0), z + 0.03), 0.012, 0.0095));
  const thumb = roundCone(V(x0 - 0.018 * k, 0.86, 0.04), V(x0 - 0.03 * k, 0.81, 0.07), 0.013, 0.0105);
  return (x, y, z) => {
    let d = smin(palm(x, y, z), cuff(x, y, z), 0.02);
    for (const f of fingers) d = smin(d, f(x, y, z), 0.008);
    return smin(d, thumb(x, y, z), 0.012);
  };
}

function bootField(k) {
  const x0 = 0.115 * k;
  const shaft = roundCone(V(x0, 0.2, -0.005), V(x0, 0.075, 0.0), 0.075, 0.08, 1.05);
  const foot = roundBox(V(x0, 0.068, 0.045), V(0.064, 0.05, 0.155), 0.04);
  const toe = ellipsoid(V(x0, 0.06, 0.15), V(0.062, 0.05, 0.075));
  return (x, y, z) => smin(smin(shaft(x, y, z), foot(x, y, z), 0.05), toe(x, y, z), 0.04);
}

function soleField(k) {
  const x0 = 0.115 * k;
  const slab = roundBox(V(x0, 0.018, 0.045), V(0.068, 0.018, 0.168), 0.014);
  return (x, y, z) => {
    let d = slab(x, y, z);
    if (y < 0.012) d += 0.004 * Math.max(0, Math.sin((z + 0.2) * 140)); // lugged tread
    return d;
  };
}

const plssField = () => {
  const body = roundBox(V(0, 1.3, -0.255), V(0.205, 0.29, 0.105), 0.055);
  const cap = roundBox(V(0, 1.6, -0.25), V(0.18, 0.045, 0.09), 0.04);
  const panel = roundBox(V(0, 1.26, -0.365), V(0.12, 0.17, 0.012), 0.01);
  return (x, y, z) => smax(smin(body(x, y, z), cap(x, y, z), 0.03), -panel(x, y, z), 0.01);
};
const dcmField = () => roundBox(V(0, 1.315, 0.175), V(0.13, 0.065, 0.045), 0.028);

let sculptCache = null;
function sculpted() {
  if (sculptCache) return sculptCache;
  const t0 = Date.now();
  const components = suitComponents();
  const body = sculpt(suitField(components), [-0.36, 0.1, -0.22], [0.36, 1.58, 0.24], 0.0045);
  const extra = {
    gloves: [1, -1].map((k) => ({ k, g: sculpt(gloveField(k), [Math.min(0.17 * k - 0.07, 0.17 * k + 0.13 * k), 0.7, -0.06], [Math.max(0.17 * k - 0.07 * k, 0.17 * k + 0.13 * k), 0.97, 0.12], 0.0025) })),
    boots: [1, -1].map((k) => ({ k, g: sculpt(bootField(k), [0.115 * k - 0.1, 0.0, -0.13], [0.115 * k + 0.1, 0.23, 0.25], 0.004) })),
    soles: [1, -1].map((k) => ({ k, g: sculpt(soleField(k), [0.115 * k - 0.09, -0.01, -0.14], [0.115 * k + 0.09, 0.05, 0.23], 0.0035) })),
    plss: sculpt(plssField(), [-0.25, 0.95, -0.4], [0.25, 1.68, -0.12], 0.005),
    dcm: sculpt(dcmField(), [-0.16, 1.22, 0.11], [0.16, 1.41, 0.24], 0.004),
  };
  console.log(`[explorer] sculpted surfaces in ${Date.now() - t0} ms (body ${body.index.count / 3} tris before simplification)`);
  sculptCache = { components, body, ...extra };
  return sculptCache;
}

/** Skin a sculpted surface: candidate bones from the nearest components, inverse-distance weights. */
function skinSculpted(geo, components) {
  const n = geo.attributes.position.count;
  const joints = new Uint16Array(n * 4), weights = new Float32Array(n * 4);
  const p = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    p.fromBufferAttribute(geo.attributes.position, i);
    const ds = components.map((c) => c.f(p.x, p.y, p.z));
    const dmin = Math.min(...ds);
    const bones = new Set();
    components.forEach((c, j) => { if (ds[j] < dmin + 0.03) c.bones.forEach((b) => bones.add(b)); });
    const ws = [...bones].map((b) => [INDEX.get(b), 1 / Math.pow(Math.max(segDist(p, HEAD.get(b), TAIL.get(b)), 0.006), 4.5)]);
    ws.sort((a, b) => b[1] - a[1]);
    const top = ws.slice(0, 4), sum = top.reduce((s, w) => s + w[1], 0);
    top.forEach(([j, w], k) => { joints[i * 4 + k] = j; weights[i * 4 + k] = w / sum; });
  }
  return { joints, weights };
}

/** Per-vertex RGB tint (multiplied into the dust colour bake). */
const tintBy = (geo, fn) => {
  const p = geo.attributes.position, n = geo.attributes.normal, out = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) out.set(fn(p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i)), i * 3);
  return out;
};

/** Split a sculpted mesh into two index sets by a per-triangle predicate on the centroid. */
function splitBy(geo, predicate) {
  const idx = geo.index.array, p = geo.attributes.position, a = [], b = [];
  for (let t = 0; t < idx.length; t += 3) {
    const cx = (p.getX(idx[t]) + p.getX(idx[t + 1]) + p.getX(idx[t + 2])) / 3;
    const cy = (p.getY(idx[t]) + p.getY(idx[t + 1]) + p.getY(idx[t + 2])) / 3;
    const cz = (p.getZ(idx[t]) + p.getZ(idx[t + 1]) + p.getZ(idx[t + 2])) / 3;
    (predicate(cx, cy, cz) ? a : b).push(idx[t], idx[t + 1], idx[t + 2]);
  }
  const make = (list) => { const g = geo.clone(); g.setIndex(list); return g; };
  return [make(a), make(b)];
}

async function build(lod) {
  const ultra = lod === "ultra", high = lod !== "low";
  const R = ultra ? 32 : high ? 26 : 14, SPH = ultra ? [48, 34] : high ? [40, 28] : [20, 14];
  const budget = ultra ? { body: 25000, glove: 2200, boot: 2000, sole: 700, plss: 2000, dcm: 500 }
    : high ? { body: 17000, glove: 1500, boot: 1500, sole: 500, plss: 1500, dcm: 400 }
      : { body: 6000, glove: 450, boot: 500, sole: 180, plss: 500, dcm: 160 };
  const parts = { fabric: [], shell: [], metal: [], rubber: [], visor: [], accent: [], glow: [], emblem: [] };
  const add = (mat, geo, bones, extra = {}) => parts[mat].push({ geo: prep(geo), bones: Array.isArray(bones) ? bones : [bones], ...extra });
  const S = sculpted();

  // Pressure garment + hard upper torso (same surface, two materials).
  const body = boxUv(await simplify(S.body, budget.body, ultra ? 0.006 : high ? 0.01 : 0.03), 3.2);
  const [hutGeo, fabricGeo] = splitBy(body, (x, y) => y > 1.205 && y < 1.5 && Math.abs(x) < 0.17 + (y - 1.2) * 0.05);
  for (const [mat, g] of [["shell", hutGeo], ["fabric", fabricGeo]]) {
    const geo = prep(g);
    parts[mat].push({ geo, bones: [], skin: skinSculpted(geo, S.components) });
  }

  // Gloves: light fabric with dark grip pads on palm and fingertips.
  for (const { k, g } of S.gloves) {
    const geo = boxUv(await simplify(g, budget.glove, 0.002), 6);
    const s = k > 0 ? "L" : "R";
    add("fabric", geo, [`hand_${s}`, `lowerArm_${s}`], {
      tint: tintBy(geo, (x, y, z, nx, ny) => {
        const palm = nx * -k > 0.45 || (y < 0.765 && ny < 0.3);
        return palm ? [0.24, 0.23, 0.22] : y > 0.9 ? [0.86, 0.86, 0.86] : [0.8, 0.79, 0.77];
      }),
    });
  }
  // Boots: moulded upper, separate lugged rubber sole.
  for (const { k, g } of S.boots) {
    const s = k > 0 ? "L" : "R";
    add("shell", boxUv(await simplify(g, budget.boot, 0.002), 4), [`foot_${s}`, `toe_${s}`, `lowerLeg_${s}`]);
  }
  for (const { k, g } of S.soles) {
    const s = k > 0 ? "L" : "R";
    add("rubber", boxUv(await simplify(g, budget.sole, 0.0015), 4), [`foot_${s}`, `toe_${s}`]);
  }
  // Portable life support system and display/control module.
  add("shell", boxUv(await simplify(S.plss, budget.plss, 0.002), 2.2), "chest");
  add("shell", boxUv(await simplify(S.dcm, budget.dcm, 0.0015), 4), "chest");
  add("glow", at(new THREE.PlaneGeometry(0.11, 0.04), 0, 1.33, 0.2205), "chest");
  for (const kx of [-1, 1]) add("metal", at(new THREE.CylinderGeometry(0.011, 0.011, 0.02, 12).rotateX(Math.PI / 2), 0.085 * kx, 1.29, 0.226), "chest");
  for (let i = 0; i < 4; i++) add("rubber", at(rbox(0.22, 0.01, 0.012, 0.004, 1), 0, 1.17 + i * 0.026, -0.357), "chest");
  add("metal", at(new THREE.CylinderGeometry(0.004, 0.004, 0.24, 6), 0.15, 1.74, -0.31), "chest");
  add("glow", at(new THREE.SphereGeometry(0.009, 8, 6), 0.15, 1.865, -0.31), "chest");
  // Umbilical hoses from the DCM into the PLSS.
  for (const k of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([[0.12 * k, 1.29, 0.2], [0.185 * k, 1.27, 0.17], [0.215 * k, 1.29, 0.06], [0.19 * k, 1.35, -0.14]].map((v) => new THREE.Vector3(...v)));
    add("rubber", new THREE.TubeGeometry(curve, high ? 24 : 8, 0.013, high ? 10 : 5), "chest");
  }
  // Waist and neck bearings.
  add("metal", at(new THREE.TorusGeometry(0.168, 0.011, 10, R).rotateX(Math.PI / 2).scale(1, 1, 0.8), 0, 1.005, 0.0), "hips");
  add("metal", at(new THREE.TorusGeometry(0.128, 0.022, 12, R).rotateX(Math.PI / 2), 0, 1.535, 0), "neck");

  // Helmet: hard shell, pressure bubble with a restrained gold sun visor, brow ridge.
  add("shell", at(new THREE.SphereGeometry(0.168, SPH[0], SPH[1], Math.PI / 2 + 1.05, Math.PI * 2 - 2.1, 0, Math.PI * 0.62).scale(1, 1.04, 1.04), 0, 1.7, -0.004), "head");
  add("visor", at(new THREE.SphereGeometry(0.163, SPH[0], SPH[1], Math.PI / 2 - 1.1, 2.2, 0.62, 1.18).scale(1, 1.04, 1.04), 0, 1.7, 0.0), "head");
  add("shell", at(new THREE.SphereGeometry(0.175, SPH[0], 8, Math.PI / 2 - 1.12, 2.24, 0.42, 0.22).scale(1, 1.04, 1.04), 0, 1.7, 0.0), "head");
  for (const k of [-1, 1]) {
    // EVA light assemblies on the helmet sides.
    add("shell", at(rbox(0.035, 0.06, 0.08, 0.012, 2), 0.172 * k, 1.735, 0.03), "head");
    add("glow", at(new THREE.PlaneGeometry(0.026, 0.04), 0.172 * k, 1.735, 0.0705), "head");
  }

  for (const [s, k] of [["L", 1], ["R", -1]]) {
    // Shoulder and wrist bearings, sleeve stripe.
    add("metal", at(new THREE.TorusGeometry(0.076, 0.011, 10, R).rotateX(Math.PI / 2).rotateZ(0.08 * k), 0.208 * k, 1.385, 0), [`upperArm_${s}`, "chest"]);
    add("metal", at(new THREE.TorusGeometry(0.054, 0.01, 10, R).rotateX(Math.PI / 2), 0.235 * k, 0.948, 0.008), `lowerArm_${s}`);
    add("accent", at(new THREE.TorusGeometry(0.07, 0.0055, 6, R).rotateX(Math.PI / 2), 0.214 * k, 1.33, 0.002), `upperArm_${s}`);
    if (s === "L") {
      add("shell", at(rbox(0.045, 0.075, 0.058, 0.012, 2), 0.276, 1.0, 0.005), "lowerArm_L");
      add("glow", at(new THREE.PlaneGeometry(0.04, 0.055).rotateY(Math.PI / 2), 0.2992, 1.0, 0.005), "lowerArm_L");
      add("emblem", at(new THREE.PlaneGeometry(0.07, 0.07).rotateY(Math.PI / 2), 0.2905, 1.31, 0.0), "upperArm_L");
    }
    add("metal", at(new THREE.TorusGeometry(0.074, 0.01, 10, R).rotateX(Math.PI / 2), 0.115 * k, 0.205, 0), `lowerLeg_${s}`);
  }
  if (process.env.EXPLORER_STATS) for (const [m, list] of Object.entries(parts)) console.log(lod, m, list.map((p) => p.geo.index.count / 3).join("+"));
  return parts;
}

// ── Animation authoring ───────────────────────────────────────────────────
const TAU = Math.PI * 2;
const sn = (q) => Math.sin(TAU * q);
const wrap = (q) => q - Math.floor(q);
const bump = (q, c, w) => { let d = wrap(q - c); if (d > 0.5) d -= 1; return Math.exp(-(d / w) * (d / w)); };
const env = (t, a, b, c, d) => smooth(a, b, t) * (1 - smooth(c, d, t));
const mirror = (e) => [e[0], -e[1], -e[2]];
const relaxed = () => ({ upperArm_L: [0, 0, 0.12], upperArm_R: [0, 0, -0.12], lowerArm_L: [-0.18, 0, 0], lowerArm_R: [-0.18, 0, 0] });

const CLIPS = {
  idle: { duration: 4, loop: true, pose(t) {
    const b = sn(t / 4), b2 = sn(t / 4 + 0.25);
    const p = relaxed();
    return { ...p, chest: [0.025 * b, 0, 0], spine: [0.01 * b, 0.01 * b2, 0], head: [0, 0.05 * b2, 0], upperArm_L: [0.02 * b, 0, 0.12 + 0.01 * b], upperArm_R: [0.02 * b, 0, -0.12 - 0.01 * b], hips: [0, 0, 0.01 * b2], hipsOffset: [0.008 * b2, 0.004 * b, 0] };
  } },
  look_around: { duration: 6, loop: true, pose(t) {
    const y = 0.75 * (smooth(0.6, 1.6, t) - smooth(2.6, 3.8, t) * 2 + smooth(4.6, 5.6, t));
    const b = sn(t / 3);
    return { ...relaxed(), neck: [0, y * 0.35, 0], head: [-0.05, y * 0.6, 0], chest: [0.02 * b, y * 0.25, 0], hipsOffset: [0, 0.004 * b, 0] };
  } },
  walk: { duration: 1.0, loop: true, pose(t) {
    const p = t / 1.0, out = {};
    for (const [s, ph] of [["L", p], ["R", p + 0.5]]) {
      const hip = 0.42 * sn(ph);
      out[`upperLeg_${s}`] = [-hip, 0, 0];
      out[`lowerLeg_${s}`] = [0.08 + 0.95 * bump(ph, 0.9, 0.13) + 0.22 * bump(ph, 0.33, 0.1), 0, 0];
      out[`foot_${s}`] = [-0.12 * sn(ph) + 0.35 * bump(ph, 0.66, 0.08) - 0.25 * bump(ph, 0.9, 0.1), 0, 0];
      const arm = [0.32 * sn(ph), 0, s === "L" ? 0.12 : -0.12];
      out[`upperArm_${s}`] = arm;
      out[`lowerArm_${s}`] = [-(0.25 + 0.15 * Math.max(0, -sn(ph))), 0, 0];
    }
    return { ...out, hips: [0, 0.07 * sn(p), 0.02 * sn(2 * p)], spine: [0.05, -0.05 * sn(p), 0], chest: [0.02, -0.07 * sn(p), 0], head: [-0.03, 0.08 * sn(p), 0], hipsOffset: [0.015 * sn(p), 0.025 * Math.cos(TAU * 2 * p), 0] };
  } },
  run: { duration: 0.7, loop: true, pose(t) {
    const p = t / 0.7, out = {};
    for (const [s, ph] of [["L", p], ["R", p + 0.5]]) {
      out[`upperLeg_${s}`] = [-0.7 * sn(ph) - 0.15, 0, 0];
      out[`lowerLeg_${s}`] = [0.25 + 1.5 * bump(ph, 0.85, 0.16) + 0.35 * bump(ph, 0.3, 0.1), 0, 0];
      out[`foot_${s}`] = [-0.15 * sn(ph) + 0.45 * bump(ph, 0.62, 0.08), 0, 0];
      out[`upperArm_${s}`] = [0.6 * sn(ph), 0, s === "L" ? 0.15 : -0.15];
      out[`lowerArm_${s}`] = [-1.25 - 0.15 * sn(ph), 0, 0];
    }
    return { ...out, hips: [0, 0.1 * sn(p), 0.03 * sn(2 * p)], spine: [0.18, -0.08 * sn(p), 0], chest: [0.05, -0.1 * sn(p), 0], head: [-0.15, 0.08 * sn(p), 0], hipsOffset: [0.012 * sn(p), -0.045 * Math.cos(TAU * 2 * (p - 0.05)) - 0.03, 0] };
  } },
  turn: { duration: 0.8, loop: true, pose(t) {
    const p = t / 0.8, l = bump(p, 0.25, 0.14), r = bump(p, 0.75, 0.14);
    return { ...relaxed(), upperLeg_L: [-0.32 * l, 0, 0], lowerLeg_L: [0.62 * l, 0, 0], upperLeg_R: [-0.32 * r, 0, 0], lowerLeg_R: [0.62 * r, 0, 0], spine: [0.03, 0, 0], hipsOffset: [0.012 * sn(p), -0.01 * (l + r), 0] };
  } },
  jump: { duration: 1.0, loop: true, pose(t) {
    const w = 0.04 * sn(t);
    return { upperLeg_L: [-0.6 - w, 0, 0], lowerLeg_L: [0.95, 0, 0], foot_L: [0.2, 0, 0], upperLeg_R: [-0.25 + w, 0, 0], lowerLeg_R: [0.55, 0, 0], foot_R: [0.25, 0, 0],
      upperArm_L: [-0.35, 0, 0.45 + w], upperArm_R: [-0.35, 0, -0.45 - w], lowerArm_L: [-0.5, 0, 0], lowerArm_R: [-0.5, 0, 0], spine: [0.1, 0, 0], head: [-0.1, 0, 0] };
  } },
  land: { duration: 0.45, loop: false, pose(t) {
    const f = Math.pow(Math.sin(Math.PI * Math.min(1, t / 0.45)), 0.7);
    return { ...relaxed(), upperLeg_L: [-0.55 * f, 0, 0], upperLeg_R: [-0.55 * f, 0, 0], lowerLeg_L: [1.0 * f, 0, 0], lowerLeg_R: [1.0 * f, 0, 0], foot_L: [-0.45 * f, 0, 0], foot_R: [-0.45 * f, 0, 0],
      spine: [0.3 * f, 0, 0], upperArm_L: [-0.3 * f, 0, 0.12 + 0.25 * f], upperArm_R: [-0.3 * f, 0, -0.12 - 0.25 * f], hipsOffset: [0, -0.14 * f, -0.02 * f] };
  } },
  interact: { duration: 1.4, loop: false, pose(t) {
    const e = env(t, 0.1, 0.45, 0.95, 1.35), tap = bump(t / 1.4, 0.55, 0.05);
    return { ...relaxed(), upperArm_R: [-1.15 * e, -0.15 * e, -0.12 - 0.05 * e], lowerArm_R: [-(0.2 + 0.25 * (1 - e)) - 0.15 * tap, 0, 0], hand_R: [0.25 * tap, 0, 0],
      spine: [0.08 * e, 0.06 * e, 0], head: [0.15 * e, -0.1 * e, 0], hipsOffset: [0, -0.01 * e, 0] };
  } },
  scan: { duration: 2.2, loop: false, pose(t) {
    const e = env(t, 0.1, 0.45, 1.8, 2.15), sweep = Math.sin(((t - 0.6) / 1.1) * Math.PI * 2) * env(t, 0.5, 0.7, 1.5, 1.75);
    return { ...relaxed(), upperArm_L: [-0.95 * e, 0.35 * e, 0.12 + 0.3 * e], lowerArm_L: [-1.7 * e - 0.18 * (1 - e), 0, 0], hand_L: [0, 0, -0.3 * e],
      head: [0.35 * e, 0.3 * e + 0.25 * sweep, 0], chest: [0.05 * e, 0.3 * sweep, 0], neck: [0.1 * e, 0.1 * sweep, 0] };
  } },
  kneel: { duration: 2.8, loop: false, pose(t) {
    const e = env(t, 0.1, 0.7, 2.05, 2.7), look = bump(t / 2.8, 0.5, 0.1);
    return { upperLeg_L: [-1.45 * e, 0, 0], lowerLeg_L: [1.5 * e, 0, 0], foot_L: [-0.05 * e, 0, 0],
      upperLeg_R: [0.12 * e, 0, 0], lowerLeg_R: [1.58 * e, 0, 0], foot_R: [0.6 * e, 0, 0], toe_R: [-0.7 * e, 0, 0],
      spine: [0.32 * e, 0, 0], chest: [0.1 * e, 0.1 * look, 0], head: [0.42 * e, 0.15 * look, 0],
      upperArm_R: [-0.85 * e, 0, -0.12], lowerArm_R: [-0.25 * e - 0.18 * (1 - e) - 0.2 * look, 0, 0], upperArm_L: [-0.55 * e, 0, 0.12], lowerArm_L: [-0.95 * e - 0.18 * (1 - e), 0, 0],
      hipsOffset: [0, -0.48 * e, -0.06 * e] };
  } },
  examine: { duration: 2.0, loop: false, pose(t) {
    const e = env(t, 0.1, 0.5, 1.5, 1.95);
    return { ...relaxed(), spine: [0.28 * e, 0, 0], chest: [0.08 * e, 0, 0], head: [0.32 * e, 0, 0.18 * e], upperArm_R: [-1.35 * e, 0, -0.12 - 0.3 * e], lowerArm_R: [-1.85 * e - 0.18 * (1 - e), 0, 0], hipsOffset: [0, -0.02 * e, -0.03 * e] };
  } },
  wave: { duration: 1.8, loop: false, pose(t) {
    const e = env(t, 0.05, 0.35, 1.45, 1.75), w = Math.sin(t * 9) * e;
    return { ...relaxed(), upperArm_R: [-0.2 * e, 0, -0.12 - 2.3 * e], lowerArm_R: [-0.2 - 0.6 * e, 0, -0.35 * w], head: [0, -0.15 * e, 0.08 * e], chest: [0, -0.08 * e, 0] };
  } },
};

function sampleClips(builder, nodes) {
  const fps = 30;
  for (const [name, clip] of Object.entries(CLIPS)) {
    const frames = Math.round(clip.duration * fps) + 1;
    const times = new Float32Array(frames);
    const rot = new Map(BONES.filter((b) => b[0] !== "root").map((b) => [b[0], new Float32Array(frames * 4)]));
    const hipsT = new Float32Array(frames * 3);
    const q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let f = 0; f < frames; f++) {
      const t = Math.min(clip.duration, f / fps);
      times[f] = t;
      // Loops sample their own start at the end so playback wraps seamlessly.
      const pose = clip.pose(clip.loop && f === frames - 1 ? 0 : t);
      for (const [bone, arr] of rot) {
        const ang = pose[bone] ?? [0, 0, 0];
        e.set(ang[0], ang[1], ang[2], "XYZ");
        q.setFromEuler(e);
        arr.set([q.x, q.y, q.z, q.w], f * 4);
      }
      const off = pose.hipsOffset ?? [0, 0, 0];
      const h = HEAD.get("hips"), rootH = HEAD.get("root");
      hipsT.set([h.x - rootH.x + off[0], h.y - rootH.y + off[1], h.z - rootH.z + off[2]], f * 3);
    }
    const channels = [...rot].map(([bone, values]) => ({ node: nodes.get(bone), path: "rotation", times, values }));
    channels.push({ node: nodes.get("hips"), path: "translation", times, values: hipsT });
    builder.animation(name, channels);
  }
}

async function dustColors(geo) {
  // Bake dust accumulation into vertex colour: heavier toward the boots.
  const n = geo.attributes.position.count, out = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const y = geo.attributes.position.getY(i), x = geo.attributes.position.getX(i), z = geo.attributes.position.getZ(i);
    const dust = smooth(0.62, 0.02, y) * 0.55 + 0.06 * Math.max(0, Math.sin(x * 40 + z * 23 + y * 31));
    out.set([1 - dust * 0.18, 1 - dust * 0.34, 1 - dust * 0.46, 1], i * 4);
  }
  return out;
}

export async function buildExplorer(outPath, lod) {
  const size = lod === "ultra" ? 1536 : lod === "high" ? 1024 : 512;
  const fabric = suitFabric(512), shell = hardShell(512, 5, 2, 0.18);
  const png = async (raw, ch = 3) => encode(raw, 512, ch);
  const maps = {
    fabric: { base: await png(fabric.base), normal: await png(fabric.normal), orm: await png(fabric.orm) },
    shell: { base: await png(shell.base), normal: await png(shell.normal), orm: await png(shell.orm) },
  };
  const g = new GlbBuilder("Explorer");
  const mats = {
    fabric: g.material("SuitFabric", { color: [1, 1, 1, 1], roughness: 1, maps: maps.fabric, mapKey: "fabric", sheen: [0.55, 0.53, 0.5], aoStrength: 0.7 }),
    shell: g.material("SuitShell", { color: [1, 1, 1, 1], roughness: 1, maps: maps.shell, mapKey: "shell", clearcoat: 0.35, aoStrength: 0.9 }),
    metal: g.material("BrushedAluminium", { color: [0.72, 0.73, 0.75, 1], metallic: 1, roughness: 0.32 }),
    rubber: g.material("Rubber", { color: [0.11, 0.105, 0.1, 1], roughness: 0.88 }),
    visor: g.material("GoldVisor", { color: [0.78, 0.6, 0.34, 1], metallic: 1, roughness: 0.09, clearcoat: 1, clearcoatRoughness: 0.03 }),
    accent: g.material("MarsAmber", { color: [0.85, 0.5, 0.2, 1], roughness: 0.5 }),
    glow: g.material("CyanLight", { color: [0.05, 0.1, 0.12, 1], emissive: [0.55, 0.85, 0.9], emissiveStrength: 1.6, roughness: 0.4 }),
    emblem: g.material("MissionPatch", { color: [1, 1, 1, 1], roughness: 0.7, maps: { base: await encode(emblem(256), 256, 4) }, mapKey: "emblem", alpha: true }),
  };

  // Joint nodes.
  const nodes = new Map();
  for (const [name, parent, head] of BONES) {
    const ph = parent ? HEAD.get(parent) : new THREE.Vector3();
    nodes.set(name, g.node(name, { translation: [head[0] - ph.x, head[1] - ph.y, head[2] - ph.z], parent: parent ? nodes.get(parent) : null }));
  }
  const inverseBind = new Float32Array(BONES.length * 16);
  BONES.forEach(([, , head], i) => inverseBind.set(new THREE.Matrix4().makeTranslation(-head[0], -head[1], -head[2]).elements, i * 16));
  const skin = g.skin("ExplorerSkin", BONES.map((b) => nodes.get(b[0])), inverseBind, nodes.get("root"));

  const parts = await build(lod);
  const prims = [];
  let triangles = 0;
  for (const [mat, list] of Object.entries(parts)) {
    if (!list.length) continue;
    const geos = list.map((p) => p.geo);
    const merged = mergeGeometries(geos, false);
    const joints = new Uint16Array(merged.attributes.position.count * 4), weights = new Float32Array(merged.attributes.position.count * 4);
    let offset = 0;
    for (const p of list) {
      const w = p.skin ?? skinWeights(p.geo, p.bones);
      joints.set(w.joints, offset * 4); weights.set(w.weights, offset * 4);
      offset += p.geo.attributes.position.count;
    }
    triangles += merged.index.count / 3;
    const color = await dustColors(merged);
    let o = 0;
    for (const p of list) {
      const count = p.geo.attributes.position.count;
      if (p.tint) for (let v = 0; v < count; v++) for (let c = 0; c < 3; c++) color[(o + v) * 4 + c] *= p.tint[v * 3 + c];
      o += count;
    }
    prims.push(g.primitive(merged, mats[mat], { joints, weights, color }));
  }
  const body = g.node("ExplorerBody", { parent: null });
  g.mesh("ExplorerMesh", prims, body);
  body.setSkin(skin);
  sampleClips(g, nodes);
  await g.write(outPath, { textureSize: size });
  return { triangles: Math.round(triangles), bones: BONES.length, clips: Object.keys(CLIPS) };
}
