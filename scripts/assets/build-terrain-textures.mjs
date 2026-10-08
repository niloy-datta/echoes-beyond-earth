// Tileable PBR terrain textures (regolith + layered sedimentary rock) as WebP.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { encode, regolith, sedimentary } from "./lib/textures.mjs";

export async function buildTerrainTextures(dir, size = 1024) {
  const out = {};
  for (const [name, fn] of [["regolith", regolith], ["rock", sedimentary]]) {
    const set = fn(size);
    for (const kind of ["base", "normal", "orm"]) {
      const buf = await encode(set[kind], size, 3, "webp", kind === "normal" ? 92 : 84);
      writeFileSync(join(dir, `${name}-${kind}.webp`), buf);
      out[`${name}-${kind}`] = buf.length;
    }
  }
  return out;
}
