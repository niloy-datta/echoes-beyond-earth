// Optional browser smoke suite for the PRE-EVENT EKO prototype.
// Executed in the isolated GitHub Actions workflow. Does not submit or deploy.
import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";

const base = process.env.EKO_TEST_BASE || "http://127.0.0.1:4173";
const engineName = process.env.EKO_BROWSER || "chromium";
const engine = { chromium, firefox, webkit }[engineName];
if (!engine) throw new Error("Unsupported browser: " + engineName);
const browser = await engine.launch({
  headless: true,
  ...(engineName === "chromium"
    ? { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"] }
    : {}),
});
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "en-US" });
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));
let completed = 0;
try {
  console.log("[e2e] Loading Opportunity /play/ ...");
  const response = await page.goto(base + "/play/", { waitUntil: "networkidle", timeout: 45_000 });
  assert.equal(response?.status(), 200, "/play/ should be served");
  await page.getByRole("heading", { name: /the last light of opportunity/i }).waitFor({ timeout: 20_000 });
  await page.locator('[data-eko-ready="true"]').waitFor({ timeout: 20000 });
  console.log("[e2e] Page & hydration OK"); completed++;

  // Cover the real keyboard path where WebGL exists; in software-limited
  // browsers the accessible story mode is expected and must be tested instead.
  await page.waitForTimeout(400);
  const start = page.getByRole("button", { name: /begin exploration/i });
  if (await start.isVisible()) {
    await start.click();
    const scene = page.getByRole("group", { name: /interactive mars scene/i });
    assert.equal(await scene.evaluate((node) => document.activeElement === node), true,
      "Begin exploration must focus the keyboard-controlled scene");
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowUp");
    for (let i = 0; i < 2; i++) await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("e");
    await page.getByRole("dialog", { name: /01 \/ the wheels/i }).waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog", { name: /01 \/ the wheels/i }).waitFor({ state: "hidden" });
    console.log("[e2e] Keyboard walking, proximity scanner and Escape OK");
  } else {
    await page.getByRole("group", { name: /accessible 2d evidence map/i }).waitFor();
    console.log("[e2e] No WebGL — accessible story fallback OK");
  }
  completed++;

  // Deterministic screen-reader route works regardless of GPU/WebGL support.
  const storyToggle = page.getByRole("button", { name: /read and solve without 3d/i });
  if (await storyToggle.isVisible()) await storyToggle.click();
  const mapStation = page.getByRole("button", { name: /open the wheels 2d hotspot/i });
  await mapStation.waitFor();
  await mapStation.click();
  await page.getByRole("dialog", { name: /01 \/ the wheels/i }).waitFor();
  await page.getByRole("dialog").getByRole("button", { name: /45\.16 km/i }).click();
  await page.getByText(/correct\. evidence recovered and saved\./i).waitFor();
  await page.getByRole("button", { name: /continue exploring/i }).click();
  await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label")?.toLowerCase().includes("open the wheels 2d hotspot"));
  await page.getByText(/recovered ✓/i).first().waitFor();
  console.log("[e2e] Quiz, progress and modal OK"); completed++;

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByText(/recovered ✓/i).first().waitFor({ timeout: 20_000 });
  console.log("[e2e] Persisted progress OK"); completed++;

  await page.evaluate(() => localStorage.setItem("the-last-signal:settings", JSON.stringify({ lang: "bn", motion: "reduce" })));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /অপরচুনিটির শেষ আলো/i }).waitFor({ timeout: 20_000 });
  console.log("[e2e] Bangla language UI OK"); completed++;

  const resource = await context.request.get(base + "/models/opportunity-mer-b.glb");
  assert.equal(resource.status(), 200, "NASA model must load at same origin");
  const bytes = await resource.body();
  assert.equal(bytes.subarray(0,4).toString("ascii"), "glTF", "GLB magic");
  assert.equal(bytes.length, 36668, "NASA original asset length");
  console.log("[e2e] NASA authentic GLB served correctly"); completed++;

  // Complete every educational clue and validate certificate, then replay.
  await page.evaluate(() => localStorage.setItem("the-last-signal:settings", JSON.stringify({ lang: "en", motion: "reduce" })));
  await page.reload({ waitUntil: "domcontentloaded" });
  for (const [name, answer] of [
    [/02 \/ the solar wings/i, /it reduced available sunlight/i],
    [/03 \/ the camera mast/i, /no — later thumbnails were taken/i],
    [/04 \/ the dark sky/i, /february 13, 2019/i],
  ]) {
    await page.getByRole("button", { name }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: answer }).click();
    await dialog.getByText(/correct\. evidence recovered/i).waitFor();
    await dialog.getByRole("button", { name: /continue exploring/i }).click();
  }
  await page.getByRole("heading", { name: /memory recovered/i }).waitFor();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /download mission certificate/i }).click();
  const certificate = await downloadPromise;
  assert.match(certificate.suggestedFilename(), /eko-opportunity-explorer\.svg/);
  console.log("[e2e] All 4 quizzes and certificate export OK"); completed++;

  // On restricted networks, the optional viewer must fail visibly, not spin forever.
  const viewerPage = await context.newPage();
  await viewerPage.route("https://ajax.googleapis.com/ajax/libs/model-viewer/**",
    (route) => route.abort("failed"));
  await viewerPage.goto(base + "/play/", { waitUntil: "domcontentloaded" });
  await viewerPage.locator('[data-eko-ready="true"]').waitFor({ timeout: 20000 });
  // Force a real network-offline state; module-script interception alone can
  // behave differently on Chromium, Firefox and WebKit.
  await context.setOffline(true);
  await viewerPage.getByRole("button", { name: /explore the authentic 3d rover/i }).click();
  // Next.js also renders an internal route announcer with role="alert".
  // Scope to the authentic-rover exhibit so strict Playwright locators target
  // the user-visible CDN/offline fallback, not framework accessibility UI.
  // The module loader itself waits up to 25s before showing an offline failure.
  // Give the test time to observe that user-facing fallback in slower engines.
  const roverExhibit = viewerPage.locator("section[aria-labelledby=\"eko-rover-viewer\"]");
  const fallback = roverExhibit.locator('[role="alert"]').filter({
    hasText: /the optional 3d viewer could not load/i,
  });
  try {
    await fallback.waitFor({ timeout: 40000 });
  } catch (error) {
    console.error("[e2e] Rover viewer diagnostic:", (await roverExhibit.innerText()).slice(0, 1600));
    throw error;
  }
  assert.equal(await viewerPage.getByRole("link", { name: /nasa\/ames research center/i }).count(), 1);
  console.log("[e2e] Offline/CDN-blocked authentic rover viewer fallback OK"); completed++;
  await viewerPage.close();
  await context.setOffline(false);

  // Teacher route is also bilingual; switch back to English for deterministic copy assertions.
  await page.evaluate(() => localStorage.setItem("the-last-signal:settings", JSON.stringify({ lang: "en", motion: "reduce" })));
  const teacher = await context.newPage();
  await teacher.goto(base + "/play/teacher/", { waitUntil: "domcontentloaded" });
  await teacher.getByRole("heading", { name: /Four clues from Opportunity/i }).waitFor({ timeout: 20_000 });
  await teacher.getByRole("heading", { name: /Student worksheet/i }).waitFor();
  console.log("[e2e] Teacher route & worksheet OK"); completed++;
  await teacher.close();

  // Smoke on narrow touch viewport.
  const phone = await browser.newContext({
    viewport:{width:390,height:844},
    hasTouch:true,
    isMobile:engineName !== "firefox",
  });
  const mobile = await phone.newPage();
  await mobile.goto(base + "/play/", {waitUntil:"domcontentloaded"});
  await mobile.getByRole("heading", { name: /the last light of opportunity/i }).waitFor({timeout:20_000});
  await mobile.locator('[data-eko-ready="true"]').waitFor({ timeout: 20000 });
  await mobile.getByRole("button", { name: /01 \/ the wheels/i }).click();
  await mobile.getByRole("dialog", { name: /01 \/ the wheels/i }).waitFor();
  console.log("[e2e] Mobile accessible evidence path OK"); completed++;
  await phone.close();

  // Verify that a repeat visit can really boot its interactive 2D route offline.
  // Chromium supplies reliable service-worker emulation in headless CI; real
  // Safari/iOS and low-end physical devices still require human QA.
  if (engineName === "chromium") {
    const offlineContext = await browser.newContext({ serviceWorkers: "allow" });
    const offlinePage = await offlineContext.newPage();
    await offlinePage.goto(base + "/play/", { waitUntil: "networkidle", timeout: 45000 });
    await offlinePage.getByRole("heading", { name: /the last light of opportunity/i }).waitFor();
    await offlinePage.waitForFunction(async () => {
      return Boolean(await caches.match(location.href));
    }, null, { timeout: 30000 });
    await offlineContext.setOffline(true);
    await offlinePage.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
    await offlinePage.getByRole("heading", { name: /the last light of opportunity/i }).waitFor();
    await offlinePage.locator('[data-eko-ready="true"]').waitFor({ timeout: 20000 });
    await offlinePage.getByRole("button", { name: /read and solve without 3d/i }).click();
    await offlinePage.getByRole("button", { name: /open the wheels 2d hotspot/i }).click();
    await offlinePage.getByRole("dialog", { name: /the wheels/i }).waitFor();
    console.log("[e2e] Offline repeat visit, hydrated 2D map and evidence OK"); completed++;
    await offlineContext.close();
  }

  assert.deepEqual(errors, [], "No uncaught JS exceptions expected");
  console.log("[e2e] PASS: " + completed + " browser smoke checks on " + engineName);
} finally {
  await browser.close();
}
