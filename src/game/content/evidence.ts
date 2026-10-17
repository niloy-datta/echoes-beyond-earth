/**
 * Evidence the explorer recovers. Every `fact` restates a claim that already
 * appears in this repository with a NASA source (see src/lib/eko-mission.ts,
 * public/data/stories.json and public/data/sources.json). Nothing here is
 * invented telemetry, a quotation, or a simulated rover message.
 */
export type L = { en: string; bn: string };
export type EvidenceCategory = "locomotion" | "power" | "imaging" | "telemetry";

export interface Evidence {
  id: string;
  title: L;
  fact: L;
  source: { label: string; url: string };
  /** Local NASA image (under /public) when the repository already ships one. */
  image?: { src: string; alt: L; credit: string };
  /** Year/date chip shown in the journal; null when only ordinal order is known. */
  when: string | null;
  /** Primary scientific domain for the NASA Evidence Board. */
  category: EvidenceCategory;
  /** Related evidence item IDs linked on the investigative pinboard. */
  connections: readonly string[];
  /** NASA JPL Photojournal or mission identifier. */
  piaId?: string;
  /** Short evidence badge tag. */
  tag: L;
}

export const EVIDENCE: readonly Evidence[] = [
  {
    id: "traverse",
    title: { en: "The final traverse map", bn: "শেষ যাত্রাপথের মানচিত্র" },
    fact: {
      en: "NASA's final traverse map runs 45.16 km from the landing site, Eagle crater, to Opportunity's final resting spot on the rim of Endeavour crater.",
      bn: "NASA-র শেষ যাত্রাপথের মানচিত্রে অবতরণস্থল ঈগল খাদ থেকে এনডেভার খাদের কিনারায় অপরচুনিটির শেষ বিশ্রামস্থল পর্যন্ত ৪৫.১৬ কিমি পথ দেখানো হয়েছে।",
    },
    source: { label: "NASA / PIA23178 Opportunity's Final Traverse Map", url: "https://images.nasa.gov/details/PIA23178" },
    image: {
      src: "/images/nasa/pia23178.jpg",
      alt: { en: "NASA map of Opportunity's 45.16 km route", bn: "অপরচুনিটির ৪৫.১৬ কিমি পথের NASA মানচিত্র" },
      credit: "NASA/JPL-Caltech",
    },
    when: "2019",
    category: "locomotion",
    connections: ["wheels", "rim", "sol"],
    piaId: "PIA23178",
    tag: { en: "Traverse: 45.16 km", bn: "যাত্রাপথ: ৪৫.১৬ কিমি" },
  },
  {
    id: "wheels",
    title: { en: "The wheels", bn: "চাকা" },
    fact: {
      en: "Opportunity drove 45.16 km on Mars. Its original mission was planned for just 90 Martian days (sols).",
      bn: "অপরচুনিটি মঙ্গলে ৪৫.১৬ কিমি চলেছিল। অথচ মিশনটি শুরুতে মাত্র ৯০ মঙ্গল-দিনের (sol) জন্য পরিকল্পিত ছিল।",
    },
    source: { label: "NASA / Opportunity's final traverse map", url: "https://science.nasa.gov/photojournal/opportunitys-final-traverse-map/" },
    when: null,
    category: "locomotion",
    connections: ["traverse", "twin", "sol"],
    piaId: "PIA05208",
    tag: { en: "Rocker-Bogie 6-Wheel", bn: "রকার-বগি ৬ চাকা" },
  },
  {
    id: "solar",
    title: { en: "The solar panels", bn: "সৌর প্যানেল" },
    fact: {
      en: "Opportunity was a solar-powered rover: its panels turned sunlight into electricity.",
      bn: "অপরচুনিটি ছিল সৌরচালিত রোভার: এর প্যানেল সূর্যের আলোকে বিদ্যুতে রূপান্তর করত।",
    },
    source: { label: "NASA / Opportunity mission ends", url: "https://science.nasa.gov/missions/mer/nasas-opportunity-rover-mission-on-mars-comes-to-end/" },
    when: null,
    category: "power",
    connections: ["storm", "last-image", "recovery"],
    piaId: "PIA04318",
    tag: { en: "Photovoltaic Array", bn: "সৌরবিদ্যুৎ প্যানেল" },
  },
  {
    id: "pancam",
    title: { en: "The Pancam mast", bn: "প্যানক্যাম মাস্ট" },
    fact: {
      en: "The Legacy Pan combines 354 Pancam images taken over sols 5,084 to 5,111 (May 13 – June 10, 2018). NASA calls it the last panorama Opportunity acquired.",
      bn: "লেগ্যাসি প্যান ৩৫৪টি প্যানক্যাম ছবি জুড়ে তৈরি, তোলা হয় ৫,০৮৪ থেকে ৫,১১১ সলের মধ্যে (১৩ মে – ১০ জুন ২০১৮)। NASA বলে, এটিই অপরচুনিটির তোলা শেষ প্যানোরামা।",
    },
    source: { label: "NASA / PIA22909 Opportunity Legacy Pan", url: "https://images.nasa.gov/details/PIA22909" },
    image: {
      src: "/images/nasa/pia22909.jpg",
      alt: { en: "Opportunity's Legacy Pan, a wide true-colour panorama", bn: "অপরচুনিটির লেগ্যাসি প্যান, প্রকৃত রঙের প্যানোরামা" },
      credit: "NASA/JPL-Caltech",
    },
    when: "2018",
    category: "imaging",
    connections: ["legacy-release", "last-image", "sol"],
    piaId: "PIA22909",
    tag: { en: "Stereoscopic Mast", bn: "স্টিরিওস্কোপিক মাস্ট" },
  },
  {
    id: "storm",
    title: { en: "The 2018 dust storm", bn: "২০১৮ সালের ধুলিঝড়" },
    fact: {
      en: "In June 2018 a planet-wide dust storm darkened the Martian sky, reducing the sunlight available to Opportunity's solar panels.",
      bn: "২০১৮ সালের জুনে গ্রহজুড়ে ধুলিঝড় মঙ্গলের আকাশ অন্ধকার করে দেয়, ফলে অপরচুনিটির সৌর প্যানেলে পৌঁছানো সূর্যের আলো কমে যায়।",
    },
    source: { label: "NASA / Opportunity mission ends", url: "https://science.nasa.gov/missions/mer/nasas-opportunity-rover-mission-on-mars-comes-to-end/" },
    when: "2018",
    category: "power",
    connections: ["solar", "last-image", "recovery"],
    piaId: "PIA22929",
    tag: { en: "Estimated Tau ≈ 10.8 Storm", bn: "আনুমানিক টাউ ≈ ১০.৮ ধুলিঝড়" },
  },
  {
    id: "last-image",
    title: { en: "The last transmitted image", bn: "শেষ পাঠানো ছবি" },
    fact: {
      en: "On June 10, 2018, Opportunity transmitted a dark, incomplete Pancam frame (PIA22929). White speckles are camera sensor noise accentuated by dark sky; missing bottom rows resulted from communication loss during transmission. Thumbnails taken minutes later (PIA22930) were the last captured frames.",
      bn: "১০ জুন ২০১৮-তে অপরচুনিটি একটি অন্ধকার, অসম্পূর্ণ প্যানক্যাম ছবি (PIA22929) পাঠায়। সাদা ফুটকিগুলো ক্যামেরার স্বাভাবিক সেন্সর নয়েজ যা চরম অন্ধকারে দৃশ্যমান হয়, এবং সম্প্রচারের সময় সংযোগ বিচ্ছিন্ন হওয়ায় নিচের সারি কাটা পড়েছিল। ৩ মিনিট পরের থাম্বনেইল (PIA22930) ছিল শেষ ধারণকৃত ফ্রেম।",
    },
    source: { label: "NASA / Opportunity's Last Message (PIA22929)", url: "https://science.nasa.gov/photojournal/opportunitys-last-message/" },
    image: {
      src: "/images/nasa/pia22929.jpg",
      alt: { en: "Opportunity's last transmitted Pancam frame (PIA22929)", bn: "অপরচুনিটির শেষ পাঠানো প্যানক্যাম ফ্রেম (PIA22929)" },
      credit: "NASA/JPL-Caltech/Cornell/ASU",
    },
    when: "2018",
    category: "imaging",
    connections: ["storm", "pancam", "recovery"],
    piaId: "PIA22929",
    tag: { en: "Sol 5111 Telemetry (PIA22929)", bn: "সল ৫১১১ টেলিমেট্রি (PIA22929)" },
  },
  {
    id: "recovery",
    title: { en: "Months of recovery attempts", bn: "কয়েক মাসের উদ্ধারচেষ্টা" },
    fact: {
      en: "NASA lost contact on June 10, 2018. After months of recovery attempts, NASA declared Opportunity's mission complete on February 13, 2019. The rover did not speak a poetic 'last sentence'.",
      bn: "১০ জুন ২০১৮ NASA যোগাযোগ হারায়। কয়েক মাসের চেষ্টা শেষে ১৩ ফেব্রুয়ারি ২০১৯ NASA মিশন সম্পূর্ণ ঘোষণা করে। রোভারটি কোনো কাব্যিক 'শেষ কথা' বলেনি।",
    },
    source: { label: "NASA / Opportunity mission", url: "https://science.nasa.gov/mission/mer-opportunity/" },
    when: "2019",
    category: "telemetry",
    connections: ["solar", "storm", "legacy-release"],
    piaId: "MER-B",
    tag: { en: "Deep Space Network", bn: "ডিপ স্পেস নেটওয়ার্ক" },
  },
  {
    id: "legacy-release",
    title: { en: "The last panorama, released", bn: "শেষ প্যানোরামা প্রকাশ" },
    fact: {
      en: "On March 12, 2019, NASA released Opportunity's last panorama — assembled after the rover fell silent. The signal ended. The science remained.",
      bn: "১২ মার্চ ২০১৯ NASA অপরচুনিটির শেষ প্যানোরামা প্রকাশ করে — রোভার নীরব হওয়ার পর তৈরি। সংকেত থেমেছে, বিজ্ঞান থেকে গেছে।",
    },
    source: { label: "NASA / PIA22909 Opportunity Legacy Pan", url: "https://images.nasa.gov/details/PIA22909" },
    image: {
      src: "/images/nasa/pia22909.jpg",
      alt: { en: "Opportunity's Legacy Pan, a wide true-colour panorama", bn: "অপরচুনিটির লেগ্যাসি প্যান, প্রকৃত রঙের প্যানোরামা" },
      credit: "NASA/JPL-Caltech",
    },
    when: "2019",
    category: "imaging",
    connections: ["pancam", "recovery", "traverse"],
    piaId: "PIA22909",
    tag: { en: "Final 354-Frame Mosaic", bn: "চূড়ান্ত ৩৫৪-ফ্রেম মোজাইক" },
  },
  // ── Optional side discoveries ─────────────────────────────────────────────
  {
    id: "twin",
    title: { en: "A family of rovers", bn: "রোভারের এক পরিবার" },
    fact: {
      en: "NASA frames its rovers as generations of one family: Sojourner first, then the twin Mars Exploration Rovers Spirit and Opportunity, then Curiosity.",
      bn: "NASA তার রোভারগুলোকে একই পরিবারের প্রজন্ম হিসেবে দেখায়: প্রথমে সোজার্নার, তারপর যমজ মার্স এক্সপ্লোরেশন রোভার স্পিরিট ও অপরচুনিটি, তারপর কিউরিওসিটি।",
    },
    source: { label: "NASA / PIA11436 three generations of rovers", url: "https://images.nasa.gov/details/PIA11436" },
    when: null,
    category: "locomotion",
    connections: ["wheels", "traverse"],
    piaId: "PIA11436",
    tag: { en: "Spirit & Opportunity", bn: "স্পিরিট ও অপরচুনিটি" },
  },
  {
    id: "rim",
    title: { en: "Perseverance Valley", bn: "পারসিভিয়ারেন্স ভ্যালি" },
    fact: {
      en: "Opportunity was descending into Perseverance Valley, on the rim of Endeavour crater, when the storm ended its mission.",
      bn: "ঝড় যখন মিশন থামাল, অপরচুনিটি তখন এনডেভার খাদের কিনারায় পারসিভিয়ারেন্স ভ্যালিতে নামছিল।",
    },
    source: { label: "NASA / PIA23178 Opportunity's Final Traverse Map", url: "https://images.nasa.gov/details/PIA23178" },
    when: "2018",
    category: "locomotion",
    connections: ["traverse", "sol"],
    piaId: "PIA23178",
    tag: { en: "Endeavour Crater Rim", bn: "এনডেভার খাদের কিনারা" },
  },
  {
    id: "sol",
    title: { en: "What is a sol?", bn: "সল কী?" },
    fact: {
      en: "Mission days on Mars are counted in sols (Martian days). Opportunity was planned for about 90 sols; the Legacy Pan was taken more than 5,000 sols into the mission.",
      bn: "মঙ্গলে মিশনের দিন গোনা হয় সল (মঙ্গল-দিন) দিয়ে। অপরচুনিটির পরিকল্পনা ছিল প্রায় ৯০ সলের; অথচ লেগ্যাসি প্যান তোলা হয় মিশনের ৫,০০০-এর বেশি সল পরে।",
    },
    source: { label: "NASA / PIA22909 Opportunity Legacy Pan", url: "https://images.nasa.gov/details/PIA22909" },
    when: null,
    category: "telemetry",
    connections: ["traverse", "pancam", "wheels"],
    piaId: "MER-Time",
    tag: { en: "Martian Sol (24h 39m)", bn: "মঙ্গলীয় সল (২৪ঘ ৩৯মি)" },
  },
] as const;

export const EVIDENCE_BY_ID: ReadonlyMap<string, Evidence> = new Map(EVIDENCE.map((e) => [e.id, e]));
