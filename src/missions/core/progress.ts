/** Player progress for Mission Stories. Pure and serialisable; the UI persists it under "missions" in localStorage. */
import { CHAPTERS } from "../content/chapters.ts";

export const SAVE_VERSION = 1;

export interface ChapterRecord {
  clip: boolean;
  /** best compass stars 0..3, or -1 if the compass was never used */
  stars: number;
  hints: number;
  /** best number of correct quiz answers 0..3, or -1 if the quiz was never finished */
  quiz: number;
}
export interface ArenaRecord { plays: number; best: number; bestStreak: number; daily: Record<string, number> }
export interface MissionProgress {
  v: number;
  chapters: Record<string, ChapterRecord>;
  arena: ArenaRecord;
  vrVisited: boolean;
}

export const emptyChapter = (): ChapterRecord => ({ clip: false, stars: -1, hints: 0, quiz: -1 });
export const newProgress = (): MissionProgress => ({ v: SAVE_VERSION, chapters: {}, arena: { plays: 0, best: 0, bestStreak: 0, daily: {} }, vrVisited: false });

const int = (v: unknown, lo: number, hi: number, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : d);

/** Reject unknown ids, clamp every number — a corrupt or hand-edited save can never grant impossible state. */
export function sanitize(raw: unknown): MissionProgress {
  const out = newProgress();
  if (!raw || typeof raw !== "object") return out;
  const r = raw as Partial<MissionProgress>;
  const ids = new Set(CHAPTERS.map((c) => c.id));
  for (const [id, rec] of Object.entries(r.chapters ?? {})) {
    if (!ids.has(id) || !rec || typeof rec !== "object") continue;
    const c = rec as Partial<ChapterRecord>;
    out.chapters[id] = { clip: c.clip === true, stars: int(c.stars, -1, 3, -1), hints: int(c.hints, 0, 2, 0), quiz: int(c.quiz, -1, 3, -1) };
  }
  const a = r.arena;
  if (a && typeof a === "object") {
    out.arena.plays = int(a.plays, 0, 100000, 0);
    out.arena.best = int(a.best, 0, 100000, 0);
    out.arena.bestStreak = int(a.bestStreak, 0, 1000, 0);
    for (const [k, v] of Object.entries(a.daily ?? {})) if (/^\d{4}-\d{2}-\d{2}$/.test(k)) out.arena.daily[k] = int(v, 0, 100000, 0);
  }
  out.vrVisited = r.vrVisited === true;
  return out;
}

const rec = (p: MissionProgress, id: string): ChapterRecord => p.chapters[id] ?? emptyChapter();
const withChapter = (p: MissionProgress, id: string, patch: Partial<ChapterRecord>): MissionProgress => {
  if (!CHAPTERS.some((c) => c.id === id)) return p;
  return { ...p, chapters: { ...p.chapters, [id]: { ...rec(p, id), ...patch } } };
};

export const recordClip = (p: MissionProgress, id: string) => withChapter(p, id, { clip: true });
export const recordCompass = (p: MissionProgress, id: string, stars: number, hints: number) => {
  const cur = rec(p, id);
  return withChapter(p, id, { stars: Math.max(cur.stars, int(stars, 0, 3, 0)), hints: Math.max(cur.hints, int(hints, 0, 2, 0)) });
};
export const recordQuiz = (p: MissionProgress, id: string, correct: number) =>
  withChapter(p, id, { quiz: Math.max(rec(p, id).quiz, int(correct, 0, 3, 0)) });
export const recordArena = (p: MissionProgress, score: number, bestStreak: number, dailyKey?: string): MissionProgress => ({
  ...p,
  arena: {
    plays: p.arena.plays + 1,
    best: Math.max(p.arena.best, int(score, 0, 100000, 0)),
    bestStreak: Math.max(p.arena.bestStreak, int(bestStreak, 0, 1000, 0)),
    daily: dailyKey ? { ...p.arena.daily, [dailyKey]: Math.max(p.arena.daily[dailyKey] ?? 0, int(score, 0, 100000, 0)) } : p.arena.daily,
  },
});

export const chapterDone = (c: ChapterRecord) => c.clip && c.stars >= 0 && c.quiz >= 0;
export const hasBadge = (c: ChapterRecord) => chapterDone(c) && c.quiz >= 2;

/** XP is derived (never stored) so replaying cannot double-count. */
export function chapterXp(c: ChapterRecord): number {
  return (c.clip ? 10 : 0) + (c.stars >= 0 ? c.stars * 20 - c.hints * 5 : 0) + (c.quiz >= 0 ? c.quiz * 15 : 0) + (chapterDone(c) ? 25 : 0);
}
export function xpOf(p: MissionProgress): number {
  let xp = 0;
  for (const c of Object.values(p.chapters)) xp += Math.max(0, chapterXp(c));
  xp += Math.floor(p.arena.best / 10);
  if (p.vrVisited) xp += 20;
  return xp;
}

export const LEVELS = [
  { xp: 0, name: { en: "Pup Cadet", bn: "পাপ ক্যাডেট" } },
  { xp: 100, name: { en: "Moon Scout", bn: "চাঁদ-স্কাউট" } },
  { xp: 250, name: { en: "Mars Ranger", bn: "মঙ্গল-রেঞ্জার" } },
  { xp: 450, name: { en: "Signal Keeper", bn: "সংকেত-রক্ষক" } },
  { xp: 700, name: { en: "Echo Guardian", bn: "প্রতিধ্বনি-প্রহরী" } },
] as const;

export function levelOf(xp: number) {
  let i = 0;
  for (let k = 0; k < LEVELS.length; k++) if (xp >= LEVELS[k].xp) i = k;
  const next = LEVELS[i + 1] ?? null;
  return { index: i, level: LEVELS[i], next, into: xp - LEVELS[i].xp, span: next ? next.xp - LEVELS[i].xp : 1 };
}
export const MAX_XP = CHAPTERS.length * (10 + 60 + 45 + 25) + 20 + 1000; // chapters + VR + arena cap (best/10 ≤ 1000)
