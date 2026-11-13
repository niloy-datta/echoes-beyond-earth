import test from "node:test";
import assert from "node:assert/strict";
import {
  ECHO_CHAINS, ECHO_CHAIN_BY_ID, LAYERS, CLASSIFICATION_LABEL, revealedLayers, chainComplete, claimsFor, gradeClaims,
} from "../src/game/content/echoChain.ts";
import { EVIDENCE_BY_ID } from "../src/game/content/evidence.ts";
import {
  newProgress, sanitizeProgress, activeObjectives, completeObjective, attemptPuzzle, evidenceOf, passChainCheck, previewProgress, SAVE_VERSION,
} from "../src/game/core/progress.ts";
import { GameSession } from "../src/game/core/session.ts";
import { sanitizeGameSettings, sanitizeDisplayName, bandOf } from "../src/game/settings.ts";
import { shouldHint, wrongAnswerHint, HINT_IDLE_FIRST_BY_BAND, SIMPLE_EXPLANATIONS } from "../src/game/core/guidance.ts";
import { PUZZLES } from "../src/game/content/puzzles.ts";
import { learningSummaryHtml, escapeHtml } from "../src/game/core/learningSummary.ts";

const bilingual = (l) => typeof l?.en === "string" && l.en.trim() && typeof l?.bn === "string" && l.bn.trim();
const isNasaHttps = (url) => { const u = new URL(url); return u.protocol === "https:" && (u.hostname === "nasa.gov" || u.hostname.endsWith(".nasa.gov")); };

function playAll(p) {
  for (let i = 0; i < 300; i++) {
    const a = activeObjectives(p);
    if (!a.length) break;
    for (const o of a) p = (o.kind === "puzzle" ? attemptPuzzle(p, o.id, true) : completeObjective(p, o.id)).progress;
  }
  return p;
}

test("echo chain: two missions, four ordered layers, bilingual, NASA-sourced and classified", () => {
  assert.deepEqual(ECHO_CHAINS.map((c) => c.world), ["mars", "moon"]);
  for (const c of ECHO_CHAINS) {
    assert.deepEqual(c.links.map((l) => l.layer), LAYERS);
    assert.ok(bilingual(c.mission));
    for (const l of c.links) {
      for (const k of ["title", "know", "simple", "how", "uncertain"]) assert.ok(bilingual(l[k]), `${c.id}/${l.layer}.${k}`);
      assert.ok(l.requires.length > 0 && l.requires.every((id) => EVIDENCE_BY_ID.has(id)), `${c.id}/${l.layer} requires`);
      assert.ok(l.sources.length > 0);
      for (const s of l.sources) { assert.ok(isNasaHttps(s.url), s.url); assert.ok(CLASSIFICATION_LABEL[s.classification]); }
    }
    for (const band of ["junior", "young", "research"]) {
      const shown = claimsFor(c, band);
      assert.ok(shown.length >= 2, `${c.id} ${band}`);
      assert.ok(shown.some((x) => x.verdict === "unsupported") && shown.some((x) => x.verdict === "verified"), "each band must separate fact from myth");
      for (const x of shown) assert.ok(bilingual(x.text) && bilingual(x.why));
    }
    // Older bands see more, never fewer, claims.
    assert.ok(claimsFor(c, "junior").length <= claimsFor(c, "young").length && claimsFor(c, "young").length <= claimsFor(c, "research").length);
  }
  // No fabricated "last words": the only quoted rover sentence is classified as unsupported.
  const words = ECHO_CHAIN_BY_ID.get("opportunity").claims.find((c) => c.id === "o-words");
  assert.equal(words.verdict, "unsupported");
});

test("echo chain: layers light up from recovered evidence; the full campaign lights both chains", () => {
  for (const c of ECHO_CHAINS) assert.deepEqual(revealedLayers(c, []), []);
  const full = playAll(newProgress());
  const ev = evidenceOf(full);
  for (const c of ECHO_CHAINS) assert.ok(chainComplete(c, ev), `${c.id} complete after the campaign`);
});

test("claim check: grading is exact per band; passing requires a complete chain and is idempotent", () => {
  const chain = ECHO_CHAIN_BY_ID.get("surveyor-3");
  const right = Object.fromEntries(claimsFor(chain, "research").map((c) => [c.id, c.verdict]));
  assert.ok(gradeClaims(chain, "research", right).correct);
  const oneWrong = { ...right, "s-all": "verified" };
  assert.deepEqual(gradeClaims(chain, "research", oneWrong).wrong, ["s-all"]);
  // Junior only sees the claims for its band, so its answer sheet is smaller.
  const junior = Object.fromEntries(claimsFor(chain, "junior").map((c) => [c.id, c.verdict]));
  assert.ok(gradeClaims(chain, "junior", junior).correct);
  assert.equal(gradeClaims(chain, "junior", {}).correct, false);

  assert.equal(passChainCheck(newProgress(), "surveyor-3").chains.length, 0, "locked chain cannot be passed");
  const full = playAll(newProgress());
  const passed = passChainCheck(full, "surveyor-3");
  assert.deepEqual(passed.chains, ["surveyor-3"]);
  assert.equal(passChainCheck(passed, "surveyor-3"), passed);
  assert.equal(passChainCheck(full, "nope"), full);
});

test("claim check: survives save/reload; forged or legacy saves cannot claim locked chains", () => {
  const full = passChainCheck(passChainCheck(playAll(newProgress()), "opportunity"), "surveyor-3");
  const back = sanitizeProgress(JSON.parse(JSON.stringify(full)));
  assert.deepEqual(back.chains.sort(), ["opportunity", "surveyor-3"]);
  const forged = sanitizeProgress({ v: SAVE_VERSION, chapter: 0, done: [], chains: ["opportunity", "surveyor-3", "x"] });
  assert.deepEqual(forged.chains, []);
  const legacy = { ...JSON.parse(JSON.stringify(full)) };
  delete legacy.chains;
  assert.deepEqual(sanitizeProgress(legacy).chains, [], "older saves without the field load cleanly");
  // Session API: preview passes stay in memory only.
  let writes = 0;
  const s = new GameSession(playAll(previewProgress(0)), () => { writes++; });
  assert.ok(s.passChainCheck("opportunity"));
  assert.equal(writes, 0);
});

test("learner profile: optional, sanitized, and never required", () => {
  const d = sanitizeGameSettings({});
  assert.equal(d.learnerBand, null); assert.equal(d.displayName, ""); assert.equal(d.onboarded, false);
  assert.equal(bandOf(d), "young", "no answer behaves like the default band");
  assert.equal(sanitizeGameSettings({ learnerBand: "junior" }).learnerBand, "junior");
  assert.equal(sanitizeGameSettings({ learnerBand: "admin" }).learnerBand, null);
  assert.equal(sanitizeDisplayName('<img src=x onerror="alert(1)">Rumi'), "img srcx onerroralert1Rumi");
  assert.equal(sanitizeDisplayName("নিলয় দত্ত"), "নিলয় দত্ত");
  assert.equal(sanitizeDisplayName("a".repeat(80)).length, 32);
  assert.equal(sanitizeDisplayName(42), "");
});

test("adaptive support: band changes pacing and wording deterministically, never the answer", () => {
  const base = { distance: 50, reach: 3, busy: false, given: 0 };
  assert.ok(shouldHint({ ...base, idle: HINT_IDLE_FIRST_BY_BAND.junior, band: "junior" }));
  assert.ok(!shouldHint({ ...base, idle: HINT_IDLE_FIRST_BY_BAND.junior, band: "research" }));
  assert.ok(HINT_IDLE_FIRST_BY_BAND.junior < HINT_IDLE_FIRST_BY_BAND.young && HINT_IDLE_FIRST_BY_BAND.young < HINT_IDLE_FIRST_BY_BAND.research);
  for (const p of PUZZLES) {
    assert.ok(bilingual(SIMPLE_EXPLANATIONS[p.id]), `simple explanation for ${p.id}`);
    // Junior: simplified after one struggle; others after two.
    assert.deepEqual(wrongAnswerHint(p.id, 1, "junior").text, SIMPLE_EXPLANATIONS[p.id]);
    assert.notDeepEqual(wrongAnswerHint(p.id, 1, "young").text, SIMPLE_EXPLANATIONS[p.id]);
    assert.deepEqual(wrongAnswerHint(p.id, 2, "young").text, SIMPLE_EXPLANATIONS[p.id]);
  }
});

test("learning summary: printable, local-only, escapes every value", () => {
  assert.equal(escapeHtml(`<a href="x">'&`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;");
  const full = passChainCheck(playAll(newProgress()), "surveyor-3");
  const html = learningSummaryHtml(full, { lang: "en", name: "<script>alert(1)</script>", band: "junior", date: "2026-11-12" });
  assert.ok(!html.includes("<script>alert"), "name is escaped");
  assert.ok(html.includes("&lt;script&gt;"));
  for (const s of ["Lessons", "Echo Chain", "Discussion questions", "NASA sources", "Junior Explorer", "2026-11-12", "not an official NASA document"]) assert.ok(html.includes(s), s);
  assert.match(html, /Surveyor 3[^<]*<\/strong>:[^<]*Legacy\. Claim Check passed: yes/);
  const bn = learningSummaryHtml(newProgress(), { lang: "bn" });
  assert.ok(bn.includes("অতিথি এক্সপ্লোরার") && bn.includes('lang="bn"'));
});
