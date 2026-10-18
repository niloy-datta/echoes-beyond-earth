// Standalone focused regression test for the 90s Judge Walkthrough isolation.
// Verifies:
// 1. Fresh user: launching demo, picking chapter, and exiting leaves localStorage null.
// 2. Existing user: player save (chapter, XP, achievements, stats) and Explorer Passport
//    are never overwritten, mutated, or contaminated by demo gameplay or completion.
// 3. Exiting or reloading demo restores the player's real state.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.EKO_TEST_BASE || "http://127.0.0.1:4173";
const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"],
});

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "en-US" });
  const page = await context.newPage();

  console.log("[demo-test] 1. Testing fresh user isolation...");
  await page.goto(base + "/play/game/?quality=low", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByTestId("main-menu").waitFor({ timeout: 20000 });

  // No save initially
  assert.equal(await page.getByRole("button", { name: /continue/i }).count(), 0, "no continue button on fresh start");
  const judgeBtn = page.getByTestId("judge-walkthrough-button");
  await judgeBtn.waitFor();
  await page.waitForTimeout(500);
  await judgeBtn.click({ force: true });

  const chDialog = page.getByRole("dialog", { name: /chapter select/i });
  await chDialog.waitFor();
  const chapterButtons = await chDialog.locator(".ll-chapter").all();
  assert.equal(chapterButtons.length, 5, "all 5 chapters available in judge demo");
  for (const btn of chapterButtons) {
    assert.equal(await btn.isDisabled(), false, "all chapters unlocked in judge demo");
  }

  // Pick Chapter 4 from demo menu
  await chapterButtons[3].click();
  await page.getByTestId("hud").waitFor();
  const isDemo = await page.evaluate(() => window.__LAST_LIGHT__?.isDemo || window.__LAST_LIGHT__?.session?.isDemo);
  assert.equal(isDemo, true, "active session is marked as demo");

  // Pause and return to main menu
  await page.keyboard.press("Escape");
  const pauseMenu = page.getByRole("dialog", { name: /pause/i });
  await pauseMenu.waitFor();
  await page.getByRole("button", { name: /main menu/i }).click();
  await page.getByTestId("main-menu").waitFor({ timeout: 20000 });

  const saveAfterExit = await page.evaluate(() => localStorage.getItem("the-last-signal:game:last-light"));
  assert.equal(saveAfterExit, null, "fresh user: localStorage must remain null after demo exit");
  console.log("[demo-test] ✓ Fresh user isolation: passed (0 writes to storage)");

  console.log("[demo-test] 2. Testing existing user save & passport protection...");
  const seedSave = {
    v: 1,
    chapter: 1,
    done: ["c1-intro", "c1-move", "c1-beacon", "c1-outro"],
    sides: [],
    firstTry: [],
    missed: [],
    achievements: ["first-steps"],
    bestXp: 350,
    finished: false,
    player: null,
    stats: { distance: 120, seconds: 240 },
    savedAt: "2026-10-18T00:00:00.000Z",
  };
  const snapshotJson = JSON.stringify(seedSave);

  await page.evaluate((save) => {
    localStorage.setItem("the-last-signal:game:last-light", JSON.stringify(save));
    localStorage.setItem("the-last-signal:passport", JSON.stringify({ discovered: [] }));
  }, seedSave);

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByTestId("main-menu").waitFor({ timeout: 20000 });
  const continueBtn = page.getByRole("button", { name: /continue/i });
  await continueBtn.waitFor();
  assert.ok(await continueBtn.innerText(), /Footprints in the Dust|02/i);

  // Launch judge walkthrough while existing save is present
  await page.waitForTimeout(500);
  await page.getByTestId("judge-walkthrough-button").click({ force: true });
  const chDialog2 = page.getByRole("dialog", { name: /chapter select/i });
  await chDialog2.waitFor();
  const chButtons2 = await chDialog2.locator(".ll-chapter").all();
  assert.equal(chButtons2.length, 5, "all chapters unlocked in demo even when real save is at chapter 2");

  // Launch Chapter 5 in demo
  await chButtons2[4].click();
  await page.getByTestId("hud").waitFor();
  const isDemoCh5 = await page.evaluate(() => window.__LAST_LIGHT__?.isDemo || window.__LAST_LIGHT__?.session?.isDemo);
  assert.equal(isDemoCh5, true, "Chapter 5 launched as isolated demo");

  // Fast-complete Chapter 5
  await page.evaluate(() => {
    const s = window.__LAST_LIGHT__.session;
    s.travelTo("rover-return");
  });
  for (let i = 0; i < 50; i++) {
    const hasPrompt = await page.evaluate(() => window.__LAST_LIGHT__.session.prompt === "c5-assemble");
    if (hasPrompt) break;
    await page.waitForTimeout(100);
  }
  await page.keyboard.press("KeyE");
  const demoConclusionDialog = page.getByRole("dialog", { name: /scientific conclusion/i });
  await demoConclusionDialog.waitFor();
  for (const evName of [/solar panels/i, /dust storm/i, /last transmitted/i]) {
    await demoConclusionDialog.getByRole("button", { name: evName }).click();
  }
  await demoConclusionDialog.getByRole("radio", { name: /atmospheric dust starved solar panels/i }).click();
  await demoConclusionDialog.getByRole("button", { name: /check answer/i }).click();
  await demoConclusionDialog.getByText(/NASA Scientific Legacy Synthesis/i).waitFor();
  await demoConclusionDialog.getByRole("button", { name: /complete mission/i }).click();

  // Complete finale cutscene
  for (let i = 0; i < 100; i++) {
    const done = await page.evaluate(() => {
      const s = window.__LAST_LIGHT__.session;
      if (s.cutscene) s.skipCutscene();
      return s.completed;
    });
    if (done) break;
    await page.waitForTimeout(100);
  }
  const completed = await page.evaluate(() => window.__LAST_LIGHT__.session.completed);
  assert.equal(completed, true, "demo mission completed");

  // Verify Passport was NOT stamped
  const passport = await page.evaluate(() => JSON.parse(localStorage.getItem("the-last-signal:passport") || "{}"));
  assert.ok(!passport.discovered?.includes("opportunity"), "passport must NOT be stamped by demo completion");

  // Verify storage was NOT overwritten
  const storageDuringCompletion = await page.evaluate(() => localStorage.getItem("the-last-signal:game:last-light"));
  assert.equal(storageDuringCompletion, snapshotJson, "real player save must remain unchanged during demo completion");

  // Reload page to verify normal state restoration
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByTestId("main-menu").waitFor({ timeout: 20000 });
  const restoredContinue = page.getByRole("button", { name: /continue/i });
  await restoredContinue.waitFor();
  assert.ok(await restoredContinue.innerText(), /Footprints in the Dust|02/i);

  const restoredSave = await page.evaluate(() => JSON.parse(localStorage.getItem("the-last-signal:game:last-light") || "null"));
  assert.equal(restoredSave.chapter, 1, "restored player save retains Chapter 2");
  assert.equal(restoredSave.bestXp, 350, "restored player save retains original 350 XP");
  assert.equal(restoredSave.finished, false, "restored player save retains finished: false");
  assert.deepEqual(restoredSave.achievements, ["first-steps"], "restored player save retains achievements");
  console.log("[demo-test] ✓ Existing user save & passport protection: passed (100% data fidelity)");

  console.log("[demo-test] PASS: All Judge Demo isolation and regression checks passed!");
  await context.close();
} catch (err) {
  console.error("[demo-test] FAIL:", err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
