/** Learning records are local, separate from campaign rewards, and never infer mastery from retries. */
import { EKO_STOPS } from "../../lib/eko-mission.ts";

export const LEARNING_VERSION = 1;
export const LEARNING_KEY = "game:last-light:learning";
export const LEARNING_OBJECTIVES = [
  { id: "traverse", chapter: 0, en: "Identify evidence of Opportunity's journey.", bn: "অপরচুনিটির যাত্রার প্রমাণ শনাক্ত করো।" },
  { id: "components", chapter: 1, en: "Relate rover components to their functions.", bn: "রোভারের অংশের সঙ্গে কাজের সম্পর্ক বোঝো।" },
  { id: "storm", chapter: 2, en: "Explain how dust affects solar power.", bn: "ধুলা কীভাবে সৌরশক্তিকে প্রভাবিত করে ব্যাখ্যা করো।" },
  { id: "images", chapter: 3, en: "Distinguish an image sent from one taken.", bn: "পাঠানো ছবি ও তোলা ছবির পার্থক্য বোঝো।" },
  { id: "conclusions", chapter: 4, en: "Identify when NASA declared the mission complete.", bn: "NASA কবে মিশন সমাপ্ত ঘোষণা করেছে তা শনাক্ত করো।" },
] as const;
export type Skill = typeof LEARNING_OBJECTIVES[number]["id"];
type Text = { en: string; bn: string };
export interface LearningQuestion {
  id: string; skill: Skill; chapter: number; difficulty: "explorer" | "investigator" | "scientist";
  prompt: Text; options: readonly Text[]; correct: number; explanation: Text; source: { label: string; url: string };
}
const fromStop = (id: string, skill: Skill, chapter: number): LearningQuestion => {
  const stop = EKO_STOPS.find(s => s.id === id)!;
  return { id, skill, chapter, difficulty: "explorer", prompt: stop.question, options: stop.options, correct: stop.correct, explanation: stop.fact, source: stop.source };
};
/** Existing reviewed Mission Stories questions are reused, not copied. */
export const LEARNING_QUESTIONS: readonly LearningQuestion[] = [
  fromStop("wheels", "traverse", 0),
  { id: "solar-component", skill: "components", chapter: 1, difficulty: "explorer",
    prompt: { en: "Which part supplied Opportunity with solar power?", bn: "কোন অংশ অপরচুনিটিকে সৌরশক্তি সরবরাহ করত?" },
    options: [{ en: "Solar panels", bn: "সৌর প্যানেল" }, { en: "Wheels", bn: "চাকা" }, { en: "Camera mast", bn: "ক্যামেরা মাস্ট" }], correct: 0,
    explanation: { en: "Opportunity used solar panels to generate power from sunlight.", bn: "অপরচুনিটি সূর্যের আলো থেকে বিদ্যুৎ উৎপাদনে সৌর প্যানেল ব্যবহার করত।" }, source: EKO_STOPS[1].source },
  fromStop("solar", "storm", 2), fromStop("camera", "images", 3), fromStop("sky", "conclusions", 4),
];
export interface Attempt { question: string; firstCorrect: boolean; solved: boolean }
export interface LearningProgress { v: 1; attempts: Attempt[] }
export function sanitizeLearning(raw: unknown): LearningProgress {
  const result: LearningProgress = { v: LEARNING_VERSION, attempts: [] };
  if (!raw || typeof raw !== "object") return result;
  const r = raw as { v?: unknown; attempts?: unknown };
  if (r.v !== LEARNING_VERSION || !Array.isArray(r.attempts)) return result;
  const valid = new Set(LEARNING_QUESTIONS.map(q => q.id));
  const seen = new Set<string>();
  for (const item of r.attempts) {
    if (!item || typeof item !== "object") continue;
    const a = item as Record<string, unknown>;
    if (typeof a.question !== "string" || !valid.has(a.question) || seen.has(a.question) || typeof a.firstCorrect !== "boolean" || typeof a.solved !== "boolean" || (a.firstCorrect && !a.solved)) continue;
    seen.add(a.question); result.attempts.push({ question: a.question, firstCorrect: a.firstCorrect, solved: a.solved });
  }
  return result;
}
export function answerLearning(progress: LearningProgress, id: string, answer: number): LearningProgress {
  const q = LEARNING_QUESTIONS.find(item => item.id === id);
  if (!q || !Number.isInteger(answer) || answer < 0 || answer >= q.options.length) return progress;
  const prior = progress.attempts.find(a => a.question === id);
  if (prior?.solved) return progress;
  const correct = answer === q.correct;
  const attempt = { question: id, firstCorrect: prior ? prior.firstCorrect : correct, solved: correct };
  return { ...progress, attempts: [...progress.attempts.filter(a => a.question !== id), attempt] };
}
/** First-attempt correctness is evidence of performance on this item, not a validated mastery claim. */
export function firstAttemptScore(progress: LearningProgress): number {
  return progress.attempts.filter(a => a.firstCorrect).length;
}

