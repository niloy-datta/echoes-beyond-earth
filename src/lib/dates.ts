import type { Lang, PartialDate } from "./types";

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function localizeDigits(input: string | number, lang: Lang): string {
  const s = String(input);
  return lang === "bn" ? s.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]) : s;
}

/** Year of a partial ISO date ("1976-07-20" → 1976). */
export function yearOf(d: PartialDate | null | undefined): number | null {
  if (!d) return null;
  const y = Number(d.slice(0, 4));
  return Number.isFinite(y) ? y : null;
}

/** Formats a partial date at the precision it was recorded with — never invents a day or month. */
export function formatDate(d: PartialDate | null | undefined, lang: Lang): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-").map(Number);
  const locale = lang === "bn" ? "bn-BD" : "en-GB";
  const opts: Intl.DateTimeFormatOptions = { year: "numeric", timeZone: "UTC" };
  if (m) opts.month = "long";
  if (day) opts.day = "numeric";
  try {
    return new Intl.DateTimeFormat(locale, opts).format(new Date(Date.UTC(y, (m || 1) - 1, day || 1)));
  } catch {
    return localizeDigits(d, lang);
  }
}

/** Years (rounded down) between two partial dates, or null when either is missing. */
export function yearsBetween(a: PartialDate | null, b: PartialDate | null): number | null {
  const ya = yearOf(a);
  const yb = yearOf(b);
  return ya == null || yb == null ? null : yb - ya;
}
