// MapLibre GL 6 runs its tile work in a module Worker that is loaded by URL, outside the
// app bundle. Copy the self-contained worker into /public so the static export
// serves them from the same origin.
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "maplibre-gl", "dist");
const out = join(root, "public", "vendor", "maplibre");
mkdirSync(out, { recursive: true });
for (const f of readdirSync(src)) {
  if (f === "maplibre-gl-worker.mjs") copyFileSync(join(src, f), join(out, f));
}
console.log("maplibre worker copied →", out);
