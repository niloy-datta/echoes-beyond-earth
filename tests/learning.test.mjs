import test from "node:test";
import assert from "node:assert/strict";
import { LEARNING_OBJECTIVES, LEARNING_QUESTIONS, sanitizeLearning, answerLearning, firstAttemptScore } from "../src/game/core/learning.ts";

test("learning items have bilingual content, valid answers, skills and NASA sources", () => {
  assert.equal(new Set(LEARNING_QUESTIONS.map(q => q.id)).size, LEARNING_QUESTIONS.length);
  for (const q of LEARNING_QUESTIONS) {
    assert.ok(LEARNING_OBJECTIVES.some(o => o.id === q.skill && o.chapter === q.chapter));
    for (const field of [q.prompt, q.explanation, ...q.options]) assert.ok(field.en && field.bn);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.options.length);
    assert.match(new URL(q.source.url).hostname, /(^|\.)nasa\.gov$/);
  }
});
test("retry solves an item without changing first-attempt score", () => {
  const q = LEARNING_QUESTIONS[0];
  let p = sanitizeLearning(null);
  p = answerLearning(p, q.id, (q.correct + 1) % q.options.length);
  p = answerLearning(p, q.id, q.correct);
  assert.equal(p.attempts[0].solved, true);
  assert.equal(firstAttemptScore(p), 0);
  assert.equal(answerLearning(p, q.id, q.correct), p);
});
test("learning save rejects unknown versions and malformed records", () => {
  assert.deepEqual(sanitizeLearning({ v: 999, attempts: [] }).attempts, []);
  assert.deepEqual(sanitizeLearning({ v: 1, attempts: [{ question: "fake", solved: true, firstCorrect: true }] }).attempts, []);
  assert.deepEqual(sanitizeLearning({ v: 1, attempts: [{ question: "wheels", solved: false, firstCorrect: true }] }).attempts, []);
});
