// The playable game decodes NASA's Draco-compressed Opportunity GLB in the browser.
// Copy three.js's WebAssembly Draco decoder into /public so the static export serves
// it from the same origin (no third-party CDN, works on GitHub Pages and offline caches).
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "three", "examples", "jsm", "libs", "draco", "gltf");
const out = join(root, "public", "vendor", "draco");
mkdirSync(out, { recursive: true });
for (const f of ["draco_decoder.wasm", "draco_wasm_wrapper.js"]) copyFileSync(join(src, f), join(out, f));
console.log("draco decoder copied →", out);
