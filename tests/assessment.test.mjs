import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BANK, COMPETENCIES, AGE_GROUPS } from "../src/game/content/learningBank.ts";
import {
  ITEMS, itemsFor, itemById, promptFor, newAssessment, sanitizeAssessment, answer, canStart, setAge, scoreOf, compare,
  mastery, recommendations, correctedMisconceptions, MASTERY_AT, PRACTICE_BELOW,
} from "../src/game/core/assessment.ts";
import { parseOpacityTable, medianBySol } from "../scripts/data/build-mer1-opacity.mjs";
import { PDS_TAU } from "../src/game/content/puzzles.ts";

const bilingual = (l) => typeof l?.en === "string" && l.en.trim() && typeof l?.bn === "string" && l.bn.trim();
const nasa = (url) => /(^|\.)nasa\.gov$/.test(new URL(url).hostname) || new URL(url).hostname === "pds-geosciences.wustl.edu";
const solveAll = (s, items, firstRight = true) => {
  for (const i of items) {
    if (!firstRight) s = answer(s, i.id, (i.correct + 1) % i.options.length).state;
    s = answer(s, i.id, i.correct).state;
  }
  return s;
};

test("bank: counts, unique ids, bilingual text, valid answers, NASA/PDS sources", () => {
  assert.equal(itemsFor({ kind: "pre" }).length, 10);
  assert.equal(itemsFor({ kind: "post" }).length, 10);
  for (let c = 0; c < 5; c++) assert.equal(itemsFor({ kind: "chapter", chapter: c }).length, 5, `chapter ${c + 1}`);
  assert.equal(itemsFor({ kind: "challenge" }).length, 5);
  assert.equal(new Set(ITEMS.map((i) => i.id)).size, ITEMS.length);
  for (const i of ITEMS) {
    for (const f of [i.prompt, i.explanation, i.misconception, i.hint, ...i.options]) assert.ok(bilingual(f), i.id);
    if (i.simple) assert.ok(bilingual(i.simple), `${i.id} simple`);
    assert.ok(Number.isInteger(i.correct) && i.correct >= 0 && i.correct < i.options.length, i.id);
    assert.ok(nasa(i.source.url), `${i.id} source ${i.source.url}`);
    assert.ok(COMPETENCIES.some((c) => c.id === i.competency));
  }
  for (const i of BANK) assert.equal(i.options.length, 4, `${i.id}: new MCQs have four options`);
  assert.deepEqual(AGE_GROUPS.map((a) => a.ages), ["8–10", "11–13", "14–17"]);
});

test("bank: pre and post are parallel forms (2 per competency, never the same item)", () => {
  for (const { id } of COMPETENCIES) {
    assert.equal(itemsFor({ kind: "pre" }).filter((i) => i.competency === id).length, 2, `pre ${id}`);
    assert.equal(itemsFor({ kind: "post" }).filter((i) => i.competency === id).length, 2, `post ${id}`);
  }
  const preText = new Set(itemsFor({ kind: "pre" }).map((i) => i.prompt.en));
  for (const i of itemsFor({ kind: "post" })) assert.ok(!preText.has(i.prompt.en));
});

test("age wording: beginners get simpler text when available; options and answer never change", () => {
  const i = itemById("pre-hw-1");
  assert.equal(promptFor(i, "beginner"), i.simple);
  assert.equal(promptFor(i, "advanced"), i.prompt);
  assert.equal(promptFor(itemById("pre-hw-2"), "beginner"), itemById("pre-hw-2").prompt, "falls back when no simple text");
});

test("answers: first-try is fixed by the first answer; retries solve but never upgrade", () => {
  const i = itemById("pre-ev-1");
  let s = answer(newAssessment(), i.id, (i.correct + 1) % 4).state;
  assert.deepEqual(s.attempts[i.id], { firstCorrect: false, solved: false, tries: 1 });
  s = answer(s, i.id, i.correct).state;
  assert.deepEqual(s.attempts[i.id], { firstCorrect: false, solved: true, tries: 2 });
  assert.equal(answer(s, i.id, i.correct).state, s, "solved items are locked");
  assert.equal(answer(s, "nope", 0).state, s);
  assert.equal(answer(s, i.id, 9).state, s);
});

test("post-assessment opens only after the pre-assessment; completion is recorded per set", () => {
  let s = newAssessment();
  assert.equal(canStart(s, { kind: "post" }), false);
  const post0 = itemsFor({ kind: "post" })[0];
  assert.equal(answer(s, post0.id, post0.correct).state, s, "post answers rejected before pre");
  s = solveAll(s, itemsFor({ kind: "pre" }));
  assert.ok(s.completed.pre && canStart(s, { kind: "post" }));
  s = solveAll(s, itemsFor({ kind: "chapter", chapter: 2 }));
  assert.ok(s.completed.chapters[2]);
});

test("pre/post comparison: real percentage-point change, per competency, never assumed", () => {
  let s = newAssessment();
  const pre = itemsFor({ kind: "pre" });
  // 4 of 10 first-try correct on the pre-test.
  pre.forEach((i, n) => {
    if (n >= 4) s = answer(s, i.id, (i.correct + 1) % 4).state;
    s = answer(s, i.id, i.correct).state;
  });
  assert.deepEqual(compare(s).post, null, "no post score before the post-test");
  assert.equal(compare(s).pre, 40);
  s = solveAll(s, itemsFor({ kind: "post" }));
  const c = compare(s);
  assert.equal(c.post, 100);
  assert.equal(c.deltaPoints, 60);
  assert.equal(c.byCompetency.length, 5);
  assert.ok(c.byCompetency.every((x) => x.post === 100 && typeof x.deltaPoints === "number"));
  assert.deepEqual(scoreOf(s, pre), { answered: 10, total: 10, firstTry: 4, assisted: 6, pct: 40 });
});

test("mastery and adaptive recommendations follow fixed thresholds", () => {
  assert.ok(MASTERY_AT > PRACTICE_BELOW);
  let s = newAssessment();
  assert.equal(mastery(s, "environment").level, "not-enough-evidence");
  // Environment: wrong first on both pre items → needs practice → an unanswered chapter item.
  for (const i of itemsFor({ kind: "pre" }).filter((x) => x.competency === "environment")) {
    s = answer(s, i.id, (i.correct + 1) % 4).state;
    s = answer(s, i.id, i.correct).state;
  }
  // Hardware: right first on both → demonstrated → its challenge.
  s = solveAll(s, itemsFor({ kind: "pre" }).filter((x) => x.competency === "hardware"));
  assert.equal(mastery(s, "environment").level, "needs-practice");
  assert.equal(mastery(s, "hardware").level, "demonstrated");
  const rec = recommendations(s);
  const env = rec.find((r) => r.competency === "environment");
  assert.equal(env.type, "practice");
  assert.equal(itemById(env.itemId).competency, "environment");
  assert.equal(itemById(env.itemId).use, "chapter");
  assert.deepEqual(rec.find((r) => r.competency === "hardware"), { competency: "hardware", type: "challenge", itemId: "ch-hw" });
  assert.equal(correctedMisconceptions(s).length, 2);
  // Deterministic: same state, same advice.
  assert.deepEqual(recommendations(s), rec);
});

test("storage: corrupt, forged and legacy data are sanitized safely", () => {
  for (const bad of [null, 1, "x", [], { v: 9 }]) assert.deepEqual(sanitizeAssessment(bad), newAssessment());
  const forged = sanitizeAssessment({ v: 1, age: "admin", attempts: { "pre-hw-1": { firstCorrect: true, solved: false }, fake: { firstCorrect: true, solved: true } }, completed: { pre: "2026-11-13T00:00:00Z", post: "2026-11-13T00:00:00Z", chapters: { 7: "x" } } });
  assert.equal(forged.age, null);
  assert.deepEqual(forged.attempts, {});
  assert.deepEqual(forged.completed, { chapters: {} }, "completion is only kept when every item was solved");
  let s = setAge(newAssessment(), "beginner");
  s = solveAll(s, itemsFor({ kind: "pre" }));
  const back = sanitizeAssessment(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(back, s);
});

test("NASA PDS opacity data: parser and shipped JSON match the raw product", () => {
  const raw = readFileSync("data/nasa/mer1-pancam-opacity/1tau880_5106_20181207a.tab", "latin1");
  const rows = parseOpacityTable(raw);
  assert.equal(rows.length, 8639, "PDS label declares ROWS = 8639");
  assert.ok(rows.every((r) => r.product.startsWith("1P")), "every product is MER1 (Opportunity) Pancam");
  const sols = medianBySol(rows);
  const json = JSON.parse(readFileSync("public/data/nasa/mer1-opacity.json", "utf8"));
  assert.deepEqual(json.sols, sols, "shipped JSON is reproducible from the raw table");
  assert.equal(json.provenance.product, "1TAU880_5106_20181207A");
  assert.equal(json.provenance.doi, "10.17189/1518992");
  assert.equal(json.provenance.coverage.stop, "2018-06-05T13:03:59");
  const at = (sol) => sols.find((x) => x[0] === sol)?.[1];
  assert.equal(at(5103), 1.713);
  assert.equal(at(5105), 2.259);
  assert.equal(Math.max(...sols.map((x) => x[1])), 4.525);
  assert.ok(!sols.some((x) => x[0] > 5106), "nothing after the product's coverage");
  const all = sols.map((x) => x[1]).sort((a, b) => a - b);
  assert.equal(all[all.length >> 1], 0.689, "typical (median) daily tau quoted in the quiz");
});

test("storm lab: PDS values shown in the game match the shipped NASA data", () => {
  const json = JSON.parse(readFileSync("public/data/nasa/mer1-opacity.json", "utf8"));
  const at = (sol) => json.sols.find((x) => x[0] === sol)[1];
  const all = json.sols.map((x) => x[1]).sort((a, b) => a - b);
  assert.equal(PDS_TAU.typical, all[all.length >> 1]);
  assert.equal(PDS_TAU.sol5102, at(5102));
  assert.equal(PDS_TAU.sol5105, at(5105));
  assert.equal(PDS_TAU.product, json.provenance.product);
});
