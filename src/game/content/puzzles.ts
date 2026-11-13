/**
 * Science and evidence puzzles. Answers are checked by pure functions so the
 * same validation runs in the 3D game, the 2D console and the unit tests.
 * Quiz content reuses the reviewed EKO clues in src/lib/eko-mission.ts.
 */
import { EKO_STOPS } from "../../lib/eko-mission.ts";
import type { L } from "./evidence.ts";

/** Learner band (mirrors echoChain.ts / settings.ts). Presentation only. */
type Band = "junior" | "young" | "research";

export interface QuizQuestion {
  prompt: L; options: readonly L[]; correct: number; evidence: string;
  /** EXPLAIN: shown after a correct answer: what the evidence supports and what it cannot establish. */
  explain?: L;
  /**
   * Optional wording per learner band. Options, the correct index and the
   * evidence never change, so the science and the grading are identical.
   */
  byBand?: Partial<Record<Band, { prompt: L; explain?: L }>>;
}

/** The wording a learner sees for this band (falls back to the default wording). */
export function questionFor(q: QuizQuestion, band: Band): { prompt: L; explain?: L } {
  const v = q.byBand?.[band];
  return { prompt: v?.prompt ?? q.prompt, explain: v?.explain ?? q.explain };
}

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
      en: "Scientists track dust with τ (tau), the sky's opacity. Raise τ toward the 2018 storm and watch the sky — and the sunlight on Oppy's panels — fade.",
      bn: "বিজ্ঞানীরা ধুলা মাপেন τ (টাউ) দিয়ে — আকাশের অস্বচ্ছতা। τ বাড়িয়ে ২০১৮-র ঝড়ের দিকে নাও, দেখো আকাশ আর অপির প্যানেলের আলো কীভাবে কমে।",
    },
    prediction: {
      question: {
        en: "Predict first: if the dust thickens from a low-dust sky (model value τ 0.5) to the June 2018 storm (JPL estimate τ ≈ 10.8), what happens to the direct sunlight on the panels?",
        bn: "আগে অনুমান করো: ধুলা কম-ধুলার আকাশ (মডেলের মান τ ০.৫) থেকে জুন ২০১৮-র ঝড়ে (JPL-এর অনুমান τ ≈ ১০.৮) ঘন হলে প্যানেলে সরাসরি সূর্যালোকের কী হবে?",
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
  {
    // Moon-Mars link (Chapter 04): what returned hardware can and cannot tell us.
    id: "lunar-record",
    kind: "quiz",
    title: { en: "The forgotten explorer", bn: "ভুলে যাওয়া অভিযাত্রী" },
    intro: {
      en: "Observe the two lunar records, then interpret them. No one has visited Opportunity on Mars, but on the Moon astronauts once walked up to a silent robot.",
      bn: "চাঁদের দুটি রেকর্ড দেখো, তারপর ব্যাখ্যা করো। অপরচুনিটির কাছে আর কেউ যেতে পারেনি, কিন্তু চাঁদে একবার নভোচারীরা এক নীরব রোবটের কাছে হেঁটে গিয়েছিলেন।",
    },
    questions: [
      {
        prompt: { en: "Why could Apollo 12 bring Surveyor 3 parts back when no one could do that for Opportunity?", bn: "অ্যাপোলো ১২ কেন সার্ভেয়ার ৩-এর অংশ ফিরিয়ে আনতে পেরেছিল, অথচ অপরচুনিটির জন্য তা কেউ পারেনি?" },
        options: [
          { en: "A crewed lander set down about 180 m away, so astronauts could walk to it", bn: "মানুষবাহী ল্যান্ডার প্রায় ১৮০ মিটার দূরে নেমেছিল, তাই নভোচারীরা হেঁটে যেতে পেরেছিলেন" },
          { en: "Surveyor 3 radioed Earth to ask for a pickup", bn: "সার্ভেয়ার ৩ রেডিওতে পৃথিবীকে তুলে নিতে বলেছিল" },
          { en: "Surveyor 3 drove itself to the Apollo landing site", bn: "সার্ভেয়ার ৩ নিজেই চালিয়ে অ্যাপোলোর অবতরণস্থলে গিয়েছিল" },
        ],
        correct: 0,
        evidence: "apollo12-retrieval",
        byBand: {
          junior: {
            prompt: { en: "Apollo 12 landed close to an old robot on the Moon. Why could the astronauts walk over to it?", bn: "অ্যাপোলো ১২ চাঁদে একটি পুরোনো রোবটের কাছে নেমেছিল। নভোচারীরা হেঁটে কেন সেখানে যেতে পারলেন?" },
            explain: { en: "Because the lander set down only about 180 m away: close enough to walk. The robot itself could not move.", bn: "কারণ ল্যান্ডার মাত্র প্রায় ১৮০ মিটার দূরে নেমেছিল: হেঁটে যাওয়ার মতো কাছে। রোবটটি নিজে নড়তে পারত না।" },
          },
          research: {
            prompt: { en: "Apollo 12 landed about 180 m from Surveyor 3. Which explanation best accounts for the astronauts retrieving its parts?", bn: "অ্যাপোলো ১২ সার্ভেয়ার ৩ থেকে প্রায় ১৮০ মিটার দূরে নেমেছিল। নভোচারীরা কীভাবে তার অংশ ফিরিয়ে আনতে পেরেছিলেন—কোন ব্যাখ্যাটি সবচেয়ে ভালো?" },
          },
        },
        explain: {
          en: "Supported: NASA records Apollo 12 landing within about 180 m of the inactive lander. Surveyor 3 was a stationary lander that had stopped working; it did not call for help or move.",
          bn: "প্রমাণসমর্থিত: NASA-র রেকর্ডে অ্যাপোলো ১২ নিষ্ক্রিয় ল্যান্ডারের প্রায় ১৮০ মিটারের মধ্যে নামে। সার্ভেয়ার ৩ ছিল স্থির, অচল ল্যান্ডার; এটি সাহায্য চায়নি, নড়েওনি।",
        },
      },
      {
        prompt: { en: "Scientists examined the returned camera and scoop on Earth. What could those parts tell them that photos alone could not?", bn: "বিজ্ঞানীরা ফিরিয়ে আনা ক্যামেরা ও স্কুপ পৃথিবীতে পরীক্ষা করেন। কোন তথ্য শুধু ছবি থেকে পাওয়া যেত না, কিন্তু এই অংশগুলো থেকে পাওয়া গেল?" },
        options: [
          { en: "What Surveyor 3 observed after it went silent", bn: "নীরব হওয়ার পরে সার্ভেয়ার ৩ কী দেখেছিল" },
          { en: "How about two and a half years on the lunar surface affected real spacecraft hardware, examined up close", bn: "চাঁদের পৃষ্ঠে প্রায় আড়াই বছর থাকায় আসল মহাকাশযানের যন্ত্রাংশে কী প্রভাব পড়েছে, কাছ থেকে পরীক্ষা করে" },
          { en: "That Opportunity's dust storm also reached the Moon", bn: "অপরচুনিটির ধুলিঝড় চাঁদেও পৌঁছেছিল" },
        ],
        correct: 1,
        evidence: "apollo12-retrieval",
        byBand: {
          junior: {
            prompt: { en: "Scientists looked at the TV camera and scoop after they came back to Earth. What did they learn about the Moon from them?", bn: "বিজ্ঞানীরা পৃথিবীতে ফিরে টিভি ক্যামেরা আর স্কুপ দেখেন। এগুলো থেকে চাঁদ সম্পর্কে কী জানলেন?" },
            explain: { en: "They learned how two and a half years on the Moon had changed real hardware. Photos alone could not show that.", bn: "তাঁরা জানলেন চাঁদে আড়াই বছর থাকায় আসল যন্ত্রাংশে কী বদল হয়েছে। শুধু ছবিতে তা দেখা যেত না।" },
          },
          research: {
            prompt: { en: "Which investigation could use the returned parts as direct physical evidence, rather than relying on photographs alone?", bn: "শুধু ছবির ওপর নির্ভর না করে ফিরিয়ে আনা অংশকে সরাসরি বস্তুগত প্রমাণ হিসেবে কোন গবেষণায় ব্যবহার করা যায়?" },
          },
        },
        explain: {
          en: "Supported: the parts were removed after nearly two and a half years of exposure so they could be studied on Earth. These parts do not establish what Surveyor observed after its last contact or what the weather was like on Mars. Even when a machine goes quiet, what it leaves behind can keep teaching.",
          bn: "প্রমাণসমর্থিত: প্রায় আড়াই বছর উন্মুক্ত থাকার পর অংশগুলো খুলে আনা হয়, যাতে পৃথিবীতে সেগুলো গবেষণা করা যায়। এই অংশগুলো থেকে শেষ যোগাযোগের পর সার্ভেয়ার কী দেখেছিল বা মঙ্গলের আবহাওয়া কেমন ছিল তা জানা যায় না। যন্ত্র নীরব হলেও তার রেখে যাওয়া প্রমাণ শেখাতে থাকে।",
        },
      },
    ],
  },
];

/**
 * Learning objective of each puzzle: what a player should be able to explain
 * afterwards. Shown in the local learning record; never sent anywhere.
 */
export const LEARNING_GOALS: Readonly<Record<string, L>> = {
  "component-id": { en: "Name Opportunity's wheels, solar panels and Pancam mast and say what each did.", bn: "অপরচুনিটির চাকা, সৌর প্যানেল ও প্যানক্যাম মাস্টের নাম ও কাজ বলতে পারা।" },
  "storm-power": { en: "Explain why a thicker dust sky (higher τ) starves a solar rover of power.", bn: "ব্যাখ্যা করতে পারা, ধুলার আকাশ ঘন হলে (τ বাড়লে) কেন সৌরচালিত রোভার শক্তি হারায়।" },
  timeline: { en: "Order the end of the mission: Legacy Pan, last contact, mission end, NASA release.", bn: "মিশনের শেষ পর্ব ক্রমে সাজাতে পারা: লেগ্যাসি প্যান, শেষ যোগাযোগ, মিশন সমাপ্তি, NASA-র প্রকাশ।" },
  "lunar-record": { en: "Explain what returned Surveyor 3 hardware could and could not tell scientists.", bn: "ব্যাখ্যা করতে পারা, ফিরিয়ে আনা সার্ভেয়ার ৩-এর যন্ত্রাংশ বিজ্ঞানীদের কী জানাতে পারত, কী পারত না।" },
  "final-assembly": { en: "Back each claim about Opportunity with the NASA record it comes from.", bn: "অপরচুনিটি সম্পর্কে প্রতিটি দাবিকে তার NASA রেকর্ড দিয়ে সমর্থন করতে পারা।" },
};

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

/**
 * τ anchors for the Chapter 03 lab.
 * - TAU_USUAL is ILLUSTRATIVE: a low-dust reference sky for the model. No NASA
 *   page we could verify gives a "usual" τ for Opportunity's site, so the UI
 *   labels it as a simulation value, not a measurement.
 * - TAU_PREVIOUS_STORM and TAU_STORM_PEAK are OBSERVED JPL estimates:
 *   "The previous storm had an opacity level, or tau, somewhere above 5.5" and
 *   "this new storm had an estimated tau of 10.8 as of Sunday morning" (June 10, 2018).
 *   Source: JPL, "Opportunity Hunkers Down During Dust Storm" (TAU_SOURCE).
 */
export const TAU_SOURCE = "https://www.jpl.nasa.gov/news/opportunity-hunkers-down-during-dust-storm";
export const TAU_USUAL = 0.5;
/**
 * OBSERVED values computed from NASA PDS product 1TAU880_5106_20181207A
 * (Opportunity Pancam 880 nm, median per sol; see scripts/data/build-mer1-opacity.mjs).
 * A unit test checks these against public/data/nasa/mer1-opacity.json.
 */
export const PDS_TAU = {
  product: "1TAU880_5106_20181207A",
  url: "https://pds-geosciences.wustl.edu/mer/mer1_mer2-m-pancam-5-atmos-opacity-v1/merao_1xxx/data/1tau880_5106_20181207a.tab",
  typical: 0.689,
  sol5102: 0.758,
  sol5105: 2.259,
} as const;
export const TAU_PREVIOUS_STORM = 5.5;
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
