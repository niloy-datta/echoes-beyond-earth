import test from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { EKO_STOPS, EKO_INTRO } from "../src/lib/eko-mission.ts";
import { EKO_START, EKO_BOUNDARY, moveEko, nearestEkoStop, sanitizeEkoProgress, ekoProgressCount } from "../src/lib/eko-logic.ts";

test("four unique bilingual NASA educational hotspots, all answerable", () => {
  assert.equal(EKO_STOPS.length, 4);
  assert.deepEqual(new Set(EKO_STOPS.map(s => s.id)).size, 4);
  for (const stop of EKO_STOPS) {
    assert.ok(stop.name.en && stop.name.bn);
    assert.ok(stop.lead.en && stop.lead.bn);
    assert.ok(stop.fact.en && stop.fact.bn);
    assert.ok(stop.question.en && stop.question.bn);
    assert.ok(stop.options.length >= 2);
    assert.ok(stop.options.every(x => x.en.length && x.bn.length));
    assert.ok(Number.isInteger(stop.correct) && stop.correct >= 0 && stop.correct < stop.options.length);
    assert.ok(stop.source.url.startsWith("https://") && /nasa\.gov/.test(new URL(stop.source.url).hostname));
    assert.ok(Number.isFinite(stop.position.x) && Number.isFinite(stop.position.z));
  }
  assert.ok(EKO_INTRO.en.title && EKO_INTRO.bn.title);
});

test("movement remains finite and inside playable region", () => {
  let p = { ...EKO_START };
  for (let i = 0; i < 80; i++) p = moveEko(p, "forward");
  assert.equal(p.z, EKO_BOUNDARY.zmin);
  for (let i = 0; i < 80; i++) p = moveEko(p, "left");
  assert.equal(p.x, EKO_BOUNDARY.xmin);
  for (let i = 0; i < 80; i++) p = moveEko(p, "back");
  assert.equal(p.z, EKO_BOUNDARY.zmax);
  for (let i = 0; i < 80; i++) p = moveEko(p, "right");
  assert.equal(p.x, EKO_BOUNDARY.xmax);
});

test("nearby evidence scans obey distance and cannot scan across the map", () => {
  const stop = EKO_STOPS[0];
  assert.equal(nearestEkoStop(stop.position, EKO_STOPS)?.id, stop.id);
  assert.equal(nearestEkoStop({x: 100, z: 100}, EKO_STOPS), null);
  assert.equal(nearestEkoStop({x: Number.NaN, z: 0}, EKO_STOPS), null);
  assert.equal(nearestEkoStop(stop.position, EKO_STOPS, 0)?.id, stop.id);
});

test("corrupted and duplicate persisted progress is normalized", () => {
  assert.deepEqual(sanitizeEkoProgress(["solar","solar","broken","wheels",null], EKO_STOPS.map(s => s.id)), ["solar","wheels"]);
  assert.deepEqual(sanitizeEkoProgress({solar:true}, EKO_STOPS.map(s => s.id)), []);
  assert.equal(ekoProgressCount(["solar","solar","wheels"], 4), 2);
  assert.equal(ekoProgressCount([], 4), 0);
});

test("vendored NASA model is a valid GLB and still credits the NASA source", () => {
  const bytes = readFileSync(new URL("../public/models/opportunity-mer-b.glb", import.meta.url));
  assert.equal(bytes.subarray(0,4).toString("ascii"), "glTF");
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const length = bytes.readUInt32LE(12);
  assert.equal(bytes.subarray(16,20).toString("ascii"), "JSON");
  const source = JSON.parse(bytes.subarray(20,20 + length).toString("utf8").trimEnd());
  assert.ok(source.meshes.length > 0);
  assert.ok(source.meshes[0].primitives.length >= 1);
  assert.ok(source.nodes.length >= 1);
  assert.ok(source.materials.length >= 1);
  assert.ok(source.extensionsUsed.includes("KHR_draco_mesh_compression"));
});

test("offline cache script is scoped, read-only and avoids external NASA/CDN URLs", () => {
  const script = readFileSync(new URL("../public/eko-sw.js", import.meta.url), "utf8");
  assert.match(script, /request\.method !== "GET"/);
  assert.match(script, /url\.origin !== self\.location\.origin/);
  assert.match(script, /new URL\("play\/", BASE\)/);
  assert.match(script, /MAX_FILES = 110/);
});
