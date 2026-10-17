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
  | { id: string; kind: "quiz"; title: L; intro: L; questions: readonly QuizQuestion[] }
  | {
      id: string; kind: "compare"; title: L; intro: L;
      before: { title: L; image: string; sol: string; tau: string; description: L };
      after: { title: L; image: string; sol: string; tau: string; description: L };
      question: L;
      options: readonly L[];
      correct: number;
      explanation: L;
      hints?: readonly (L | null)[];
    }
  | {
      id: string; kind: "conclusion"; title: L; intro: L;
      requiredEvidence: readonly string[];
      hypotheses: readonly {
        id: string;
        claim: L;
        testedEvidence: string;
        verdict: "refuted" | "supported";
        reason: L;
        hint?: L;
      }[];
      correctHypothesis: string;
      synthesis: {
        title: L;
        takeaway: L;
      };
    };

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
    id: "optical-compare",
    kind: "compare",
    title: { en: "Optical evidence analysis: Pancam vs storm", bn: "অপটিক্যাল প্রমাণ বিশ্লেষণ: প্যানক্যাম বনাম ধুলিঝড়" },
    intro: {
      en: "Compare the 354-frame Legacy Panorama composite with the final transmitted frame (PIA22929) to determine how atmospheric dust blocked solar rays.",
      bn: "৩৫৪-ফ্রেমের লেগ্যাসি প্যানোরামা মোজাইক এবং শেষ পাঠানো ট্রান্সমিশন ফ্রেম (PIA22929) পাশাপাশি তুলনা করে দেখো কীভাবে বায়ুমণ্ডলীয় ধুলা সূর্যালোক আটকে দিয়েছিল।",
    },
    before: {
      title: { en: "Legacy Pan Composite (PIA22909)", bn: "লেগ্যাসি প্যান মোজাইক (PIA22909)" },
      image: "/images/nasa/pia22909.jpg",
      sol: "Sols 5084–5111 (May 13 – June 10, 2018)",
      tau: "Estimated ~0.6–0.9 (Pre-storm baseline)",
      description: {
        en: "Panoramic camera composite of 354 individual frames collected across multiple sols overlooking Endeavour Crater.",
        bn: "পারসিভিয়ারেন্স ভ্যালিতে এনডেভার খাদের কিনারায় একাধিক সলে প্যানক্যামের ৩৫৪টি আলাদা ফ্রেমের সমন্বয়ে তৈরি মোজাইক।",
      },
    },
    after: {
      title: { en: "Last Transmitted Frame (PIA22929)", bn: "শেষ পাঠানো ফ্রেম (PIA22929)" },
      image: "/images/nasa/pia22929.jpg",
      sol: "Sol 5111 (June 10, 2018)",
      tau: "Estimated Tau ≈ 10.8 (Extreme Dust)",
      description: {
        en: "Last telemetry data sent by Opportunity. White speckles are normal camera sensor noise accentuated by dark sky; missing bottom rows occurred when communication dropped during transmission.",
        bn: "অপরচুনিটি থেকে পাঠানো শেষ টেলিমেট্রি ফ্রেম। সাদা ফুটকিগুলো ক্যামেরার সাধারণ সেন্সর নয়েজ যা চরম অন্ধকারে দৃশ্যমান; সম্প্রচারের সময় সংযোগ বিচ্ছিন্ন হওয়ায় নিচের সারিগুলো পৌঁছায়নি।",
      },
    },
    question: {
      en: "Why does the final image transmitted on Sol 5111 (PIA22929) contain white speckles and missing bottom lines?",
      bn: "সল ৫১১১-তে পাঠানো শেষ ছবিতে (PIA22929) সাদা ফুটকি এবং নিচের দিকের ফাঁকা সারি থাকার কারণ কী?",
    },
    options: [
      {
        en: "The speckles are camera sensor noise visible in deep darkness, and transmission cut off when communication dropped",
        bn: "ফুটকিগুলো ক্যামেরার সাধারণ সেন্সর নয়েজ যা চরম অন্ধকারে দৃশ্যমান হয়, এবং সম্প্রচারের সময় যোগাযোগ বিচ্ছিন্ন হওয়ায় নিচের সারি কাটা পড়ে",
      },
      {
        en: "The rover's camera lens physically cracked from Martian atmospheric pressure",
        bn: "মঙ্গলের বায়ুমণ্ডলীয় চাপে ক্যামেরার লেন্স ফেটে গিয়েছিল",
      },
      {
        en: "Opportunity deleted the bottom half to preserve radio transmission speed",
        bn: "রেডিও গতি বাড়াতে অপরচুনিটি ছবির নিচের অংশ মুছে ফেলেছিল",
      },
    ],
    correct: 0,
    explanation: {
      en: "NASA documented that Pancam's white speckles are camera sensor noise that appears on dark frames. The missing bottom rows occurred because the spacecraft lost communication with Earth mid-transmission. Thumbnails captured 3 minutes later (PIA22930) were the last images taken and provided the Tau ≈ 10.8 estimate.",
      bn: "NASA নথিতে ব্যাখ্যা করেছে যে সাদা ফুটকিগুলো প্যানক্যামের সেন্সর নয়েজ যা অন্ধকার ফ্রেমে দৃশ্যমান হয়। সম্প্রচার চলাকালেই পৃথিবীর সাথে যোগাযোগ বিচ্ছিন্ন হওয়ায় নিচের সারিগুলো কাটা পড়েছিল। ৩ মিনিট পরের থাম্বনেইল (PIA22930) ছিল শেষ ধারণকৃত ছবি এবং তা থেকে টাউ ≈ ১০.৮ অনুমান করা হয়।",
    },
    hints: [
      null,
      {
        en: "Recall the hardware specs: Opportunity operated for over 14 years in the thin Martian atmosphere; atmospheric pressure does not crack Pancam lenses.",
        bn: "যন্ত্রাংশের বিবরণ মনে করো: অপরচুনিটি ১৪ বছরেরও বেশি মঙ্গলের পাতলা বায়ুমণ্ডলে কাজ করেছে; বায়ুমণ্ডলীয় চাপে লেন্স ফাটার কোনো ঘটনা ঘটেনি।",
      },
      {
        en: "Review the telemetry record: the partial frame was not an intentional deletion, but an interrupted transmission stream when signal was lost.",
        bn: "টেলিমেট্রি রেকর্ড পর্যালোচনা করো: অসম্পূর্ণ ফ্রেমটি কোনো ইচ্ছাকৃত মুছে ফেলা নয়, বরং সংকেত হারানোর কারণে সম্প্রচার বাধাগ্রস্ত হয়েছিল।",
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
    kind: "conclusion",
    title: { en: "Scientific conclusion: The fate of Opportunity", bn: "বৈজ্ঞানিক সিদ্ধান্ত: অপরচুনিটির পরিণতি" },
    intro: {
      en: "Synthesize the expedition's findings. Test each hypothesis against your recovered evidence to formulate an authentic NASA scientific conclusion.",
      bn: "অভিযানের তথ্যগুলো একত্র করো। সংগৃহীত প্রমাণের ভিত্তিতে প্রতিটি অনুসিদ্ধান্ত পরীক্ষা করে সঠিক বৈজ্ঞানিক সিদ্ধান্তে পৌঁছাও।",
    },
    requiredEvidence: ["solar", "storm", "last-image"],
    hypotheses: [
      {
        id: "h-wheels",
        claim: {
          en: "Mechanical drive failure permanently trapped the rover in Martian sands",
          bn: "যান্ত্রিক ত্রুটিতে রোভারের চাকা গভীর বালিতে আটকে পড়েছিল",
        },
        testedEvidence: "wheels",
        verdict: "refuted",
        reason: {
          en: "NASA's traverse map proves Opportunity drove 45.16 km to solid bedrock on the Endeavour rim; drive motors were still operational.",
          bn: "NASA-র মানচিত্র প্রমাণ করে অপরচুনিটি ৪৫.১৬ কিমি পথ পাড়ি দিয়ে শক্ত পাথরে পৌঁছেছিল; চাকার মোটর সচল ছিল।",
        },
        hint: {
          en: "Evidence check: The traverse map and wheel records confirm Opportunity was driving on solid bedrock when the storm arrived, not stuck in sand.",
          bn: "প্রমাণ পরীক্ষা: ট্রাভার্স ম্যাপ ও চাকার তথ্য নিশ্চিত করে ঝড় আসার সময় অপরচুনিটি শক্ত পাথরে অবস্থান করছিল, বালিতে আটকে নয়।",
        },
      },
      {
        id: "h-software",
        claim: {
          en: "A flight software crash or CPU memory erasure caused system shutdown",
          bn: "ফ্লাইট সফটওয়্যারের বিপর্যয়ে সিস্টেম মেমোরি মুছে গিয়ে রোভার বন্ধ হয়",
        },
        testedEvidence: "last-image",
        verdict: "refuted",
        reason: {
          en: "JPL confirmed command sequences and telemetry transmissions executed normally up until loss of signal on Sol 5111; no flight software crash occurred.",
          bn: "JPL নিশ্চিত করেছে সল ৫১১১-তে সংকেত হারানোর মুহূর্ত পর্যন্ত কমান্ড ও টেলিমেট্রি স্বাভাবিকভাবে চলছিল; কোনো সফটওয়্যার বিপর্যয় ঘটেনি।",
        },
        hint: {
          en: "Evidence check: Last-transmitted telemetry (PIA22929) shows the flight computer faithfully executed its sequence until power dropped.",
          bn: "প্রমাণ পরীক্ষা: শেষ প্রেরিত টেলিমেট্রি (PIA22929) প্রমাণ করে ফ্লাইট কম্পিউটার বিদ্যুৎ ফুরিয়ে যাওয়ার আগ পর্যন্ত স্বাভাবিক কমান্ড পরিচালনা করছিল।",
        },
      },
      {
        id: "h-thermal",
        claim: {
          en: "Atmospheric dust starved solar panels of light, preventing survival heaters from protecting electronics against Martian cold",
          bn: "চরম বায়ুমণ্ডলীয় ধুলায় সৌরবিদ্যুৎ হ্রাস পায়, ফলে রাতে অভ্যন্তরীণ হিটার না চলায় চরম ঠান্ডায় ইলেকট্রনিক্স ক্ষতিগ্রস্ত হয়",
        },
        testedEvidence: "solar",
        verdict: "supported",
        reason: {
          en: "Planet-wide dust storm (estimated Tau ≈ 10.8) dropped daily energy to ~22 Wh (far below the ~100 Wh/sol needed for survival heaters); JPL's primary hypothesis is that inability to heat the rover through Martian winter caused low-power and mission clock faults.",
          bn: "গ্রহজুড়ে ধুলিঝড়ে (আনুমানিক টাউ ≈ ১০.৮) দৈনিক বিদ্যুৎ নেমে যায় মাত্র ২২ ওয়াট-ঘণ্টায় (হিটার চালাতে যা লাগত প্রায় ১০০ ওয়াট-ঘণ্টা); JPL-এর প্রধান অনুসিদ্ধান্ত অনুযায়ী মঙ্গলের তীব্র শীতে হিটার বন্ধ থাকায় লো-পাওয়ার ও মিশন ক্লক ফল্ট দেখা দেয়।",
        },
        hint: {
          en: "Supported by evidence: The solar panels and storm records prove sunlight fell below the power needed to keep survival heaters running during sub-zero Martian nights.",
          bn: "প্রমাণ দ্বারা সমর্থিত: সৌর প্যানেল ও ঝড়ের রেকর্ড প্রমাণ করে সূর্যালোক কমে যাওয়ায় মঙ্গলের চরম ঠান্ডায় সারভাইভাল হিটার চালানোর মতো শক্তি অবশিষ্ট ছিল না।",
        },
      },
    ],
    correctHypothesis: "h-thermal",
    synthesis: {
      title: {
        en: "NASA Scientific Legacy Synthesis",
        bn: "NASA বৈজ্ঞানিক উত্তরাধিকার সংশ্লেষণ",
      },
      takeaway: {
        en: "Opportunity completed 15 years on a 90-sol design, discovered definitive hematite spherules ('blueberries') proving past liquid water on Mars, and demonstrated the vulnerability of solar power to global dust storms compared to radioisotope systems like MMRTGs.",
        bn: "অপরচুনিটি ৯০ সলের নকশায় ১৫ বছর টিকে মঙ্গলে প্রাচীন তরল পানির প্রমাণস্বরূপ হেমাটাইট 'ব্লুবেরি' আবিষ্কার করেছে, এবং ধুলিঝড়ে সৌরশক্তির সীমাবদ্ধতা তুলে ধরে রেডিওআইসোটোপ পাওয়ার সিস্টেমের (MMRTG) গুরুত্ব প্রদর্শন করেছে।",
      },
    },
  },
];

export const PUZZLE_BY_ID: ReadonlyMap<string, Puzzle> = new Map(PUZZLES.map((p) => [p.id, p]));

/** The order puzzle is presented shuffled deterministically (never already solved). */
export function shuffledOrder(ids: readonly string[]): string[] {
  const out = [...ids];
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
export function checkCompare(p: Extract<Puzzle, { kind: "compare" }>, choice: number, exploredSlider: boolean): boolean {
  return exploredSlider && choice === p.correct;
}
export function checkConclusion(
  p: Extract<Puzzle, { kind: "conclusion" }>,
  selectedEvidence: readonly string[],
  chosenHypothesis: string,
  availableEvidence?: readonly string[]
): boolean {
  if (availableEvidence && !selectedEvidence.every((e) => availableEvidence.includes(e))) {
    return false;
  }
  const hasAll = p.requiredEvidence.every((e) => selectedEvidence.includes(e));
  return hasAll && chosenHypothesis === p.correctHypothesis;
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
