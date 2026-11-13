/**
 * Quiz Portal assessment engine. Pure functions; stored locally only.
 *
 * - First-attempt correctness is recorded separately from assisted completion:
 *   retrying until correct "solves" an item but never counts as first-try.
 * - Pre/post change is reported in percentage points on parallel forms.
 * - Mastery and recommendations use fixed, transparent thresholds (no AI).
 */
import {
  BANK, BANK_BY_ID, COMPETENCIES, type AgeGroup, type BankItem, type Competency,
} from "../content/learningBank.ts";
import { LEARNING_QUESTIONS } from "./learning.ts";

export const ASSESSMENT_VERSION = 1;
export const ASSESSMENT_KEY = "game:last-light:assessment";
/** First-try share at or above which a competency counts as demonstrated. */
export const MASTERY_AT = 0.8;
/** First-try share below which targeted practice is recommended. */
export const PRACTICE_BELOW = 0.5;
/** Minimum answered items before a mastery label is shown. */
export const MIN_EVIDENCE = 2;

type T = { en: string; bn: string };
export interface QuizItem extends Omit<BankItem, "options"> { options: readonly T[] }

// The five reviewed EKO items join the chapter quizzes (one per chapter).
const SKILL_TO_COMPETENCY: Record<string, Competency> = { traverse: "history", components: "hardware", storm: "environment", images: "evidence", conclusions: "history" };
const LEGACY_ITEMS: QuizItem[] = LEARNING_QUESTIONS.map((q) => ({
  id: `eko-${q.id}`, competency: SKILL_TO_COMPETENCY[q.skill], use: "chapter", chapter: q.chapter,
  prompt: q.prompt, options: q.options, correct: q.correct, explanation: q.explanation,
  misconception: { en: "Re-read the evidence card for this record.", bn: "এই রেকর্ডের প্রমাণ-কার্ড আবার পড়ো।" },
  hint: { en: "The answer is in the NASA source linked below.", bn: "উত্তর নিচের NASA সূত্রে আছে।" },
  kind: "observed", source: q.source,
}));

export const ITEMS: readonly QuizItem[] = [...BANK, ...LEGACY_ITEMS];
const ITEM_BY_ID = new Map<string, QuizItem>([...BANK_BY_ID, ...LEGACY_ITEMS.map((i) => [i.id, i] as const)]);
export const itemById = (id: string) => ITEM_BY_ID.get(id);

export type QuizSet = { kind: "pre" } | { kind: "post" } | { kind: "chapter"; chapter: number } | { kind: "challenge" };
export function itemsFor(set: QuizSet): QuizItem[] {
  if (set.kind === "chapter") return ITEMS.filter((i) => i.use === "chapter" && i.chapter === set.chapter);
  return ITEMS.filter((i) => i.use === set.kind);
}

/** Wording for the learner's age group. Options and answer never change. */
export function promptFor(item: QuizItem, age: AgeGroup | null): T {
  return age === "beginner" && item.simple ? item.simple : item.prompt;
}

export interface ItemAttempt { firstCorrect: boolean; solved: boolean; tries: number }
export interface AssessmentState {
  v: 1;
  age: AgeGroup | null;
  attempts: Record<string, ItemAttempt>;
  /** ISO timestamps when a set was completed (every item solved). */
  completed: { pre?: string; post?: string; chapters: Record<string, string> };
}

export const newAssessment = (): AssessmentState => ({ v: ASSESSMENT_VERSION, age: null, attempts: {}, completed: { chapters: {} } });

const AGES: readonly AgeGroup[] = ["beginner", "intermediate", "advanced"];
const iso = (v: unknown) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v.slice(0, 40) : undefined);

export function sanitizeAssessment(raw: unknown): AssessmentState {
  const out = newAssessment();
  if (!raw || typeof raw !== "object") return out;
  const r = raw as Record<string, unknown>;
  if (r.v !== ASSESSMENT_VERSION) return out;
  out.age = AGES.includes(r.age as AgeGroup) ? (r.age as AgeGroup) : null;
  const a = r.attempts && typeof r.attempts === "object" ? (r.attempts as Record<string, unknown>) : {};
  for (const [id, v] of Object.entries(a)) {
    if (!ITEM_BY_ID.has(id) || !v || typeof v !== "object") continue;
    const x = v as Record<string, unknown>;
    if (typeof x.firstCorrect !== "boolean" || typeof x.solved !== "boolean") continue;
    if (x.firstCorrect && !x.solved) continue; // impossible state
    const tries = typeof x.tries === "number" && Number.isInteger(x.tries) && x.tries >= 1 ? Math.min(x.tries, 99) : 1;
    out.attempts[id] = { firstCorrect: x.firstCorrect, solved: x.solved, tries };
  }
  const c = r.completed && typeof r.completed === "object" ? (r.completed as Record<string, unknown>) : {};
  const done = (set: QuizSet) => itemsFor(set).every((i) => out.attempts[i.id]?.solved);
  if (iso(c.pre) && done({ kind: "pre" })) out.completed.pre = iso(c.pre);
  if (iso(c.post) && out.completed.pre && done({ kind: "post" })) out.completed.post = iso(c.post);
  const ch = c.chapters && typeof c.chapters === "object" ? (c.chapters as Record<string, unknown>) : {};
  for (const [k, v] of Object.entries(ch)) {
    const n = Number(k);
    if (Number.isInteger(n) && n >= 0 && n <= 4 && iso(v) && done({ kind: "chapter", chapter: n })) out.completed.chapters[k] = iso(v)!;
  }
  return out;
}

/** The post-assessment opens only after the pre-assessment is complete. */
export const canStart = (s: AssessmentState, set: QuizSet) => set.kind !== "post" || !!s.completed.pre;

/** Record one answer. Solved items are locked; first-try is fixed by the first answer. */
export function answer(s: AssessmentState, id: string, choice: number, now = new Date().toISOString()): { state: AssessmentState; correct: boolean } {
  const item = ITEM_BY_ID.get(id);
  if (!item || !Number.isInteger(choice) || choice < 0 || choice >= item.options.length) return { state: s, correct: false };
  if (item.use === "post" && !s.completed.pre) return { state: s, correct: false };
  const prior = s.attempts[id];
  if (prior?.solved) return { state: s, correct: choice === item.correct };
  const correct = choice === item.correct;
  const attempt: ItemAttempt = { firstCorrect: prior ? prior.firstCorrect : correct, solved: correct, tries: (prior?.tries ?? 0) + 1 };
  const next: AssessmentState = { ...s, attempts: { ...s.attempts, [id]: attempt }, completed: { ...s.completed, chapters: { ...s.completed.chapters } } };
  const done = (set: QuizSet) => itemsFor(set).every((i) => next.attempts[i.id]?.solved);
  if (item.use === "pre" && !next.completed.pre && done({ kind: "pre" })) next.completed.pre = now;
  if (item.use === "post" && !next.completed.post && done({ kind: "post" })) next.completed.post = now;
  if (item.use === "chapter" && item.chapter !== undefined && !next.completed.chapters[item.chapter] && done({ kind: "chapter", chapter: item.chapter })) next.completed.chapters[item.chapter] = now;
  return { state: next, correct };
}

export const setAge = (s: AssessmentState, age: AgeGroup | null): AssessmentState => ({ ...s, age });

export interface Score { answered: number; total: number; firstTry: number; assisted: number; pct: number | null }
/** First-try percentage over answered items of a set (null when nothing answered). */
export function scoreOf(s: AssessmentState, items: readonly QuizItem[]): Score {
  const answered = items.filter((i) => s.attempts[i.id]);
  const firstTry = answered.filter((i) => s.attempts[i.id].firstCorrect).length;
  const assisted = answered.filter((i) => s.attempts[i.id].solved && !s.attempts[i.id].firstCorrect).length;
  return { answered: answered.length, total: items.length, firstTry, assisted, pct: answered.length ? Math.round((firstTry / answered.length) * 100) : null };
}

export interface Comparison {
  pre: number | null; post: number | null; deltaPoints: number | null;
  byCompetency: { id: Competency; pre: number | null; post: number | null; deltaPoints: number | null }[];
}
/** Pre vs post, only from completed forms. Never inferred from game completion. */
export function compare(s: AssessmentState): Comparison {
  const pre = s.completed.pre ? scoreOf(s, itemsFor({ kind: "pre" })).pct : null;
  const post = s.completed.post ? scoreOf(s, itemsFor({ kind: "post" })).pct : null;
  return {
    pre, post, deltaPoints: pre !== null && post !== null ? post - pre : null,
    byCompetency: COMPETENCIES.map(({ id }) => {
      const p = s.completed.pre ? scoreOf(s, itemsFor({ kind: "pre" }).filter((i) => i.competency === id)).pct : null;
      const q = s.completed.post ? scoreOf(s, itemsFor({ kind: "post" }).filter((i) => i.competency === id)).pct : null;
      return { id, pre: p, post: q, deltaPoints: p !== null && q !== null ? q - p : null };
    }),
  };
}

export type MasteryLevel = "not-enough-evidence" | "needs-practice" | "developing" | "demonstrated";
/** Mastery from first-try answers on every answered item of a competency (challenges excluded). */
export function mastery(s: AssessmentState, competency: Competency): { level: MasteryLevel; share: number | null; answered: number; assisted: number } {
  const items = ITEMS.filter((i) => i.competency === competency && i.use !== "challenge" && s.attempts[i.id]);
  const first = items.filter((i) => s.attempts[i.id].firstCorrect).length;
  const assisted = items.filter((i) => s.attempts[i.id].solved && !s.attempts[i.id].firstCorrect).length;
  if (items.length < MIN_EVIDENCE) return { level: "not-enough-evidence", share: items.length ? first / items.length : null, answered: items.length, assisted };
  const share = first / items.length;
  const level: MasteryLevel = share >= MASTERY_AT ? "demonstrated" : share < PRACTICE_BELOW ? "needs-practice" : "developing";
  return { level, share, answered: items.length, assisted };
}

export interface Recommendation { competency: Competency; type: "practice" | "challenge"; itemId: string }
/**
 * Deterministic adaptive step per competency:
 * - needs practice → the first unanswered chapter item of that competency (an
 *   equivalent re-check with its own evidence and hint);
 * - demonstrated → its optional advanced challenge, if not yet attempted.
 */
export function recommendations(s: AssessmentState): Recommendation[] {
  const out: Recommendation[] = [];
  for (const { id } of COMPETENCIES) {
    const m = mastery(s, id);
    if (m.level === "needs-practice") {
      const next = ITEMS.find((i) => i.competency === id && i.use === "chapter" && !s.attempts[i.id]);
      if (next) out.push({ competency: id, type: "practice", itemId: next.id });
    } else if (m.level === "demonstrated") {
      const ch = ITEMS.find((i) => i.competency === id && i.use === "challenge" && !s.attempts[i.id]);
      if (ch) out.push({ competency: id, type: "challenge", itemId: ch.id });
    }
  }
  return out;
}

/** Items answered wrongly at first and then solved: misconceptions the learner corrected. */
export const correctedMisconceptions = (s: AssessmentState) =>
  ITEMS.filter((i) => s.attempts[i.id]?.solved && !s.attempts[i.id].firstCorrect).map((i) => i.id);

export { COMPETENCIES };
