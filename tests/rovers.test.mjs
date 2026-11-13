import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { ROVERS, ROVER_STORAGE_KEY, sanitizeRoverProgress } from "../src/game/rovers/registry.ts";

const ids = ["sojourner", "spirit", "opportunity", "curiosity", "perseverance"];

test("rover legacy contains five distinct, bilingual mission records", () => {
  assert.deepEqual(ROVERS.map((rover) => rover.id), ids);
  for (const rover of ROVERS) {
    for (const field of [rover.landing, rover.theme, rover.mission, rover.discovery, rover.challenge, rover.power, rover.status, rover.distanceLabel]) {
      assert.ok(field.en?.trim() && field.bn?.trim(), `${rover.id} needs English and Bangla copy`);
    }
    assert.ok(rover.parts.length >= 3);
    assert.ok(rover.timeline.length >= 2);
    assert.ok(rover.options.length >= 2 && rover.answer >= 0 && rover.answer < rover.options.length);
    assert.match(rover.source.url, /^https:\/\/science\.nasa\.gov\//);
    if (rover.model.path) assert.ok(existsSync(`public${rover.model.path}`), `missing local model for ${rover.id}`);
  }
});

test("Sojourner is explicitly labeled as a reconstruction and NASA mission data stays sourced", () => {
  const rover = ROVERS.find(({ id }) => id === "sojourner");
  assert.equal(rover.model.kind, "reconstruction");
  assert.equal(rover.model.path, undefined);
  assert.equal(ROVERS.filter(({ model }) => model.kind === "nasa").length, 4);
  assert.equal(ROVER_STORAGE_KEY, "echoes-beyond-earth:rover-legacy:v1");
});

test("saved rover progress is restricted to known missions, parts, and boolean milestones", () => {
  const clean = sanitizeRoverProgress({
    completed: ["opportunity", "alien", "opportunity", 5],
    parts: { opportunity: ["mobility", "alien", "mobility"], alien: ["vision"] },
    missions: { opportunity: { drive: true, activity: "yes", answer: false, injected: true }, alien: { drive: true } },
  });
  assert.deepEqual(clean, {
    completed: ["opportunity"],
    parts: { opportunity: ["mobility"] },
    missions: { opportunity: { drive: true, activity: false, answer: false } },
  });
  assert.deepEqual(sanitizeRoverProgress(null), { completed: [], parts: {}, missions: {} });
});
