/**
 * Quest engine, progression and save format for THE LAST LIGHT.
 *
 * Progress stores only *what was completed*. XP, level, evidence and chapter
 * completion are derived from it, so replaying a chapter can never double
 * count rewards and a tampered/corrupt save cannot grant impossible state.
 */
import {
  ACHIEVEMENTS, CHAPTERS, LEVELS, OBJECTIVE_BY_ID, SIDE_DISCOVERIES, chapterOfObjective, type Objective,
} from "../content/chapters.ts";
import { PUZZLES } from "../content/puzzles.ts";
import { WORLD_RADIUS } from "../content/world.ts";
import { clamp, lerp } from "./math.ts";

export const SAVE_VERSION = 1;
export const SAVE_KEY = "game:last-light";
export const FIRST_TRY_BONUS = 25;

export interface GameProgress {
  v: number;
  /** Index of the chapter being played (0..4). */
  chapter: number;
  /** Completed objective ids (all chapters). */
  done: string[];
  /** Side discoveries found. */
  sides: string[];
  /** Puzzles solved without a wrong attempt. */
  firstTry: string[];
  /** Puzzles with at least one wrong attempt in the current run of their chapter. */
  missed: string[];
  achievements: string[];
  /** Highest XP ever held, so replaying a chapter never lowers the explorer level. */
  bestXp: number;
  /** The campaign has been completed at least once. */
  finished: boolean;
  /** Last autosaved position; null means "use the chapter checkpoint". */
  player: { x: number; z: number; yaw: number } | null;
  stats: { distance: number; seconds: number };
  savedAt: string | null;
}

export type ProgressEvent =
  | { type: "objective"; id: string; xp: number }
  | { type: "evidence"; id: string }
  | { type: "side"; id: string; xp: number }
  | { type: "achievement"; id: string }
  | { type: "level"; level: number }
  | { type: "chapter-complete"; chapter: number }
  | { type: "campaign-complete" };

export function newProgress(): GameProgress {
  return { v: SAVE_VERSION, chapter: 0, done: [], sides: [], firstTry: [], missed: [], achievements: [], bestXp: 0, finished: false, player: null, stats: { distance: 0, seconds: 0 }, savedAt: null };
}

const OBJECTIVE_IDS = new Set(OBJECTIVE_BY_ID.keys());
const SIDE_IDS = new Set(SIDE_DISCOVERIES.map((s) => s.id));
const PUZZLE_IDS = new Set(PUZZLES.map((p) => p.id));
const ACHIEVEMENT_IDS = new Set(ACHIEVEMENTS.map((a) => a.id));

function idList(raw: unknown, valid: Set<string>): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((x): x is string => typeof x === "string" && valid.has(x)))];
}
const finite = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

/**
 * Accept anything (old versions, hand-edited JSON, partial writes) and return
 * a valid save. Objectives are only kept if every earlier step of their
 * chapter is also complete, so progress can never skip ahead.
 */
export function sanitizeProgress(raw: unknown): GameProgress {
  const base = newProgress();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  if (r.v !== SAVE_VERSION) return base;

  // Keep an objective only if every earlier step (and earlier chapter) is complete.
  const claimed = new Set(idList(r.done, OBJECTIVE_IDS));
  const done: string[] = [];
  let chaptersComplete = 0;
  let open = true;
  for (const chapter of CHAPTERS) {
    for (const step of chapter.steps) {
      if (!open) break;
      for (const o of step) if (claimed.has(o.id)) done.push(o.id);
      if (!step.every((o) => claimed.has(o.id))) open = false;
    }
    if (open) chaptersComplete++;
  }
  const achievements = idList(r.achievements, ACHIEVEMENT_IDS);
  const finished = r.finished === true && (chaptersComplete === CHAPTERS.length || achievements.includes("last-light"));
  const maxChapter = Math.min(CHAPTERS.length - 1, chaptersComplete);
  const chapter = clamp(Math.round(finite(r.chapter, 0)), 0, finished ? CHAPTERS.length - 1 : maxChapter);

  let player: GameProgress["player"] = null;
  const p = r.player as Record<string, unknown> | null | undefined;
  if (p && typeof p === "object") {
    const x = finite(p.x, NaN), z = finite(p.z, NaN), yaw = finite(p.yaw, 0);
    if (Number.isFinite(x) && Number.isFinite(z) && Math.hypot(x, z) <= WORLD_RADIUS) player = { x, z, yaw };
  }
  const s = (r.stats ?? {}) as Record<string, unknown>;
  const sanitized: GameProgress = {
    v: SAVE_VERSION,
    chapter,
    done,
    sides: idList(r.sides, SIDE_IDS),
    firstTry: idList(r.firstTry, PUZZLE_IDS),
    missed: idList(r.missed, PUZZLE_IDS),
    achievements,
    finished,
    player,
    stats: { distance: clamp(finite(s.distance, 0), 0, 1e7), seconds: clamp(finite(s.seconds, 0), 0, 1e8) },
    savedAt: typeof r.savedAt === "string" ? r.savedAt.slice(0, 40) : null,
    bestXp: 0,
  };
  sanitized.bestXp = clamp(Math.round(finite(r.bestXp, 0)), xpOf(sanitized), MAX_XP);
  return sanitized;
}

// ── Derived state ───────────────────────────────────────────────────────────

/** Index of the first incomplete step in a chapter, or -1 when complete. */
export function currentStep(progress: GameProgress, chapterIndex = progress.chapter): number {
  const chapter = CHAPTERS[chapterIndex];
  if (!chapter) return -1;
  const done = new Set(progress.done);
  return chapter.steps.findIndex((step) => step.some((o) => !done.has(o.id)));
}

export function activeObjectives(progress: GameProgress): Objective[] {
  const step = currentStep(progress);
  if (step < 0) return [];
  const done = new Set(progress.done);
  return CHAPTERS[progress.chapter].steps[step].filter((o) => !done.has(o.id));
}

export function isChapterComplete(progress: GameProgress, index: number): boolean {
  return currentStep(progress, index) === -1;
}

export function chaptersCompleted(progress: GameProgress): number {
  return CHAPTERS.filter((_, i) => isChapterComplete(progress, i)).length;
}

/** Chapters the player may start from Chapter Select. */
export function unlockedChapters(progress: GameProgress): number[] {
  if (progress.finished) return CHAPTERS.map((_, i) => i);
  const out: number[] = [];
  for (let i = 0; i < CHAPTERS.length; i++) {
    out.push(i);
    if (!isChapterComplete(progress, i)) break;
  }
  return out;
}

export function xpOf(progress: GameProgress): number {
  let xp = 0;
  for (const id of progress.done) xp += OBJECTIVE_BY_ID.get(id)?.xp ?? 0;
  for (const id of progress.sides) xp += SIDE_DISCOVERIES.find((s) => s.id === id)?.xp ?? 0;
  xp += progress.firstTry.length * FIRST_TRY_BONUS;
  return xp;
}

/** Highest XP the campaign can award (all objectives, sides and first-try bonuses). */
export const MAX_XP = [...OBJECTIVE_BY_ID.values()].reduce((t, o) => t + o.xp, 0)
  + SIDE_DISCOVERIES.reduce((t, s) => t + s.xp, 0)
  + PUZZLES.length * FIRST_TRY_BONUS;

/** XP used for the explorer level: never decreases when replaying. */
export const levelXp = (progress: GameProgress) => Math.max(progress.bestXp, xpOf(progress));

export function levelOf(xp: number): { level: number; current: number; next: number | null } {
  let level = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].xp) level = i;
  return { level, current: LEVELS[level].xp, next: LEVELS[level + 1]?.xp ?? null };
}

/** Evidence ids, in the order the campaign awards them. */
export function evidenceOf(progress: GameProgress): string[] {
  const out: string[] = [];
  const done = new Set(progress.done);
  for (const chapter of CHAPTERS) for (const step of chapter.steps) for (const o of step) {
    if (o.evidence && done.has(o.id) && !out.includes(o.evidence)) out.push(o.evidence);
  }
  for (const side of SIDE_DISCOVERIES) if (progress.sides.includes(side.id) && !out.includes(side.evidence)) out.push(side.evidence);
  return out;
}

/** Story dust level for lighting: interpolates the chapter's range by step progress. */
export function stormLevel(progress: GameProgress): number {
  const chapter = CHAPTERS[progress.chapter];
  const step = currentStep(progress);
  // After the finale the (artistic) sky stays clear for free exploration.
  if (step < 0 && progress.chapter === CHAPTERS.length - 1) return 0;
  const total = chapter.steps.length;
  const t = step < 0 ? 1 : step / Math.max(1, total - 1);
  return lerp(chapter.storm[0], chapter.storm[1], clamp(t, 0, 1));
}

// ── Transitions ─────────────────────────────────────────────────────────────

function awardAchievements(before: GameProgress, after: GameProgress): { progress: GameProgress; events: ProgressEvent[] } {
  const earned = new Set(after.achievements);
  const done = new Set(after.done);
  const want: string[] = [];
  if (done.has("c1-move")) want.push("first-steps");
  if (evidenceOf(after).length > 0) want.push("first-memory");
  if (done.has("c2-puzzle")) want.push("component-specialist");
  if (isChapterComplete(after, 2)) want.push("storm-navigator");
  if (done.has("c4-timeline")) want.push("archivist");
  if (after.finished) want.push("last-light");
  if (after.firstTry.length >= 3) want.push("sharp-mind");
  if (after.sides.length >= SIDE_DISCOVERIES.length) want.push("wanderer");
  if (after.stats.distance >= 1000) want.push("long-walk");
  const events: ProgressEvent[] = [];
  for (const id of want) if (!earned.has(id)) { earned.add(id); events.push({ type: "achievement", id }); }
  let progress = events.length ? { ...after, achievements: [...earned] } : after;
  progress = { ...progress, bestXp: levelXp(progress) };
  const lb = levelOf(levelXp(before)).level, la = levelOf(levelXp(progress)).level;
  if (la > lb) events.push({ type: "level", level: la });
  return { progress, events };
}

/** Complete an objective if (and only if) it is currently active. */
export function completeObjective(progress: GameProgress, id: string): { progress: GameProgress; events: ProgressEvent[] } {
  if (!activeObjectives(progress).some((o) => o.id === id)) return { progress, events: [] };
  const objective = OBJECTIVE_BY_ID.get(id)!;
  const before = progress;
  const hadEvidence = new Set(evidenceOf(progress));
  let next: GameProgress = { ...progress, done: [...progress.done, id] };
  const events: ProgressEvent[] = [{ type: "objective", id, xp: objective.xp }];
  if (objective.evidence && !hadEvidence.has(objective.evidence)) events.push({ type: "evidence", id: objective.evidence });

  const chapterIndex = chapterOfObjective(id);
  if (isChapterComplete(next, chapterIndex)) {
    events.push({ type: "chapter-complete", chapter: chapterIndex });
    if (chapterIndex === CHAPTERS.length - 1) {
      next = { ...next, finished: true, player: null };
      events.push({ type: "campaign-complete" });
    } else {
      next = { ...next, chapter: chapterIndex + 1, player: null };
    }
  }
  const awarded = awardAchievements(before, next);
  return { progress: awarded.progress, events: [...events, ...awarded.events] };
}

export function discoverSide(progress: GameProgress, id: string): { progress: GameProgress; events: ProgressEvent[] } {
  const side = SIDE_DISCOVERIES.find((s) => s.id === id);
  if (!side || progress.sides.includes(id) || progress.chapter < side.fromChapter && !progress.finished) return { progress, events: [] };
  const next = { ...progress, sides: [...progress.sides, id] };
  const events: ProgressEvent[] = [{ type: "side", id, xp: side.xp }, { type: "evidence", id: side.evidence }];
  const awarded = awardAchievements(progress, next);
  return { progress: awarded.progress, events: [...events, ...awarded.events] };
}

/** Record a puzzle attempt. A correct answer also completes its objective. */
export function attemptPuzzle(progress: GameProgress, objectiveId: string, correct: boolean): { progress: GameProgress; events: ProgressEvent[] } {
  const objective = OBJECTIVE_BY_ID.get(objectiveId);
  if (!objective?.puzzle || !activeObjectives(progress).some((o) => o.id === objectiveId)) return { progress, events: [] };
  const pid = objective.puzzle;
  if (!correct) {
    return { progress: progress.missed.includes(pid) ? progress : { ...progress, missed: [...progress.missed, pid] }, events: [] };
  }
  const firstTry = !progress.missed.includes(pid) && !progress.firstTry.includes(pid);
  const withBonus = firstTry ? { ...progress, firstTry: [...progress.firstTry, pid] } : progress;
  return completeObjective(withBonus, objectiveId);
}

/** Accumulate play statistics (and any distance-based achievement). */
export function addStats(progress: GameProgress, distance: number, seconds: number): { progress: GameProgress; events: ProgressEvent[] } {
  if (!(distance >= 0) || !(seconds >= 0)) return { progress, events: [] };
  const next = { ...progress, stats: { distance: progress.stats.distance + distance, seconds: progress.stats.seconds + seconds } };
  if (progress.stats.distance < 1000 && next.stats.distance >= 1000) return awardAchievements(progress, next);
  return { progress: next, events: [] };
}

/**
 * Replay/restart a chapter: clears progress for this chapter and every later
 * one (rewards are derived, so nothing is double-counted). Achievements and
 * campaign completion are kept.
 */
export function startChapter(progress: GameProgress, index: number): GameProgress {
  if (!unlockedChapters(progress).includes(index)) return progress;
  const keep = new Set<string>();
  CHAPTERS.forEach((c, i) => { if (i < index) for (const s of c.steps) for (const o of s) if (progress.done.includes(o.id)) keep.add(o.id); });
  const replayPuzzles = new Set(CHAPTERS.slice(index).flatMap((c) => c.steps.flat().map((o) => o.puzzle).filter(Boolean) as string[]));
  return {
    ...progress,
    chapter: index,
    done: progress.done.filter((id) => keep.has(id)),
    missed: progress.missed.filter((p) => !replayPuzzles.has(p)),
    player: null,
  };
}

export function spawnFor(progress: GameProgress): { x: number; z: number; yaw: number } {
  return progress.player ?? { ...CHAPTERS[progress.chapter].spawn };
}
