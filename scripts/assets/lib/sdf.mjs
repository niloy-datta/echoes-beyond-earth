// Signed-distance sculpting for organic character surfaces: primitives,
// smooth unions, a surface-nets polygoniser, analytic-gradient normals and
// meshopt simplification. Lets the suit be one continuous, sculpted surface
// (smooth shoulder/hip transitions, convolute joints, fabric folds) instead
// of intersecting primitives.
import * as THREE from "three";
import { MeshoptSimplifier } from "meshoptimizer";

// ── Primitives (all return signed distance in metres) ───────────────────────
export const sphere = (c, r) => (x, y, z) => Math.hypot(x - c[0], y - c[1], z - c[2]) - r;

/** Ellipsoid (approximate but well-behaved distance). */
export const ellipsoid = (c, r) => (x, y, z) => {
  const px = (x - c[0]) / r[0], py = (y - c[1]) / r[1], pz = (z - c[2]) / r[2];
  const k0 = Math.hypot(px, py, pz);
  const k1 = Math.hypot(px / r[0], py / r[1], pz / r[2]);
  return k1 < 1e-9 ? -Math.min(...r) : (k0 * (k0 - 1)) / k1;
};

/** Round cone between a (radius ra) and b (radius rb); `zScale` flattens front-to-back. */
export const roundCone = (a, b, ra, rb, zScale = 1) => {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = (b[2] - a[2]) / zScale;
  const l2 = bax * bax + bay * bay + baz * baz;
  return (x, y, z) => {
    const px = x - a[0], py = y - a[1], pz = (z - a[2]) / zScale;
    const t = Math.max(0, Math.min(1, (px * bax + py * bay + pz * baz) / l2));
    const dx = px - bax * t, dy = py - bay * t, dz = pz - baz * t;
    return Math.hypot(dx, dy, dz) - (ra + (rb - ra) * t);
  };
};

/** Parameter t (0..1) of the closest point on segment a→b. */
export const along = (a, b) => {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const l2 = bax * bax + bay * bay + baz * baz;
  return (x, y, z) => Math.max(0, Math.min(1, ((x - a[0]) * bax + (y - a[1]) * bay + (z - a[2]) * baz) / l2));
};

/** Rounded box centred at c with half-extents h and corner radius r. */
export const roundBox = (c, h, r) => (x, y, z) => {
  const qx = Math.abs(x - c[0]) - h[0] + r, qy = Math.abs(y - c[1]) - h[1] + r, qz = Math.abs(z - c[2]) - h[2] + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
};

/** Polynomial smooth minimum (k = blend radius in metres). */
export const smin = (a, b, k) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};
export const smax = (a, b, k) => -smin(-a, -b, k);

// ── Surface nets ─────────────────────────────────────────────────────────────
/**
 * Polygonise the zero set of `f` inside [min, max] at `cell` metres.
 * Returns an indexed BufferGeometry with normals from the field gradient.
 */
export function surfaceNets(f, min, max, cell) {
  const nx = Math.ceil((max[0] - min[0]) / cell) + 1, ny = Math.ceil((max[1] - min[1]) / cell) + 1, nz = Math.ceil((max[2] - min[2]) / cell) + 1;
  const field = new Float32Array(nx * ny * nz);
  const id = (i, j, k) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++)
    field[id(i, j, k)] = f(min[0] + i * cell, min[1] + j * cell, min[2] + k * cell);

  const vert = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const cid = (i, j, k) => i + (nx - 1) * (j + (ny - 1) * k);
  const pos = [];
  const corners = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const v = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let inside = 0;
    for (let c = 0; c < 8; c++) { v[c] = field[id(i + corners[c][0], j + corners[c][1], k + corners[c][2])]; if (v[c] < 0) inside++; }
    if (inside === 0 || inside === 8) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of edges) {
      if ((v[a] < 0) === (v[b] < 0)) continue;
      const t = v[a] / (v[a] - v[b]);
      sx += corners[a][0] + (corners[b][0] - corners[a][0]) * t;
      sy += corners[a][1] + (corners[b][1] - corners[a][1]) * t;
      sz += corners[a][2] + (corners[b][2] - corners[a][2]) * t;
      n++;
    }
    vert[cid(i, j, k)] = pos.length / 3;
    pos.push(min[0] + (i + sx / n) * cell, min[1] + (j + sy / n) * cell, min[2] + (k + sz / n) * cell);
  }

  const idx = [];
  const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d); };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const s0 = field[id(i, j, k)] < 0;
    // Edge along +x from (i,j,k)
    if (i < nx - 1 && s0 !== (field[id(i + 1, j, k)] < 0))
      quad(vert[cid(i, j - 1, k - 1)], vert[cid(i, j, k - 1)], vert[cid(i, j, k)], vert[cid(i, j - 1, k)], s0);
    if (j < ny - 1 && s0 !== (field[id(i, j + 1, k)] < 0))
      quad(vert[cid(i - 1, j, k - 1)], vert[cid(i - 1, j, k)], vert[cid(i, j, k)], vert[cid(i, j, k - 1)], s0);
    if (k < nz - 1 && s0 !== (field[id(i, j, k + 1)] < 0))
      quad(vert[cid(i - 1, j - 1, k)], vert[cid(i, j - 1, k)], vert[cid(i, j, k)], vert[cid(i - 1, j, k)], s0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

/** Normals from the SDF gradient (sharper and smoother than face averaging). */
export function fieldNormals(g, f, e = 0.0015) {
  const p = g.attributes.position, n = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const dx = f(x + e, y, z) - f(x - e, y, z), dy = f(x, y + e, z) - f(x, y - e, z), dz = f(x, y, z + e) - f(x, y, z - e);
    const l = Math.hypot(dx, dy, dz) || 1;
    n[i * 3] = dx / l; n[i * 3 + 1] = dy / l; n[i * 3 + 2] = dz / l;
  }
  g.setAttribute("normal", new THREE.BufferAttribute(n, 3));
  return g;
}

/** Simplify to roughly `targetTris` triangles, keeping silhouette; compacts vertices. */
export async function simplify(g, targetTris, error = 0.01) {
  await MeshoptSimplifier.ready;
  const indices = new Uint32Array(g.index.array);
  const positions = new Float32Array(g.attributes.position.array);
  // Relax the error bound until the triangle budget is met (small parts need it).
  let out;
  for (let e = error, i = 0; i < 6; i++, e *= 2.5) {
    [out] = MeshoptSimplifier.simplify(indices, positions, 3, Math.min(indices.length, targetTris * 3), e, []);
    if (out.length <= targetTris * 3 * 1.1) break;
  }
  // Compact: keep only referenced vertices.
  const remap = new Map(), keep = [];
  const newIdx = new Uint32Array(out.length);
  for (let i = 0; i < out.length; i++) {
    let r = remap.get(out[i]);
    if (r === undefined) { r = keep.length; remap.set(out[i], r); keep.push(out[i]); }
    newIdx[i] = r;
  }
  const res = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(g.attributes)) {
    const arr = new Float32Array(keep.length * attr.itemSize);
    keep.forEach((src, i) => { for (let c = 0; c < attr.itemSize; c++) arr[i * attr.itemSize + c] = attr.array[src * attr.itemSize + c]; });
    res.setAttribute(name, new THREE.BufferAttribute(arr, attr.itemSize));
  }
  res.setIndex(Array.from(newIdx));
  return res;
}

/** Per-vertex box-projected UVs (metres × scale), chosen by the dominant normal axis. */
export function boxUv(g, scale) {
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const [u, v] = ay > ax && ay > az ? [x, z] : ax > az ? [z, y] : [x, y];
    uv[i * 2] = u * scale; uv[i * 2 + 1] = v * scale;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

/** Make every triangle face along its vertex normals (outward from the field). */
export function orient(g) {
  const p = g.attributes.position, n = g.attributes.normal, idx = g.index.array;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), fn = new THREE.Vector3();
  for (let t = 0; t < idx.length; t += 3) {
    a.fromBufferAttribute(p, idx[t]); b.fromBufferAttribute(p, idx[t + 1]); c.fromBufferAttribute(p, idx[t + 2]);
    fn.subVectors(b, a).cross(c.clone().sub(a));
    const dot = fn.x * (n.getX(idx[t]) + n.getX(idx[t + 1]) + n.getX(idx[t + 2]))
      + fn.y * (n.getY(idx[t]) + n.getY(idx[t + 1]) + n.getY(idx[t + 2]))
      + fn.z * (n.getZ(idx[t]) + n.getZ(idx[t + 1]) + n.getZ(idx[t + 2]));
    if (dot < 0) { const s = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = s; }
  }
  g.index.needsUpdate = true;
  return g;
}

/** Sculpt helper: polygonise, gradient normals, orient. */
export function sculpt(f, min, max, cell) {
  return orient(fieldNormals(surfaceNets(f, min, max, cell), f));
}
