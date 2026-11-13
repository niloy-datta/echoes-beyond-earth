/**
 * Shaded-relief rendering of the procedural terrain for the minimap, mission
 * map and 2D console. Computed once per session from the same height function
 * the physics uses, so the maps always match the playable world.
 */
import { heightAt } from "../core/terrain";

export const MAP_EXTENT = 112; // metres from centre to map edge

let cached: string | null = null;

export function terrainImage(size = 320): string {
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(size, size);
  const step = (MAP_EXTENT * 2) / size;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const x = -MAP_EXTENT + i * step, z = -MAP_EXTENT + j * step;
    const h = heightAt(x, z);
    const dx = heightAt(x + step, z) - h, dz = heightAt(x, z + step) - h;
    const shade = Math.max(0, Math.min(1, 0.62 - dx * 0.55 - dz * 0.35));
    const elev = Math.max(0, Math.min(1, (h + 6) / 22));
    const k = (j * size + i) * 4;
    img.data[k] = 70 + shade * 120 + elev * 30;
    img.data[k + 1] = 34 + shade * 70 + elev * 18;
    img.data[k + 2] = 22 + shade * 44 + elev * 10;
    img.data[k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  cached = canvas.toDataURL("image/png");
  return cached;
}

/** World metres → percentage position on a north-up map (north = -z). */
export const mapPct = (v: number) => ((v + MAP_EXTENT) / (MAP_EXTENT * 2)) * 100;
