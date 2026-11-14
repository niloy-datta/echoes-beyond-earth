import test from "node:test";
import assert from "node:assert/strict";
import { gameUsageForSource } from "../src/components/sources/gameUsage.ts";

test("evidence UI: links actual game sources to accurate chapters", () => {
  assert.match(gameUsageForSource({ id: "img:PIA23178" }), /Chapter 1/);
  assert.match(gameUsageForSource({ id: "img:PIA22909" }), /Chapters 2 and 4/);
  assert.match(gameUsageForSource({ id: "nssdca:1967-035A" }), /Chapter 4/);
});

test("evidence UI: unrelated NASA records are not attributed to game chapters", () => {
  for (const id of ["img:PIA03165", "img:PIA25287", "nssdca:1975-075C", "ext:ut-zhurong"]) {
    assert.equal(gameUsageForSource({ id }), null);
  }
});

test("evidence UI: NASA Trek basemaps are not described as playable Mars/Moon maps", () => {
  assert.match(gameUsageForSource({ id: "trek:moon" }), /not the playable game world/);
  assert.match(gameUsageForSource({ id: "trek:mars" }), /not the playable game world/);
});
