/**
 * Space Quiz Arena — questions are GENERATED from the catalog (so every answer is a spreadsheet value) and mixed
 * with the hand-written chapter questions. Same seed → same quiz, which also powers the Daily Mission.
 */
import type { CatalogObject, Catalog, L, Question } from "../core/types.ts";
import { daysBetween, siteName, yearOf } from "../core/geo.ts";
import { mulberry32, pick, shuffle } from "../core/rng.ts";
import { CHAPTERS } from "./chapters.ts";

export interface ArenaQuestion {
  id: string;
  kind: "year" | "agency" | "site" | "hemisphere" | "first" | "duration" | "chapter";
  prompt: L;
  options: L[];
  answer: number;
  explain: L;
  objectId: string | null;
  source: string | null;
}

const WORLD: Record<"moon" | "mars", L> = { moon: { en: "Moon", bn: "চাঁদ" }, mars: { en: "Mars", bn: "মঙ্গল" } };
export const AGENCY: Record<string, L> = {
  USA: { en: "USA (NASA or a US company)", bn: "যুক্তরাষ্ট্র (NASA বা মার্কিন কোম্পানি)" },
  USSR: { en: "Soviet Union", bn: "সোভিয়েত ইউনিয়ন" },
  China: { en: "China", bn: "চীন" },
  India: { en: "India", bn: "ভারত" },
  Japan: { en: "Japan", bn: "জাপান" },
  ESA: { en: "Europe (ESA)", bn: "ইউরোপ (ESA)" },
  Russia: { en: "Russia", bn: "রাশিয়া" },
  Israel: { en: "Israel", bn: "ইসরায়েল" },
};

/** "Apollo 11 – Eagle (LM অবতরণ-ধাপ) ও Tranquility Base" → "Apollo 11 – Eagle". Proper nouns stay in Latin script. */
export function shortName(o: CatalogObject): string {
  let n = o.name.replace(/\([^)]*\)/g, " ");
  const cut = n.search(/[^\x00-\x7FÀ-ɏ–’]/);
  if (cut > 0) n = n.slice(0, cut);
  return n.replace(/\s+/g, " ").replace(/[\s,+–-]+$/, "").trim() || o.id;
}

const SKIP = new Set(["lrv-1-2-3", "slim-lev", "deep-space-2", "yutu", "yutu-2", "pragyan", "sojourner", "mars-2-lander"]);

export function eligible(o: CatalogObject): boolean {
  return (
    (o.kind === "landed" || o.kind === "crashed") &&
    !SKIP.has(o.id) &&
    o.lat != null && o.lon != null && o.precision !== "near-parent" &&
    !!o.left_behind && /^\d{4}-\d{2}-\d{2}$/.test(o.left_behind) &&
    !!AGENCY[o.agency]
  );
}

function mk(id: string, kind: ArenaQuestion["kind"], o: CatalogObject | null, prompt: L, correct: L, distractors: L[], explain: L, rand: () => number): ArenaQuestion {
  const opts = shuffle([correct, ...distractors.slice(0, 3)], rand);
  return { id, kind, prompt, options: opts, answer: opts.indexOf(correct), explain, objectId: o?.id ?? null, source: o?.source_url ?? null };
}

const world = (o: CatalogObject) => WORLD[o.body];

function yearQ(o: CatalogObject, pool: CatalogObject[], rand: () => number): ArenaQuestion | null {
  const y = yearOf(o.left_behind)!;
  const set = new Set<number>([y]);
  const offsets = shuffle([-12, -7, -5, -3, -2, 2, 3, 5, 7, 9, 12, 15], rand);
  for (const d of offsets) {
    const c = y + d;
    if (c >= 1959 && c <= 2026) set.add(c);
    if (set.size >= 4) break;
  }
  if (set.size < 4) return null;
  const others = [...set].filter((v) => v !== y).map((v) => ({ en: String(v), bn: String(v).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]) }));
  const n = shortName(o);
  return mk(`year-${o.id}`, "year", o,
    { en: `In which year was ${n} left on the ${world(o).en}?`, bn: `${n} কোন সালে ${world(o).bn}ে রেখে আসা হয়েছিল?` },
    { en: String(y), bn: String(y).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]) }, others,
    { en: `${n}: ${o.left_behind}.`, bn: `${n}: ${o.left_behind}।` }, rand);
}

function agencyQ(o: CatalogObject, _pool: CatalogObject[], rand: () => number): ArenaQuestion | null {
  const others = shuffle(Object.keys(AGENCY).filter((a) => a !== o.agency), rand).slice(0, 3).map((a) => AGENCY[a]);
  const n = shortName(o);
  return mk(`agency-${o.id}`, "agency", o,
    { en: `Which country or agency sent ${n}?`, bn: `${n} কোন দেশ বা সংস্থা পাঠিয়েছিল?` },
    AGENCY[o.agency], others,
    { en: `${n} belongs to: ${AGENCY[o.agency].en}.`, bn: `${n} পাঠিয়েছে: ${AGENCY[o.agency].bn}।` }, rand);
}

function siteQ(o: CatalogObject, pool: CatalogObject[], rand: () => number): ArenaQuestion | null {
  const correct = siteName(o);
  if (!correct) return null;
  const others = [...new Set(pool.filter((p) => p.body === o.body && p.id !== o.id).map(siteName).filter((s): s is string => !!s && s !== correct))];
  if (others.length < 3) return null;
  const n = shortName(o);
  const d = shuffle(others, rand).slice(0, 3).map((s) => ({ en: s, bn: s }));
  return mk(`site-${o.id}`, "site", o,
    { en: `Where on the ${world(o).en} is ${n}?`, bn: `${world(o).bn}ের কোথায় আছে ${n}?` },
    { en: correct, bn: correct }, d,
    { en: `${n} is at ${correct}.`, bn: `${n} আছে ${correct}-এ।` }, rand);
}

function hemisphereQ(o: CatalogObject, _pool: CatalogObject[], rand: () => number): ArenaQuestion | null {
  if (Math.abs(o.lat!) < 1) return null;
  const north = o.lat! > 0;
  const n = shortName(o);
  const N: L = { en: "North of the equator", bn: "নিরক্ষরেখার উত্তরে" };
  const S: L = { en: "South of the equator", bn: "নিরক্ষরেখার দক্ষিণে" };
  return mk(`hemi-${o.id}`, "hemisphere", o,
    { en: `Is ${n} north or south of the ${world(o).en}’s equator?`, bn: `${n} কি ${world(o).bn}ের নিরক্ষরেখার উত্তরে, নাকি দক্ষিণে?` },
    north ? N : S, [north ? S : N],
    { en: `${n}: latitude ${o.lat!.toFixed(2)}°.`, bn: `${n}: অক্ষাংশ ${o.lat!.toFixed(2)}°।` }, rand);
}

function firstQ(o: CatalogObject, pool: CatalogObject[], rand: () => number): ArenaQuestion | null {
  const same = pool.filter((p) => p.body === o.body && p.id !== o.id && p.left_behind !== o.left_behind);
  if (same.length < 3) return null;
  const three = shuffle(same, rand).slice(0, 3);
  const all = [o, ...three];
  const dates = new Set(all.map((a) => a.left_behind));
  if (dates.size < 4) return null;
  const earliest = all.reduce((a, b) => (a.left_behind! <= b.left_behind! ? a : b));
  const nm = (x: CatalogObject): L => ({ en: shortName(x), bn: shortName(x) });
  return mk(`first-${o.id}`, "first", earliest,
    { en: `Which of these was left on the ${world(o).en} FIRST?`, bn: `এদের মধ্যে ${world(o).bn}ে সবার আগে কোনটা রেখে আসা হয়েছিল?` },
    nm(earliest), all.filter((a) => a !== earliest).map(nm),
    { en: `${shortName(earliest)}: ${earliest.left_behind}.`, bn: `${shortName(earliest)}: ${earliest.left_behind}।` }, rand);
}

function durationQ(o: CatalogObject, _pool: CatalogObject[], rand: () => number): ArenaQuestion | null {
  if (!o.last_contact || o.last_contact_approx || o.status === "active" || !o.left_behind) return null;
  const d = daysBetween(o.left_behind, o.last_contact);
  if (d < 2) return null;
  const unit = d < 45 ? "days" : d < 700 ? "months" : "years";
  const div = unit === "days" ? 1 : unit === "months" ? 30.4 : 365.25;
  const v = Math.max(1, Math.round(d / div));
  const fmt = (n: number): L => unit === "days" ? { en: `${n} days`, bn: `${n} দিন` } : unit === "months" ? { en: `${n} months`, bn: `${n} মাস` } : { en: `${n} years`, bn: `${n} বছর` };
  const bnd = (l: L): L => ({ en: l.en, bn: l.bn.replace(/\d/g, (x) => "০১২৩৪৫৬৭৮৯"[+x]) });
  const cand = new Set<number>();
  for (const m of shuffle([0.25, 0.5, 2, 3, 5, 8, 12], rand)) {
    const c = Math.max(1, Math.round(v * m));
    if (c !== v) cand.add(c);
    if (cand.size >= 3) break;
  }
  for (let k = v + 1; cand.size < 3; k++) if (k !== v) cand.add(k);
  const n = shortName(o);
  return mk(`dur-${o.id}`, "duration", o,
    { en: `About how long did ${n} keep in touch with Earth after it was left on the ${world(o).en}?`, bn: `${world(o).bn}ে রেখে আসার পর ${n} প্রায় কতদিন পৃথিবীর সঙ্গে যোগাযোগ রেখেছিল?` },
    bnd(fmt(v)), [...cand].map((c) => bnd(fmt(c))),
    { en: `${n}: ${o.left_behind} → ${o.last_contact} (${d} days).`, bn: `${n}: ${o.left_behind} → ${o.last_contact} (${d} দিন)।` }, rand);
}

const GENERATORS = [yearQ, agencyQ, siteQ, hemisphereQ, firstQ, durationQ];

function fromChapter(q: Question, objectId: string, rand: () => number): ArenaQuestion {
  const opts = shuffle(q.options.map((o, i) => ({ o, i })), rand);
  return { id: `ch-${q.id}`, kind: "chapter", prompt: q.prompt, options: opts.map((x) => x.o), answer: opts.findIndex((x) => x.i === q.answer), explain: q.explain, objectId, source: null };
}

export function buildArena(catalog: Catalog, seed: number, count = 10): ArenaQuestion[] {
  const rand = mulberry32(seed);
  const pool = catalog.objects.filter(eligible);
  const out: ArenaQuestion[] = [];
  const usedObj = new Set<string>();
  const wanted = Math.round(count * 0.7);
  let guard = 0;
  while (out.length < wanted && guard++ < 400) {
    const o = pick(pool, rand);
    const gen = pick(GENERATORS, rand);
    const q = gen(o, pool, rand);
    if (!q || usedObj.has(q.id) || out.some((x) => x.kind === q.kind && x.objectId === q.objectId)) continue;
    // don't ask the same thing about the same object twice, and keep kinds varied
    if (out.filter((x) => x.kind === q.kind).length >= Math.ceil(wanted / 3)) continue;
    usedObj.add(q.id);
    out.push(q);
  }
  const chapterQs = shuffle(CHAPTERS.flatMap((c) => c.quiz.map((q) => ({ q, c }))), rand);
  for (const { q, c } of chapterQs) {
    if (out.length >= count) break;
    out.push(fromChapter(q, c.objectId, rand));
  }
  return shuffle(out, rand);
}
