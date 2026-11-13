// EKO — original companion robot, authored procedurally.
// Output: public/models/game/eko-{high,low}.glb: node hierarchy with separated
// shell panels, inner vented core, glass face, emissive eyes with 7 morph
// targets (expressions), and 6 node-animation clips.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GlbBuilder } from "./lib/gltf.mjs";
import { encode, hardShell } from "./lib/textures.mjs";

export const EKO_TARGETS = ["happy", "sad", "concerned", "surprised", "blink", "curious", "narrow"];
const R = 0.26;

function prep(g) {
  if (!g.index) { const n = g.attributes.position.count; g.setIndex(Array.from({ length: n }, (_, i) => i)); }
  for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k);
  if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  return g;
}
const at = (g, x, y, z) => { g.translate(x, y, z); return g; };
const merge = (list) => mergeGeometries(list.map(prep), false);

/** Eye shape in eye-local units; returns [x, y] for grid parameter (s, t) ∈ [-1, 1]². */
function eyeShape(target, s, t, side) {
  const w = 0.042, h = 0.058;
  // Pill (superellipse) outline filled by the grid.
  const ang = Math.atan2(t, s), rad = Math.max(Math.abs(s), Math.abs(t));
  const c = Math.cos(ang), sn = Math.sin(ang);
  const k = 1 / Math.pow(Math.pow(Math.abs(c), 4) + Math.pow(Math.abs(sn), 4), 0.25);
  let x = c * k * rad * w, y = sn * k * rad * h;
  const inner = -side; // +1 toward the nose
  switch (target) {
    case "happy": { // ^ arcs
      y = y * 0.45 + 0.025 - Math.pow(x / w, 2) * 0.03; break;
    }
    case "sad": y = y * 0.55 - 0.012 - (x * inner / w) * 0.016; break;
    case "concerned": y = y * 0.7 + (x * inner / w) * 0.02; break;
    case "surprised": x *= 1.3; y *= 1.18; break;
    case "blink": y = y * 0.08 - 0.004; break;
    case "curious": if (side > 0) { x *= 1.22; y *= 1.22; } else { y *= 0.72; } break;
    case "narrow": y *= 0.5; break;
  }
  return [x, y];
}

function eyes(grid) {
  const [nx, ny] = grid;
  const positions = [], uvs = [], index = [];
  const targets = Object.fromEntries(EKO_TARGETS.map((n) => [n, []]));
  const place = (x, y, cx) => {
    // Project onto the face sphere (slightly proud of the glass).
    const px = cx + x, py = 0.03 + y;
    const pz = Math.sqrt(Math.max(0, (R + 0.012) ** 2 - px * px - py * py));
    return [px, py, pz];
  };
  for (const side of [1, -1]) {
    const cx = 0.072 * side, base = positions.length / 3;
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
      const s = (i / nx) * 2 - 1, t = (j / ny) * 2 - 1;
      const [x, y] = eyeShape("neutral", s, t, side);
      const p = place(x, y, cx);
      positions.push(...p); uvs.push(i / nx, j / ny);
      for (const name of EKO_TARGETS) {
        const [tx, ty] = eyeShape(name, s, t, side);
        const q = place(tx, ty, cx);
        targets[name].push(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
      }
    }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const a = base + j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      index.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return { geo: g, targets: EKO_TARGETS.map((name) => ({ name, position: new Float32Array(targets[name]) })) };
}

const CLIPS = {
  hover: { duration: 3, loop: true, f: (t) => ({ body: { t: [0, 0.035 * Math.sin((t / 3) * Math.PI * 2), 0], r: [0, 0, 0.04 * Math.sin((t / 3) * Math.PI * 2 + 1)] }, ring: { r: [0, (t / 3) * Math.PI * 2, 0] }, antenna: { r: [0.08 * Math.sin((t / 1.5) * Math.PI * 2), 0, 0.05 * Math.sin((t / 3) * Math.PI * 2)] } }) },
  curious: { duration: 2.4, loop: true, f: (t) => ({ body: { t: [0, 0.02 * Math.sin((t / 1.2) * Math.PI * 2), 0], r: [0.05, 0.3 * Math.sin((t / 2.4) * Math.PI * 2), 0.24] }, ring: { r: [0, (t / 2.4) * Math.PI * 2, 0] }, antenna: { r: [0, 0, -0.2] } }) },
  celebrate: { duration: 1.6, loop: false, f: (t) => { const u = t / 1.6, hop = Math.sin(Math.PI * u); return { body: { t: [0, 0.22 * hop, 0], r: [0, Math.PI * 2 * (u * u * (3 - 2 * u)), 0.15 * hop] }, ring: { r: [0, u * Math.PI * 6, 0] }, antenna: { r: [0.3 * Math.sin(u * Math.PI * 6), 0, 0] } }; } },
  concern: { duration: 2.4, loop: true, f: (t) => ({ body: { t: [0, -0.08 + 0.008 * Math.sin(t * 25), 0], r: [0.16, 0, 0.03 * Math.sin((t / 2.4) * Math.PI * 2)] }, ring: { r: [0, (t / 2.4) * Math.PI, 0] }, antenna: { r: [0.35, 0, 0] } }) },
  scan: { duration: 2.0, loop: true, f: (t) => ({ body: { t: [0, 0, 0], r: [0.26, 0.5 * Math.sin((t / 2) * Math.PI * 2), 0] }, ring: { r: [0, (t / 2) * Math.PI * 4, 0] }, antenna: { r: [0, 0, 0.15 * Math.sin((t / 1) * Math.PI * 2)] } }) },
  sad: { duration: 3, loop: true, f: (t) => ({ body: { t: [0, -0.1 + 0.012 * Math.sin((t / 3) * Math.PI * 2), 0], r: [0.28, 0, 0] }, ring: { r: [0, (t / 3) * Math.PI, 0] }, antenna: { r: [0.6, 0, 0] } }) },
};

export async function buildEko(outPath, lod) {
  const hi = lod === "high";
  const S = hi ? [48, 32] : [20, 14];
  const shellTex = hardShell(512, 9, 2);
  const maps = { base: await encode(shellTex.base, 512, 3), normal: await encode(shellTex.normal, 512, 3), orm: await encode(shellTex.orm, 512, 3) };
  const g = new GlbBuilder("EKO");
  const m = {
    shell: g.material("EkoShell", { color: [1, 1, 1, 1], roughness: 1, maps, mapKey: "ekoshell", clearcoat: 0.5, clearcoatRoughness: 0.2 }),
    core: g.material("EkoCore", { color: [0.09, 0.1, 0.12, 1], metallic: 0.7, roughness: 0.38 }),
    metal: g.material("EkoMetal", { color: [0.7, 0.71, 0.74, 1], metallic: 1, roughness: 0.3 }),
    glass: g.material("EkoFaceGlass", { color: [0.02, 0.05, 0.09, 1], metallic: 0.2, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03 }),
    glow: g.material("EkoGlow", { color: [0.02, 0.08, 0.1, 1], emissive: [0.2, 0.78, 0.86], emissiveStrength: 1.6, roughness: 0.3 }),
    eye: g.material("EkoEyes", { color: [0.05, 0.2, 0.24, 1], emissive: [0.3, 0.88, 1.0], emissiveStrength: 2.4, roughness: 0.2 }),
    accent: g.material("EkoAmber", { color: [0.85, 0.5, 0.2, 1], roughness: 0.45 }),
  };
  const root = g.node("EKO");
  const body = g.node("body", { parent: root });
  const meshNode = (name, parent, prims, opts) => { const n = g.node(name, { parent }); g.mesh(name + "Mesh", prims, n, opts); return n; };

  // Shell: upper and lower domes separated by a recessed equator band; a top
  // hatch panel; vertical seams come from the panel-line normal map.
  const upper = new THREE.SphereGeometry(R, S[0], S[1] / 2, 0, Math.PI * 2, 0.16, Math.PI / 2 - 0.2);
  const hatch = new THREE.SphereGeometry(R + 0.004, S[0], 4, 0, Math.PI * 2, 0, 0.14);
  const lower = new THREE.SphereGeometry(R, S[0], S[1] / 2, 0, Math.PI * 2, Math.PI / 2 + 0.05, Math.PI / 2 - 0.25);
  // Cut the face opening out of the upper/lower domes by masking front vertices toward the core.
  const shell = merge([upper, hatch, lower]);
  // Six vertical gores and three bands of panel lines around the sphere.
  { const uv = shell.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * 1.5); }
  const coreBand = new THREE.CylinderGeometry(R * 0.97, R * 0.97, 0.05, S[0], 1, true);
  const coreInner = new THREE.SphereGeometry(R * 0.93, S[0] / 2, S[1] / 2);
  const vents = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    if (Math.abs(Math.sin(a / 2)) < 0.3) continue; // keep the face clear
    const v = new THREE.BoxGeometry(0.012, 0.022, 0.004);
    v.translate(0, 0, R * 0.975); v.rotateY(a);
    vents.push(v);
  }
  const face = new THREE.SphereGeometry(R + 0.004, S[0], S[1], Math.PI / 2 - 0.82, 1.64, Math.PI / 2 - 0.62, 1.12);
  const faceRim = new THREE.TorusGeometry(0.205, 0.009, 8, S[0]).scale(1, 0.78, 1);
  faceRim.translate(0, 0.0, R * 0.75);
  meshNode("shell", body, [g.primitive(shell, m.shell)]);
  meshNode("core", body, [g.primitive(merge([coreBand, coreInner]), m.core), g.primitive(merge(vents), m.glow)]);
  meshNode("face", body, [g.primitive(prep(face), m.glass), g.primitive(prep(faceRim), m.metal)]);
  const eyeGeo = eyes(hi ? [14, 10] : [8, 6]);
  meshNode("eyes", body, [g.primitive(eyeGeo.geo, m.eye, { targets: eyeGeo.targets })], { targetNames: EKO_TARGETS });

  // Side sensor pods with amber stripes and stabiliser fins.
  for (const k of [1, -1]) {
    const pod = new THREE.CylinderGeometry(0.052, 0.058, 0.06, S[0] / 2).rotateZ(Math.PI / 2);
    pod.translate(k * (R + 0.005), 0.0, 0);
    const lens = new THREE.CircleGeometry(0.026, S[0] / 2).rotateY(k * Math.PI / 2);
    lens.translate(k * (R + 0.0355), 0, 0);
    const bezel = new THREE.TorusGeometry(0.034, 0.006, 6, S[0] / 2).rotateY(Math.PI / 2);
    bezel.translate(k * (R + 0.034), 0, 0);
    const stripe = new THREE.CylinderGeometry(0.0585, 0.0585, 0.012, S[0] / 2, 1, true).rotateZ(Math.PI / 2);
    stripe.translate(k * (R + 0.012), 0, 0);
    meshNode(k > 0 ? "podL" : "podR", body, [g.primitive(merge([pod, bezel]), m.metal), g.primitive(prep(lens), m.glow), g.primitive(prep(stripe), m.accent)]);
  }
  // Thruster nozzle with glowing core.
  const nozzle = new THREE.CylinderGeometry(0.07, 0.1, 0.07, S[0] / 2, 1, true);
  nozzle.translate(0, -R - 0.01, 0);
  const nozzleGlow = new THREE.CircleGeometry(0.065, S[0] / 2).rotateX(Math.PI / 2);
  nozzleGlow.translate(0, -R - 0.04, 0);
  meshNode("thruster", body, [g.primitive(prep(nozzle), m.metal), g.primitive(prep(nozzleGlow), m.glow)]);
  // Antenna on a pivot so it can sway.
  const antenna = g.node("antenna", { parent: body, translation: [0.06, R - 0.01, -0.03] });
  const stalk = new THREE.CylinderGeometry(0.006, 0.008, 0.16, 8); stalk.translate(0, 0.08, 0);
  const tip = new THREE.SphereGeometry(0.02, 12, 8); tip.translate(0, 0.17, 0);
  g.mesh("antennaMesh", [g.primitive(prep(stalk), m.metal), g.primitive(prep(tip), m.glow)], antenna);
  // Halo stabiliser ring (spins independently).
  const ring = g.node("ring", { parent: root });
  const ringGeo = new THREE.TorusGeometry(R + 0.075, 0.0065, 8, hi ? 72 : 36).rotateX(Math.PI / 2);
  const ringStruts = [];
  for (let i = 0; i < 4; i++) { const b = new THREE.BoxGeometry(0.016, 0.012, 0.03); b.translate(0, 0, R + 0.075); b.rotateY((i / 4) * Math.PI * 2 + Math.PI / 4); ringStruts.push(b); }
  g.mesh("ringMesh", [g.primitive(prep(ringGeo), m.glow), g.primitive(merge(ringStruts), m.metal)], ring);

  // Clips: node TRS keyframes.
  const fps = 30, nodes = { body, ring, antenna };
  const q = new THREE.Quaternion(), e = new THREE.Euler();
  for (const [name, clip] of Object.entries(CLIPS)) {
    const frames = Math.round(clip.duration * fps) + 1;
    const times = new Float32Array(frames);
    const tracks = {};
    for (let f = 0; f < frames; f++) {
      const t = f / fps;
      times[f] = Math.min(t, clip.duration);
      const pose = clip.f(clip.loop && f === frames - 1 ? clip.duration - 1e-4 : t);
      for (const [node, v] of Object.entries(pose)) {
        if (v.t) { (tracks[`${node}.t`] ??= new Float32Array(frames * 3)).set(node === "antenna" ? [0.06 + v.t[0], R - 0.01 + v.t[1], -0.03 + v.t[2]] : v.t, f * 3); }
        if (v.r) { e.set(v.r[0], v.r[1], v.r[2], "XYZ"); q.setFromEuler(e); (tracks[`${node}.r`] ??= new Float32Array(frames * 4)).set([q.x, q.y, q.z, q.w], f * 4); }
      }
    }
    g.animation(name, Object.entries(tracks).map(([key, values]) => {
      const [node, kind] = key.split(".");
      return { node: nodes[node], path: kind === "t" ? "translation" : "rotation", times, values };
    }));
  }
  await g.write(outPath, { textureSize: hi ? 1024 : 512 });
  return { targets: EKO_TARGETS, clips: Object.keys(CLIPS) };
}
