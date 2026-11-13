/**
 * Pre-event EKO research prototype quality gate.
 * This is a build-integrity check, NOT a scientific peer review, NASA approval,
 * competition eligibility ruling, or proof of real-device accessibility.
 */
import { readFileSync, readdirSync, statSync, appendFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { EKO_STOPS } from "../src/lib/eko-mission.ts";
import { EVIDENCE } from "../src/game/content/evidence.ts";
import { CHAPTERS } from "../src/game/content/chapters.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const FILE = (path) => join(ROOT, path);
const MiB = 1024 * 1024;
const errors = [];
const summary = [];
const fail = (message) => errors.push(message);
const sources = JSON.parse(readFileSync(FILE("public/data/sources.json"), "utf8"));
const references = sources.references ?? [];
const refIds = new Set();

for (const reference of references) {
  if (!reference.id || refIds.has(reference.id)) fail(`Duplicate/empty source ID: ${reference.id}`);
  refIds.add(reference.id);
  if (!["verified", "required"].includes(reference.verification)) {
    fail(`Invalid verification status for ${reference.id}`);
  }
  try {
    const url = new URL(reference.url);
    if (url.protocol !== "https:") fail(`Source ${reference.id} must use HTTPS`);
  } catch { fail(`Invalid source URL for ${reference.id}`); }
}
const required = references.filter((source) => source.verification === "required");
const stopIds = new Set();
for (const stop of EKO_STOPS) {
  if (stopIds.has(stop.id)) fail(`Duplicate EKO stop: ${stop.id}`);
  stopIds.add(stop.id);
  for (const key of ["name", "lead", "fact", "question"]) {
    if (!stop[key]?.en?.trim() || !stop[key]?.bn?.trim()) fail(`Missing bilingual ${key} for ${stop.id}`);
  }
  if (stop.options.length < 2 || !stop.options.every(o => o.en?.trim() && o.bn?.trim())) {
    fail(`Missing bilingual quiz options: ${stop.id}`);
  }
  if (!Number.isInteger(stop.correct) || stop.correct < 0 || stop.correct >= stop.options.length) {
    fail(`Invalid quiz answer: ${stop.id}`);
  }
  try {
    const url = new URL(stop.source.url);
    if (url.protocol !== "https:" || !(url.hostname === "nasa.gov" || url.hostname.endsWith(".nasa.gov"))) {
      fail(`Non-NASA evidence URL for ${stop.id}: ${url.href}`);
    }
  } catch { fail(`Missing/invalid evidence URL: ${stop.id}`); }
}
if (EKO_STOPS.length !== 4) fail("EKO learning journey must have all four reviewed clues");

// THE LAST LIGHT game: every in-game historical record must cite NASA.
for (const e of EVIDENCE) {
  try {
    const url = new URL(e.source.url);
    if (url.protocol !== "https:" || !(url.hostname === "nasa.gov" || url.hostname.endsWith(".nasa.gov"))) fail(`Non-NASA game evidence URL for ${e.id}`);
  } catch { fail(`Invalid game evidence URL: ${e.id}`); }
  if (!e.fact?.en?.trim() || !e.fact?.bn?.trim()) fail(`Missing bilingual game evidence: ${e.id}`);
}
if (CHAPTERS.length !== 5) fail("The Last Light must keep all five chapters");

const rover = readFileSync(FILE("public/models/opportunity-mer-b.glb"));
if (rover.toString("ascii", 0, 4) !== "glTF" || rover.readUInt32LE(8) !== rover.length) {
  fail("Vendored NASA rover model GLB appears corrupt");
}
const output = FILE("out");
if (existsSync(output)) {
  let total = 0, jsTotal = 0, jsCount = 0, fileCount = 0;
  function walk(path) {
    for (const file of readdirSync(path, { withFileTypes: true })) {
      const target = join(path, file.name);
      if (file.isDirectory()) { walk(target); continue; }
      if (!file.isFile()) continue;
      const bytes = statSync(target).size;
      total += bytes; fileCount++;
      if (target.endsWith(".js")) {
        jsTotal += bytes; jsCount++;
        if (bytes > 5 * MiB) fail(`JavaScript asset exceeds 5 MiB: ${target.slice(output.length + 1)}`);
      } else if (bytes > 15 * MiB) {
        fail(`Static asset exceeds 15 MiB: ${target.slice(output.length + 1)}`);
      }
    }
  }
  walk(output);
  for (const required of ["play/game/index.html", "vendor/draco/draco_decoder.wasm", "vendor/draco/draco_wasm_wrapper.js", "models/opportunity-mer-b.glb"]) {
    if (!existsSync(join(output, required))) fail(`Static export is missing ${required}`);
  }
  // The game's Three.js engine must stay a lazy chunk, not part of every museum page.
  const home = existsSync(join(output, "index.html")) ? readFileSync(join(output, "index.html"), "utf8") : "";
  if (/WebGLRenderer|three.module/.test(home)) fail("Three.js leaked into the homepage HTML");
  if (jsTotal > 18 * MiB) fail(`Total JS exceeds 18 MiB: ${(jsTotal / MiB).toFixed(2)} MiB`);
  if (total > 100 * MiB) fail(`Static export exceeds 100 MiB: ${(total / MiB).toFixed(2)} MiB`);
  summary.push(`Static export: ${fileCount} assets, ${(total/MiB).toFixed(2)} MiB; ${jsCount} JS assets, ${(jsTotal/MiB).toFixed(2)} MiB`);
} else {
  summary.push("Static export skipped (run after npm run build to check bundle budgets)");
}
summary.unshift(`Evidence ledger: ${references.length} source records, ${required.length} still need independent verification; ${EKO_STOPS.length} NASA-linked bilingual quizzes; ${EVIDENCE.length} NASA-cited game records in ${CHAPTERS.length} chapters`);
for (const row of summary) console.log("[eko-quality]", row);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    "### EKO pre-event prototype integrity\n" +
    summary.map(row => `- ${row}`).join("\n") +
    "\n\nNot a NASA scientific endorsement or competition eligibility ruling.\n");
}
if (errors.length) {
  for (const error of errors) console.error("[eko-quality] FAIL:", error);
  process.exitCode = 1;
} else console.log("[eko-quality] PASS: integrity and conservative asset budgets");
