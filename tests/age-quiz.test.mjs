import test from "node:test";
import assert from "node:assert/strict";
import { PUZZLE_BY_ID, questionFor, checkQuiz } from "../src/game/content/puzzles.ts";
import { EVIDENCE_BY_ID } from "../src/game/content/evidence.ts";
import { OBJECTIVE_BY_ID } from "../src/game/content/chapters.ts";
import { newProgress, previewProgress, activeObjectives, completeObjective, attemptPuzzle } from "../src/game/core/progress.ts";
import { GameSession } from "../src/game/core/session.ts";
import { GAME_SETTINGS_KEY, sanitizeGameSettings } from "../src/game/settings.ts";
import { SAVE_KEY } from "../src/game/core/progress.ts";

const BANDS = ["junior", "young", "research"];
const bilingual = (l) => typeof l?.en === "string" && l.en.trim() && typeof l?.bn === "string" && l.bn.trim();
const lunar = PUZZLE_BY_ID.get("lunar-record");

test("age quiz: every band sees the same options, correct answer and evidence", () => {
  for (const q of lunar.questions) {
    for (const band of BANDS) {
      const shown = questionFor(q, band);
      assert.ok(bilingual(shown.prompt), `${band} prompt`);
      assert.ok(bilingual(shown.explain), `${band} explain`);
    }
    assert.ok(q.byBand?.junior && q.byBand?.research, "lunar questions have junior and research wording");
    // Wording differs by band; grading and evidence do not.
    assert.notEqual(questionFor(q, "junior").prompt.en, questionFor(q, "research").prompt.en);
    assert.ok(EVIDENCE_BY_ID.has(q.evidence));
    assert.equal(q.options.length, 3);
    assert.ok(q.correct >= 0 && q.correct < q.options.length);
  }
});

test("age quiz: a question without band wording falls back to the default text", () => {
  const plain = PUZZLE_BY_ID.get("final-assembly").questions[0];
  for (const band of BANDS) assert.equal(questionFor(plain, band).prompt, plain.prompt);
  assert.equal(questionFor(lunar.questions[0], "young").prompt, lunar.questions[0].prompt);
});

test("age quiz: grading is identical for every band (checkQuiz takes no band)", () => {
  const answers = lunar.questions.map((q) => q.correct);
  assert.ok(checkQuiz(lunar, answers));
  assert.ok(!checkQuiz(lunar, answers.map((a, i) => (i === 0 ? (a + 1) % 3 : a))));
});

test("age quiz: changing learning level never changes progress or the saved game", () => {
  assert.notEqual(GAME_SETTINGS_KEY, SAVE_KEY, "settings and progress are stored under different keys");
  // Play to the lunar quiz, then answer it under two different learner bands.
  let p = newProgress();
  for (let i = 0; i < 400; i++) {
    const a = activeObjectives(p);
    if (!a.length || a[0].id === "c4-lunar-quiz") break;
    for (const o of a) p = (o.kind === "puzzle" ? attemptPuzzle(p, o.id, true) : completeObjective(p, o.id)).progress;
  }
  assert.equal(activeObjectives(p)[0].id, "c4-lunar-quiz");
  const results = BANDS.map((band) => {
    const s = new GameSession(JSON.parse(JSON.stringify(p)), () => {});
    s.options = { ...s.options, band };
    s.puzzle = "c4-lunar-quiz";
    const ok = s.answerPuzzle(true);
    return { ok, done: [...s.progress.done].sort(), xp: s.progress.bestXp };
  });
  assert.ok(results.every((r) => r.ok));
  assert.deepEqual(results[0], results[1]);
  assert.deepEqual(results[1], results[2]);
});

test("age quiz: settings round-trip keeps the chosen learning level; unknown values are rejected", () => {
  for (const band of BANDS) assert.equal(sanitizeGameSettings({ learnerBand: band }).learnerBand, band);
  assert.equal(sanitizeGameSettings({ learnerBand: "expert" }).learnerBand, null);
});

test("age quiz: the lunar quiz objective is still the chapter 4 puzzle", () => {
  assert.equal(OBJECTIVE_BY_ID.get("c4-lunar-quiz").puzzle, "lunar-record");
  assert.equal(previewProgress(3).chapter, 3);
});
