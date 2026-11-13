/**
 * EKO Opportunity educational prototype data.
 * All factual claims have direct NASA provenance; scene positions are illustrative.
 * This is pre-event practice work, not a NASA Space Apps submission artifact.
 */
export type EkoLocale = "en" | "bn";
export type EkoText = Record<EkoLocale, string>;
export type EkoStopId = "wheels" | "solar" | "camera" | "sky";

export interface EkoStop {
  id: EkoStopId;
  name: EkoText;
  lead: EkoText;
  fact: EkoText;
  question: EkoText;
  options: readonly EkoText[];
  correct: number;
  source: { label: string; url: string };
  position: { x: number; z: number };
}

export const EKO_STOPS: readonly EkoStop[] = [
  {
    id: "wheels",
    name: { en: "01 / The wheels", bn: "০১ / চাকা" },
    lead: { en: "A journey beyond every expectation.", bn: "প্রত্যাশার বহু দূর পর্যন্ত এক যাত্রা।" },
    fact: {
      en: "Opportunity drove 45.16 km on Mars. Its original mission was planned for just 90 Martian days (sols).",
      bn: "অপরচুনিটি মঙ্গলে ৪৫.১৬ কিমি চলেছিল। অথচ মিশনটি শুরুতে মাত্র ৯০ মঙ্গল-দিনের (sol) জন্য পরিকল্পিত ছিল।",
    },
    question: { en: "How far did Opportunity travel?", bn: "অপরচুনিটি মোট কত দূর চলেছিল?" },
    options: [
      { en: "45.16 km", bn: "৪৫.১৬ কিমি" },
      { en: "1 km", bn: "১ কিমি" },
      { en: "450 km", bn: "৪৫০ কিমি" },
    ],
    correct: 0,
    source: { label: "NASA / Opportunity's final traverse map", url: "https://science.nasa.gov/photojournal/opportunitys-final-traverse-map/" },
    position: { x: -2.1, z: 0.2 },
  },
  {
    id: "solar",
    name: { en: "02 / The solar wings", bn: "০২ / সৌর প্যানেল" },
    lead: { en: "A storm that changed the light.", bn: "একটি ঝড়, যা বদলে দিল আলো।" },
    fact: {
      en: "Opportunity ran on solar power. A planet-wide dust storm in June 2018 darkened the sky, reducing sunlight available to its panels. NASA lost contact on June 10.",
      bn: "অপরচুনিটি সৌরশক্তিতে চলত। ২০১৮ সালের জুনের ব্যাপক ধুলিঝড়ে সূর্যের আলো কমে যায়। ১০ জুন NASA তার সঙ্গে যোগাযোগ হারায়।",
    },
    question: { en: "Why did the 2018 storm threaten the rover?", bn: "২০১৮ সালের ঝড় রোভারটির জন্য কেন বিপজ্জনক ছিল?" },
    options: [
      { en: "It made the rover heavier", bn: "রোভার ভারী হয়ে গিয়েছিল" },
      { en: "It reduced available sunlight", bn: "সূর্যের আলো কমে গিয়েছিল" },
      { en: "It froze the oceans", bn: "মহাসাগর জমে গিয়েছিল" },
    ],
    correct: 1,
    source: { label: "NASA / Opportunity mission ends", url: "https://science.nasa.gov/missions/mer/nasas-opportunity-rover-mission-on-mars-comes-to-end/" },
    position: { x: 2.2, z: -0.6 },
  },
  {
    id: "camera",
    name: { en: "03 / The camera mast", bn: "০৩ / ক্যামেরা মাস্ট" },
    lead: { en: "An image does not need words to tell a story.", bn: "কথা ছাড়াও ছবি গল্প বলে।" },
    fact: {
      en: "On June 10, 2018, Opportunity transmitted a dark, incomplete Pancam image. NASA identifies it as the last data sent, but a later set of image thumbnails had been taken.",
      bn: "১০ জুন ২০১৮-তে অপরচুনিটি একটি অন্ধকার, অসম্পূর্ণ Pancam ছবি পাঠায়। NASA একে শেষ পাঠানো ডেটা বলে, তবে এর কিছুক্ষণ পর আরও ছবির থাম্বনেইল তোলা হয়েছিল।",
    },
    question: { en: "Was the last transmitted full-frame image also the last image ever taken?", bn: "শেষ পাঠানো পূর্ণ-ফ্রেম ছবিটিই কি সর্বশেষ তোলা ছবি ছিল?" },
    options: [
      { en: "Yes", bn: "হ্যাঁ" },
      { en: "No — later thumbnails were taken", bn: "না — পরে আরও থাম্বনেইল তোলা হয়েছিল" },
      { en: "NASA has no record", bn: "NASA-এর কোনো রেকর্ড নেই" },
    ],
    correct: 1,
    source: { label: "NASA / Opportunity's Last Message (PIA22929)", url: "https://science.nasa.gov/photojournal/opportunitys-last-message/" },
    position: { x: 0.1, z: -2.7 },
  },
  {
    id: "sky",
    name: { en: "04 / The dark sky", bn: "০৪ / অন্ধকার আকাশ" },
    lead: { en: "The signal ended. The science remained.", bn: "সংকেত থেমেছে, বিজ্ঞান থেকে গেছে।" },
    fact: {
      en: "The last contact was June 10, 2018. After months of recovery attempts, NASA declared Opportunity's mission complete on February 13, 2019. The rover did not speak a poetic 'last sentence.'",
      bn: "শেষ যোগাযোগ হয় ১০ জুন ২০১৮। কয়েক মাসের চেষ্টা শেষে NASA ১৩ ফেব্রুয়ারি ২০১৯-এ মিশন শেষ ঘোষণা করে। রোভারটি কোনো কাব্যিক 'শেষ কথা' বলেনি।",
    },
    question: { en: "When did NASA formally end Opportunity's mission?", bn: "NASA কবে আনুষ্ঠানিকভাবে মিশন সমাপ্ত ঘোষণা করে?" },
    options: [
      { en: "2004", bn: "২০০৪" },
      { en: "June 10, 2018", bn: "১০ জুন ২০১৮" },
      { en: "February 13, 2019", bn: "১৩ ফেব্রুয়ারি ২০১৯" },
    ],
    correct: 2,
    source: { label: "NASA / Opportunity mission", url: "https://science.nasa.gov/mission/mer-opportunity/" },
    position: { x: 3.3, z: -3.3 },
  },
] as const;

export const EKO_INTRO: Record<EkoLocale, {
  eyebrow: string; title: string; description: string; warning: string; controls: string; start: string;
  complete: string; completeBody: string; passport: string; fallback: string;
}> = {
  en: {
    eyebrow: "EKO / EXPLORER MISSION 001",
    title: "The last light of Opportunity",
    description: "Join EKO on a stylized journey to recover four real NASA facts. Walk around the rover, scan its story, and solve four short puzzles.",
    warning: "The 3D scene, EKO, rover model, dust and positions are artistic illustrations, not NASA footage, exact surface geometry or recovered telemetry.",
    controls: "Move: W A S D / arrows · Scan: E when near a beacon · Drag scene to rotate camera",
    start: "Begin exploration",
    complete: "Memory recovered",
    completeBody: "Opportunity's last signal ended, but its discoveries continue to teach us about Mars. The mission's record has been added to your Explorer Passport.",
    passport: "Open Explorer Passport",
    fallback: "Read and solve without 3D",
  },
  bn: {
    eyebrow: "ইকো / অনুসন্ধান মিশন ০০১",
    title: "অপরচুনিটির শেষ আলো",
    description: "ইকোর সঙ্গে মঙ্গল অভিযানে চলো। রোভারের চারটি বাস্তব NASA তথ্য খুঁজে বের করো এবং চারটি ছোট প্রশ্নের উত্তর দাও।",
    warning: "3D দৃশ্য, ইকো, রোভার ও ধুলা শিল্পীর কল্পনানির্ভর; এগুলো NASA ফুটেজ, প্রকৃত ভূপ্রকৃতি বা উদ্ধার করা টেলিমেট্রি নয়।",
    controls: "চলা: W A S D / অ্যারো · কাছে গিয়ে E চাপলে স্ক্যান · ক্যামেরা ঘোরাতে দৃশ্য ড্র্যাগ করো",
    start: "অভিযান শুরু",
    complete: "স্মৃতি উদ্ধার সম্পন্ন",
    completeBody: "অপরচুনিটির শেষ সংকেত থামলেও তার আবিষ্কার আমাদের মঙ্গল সম্পর্কে শেখাচ্ছে। তোমার Explorer Passport-এ মিশনের রেকর্ড যুক্ত হয়েছে।",
    passport: "এক্সপ্লোরার পাসপোর্ট",
    fallback: "3D ছাড়াই পড়ো ও উত্তর দাও",
  },
};