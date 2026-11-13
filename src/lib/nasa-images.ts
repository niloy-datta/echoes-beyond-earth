/**
 * Client for NASA's Image and Video Library API (https://images-api.nasa.gov).
 *
 * Why this API: it is NASA's official archive, needs no API key (so no secret
 * ships in a static site), and answers browsers with `Access-Control-Allow-Origin: *`.
 * (api.nasa.gov's Mars Rover Photos and APOD endpoints returned "No such app"
 * when checked on 2026-11-12, so they are not used.)
 *
 * Safety: requests run only when the player asks; responses are validated,
 * text is stripped of markup and rendered as plain text by React, and every
 * URL kept must be https on a nasa.gov host. Failures resolve to `null` so
 * the game keeps working offline with its stored copy of each record.
 */

export const NASA_IMAGES_API = "https://images-api.nasa.gov";

export interface NasaImageRecord {
  nasaId: string;
  title: string;
  /** ISO date string as published by NASA (date_created). */
  dateCreated: string | null;
  center: string | null;
  /** Credit line as NASA publishes it (secondary_creator / photographer), or null. */
  credit: string | null;
  /** Plain-text description, markup removed, trimmed to a readable length. */
  description: string;
  keywords: string[];
  /** https thumbnail on a nasa.gov host, or null. */
  thumb: string | null;
  /** Public record page. */
  page: string;
}

const MAX_DESCRIPTION = 700;

/** Keep only https URLs on nasa.gov hosts; NASA returns some asset links as http. */
export function safeNasaUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol === "http:") u.protocol = "https:";
    if (u.protocol !== "https:") return null;
    const host = u.hostname.toLowerCase();
    if (host !== "nasa.gov" && !host.endsWith(".nasa.gov")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Strip tags and entities from NASA captions (some contain HTML) and normalise whitespace. */
export function plainText(raw: unknown, max = MAX_DESCRIPTION): string {
  if (typeof raw !== "string") return "";
  const text = raw
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;|&gt;/gi, " ")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(" "));
  return `${cut.slice(0, end > max * 0.6 ? end + 1 : max).trim()}…`;
}

const NASA_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{1,80}$/;
export const isNasaId = (id: unknown): id is string => typeof id === "string" && NASA_ID.test(id);

export const recordPage = (nasaId: string) => `https://images.nasa.gov/details/${encodeURIComponent(nasaId)}`;

/** Parse one `collection.items[]` entry from the search endpoint. Returns null when it is not usable. */
export function parseItem(item: unknown): NasaImageRecord | null {
  if (!item || typeof item !== "object") return null;
  const it = item as { data?: unknown; links?: unknown };
  const data = Array.isArray(it.data) ? (it.data[0] as Record<string, unknown> | undefined) : undefined;
  if (!data || !isNasaId(data.nasa_id) || typeof data.title !== "string" || !data.title.trim()) return null;
  const links = Array.isArray(it.links) ? (it.links as Record<string, unknown>[]) : [];
  const preview = links.find((l) => l && l.rel === "preview" && (l.render === undefined || l.render === "image"));
  const date = typeof data.date_created === "string" && !Number.isNaN(Date.parse(data.date_created)) ? data.date_created : null;
  return {
    nasaId: data.nasa_id,
    title: plainText(data.title, 160),
    dateCreated: date,
    center: typeof data.center === "string" ? plainText(data.center, 40) : null,
    credit: typeof data.secondary_creator === "string" ? plainText(data.secondary_creator, 120) : typeof data.photographer === "string" ? plainText(data.photographer, 120) : null,
    description: plainText(data.description ?? data.description_508),
    keywords: Array.isArray(data.keywords) ? data.keywords.filter((k): k is string => typeof k === "string").slice(0, 8).map((k) => plainText(k, 40)) : [],
    thumb: safeNasaUrl(preview?.href),
    page: recordPage(data.nasa_id),
  };
}

/** Parse a whole search response. */
export function parseSearch(json: unknown): NasaImageRecord[] {
  const items = (json as { collection?: { items?: unknown } } | null)?.collection?.items;
  if (!Array.isArray(items)) return [];
  return items.map(parseItem).filter((r): r is NasaImageRecord => r !== null);
}

const memory = new Map<string, NasaImageRecord[]>();
const CACHE_PREFIX = "nasa-images:";

function cacheGet(key: string): NasaImageRecord[] | null {
  const hit = memory.get(key);
  if (hit) return hit;
  try {
    const raw = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(CACHE_PREFIX + key) : null;
    if (!raw) return null;
    const parsed = parseSearch({ collection: { items: JSON.parse(raw) } });
    memory.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

function cacheSet(key: string, items: unknown[], parsed: NasaImageRecord[]) {
  memory.set(key, parsed);
  try { sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(items)); } catch { /* storage unavailable: memory only */ }
}

async function search(params: Record<string, string>, opts: { signal?: AbortSignal; timeoutMs?: number; fetcher?: typeof fetch } = {}): Promise<NasaImageRecord[] | null> {
  const qs = new URLSearchParams({ media_type: "image", ...params });
  const key = qs.toString();
  const cached = cacheGet(key);
  if (cached) return cached;
  const fetcher = opts.fetcher ?? (typeof fetch !== "undefined" ? fetch : null);
  if (!fetcher) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 8000);
  const onAbort = () => ctrl.abort();
  opts.signal?.addEventListener("abort", onAbort);
  try {
    // No credentials or identifying headers are sent; only the public query string.
    const res = await fetcher(`${NASA_IMAGES_API}/search?${key}`, { signal: ctrl.signal, credentials: "omit", referrerPolicy: "no-referrer" });
    if (!res.ok) return null;
    const json = (await res.json()) as unknown;
    const items = (json as { collection?: { items?: unknown } })?.collection?.items;
    const parsed = parseSearch(json);
    if (Array.isArray(items)) cacheSet(key, items, parsed);
    return parsed;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onAbort);
  }
}

/** The official record for one NASA id (exact match), or null when unavailable. */
export async function fetchNasaRecord(nasaId: string, opts?: { signal?: AbortSignal; timeoutMs?: number; fetcher?: typeof fetch }): Promise<NasaImageRecord | null> {
  if (!isNasaId(nasaId)) return null;
  const results = await search({ nasa_id: nasaId }, opts);
  return results?.find((r) => r.nasaId.toLowerCase() === nasaId.toLowerCase()) ?? null;
}

export type ArchiveTopic = "mars" | "moon";
const TOPIC_PATTERN: Record<ArchiveTopic, RegExp> = {
  mars: /mars|martian|opportunity|spirit|mer/i,
  moon: /moon|lunar|apollo|surveyor/i,
};

/** Keep a related result only if NASA's own title or keywords place it on the card's world. */
export function onTopic(r: NasaImageRecord, topic?: ArchiveTopic): boolean {
  if (!topic) return true;
  return TOPIC_PATTERN[topic].test(`${r.title} ${r.keywords.join(" ")}`);
}

/** Related NASA images for a free-text query (up to `limit`), excluding `exclude` and off-topic results. */
export async function relatedNasaImages(query: string, limit = 4, exclude?: string, opts?: { signal?: AbortSignal; timeoutMs?: number; fetcher?: typeof fetch; topic?: ArchiveTopic }): Promise<NasaImageRecord[] | null> {
  const q = query.trim().slice(0, 120);
  if (!q) return [];
  const results = await search({ q, page_size: String(Math.max(limit * 2, 8)) }, opts);
  if (!results) return null;
  const skip = exclude?.toLowerCase();
  const seen = new Set<string>();
  return results.filter((r) => {
    const id = r.nasaId.toLowerCase();
    if (!r.thumb || id === skip || seen.has(id) || !onTopic(r, opts?.topic)) return false;
    seen.add(id);
    return true;
  }).slice(0, limit);
}
