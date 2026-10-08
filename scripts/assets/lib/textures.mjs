// Procedural PBR texture painting. Every map is generated from tileable noise
// (no photographs, no third-party textures), then encoded with sharp.
import sharp from "sharp";
import { clamp, mix, smooth, tileCells, tileFbm, tileNoise } from "./noise.mjs";

/** Paint an RGB(A) image: fn(u, v) → [r, g, b(, a)] with channels in 0..1. */
export function paint(size, fn, channels = 3) {
  const out = Buffer.alloc(size * size * channels);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const c = fn((x + 0.5) / size, (y + 0.5) / size);
    const k = (y * size + x) * channels;
    for (let i = 0; i < channels; i++) out[k + i] = Math.round(clamp(c[i] ?? 1) * 255);
  }
  return out;
}

/** Height field (0..1) → tangent-space normal map (OpenGL / glTF convention), tileable. */
export function heightToNormal(size, heightFn, strength = 2) {
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) h[y * size + x] = heightFn((x + 0.5) / size, (y + 0.5) / size);
  const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
  const out = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * strength * size / 256;
    const dy = (at(x, y + 1) - at(x, y - 1)) * strength * size / 256;
    // Image rows grow downward (v down); glTF normal maps expect +Y = up in UV space.
    let nx = -dx, ny = dy, nz = 1;
    const l = Math.hypot(nx, ny, nz);
    nx /= l; ny /= l; nz /= l;
    const k = (y * size + x) * 3;
    out[k] = Math.round((nx * 0.5 + 0.5) * 255);
    out[k + 1] = Math.round((ny * 0.5 + 0.5) * 255);
    out[k + 2] = Math.round((nz * 0.5 + 0.5) * 255);
  }
  return out;
}

export async function encode(raw, size, channels, format = "png", quality = 86) {
  const img = sharp(raw, { raw: { width: size, height: size, channels } });
  return format === "webp" ? img.webp({ quality, effort: 5 }).toBuffer() : img.png({ compressionLevel: 9 }).toBuffer();
}

// ── Material sets ───────────────────────────────────────────────────────────
// Each returns { base, normal, orm } raw RGB buffers (orm: R = occlusion, G = roughness, B = metalness).

/** Woven spacesuit outer layer: twill weave, quilting seams, soft mottling. */
export function suitFabric(size) {
  const weave = (u, v) => {
    const s = 160;
    const a = Math.sin((u * s + v * s * 0.5) * Math.PI * 2), b = Math.sin((v * s - u * s * 0.5) * Math.PI * 2);
    return 0.5 + 0.25 * a * b;
  };
  const seam = (u, v) => {
    const d = Math.abs(((v * 2) % 1) - 0.5);
    return smooth(0.018, 0.0, Math.abs(d - 0.49)); // subtle stitched quilting seams
  };
  const height = (u, v) => weave(u, v) * 0.35 + tileFbm(u, v, 8, 3, 3) * 0.3 - seam(u, v) * 0.35;
  return {
    base: paint(size, (u, v) => {
      const m = tileFbm(u, v, 6, 4, 11);
      const w = weave(u, v);
      const l = 0.84 + (m - 0.5) * 0.06 + (w - 0.5) * 0.04 - seam(u, v) * 0.06;
      return [l * 1.0, l * 0.985, l * 0.95];
    }),
    normal: heightToNormal(size, height, 3),
    orm: paint(size, (u, v) => [1 - seam(u, v) * 0.5, 0.82 + (weave(u, v) - 0.5) * 0.1, 0]),
  };
}

/** Hard composite shell with recessed panel lines, fasteners and light wear. */
export function hardShell(size, seed = 5, panels = 4) {
  const lines = (u, v) => {
    const fu = (u * panels) % 1, fv = (v * panels * 1.5) % 1;
    const jitter = tileNoise(Math.floor(u * panels), Math.floor(v * panels * 1.5), 64, seed) * 0.3;
    const d = Math.min(fu, 1 - fu, Math.abs(fv - jitter * 0.0), 1 - fv);
    return smooth(0.012, 0.0, d);
  };
  const rivet = (u, v) => {
    const c = tileCells(u, v, panels * 6, seed + 3);
    return smooth(0.09, 0.04, c.d) * (c.id > 0.55 ? 1 : 0);
  };
  const scratches = (u, v) => smooth(0.72, 0.8, tileFbm(u * 0.5 + v * 3.1, v * 0.4, 16, 3, seed + 9)) * 0.6;
  return {
    base: paint(size, (u, v) => {
      const grime = tileFbm(u, v, 5, 5, seed + 1);
      const l = 0.9 - lines(u, v) * 0.35 - smooth(0.55, 0.8, grime) * 0.08 + rivet(u, v) * 0.03;
      return [l, l * 0.99, l * 0.97];
    }),
    normal: heightToNormal(size, (u, v) => -lines(u, v) * 0.8 + rivet(u, v) * 0.6 + tileFbm(u, v, 32, 2, seed) * 0.05, 4),
    orm: paint(size, (u, v) => [1 - lines(u, v) * 0.6, clamp(0.42 + scratches(u, v) * -0.15 + lines(u, v) * 0.3), 0]),
  };
}

/** Mars regolith: fine dust, scattered pebbles and wind ripples (terrain). */
export function regolith(size) {
  const pebbles = (u, v) => { const c = tileCells(u, v, 48, 21); return smooth(0.32, 0.12, c.d) * (c.id > 0.62 ? 1 : 0); };
  const ripples = (u, v) => Math.sin((u * 18 + tileFbm(u, v, 4, 3, 7) * 3.5) * Math.PI * 2) * 0.5 + 0.5;
  const height = (u, v) => tileFbm(u, v, 16, 5, 2) * 0.5 + ripples(u, v) * 0.12 + pebbles(u, v) * 0.7;
  return {
    base: paint(size, (u, v) => {
      const n = tileFbm(u, v, 12, 5, 4);
      const p = pebbles(u, v);
      const dust = [0.66 + (n - 0.5) * 0.18, 0.40 + (n - 0.5) * 0.12, 0.26 + (n - 0.5) * 0.08];
      const stone = [0.36, 0.24, 0.19];
      return dust.map((c, i) => mix(c, stone[i], p * 0.85));
    }),
    normal: heightToNormal(size, height, 5),
    orm: paint(size, (u, v) => [1 - pebbles(u, v) * 0.25, 0.94 - pebbles(u, v) * 0.15, 0]),
  };
}

/** Layered sedimentary rock (outcrops, cliffs, boulders): bedding planes, cracks. */
export function sedimentary(size) {
  const bed = (u, v) => {
    const warp = tileFbm(u, v, 4, 3, 41) * 0.08;
    return (v + warp) * 14;
  };
  const crack = (u, v) => { const c = tileCells(u, v, 10, 43); return smooth(0.06, 0.0, c.edge); };
  const height = (u, v) => {
    const b = bed(u, v), layer = b - Math.floor(b);
    return smooth(0.0, 0.25, layer) * 0.5 + tileFbm(u, v, 24, 4, 44) * 0.4 - crack(u, v) * 0.7;
  };
  return {
    base: paint(size, (u, v) => {
      const b = Math.floor(bed(u, v));
      const band = tileNoise(b, 0, 64, 45);
      const n = tileFbm(u, v, 10, 5, 46);
      const l = 0.52 + band * 0.18 + (n - 0.5) * 0.2 - crack(u, v) * 0.25;
      return [l * 0.86, l * 0.58, l * 0.43];
    }),
    normal: heightToNormal(size, height, 6),
    orm: paint(size, (u, v) => [1 - crack(u, v) * 0.6, 0.88, 0]),
  };
}

/** Original mission patch for the explorer's sleeve (no agency logos). */
export function emblem(size) {
  return paint(size, (u, v) => {
    const x = u * 2 - 1, y = v * 2 - 1, r = Math.hypot(x, y);
    if (r > 0.96) return [0, 0, 0, 0];
    if (r > 0.86) return [0.85, 0.55, 0.22, 1];
    const planet = Math.hypot(x + 0.15, y - 0.35) < 0.45;
    const ray = Math.abs(x - (y + 0.2) * 0.25) < 0.035 && y < 0.1;
    const star = Math.hypot(x - 0.35, y + 0.4) < 0.07;
    if (ray || star) return [0.39, 0.9, 0.94, 1];
    if (planet) return [0.78, 0.36, 0.2, 1];
    return [0.1, 0.2, 0.36, 1];
  }, 4);
}
