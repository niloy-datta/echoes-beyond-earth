// Page-specific source verification & scientific audit script for /sources/
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

const sources = read("public/data/sources.json");
const objects = read("public/data/objects.geojson");
const stories = read("public/data/stories.json");

console.log("==================================================");
console.log("ECHOES BEYOND EARTH · EVIDENCE OBSERVATORY AUDIT");
console.log("==================================================");

const references = sources.references ?? [];
const images = sources.images ?? {};
const refMap = new Map();
const errors = [];

// 1. Audit references
let verifiedCount = 0;
let requiredCount = 0;
const byKind = {};
const byPublisher = {};

for (const ref of references) {
  if (!ref.id) errors.push(`Empty ID found in references`);
  if (refMap.has(ref.id)) errors.push(`Duplicate ID: ${ref.id}`);
  refMap.set(ref.id, ref);

  if (!["verified", "required"].includes(ref.verification)) {
    errors.push(`Invalid verification status for ${ref.id}: ${ref.verification}`);
  }
  if (ref.verification === "verified") verifiedCount++;
  else requiredCount++;

  try {
    const url = new URL(ref.url);
    if (url.protocol !== "https:") errors.push(`Source ${ref.id} URL must use HTTPS: ${ref.url}`);
  } catch {
    errors.push(`Invalid URL for ${ref.id}: ${ref.url}`);
  }

  byKind[ref.kind] = (byKind[ref.kind] || 0) + 1;
  byPublisher[ref.publisher] = (byPublisher[ref.publisher] || 0) + 1;
}

// 2. Audit NASA images
const imageEntries = Object.entries(images);
for (const [id, img] of imageEntries) {
  if (!img.title) errors.push(`Image ${id} missing title`);
  if (!img.credit) errors.push(`Image ${id} missing credit`);
  if (!img.page) errors.push(`Image ${id} missing page URL`);
  for (const f of [img.file, img.thumb]) {
    if (!existsSync(join(root, "public", f))) {
      errors.push(`Image ${id} missing physical asset: ${f}`);
    }
  }
}

// 3. Audit CLPS Commercial Lunar Lander evidence
const clpsIm1 = refMap.get("clps:im-1-nova");
const clpsIm1Sci = refMap.get("clps:im-1-mission");
const clpsBg1 = refMap.get("clps:blue-ghost-1");

if (!clpsIm1 || !clpsIm1Sci || !clpsBg1) {
  errors.push("Missing CLPS commercial lunar lander reference entries (IM-1 / Blue Ghost 1)");
} else {
  if (!clpsIm1.note?.includes("Commercial") && !clpsIm1.note?.includes("CLPS")) {
    errors.push("IM-1 reference must clearly distinguish commercial lander carrying NASA payloads");
  }
  if (!clpsBg1.note?.includes("Commercial") && !clpsBg1.note?.includes("CLPS")) {
    errors.push("Blue Ghost 1 reference must clearly distinguish commercial lander carrying NASA payloads");
  }
}

// 4. Audit Mission-to-Evidence traceability
let factsWithSources = 0;
let validFactSources = 0;
for (const s of stories.stories) {
  for (const f of s.facts) {
    if (f.source) {
      factsWithSources++;
      if (refMap.has(f.source)) {
        validFactSources++;
      } else {
        errors.push(`Story ${s.id} fact references unknown source: ${f.source}`);
      }
    }
  }
}

// Coverage calculations
const totalRefs = references.length;
const coveragePct = totalRefs > 0 ? ((verifiedCount / totalRefs) * 100).toFixed(1) : "0.0";

console.log(`Total Reference Records:        ${totalRefs}`);
console.log(`Project-Marked Verified Refs:    ${verifiedCount}`);
console.log(`Verification Required Records:  ${requiredCount}`);
console.log(`Project Ledger Marked-Verified:     ${coveragePct}%`);
console.log(`Curated NASA Image Plates:      ${imageEntries.length}`);
console.log(`Historical Facts Sourced:       ${validFactSources} / ${factsWithSources} linked`);
console.log("\nReferences by Kind:");
console.table(byKind);
console.log("\nReferences by Publisher:");
console.table(byPublisher);

if (errors.length > 0) {
  console.error(`\n❌ AUDIT FAILED with ${errors.length} errors:`);
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
} else {
  console.log(`\n✅ REFERENCE STRUCTURE AUDIT PASSED. URL syntax, links in local data, and asset presence were checked. Scientific accuracy, independent review, and challenge eligibility were NOT certified by this script.`);
  process.exit(0);
}
