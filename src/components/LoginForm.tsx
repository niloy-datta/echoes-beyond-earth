"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { authErrorMessage } from "@/lib/auth-messages";

type Mode = "login" | "signup" | "forgot" | "recovery";

export function LoginForm() {
  const { lang } = useT();
  const bn = lang === "bn";
  const [mode, setMode] = useState<Mode>("login");
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let active = true;
    const callback = new URLSearchParams(window.location.hash.slice(1));
    const callbackError = callback.get("error_code") || callback.get("error");
    if (callbackError) {
      setError(authErrorMessage({ code: callbackError }, bn ? "bn" : "en"));
      window.history.replaceState(null, "", window.location.pathname);
    }
    const recovery = callback.get("type") === "recovery" || sessionStorage.getItem("echoes-password-recovery") === "true";
    if (recovery) setMode("recovery");
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setLoading(false);
      if (event === "PASSWORD_RECOVERY") {
        sessionStorage.setItem("echoes-password-recovery", "true");
        setMode("recovery");
      }
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      setLoading(false);
      setSession(data.session);
      if (error) setError(authErrorMessage(error, bn ? "bn" : "en"));
      if (!data.session && recovery) {
        sessionStorage.removeItem("echoes-password-recovery");
        setMode("forgot");
        setError(authErrorMessage({ code: "otp_expired" }, bn ? "bn" : "en"));
      }
    }).catch((error: unknown) => {
      if (active) { setLoading(false); setError(authErrorMessage(error, bn ? "bn" : "en")); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const changeMode = (next: Mode) => { setMode(next); setError(""); setMessage(""); setPassword(""); };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const redirectTo = new URL(window.location.pathname, window.location.origin).toString();
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: redirectTo } });
        if (error) throw error;
        if (!data.session) setMessage(bn ? "আপনার ইমেইলে যাচাইকরণ লিংক পাঠানো হয়েছে।" : "Check your email for a confirmation link.");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
        if (error) throw error;
        setMessage(bn ? "অ্যাকাউন্ট থাকলে পাসওয়ার্ড রিসেটের নির্দেশনা ইমেইলে পাবেন।" : "If an account exists for that email, check your inbox for a reset link.");
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        sessionStorage.removeItem("echoes-password-recovery");
        setPassword(""); setMode("login");
        setMessage(bn ? "পাসওয়ার্ড পরিবর্তন হয়েছে।" : "Your password has been updated.");
      }
    } catch (err) {
      setError(authErrorMessage(err, bn ? "bn" : "en"));
    } finally { setBusy(false); }
  }

  async function resendConfirmation() {
    if (!supabase || busy) return;
    if (!email.trim()) { setError(bn ? "প্রথমে ইমেইল ঠিকানা দিন।" : "Enter your email address first."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: new URL(window.location.pathname, window.location.origin).toString() } });
      if (error) throw error;
      setMessage(bn ? "ইমেইলের সর্বশেষ confirmation লিংক ব্যবহার করুন।" : "Check your email and use the newest confirmation link.");
    } catch (error) { setError(authErrorMessage(error, bn ? "bn" : "en")); }
    finally { setBusy(false); }
  }

  async function signOut() {
    if (!supabase) return;
    setBusy(true); setError("");
    const { error } = await supabase.auth.signOut();
    if (error) setError(error.message);
    else { sessionStorage.removeItem("echoes-password-recovery"); setMessage(""); setMode("login"); }
    setBusy(false);
  }

  const title = mode === "signup" ? (bn ? "অ্যাকাউন্ট তৈরি করুন" : "Create your account") : mode === "forgot" ? (bn ? "পাসওয়ার্ড রিসেট" : "Reset your password") : mode === "recovery" ? (bn ? "নতুন পাসওয়ার্ড" : "Choose a new password") : (bn ? "আবার স্বাগতম" : "Welcome back");
  const field = "mt-2 w-full rounded-lg border border-white/20 bg-black/30 px-4 py-3 text-lunar placeholder:text-dust focus:border-signal";
  return (
    <section className="container-x relative mx-auto flex min-h-[90svh] max-w-6xl items-center pb-20 pt-28">
      <div className="grid w-full gap-12 md:grid-cols-2 md:gap-20">
        <div className="flex flex-col justify-center">
          <p className="label mb-6 text-signal">ECHOES BEYOND EARTH / ACCOUNT</p>
          <h1 className="display max-w-xl text-[clamp(3rem,7vw,6rem)]">{bn ? "আপনার অভিযাত্রা শুরু হোক" : "Your journey continues."}</h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-lunar-2">{bn ? "মহাকাশ অভিযানের গল্পে ফিরে আসুন, আপনার নিজের অ্যাকাউন্ট নিয়ে।" : "Return to the stories of the machines that carried our curiosity beyond Earth."}</p>
          <Link href="/explore/" className="mt-8 w-fit text-sm text-signal hover:underline">{bn ? "প্রদর্শনী ঘুরে দেখুন →" : "Explore the collection →"}</Link>
        </div>
        <div className="rounded-2xl border border-white/15 bg-void-2/90 p-6 shadow-2xl sm:p-10">
          <p className="label mb-3 text-signal">{bn ? "অ্যাকাউন্ট" : "YOUR ACCOUNT"}</p>
          {loading ? <p className="text-lunar-2">{bn ? "লোড হচ্ছে…" : "Loading…"}</p> : !supabase ? <p role="alert" className="text-lunar-2">{bn ? "লগইন এখনো কনফিগার করা হয়নি।" : "Sign in is not configured yet."}</p> : session && mode !== "recovery" ? (
            <div><h2 className="text-3xl text-lunar">{bn ? "আপনি লগইন করেছেন" : "You’re signed in"}</h2><p className="mt-4 break-all text-lunar-2">{session.user.email}</p>{message && <p role="status" className="mt-4 text-signal">{message}</p>}{error && <p role="alert" className="mt-4 text-caution">{error}</p>}<button type="button" onClick={signOut} disabled={busy} className="btn-signal mt-8 disabled:opacity-50">{bn ? "লগ আউট" : "Sign out"}</button></div>
          ) : (
            <><h2 className="text-3xl text-lunar">{title}</h2><p className="mt-3 text-sm leading-relaxed text-lunar-2">{mode === "forgot" ? (bn ? "রিসেট লিংক পেতে ইমেইল দিন।" : "Enter your email and we’ll send you a reset link.") : (bn ? "ইমেইল ও পাসওয়ার্ড ব্যবহার করুন।" : "Use your email and password to continue.")}</p>
            <form onSubmit={submit} className="mt-8 space-y-5">
              {mode !== "recovery" && <label className="block text-sm text-lunar-2">{bn ? "ইমেইল" : "Email"}<input className={field} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>}
              {mode !== "forgot" && <label className="block text-sm text-lunar-2">{bn ? "পাসওয়ার্ড" : "Password"}<input className={field} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "login" ? undefined : 6} required value={password} onChange={(e) => setPassword(e.target.value)} /></label>}
              {error && <p role="alert" className="text-sm text-caution">{error}</p>}{message && <p role="status" className="text-sm leading-relaxed text-signal">{message}</p>}
              <button disabled={busy} type="submit" className="btn-signal justify-center w-full disabled:opacity-50">{busy ? (bn ? "অপেক্ষা করুন…" : "Please wait…") : mode === "signup" ? (bn ? "অ্যাকাউন্ট তৈরি করুন" : "Create account") : mode === "forgot" ? (bn ? "লিংক পাঠান" : "Send reset link") : mode === "recovery" ? (bn ? "পাসওয়ার্ড সংরক্ষণ" : "Save password") : (bn ? "লগইন" : "Sign in")}</button>
            </form>
            {(mode === "login" || mode === "signup") && <button type="button" disabled={busy} onClick={resendConfirmation} className="mt-5 text-sm text-signal disabled:opacity-50">{bn ? "নতুন confirmation ইমেইল পাঠান" : "Resend confirmation email"}</button>}
            {mode !== "recovery" && <div className="mt-6 flex flex-wrap justify-between gap-4 text-sm text-lunar-2">{mode === "login" ? <><button type="button" onClick={() => changeMode("signup")} className="hover:text-signal">{bn ? "নতুন অ্যাকাউন্ট" : "Create an account"}</button><button type="button" onClick={() => changeMode("forgot")} className="hover:text-signal">{bn ? "পাসওয়ার্ড ভুলে গেছেন?" : "Forgot password?"}</button></> : <button type="button" onClick={() => changeMode("login")} className="hover:text-signal">{bn ? "লগইনে ফিরে যান" : "Back to sign in"}</button>}</div>}</>
          )}
        </div>
      </div>
    </section>
  );
}
