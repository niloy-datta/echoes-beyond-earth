"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { readStore, writeStore } from "./storage";
import type { Lang } from "./types";

interface Settings {
  lang: Lang;
  sound: boolean;
  /** "system" follows prefers-reduced-motion; "reduce" forces it on. */
  motion: "system" | "reduce";
}

interface SettingsContext extends Settings {
  reducedMotion: boolean;
  hydrated: boolean;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  setSound: (on: boolean) => void;
  setMotion: (m: Settings["motion"]) => void;
}

const DEFAULTS: Settings = { lang: "en", sound: false, motion: "system" };
const Ctx = createContext<SettingsContext | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);
  const [systemReduced, setSystemReduced] = useState(false);

  useEffect(() => {
    const stored = readStore<Partial<Settings>>("settings", {});
    // Audio can only start after a user gesture, so sound always begins off on a fresh visit.
    setSettings({ ...DEFAULTS, ...stored, sound: false });
    setHydrated(true);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeStore("settings", { lang: settings.lang, motion: settings.motion });
    document.documentElement.lang = settings.lang === "bn" ? "bn" : "en";
    document.documentElement.dataset.lang = settings.lang;
  }, [settings.lang, settings.motion, hydrated]);

  const reducedMotion = settings.motion === "reduce" || systemReduced;
  useEffect(() => {
    document.documentElement.dataset.motion = reducedMotion ? "reduce" : "full";
  }, [reducedMotion]);

  const setLang = useCallback((lang: Lang) => setSettings((s) => ({ ...s, lang })), []);
  const toggleLang = useCallback(() => setSettings((s) => ({ ...s, lang: s.lang === "en" ? "bn" : "en" })), []);
  const setSound = useCallback((sound: boolean) => setSettings((s) => ({ ...s, sound })), []);
  const setMotion = useCallback((motion: Settings["motion"]) => setSettings((s) => ({ ...s, motion })), []);

  const value = useMemo(
    () => ({ ...settings, reducedMotion, hydrated, setLang, toggleLang, setSound, setMotion }),
    [settings, reducedMotion, hydrated, setLang, toggleLang, setSound, setMotion],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSettings must be used inside <SettingsProvider>");
  return ctx;
}
