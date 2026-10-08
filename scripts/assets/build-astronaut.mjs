// THE EXPLORER — original rigged astronaut, authored procedurally.
// Output: public/models/game/explorer-{ultra,high,low}.glb (skinned mesh, 23-bone
// skeleton, 12 animation clips, PBR materials with generated WebP textures).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GlbBuilder } from "./lib/gltf.mjs";
import { emblem, encode, hardShell, suitFabric } from "./lib/textures.mjs";
import { smooth } from "./lib/noise.mjs";

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

function build(lod) {
  const ultra = lod === "ultra", high = lod !== "low";
  const R = ultra ? 34 : high ? 28 : 12, ROWS = ultra ? 20 : high ? 16 : 7, SPH = ultra ? [48, 32] : high ? [40, 28] : [18, 12], RB = high ? 4 : 2;
  /** parts: material → [{ geo, bones (candidates) }] */
  const parts = { fabric: [], shell: [], metal: [], rubber: [], visor: [], accent: [], glow: [], emblem: [] };
  const add = (mat, geo, bones) => parts[mat].push({ geo: prep(geo), bones: Array.isArray(bones) ? bones : [bones] });

  // Torso suit layer (elliptical lathe).
  const torsoProfile = [[0.0001, 0.84], [0.13, 0.85], [0.165, 0.9], [0.172, 0.97], [0.158, 1.06], [0.168, 1.16], [0.19, 1.28], [0.2, 1.38], [0.188, 1.46], [0.12, 1.53], [0.0001, 1.54]];
  const torso = new THREE.LatheGeometry(torsoProfile.map(([r, y]) => new THREE.Vector2(r, y)), R);
  torso.scale(1, 1, 0.74); scaleUv(torso, 4, 3);
  add("fabric", torso, ["hips", "spine", "chest"]);
  // Hard upper torso shell over the chest.
  const hut = new THREE.LatheGeometry([[0.0001, 1.2], [0.176, 1.205], [0.2, 1.26], [0.212, 1.36], [0.2, 1.45], [0.14, 1.52], [0.0001, 1.525]].map(([r, y]) => new THREE.Vector2(r, y)), R);
  hut.scale(1.03, 1, 0.8); scaleUv(hut, 2, 1.5);
  add("shell", hut, "chest");
  // Waist bearing and belt.
  add("metal", at(new THREE.TorusGeometry(0.165, 0.016, 8, R).rotateX(Math.PI / 2).scale(1, 1, 0.76), 0, 1.0, 0), "hips");
  add("accent", at(new THREE.TorusGeometry(0.17, 0.01, 6, R).rotateX(Math.PI / 2).scale(1, 1, 0.76), 0, 0.965, 0), "hips");
  // Chest display and control module.
  add("shell", at(rbox(0.25, 0.13, 0.08, 0.02, RB), 0, 1.31, 0.17), "chest");
  add("glow", at(new THREE.PlaneGeometry(0.12, 0.045), 0, 1.325, 0.2105), "chest");
  add("accent", at(rbox(0.262, 0.018, 0.082, 0.006, 1), 0, 1.255, 0.17), "chest");
  for (const k of [-1, 1]) add("metal", at(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 10).rotateX(Math.PI / 2), 0.085 * k, 1.29, 0.215), "chest");
  // Backpack (portable life support) with tanks, vents and antenna.
  add("shell", at(rbox(0.4, 0.56, 0.2, 0.04, RB), 0, 1.3, -0.24), "chest");
  add("shell", at(rbox(0.36, 0.1, 0.18, 0.03, RB), 0, 1.6, -0.24), "chest");
  add("accent", at(rbox(0.404, 0.03, 0.204, 0.01, 1), 0, 1.47, -0.24), "chest");
  for (const k of [-1, 1]) {
    add("metal", at(new THREE.CylinderGeometry(0.045, 0.045, 0.42, R / 2), 0.22 * k, 1.28, -0.26), "chest");
    add("metal", at(new THREE.SphereGeometry(0.045, R / 2, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0.22 * k, 1.49, -0.26), "chest");
  }
  for (let i = 0; i < 5; i++) add("rubber", at(rbox(0.26, 0.012, 0.012, 0.004, 1), 0, 1.16 + i * 0.03, -0.342), "chest");
  add("metal", at(new THREE.CylinderGeometry(0.005, 0.005, 0.26, 6), 0.14, 1.75, -0.3), "chest");
  add("glow", at(new THREE.SphereGeometry(0.012, 8, 6), 0.14, 1.885, -0.3), "chest");
  // Life-support hoses from chest module to backpack.
  for (const k of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([[0.11 * k, 1.29, 0.2], [0.2 * k, 1.27, 0.15], [0.23 * k, 1.3, 0.0], [0.19 * k, 1.36, -0.13]].map((v) => new THREE.Vector3(...v)));
    add("rubber", new THREE.TubeGeometry(curve, high ? 20 : 8, 0.014, high ? 8 : 5), "chest");
  }

  // Helmet: shell, gold reflective visor, sunshade brim, neck bearing, lamps.
  add("shell", at(new THREE.SphereGeometry(0.165, SPH[0], SPH[1]).scale(1, 1.05, 1.03), 0, 1.7, 0.0), "head");
  add("visor", at(new THREE.SphereGeometry(0.1685, SPH[0], SPH[1], Math.PI / 2 - 0.98, 1.96, 0.72, 1.28).scale(1, 1.05, 1.03), 0, 1.7, 0.0), "head");
  add("shell", at(new THREE.SphereGeometry(0.172, SPH[0], 8, Math.PI / 2 - 1.05, 2.1, 0.5, 0.26).scale(1, 1.05, 1.03), 0, 1.7, 0.0), "head");
  add("metal", at(new THREE.TorusGeometry(0.125, 0.026, 10, R).rotateX(Math.PI / 2), 0, 1.545, 0), "neck");
  for (const k of [-1, 1]) {
    add("metal", at(new THREE.CylinderGeometry(0.022, 0.022, 0.05, 12).rotateX(Math.PI / 2), 0.155 * k, 1.76, 0.05), "head");
    add("glow", at(new THREE.CircleGeometry(0.017, 12), 0.155 * k, 1.76, 0.0755), "head");
  }

  for (const [s, k] of [["L", 1], ["R", -1]]) {
    const sh = [0.205 * k, 1.45, 0], el = [0.225 * k, 1.16, 0], wr = [0.235 * k, 0.9, 0];
    // Shoulder bearing ring and upper arm with bellows at the elbow.
    add("metal", at(new THREE.TorusGeometry(0.072, 0.017, 8, R).rotateX(Math.PI / 2), 0.205 * k, 1.425, 0), `upperArm_${s}`);
    add("fabric", tube([sh[0], sh[1] + 0.03, 0], el, (t) => 0.07 - t * 0.012, R, ROWS, { bellows: [0.78, 1.0] }), [`shoulder_${s}`, `upperArm_${s}`, `lowerArm_${s}`]);
    add("fabric", tube(el, wr, (t) => 0.06 - t * 0.012 + (t < 0.15 ? 0.004 : 0), R, ROWS, { bellows: [0.0, 0.2] }), [`upperArm_${s}`, `lowerArm_${s}`, `hand_${s}`]);
    add("metal", at(new THREE.TorusGeometry(0.05, 0.012, 8, R).rotateX(Math.PI / 2), 0.235 * k, 0.935, 0), `lowerArm_${s}`);
    add("accent", at(new THREE.TorusGeometry(0.066, 0.008, 6, R).rotateX(Math.PI / 2), 0.214 * k, 1.36, 0), `upperArm_${s}`);
    // Glove: cuff, palm, four fingers and a thumb (curled slightly forward).
    add("rubber", at(new THREE.CylinderGeometry(0.052, 0.046, 0.06, R / 2), 0.235 * k, 0.9, 0), `hand_${s}`);
    add("rubber", at(rbox(0.04, 0.09, 0.075, 0.016, RB), 0.236 * k, 0.83, 0.005), `hand_${s}`);
    for (let f = 0; f < 4; f++) {
      const g = new THREE.CapsuleGeometry(0.0105, 0.045, 3, 8);
      g.rotateX(-0.25);
      add("rubber", at(g, 0.236 * k, 0.765, -0.022 + f * 0.017), `hand_${s}`);
    }
    add("rubber", at(new THREE.CapsuleGeometry(0.011, 0.035, 3, 8).rotateZ(0.6 * k).rotateX(-0.4), 0.215 * k, 0.83, 0.045), `hand_${s}`);
    if (s === "L") {
      // Wrist scanner on the left forearm (used by the scan animation).
      add("shell", at(rbox(0.05, 0.08, 0.06, 0.012, RB), 0.27, 1.0, 0.0), "lowerArm_L");
      add("glow", at(new THREE.PlaneGeometry(0.045, 0.06).rotateY(Math.PI / 2), 0.2955, 1.0, 0.0), "lowerArm_L");
      // Original mission patch on the left sleeve.
      add("emblem", at(new THREE.PlaneGeometry(0.075, 0.075).rotateY(Math.PI / 2), 0.2765, 1.31, 0.0), "upperArm_L");
    }
    // Legs: thigh, knee bellows, shin, ankle ring, knee pad, boot, sole, toe cap.
    const hip = [0.105 * k, 0.95, 0], kn = [0.11 * k, 0.5, 0], an = [0.115 * k, 0.1, 0];
    add("fabric", tube(hip, kn, (t) => 0.095 - t * 0.02, R, ROWS, { bellows: [0.82, 1.0], ellipse: 1.05 }), ["hips", `upperLeg_${s}`, `lowerLeg_${s}`]);
    add("fabric", tube(kn, an, (t) => 0.074 - t * 0.012 + (t > 0.85 ? 0.006 : 0), R, ROWS, { bellows: [0.0, 0.16] }), [`upperLeg_${s}`, `lowerLeg_${s}`, `foot_${s}`]);
    add("shell", at(rbox(0.11, 0.12, 0.05, 0.02, RB), 0.11 * k, 0.5, 0.07), `lowerLeg_${s}`);
    add("metal", at(new THREE.TorusGeometry(0.068, 0.012, 8, R).rotateX(Math.PI / 2), 0.115 * k, 0.15, 0), `lowerLeg_${s}`);
    add("shell", at(rbox(0.12, 0.13, 0.22, 0.035, RB), 0.115 * k, 0.085, -0.005), `foot_${s}`);
    add("rubber", at(rbox(0.128, 0.03, 0.31, 0.012, RB), 0.115 * k, 0.015, 0.04), [`foot_${s}`, `toe_${s}`]);
    add("shell", at(rbox(0.115, 0.075, 0.1, 0.03, RB), 0.115 * k, 0.06, 0.15), `toe_${s}`);
    add("accent", at(rbox(0.122, 0.014, 0.225, 0.005, 1), 0.115 * k, 0.12, -0.005), `foot_${s}`);
  }
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
  const fabric = suitFabric(512), shell = hardShell(512, 5, 4);
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
    visor: g.material("GoldVisor", { color: [1.0, 0.76, 0.36, 1], metallic: 1, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 }),
    accent: g.material("MarsAmber", { color: [0.85, 0.5, 0.2, 1], roughness: 0.5 }),
    glow: g.material("CyanLight", { color: [0.05, 0.1, 0.12, 1], emissive: [0.39, 0.9, 0.94], emissiveStrength: 4, roughness: 0.4 }),
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

  const parts = build(lod);
  const prims = [];
  let triangles = 0;
  for (const [mat, list] of Object.entries(parts)) {
    if (!list.length) continue;
    const geos = list.map((p) => p.geo);
    const merged = mergeGeometries(geos, false);
    const joints = new Uint16Array(merged.attributes.position.count * 4), weights = new Float32Array(merged.attributes.position.count * 4);
    let offset = 0;
    for (const p of list) {
      const w = skinWeights(p.geo, p.bones);
      joints.set(w.joints, offset * 4); weights.set(w.weights, offset * 4);
      offset += p.geo.attributes.position.count;
    }
    triangles += merged.index.count / 3;
    prims.push(g.primitive(merged, mats[mat], { joints, weights, color: await dustColors(merged) }));
  }
  const body = g.node("ExplorerBody", { parent: null });
  g.mesh("ExplorerMesh", prims, body);
  body.setSkin(skin);
  sampleClips(g, nodes);
  await g.write(outPath, { textureSize: size });
  return { triangles: Math.round(triangles), bones: BONES.length, clips: Object.keys(CLIPS) };
}
