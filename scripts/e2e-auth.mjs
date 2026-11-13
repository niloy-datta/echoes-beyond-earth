// Browser check for the Supabase sign-in page against a served build.
// Uses the real Supabase project but creates no accounts and sends no email:
// it only submits a wrong password. It never submits sign-up, because that can send email.
// Usage: EKO_BROWSER=chromium node scripts/e2e-auth.mjs   (serve out/ on :4173 first)
import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";

const base = process.env.EKO_TEST_BASE || "http://127.0.0.1:4173";
const engineName = process.env.EKO_BROWSER || "chromium";
const engine = { chromium, firefox, webkit }[engineName];
if (!engine) throw new Error("Unsupported browser: " + engineName);
const browser = await engine.launch();
let passed = 0;
const step = (m) => { passed++; console.log(`[auth-e2e] ✓ ${m}`); };

try {
  const page = await (await browser.newContext({ locale: "en-US" })).newPage();
  const requests = [];
  page.on("request", (r) => { if (r.url().includes("supabase.co")) requests.push(r.method() + " " + new URL(r.url()).pathname); });

  await page.goto(base + "/login/", { waitUntil: "networkidle", timeout: 60000 });
  await page.getByRole("heading", { name: /welcome back/i }).waitFor({ timeout: 20000 });
  assert.equal(await page.getByText(/not configured yet/i).count(), 0, "Supabase config must be compiled into the build");
  step("login page renders the form (Supabase configured in this build)");

  // Wrong password → friendly, bilingual-aware message from the real Auth API.
  await page.locator('input[type="email"]').fill("auth-e2e-nobody@example.com");
  await page.locator('input[type="password"]').fill("wrong-password-123");
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.locator('p[role="alert"]').filter({ hasText: /\S/ }).first().waitFor({ timeout: 20000 });
  assert.equal(await page.locator('p[role="alert"]').filter({ hasText: /\S/ }).first().textContent(), "Email or password is incorrect.");
  assert.ok(requests.some((r) => r.startsWith("POST") && r.includes("/auth/v1/token")), "sign-in went to Supabase");
  step("wrong password shows 'Email or password is incorrect.' (real Supabase request)");

  // Too-short password is blocked by the form itself (no request sent). Only fills the form; never submits sign-up.
  await page.getByRole("button", { name: /create an account/i }).click();
  const before = requests.length;
  await page.locator('input[type="email"]').fill("auth-e2e-short@example.com");
  await page.locator('input[type="password"]').fill("123");
  await page.locator('input[type="password"]').evaluate((el) => el.form.requestSubmit());
  await page.waitForTimeout(800);
  assert.equal(requests.length, before, "short password must not reach Supabase");
  step("short password is blocked in the browser before any request");

  console.log(`[auth-e2e] PASS ${passed} checks on ${engineName}`);
} catch (error) {
  console.error("[auth-e2e] FAIL:", error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
