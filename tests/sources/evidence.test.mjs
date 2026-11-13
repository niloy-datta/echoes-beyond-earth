import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

const sources = read("public/data/sources.json");
const objects = read("public/data/objects.geojson");
const stories = read("public/data/stories.json");

test("evidence observatory: references dataset schema and integrity", () => {
  assert.ok(Array.isArray(sources.references), "sources.references must be an array");
  assert.ok(sources.references.length >= 80, "Must contain at least 80 references");

  const seenIds = new Set();
  const validKinds = new Set(["catalog", "image-caption", "mission-page", "dataset"]);
  const validVerifications = new Set(["verified", "required"]);

  for (const ref of sources.references) {
    assert.ok(ref.id, "Reference must have an ID");
    assert.ok(!seenIds.has(ref.id), `Duplicate reference ID: ${ref.id}`);
    seenIds.add(ref.id);

    assert.ok(ref.title && ref.title.trim().length > 0, `Reference ${ref.id} missing title`);
    assert.ok(ref.publisher && ref.publisher.trim().length > 0, `Reference ${ref.id} missing publisher`);
    assert.ok(validKinds.has(ref.kind), `Reference ${ref.id} has invalid kind: ${ref.kind}`);
    assert.ok(validVerifications.has(ref.verification), `Reference ${ref.id} has invalid verification: ${ref.verification}`);

    assert.doesNotThrow(() => {
      const url = new URL(ref.url);
      assert.equal(url.protocol, "https:", `Reference ${ref.id} URL must use HTTPS`);
    }, `Reference ${ref.id} has invalid URL: ${ref.url}`);
  }
});

test("evidence observatory: commercial lunar landers (NASA CLPS) distinction", () => {
  const refMap = new Map(sources.references.map((r) => [r.id, r]));

  const im1Nova = refMap.get("clps:im-1-nova");
  const im1Sci = refMap.get("clps:im-1-mission");
  const bg1 = refMap.get("clps:blue-ghost-1");

  assert.ok(im1Nova, "Missing clps:im-1-nova reference");
  assert.ok(im1Sci, "Missing clps:im-1-mission reference");
  assert.ok(bg1, "Missing clps:blue-ghost-1 reference");

  // Verify explicit distinction between commercial landers and NASA science payloads
  assert.ok(im1Nova.note.includes("Commercial") || im1Nova.note.includes("CLPS"), "IM-1 note must mention commercial / CLPS");
  assert.ok(im1Sci.note.includes("commercial") || im1Sci.note.includes("CLPS"), "IM-1 Science note must clarify commercial operation");
  assert.ok(bg1.note.includes("Commercial") || bg1.note.includes("CLPS"), "Blue Ghost note must mention commercial / CLPS");
});

test("evidence observatory: metrics calculations consistency", () => {
  const refs = sources.references;
  const verified = refs.filter((r) => r.verification === "verified").length;
  const required = refs.filter((r) => r.verification === "required").length;

  assert.equal(verified + required, refs.length, "Verified + Required must equal total references");
  assert.ok(verified > 0, "Must have verified references");

  const coveragePct = ((verified / refs.length) * 100).toFixed(1);
  assert.ok(parseFloat(coveragePct) > 0 && parseFloat(coveragePct) <= 100, "Coverage percentage must be between 0% and 100%");

  const imageCount = Object.keys(sources.images).length;
  assert.ok(imageCount >= 32, "Must contain at least 32 registered NASA images");
});

test("evidence observatory: mission trace dataset validity and linkages", async () => {
  const { MISSION_TRACE_DATA } = await import("../../src/components/sources/missionData.ts");
  assert.ok(Array.isArray(MISSION_TRACE_DATA), "MISSION_TRACE_DATA must be an array");
  assert.equal(MISSION_TRACE_DATA.length, 20, "Must contain 20 featured missions in trace data");

  const refMap = new Map(sources.references.map((r) => [r.id, r]));

  for (const mission of MISSION_TRACE_DATA) {
    assert.ok(mission.id, "Mission must have an ID");
    assert.ok(mission.name.en && mission.name.bn, `Mission ${mission.id} missing bilingual name`);
    assert.ok(["moon", "mars"].includes(mission.body), `Mission ${mission.id} invalid body`);

    if (mission.id === "im-1" || mission.id === "blue-ghost-1") {
      assert.equal(mission.isClpsCommercial, true, `${mission.id} must be flagged as isClpsCommercial: true`);
      assert.ok(mission.operator?.includes("Commercial"), `${mission.id} operator must specify Commercial contractor`);
    }

    // Check facts
    for (const fact of mission.facts) {
      assert.ok(fact.label.en && fact.label.bn, `Mission ${mission.id} fact missing label`);
      assert.ok(fact.value.en && fact.value.bn, `Mission ${mission.id} fact missing value`);
      if (fact.sourceId) {
        assert.ok(refMap.has(fact.sourceId), `Mission ${mission.id} references unknown sourceId: ${fact.sourceId}`);
      }
    }
  }
});

test("evidence observatory: NASA image files and attribution completeness", () => {
  const images = Object.entries(sources.images);
  assert.ok(images.length > 0, "Must have registered images");

  for (const [id, img] of images) {
    assert.ok(img.title, `Image ${id} missing title`);
    assert.ok(img.credit, `Image ${id} missing credit`);
    assert.ok(img.page.startsWith("https://"), `Image ${id} missing HTTPS page link`);
    assert.ok(existsSync(join(root, "public", img.file)), `Image ${id} missing main image asset`);
    assert.ok(existsSync(join(root, "public", img.thumb)), `Image ${id} missing thumb asset`);
  }
});

test("evidence observatory: PIA03250 and Spirit MER-A precision audit", () => {
  const refMap = new Map(sources.references.map((r) => [r.id, r]));

  // 1. PIA03250
  const piaRef = refMap.get("img:PIA03250");
  assert.ok(piaRef, "Missing img:PIA03250 reference");
  assert.equal(piaRef.title, "Sweeping View of the Columbia Hills and Gusev Crater (3-D)");
  assert.ok(piaRef.url.includes("science.nasa.gov/photojournal/sweeping-view-of-the-columbia-hills-and-gusev-crater-3-d"));
  assert.equal(piaRef.verification, "verified");

  const piaImg = sources.images["PIA03250"];
  assert.ok(piaImg, "Missing PIA03250 in images map");
  assert.equal(piaImg.title, "Sweeping View of the Columbia Hills and Gusev Crater (3-D)");
  assert.ok(piaImg.page.includes("photojournal/sweeping-view-of-the-columbia-hills-and-gusev-crater-3-d"));

  // 2. Spirit MER-A: dual reference
  const spiritCatalog = refMap.get("nssdca:2003-027A");
  assert.ok(spiritCatalog, "Missing nssdca:2003-027A reference");
  assert.equal(spiritCatalog.verification, "verified", "NASA's Spirit catalog record was checked against the source");

  const spiritMission = refMap.get("sci:mer-spirit");
  assert.ok(spiritMission, "Missing sci:mer-spirit reference");
  assert.equal(spiritMission.verification, "verified", "Official NASA Science mission page must be 'verified'");
  assert.equal(spiritMission.url, "https://science.nasa.gov/mission/mer-spirit/");
});
