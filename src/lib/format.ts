import { localizeDigits } from "./dates";
import type { Lang, MissionFeature } from "./types";

/** "0.67° N · 23.47° E", localized digits; null when the location is unknown. */
export function formatCoords(feature: MissionFeature, lang: Lang): string | null {
  if (!feature.geometry) return null;
  const [lon, lat] = feature.geometry.coordinates;
  const ns = lang === "bn" ? (lat >= 0 ? "উ" : "দ") : lat >= 0 ? "N" : "S";
  const ew = lang === "bn" ? (lon >= 0 ? "পূ" : "প") : lon >= 0 ? "E" : "W";
  return localizeDigits(`${Math.abs(lat).toFixed(2)}° ${ns} · ${Math.abs(lon).toFixed(2)}° ${ew}`, lang);
}

/** Case-, accent- and script-tolerant search text. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[·–—‘’“”"'()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
