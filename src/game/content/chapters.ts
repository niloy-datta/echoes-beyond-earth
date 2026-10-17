/**
 * The five-chapter campaign. Each chapter is a list of steps; every objective
 * in a step is active at once (multi-objective exploration), and the next step
 * unlocks when the current one is complete.
 */
import type { L } from "./evidence.ts";
import type { Line } from "./cutscenes.ts";
import type { EkoEmotion } from "../core/companion.ts";

export type ObjectiveKind = "cutscene" | "reach" | "scan" | "puzzle";

export interface Objective {
  id: string;
  kind: ObjectiveKind;
  text: L;
  xp: number;
  /** Point of interest for reach/scan (and optional for puzzles). */
  target?: string;
  cutscene?: string;
  puzzle?: string;
  /** Evidence granted on completion. */
  evidence?: string;
  /** EKO lines spoken when the objective becomes active / completes. */
  onStart?: readonly Line[];
  onComplete?: readonly Line[];
  /** Tutorial hint shown in the HUD while the objective is active. */
  tutorial?: "move" | "look" | "sprint" | "interact" | "jump";
}

export interface Chapter {
  id: "awakening" | "footprints" | "storm" | "echoes" | "last-light";
  number: string;
  title: L;
  dek: L;
  spawn: { x: number; z: number; yaw: number };
  /** Dust level at the start and at the end of the chapter (0 clear .. 1 dense). */
  storm: [number, number];
  mood: EkoEmotion;
  hints: readonly L[];
  steps: readonly (readonly Objective[])[];
}

export interface SideDiscovery { id: string; target: string; evidence: string; xp: number; fromChapter: number; line: Line }

export const CHAPTERS: readonly Chapter[] = [
  {
    id: "awakening",
    number: "01",
    title: { en: "The Awakening", bn: "জাগরণ" },
    dek: { en: "A silent plain. A companion wakes. A first memory.", bn: "নিঃশব্দ প্রান্তর। জেগে ওঠে এক সঙ্গী। প্রথম স্মৃতি।" },
    spawn: { x: 0, z: 70, yaw: Math.PI },
    storm: [0, 0.02],
    mood: "curious",
    hints: [
      { en: "Follow EKO toward the glowing waypoint on the ridge.", bn: "ঢালের উজ্জ্বল নির্দেশক চিহ্নের দিকে ইকোকে অনুসরণ করো।" },
      { en: "Press Shift to sprint, and press E near the beacon to scan.", bn: "দ্রুত যেতে Shift চাপো এবং বিকনের কাছে E চেপে স্ক্যান করো।" },
    ],
    steps: [
      [{ id: "c1-intro", kind: "cutscene", cutscene: "intro", xp: 0, text: { en: "Wake up", bn: "জেগে ওঠো" } }],
      [{
        id: "c1-move", kind: "reach", target: "ridge", xp: 40, tutorial: "move",
        text: { en: "Walk to the marker on the ridge", bn: "পাহাড়ি ঢালের চিহ্নের কাছে হাঁটো" },
        onStart: [{ speaker: "eko", emotion: "excited", text: { en: "Try walking with me — up to that marker on the ridge.", bn: "আমার সঙ্গে হাঁটো — ঢালের ওই চিহ্ন পর্যন্ত।" } }],
        onComplete: [{ speaker: "eko", emotion: "excited", text: { en: "Perfect. Hold sprint to cover ground faster.", bn: "দারুণ! দ্রুত যেতে স্প্রিন্ট চেপে রাখো।" } }],
      }],
      [{
        id: "c1-beacon", kind: "scan", target: "beacon-alpha", evidence: "traverse", xp: 80, tutorial: "interact",
        text: { en: "Scan the memory beacon", bn: "স্মৃতি-বিকন স্ক্যান করো" },
        onStart: [{ speaker: "eko", emotion: "curious", text: { en: "I'm picking up a memory beacon to the west. Get close and scan it.", bn: "পশ্চিমে একটি স্মৃতি-বিকন পাচ্ছি। কাছে গিয়ে স্ক্যান করো।" } }],
        onComplete: [{ speaker: "eko", emotion: "discovery", text: { en: "A real NASA record: Opportunity's 45.16-kilometre route!", bn: "একটি আসল NASA রেকর্ড: অপরচুনিটির ৪৫.১৬ কিলোমিটার পথ!" } }],
      }],
      [{ id: "c1-outro", kind: "cutscene", cutscene: "ch1-outro", xp: 30, text: { en: "Follow the signal", bn: "সংকেত অনুসরণ করো" } }],
    ],
  },
  {
    id: "footprints",
    number: "02",
    title: { en: "Footprints in the Dust", bn: "ধুলায় পদচিহ্ন" },
    dek: { en: "Meet the rover. Learn how it worked.", bn: "রোভারের সঙ্গে দেখা। জানো এটি কীভাবে কাজ করত।" },
    spawn: { x: -9, z: 33, yaw: Math.PI * 0.8 },
    storm: [0.02, 0.12],
    mood: "curious",
    hints: [
      { en: "Follow the rover tire tracks south-east to reach Opportunity.", bn: "অপরচুনিটির কাছে যেতে দক্ষিণ-পূর্বে চাকার দাগ ধরে চলো।" },
      { en: "Inspect all three key subsystems: wheels, solar panels, and the Pancam mast.", bn: "তিনটি প্রধান অংশই পরীক্ষা করো: চাকা, সৌর প্যানেল ও প্যানক্যাম মাস্ট।" },
    ],
    steps: [
      [{
        id: "c2-reach", kind: "reach", target: "rover-site", xp: 50,
        text: { en: "Follow the tracks to Opportunity", bn: "চাকার দাগ ধরে অপরচুনিটির কাছে যাও" },
        onStart: [{ speaker: "eko", emotion: "excited", text: { en: "See those tracks? Follow them south-east.", bn: "চাকার দাগগুলো দেখছ? দক্ষিণ-পূর্বে অনুসরণ করো।" } }],
      }],
      [{ id: "c2-intro", kind: "cutscene", cutscene: "ch2-intro", xp: 0, text: { en: "Meet Oppy", bn: "অপির সঙ্গে দেখা" } }],
      [
        {
          id: "c2-wheels", kind: "scan", target: "comp-wheels", evidence: "wheels", xp: 60,
          text: { en: "Scan the wheels", bn: "চাকা স্ক্যান করো" },
          onStart: [{ speaker: "eko", emotion: "curious", text: { en: "Three parts tell its story: wheels, solar panels and the camera mast. Any order.", bn: "তিনটি অংশ এর গল্প বলে: চাকা, সৌর প্যানেল আর ক্যামেরা মাস্ট। যেকোনো ক্রমে।" } }],
        },
        { id: "c2-solar", kind: "scan", target: "comp-solar", evidence: "solar", xp: 60, text: { en: "Scan the solar panels", bn: "সৌর প্যানেল স্ক্যান করো" } },
        { id: "c2-mast", kind: "scan", target: "comp-mast", evidence: "pancam", xp: 60, text: { en: "Scan the Pancam mast", bn: "প্যানক্যাম মাস্ট স্ক্যান করো" } },
      ],
      [{
        id: "c2-puzzle", kind: "puzzle", puzzle: "component-id", target: "rover-terminal", xp: 120,
        text: { en: "Identify the rover components at the field terminal", bn: "ফিল্ড টার্মিনালে রোভারের অংশ শনাক্ত করো" },
        onStart: [{ speaker: "eko", emotion: "excited", text: { en: "I set up a field terminal beside the rover. Let's check what we learned.", bn: "রোভারের পাশে একটি ফিল্ড টার্মিনাল বসিয়েছি। চলো যা শিখলাম যাচাই করি।" } }],
      }],
      [{ id: "c2-outro", kind: "cutscene", cutscene: "ch2-outro", xp: 30, text: { en: "Watch the sky", bn: "আকাশ দেখো" } }],
    ],
  },
  {
    id: "storm",
    number: "03",
    title: { en: "The Great Storm", bn: "মহাঝড়" },
    dek: { en: "The light fades. Recover the records of June 2018.", bn: "আলো কমে আসে। ২০১৮ সালের জুনের রেকর্ড উদ্ধার করো।" },
    spawn: { x: 14, z: -6, yaw: Math.PI * 1.05 },
    storm: [0.2, 0.95],
    mood: "concerned",
    hints: [
      { en: "In the dense dust storm, use your compass and audio pings to locate records.", bn: "ঘন ধুলিঝড়ে কম্পাস ও অডিও সংকেত অনুসরণ করে রেকর্ড খুঁজুন।" },
      { en: "Drag the dust slider past 80% to see how extreme atmospheric Tau cuts light.", bn: "চরম বায়ুমণ্ডলীয় ধুলার প্রভাব দেখতে স্লাইডার ৮০%-এর ওপরে টানুন।" },
    ],
    steps: [
      [{ id: "c3-intro", kind: "cutscene", cutscene: "ch3-intro", xp: 0, text: { en: "The sky changes", bn: "আকাশ বদলায়" } }],
      [{
        id: "c3-record1", kind: "scan", target: "storm-record-1", evidence: "storm", xp: 80,
        text: { en: "Recover the storm record", bn: "ঝড়ের রেকর্ড উদ্ধার করো" },
        onStart: [{ speaker: "eko", emotion: "concerned", text: { en: "Stay close. The first record is just south of here.", bn: "কাছাকাছি থাকো। প্রথম রেকর্ডটি ঠিক দক্ষিণে।" } }],
      }],
      [{
        id: "c3-power", kind: "puzzle", puzzle: "storm-power", target: "storm-terminal", xp: 120,
        text: { en: "Work out why the power faded", bn: "বিদ্যুৎ কেন কমল তা বের করো" },
        onStart: [{ speaker: "eko", emotion: "concerned", text: { en: "There's a science terminal ahead. Let's understand the power problem.", bn: "সামনে একটি বিজ্ঞান টার্মিনাল আছে। চলো বিদ্যুতের সমস্যাটা বুঝি।" } }],
      }],
      [
        {
          id: "c3-record2", kind: "scan", target: "storm-record-2", evidence: "last-image", xp: 90,
          text: { en: "Recover the last transmission record", bn: "শেষ সম্প্রচারের রেকর্ড উদ্ধার করো" },
          onStart: [{ speaker: "eko", emotion: "sad", text: { en: "Two records left in the dust. I can explain them — I won't invent what Oppy said.", bn: "ধুলায় আরও দুটি রেকর্ড। আমি ব্যাখ্যা করতে পারি — অপি কী বলেছিল তা বানাব না।" } }],
        },
        { id: "c3-record3", kind: "scan", target: "storm-record-3", evidence: "recovery", xp: 90, text: { en: "Recover the recovery-attempts record", bn: "উদ্ধারচেষ্টার রেকর্ড উদ্ধার করো" } },
      ],
      [{ id: "c3-outro", kind: "cutscene", cutscene: "ch3-outro", xp: 40, text: { en: "Silence", bn: "নীরবতা" } }],
    ],
  },
  {
    id: "echoes",
    number: "04",
    title: { en: "Echoes of the Past", bn: "অতীতের প্রতিধ্বনি" },
    dek: { en: "A holographic archive. Restore the memory fragments.", bn: "এক হলোগ্রাফিক আর্কাইভ। স্মৃতিখণ্ড পুনরুদ্ধার করো।" },
    spawn: { x: -18, z: -50, yaw: Math.PI * 0.25 },
    storm: [0.45, 0.3],
    mood: "hopeful",
    hints: [
      { en: "Head north-west toward the archive structure and activate all four glowing pedestals.", bn: "উত্তর-পশ্চিমে আর্কাইভ কাঠামোর দিকে যান এবং চারটি উজ্জ্বল বেদি সক্রিয় করুন।" },
      { en: "Compare the optical frames at the terminal, then arrange the mission timeline from earliest to latest.", bn: "টার্মিনালে অপটিক্যাল ছবিগুলো তুলনা করুন, এরপর সময়রেখাটি ক্রমে সাজান।" },
    ],
    steps: [
      [{
        id: "c4-reach", kind: "reach", target: "archive", xp: 50,
        text: { en: "Find the archive", bn: "আর্কাইভ খুঁজে বের করো" },
        onStart: [{ speaker: "eko", emotion: "curious", text: { en: "The archive signal is north-west. Follow my marker.", bn: "আর্কাইভের সংকেত উত্তর-পশ্চিমে। আমার চিহ্ন অনুসরণ করো।" } }],
      }],
      [{ id: "c4-intro", kind: "cutscene", cutscene: "ch4-intro", xp: 0, text: { en: "Enter the archive", bn: "আর্কাইভে প্রবেশ" } }],
      [
        { id: "c4-frag-traverse", kind: "scan", target: "frag-traverse", evidence: "traverse", xp: 40, text: { en: "Restore fragment: the route", bn: "খণ্ড পুনরুদ্ধার: যাত্রাপথ" } },
        { id: "c4-frag-pan", kind: "scan", target: "frag-pan", evidence: "pancam", xp: 40, text: { en: "Restore fragment: the panorama", bn: "খণ্ড পুনরুদ্ধার: প্যানোরামা" } },
        { id: "c4-frag-storm", kind: "scan", target: "frag-storm", evidence: "storm", xp: 40, text: { en: "Restore fragment: the storm", bn: "খণ্ড পুনরুদ্ধার: ঝড়" } },
        { id: "c4-frag-image", kind: "scan", target: "frag-image", evidence: "last-image", xp: 40, text: { en: "Restore fragment: the last image", bn: "খণ্ড পুনরুদ্ধার: শেষ ছবি" } },
      ],
      [{
        id: "c4-compare", kind: "puzzle", puzzle: "optical-compare", target: "archive-core", xp: 100,
        text: { en: "Analyze optical evidence and storm opacity at the archive core", bn: "আর্কাইভ কেন্দ্রে অপটিক্যাল প্রমাণ ও ঝড়ের আলোহীনতা বিশ্লেষণ করো" },
        onStart: [{ speaker: "eko", emotion: "curious", text: { en: "Let's analyze the images: look at the clear panorama versus the dark frame sent in June 2018.", bn: "ছবিগুলো বিশ্লেষণ করি: পরিষ্কার প্যানোরামা এবং ২০১৮ সালের জুনের অন্ধকার ফ্রেম পাশাপাশি দেখো।" } }],
        onComplete: [{ speaker: "eko", emotion: "discovery", text: { en: "Analysis complete! Extreme dust opacity dropped power to critical levels and transmission was interrupted by loss of signal.", bn: "বিশ্লেষণ সফল! চরম ধুলার কারণে শক্তি সংকট দেখা দেয় এবং সংকেত বিচ্ছিন্ন হওয়ায় সম্প্রচার অসম্পূর্ণ থাকে।" } }],
      }],
      [{
        id: "c4-timeline", kind: "puzzle", puzzle: "timeline", target: "archive-core", xp: 140,
        text: { en: "Reconstruct the timeline at the archive core", bn: "আর্কাইভ কেন্দ্রে সময়রেখা সাজাও" },
        onStart: [{ speaker: "eko", emotion: "excited", text: { en: "All fragments analyzed. Now put the historical events in chronological order.", bn: "সব খণ্ড বিশ্লেষণ হয়েছে। এবার ঐতিহাসিক ঘটনাগুলো সময়ানুক্রমে সাজাও।" } }],
        onComplete: [{ speaker: "eko", emotion: "discovery", text: { en: "The archive unlocked a final record — the panorama NASA released after the silence.", bn: "আর্কাইভ একটি শেষ রেকর্ড খুলেছে — নীরবতার পরে NASA-র প্রকাশ করা প্যানোরামা।" } }],
        evidence: "legacy-release",
      }],
      [{ id: "c4-outro", kind: "cutscene", cutscene: "ch4-outro", xp: 30, text: { en: "The timeline holds", bn: "সময়রেখা মিলেছে" } }],
    ],
  },
  {
    id: "last-light",
    number: "05",
    title: { en: "The Last Light", bn: "শেষ আলো" },
    dek: { en: "Return to Oppy. Synthesize scientific evidence.", bn: "অপির কাছে ফিরে যাও। বৈজ্ঞানিক প্রমাণ সংশ্লেষণ করো।" },
    spawn: { x: -28, z: -20, yaw: -Math.PI * 0.6 },
    storm: [0.3, 0.55],
    mood: "hopeful",
    hints: [
      { en: "Head east back to Opportunity where the memorial beacons are placed.", bn: "স্মৃতি-বিকনগুলোর কাছে পূর্বে অপরচুনিটির মূল স্থানে ফিরে যান।" },
      { en: "Test the three scientific hypotheses using your gathered evidence to form the final NASA conclusion.", bn: "সংগৃহীত প্রমাণের সাহায্যে তিনটি অনুসিদ্ধান্ত পরীক্ষা করে চূড়ান্ত বৈজ্ঞানিক সিদ্ধান্তে পৌঁছান।" },
    ],
    steps: [
      [{
        id: "c5-return", kind: "reach", target: "rover-return", xp: 60,
        text: { en: "Return to Opportunity", bn: "অপরচুনিটির কাছে ফিরে যাও" },
        onStart: [{ speaker: "eko", emotion: "hopeful", text: { en: "Let's bring everything we found back to Oppy.", bn: "যা পেলাম সব অপির কাছে ফিরিয়ে নিই।" } }],
      }],
      [{
        id: "c5-assemble", kind: "puzzle", puzzle: "final-assembly", target: "rover-return", xp: 200,
        text: { en: "Synthesize the NASA scientific conclusion around Opportunity", bn: "অপরচুনিটিকে ঘিরে NASA বৈজ্ঞানিক সিদ্ধান্তে উপনীত হও" },
        onStart: [{ speaker: "eko", emotion: "hopeful", text: { en: "Test each hypothesis against the real evidence. Let's establish the true scientific conclusion.", bn: "আসল প্রমাণের ভিত্তিতে প্রতিটি অনুসিদ্ধান্ত পরীক্ষা করো। চলো সত্য বৈজ্ঞানিক সিদ্ধান্ত লিপিবদ্ধ করি।" } }],
        onComplete: [{ speaker: "eko", emotion: "excited", text: { en: "Scientific conclusion verified! Opportunity's 15-year journey changed planetary exploration forever.", bn: "বৈজ্ঞানিক সিদ্ধান্ত প্রমাণিত! অপরচুনিটির ১৫ বছরের যাত্রা মহাকাশ বিজ্ঞানকে চিরতরে বদলে দিয়েছে।" } }],
      }],
      [{ id: "c5-finale", kind: "cutscene", cutscene: "finale", xp: 100, text: { en: "The Last Light", bn: "শেষ আলো" } }],
    ],
  },
];

export const SIDE_DISCOVERIES: readonly SideDiscovery[] = [
  { id: "side-twin", target: "side-twin", evidence: "twin", xp: 50, fromChapter: 1, line: { speaker: "eko", emotion: "discovery", text: { en: "A side record! Opportunity had a twin: Spirit.", bn: "একটি বাড়তি রেকর্ড! অপরচুনিটির এক যমজ ছিল: স্পিরিট।" } } },
  { id: "side-rim", target: "side-rim", evidence: "rim", xp: 50, fromChapter: 1, line: { speaker: "eko", emotion: "discovery", text: { en: "From up here you can imagine a crater rim. Opportunity's last valley was on one.", bn: "এখান থেকে খাদের কিনারা কল্পনা করা যায়। অপরচুনিটির শেষ উপত্যকা ছিল এমনই এক কিনারায়।" } } },
  { id: "side-sol", target: "side-sol", evidence: "sol", xp: 50, fromChapter: 1, line: { speaker: "eko", emotion: "discovery", text: { en: "Sols! That's how Mars missions count their days.", bn: "সল! মঙ্গল মিশন এভাবেই দিন গোনে।" } } },
];

export const ALL_OBJECTIVES: readonly Objective[] = CHAPTERS.flatMap((c) => c.steps.flat());
export const OBJECTIVE_BY_ID: ReadonlyMap<string, Objective> = new Map(ALL_OBJECTIVES.map((o) => [o.id, o]));
export const chapterOfObjective = (id: string) => CHAPTERS.findIndex((c) => c.steps.some((s) => s.some((o) => o.id === id)));

export interface Achievement { id: string; title: L; description: L; icon: string }
export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: "first-steps", icon: "◈", title: { en: "First Steps", bn: "প্রথম পদক্ষেপ" }, description: { en: "Finish the movement tutorial.", bn: "চলার টিউটোরিয়াল শেষ করো।" } },
  { id: "first-memory", icon: "✦", title: { en: "First Memory", bn: "প্রথম স্মৃতি" }, description: { en: "Recover your first NASA record.", bn: "প্রথম NASA রেকর্ড উদ্ধার করো।" } },
  { id: "component-specialist", icon: "⚙", title: { en: "Component Specialist", bn: "অংশ বিশেষজ্ঞ" }, description: { en: "Identify Opportunity's components.", bn: "অপরচুনিটির অংশগুলো শনাক্ত করো।" } },
  { id: "storm-navigator", icon: "☄", title: { en: "Storm Navigator", bn: "ঝড়ের দিশারি" }, description: { en: "Complete The Great Storm.", bn: "মহাঝড় অধ্যায় শেষ করো।" } },
  { id: "archivist", icon: "▤", title: { en: "Archivist", bn: "আর্কাইভিস্ট" }, description: { en: "Reconstruct the mission timeline.", bn: "মিশনের সময়রেখা সাজাও।" } },
  { id: "last-light", icon: "☀", title: { en: "Keeper of the Last Light", bn: "শেষ আলোর রক্ষক" }, description: { en: "Complete the campaign.", bn: "পুরো অভিযান শেষ করো।" } },
  { id: "sharp-mind", icon: "✓", title: { en: "Sharp Mind", bn: "তীক্ষ্ণ মন" }, description: { en: "Solve three puzzles on the first try.", bn: "প্রথম চেষ্টায় তিনটি ধাঁধা সমাধান করো।" } },
  { id: "wanderer", icon: "⌖", title: { en: "Wanderer", bn: "ভ্রমণকারী" }, description: { en: "Find all three side discoveries.", bn: "তিনটি বাড়তি আবিষ্কারই খুঁজে পাও।" } },
  { id: "long-walk", icon: "∞", title: { en: "The Long Walk", bn: "দীর্ঘ পথ" }, description: { en: "Walk 1 km in the game world.", bn: "গেমের জগতে ১ কিমি হাঁটো।" } },
];

export const LEVELS: readonly { xp: number; title: L }[] = [
  { xp: 0, title: { en: "Cadet", bn: "ক্যাডেট" } },
  { xp: 150, title: { en: "Surveyor", bn: "জরিপকারী" } },
  { xp: 400, title: { en: "Field Geologist", bn: "মাঠ ভূতত্ত্ববিদ" } },
  { xp: 800, title: { en: "Mission Specialist", bn: "মিশন বিশেষজ্ঞ" } },
  { xp: 1300, title: { en: "Archivist", bn: "আর্কাইভিস্ট" } },
  { xp: 1900, title: { en: "Keeper of the Last Light", bn: "শেষ আলোর রক্ষক" } },
];
