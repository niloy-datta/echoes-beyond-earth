// Regenerates every procedural game asset and writes a manifest with sizes
// and SHA-256 hashes. Run: npm run assets:build (outputs are committed so the
// normal site build never needs this step).
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { buildExplorer } from "./build-astronaut.mjs";
import { buildEko } from "./build-eko.mjs";
import { buildTerrainTextures } from "./build-terrain-textures.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const models = join(root, "public", "models", "game");
const textures = join(root, "public", "textures", "game");
mkdirSync(models, { recursive: true });
mkdirSync(textures, { recursive: true });

const only = process.argv[2];
const stats = {};
const t0 = Date.now();
if (!only || only === "explorer") {
  for (const lod of ["ultra", "high", "low"]) stats[`explorer-${lod}`] = await buildExplorer(join(models, `explorer-${lod}.glb`), lod);
}
if (!only || only === "eko") {
  for (const lod of ["high", "low"]) stats[`eko-${lod}`] = await buildEko(join(models, `eko-${lod}.glb`), lod);
}
if (!only || only === "terrain") stats.terrain = await buildTerrainTextures(textures);

const files = [
  ...["explorer-ultra", "explorer-high", "explorer-low", "eko-high", "eko-low"].map((n) => join(models, `${n}.glb`)),
  ...["regolith", "rock"].flatMap((m) => ["base", "normal", "orm"].map((k) => join(textures, `${m}-${k}.webp`))),
];
const manifest = { generator: "scripts/assets/build-all.mjs", license: "Original work for Echoes Beyond Earth (see ASSETS.md)", files: {} };
for (const f of files) {
  try {
    const buf = readFileSync(f);
    manifest.files[relative(join(root, "public"), f).replaceAll("\\", "/")] = { bytes: statSync(f).size, sha256: createHash("sha256").update(buf).digest("hex") };
  } catch { /* not built in this run */ }
}
manifest.stats = stats;
writeFileSync(join(models, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify({ seconds: (Date.now() - t0) / 1000, stats, files: manifest.files }, null, 2));
