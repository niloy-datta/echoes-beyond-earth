/**
 * The Last Light of Opportunity — deterministic narrative state.
 *
 * This state is deliberately local and data-driven. It describes EKO's fictional
 * guidance separately from Opportunity's cited historical evidence.
 */
export type StoryChapterId = "silence" | "journey" | "storm" | "memories" | "legacy";
export type StoryEmotion = "curious" | "excited" | "surprised" | "concerned" | "sad" | "hopeful";

export type StoryText = { en: string; bn: string };

export interface StoryChapter {
  id: StoryChapterId;
  number: string;
  title: StoryText;
  dek: StoryText;
  eko: StoryText;
  emotion: StoryEmotion;
  memory: string;
  factualNote?: StoryText;
  source?: { label: string; url: string };
}

export interface StoryProgress {
  chapter: StoryChapterId;
  recovered: string[];
  completed: boolean;
}

export const STORY_STORAGE_KEY = "echoes-story-progress";

export const STORY_CHAPTERS: readonly StoryChapter[] = [
  {
    id: "silence",
    number: "01",
    title: { en: "The Silence", bn: "নৈঃশব্দ্য" },
    dek: { en: "A signal waits beneath the red horizon.", bn: "লাল দিগন্তের নিচে একটি সংকেত অপেক্ষা করছে।" },
    eko: { en: "I found a trace. It is not a message from Oppy — it is a path into the record.", bn: "আমি একটি চিহ্ন পেয়েছি। এটি Oppy-এর বার্তা নয়—এটি ইতিহাসের ভেতরে যাওয়ার পথ।" },
    emotion: "curious",
    memory: "silence-signal",
  },
  {
    id: "journey",
    number: "02",
    title: { en: "The Journey", bn: "যাত্রা" },
    dek: { en: "Four evidence beacons map a life of exploration.", bn: "চারটি প্রমাণ-বিকন এক অভিযানের গল্প আঁকে।" },
    eko: { en: "Walk with me. Every beacon is a real NASA record, while this landscape is our artistic museum stage.", bn: "আমার সঙ্গে চলো। প্রতিটি বিকন বাস্তব NASA রেকর্ড, আর এই দৃশ্য আমাদের শিল্পিত জাদুঘর-মঞ্চ।" },
    emotion: "excited",
    memory: "journey-wheels",
    factualNote: { en: "Opportunity travelled 45.16 km, far beyond its planned 90-sol mission.", bn: "Opportunity ৪৫.১৬ কিমি পথ পাড়ি দিয়েছিল—পরিকল্পিত ৯০ sol মিশনের বহু বেশি।" },
    source: { label: "NASA / final traverse map", url: "https://science.nasa.gov/photojournal/opportunitys-final-traverse-map/" },
  },
  {
    id: "storm",
    number: "03",
    title: { en: "The Storm", bn: "ঝড়" },
    dek: { en: "Dust changes the light, then the silence deepens.", bn: "ধুলো আলো বদলায়, তারপর নৈঃশব্দ্য আরও গভীর হয়।" },
    eko: { en: "The sky is closing. I can explain what happened, but I cannot invent what Oppy said.", bn: "আকাশ ঢেকে যাচ্ছে। কী ঘটেছিল তা আমি ব্যাখ্যা করতে পারি, কিন্তু Oppy কী বলেছিল তা বানিয়ে বলতে পারি না।" },
    emotion: "concerned",
    memory: "storm-light",
    factualNote: { en: "NASA lost contact on June 10, 2018 after a planet-wide dust storm reduced sunlight to the solar-powered rover.", bn: "বিশ্বব্যাপী ধুলিঝড়ে সৌরচালিত রোভারের আলো কমে যাওয়ার পর NASA ১০ জুন ২০১৮ যোগাযোগ হারায়।" },
    source: { label: "NASA / mission ends", url: "https://science.nasa.gov/missions/mer/nasas-opportunity-rover-mission-on-mars-comes-to-end/" },
  },
  {
    id: "memories",
    number: "04",
    title: { en: "The Memories", bn: "স্মৃতির আর্কাইভ" },
    dek: { en: "Evidence becomes a timeline we can carry forward.", bn: "প্রমাণ একটি সময়রেখায় পরিণত হয়, যা আমরা সামনে নিয়ে যেতে পারি।" },
    eko: { en: "The last transmitted image was dark and incomplete. That does not make the whole archive empty.", bn: "শেষ পাঠানো ছবিটি অন্ধকার ও অসম্পূর্ণ ছিল। তাই বলে পুরো আর্কাইভ শূন্য নয়।" },
    emotion: "sad",
    memory: "archive-image",
    factualNote: { en: "NASA identifies a dark, incomplete Pancam image as the last data sent; later image thumbnails had been taken.", bn: "NASA অন্ধকার, অসম্পূর্ণ Pancam ছবিকে শেষ পাঠানো ডেটা বলেছে; পরে আরও ছবির থাম্বনেইল তোলা হয়েছিল।" },
    source: { label: "NASA / Opportunity's last message", url: "https://science.nasa.gov/photojournal/opportunitys-last-message/" },
  },
  {
    id: "legacy",
    number: "05",
    title: { en: "The Legacy", bn: "উত্তরাধিকার" },
    dek: { en: "The signal ended. The science remained.", bn: "সংকেত থেমেছে। বিজ্ঞান থেকে গেছে।" },
    eko: { en: "We do not need a poetic final sentence to remember a scientific life. We have the evidence.", bn: "বৈজ্ঞানিক জীবনের কথা মনে রাখতে কোনো কাব্যিক শেষ বাক্য দরকার নেই। আমাদের কাছে প্রমাণ আছে।" },
    emotion: "hopeful",
    memory: "legacy-light",
    factualNote: { en: "NASA declared Opportunity's mission complete on February 13, 2019 after months of recovery attempts.", bn: "কয়েক মাসের চেষ্টা শেষে NASA ১৩ ফেব্রুয়ারি ২০১৯ Opportunity-এর মিশন সম্পূর্ণ ঘোষণা করে।" },
    source: { label: "NASA / Opportunity mission", url: "https://science.nasa.gov/mission/mer-opportunity/" },
  },
] as const;

const ids = new Set(STORY_CHAPTERS.map((chapter) => chapter.id));
const memories = new Set(STORY_CHAPTERS.map((chapter) => chapter.memory));

export function initialStoryProgress(): StoryProgress {
  return { chapter: "silence", recovered: [], completed: false };
}

export function sanitizeStoryProgress(value: unknown): StoryProgress {
  if (!value || typeof value !== "object") return initialStoryProgress();
  const raw = value as Partial<StoryProgress>;
  const chapter = typeof raw.chapter === "string" && ids.has(raw.chapter as StoryChapterId) ? raw.chapter as StoryChapterId : "silence";
  const recovered = Array.isArray(raw.recovered)
    ? [...new Set(raw.recovered.filter((memory): memory is string => typeof memory === "string" && memories.has(memory)))]
    : [];
  return { chapter, recovered, completed: raw.completed === true };
}

export function recoverStoryMemory(progress: StoryProgress, chapter: StoryChapterId): StoryProgress {
  const story = STORY_CHAPTERS.find((item) => item.id === chapter)!;
  if (progress.recovered.includes(story.memory)) return progress;
  const recovered = [...progress.recovered, story.memory];
  return { ...progress, recovered, completed: chapter === "legacy" ? true : progress.completed };
}

export function advanceStory(progress: StoryProgress): StoryProgress {
  const index = STORY_CHAPTERS.findIndex((item) => item.id === progress.chapter);
  if (index < 0 || index === STORY_CHAPTERS.length - 1) return { ...progress, completed: true };
  const next = STORY_CHAPTERS[index + 1];
  return { ...progress, chapter: next.id };
}

export function resetStory(): StoryProgress {
  return initialStoryProgress();
}

export function storyPercent(progress: StoryProgress): number {
  return Math.round((progress.recovered.length / STORY_CHAPTERS.length) * 100);
}
