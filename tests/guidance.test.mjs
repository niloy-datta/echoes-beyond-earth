import test from "node:test";
import assert from "node:assert/strict";
import {
  compassDirection, roundedDistance, navigationHint, shouldHint, wrongAnswerHint, WRONG_ANSWER_HINTS,
  HINT_IDLE_FIRST, HINT_IDLE_REPEAT, HINT_MAX_PER_OBJECTIVE,
} from "../src/game/core/guidance.ts";
import { PUZZLES } from "../src/game/content/puzzles.ts";
import { GameSession } from "../src/game/core/session.ts";
import { newProgress } from "../src/game/core/progress.ts";

const o = { x: 0, z: 0 };
const bilingual = (l) => typeof l?.en === "string" && l.en.trim() && typeof l?.bn === "string" && l.bn.trim();

test("guidance: compass directions follow the HUD convention (north = −z, east = +x)", () => {
  assert.equal(compassDirection(o, { x: 0, z: -10 }).en, "north");
  assert.equal(compassDirection(o, { x: 10, z: 0 }).en, "east");
  assert.equal(compassDirection(o, { x: 0, z: 10 }).en, "south");
  assert.equal(compassDirection(o, { x: -10, z: 0 }).en, "west");
  assert.equal(compassDirection(o, { x: 10, z: -10 }).en, "north-east");
  assert.equal(roundedDistance(3), 5);
  assert.equal(roundedDistance(43), 45);
  assert.equal(roundedDistance(87), 90);
  const h0 = navigationHint(o, { x: 0, z: -40 }, 0), h1 = navigationHint(o, { x: 0, z: -40 }, 1);
  assert.ok(bilingual(h0.text) && bilingual(h1.text));
  assert.match(h1.text.en, /40 m north/);
  assert.match(h1.text.bn, /৪০/);
  assert.notEqual(h0.text.en, h1.text.en, "second hint escalates instead of repeating");
});

test("guidance: hints wait for idleness, skip when close, and are capped per objective", () => {
  const base = { distance: 50, reach: 3, busy: false };
  assert.equal(shouldHint({ ...base, idle: HINT_IDLE_FIRST - 1, given: 0 }), false);
  assert.equal(shouldHint({ ...base, idle: HINT_IDLE_FIRST, given: 0 }), true);
  assert.equal(shouldHint({ ...base, idle: HINT_IDLE_FIRST, given: 1 }), false);
  assert.equal(shouldHint({ ...base, idle: HINT_IDLE_REPEAT, given: 1 }), true);
  assert.equal(shouldHint({ ...base, idle: 999, given: HINT_MAX_PER_OBJECTIVE }), false);
  assert.equal(shouldHint({ ...base, idle: 999, given: 0, distance: 4 }), false);
  assert.equal(shouldHint({ ...base, idle: 999, given: 0, busy: true }), false);
});

test("guidance: every puzzle has bilingual wrong-answer hints that rotate", () => {
  for (const p of PUZZLES) {
    const pool = WRONG_ANSWER_HINTS[p.id];
    assert.ok(pool?.length, `hints for ${p.id}`);
    for (const l of pool) assert.ok(bilingual(l));
    if (pool.length > 1) assert.notDeepEqual(wrongAnswerHint(p.id, 0).text, wrongAnswerHint(p.id, 1).text);
  }
  assert.equal(wrongAnswerHint("nope", 0), null);
});

const idle = { x: 0, y: 0, sprint: false, jump: false, lookX: 0, lookY: 0, zoom: 0, interact: false };
const run = (s, seconds) => { for (let t = 0; t < seconds; t += 1 / 30) s.tick(1 / 30, idle); };

test("guidance: a standing-still explorer gets at most two navigation hints for one objective", () => {
  const s = new GameSession(newProgress());
  s.skipCutscene?.();
  run(s, 3);
  // Get to the movement tutorial (first objective after the intro).
  for (let i = 0; i < 20 && !s.active.some((o) => o.target); i++) { s.skipCutscene(); s.advanceDialogue(); run(s, 1); }
  assert.ok(s.active.some((o) => o.target), "an objective with a target is active");
  const lines = [];
  s.subscribe(() => { if (s.subtitle && !lines.includes(s.subtitle.key)) lines.push(s.subtitle.key); });
  const seen = new Set();
  const hintTexts = () => { const t = s.subtitle?.line.text.en ?? ""; if (/marker/i.test(t)) seen.add(t); };
  for (let t = 0; t < 200; t += 1 / 10) { s.tick(1 / 10, idle); hintTexts(); }
  assert.ok(seen.size >= 1 && seen.size <= 2, `hints shown: ${[...seen].join(" | ")}`);
});

test("guidance: a wrong puzzle answer shows an EKO hint inside the puzzle, cleared on close", () => {
  const s = new GameSession(newProgress());
  // Force the first puzzle open the same way interact() would.
  const obj = [...PUZZLES][0];
  s.puzzle = "c2-puzzle";
  assert.equal(s.answerPuzzle(false), false);
  assert.ok(s.puzzleHint && bilingual(s.puzzleHint.text));
  const first = s.puzzleHint.text.en;
  s.answerPuzzle(false);
  assert.notEqual(s.puzzleHint.text.en, first, `rotates (${obj.id})`);
  s.closePuzzle();
  assert.equal(s.puzzleHint, null);
});

import { learningRecord, attemptPuzzle, completeObjective, activeObjectives } from "../src/game/core/progress.ts";
import { LEARNING_GOALS } from "../src/game/content/puzzles.ts";

test("learning record: every puzzle has a bilingual goal; first-try vs after-hints is derived from the save", () => {
  for (const p of PUZZLES) assert.ok(bilingual(LEARNING_GOALS[p.id]), `goal for ${p.id}`);
  let p = newProgress();
  assert.ok(learningRecord(p).every((r) => !r.solved && !r.firstTry));
  let wrongOnce = false;
  for (let i = 0; i < 200; i++) {
    const a = activeObjectives(p);
    if (!a.length) break;
    for (const o of a) {
      if (o.kind === "puzzle") {
        if (o.puzzle === "storm-power" && !wrongOnce) { p = attemptPuzzle(p, o.id, false).progress; wrongOnce = true; }
        p = attemptPuzzle(p, o.id, true).progress;
      } else p = completeObjective(p, o.id).progress;
    }
  }
  const rec = learningRecord(p);
  assert.equal(rec.length, PUZZLES.length);
  assert.ok(rec.every((r) => r.solved));
  assert.equal(rec.find((r) => r.puzzle === "storm-power").firstTry, false);
  assert.equal(rec.find((r) => r.puzzle === "timeline").firstTry, true);
});

test("guidance: EKO hints add guidance instead of repeating the generic 'Not quite' feedback", () => {
  for (const pool of Object.values(WRONG_ANSWER_HINTS)) for (const l of pool) {
    assert.doesNotMatch(l.en, /not quite/i);
    assert.doesNotMatch(l.bn, /ঠিক হয়নি/);
  }
});
