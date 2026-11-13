/**
 * EKO guidance: context-aware, non-repetitive help. Pure functions, so the 3D
 * game, the 2D console and the unit tests share one behaviour.
 *
 * Everything EKO says here is fictional companion dialogue about the *game*
 * (where the next marker is, which evidence to re-read). It never claims to be
 * a NASA transmission and adds no new historical facts.
 */
import type { Line } from "../content/cutscenes.ts";
import type { LearnerBand } from "../content/echoChain.ts";

type L = { en: string; bn: string };

/** Seconds of standing still, away from the target, before the first hint (Young Scientist default). */
export const HINT_IDLE_FIRST = 18;
/** First-hint delay per learner band: younger players get help sooner. */
export const HINT_IDLE_FIRST_BY_BAND: Readonly<Record<LearnerBand, number>> = { junior: 12, young: HINT_IDLE_FIRST, research: 25 };
/** Wrong attempts on one puzzle before EKO switches to a simplified explanation. */
export const SIMPLIFY_AFTER: Readonly<Record<LearnerBand, number>> = { junior: 1, young: 2, research: 2 };
/** Further idle seconds before the second (last) hint for the same objective. */
export const HINT_IDLE_REPEAT = 40;
/** At most this many navigation hints per objective, so EKO never nags. */
export const HINT_MAX_PER_OBJECTIVE = 2;

const DIRS: readonly L[] = [
  { en: "north", bn: "উত্তরে" }, { en: "north-east", bn: "উত্তর-পূর্বে" },
  { en: "east", bn: "পূর্বে" }, { en: "south-east", bn: "দক্ষিণ-পূর্বে" },
  { en: "south", bn: "দক্ষিণে" }, { en: "south-west", bn: "দক্ষিণ-পশ্চিমে" },
  { en: "west", bn: "পশ্চিমে" }, { en: "north-west", bn: "উত্তর-পশ্চিমে" },
];

/** World convention (matches the HUD compass): north is −z, east is +x. */
export function compassDirection(from: { x: number; z: number }, to: { x: number; z: number }): L {
  const bearing = Math.atan2(to.x - from.x, -(to.z - from.z)); // 0 = north, clockwise
  const sector = Math.round(((bearing / (Math.PI * 2)) * 8 + 8)) % 8;
  return DIRS[sector];
}

const toBn = (n: number) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

/** Rounded, honest distance: nearest 5 m below 50 m, nearest 10 m beyond. */
export function roundedDistance(d: number): number {
  const m = Math.max(0, d);
  return m < 50 ? Math.max(5, Math.round(m / 5) * 5) : Math.round(m / 10) * 10;
}

/** Navigation hint: escalates from direction only to direction + distance. */
export function navigationHint(from: { x: number; z: number }, to: { x: number; z: number }, level: number): Line {
  const dir = compassDirection(from, to);
  const m = roundedDistance(Math.hypot(to.x - from.x, to.z - from.z));
  if (level <= 0) {
    return { speaker: "eko", emotion: "curious", text: { en: `Need a nudge? Our next marker is ${dir.en} of here.`, bn: `একটু সাহায্য লাগবে? আমাদের পরের চিহ্ন এখান থেকে ${dir.bn}।` } };
  }
  return {
    speaker: "eko", emotion: "hopeful",
    text: {
      en: `Follow the compass marker: about ${m} m ${dir.en}. You can also open the map with M.`,
      bn: `কম্পাসের চিহ্ন ধরে চলো: প্রায় ${toBn(m)} মিটার ${dir.bn}। M চাপলে মানচিত্রও খুলবে।`,
    },
  };
}

/**
 * Decide whether EKO should offer a navigation hint now. `given` is how many
 * hints this objective already received; `idle` is seconds standing still.
 */
export function shouldHint(opts: { idle: number; given: number; distance: number; reach: number; busy: boolean; band?: LearnerBand }): boolean {
  if (opts.busy || opts.given >= HINT_MAX_PER_OBJECTIVE) return false;
  if (opts.distance <= opts.reach + 2) return false; // already there: the prompt explains what to do
  const needed = opts.given === 0 ? HINT_IDLE_FIRST_BY_BAND[opts.band ?? "young"] : HINT_IDLE_REPEAT;
  return opts.idle >= needed;
}

/** Evidence-pointing nudges after a wrong puzzle answer (never the answer itself). */
export const WRONG_ANSWER_HINTS: Readonly<Record<string, readonly L[]>> = {
  "component-id": [
    { en: "Re-read each clue and think about what that part physically does.", bn: "প্রতিটি সূত্র আবার পড়ো, আর ভাবো অংশটি আসলে কী কাজ করে।" },
    { en: "Try the inventory (Tab): the evidence cards for the wheels, panels and mast describe each job.", bn: "ইনভেন্টরি (Tab) দেখো: চাকা, প্যানেল আর মাস্টের প্রমাণ-কার্ডে প্রতিটির কাজ লেখা আছে।" },
  ],
  "storm-power": [
    { en: "Look at what your experiment changed: the dust between the Sun and the panels.", bn: "তোমার পরীক্ষায় কী বদলেছে দেখো: সূর্য আর প্যানেলের মাঝের ধুলা।" },
  ],
  timeline: [
    { en: "Check the dates on each record. The earliest event goes first.", bn: "প্রতিটি রেকর্ডের তারিখ দেখো। সবচেয়ে আগের ঘটনা প্রথমে।" },
    { en: "Remember: NASA released the Legacy Pan after the last contact, not before.", bn: "মনে রেখো: শেষ যোগাযোগের পরে NASA লেগ্যাসি প্যান প্রকাশ করেছে, আগে নয়।" },
  ],
  "final-assembly": [
    { en: "Each question names the record it comes from. Open the journal (J) and re-read that one.", bn: "প্রতিটি প্রশ্নে কোন রেকর্ড থেকে এসেছে লেখা আছে। জার্নাল (J) খুলে সেটি আবার পড়ো।" },
  ],
  "lunar-record": [
    { en: "Surveyor 3 was a lander that had stopped working. Could it move, or send anything?", bn: "সার্ভেয়ার ৩ ছিল এক অচল ল্যান্ডার। এটি কি নড়তে পারত, বা কিছু পাঠাতে পারত?" },
    { en: "Ask what scientists can learn by holding real hardware after years on the Moon.", bn: "ভাবো, চাঁদে বছরের পর বছর থাকা আসল যন্ত্রাংশ হাতে পেয়ে বিজ্ঞানীরা কী জানতে পারেন।" },
  ],
};

/**
 * Simplified explanation of the underlying idea, used after repeated difficulty.
 * Same science as the puzzle, plainer words; it explains the concept rather
 * than listing the answer key.
 */
export const SIMPLE_EXPLANATIONS: Readonly<Record<string, L>> = {
  "component-id": { en: "Think of jobs: one part catches sunlight, one part rolls, one part looks around and takes pictures.", bn: "কাজ দিয়ে ভাবো: একটি অংশ সূর্যের আলো ধরে, একটি গড়িয়ে চলে, একটি চারপাশ দেখে ছবি তোলে।" },
  "storm-power": { en: "Dust in the sky works like a curtain. Thicker curtain, less sunlight. A solar rover needs sunlight to make power.", bn: "আকাশের ধুলা পর্দার মতো। পর্দা যত ঘন, সূর্যের আলো তত কম। সৌরচালিত রোভারের শক্তি বানাতে সূর্যের আলো লাগে।" },
  timeline: { en: "Pictures are taken before they can be shared. First Oppy took the panorama, then contact was lost, and NASA published it later.", bn: "ছবি আগে তোলা হয়, পরে প্রকাশ হয়। আগে অপি প্যানোরামা তোলে, তারপর যোগাযোগ হারায়, পরে NASA তা প্রকাশ করে।" },
  "final-assembly": { en: "Every answer is already on a card you collected. Open Evidence (Tab) and find the card named next to each question.", bn: "প্রতিটি উত্তর তোমার সংগ্রহ করা কোনো কার্ডেই আছে। Evidence (Tab) খুলে প্রতিটি প্রশ্নের পাশে লেখা কার্ডটি খোঁজো।" },
  "lunar-record": { en: "A broken machine cannot move or talk. But people can pick up its parts and study how years on the Moon changed them.", bn: "অচল যন্ত্র নড়তে বা কথা বলতে পারে না। কিন্তু মানুষ এর অংশ তুলে এনে দেখতে পারে, চাঁদে বছরের পর বছর থাকায় সেগুলো কীভাবে বদলেছে।" },
};

/**
 * The n-th wrong attempt's support (0-based). Hints rotate; once the learner
 * has struggled `SIMPLIFY_AFTER[band]` times, EKO gives the simplified explanation.
 */
export function wrongAnswerHint(puzzleId: string, attempt: number, band: LearnerBand = "young"): Line | null {
  const pool = WRONG_ANSWER_HINTS[puzzleId];
  if (!pool?.length) return null;
  const simple = SIMPLE_EXPLANATIONS[puzzleId];
  if (simple && attempt >= SIMPLIFY_AFTER[band]) return { speaker: "eko", emotion: "hopeful", text: simple };
  const text = pool[Math.max(0, attempt) % pool.length];
  return { speaker: "eko", emotion: "concerned", text };
}
