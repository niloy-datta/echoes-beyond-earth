"use client";
import strings from "@/data/strings.json";
import { useSettings } from "./settings";
import type { Lang, Localized } from "./types";

export type StringKey = keyof typeof strings.en;

// Compile-time guarantee that Bangla covers every English key.
const _bnComplete: Record<StringKey, string> = strings.bn;
void _bnComplete;

export function translate(lang: Lang, key: StringKey, vars?: Record<string, string | number>): string {
  let s: string = strings[lang][key] ?? strings.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export function useT() {
  const { lang } = useSettings();
  const t = (key: StringKey, vars?: Record<string, string | number>) => translate(lang, key, vars);
  const l = (value: Localized | undefined | null) => (value ? value[lang] || value.en : "");
  return { t, l, lang };
}
