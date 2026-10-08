/**
 * Science and evidence puzzles. Answers are checked by pure functions so the
 * same validation runs in the 3D game, the 2D console and the unit tests.
 * Quiz content reuses the reviewed EKO clues in src/lib/eko-mission.ts.
 */
import { EKO_STOPS } from "../../lib/eko-mission.ts";
import type { L } from "./evidence.ts";

export interface QuizQuestion { prompt: L; options: readonly L[]; correct: number; evidence: string }

export type Puzzle =
  | {
      id: string; kind: "match"; title: L; intro: L;
      parts: readonly { id: string; label: L }[];
      clues: readonly { id: string; text: L; answer: string }[];
    }
  | {
      id: string; kind: "power"; title: L; intro: L;
      question: L; options: readonly L[]; correct: number;
    }
  | {
      id: string; kind: "order"; title: L; intro: L;
      events: readonly { id: string; label: L; when: L }[];
    }
  | { id: string; kind: "quiz"; title: L; intro: L; questions: readonly QuizQuestion[] };

const stop = (id: string) => {
  const s = EKO_STOPS.find((x) => x.id === id);
  if (!s) throw new Error(`Missing EKO stop ${id}`);
  return s;
};
const quizFrom = (id: string, evidence: string): QuizQuestion => {
  const s = stop(id);
  return { prompt: s.question, options: s.options, correct: s.correct, evidence };
};

export const PUZZLES: readonly Puzzle[] = [
  {
    id: "component-id",
    kind: "match",
    title: { en: "Rover component identification", bn: "রোভারের অংশ শনাক্ত করো" },
    intro: {
      en: "EKO's scanner recorded three clues. Match each clue to the part of Opportunity it describes.",
      bn: "ইকোর স্ক্যানার তিনটি সূত্র পেয়েছে। প্রতিটি সূত্র অপরচুনিটির কোন অংশের, মিলিয়ে দাও।",
    },
    parts: [
      { id: "wheels", label: { en: "Wheels", bn: "চাকা" } },
      { id: "solar", label: { en: "Solar panels", bn: "সৌর প্যানেল" } },
      { id: "mast", label: { en: "Pancam mast", bn: "প্যানক্যাম মাস্ট" } },
    ],
    clues: [
      { id: "c1", text: { en: "Turned sunlight into electricity.", bn: "সূর্যের আলোকে বিদ্যুতে রূপান্তর করত।" }, answer: "solar" },
      { id: "c2", text: { en: "Carried the rover 45.16 km across Mars.", bn: "রোভারকে মঙ্গলে ৪৫.১৬ কিমি বয়ে নিয়েছিল।" }, answer: "wheels" },
      { id: "c3", text: { en: "Captured the 354 images of the Legacy Pan.", bn: "লেগ্যাসি প্যানের ৩৫৪টি ছবি তুলেছিল।" }, answer: "mast" },
    ],
  },
  {
    id: "storm-power",
    kind: "power",
    title: { en: "Science decision: power in the storm", bn: "বিজ্ঞানের সিদ্ধান্ত: ঝড়ে বিদ্যুৎ" },
    intro: {
      en: "Drag the dust slider and watch the illustrative light gauge. This is a teaching model, not rover telemetry.",
      bn: "ধুলার স্লাইডার টেনে আলোর নির্দেশক দেখো। এটি শেখানোর মডেল, রোভারের টেলিমেট্রি নয়।",
    },
    question: { en: "What did the thickening storm do to Opportunity's power source?", bn: "ঘন হতে থাকা ঝড় অপরচুনিটির শক্তির উৎসে কী প্রভাব ফেলেছিল?" },
    options: [
      { en: "Less sunlight reached the solar panels", bn: "সৌর প্যানেলে কম সূর্যের আলো পৌঁছাত" },
      { en: "The wind recharged the batteries", bn: "বাতাস ব্যাটারি চার্জ করত" },
      { en: "The dust made the rover heavier so it could not move", bn: "ধুলায় রোভার ভারী হয়ে নড়তে পারত না" },
    ],
    correct: 0,
  },
  {
    id: "timeline",
    kind: "order",
    title: { en: "Reconstruct the mission timeline", bn: "মিশনের সময়রেখা সাজাও" },
    intro: {
      en: "Restore the archive by putting these NASA-documented events in order, earliest first.",
      bn: "NASA-নথিভুক্ত ঘটনাগুলো আগে থেকে পরে সাজিয়ে আর্কাইভ পুনরুদ্ধার করো।",
    },
    events: [
      { id: "land", label: { en: "Opportunity lands at Eagle crater", bn: "অপরচুনিটি ঈগল খাদে অবতরণ করে" }, when: { en: "Start of the traverse", bn: "যাত্রার শুরু" } },
      { id: "pan", label: { en: "Legacy Pan imaging begins", bn: "লেগ্যাসি প্যানের ছবি তোলা শুরু" }, when: { en: "May 13, 2018", bn: "১৩ মে ২০১৮" } },
      { id: "contact", label: { en: "Last contact with Opportunity", bn: "অপরচুনিটির সঙ্গে শেষ যোগাযোগ" }, when: { en: "June 10, 2018", bn: "১০ জুন ২০১৮" } },
      { id: "end", label: { en: "NASA declares the mission complete", bn: "NASA মিশন সম্পূর্ণ ঘোষণা করে" }, when: { en: "February 13, 2019", bn: "১৩ ফেব্রুয়ারি ২০১৯" } },
      { id: "release", label: { en: "NASA releases the last panorama", bn: "NASA শেষ প্যানোরামা প্রকাশ করে" }, when: { en: "March 12, 2019", bn: "১২ মার্চ ২০১৯" } },
    ],
  },
  {
    id: "final-assembly",
    kind: "quiz",
    title: { en: "Assemble the evidence", bn: "প্রমাণ একত্র করো" },
    intro: {
      en: "Place each recovered record back around Opportunity by answering from the evidence you collected.",
      bn: "সংগ্রহ করা প্রমাণ থেকে উত্তর দিয়ে প্রতিটি রেকর্ড অপরচুনিটির চারপাশে ফিরিয়ে দাও।",
    },
    questions: [
      quizFrom("wheels", "wheels"),
      quizFrom("solar", "storm"),
      quizFrom("camera", "last-image"),
      quizFrom("sky", "recovery"),
    ],
  },
];

export const PUZZLE_BY_ID: ReadonlyMap<string, Puzzle> = new Map(PUZZLES.map((p) => [p.id, p]));

/** The order puzzle is presented shuffled deterministically (never already solved). */
export function shuffledOrder(ids: readonly string[]): string[] {
  const out = [...ids];
  // Fixed derangement-style rotation + swap keeps it stable across renders/tests.
  out.push(out.shift()!);
  out.push(out.shift()!);
  [out[0], out[1]] = [out[1], out[0]];
  return out;
}

export function checkMatch(p: Extract<Puzzle, { kind: "match" }>, answers: Record<string, string>): boolean {
  return p.clues.every((c) => answers[c.id] === c.answer);
}
export function checkOrder(p: Extract<Puzzle, { kind: "order" }>, order: readonly string[]): boolean {
  return order.length === p.events.length && p.events.every((e, i) => order[i] === e.id);
}
export function checkPower(p: Extract<Puzzle, { kind: "power" }>, choice: number, exploredDust: number): boolean {
  return exploredDust >= 0.8 && choice === p.correct;
}
export function checkQuiz(p: Extract<Puzzle, { kind: "quiz" }>, answers: readonly number[]): boolean {
  return answers.length === p.questions.length && p.questions.every((q, i) => answers[i] === q.correct);
}

/** Illustrative relative light reaching a panel for a 0..1 dust slider (not telemetry). */
export const illustrativeLight = (dust: number) => Math.max(0.04, 1 - Math.min(1, Math.max(0, dust)) * 0.96);
