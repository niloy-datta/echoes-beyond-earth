// Browser test for the Quiz Portal (/play/quiz/) against a served static build.
// Usage: EKO_BROWSER=chromium node scripts/e2e-quiz.mjs   (serve out/ on :4173 first)
import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { BANK } from "../src/game/content/learningBank.ts";

const base = process.env.EKO_TEST_BASE || "http://127.0.0.1:4173";
const engineName = process.env.EKO_BROWSER || "chromium";
const engine = { chromium, firefox, webkit }[engineName];
const browser = await engine.launch();
let passed = 0;
const step = (m) => { passed++; console.log(`[quiz-e2e] ✓ ${m}`); };
const pre = BANK.filter((i) => i.use === "pre");
const post = BANK.filter((i) => i.use === "post");

async function answerAll(page, items, { wrongFirst = new Set() } = {}) {
  for (const item of items) {
    const runner = page.getByTestId("quiz-runner");
    await runner.waitFor();
    // Match on the English prompt or its simpler wording.
    const heading = (await page.locator("#quiz-q").textContent()).trim();
    const it = items.find((x) => x.prompt.en === heading || x.simple?.en === heading);
    assert.ok(it, `unexpected question: ${heading}`);
    const radios = page.getByRole("radio");
    if (wrongFirst.has(it.id)) {
      await radios.nth((it.correct + 1) % it.options.length).click();
      await page.getByTestId("quiz-submit").click();
      await page.getByTestId("quiz-wrong").waitFor();
    }
    await radios.nth(it.correct).click();
    await page.getByTestId("quiz-submit").click();
    await page.getByTestId("quiz-right").waitFor();
    await page.getByTestId("quiz-next").click();
  }
}

try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "en-US" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/play/quiz/", { waitUntil: "networkidle", timeout: 60000 });
  await page.getByTestId("quiz-portal").waitFor({ timeout: 20000 });
  assert.ok(await page.getByTestId("start-post").isDisabled(), "post-assessment locked before pre");
  step("portal loads; post-assessment is locked until the pre-assessment is done");

  await page.locator('[data-age="beginner"]').click();
  await page.getByTestId("opacity-chart").locator("svg").waitFor({ timeout: 20000 });
  assert.match(await page.getByTestId("opacity-chart").textContent(), /1TAU880_5106_20181207A/);
  step("age group chosen; real NASA PDS opacity chart renders with its product ID");

  // Pre-assessment: 6 right first time, 4 wrong first (then corrected).
  await page.getByTestId("start-pre").click();
  const beginnerHeading = (await page.locator("#quiz-q").textContent()).trim();
  assert.equal(beginnerHeading, pre[0].simple.en, "beginner sees the simpler wording");
  await answerAll(page, pre, { wrongFirst: new Set(pre.slice(6).map((i) => i.id)) });
  await page.getByTestId("quiz-portal").waitFor();
  assert.equal(await page.getByTestId("pre-score").textContent(), "60%");
  assert.equal(await page.getByTestId("delta").textContent(), "—", "no change shown before the post-assessment");
  step("pre-assessment: wrong answers show misconception + hint + evidence; score is first-try only (60%)");

  await page.getByTestId("start-post").click();
  await answerAll(page, post);
  await page.getByTestId("quiz-portal").waitFor();
  assert.equal(await page.getByTestId("post-score").textContent(), "100%");
  assert.equal(await page.getByTestId("delta").textContent(), "+40 pts");
  step("post-assessment: 100%, change reported as +40 percentage points");

  await page.reload({ waitUntil: "networkidle" });
  await page.getByTestId("quiz-portal").waitFor();
  assert.equal(await page.getByTestId("delta").textContent(), "+40 pts");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByTestId("download-report").click()]);
  assert.equal(dl.suggestedFilename(), "learning-report.html");
  step("results survive a reload; learning report downloads");

  // Bangla via the site's language setting.
  await page.evaluate(() => { const k = "the-last-signal:settings"; const s = JSON.parse(localStorage.getItem(k) || "{}"); localStorage.setItem(k, JSON.stringify({ ...s, lang: "bn" })); });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("বয়স-গোষ্ঠী (ঐচ্ছিক)").waitFor({ timeout: 15000 });
  step("Bangla interface renders");
  assert.deepEqual(errors, [], "no page errors");
  await ctx.close();

  // Mobile: no horizontal overflow on the portal.
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: engineName !== "firefox", hasTouch: true });
  const mp = await m.newPage();
  await mp.goto(base + "/play/quiz/", { waitUntil: "networkidle" });
  await mp.getByTestId("quiz-portal").waitFor();
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `horizontal overflow ${overflow}px`);
  await mp.getByTestId("start-pre").tap();
  await mp.getByTestId("quiz-runner").waitFor();
  step("mobile 390px: no horizontal overflow; quiz opens by touch");
  await m.close();

  console.log(`[quiz-e2e] PASS ${passed} checks on ${engineName}`);
} catch (error) {
  console.error("[quiz-e2e] FAIL:", error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
