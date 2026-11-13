import test from "node:test";
import assert from "node:assert/strict";
import { buildQuickMission, scoreQuickMission } from "../src/game/core/quickMission.ts";

test("quick mission presents one NASA-sourced question from every chapter", () => {
  const questions = buildQuickMission();
  assert.equal(questions.length, 5);
  assert.equal(new Set(questions.map((question) => question.id)).size, 5);
  for (const [chapter, question] of questions.entries()) {
    assert.equal(question.chapter, chapter);
    assert.equal(question.use, "chapter");
    assert.ok(question.prompt.en && question.prompt.bn);
    assert.ok(question.options.every((option) => option.en && option.bn));
    assert.ok(new URL(question.source.url).hostname.endsWith("nasa.gov") || new URL(question.source.url).hostname === "pds-geosciences.wustl.edu");
  }
});

test("replay chooses a different question from each chapter", () => {
  const before = buildQuickMission(0);
  const replay = buildQuickMission(1);
  assert.equal(replay.length, 5);
  for (let index = 0; index < 5; index++) {
    assert.notEqual(before[index].id, replay[index].id);
    assert.equal(replay[index].chapter, index);
  }
  assert.deepEqual(buildQuickMission(-2).map((question) => question.id), before.map((question) => question.id));
});

test("quick mission scoring is accurate and does not mutate answers", () => {
  const questions = buildQuickMission(0);
  const choices = {};
  const empty = scoreQuickMission(questions, choices);
  assert.deepEqual(empty, { answered: 0, correct: 0, total: 5, pct: 0 });
  choices[questions[0].id] = questions[0].correct;
  choices[questions[1].id] = (questions[1].correct + 1) % questions[1].options.length;
  const partial = scoreQuickMission(questions, choices);
  assert.deepEqual(partial, { answered: 2, correct: 1, total: 5, pct: 20 });
  assert.deepEqual(scoreQuickMission(questions, choices), partial);
  assert.equal(Object.keys(choices).length, 2);
  const perfect = Object.fromEntries(questions.map((question) => [question.id, question.correct]));
  assert.deepEqual(scoreQuickMission(questions, perfect), { answered: 5, correct: 5, total: 5, pct: 100 });
  const invalid = { ...perfect, [questions[0].id]: 999 };
  assert.deepEqual(scoreQuickMission(questions, invalid), { answered: 4, correct: 4, total: 5, pct: 80 });
});
