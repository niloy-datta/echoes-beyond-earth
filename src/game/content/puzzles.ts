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
      /** HYPOTHESIZE: committed before the experiment unlocks; never graded. */
      prediction: { question: L; options: readonly { id: PowerPrediction; label: L }[] };
      question: L; options: readonly L[]; correct: number;
      /** Why a wrong option fails, pointing back at the evidence (index-aligned; null for the correct one). */
      hints: readonly (L | null)[];
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
    prediction: {
      question: {
        en: "Predict first: if the dust thickens from a usual sky (τ ≈ 0.5) to the June 2018 storm (τ ≈ 10.8), what happens to the direct sunlight on the panels?",
        bn: "আগে অনুমান করো: ধুলা স্বাভাবিক আকাশ (τ ≈ ০.৫) থেকে জুন ২০১৮-র ঝড়ে (τ ≈ ১০.৮) ঘন হলে প্যানেলে সরাসরি সূর্যালোকের কী হবে?",
      },
      options: [
        { id: "same", label: { en: "It barely changes", bn: "প্রায় একই থাকে" } },
        { id: "half", label: { en: "It drops to about half", bn: "প্রায় অর্ধেকে নামে" } },
        { id: "nearly-none", label: { en: "Almost none gets through", bn: "প্রায় কিছুই পৌঁছায় না" } },
      ],
    },
    question: { en: "What did the thickening storm do to Opportunity's power source?", bn: "ঘন হতে থাকা ঝড় অপরচুনিটির শক্তির উৎসে কী প্রভাব ফেলেছিল?" },
    options: [
      { en: "Less sunlight reached the solar panels", bn: "সৌর প্যানেলে কম সূর্যের আলো পৌঁছাত" },
      { en: "The wind recharged the batteries", bn: "বাতাস ব্যাটারি চার্জ করত" },
      { en: "The dust made the rover heavier so it could not move", bn: "ধুলায় রোভার ভারী হয়ে নড়তে পারত না" },
    ],
    correct: 0,
    hints: [
      null,
      {
        en: "Check the hardware you scanned in Chapter 02: Opportunity's power came from solar panels and rechargeable batteries. Nothing on it turned wind into electricity.",
        bn: "অধ্যায় ০২-এ স্ক্যান করা যন্ত্রাংশ মনে করো: অপরচুনিটির শক্তি আসত সৌর প্যানেল আর রিচার্জেবল ব্যাটারি থেকে। বাতাস থেকে বিদ্যুৎ বানানোর কোনো যন্ত্র ছিল না।",
      },
      {
        en: "Look at what your experiment changed: τ measures dust in the air between the Sun and the panels, not dust on the rover. Which quantity in the gauge fell?",
        bn: "তোমার পরীক্ষায় কী বদলেছে দেখো: τ মাপে সূর্য আর প্যানেলের মাঝের বাতাসে ধুলা, রোভারের গায়ের ধুলা নয়। মিটারে কোন মান কমেছে?",
      },
    ],
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

export type PowerPrediction = "same" | "half" | "nearly-none";

/** Published τ anchors (JPL estimates, OBSERVED) used by the Chapter 03 lab. */
export const TAU_USUAL = 0.5;
export const TAU_RECHARGE = 2;
export const TAU_STORM_PEAK = 10.8;

/**
 * SIMULATED: fraction of the direct solar beam that crosses a dusty column with
 * the sun overhead (Beer–Lambert, e^−τ). An explanatory model, not telemetry:
 * it ignores scattered light, sun angle, panel dust and the rover's actual load.
 */
export const directBeam = (tau: number) => Math.exp(-Math.max(0, Number.isFinite(tau) ? tau : 0));

/** Which prediction the model supports when τ rises from `from` to `to`. */
export function modelOutcome(from: number, to: number): PowerPrediction {
  const ratio = directBeam(to) / directBeam(from);
  if (ratio > 0.8) return "same";
  if (ratio > 0.2) return "half";
  return "nearly-none";
}

/** VERIFY: compare a committed prediction with the model, usual sky → storm peak. */
export function comparePrediction(prediction: PowerPrediction): { matches: boolean; outcome: PowerPrediction; ratio: number } {
  const outcome = modelOutcome(TAU_USUAL, TAU_STORM_PEAK);
  return { matches: prediction === outcome, outcome, ratio: directBeam(TAU_STORM_PEAK) / directBeam(TAU_USUAL) };
}

/** Illustrative relative light reaching a panel for a 0..1 dust slider (not telemetry). */
export const illustrativeLight = (dust: number) => Math.max(0.04, 1 - Math.min(1, Math.max(0, dust)) * 0.96);
