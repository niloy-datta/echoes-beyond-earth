/**
 * Evidence the explorer recovers. Every `fact` restates a claim that already
 * appears in this repository with a NASA source (see src/lib/eko-mission.ts,
 * public/data/stories.json and public/data/sources.json). Nothing here is
 * invented telemetry, a quotation, or a simulated rover message.
 */
export type L = { en: string; bn: string };

export interface Evidence {
  id: string;
  title: L;
  fact: L;
  source: { label: string; url: string };
  /** Local NASA image (under /public) when the repository already ships one. */
  image?: { src: string; alt: L; credit: string };
  /** Year/date chip shown in the journal; null when only ordinal order is known. */
  when: string | null;
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
  },
  {
    id: "pancam",
    title: { en: "The Pancam mast", bn: "প্যানক্যাম মাস্ট" },
    fact: {
      en: "The Legacy Pan combines 354 Pancam images taken over sols 5,084 to 5,111 (May 13 – June 10, 2018). NASA calls it the last panorama Opportunity acquired.",
      bn: "লেগ্যাসি প্যান ৩৫৪টি প্যানক্যাম ছবি জুড়ে তৈরি, তোলা হয় ৫,০৮৪ থেকে ৫,১১১ সলের মধ্যে (১৩ মে – ১০ জুন ২০১৮)। NASA বলে, এটিই অপরচুনিটির তোলা শেষ প্যানোরামা।",
    },
    source: { label: "NASA / PIA22909 Opportunity Legacy Pan", url: "https://science.nasa.gov/photojournal/opportunity-legacy-pan-true-color/" },
    image: {
      src: "/images/nasa/pia22909.jpg",
      alt: { en: "Opportunity's Legacy Pan, a wide true-colour panorama", bn: "অপরচুনিটির লেগ্যাসি প্যান, প্রকৃত রঙের প্যানোরামা" },
      credit: "NASA/JPL-Caltech",
    },
    when: "2018",
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
  },
  {
    id: "last-image",
    title: { en: "The last transmitted image", bn: "শেষ পাঠানো ছবি" },
    fact: {
      en: "On June 10, 2018, Opportunity transmitted a dark, incomplete Pancam image (PIA22929). NASA identifies it as the last data sent — but thumbnails of images captured a few minutes later had also been sent, so it was not the last image taken.",
      bn: "১০ জুন ২০১৮-তে অপরচুনিটি একটি অন্ধকার, অসম্পূর্ণ প্যানক্যাম ছবি (PIA22929) পাঠায়। NASA একে শেষ পাঠানো ডেটা বলে — তবে কয়েক মিনিট পরে তোলা ছবির থাম্বনেইলও পাঠানো হয়েছিল, তাই এটি সর্বশেষ তোলা ছবি নয়।",
    },
    source: { label: "NASA / Opportunity's Last Message (PIA22929)", url: "https://science.nasa.gov/photojournal/opportunitys-last-message/" },
    when: "2018",
  },
  {
    id: "recovery",
    title: { en: "Months of recovery attempts", bn: "কয়েক মাসের উদ্ধারচেষ্টা" },
    fact: {
      en: "NASA lost contact on June 10, 2018. After months of recovery attempts, NASA declared Opportunity's mission complete on February 13, 2019. The rover did not speak a poetic 'last sentence'.",
      bn: "১০ জুন ২০১৮ NASA যোগাযোগ হারায়। কয়েক মাসের চেষ্টা শেষে ১৩ ফেব্রুয়ারি ২০১৯ NASA মিশন সম্পূর্ণ ঘোষণা করে। রোভারটি কোনো কাব্যিক 'শেষ কথা' বলেনি।",
    },
    source: { label: "NASA/JPL / Opportunity Rover Mission on Mars Comes to End (Feb. 13, 2019)", url: "https://www.jpl.nasa.gov/news/nasas-opportunity-rover-mission-on-mars-comes-to-end" },
    when: "2019",
  },
  {
    id: "legacy-release",
    title: { en: "The last panorama, released", bn: "শেষ প্যানোরামা প্রকাশ" },
    fact: {
      en: "On March 12, 2019, NASA released Opportunity's last panorama — assembled after the rover fell silent. The signal ended. The science remained.",
      bn: "১২ মার্চ ২০১৯ NASA অপরচুনিটির শেষ প্যানোরামা প্রকাশ করে — রোভার নীরব হওয়ার পর তৈরি। সংকেত থেমেছে, বিজ্ঞান থেকে গেছে।",
    },
    source: { label: "NASA / PIA22909 Opportunity Legacy Pan", url: "https://science.nasa.gov/photojournal/opportunity-legacy-pan-true-color/" },
    image: {
      src: "/images/nasa/pia22909.jpg",
      alt: { en: "Opportunity's Legacy Pan, a wide true-colour panorama", bn: "অপরচুনিটির লেগ্যাসি প্যান, প্রকৃত রঙের প্যানোরামা" },
      credit: "NASA/JPL-Caltech",
    },
    when: "2019",
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
  },
  {
    id: "sol",
    title: { en: "What is a sol?", bn: "সল কী?" },
    fact: {
      en: "Mission days on Mars are counted in sols (Martian days). Opportunity was planned for about 90 sols; the Legacy Pan was taken more than 5,000 sols into the mission.",
      bn: "মঙ্গলে মিশনের দিন গোনা হয় সল (মঙ্গল-দিন) দিয়ে। অপরচুনিটির পরিকল্পনা ছিল প্রায় ৯০ সলের; অথচ লেগ্যাসি প্যান তোলা হয় মিশনের ৫,০০০-এর বেশি সল পরে।",
    },
    source: { label: "NASA / PIA22909 Opportunity Legacy Pan", url: "https://science.nasa.gov/photojournal/opportunity-legacy-pan-true-color/" },
    when: null,
  },
  // Moon link (Chapter 04). Claims restate science.nasa.gov/mission/surveyor-3 and
  // NSSDCA 1967-035A, read on 2026-11-12. The two pages give Nov. 18 vs 19, 1969 for the
  // Apollo 12 landing (likely US time vs UT), so only "November 1969" is stated here.
  {
    id: "surveyor-3",
    title: { en: "Surveyor 3, a silent lander on the Moon", bn: "সার্ভেয়ার ৩, চাঁদে এক নীরব ল্যান্ডার" },
    fact: {
      en: "NASA's Surveyor 3 soft-landed on April 20, 1967 (UT) in the southeastern Oceanus Procellarum. Like Opportunity, it was a robotic explorer that went silent and stayed where it stopped.",
      bn: "NASA-র সার্ভেয়ার ৩ ২০ এপ্রিল ১৯৬৭ (UT) ওশেনাস প্রসেলারামের দক্ষিণ-পূর্বে নরম অবতরণ করে। অপরচুনিটির মতোই এটি ছিল এক রোবট অভিযাত্রী, যা নীরব হয়ে যেখানে থেমেছিল সেখানেই রয়ে যায়।",
    },
    source: { label: "NASA Science / Surveyor 3 mission", url: "https://science.nasa.gov/mission/surveyor-3/" },
    // NASA title (images.nasa.gov AS12-48-7121): "View of Surveyor III in its crater".
    image: {
      src: "/images/nasa/as12-48-7121.jpg",
      alt: { en: "NASA Apollo 12 photo AS12-48-7121: View of Surveyor III in its crater", bn: "NASA অ্যাপোলো ১২-এর ছবি AS12-48-7121: খাদের ভেতরে সার্ভেয়ার ৩" },
      credit: "NASA/JSC",
    },
    when: "1967",
  },
  {
    id: "apollo12-retrieval",
    title: { en: "Apollo 12 brings Surveyor 3 parts home", bn: "অ্যাপোলো ১২ সার্ভেয়ার ৩-এর অংশ ফিরিয়ে আনে" },
    fact: {
      en: "In November 1969, Apollo 12 landed about 180 m from the inactive Surveyor 3. Astronauts Charles Conrad Jr. and Alan Bean removed about 10 kg of parts, including the TV camera and soil scoop, after nearly two and a half years of exposure on the lunar surface, so they could be examined on Earth.",
      bn: "১৯৬৯ সালের নভেম্বরে অ্যাপোলো ১২ নিষ্ক্রিয় সার্ভেয়ার ৩ থেকে প্রায় ১৮০ মিটার দূরে নামে। নভোচারী চার্লস কনরাড জুনিয়র ও অ্যালান বিন প্রায় আড়াই বছর চাঁদের পৃষ্ঠে থাকা যানটি থেকে টিভি ক্যামেরা ও মাটির স্কুপসহ প্রায় ১০ কেজি অংশ খুলে আনেন, যাতে পৃথিবীতে সেগুলো পরীক্ষা করা যায়।",
    },
    source: { label: "NASA NSSDCA / Surveyor 3 (1967-035A)", url: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1967-035A" },
    // NASA title (images.nasa.gov AS12-48-7133): "View of two U.S. spacecraft on the surface of the moon".
    image: {
      src: "/images/nasa/as12-48-7133.jpg",
      alt: { en: "NASA Apollo 12 photo AS12-48-7133: View of two U.S. spacecraft on the surface of the Moon", bn: "NASA অ্যাপোলো ১২-এর ছবি AS12-48-7133: চাঁদের পৃষ্ঠে দুটি মার্কিন মহাকাশযান" },
      credit: "NASA/JSC",
    },
    when: "1969",
  },
] as const;

export const EVIDENCE_BY_ID: ReadonlyMap<string, Evidence> = new Map(EVIDENCE.map((e) => [e.id, e]));

/**
 * NASA Image and Video Library record behind each card (checked on 2026-11-12
 * against images-api.nasa.gov) and a search phrase for related NASA images.
 * Cards whose source is a news article rather than an archived image only get
 * the related search.
 */
export const NASA_ARCHIVE: Readonly<Record<string, { nasaId?: string; related: string; topic: "mars" | "moon" }>> = {
  traverse: { nasaId: "PIA23178", related: "Opportunity traverse map", topic: "mars" },
  wheels: { nasaId: "PIA23178", related: "Opportunity rover wheel tracks", topic: "mars" },
  solar: { related: "Opportunity rover solar panels", topic: "mars" },
  pancam: { nasaId: "PIA22909", related: "Opportunity Pancam panorama", topic: "mars" },
  storm: { related: "Mars dust storm 2018 Opportunity", topic: "mars" },
  "last-image": { nasaId: "PIA22929", related: "Last Images Opportunity Took", topic: "mars" },
  recovery: { related: "Opportunity rover Perseverance Valley", topic: "mars" },
  "legacy-release": { nasaId: "PIA22909", related: "Opportunity Legacy Pan", topic: "mars" },
  twin: { nasaId: "PIA11436", related: "Spirit rover Mars", topic: "mars" },
  rim: { nasaId: "PIA23178", related: "Endeavour crater Opportunity", topic: "mars" },
  sol: { nasaId: "PIA22909", related: "Opportunity sol", topic: "mars" },
  "surveyor-3": { nasaId: "AS12-48-7121", related: "Surveyor III Apollo 12", topic: "moon" },
  "apollo12-retrieval": { nasaId: "AS12-48-7133", related: "Apollo 12 Surveyor 3 Conrad", topic: "moon" },
};
