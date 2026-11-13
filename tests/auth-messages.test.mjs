import test from "node:test";
import assert from "node:assert/strict";
import { authErrorMessage } from "../src/lib/auth-messages.ts";

const authErr = (message, code) => Object.assign(new Error(message), code ? { code } : {});

test("auth messages: stable error codes map to bilingual, actionable text", () => {
  assert.equal(authErrorMessage(authErr("Invalid login credentials", "invalid_credentials"), "en"), "Email or password is incorrect.");
  assert.equal(authErrorMessage(authErr("x", "invalid_credentials"), "bn"), "ইমেইল বা পাসওয়ার্ড সঠিক নয়।");
  assert.match(authErrorMessage(authErr("x", "email_not_confirmed"), "en"), /Confirm your email/);
  assert.match(authErrorMessage(authErr("x", "over_email_send_rate_limit"), "en"), /Too many emails/);
  assert.match(authErrorMessage(authErr("x", "weak_password"), "en"), /at least 6/);
});

test("auth messages: falls back to message text when no code is present", () => {
  assert.match(authErrorMessage(new Error("Email not confirmed"), "en"), /Confirm your email/);
  assert.match(authErrorMessage(new TypeError("Failed to fetch"), "en"), /Can't reach the sign-in service/);
  assert.match(authErrorMessage(new Error("User already registered"), "en"), /already exists/);
});

test("auth messages: unknown and non-error values get the generic message, never raw internals", () => {
  const generic = "Something went wrong. Please try again.";
  assert.equal(authErrorMessage(new Error("SQLSTATE 42P01 relation secret_table does not exist"), "en"), generic);
  assert.equal(authErrorMessage(undefined, "en"), generic);
  assert.equal(authErrorMessage(null, "bn"), "কিছু ভুল হয়েছে। আবার চেষ্টা করো।");
  assert.equal(authErrorMessage({ code: "not_a_real_code" }, "en"), generic);
  for (const code of ["invalid_credentials", "email_not_confirmed", "user_already_exists", "weak_password"]) {
    for (const lang of ["en", "bn"]) assert.ok(authErrorMessage(authErr("", code), lang).trim().length > 10, `${code}/${lang}`);
  }
});
