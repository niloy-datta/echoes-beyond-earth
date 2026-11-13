// Tileable procedural noise for texture authoring. Deterministic: the same
// seed always produces byte-identical textures, so generated assets are
// reproducible from source.

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(ix, iy, seed) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const mod = (a, n) => ((a % n) + n) % n;

/** Value noise that tiles with period `p` (lattice cells) in both axes. */
export function tileNoise(x, y, p, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = fade(x - ix), fy = fade(y - iy);
  const x0 = mod(ix, p), x1 = mod(ix + 1, p), y0 = mod(iy, p), y1 = mod(iy + 1, p);
  const a = hash(x0, y0, seed), b = hash(x1, y0, seed), c = hash(x0, y1, seed), d = hash(x1, y1, seed);
  return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy;
}

/** Tileable fBm over [0,1)² with base period `p` cells. */
export function tileFbm(u, v, p, octaves = 5, seed = 0, gain = 0.5) {
  let sum = 0, amp = 0.5, norm = 0, period = p;
  for (let i = 0; i < octaves; i++) {
    sum += tileNoise(u * period, v * period, period, seed + i * 17) * amp;
    norm += amp;
    amp *= gain;
    period *= 2;
  }
  return sum / norm;
}

/** Tileable cellular (Worley) distance to the nearest feature point. */
export function tileCells(u, v, p, seed = 0) {
  const x = u * p, y = v * p;
  const ix = Math.floor(x), iy = Math.floor(y);
  let best = 9, second = 9, id = 0;
  for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
    const cx = ix + ox, cy = iy + oy;
    const h1 = hash(mod(cx, p), mod(cy, p), seed), h2 = hash(mod(cx, p), mod(cy, p), seed + 99);
    const d = Math.hypot(cx + h1 - x, cy + h2 - y);
    if (d < best) { second = best; best = d; id = h1; } else if (d < second) second = d;
  }
  return { d: best, edge: second - best, id };
}

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const mix = (a, b, t) => a + (b - a) * t;
