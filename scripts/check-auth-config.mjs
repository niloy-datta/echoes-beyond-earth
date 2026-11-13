// Diagnose the Supabase sign-in setup for a deployment.
// Usage: npm run auth:check   (reads NEXT_PUBLIC_SUPABASE_* from the environment or .env.local)
// It only makes read-only requests to the public Auth endpoints. It never creates
// accounts or sends email, and it never prints the key.
import { existsSync, readFileSync } from "node:fs";

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const problems = [];
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => { problems.push(m); console.log(`  ✗ ${m}`); };

console.log("Supabase sign-in check");
if (!url) bad("NEXT_PUBLIC_SUPABASE_URL is not set (the login page will say 'not configured').");
if (!key) bad("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set.");
if (key && /service_role|secret/i.test(key)) bad("The key looks like a secret/service-role key. Use the publishable key only.");

if (url && key) {
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url.trim())) bad(`Unexpected project URL shape: ${url.split("/")[2] ?? url}`);
  else ok(`Project URL: ${new URL(url).host}`);
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/auth/v1/settings`, { headers: { apikey: key }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) bad(`Auth settings endpoint returned HTTP ${res.status}. Check the URL and publishable key.`);
    else {
      const s = await res.json();
      ok("Auth endpoint reachable");
      if (s.external?.email) ok("Email/password sign-in is enabled"); else bad("Email provider is disabled in Supabase → Authentication → Providers.");
      if (s.disable_signup) bad("Sign-ups are disabled (Authentication → Sign In / Providers).");
      else ok("Sign-ups are enabled");
      if (s.mailer_autoconfirm) ok("Email confirmation is off (accounts work immediately)");
      else console.log("  • Email confirmation is on: users must click the link. Confirm the SMTP sender works (Supabase's built-in mailer is rate-limited).");
    }
  } catch (e) {
    bad(`Could not reach the Auth endpoint: ${e.message}`);
  }
}

console.log("\nManual checks (not visible through the public API):");
console.log("  • Authentication → URL Configuration: the deployed site's /login/ URL is listed, plus http://localhost:3000/login/.");
console.log("  • The Render static site has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY set, and was rebuilt after they were added.");
console.log(problems.length ? `\n${problems.length} problem(s) found.` : "\nNo problems found by the automated checks.");
process.exitCode = problems.length ? 1 : 0;
