/**
 * Deterministic procedural terrain shared by physics, camera collision, the 3D
 * renderer and the 2D console map. Artistic landscape only — not survey data.
 */
import { CRATERS, FLAT_PADS, POIS, WORLD_RADIUS, WORLD_SEED } from "../content/world.ts";
import { fbm, seeded, smoothstep, valueNoise, type Vec2 } from "./math.ts";

function rawHeight(x: number, z: number): number {
  // Broad rolling plains plus wind-shaped ripples.
  let h = (fbm(x * 0.013 + 7.3, z * 0.013 - 2.1, 4) - 0.5) * 9;
  h += (fbm(x * 0.06, z * 0.06, 2) - 0.5) * 1.1;
  const ripple = Math.sin(x * 0.21 + z * 0.08 + valueNoise(x * 0.03, z * 0.03) * 6);
  h += ripple * 0.12;

  for (const c of CRATERS) {
    const d = Math.hypot(x - c.x, z - c.z) / c.r;
    if (d < 1) h -= c.depth * (1 - d * d);
    const rim = (d - 1) / 0.35;
    h += c.depth * 0.45 * Math.exp(-rim * rim);
  }

  // Beyond the walkable disc the ground lifts toward the rim mountains.
  const r = Math.hypot(x, z);
  const edge = smoothstep(WORLD_RADIUS - 6, WORLD_RADIUS + 26, r);
  h += edge * edge * (14 + fbm(x * 0.04, z * 0.04, 3) * 22);
  return h;
}

const padHeights = FLAT_PADS.map((pad) => rawHeight(pad.center.x, pad.center.z));

export function heightAt(x: number, z: number): number {
  let h = rawHeight(x, z);
  for (let i = 0; i < FLAT_PADS.length; i++) {
    const pad = FLAT_PADS[i];
    const d = Math.hypot(x - pad.center.x, z - pad.center.z);
    const w = 1 - smoothstep(pad.radius * 0.55, pad.radius, d);
    if (w > 0) h += (padHeights[i] - h) * w;
  }
  return h;
}

/** Ground slope magnitude (rise over run) using central differences. */
export function slopeAt(x: number, z: number): number {
  const e = 0.35;
  const dx = (heightAt(x + e, z) - heightAt(x - e, z)) / (2 * e);
  const dz = (heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
  return Math.hypot(dx, dz);
}

export interface Rock {
  x: number;
  z: number;
  /** Visual scale in metres. */
  size: number;
  rotation: number;
  squash: number;
  /** Collision radius; 0 for pebbles the explorer simply walks over. */
  collide: number;
}

/** Deterministic rock field. Keeps clear of interaction points and the spawn. */
export function generateRocks(max = 900): Rock[] {
  const rand = seeded(WORLD_SEED);
  const rocks: Rock[] = [];
  let guard = 0;
  while (rocks.length < max && guard++ < max * 8) {
    const angle = rand() * Math.PI * 2;
    const radius = Math.sqrt(rand()) * (WORLD_RADIUS + 18);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const near = POIS.some((p) => Math.hypot(p.position.x - x, p.position.z - z) < p.radius + 3.2);
    if (near) continue;
    // Power-law sizes: many pebbles, a few boulders.
    const u = rand();
    const size = 0.12 + Math.pow(u, 5) * 2.4;
    rocks.push({
      x, z, size,
      rotation: rand() * Math.PI * 2,
      squash: 0.45 + rand() * 0.45,
      collide: size > 0.55 ? size * 0.8 : 0,
    });
  }
  return rocks;
}

/** Cylinder collider: footprint radius `r`, optional height `h` above the ground (camera occlusion). */
export interface Circle { x: number; z: number; r: number; h?: number }

/** Uniform spatial hash so collision lookups stay O(1) regardless of rock count. */
export class CollisionGrid {
  private cells = new Map<number, Circle[]>();
  private cell: number;
  constructor(circles: readonly Circle[], cell = 6) {
    this.cell = cell;
    for (const c of circles) {
      const x0 = Math.floor((c.x - c.r) / cell), x1 = Math.floor((c.x + c.r) / cell);
      const z0 = Math.floor((c.z - c.r) / cell), z1 = Math.floor((c.z + c.r) / cell);
      for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
        const key = this.key(ix, iz);
        const list = this.cells.get(key);
        if (list) list.push(c); else this.cells.set(key, [c]);
      }
    }
  }
  private key(ix: number, iz: number) { return (ix + 512) * 1024 + (iz + 512); }
  near(x: number, z: number): readonly Circle[] {
    return this.cells.get(this.key(Math.floor(x / this.cell), Math.floor(z / this.cell))) ?? [];
  }
}

/** Push a point of radius `r` out of every overlapping circle. */
export function resolveCircles(p: Vec2, r: number, grid: CollisionGrid): Vec2 {
  let { x, z } = p;
  for (let pass = 0; pass < 2; pass++) {
    for (const c of grid.near(x, z)) {
      const dx = x - c.x, dz = z - c.z;
      const d = Math.hypot(dx, dz);
      const min = c.r + r;
      if (d < min) {
        const nx = d > 1e-5 ? dx / d : 1, nz = d > 1e-5 ? dz / d : 0;
        x = c.x + nx * min;
        z = c.z + nz * min;
      }
    }
  }
  return { x, z };
}
