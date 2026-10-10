import type { Body, CatalogObject, Lang } from "./types.ts";

export const RADIUS_KM: Record<Body, number> = { moon: 1737.4, mars: 3389.5 };
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle central angle in degrees between two lat/lon points (degrees, east-positive). */
export function arcDegrees(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const p1 = rad(lat1), p2 = rad(lat2), dl = rad(lon2 - lon1);
  const a = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return (2 * Math.asin(Math.min(1, Math.sqrt(a))) * 180) / Math.PI;
}

export function distanceKm(body: Body, lat1: number, lon1: number, lat2: number, lon2: number): number {
  return rad(arcDegrees(lat1, lon1, lat2, lon2)) * RADIUS_KM[body];
}

/** 3 stars ≤ 8°, 2 stars ≤ 20°, 1 star ≤ 45°, otherwise 0 (arc degrees — works for both worlds). */
export function starsFor(arc: number): 0 | 1 | 2 | 3 {
  return arc <= 8 ? 3 : arc <= 20 ? 2 : arc <= 45 ? 1 : 0;
}

export const clampLat = (v: number) => Math.max(-90, Math.min(90, v));
export function wrapLon(v: number): number {
  let x = v;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  return x;
}

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
export const localizeDigits = (s: string, lang: Lang) => (lang === "bn" ? s.replace(/\d/g, (d) => BN_DIGITS[+d]) : s);

export function formatLatLon(lat: number, lon: number, lang: Lang = "en", digits = 2): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  const bn = lang === "bn";
  const body = `${Math.abs(lat).toFixed(digits)}°${bn ? (lat >= 0 ? "উ" : "দ") : ns}, ${Math.abs(lon).toFixed(digits)}°${bn ? (lon >= 0 ? "পূ" : "প") : ew}`;
  return localizeDigits(body, lang);
}

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_BN = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];

/** "1969-07-20" → "20 Jul 1969" / "২০ জুলাই ১৯৬৯". Partial dates ("1972") pass through. */
export function formatDate(iso: string | null, lang: Lang): string {
  if (!iso) return lang === "bn" ? "অজানা" : "unknown";
  const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d] = m;
  if (!mo) return localizeDigits(y, lang);
  const month = (lang === "bn" ? MONTHS_BN : MONTHS_EN)[+mo - 1];
  return localizeDigits(d ? `${+d} ${month} ${y}` : `${month} ${y}`, lang);
}

export const yearOf = (iso: string | null): number | null => (iso && /^\d{4}/.test(iso) ? +iso.slice(0, 4) : null);

/** Days between two ISO dates (YYYY-MM-DD). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
}

/** The place name in brackets inside the spreadsheet coordinate text, e.g. "… (Mare Imbrium)" → "Mare Imbrium". */
export function siteName(o: CatalogObject): string | null {
  const m = /\(([^()]+)\)\s*$/.exec(o.coords_raw.replace(/\s+/g, " ").trim());
  if (!m) return null;
  const t = m[1].replace(/^[≈~]/, "").trim();
  if (/আনুমানিক|অজানা|এক তালিকায়|অন্য|অঞ্চল|যাচাই|দূরপৃষ্ঠ/.test(t) && !/[A-Za-z]{4}/.test(t)) return null;
  // keep only the Latin part ("Von Kármán crater, চাঁদের দূরপৃষ্ঠ" → "Von Kármán crater")
  const latin = t.split(",")[0].replace(/[^\x20-\x7EÀ-ɏ–'’]/g, "").trim();
  return latin.length >= 4 ? latin : null;
}

/** Equirectangular map projection helpers (x,y in 0..1, origin top-left, lon −180..180, lat 90..−90). */
export const toMap = (lat: number, lon: number) => ({ x: (lon + 180) / 360, y: (90 - lat) / 180 });
export const fromMap = (x: number, y: number) => ({ lat: clampLat(90 - y * 180), lon: wrapLon(x * 360 - 180) });
