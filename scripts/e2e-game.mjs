// Browser tests for THE LAST LIGHT game route (/play/game/).
// Covers: main menu, starting a game, real keyboard movement, interaction,
// objective completion, puzzles, saving/resuming, chapter completion, mobile
// touch controls, the 2D fallback, and museum navigation.
// Set GAME_SHOTS=<dir> to also write screenshots for visual review.
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, firefox, webkit } from "playwright";

const base = process.env.EKO_TEST_BASE || "http://127.0.0.1:4173";
const engineName = process.env.EKO_BROWSER || "chromium";
const shots = process.env.GAME_SHOTS || "";
if (shots) mkdirSync(shots, { recursive: true });
const engine = { chromium, firefox, webkit }[engineName];
if (!engine) throw new Error("Unsupported browser: " + engineName);
const browser = await engine.launch({
  headless: true,
  ...(engineName === "chromium" ? { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"] } : {}),
});

const errors = [];
const shot = async (page, name) => { if (shots) await page.screenshot({ path: join(shots, `${engineName}-${name}.png`) }); };
const state = (page) => page.evaluate(() => {
  const s = window.__LAST_LIGHT__?.session;
  if (!s) return null;
  return {
    chapter: s.progress.chapter, done: [...s.progress.done], active: s.active.map((o) => o.id),
    player: { x: s.player.x, z: s.player.z }, cutscene: s.cutscene?.id ?? null, puzzle: s.puzzle, card: !!s.evidenceCard,
    prompt: s.prompt?.id ?? null, completed: s.completed, finished: s.progress.finished, engine: window.__LAST_LIGHT__.engine?.() ?? null,
  };
});
const waitFor = async (page, predicate, label, timeout = 20000) => {
  const start = Date.now();
  for (;;) {
    const s = await state(page);
    if (s && predicate(s)) return s;
    if (Date.now() - start > timeout) throw new Error(`Timed out waiting for ${label}: ${JSON.stringify(s)}`);
    await page.waitForTimeout(100);
  }
};
const savedProgress = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("the-last-signal:game:last-light") || "null"));

/**
 * Steer the camera toward a world point and hold W (+Shift) until `done`.
 * Like a player, it sidesteps when a boulder blocks the straight line.
 */
async function walkTo(page, target, done, label, timeout = 150000) {
  const is2d = (await page.locator('[data-mode="2d"]').count()) > 0;
  if (is2d) return walk2d(page, target, done, label, timeout);
  await page.keyboard.down("ShiftLeft");
  await page.keyboard.down("KeyW");
  const start = Date.now();
  let best = Infinity, lastProgress = Date.now(), side = "KeyD";
  try {
    for (;;) {
      const d = await page.evaluate(([tx, tz]) => {
        const ses = window.__LAST_LIGHT__.session;
        const dx = tx - ses.player.x, dz = tz - ses.player.z;
        ses.rig = { ...ses.rig, yaw: Math.atan2(-dx, -dz), idle: 0 }; // aim the camera so "forward" faces the goal
        return Math.hypot(dx, dz);
      }, [target.x, target.z]);
      const st = await state(page);
      if (done(st, d)) return st;
      if (d < best - 0.3) { best = d; lastProgress = Date.now(); }
      else if (Date.now() - lastProgress > 2500) {
        await page.keyboard.down(side);
        await page.waitForTimeout(1500);
        await page.keyboard.up(side);
        side = side === "KeyD" ? "KeyA" : "KeyD";
        lastProgress = Date.now();
      }
      if (Date.now() - start > timeout) throw new Error(`walk to ${label} timed out (${d.toFixed(1)} m left)`);
      await page.waitForTimeout(80);
    }
  } finally {
    await page.keyboard.up("KeyW");
    await page.keyboard.up("ShiftLeft");
  }
}

/** 2D console is north-up: W = -z, S = +z, A = -x, D = +x. */
async function walk2d(page, target, done, label, timeout) {
  const held = new Set();
  const hold = async (key, on) => { if (on && !held.has(key)) { await page.keyboard.down(key); held.add(key); } if (!on && held.has(key)) { await page.keyboard.up(key); held.delete(key); } };
  const start = Date.now();
  await page.keyboard.down("ShiftLeft");
  try {
    for (;;) {
      const st = await state(page);
      const dx = target.x - st.player.x, dz = target.z - st.player.z;
      if (done(st, Math.hypot(dx, dz))) return st;
      await hold("KeyD", dx > 0.4); await hold("KeyA", dx < -0.4);
      await hold("KeyS", dz > 0.4); await hold("KeyW", dz < -0.4);
      if (Date.now() - start > timeout) throw new Error(`2D walk to ${label} timed out`);
      await page.waitForTimeout(80);
    }
  } finally {
    for (const k of held) await page.keyboard.up(k);
    await page.keyboard.up("ShiftLeft");
  }
}

let passed = 0;
const step = (msg) => { passed++; console.log(`[game-e2e] ✓ ${msg}`); };

let activePage = null;
try {
  // ── Desktop 3D ────────────────────────────────────────────────────────
  // GAME_E2E_SKIP_DESKTOP=1 runs only the 2D / mobile / museum sections (fast iteration).
  if (process.env.GAME_E2E_SKIP_DESKTOP !== "1") {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "en-US" });
  const page = await context.newPage();
  activePage = page;
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|favicon|GPU stall|WebGL/i.test(m.text())) errors.push(m.text()); });

  const res = await page.goto(base + "/play/game/?quality=low", { waitUntil: "domcontentloaded", timeout: 45000 });
  assert.equal(res?.status(), 200);
  await page.getByTestId("main-menu").waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: /new game/i }).waitFor();
  const has3d = await page.getByTestId("game-canvas").count();
  await page.waitForTimeout(2500);
  await shot(page, "01-menu");
  step(`main menu renders (${has3d ? "3D canvas" : "no WebGL → 2D"})`);

  await page.getByRole("button", { name: /new game/i }).click();
  await page.getByTestId("hud").waitFor();
  let s = await waitFor(page, (x) => x.cutscene === "intro", "intro cinematic");
  await page.waitForTimeout(2500);
  await shot(page, "02-intro-cinematic");
  await page.getByTestId("skip-cutscene").click();
  s = await waitFor(page, (x) => x.active.includes("c1-move"), "movement tutorial");
  step("new game starts; intro cinematic plays and is skippable");

  // Real keyboard movement: hold W toward the ridge marker.
  const before = s.player;
  await page.locator(".ll-stage").focus();
  // Software-rendered CI browsers can run at a few FPS, so wait on distance, not time.
  await page.keyboard.down("KeyW");
  s = await waitFor(page, (x) => Math.hypot(x.player.x - before.x, x.player.z - before.z) > 1.5, "W key moves the explorer", 30000);
  await page.keyboard.up("KeyW");
  await shot(page, "03-gameplay");
  step("WASD moves the explorer");

  s = await walkTo(page, { x: 5, z: 52 }, (st) => st.active.includes("c1-beacon"), "ridge");
  step("reach objective completes (tutorial ridge)");

  s = await walkTo(page, { x: -11, z: 36 }, (st) => st.prompt === "c1-beacon", "memory beacon");
  await shot(page, "04-beacon-prompt");
  await page.keyboard.press("KeyE");
  await page.getByRole("dialog", { name: /final traverse map/i }).waitFor();
  await shot(page, "05-evidence-card");
  await page.getByRole("dialog").getByRole("button", { name: /keep exploring/i }).click();
  step("E scans the beacon; NASA evidence card opens with the source");

  // Inventory / map / journal / pause keyboard panels.
  await page.locator(".ll-stage").focus();
  await page.keyboard.press("Tab");
  await page.getByRole("dialog", { name: /evidence/i }).waitFor();
  await shot(page, "06-inventory");
  await page.keyboard.press("Escape");
  await page.keyboard.press("KeyM");
  await page.getByRole("dialog", { name: /mission map/i }).waitFor();
  await page.keyboard.press("Escape");
  await page.keyboard.press("KeyJ");
  await page.getByRole("dialog", { name: /mission journal/i }).waitFor();
  await shot(page, "07-journal");
  await page.keyboard.press("Escape");
  await page.getByTestId("pause-button").click();
  await page.getByRole("dialog", { name: /paused/i }).waitFor();
  await page.getByRole("button", { name: /resume/i }).click();
  step("Tab / M / J / pause panels open and close");

  // Outro cinematic → chapter 2 begins.
  s = await waitFor(page, (x) => x.cutscene === "ch1-outro" || x.chapter === 1, "chapter 1 outro");
  if (s.cutscene) await page.keyboard.press("Enter");
  s = await waitFor(page, (x) => x.chapter === 1, "chapter 2");
  const saved = await savedProgress(page);
  assert.ok(saved && saved.chapter === 1 && saved.done.includes("c1-beacon"), "chapter 1 completion autosaved");
  step("chapter 1 completes and autosaves");

  // Chapter 2 on foot: rover, three components, puzzle.
  s = await walkTo(page, { x: 18, z: 7 }, (st) => !st.active.includes("c2-reach"), "rover site", 45000);
  s = await waitFor(page, (x) => x.cutscene === "ch2-intro", "rover cinematic");
  await page.waitForTimeout(2000);
  await shot(page, "08-rover-cinematic");
  await page.keyboard.press("Enter");
  s = await waitFor(page, (x) => x.active.length === 3, "component scans");
  // Deliberately out of order: mast, wheels, solar.
  for (const [id, poi] of [["c2-mast", "comp-mast"], ["c2-wheels", "comp-wheels"], ["c2-solar", "comp-solar"]]) {
    await page.evaluate((target) => window.__LAST_LIGHT__.session.travelTo(target), poi);
    s = await waitFor(page, (x) => x.prompt === id, `prompt ${id}`);
    await page.keyboard.press("KeyE");
    await page.getByRole("dialog").getByRole("button", { name: /keep exploring/i }).click();
  }
  const roverSource = (await state(page)).engine?.rover;
  await shot(page, "09-rover-components");
  step(`three component scans in any order (rover model: ${roverSource ?? "2D"})`);

  await page.evaluate(() => window.__LAST_LIGHT__.session.travelTo("rover-terminal"));
  await waitFor(page, (x) => x.prompt === "c2-puzzle", "terminal prompt");
  await page.keyboard.press("KeyE");
  const dialog = page.getByRole("dialog", { name: /component identification/i });
  await dialog.waitFor();
  // Wrong first, then right.
  for (const group of await dialog.getByRole("radiogroup").all()) await group.getByRole("radio").first().click();
  await dialog.getByRole("button", { name: /check answer/i }).click();
  await dialog.getByText(/not quite/i).waitFor();
  const answers = { "Turned sunlight": /solar panels/i, "Carried the rover": /^wheels$/i, "Captured the 354": /pancam mast/i };
  for (const [clue, part] of Object.entries(answers)) {
    await dialog.getByRole("radiogroup", { name: new RegExp(clue) }).getByRole("radio", { name: part }).click();
  }
  await shot(page, "10-puzzle");
  await dialog.getByRole("button", { name: /check answer/i }).click();
  s = await waitFor(page, (x) => x.done.includes("c2-puzzle"), "puzzle solved");
  step("component puzzle rejects wrong answers and accepts the right ones");

  // Save & resume: reload the page and continue.
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /continue/i }).waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: /continue/i }).click();
  s = await waitFor(page, (x) => x.done.includes("c2-puzzle"), "resumed progress");
  step("progress survives a reload and Continue resumes it");

  // Finish the campaign via the session (the remaining paths are covered above and in unit tests).
  await page.evaluate(async () => {
    const ses = window.__LAST_LIGHT__.session;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 300 && !ses.completed; i++) {
      if (ses.chapterCard) { await sleep(200); continue; }
      if (ses.cutscene) { ses.skipCutscene(); await sleep(50); continue; }
      if (ses.evidenceCard) { ses.closeEvidence(); continue; }
      if (ses.puzzle) { ses.answerPuzzle(true); continue; }
      const o = ses.active[0];
      if (!o) { await sleep(100); continue; }
      if (o.kind === "cutscene") { await sleep(150); continue; }
      ses.travelTo(o.target);
      await sleep(30);
      if (o.kind !== "reach") ses.interact();
    }
  });
  await waitFor(page, (x) => x.completed, "campaign completion", 60000);
  await page.getByRole("dialog", { name: /mission complete/i }).waitFor();
  await shot(page, "11-complete");
  const passport = await page.evaluate(() => JSON.parse(localStorage.getItem("the-last-signal:passport") || "{}"));
  assert.ok(passport.discovered?.includes("opportunity"), "completion stamps the Explorer Passport");
  step("all five chapters complete; completion screen and passport stamp");

  // Museum navigation still works from the game.
  await page.getByRole("link", { name: /open explorer passport/i }).click();
  await page.waitForURL(/\/passport\/?$/);
  await page.getByText(/last light/i).first().waitFor({ timeout: 15000 });
  step("navigates back into the museum (Explorer Passport shows the game)");
  await context.close();
  }

  // ── 2D fallback ───────────────────────────────────────────────────────
  const c2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p2 = await c2.newPage();
  p2.on("pageerror", (e) => errors.push(e.message));
  await p2.goto(base + "/play/game/?force2d&quality=low", { waitUntil: "domcontentloaded" });
  await p2.getByText(/2D mission console/i).first().waitFor();
  await p2.getByRole("button", { name: /new game/i }).click();
  await p2.getByTestId("console-2d").waitFor();
  await p2.getByTestId("skip-cutscene").click();
  await waitFor(p2, (x) => x.active.includes("c1-move"), "2D tutorial");
  await p2.locator('[data-travel="ridge"]').click();
  await waitFor(p2, (x) => x.active.includes("c1-beacon"), "2D travel completes objective");
  await p2.locator('[data-travel="beacon-alpha"]').click();
  await p2.getByTestId("interact-prompt").click();
  await p2.getByRole("dialog", { name: /final traverse map/i }).waitFor();
  await shot(p2, "12-console-2d");
  step("2D console plays the same campaign without WebGL");
  await c2.close();

  // ── Mobile touch ──────────────────────────────────────────────────────
  const c3 = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: engineName !== "firefox", deviceScaleFactor: 2 });
  const p3 = await c3.newPage();
  p3.on("pageerror", (e) => errors.push(e.message));
  await p3.goto(base + "/play/game/?touch&quality=low", { waitUntil: "domcontentloaded" });
  await p3.getByRole("button", { name: /new game/i }).tap();
  await p3.getByTestId("skip-cutscene").tap();
  await waitFor(p3, (x) => x.active.includes("c1-move"), "mobile tutorial");
  await p3.getByTestId("touch-controls").waitFor();
  const start = (await state(p3)).player;
  const stick = await p3.locator(".ll-stick").boundingBox();
  const cx = stick.x + stick.width / 2, cy = stick.y + stick.height / 2;
  // Drive the joystick with pointer events (touch).
  await p3.locator(".ll-stick").dispatchEvent("pointerdown", { pointerId: 7, pointerType: "touch", clientX: cx, clientY: cy, isPrimary: true });
  await p3.locator(".ll-stick").dispatchEvent("pointermove", { pointerId: 7, pointerType: "touch", clientX: cx, clientY: cy - 60, isPrimary: true });
  await waitFor(p3, (x) => Math.hypot(x.player.x - start.x, x.player.z - start.z) > 1, "joystick movement", 30000);
  await p3.locator(".ll-stick").dispatchEvent("pointerup", { pointerId: 7, pointerType: "touch", clientX: cx, clientY: cy - 60, isPrimary: true });

  await shot(p3, "13-mobile");
  await p3.getByRole("button", { name: /^sprint$/i }).tap();
  assert.equal(await p3.getByRole("button", { name: /^sprint$/i }).getAttribute("aria-pressed"), "true");
  step("mobile joystick and sprint toggle work");
  await c3.close();

  // ── Existing museum routes still render ──────────────────────────────
  const c4 = await browser.newContext();
  const p4 = await c4.newPage();
  for (const route of ["/", "/play/", "/lens/", "/passport/", "/archive/"]) {
    const r = await p4.goto(base + route, { waitUntil: "domcontentloaded" });
    assert.equal(r?.status(), 200, route);
  }
  await p4.goto(base + "/play/", { waitUntil: "domcontentloaded" });
  await p4.getByRole("link", { name: /the last light/i }).first().waitFor();
  step("museum routes still served; /play/ links to the game");
  await c4.close();

  const real = errors.filter((e) => !/ResizeObserver loop|WebGL|THREE\.WebGLRenderer/i.test(e));
  assert.deepEqual(real, [], "no page errors");
  console.log(`[game-e2e] PASS ${passed} checks on ${engineName}`);
} catch (error) {
  console.error("[game-e2e] FAIL:", error);
  if (activePage && shots) await activePage.screenshot({ path: join(shots, `${engineName}-FAILURE.png`) }).catch(() => {});
  if (errors.length) console.error("[game-e2e] page errors:", errors);
  process.exitCode = 1;
} finally {
  await browser.close();
}
