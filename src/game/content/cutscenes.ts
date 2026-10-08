/**
 * Skippable in-engine cinematics. Camera keys are given as ground-relative
 * anchors ({x, z, h}: h metres above the terrain at x/z) so they stay correct
 * whatever the terrain generator produces. EKO's words are fictional; any
 * historical statement it makes restates a cited NASA fact.
 */
import type { L } from "./evidence.ts";
import { ARCHIVE_POSITION, ROVER_POSITION } from "./world.ts";
import type { EkoEmotion } from "../core/companion.ts";

export type Anchor = { x: number; z: number; h: number };
export interface Shot { from: Anchor; to: Anchor; lookFrom: Anchor; lookTo: Anchor; duration: number }
export type Speaker = "eko" | "narrator" | "record";
export interface Line { speaker: Speaker; text: L; emotion?: EkoEmotion }
export interface TimedLine extends Line { at: number }

export interface Cutscene {
  id: string;
  shots: readonly Shot[];
  lines: readonly TimedLine[];
  /** Always-visible honesty label for artistic reconstructions. */
  label?: L;
  /** Story lighting override while playing, 0 (clear) .. 1 (dense dust). */
  storm?: [number, number];
}

const R = ROVER_POSITION, A = ARCHIVE_POSITION;

export const CUTSCENES: readonly Cutscene[] = [
  {
    id: "intro",
    label: { en: "Artistic landscape — not a surveyed NASA landing site", bn: "শিল্পিত ভূদৃশ্য — জরিপ করা NASA অবতরণস্থল নয়" },
    shots: [
      { from: { x: -40, z: 110, h: 34 }, to: { x: -10, z: 96, h: 22 }, lookFrom: { x: 10, z: 20, h: 2 }, lookTo: { x: 0, z: 60, h: 2 }, duration: 6 },
      { from: { x: 6, z: 80, h: 6 }, to: { x: 3, z: 75.5, h: 2.6 }, lookFrom: { x: 0, z: 70, h: 1.4 }, lookTo: { x: 0, z: 70, h: 1.5 }, duration: 5.5 },
      { from: { x: 2.6, z: 73, h: 2.1 }, to: { x: 2.2, z: 72.6, h: 2 }, lookFrom: { x: 1.2, z: 71, h: 1.7 }, lookTo: { x: 1.2, z: 71, h: 1.7 }, duration: 6 },
    ],
    lines: [
      { at: 0.4, speaker: "narrator", text: { en: "Mars. A quiet plain, painted for this story.", bn: "মঙ্গল। এই গল্পের জন্য আঁকা এক নিঃশব্দ প্রান্তর।" } },
      { at: 5.6, speaker: "narrator", text: { en: "Somewhere in the record is a rover that drove further than anyone planned.", bn: "রেকর্ডের কোথাও আছে এক রোভার, যে পরিকল্পনার চেয়ে অনেক দূর গিয়েছিল।" } },
      { at: 11.4, speaker: "eko", emotion: "excited", text: { en: "Systems online! Hello, explorer — I'm EKO.", bn: "সিস্টেম চালু! হ্যালো, অভিযাত্রী — আমি ইকো।" } },
      { at: 14.2, speaker: "eko", emotion: "curious", text: { en: "Let's recover the real NASA records of Opportunity. I'll guide you.", bn: "চলো অপরচুনিটির আসল NASA রেকর্ড খুঁজে বের করি। আমি পথ দেখাব।" } },
    ],
  },
  {
    id: "ch1-outro",
    shots: [
      { from: { x: -6, z: 42, h: 2 }, to: { x: -4, z: 40, h: 9 }, lookFrom: { x: -11, z: 36, h: 2 }, lookTo: { x: -11, z: 36, h: 12 }, duration: 5 },
    ],
    lines: [
      { at: 0.3, speaker: "eko", emotion: "discovery", text: { en: "That beam marks a memory. The next one is close to the rover itself.", bn: "এই আলোকরেখা একটি স্মৃতির চিহ্ন। পরেরটি রোভারের খুব কাছেই।" } },
    ],
  },
  {
    id: "ch2-intro",
    label: { en: "NASA's 3D Opportunity model, placed in an artistic scene", bn: "NASA-র 3D অপরচুনিটি মডেল, শিল্পিত দৃশ্যে রাখা" },
    shots: [
      { from: { x: R.x + 9, z: R.z + 6, h: 2.2 }, to: { x: R.x + 3, z: R.z + 7.5, h: 1.6 }, lookFrom: { x: R.x, z: R.z, h: 0.8 }, lookTo: { x: R.x, z: R.z, h: 0.9 }, duration: 5 },
      { from: { x: R.x - 4, z: R.z + 3, h: 1.1 }, to: { x: R.x - 3.5, z: R.z - 3, h: 1.5 }, lookFrom: { x: R.x, z: R.z, h: 0.7 }, lookTo: { x: R.x, z: R.z, h: 1.2 }, duration: 5 },
    ],
    lines: [
      { at: 0.4, speaker: "eko", emotion: "discovery", text: { en: "There it is — Opportunity. Many people call it Oppy.", bn: "ওই যে — অপরচুনিটি। অনেকে একে 'অপি' বলে ডাকে।" } },
      { at: 5.2, speaker: "eko", emotion: "curious", text: { en: "This is NASA's own 3D model, placed here as a memorial — not its real resting place.", bn: "এটি NASA-র নিজস্ব 3D মডেল, স্মারক হিসেবে রাখা — এর আসল বিশ্রামস্থল নয়।" } },
    ],
  },
  {
    id: "ch2-outro",
    shots: [
      { from: { x: R.x + 2, z: R.z + 5, h: 1.4 }, to: { x: R.x + 6, z: R.z + 4, h: 6 }, lookFrom: { x: R.x, z: R.z, h: 0.8 }, lookTo: { x: R.x, z: R.z - 10, h: 3 }, duration: 5 },
    ],
    lines: [
      { at: 0.3, speaker: "eko", emotion: "hopeful", text: { en: "Wheels, panels, camera. Every part has a story. But the sky is changing…", bn: "চাকা, প্যানেল, ক্যামেরা — প্রতিটি অংশের গল্প আছে। কিন্তু আকাশ বদলাচ্ছে…" } },
    ],
  },
  {
    id: "ch3-intro",
    label: { en: "Artistic reconstruction of the 2018 storm — not footage or telemetry", bn: "২০১৮ সালের ঝড়ের শিল্পিত পুনর্গঠন — ফুটেজ বা টেলিমেট্রি নয়" },
    storm: [0.15, 0.55],
    shots: [
      { from: { x: 10, z: -6, h: 3 }, to: { x: 4, z: -12, h: 12 }, lookFrom: { x: 0, z: -30, h: 3 }, lookTo: { x: 0, z: -60, h: 14 }, duration: 6.5 },
    ],
    lines: [
      { at: 0.5, speaker: "eko", emotion: "concerned", text: { en: "The light is fading. In June 2018 a real planet-wide dust storm darkened Mars's sky.", bn: "আলো কমে আসছে। ২০১৮ সালের জুনে সত্যিকারের গ্রহজোড়া ধুলিঝড় মঙ্গলের আকাশ অন্ধকার করেছিল।" } },
      { at: 3.6, speaker: "eko", emotion: "concerned", text: { en: "What we see here is our reconstruction. Let's find the records of what happened.", bn: "এখানে যা দেখছ তা আমাদের পুনর্গঠন। চলো আসলে কী ঘটেছিল তার রেকর্ড খুঁজি।" } },
    ],
  },
  {
    id: "ch3-outro",
    storm: [0.9, 0.9],
    shots: [
      { from: { x: -12, z: -54, h: 1.8 }, to: { x: -10, z: -52, h: 2.4 }, lookFrom: { x: -16, z: -58, h: 1.4 }, lookTo: { x: -16, z: -58, h: 2 }, duration: 5.5 },
    ],
    lines: [
      { at: 0.3, speaker: "eko", emotion: "sad", text: { en: "Months of attempts. Then, on February 13, 2019, NASA declared the mission complete.", bn: "মাসের পর মাস চেষ্টা। তারপর ১৩ ফেব্রুয়ারি ২০১৯ NASA মিশন সম্পূর্ণ ঘোষণা করে।" } },
      { at: 3.4, speaker: "eko", emotion: "hopeful", text: { en: "But records remember. There's an archive to the west.", bn: "কিন্তু রেকর্ড মনে রাখে। পশ্চিমে একটি আর্কাইভ আছে।" } },
    ],
  },
  {
    id: "ch4-intro",
    label: { en: "Fictional holographic archive displaying real NASA records", bn: "কাল্পনিক হলোগ্রাফিক আর্কাইভে আসল NASA রেকর্ড" },
    storm: [0.45, 0.4],
    shots: [
      { from: { x: A.x + 12, z: A.z + 12, h: 6 }, to: { x: A.x + 7, z: A.z + 8, h: 3 }, lookFrom: { x: A.x, z: A.z, h: 1.5 }, lookTo: { x: A.x, z: A.z, h: 1.8 }, duration: 6 },
    ],
    lines: [
      { at: 0.4, speaker: "eko", emotion: "curious", text: { en: "An archive. Four pedestals, four memory fragments — the records you carried here.", bn: "একটি আর্কাইভ। চারটি বেদি, চারটি স্মৃতিখণ্ড — তুমি যে রেকর্ড বয়ে এনেছ।" } },
    ],
  },
  {
    id: "ch4-outro",
    shots: [
      { from: { x: A.x, z: A.z + 7, h: 1.4 }, to: { x: A.x, z: A.z + 4, h: 7 }, lookFrom: { x: A.x, z: A.z, h: 2 }, lookTo: { x: A.x, z: A.z, h: 2.5 }, duration: 5 },
    ],
    lines: [
      { at: 0.3, speaker: "eko", emotion: "hopeful", text: { en: "The timeline holds. One more journey — back to Oppy.", bn: "সময়রেখা মিলেছে। আর একটি যাত্রা — অপির কাছে ফিরে চলো।" } },
    ],
  },
  {
    id: "finale",
    label: { en: "Artistic finale — not a historical event", bn: "শিল্পিত সমাপ্তি — ঐতিহাসিক ঘটনা নয়" },
    storm: [0.6, 0],
    shots: [
      { from: { x: R.x + 4, z: R.z + 5, h: 1.2 }, to: { x: R.x - 4, z: R.z + 5, h: 1.6 }, lookFrom: { x: R.x, z: R.z, h: 0.8 }, lookTo: { x: R.x, z: R.z, h: 0.9 }, duration: 7 },
      { from: { x: R.x - 5, z: R.z + 4, h: 2 }, to: { x: R.x - 9, z: R.z + 14, h: 16 }, lookFrom: { x: R.x, z: R.z, h: 1 }, lookTo: { x: R.x, z: R.z - 20, h: 10 }, duration: 9 },
    ],
    lines: [
      { at: 0.5, speaker: "eko", emotion: "sad", text: { en: "Opportunity's last transmitted image was dark and incomplete.", bn: "অপরচুনিটির শেষ পাঠানো ছবিটি ছিল অন্ধকার ও অসম্পূর্ণ।" } },
      { at: 4.2, speaker: "eko", emotion: "hopeful", text: { en: "We don't need a poetic final sentence to remember a scientific life. We have the evidence.", bn: "বৈজ্ঞানিক জীবনের কথা মনে রাখতে কোনো কাব্যিক শেষ বাক্য দরকার নেই। আমাদের কাছে প্রমাণ আছে।" } },
      { at: 9.5, speaker: "narrator", text: { en: "The signal ended. The science remained.", bn: "সংকেত থেমেছে। বিজ্ঞান থেকে গেছে।" } },
    ],
  },
];

export const CUTSCENE_BY_ID: ReadonlyMap<string, Cutscene> = new Map(CUTSCENES.map((c) => [c.id, c]));
export const cutsceneDuration = (c: Cutscene) => c.shots.reduce((t, s) => t + s.duration, 0);
