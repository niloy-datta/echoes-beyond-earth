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
  | { id: string; kind: "quiz"; title: L; intro: L; questions: readonly QuizQuestion[] }
  | {
      id: string; kind: "compare"; title: L; intro: L;
      before: { title: L; image: string; sol: string; tau: string; description: L };
      after: { title: L; image: string; sol: string; tau: string; description: L };
      question: L;
      options: readonly L[];
      correct: number;
      explanation: L;
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
    question: { en: "What did the thickening storm do to Opportunity's power source?", bn: "ঘন হতে থাকা ঝড় অপরচুনিটির শক্তির উৎসে কী প্রভাব ফেলেছিল?" },
    options: [
      { en: "Less sunlight reached the solar panels", bn: "সৌর প্যানেলে কম সূর্যের আলো পৌঁছাত" },
      { en: "The wind recharged the batteries", bn: "বাতাস ব্যাটারি চার্জ করত" },
      { en: "The dust made the rover heavier so it could not move", bn: "ধুলায় রোভার ভারী হয়ে নড়তে পারত না" },
    ],
    correct: 0,
  },
  {
    id: "optical-compare",
    kind: "compare",
    title: { en: "Optical evidence analysis: Pancam vs storm", bn: "অপটিক্যাল প্রমাণ বিশ্লেষণ: প্যানক্যাম বনাম ধুলিঝড়" },
    intro: {
      en: "Compare the 354-frame Legacy Panorama with the final transmitted frame (PIA22929) to determine how atmospheric dust blocked solar rays.",
      bn: "৩৫৪-ফ্রেমের লেগ্যাসি প্যানোরামা এবং শেষ পাঠানো ট্রান্সমিশন ফ্রেম (PIA22929) পাশাপাশি তুলনা করে দেখো কীভাবে বায়ুমণ্ডলীয় ধুলা সূর্যালোক আটকে দিয়েছিল।",
    },
    before: {
      title: { en: "Legacy Pan (Sol 5084)", bn: "লেগ্যাসি প্যান (সল ৫০৮৪)" },
      image: "/images/nasa/pia22909.jpg",
      sol: "Sol 5084–5111",
      tau: "Tau ~ 0.6 (Clear Sky)",
      description: {
        en: "Panoramic camera captures sharp Martian terrain with direct sunlight visible.",
        bn: "প্যানোরামিক ক্যামেরায় স্পষ্ট দৃশ্য ও সরাসরি সূর্যালোক ধরা পড়েছে।",
      },
    },
    after: {
      title: { en: "Last Data Sent (PIA22929)", bn: "শেষ পাঠানো ডেটা (PIA22929)" },
      image: "/images/nasa/pia22909.jpg",
      sol: "Sol 5111 (June 10, 2018)",
      tau: "Tau > 10.8 (Extreme Opacity)",
      description: {
        en: "Dark, noisy frame with missing bottom rows. Transmission was cut mid-frame as battery voltage plummeted.",
        bn: "অন্ধকার, শব্দযুক্ত ফ্রেম যার নিচের সারিগুলো অনুপস্থিত। ব্যাটারির ভোল্টেজ নিচে নেমে যাওয়ায় সম্প্রচার মাঝপথেই থেমে গিয়েছিল।",
      },
    },
    question: {
      en: "Why does the final image transmitted on Sol 5111 contain white noise pixels and missing bottom lines?",
      bn: "সল ৫১১১-তে পাঠানো শেষ ছবিতে সাদা নয়েজ পিক্সেল এবং নিচের দিকের লাইনগুলো খালি কেন?",
    },
    options: [
      {
        en: "Dust blocked sunlight and low battery voltage truncated the telemetry packet mid-transmission",
        bn: "বায়ুমণ্ডলীয় ধুলা আলো আটকে দিয়েছিল এবং কম ভোল্টেজের কারণে টেলিমেট্রি প্যাকেট অসম্পূর্ণ থেকে যায়",
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
      en: "NASA engineers verified that extreme dust opacity cut solar generation below the transmitter threshold, truncating the transmission.",
      bn: "NASA প্রকৌশলীরা নিশ্চিত করেছেন যে চরম ধুলার কারণে সম্প্রচার চলাকালেই সৌরবিদ্যুৎ রেডিও সীমার নিচে নেমে যায়, ফলে ফ্রেমটি অসম্পূর্ণ থেকে যায়।",
    },
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
      },
      {
        id: "h-software",
        claim: {
          en: "A flight software crash or CPU corruption caused memory erasure",
          bn: "ফ্লাইট সফটওয়্যারের বিপর্যয়ে নেভিগেশন মেমোরি মুছে গিয়েছিল",
        },
        testedEvidence: "last-image",
        verdict: "refuted",
        reason: {
          en: "The flight computer correctly executed command sequences on Sol 5111 until battery bus voltage collapsed.",
          bn: "ফ্লাইট কম্পিউটার সল ৫১১১-তে নির্ধারিত কমান্ড সফলভাবে এক্সিকিউট করেছিল যতক্ষণ না ভোল্টেজ হ্রাস পায়।",
        },
      },
      {
        id: "h-thermal",
        claim: {
          en: "Atmospheric dust starved solar panels, freezing survival heaters during the Martian night",
          bn: "চরম বায়ুমণ্ডলীয় ধুলায় সৌরবিদ্যুৎ হ্রাস পেয়ে অভ্যন্তরীণ হিটার ও মিশন ক্লক জমে গিয়েছিল",
        },
        testedEvidence: "solar",
        verdict: "supported",
        reason: {
          en: "Planet-wide dust storm (Tau > 10.8) dropped daily energy below the 22 Wh survival heater threshold; nighttime temperatures (-100°C) halted the internal clock.",
          bn: "গ্রহজুড়ে ধুলিঝড়ে (টাউ > ১০.৮) দৈনিক বিদ্যুৎ ২২ ওয়াট-ঘণ্টার নিচে নেমে যায়; রাতের প্রচণ্ড ঠান্ডায় (-১০০°সে) অভ্যন্তরীণ ঘড়ি বন্ধ হয়ে যায়।",
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
        en: "Opportunity completed 15 years on a 90-sol design, discovered definitive hematite spherules ('blueberries') proving past liquid water, and proved why next-generation rovers (Curiosity, Perseverance) require nuclear MMRTG power.",
        bn: "অপরচুনিটি ৯০ সলের নকশায় ১৫ বছর টিকে মঙ্গলে হেমাটাইট 'ব্লুবেরি' আবিষ্কারের মাধ্যমে প্রাচীন তরল পানির অস্তিত্ব প্রমাণ করেছে এবং পরবর্তী প্রজন্মের জন্য পারমাণবিক আরটিজি শক্তির অপরিহার্যতা প্রতিষ্ঠা করেছে।",
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
  chosenHypothesis: string
): boolean {
  const hasAll = p.requiredEvidence.every((e) => selectedEvidence.includes(e));
  return hasAll && chosenHypothesis === p.correctHypothesis;
}
export function checkQuiz(p: Extract<Puzzle, { kind: "quiz" }>, answers: readonly number[]): boolean {
  return answers.length === p.questions.length && p.questions.every((q, i) => answers[i] === q.correct);
}

/** Illustrative relative light reaching a panel for a 0..1 dust slider (not telemetry). */
export const illustrativeLight = (dust: number) => Math.max(0.04, 1 - Math.min(1, Math.max(0, dust)) * 0.96);
