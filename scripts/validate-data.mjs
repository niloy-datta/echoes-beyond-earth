// Validates the museum's static data before every build: every source, image and object
// reference must resolve, every story must exist in both languages, and every coordinate
// must be a real lon/lat. A failing check stops the build — broken evidence never ships.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const objects = read("public/data/objects.geojson");
const stories = read("public/data/stories.json");
const sources = read("public/data/sources.json");
const strings = read("src/data/strings.json");

const errors = [];
const ids = new Set(objects.features.map((f) => f.id));
const refs = new Set(sources.references.map((r) => r.id));
const images = new Set(Object.keys(sources.images));
const VER = new Set(["verified", "required"]);
const DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;

const src = (id, where) => id == null || refs.has(id) || errors.push(`${where}: unknown source "${id}"`);
const img = (id, where) => id == null || images.has(id) || errors.push(`${where}: unknown image "${id}"`);
const loc = (v, where) => (v && v.en && v.bn) || errors.push(`${where}: missing en/bn text`);
const ver = (v, where) => VER.has(v) || errors.push(`${where}: bad verification "${v}"`);
const date = (d, where) => DATE.test(d) || errors.push(`${where}: bad date "${d}"`);

for (const f of objects.features) {
  const p = f.properties;
  const w = `object ${f.id}`;
  if (f.id !== p.id) errors.push(`${w}: id mismatch`);
  if (f.geometry) {
    const [lon, lat] = f.geometry.coordinates;
    if (!(lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90)) errors.push(`${w}: coordinates out of range`);
  }
  loc(p.name, w);
  loc(p.site, w);
  date(p.arrived.date, `${w}.arrived`);
  ver(p.arrived.verification, `${w}.arrived`);
  src(p.arrived.source, `${w}.arrived`);
  if (p.end) {
    date(p.end.date, `${w}.end`);
    ver(p.end.verification, `${w}.end`);
    src(p.end.source, `${w}.end`);
    loc(p.end.label, `${w}.end`);
  }
  img(p.image, w);
  p.sources.forEach((s) => src(s, w));
}

for (const s of stories.stories) {
  const w = `story ${s.id}`;
  if (!ids.has(s.object)) errors.push(`${w}: unknown object "${s.object}"`);
  [s.title, s.dek, s.kept].forEach((x) => loc(x, w));
  s.chapters.forEach((c, i) => {
    [c.kicker, c.title, c.body].forEach((x) => loc(x, `${w}.chapter${i}`));
    img(c.image, `${w}.chapter${i}`);
  });
  s.facts.forEach((f, i) => {
    loc(f.label, `${w}.fact${i}`);
    loc(f.value, `${w}.fact${i}`);
    ver(f.verification, `${w}.fact${i}`);
    src(f.source, `${w}.fact${i}`);
  });
  if (s.lastSignal) {
    date(s.lastSignal.date, `${w}.lastSignal`);
    ver(s.lastSignal.verification, `${w}.lastSignal`);
  }
}
for (const l of stories.lens) ["then", "now"].forEach((k) => img(l[k].image, `lens ${l.id}.${k}`));
for (const p of stories.paths) p.steps.forEach((s) => ids.has(s.object) || errors.push(`path ${p.id}: unknown object "${s.object}"`));
for (const r of stories.ripples) {
  if (!ids.has(r.from)) errors.push(`ripple ${r.id}: unknown origin`);
  r.rings.forEach((g) => {
    if (!ids.has(g.to)) errors.push(`ripple ${r.id}: unknown target "${g.to}"`);
    src(g.source, `ripple ${r.id}`);
    ver(g.verification, `ripple ${r.id}`);
  });
}
for (const e of stories.timeline) {
  date(e.date, "timeline");
  src(e.source, "timeline");
}
for (const [id, im] of Object.entries(sources.images)) {
  for (const f of [im.file, im.thumb]) if (!existsSync(join(root, "public", f))) errors.push(`image ${id}: missing file ${f}`);
}
const en = Object.keys(strings.en);
const bn = new Set(Object.keys(strings.bn));
en.filter((k) => !bn.has(k)).forEach((k) => errors.push(`strings: Bangla missing "${k}"`));

if (errors.length) {
  console.error(`✖ data validation failed (${errors.length}):\n  ` + errors.join("\n  "));
  process.exit(1);
}
const required = sources.references.filter((r) => r.verification === "required").length;
console.log(
  `✓ data valid — ${objects.features.length} objects, ${stories.stories.length} capsules, ${images.size} images, ` +
    `${refs.size} sources (${required} flagged "Source verification required")`,
);
