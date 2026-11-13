// Visual QA for the /play/game/ 3D scene: enters real gameplay and captures
// fixed viewpoints (hero, wide, rover, terrain, storm, mobile) so renderer
// changes can be compared screenshot-to-screenshot.
//   node scripts/capture-visuals.mjs <outDir> [baseUrl] [quality]
// Uses the host GPU through ANGLE when available (VISUAL_GL=swiftshader forces software).
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const out = process.argv[2] || "visual-qa";
const base = process.argv[3] || "http://localhost:3123";
const quality = process.argv[4] || "high";
mkdirSync(out, { recursive: true });
const gl = process.env.VISUAL_GL === "swiftshader"
  ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
  : ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"];
const browser = await chromium.launch({ headless: true, args: ["--enable-webgl", ...gl] });
const report = {};

async function enterGame(page, q) {
  await page.goto(`${base}/play/game/?qa&quality=${q}`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.getByTestId("main-menu").waitFor({ timeout: 60000 });
  await page.getByRole("button", { name: /new game/i }).click();
  await page.getByTestId("onboarding-skip").click();
  await page.getByTestId("skip-cutscene").click({ timeout: 30000 });
  await page.waitForFunction(() => window.__LAST_LIGHT__?.session?.active.some((o) => o.id === "c1-move"), null, { timeout: 30000 });
  // Let the chapter card fade and textures/models stream in.
  await page.waitForFunction(() => window.__LAST_LIGHT__?.engine()?.rover !== "loading", null, { timeout: 60000 });
  await page.waitForTimeout(6000);
  await page.addStyleTag({ content: "[data-testid=hud], .ll-hud, .ll-chapter-card, .ll-subtitle { visibility: hidden !important; }" });
}

const ground = (page, x, z) => page.evaluate(([x, z]) => window.__LAST_LIGHT__.ground(x, z), [x, z]);

async function view(page, name, cam, settle = 1500) {
  await page.evaluate((c) => window.__LAST_LIGHT__.camera(c ? c.p : null, c ? c.t : undefined), cam);
  await page.waitForTimeout(settle);
  await page.screenshot({ path: join(out, `${name}.png`) });
  report[name] = await page.evaluate(() => window.__LAST_LIGHT__.engine());
  console.log(name, JSON.stringify(report[name]));
}

try {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, locale: "en-US" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.error("pageerror", e.message));
  await enterGame(page, quality);
  report.renderer = await page.evaluate(() => {
    const c = document.createElement("canvas").getContext("webgl2");
    const ext = c?.getExtension("WEBGL_debug_renderer_info");
    return ext ? c.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unknown";
  });
  console.log("renderer", report.renderer);
  await view(page, "01-hero-default", null, 2500);

  const gR = await ground(page, 18, 0);
  const g1 = await ground(page, -2, 40);
  await view(page, "02-wide", { p: [-6, g1 + 5.5, 42], t: [22, gR + 1, -6] });
  await view(page, "03-rover-closeup", { p: [21.2, gR + 1.3, 3.4], t: [18, gR + 0.6, 0] });
  const gT = await ground(page, 3, 30);
  await view(page, "04-terrain-closeup", { p: [3, gT + 1.4, 30], t: [4.5, gT, 25.5] });
  await view(page, "05-horizon", { p: [0, (await ground(page, 0, 0)) + 2.2, 0], t: [-60, 6, -80] });

  // Astronaut beside the rover through the normal gameplay camera.
  await page.evaluate(() => { const s = window.__LAST_LIGHT__.session; s.travelTo("rover-site"); const yaw = Math.atan2(s.player.x - 18, s.player.z - 0) + 0.5; s.rig = { ...s.rig, yaw, pitch: 0.16, distance: 6.5, idle: 0 }; });
  await view(page, "06-astronaut-rover", null, 2500);

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("ll-storm-preview", { detail: 0.85 })));
  await view(page, "07-dust-storm", { p: [-6, g1 + 5.5, 42], t: [22, gR + 1, -6] }, 2500);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("ll-storm-preview", { detail: null })));
  // Sample frame rate on the default gameplay camera.
  await page.evaluate(() => window.__LAST_LIGHT__.camera(null));
  await page.waitForTimeout(6000);
  report.fpsDesktop = await page.evaluate(() => window.__LAST_LIGHT__.engine());
  console.log("fps", JSON.stringify(report.fpsDesktop));
  await ctx.close();

  const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "en-US" });
  const mp = await mob.newPage();
  await enterGame(mp, "low");
  await mp.screenshot({ path: join(out, "08-mobile.png") });
  report.mobile = await mp.evaluate(() => window.__LAST_LIGHT__.engine());
  console.log("mobile", JSON.stringify(report.mobile));
  await mob.close();
} finally {
  writeFileSync(join(out, "report.json"), JSON.stringify(report, null, 2));
  await browser.close();
}
