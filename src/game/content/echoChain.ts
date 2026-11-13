/**
 * THE ECHO CHAIN: HARDWARE → EVIDENCE → DISCOVERY → LEGACY.
 *
 * Every statement restates a NASA page read on 2026-11-12 (URLs below). Each
 * layer says what we know, how we know it and what remains uncertain, and each
 * source carries an honest classification. Layers unlock from evidence the
 * player has recovered; the Claim Check asks the player to classify claims.
 */
import type { L } from "./evidence.ts";

export type Classification = "verified" | "interpretation" | "simulation" | "reconstruction" | "pending";
export type Layer = "hardware" | "evidence" | "discovery" | "legacy";
export type LearnerBand = "junior" | "young" | "research";

export const LAYERS: readonly Layer[] = ["hardware", "evidence", "discovery", "legacy"];

export const CLASSIFICATION_LABEL: Readonly<Record<Classification, L>> = {
  verified: { en: "Verified NASA record", bn: "যাচাই করা NASA রেকর্ড" },
  interpretation: { en: "Supported scientific interpretation", bn: "প্রমাণসমর্থিত বৈজ্ঞানিক ব্যাখ্যা" },
  simulation: { en: "Educational simulation", bn: "শিক্ষামূলক সিমুলেশন" },
  reconstruction: { en: "Artistic reconstruction", bn: "শিল্পিত পুনর্গঠন" },
  pending: { en: "Verification pending", bn: "যাচাই বাকি" },
};

export const LAYER_LABEL: Readonly<Record<Layer, L>> = {
  hardware: { en: "Hardware", bn: "যন্ত্র" },
  evidence: { en: "Evidence", bn: "প্রমাণ" },
  discovery: { en: "Discovery", bn: "আবিষ্কার" },
  legacy: { en: "Legacy", bn: "উত্তরাধিকার" },
};

export interface ChainSource { label: string; url: string; classification: Classification }

export interface ChainLink {
  layer: Layer;
  title: L;
  /** What do we know? */
  know: L;
  /** Shorter wording for the Junior Explorer band: same facts, simpler words. */
  simple: L;
  /** How do we know? */
  how: L;
  /** What remains uncertain? */
  uncertain: L;
  /** Evidence ids that must all be recovered to reveal this layer. */
  requires: readonly string[];
  sources: readonly ChainSource[];
}

export type ClaimVerdict = "verified" | "interpretation" | "unsupported";
export interface Claim {
  id: string;
  text: L;
  verdict: ClaimVerdict;
  why: L;
  /** Learner bands that see this claim (presentation only; the science is identical). */
  bands: readonly LearnerBand[];
}

export interface EchoChain { id: string; world: "mars" | "moon"; mission: L; links: readonly ChainLink[]; claims: readonly Claim[] }

const JPL_END = "https://www.jpl.nasa.gov/news/nasas-opportunity-rover-mission-on-mars-comes-to-end";
const JPL_STORM = "https://www.jpl.nasa.gov/news/opportunity-hunkers-down-during-dust-storm";
const PIA22929 = "https://science.nasa.gov/photojournal/opportunitys-last-message/";
const PIA22930 = "https://science.nasa.gov/photojournal/last-images-opportunity-took/";
const PIA22521 = "https://science.nasa.gov/photojournal/shades-of-martian-darkness/";
const SURVEYOR3 = "https://science.nasa.gov/mission/surveyor-3/";
const APOLLO12_S3 = "https://science.nasa.gov/resource/apollo-12-and-surveyor-3/";
const NSSDCA_S3 = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1967-035A";

const ALL: readonly LearnerBand[] = ["junior", "young", "research"];
const OLDER: readonly LearnerBand[] = ["young", "research"];

export const ECHO_CHAINS: readonly EchoChain[] = [
  {
    id: "opportunity",
    world: "mars",
    mission: { en: "Opportunity rover · Mars · 2004–2019", bn: "অপরচুনিটি রোভার · মঙ্গল · ২০০৪–২০১৯" },
    links: [
      {
        layer: "hardware",
        title: { en: "A solar-powered geologist on wheels", bn: "চাকায় চলা সৌরচালিত ভূতত্ত্ববিদ" },
        know: { en: "Opportunity ran on solar panels and rechargeable batteries, drove on wheels and photographed Mars with the Pancam on its mast.", bn: "অপরচুনিটি চলত সৌর প্যানেল ও রিচার্জেবল ব্যাটারিতে, চাকায় চলত, আর মাস্টের প্যানক্যাম দিয়ে মঙ্গলের ছবি তুলত।" },
        simple: { en: "Sunlight powered it, wheels moved it, and a tall camera mast took its pictures.", bn: "সূর্যের আলো একে চালাত, চাকা নড়াত, আর উঁচু ক্যামেরা-মাস্ট ছবি তুলত।" },
        how: { en: "NASA mission records and the rover's own images. The 3D rover in this game is NASA's model.", bn: "NASA-র মিশন রেকর্ড আর রোভারের নিজের তোলা ছবি। এই গেমের 3D রোভারটি NASA-র মডেল।" },
        uncertain: { en: "Where the rover stands in this game is artistic, not its real Martian location or exact scale.", bn: "এই গেমে রোভারটি কোথায় দাঁড়িয়ে, তা শিল্পিত; মঙ্গলে এর আসল অবস্থান বা সঠিক মাপ নয়।" },
        requires: ["wheels", "solar", "pancam"],
        sources: [{ label: "NASA/JPL · Opportunity mission comes to end", url: JPL_END, classification: "verified" }],
      },
      {
        layer: "evidence",
        title: { en: "The storm and the last images", bn: "ঝড় আর শেষ ছবিগুলো" },
        know: { en: "By June 10, 2018, JPL estimated the storm's tau at 10.8. PIA22929 was the last image transmitted; the last images taken (PIA22930) arrived only as thumbnails.", bn: "১০ জুন ২০১৮ নাগাদ JPL ঝড়ের টাউ ধরে ১০.৮। PIA22929 ছিল শেষ পাঠানো ছবি; শেষ তোলা ছবিগুলো (PIA22930) এসেছিল শুধু থাম্বনেইল হিসেবে।" },
        simple: { en: "The dust got so thick the Sun almost vanished. Oppy's last picture to reach Earth was dark and unfinished.", bn: "ধুলা এত ঘন হলো যে সূর্য প্রায় মিলিয়ে গেল। পৃথিবীতে পৌঁছানো অপির শেষ ছবি ছিল অন্ধকার আর অসম্পূর্ণ।" },
        how: { en: "Tau was estimated from the rover's own Pancam images of the Sun. NASA's PIA22521 simulates how that sky looks at tau 1 to 11.", bn: "রোভারের প্যানক্যামে তোলা সূর্যের ছবি থেকে টাউ অনুমান করা হয়। NASA-র PIA22521 দেখায় টাউ ১ থেকে ১১ হলে সেই আকাশ কেমন দেখায় (সিমুলেশন)।" },
        uncertain: { en: "Tau is an estimate. An incomplete image cannot show what happened after contact ended.", bn: "টাউ একটি অনুমান। অসম্পূর্ণ ছবি দেখাতে পারে না যোগাযোগ থামার পরে কী হয়েছিল।" },
        requires: ["storm", "last-image"],
        sources: [
          { label: "NASA/JPL · Opportunity hunkers down during dust storm", url: JPL_STORM, classification: "verified" },
          { label: "NASA · PIA22929 Opportunity's Last Message", url: PIA22929, classification: "verified" },
          { label: "NASA · PIA22930 Last Images Opportunity Took", url: PIA22930, classification: "verified" },
          { label: "NASA · PIA22521 Shades of Martian Darkness (simulated views)", url: PIA22521, classification: "simulation" },
        ],
      },
      {
        layer: "discovery",
        title: { en: "Water in Mars's past", bn: "মঙ্গলের অতীতে পানি" },
        know: { en: "Opportunity found hematite, a mineral that forms in water, at its landing site, and strong indications of ancient water at Endeavour crater.", bn: "অপরচুনিটি অবতরণস্থলে হেমাটাইট পায় — যে খনিজ পানিতে তৈরি হয় — আর এনডেভার খাদে প্রাচীন পানির জোরালো ইঙ্গিত পায়।" },
        simple: { en: "Oppy found rocks that form in water. Long ago, Mars had water.", bn: "অপি এমন পাথর পেয়েছিল যা পানিতে তৈরি হয়। বহু আগে মঙ্গলে পানি ছিল।" },
        how: { en: "Minerals measured in rocks by the rover's instruments. NASA concluded conditions at Meridiani Planum may have been habitable for some period.", bn: "রোভারের যন্ত্রে পাথরের খনিজ মাপা হয়। NASA সিদ্ধান্তে আসে, মেরিডিয়ানি প্লানামের পরিবেশ কোনো এক সময় বাসযোগ্য থাকতে পারে।" },
        uncertain: { en: "\"May have been habitable\" is not evidence that life existed there.", bn: "\"বাসযোগ্য থাকতে পারে\" মানে সেখানে জীবন ছিল — এমন প্রমাণ নয়।" },
        requires: ["traverse"],
        sources: [{ label: "NASA/JPL · Opportunity mission comes to end", url: JPL_END, classification: "interpretation" }],
      },
      {
        layer: "legacy",
        title: { en: "90 days became 15 years", bn: "৯০ দিন হলো ১৫ বছর" },
        know: { en: "Designed to run for 90 days, the exploration spanned more than 15 years. NASA says its exploration laid the groundwork for future missions, with its technical legacy carried aboard Curiosity and Mars 2020.", bn: "৯০ দিনের জন্য তৈরি হলেও অনুসন্ধান চলেছিল ১৫ বছরের বেশি। NASA বলছে, এর অনুসন্ধান ভবিষ্যৎ মিশনের ভিত গড়েছে; এর প্রযুক্তিগত উত্তরাধিকার কিউরিওসিটি ও মার্স ২০২০-তে বহন করা হচ্ছে।" },
        simple: { en: "It was meant to last 90 days and lasted 15 years. Newer rovers learned from it.", bn: "৯০ দিন চলার কথা ছিল, চলেছিল ১৫ বছর। নতুন রোভারগুলো এর থেকে শিখেছে।" },
        how: { en: "NASA's own statement when it declared the mission complete (Feb. 13, 2019).", bn: "মিশন সম্পন্ন ঘোষণার সময় NASA-র নিজের বিবৃতি (১৩ ফেব্রুয়ারি ২০১৯)।" },
        uncertain: { en: "Which exact designs were reused is not detailed on that page; check each mission's records.", bn: "ঠিক কোন নকশা আবার ব্যবহার হয়েছে, সেই পাতায় বিস্তারিত নেই; প্রতিটি মিশনের রেকর্ড দেখতে হবে।" },
        requires: ["legacy-release"],
        sources: [{ label: "NASA/JPL · Opportunity mission comes to end", url: JPL_END, classification: "verified" }],
      },
    ],
    claims: [
      { id: "o-tau", bands: ALL, verdict: "verified", text: { en: "On June 10, 2018, JPL estimated the storm's tau at about 10.8.", bn: "১০ জুন ২০১৮ JPL ঝড়ের টাউ প্রায় ১০.৮ অনুমান করে।" }, why: { en: "A published JPL estimate from that day.", bn: "সেদিনের প্রকাশিত JPL অনুমান।" } },
      { id: "o-words", bands: ALL, verdict: "unsupported", text: { en: "Opportunity's last message said \"my battery is low and it's getting dark\".", bn: "অপরচুনিটির শেষ বার্তায় লেখা ছিল \"আমার ব্যাটারি কম, অন্ধকার হয়ে আসছে\"।" }, why: { en: "The rover sent data and images, not sentences. NASA's record of its last transmission is an incomplete image (PIA22929), not words.", bn: "রোভার পাঠাত ডেটা আর ছবি, বাক্য নয়। NASA-র রেকর্ডে এর শেষ প্রেরণ একটি অসম্পূর্ণ ছবি (PIA22929), কোনো কথা নয়।" } },
      { id: "o-habitable", bands: OLDER, verdict: "interpretation", text: { en: "Conditions at Meridiani Planum may once have been habitable.", bn: "মেরিডিয়ানি প্লানামের পরিবেশ একসময় বাসযোগ্য থাকতে পারে।" }, why: { en: "NASA's conclusion drawn from water-formed minerals: supported, but an interpretation.", bn: "পানিতে তৈরি খনিজ থেকে NASA-র সিদ্ধান্ত: প্রমাণসমর্থিত, তবে ব্যাখ্যা।" } },
      { id: "o-life", bands: ["research"], verdict: "unsupported", text: { en: "Opportunity proved that life once existed on Mars.", bn: "অপরচুনিটি প্রমাণ করেছে মঙ্গলে একসময় জীবন ছিল।" }, why: { en: "Habitable conditions are not evidence of life; no such proof was reported.", bn: "বাসযোগ্য পরিবেশ জীবনের প্রমাণ নয়; এমন কোনো প্রমাণের কথা জানানো হয়নি।" } },
    ],
  },
  {
    id: "surveyor-3",
    world: "moon",
    mission: { en: "Surveyor 3 · Moon · 1967, visited by Apollo 12 in 1969", bn: "সার্ভেয়ার ৩ · চাঁদ · ১৯৬৭, ১৯৬৯-এ অ্যাপোলো ১২-এর সফর" },
    links: [
      {
        layer: "hardware",
        title: { en: "A lander with a scoop and a TV camera", bn: "স্কুপ আর টিভি ক্যামেরাসহ এক ল্যান্ডার" },
        know: { en: "Surveyor 3 was the first Surveyor to carry a surface sampler, which could reach 1.5 m and dig 18 cm, plus a TV camera viewing through a movable mirror.", bn: "সার্ভেয়ার ৩ ছিল প্রথম সার্ভেয়ার যার ছিল মাটি তোলার যন্ত্র — ১.৫ মিটার দূর পর্যন্ত পৌঁছে ১৮ সেমি খুঁড়তে পারত — আর নড়ানো যায় এমন আয়নার মধ্য দিয়ে দেখা টিভি ক্যামেরা।" },
        simple: { en: "It had a little digging arm and a TV camera.", bn: "এর ছিল ছোট একটি খোঁড়ার হাত আর একটি টিভি ক্যামেরা।" },
        how: { en: "NASA's Surveyor 3 mission page.", bn: "NASA-র সার্ভেয়ার ৩ মিশন পাতা।" },
        uncertain: { en: "This game shows Surveyor 3 only through NASA photos; it has no 3D model of it.", bn: "এই গেমে সার্ভেয়ার ৩ দেখানো হয় শুধু NASA-র ছবিতে; এর কোনো 3D মডেল নেই।" },
        requires: ["surveyor-3"],
        sources: [{ label: "NASA Science · Surveyor 3", url: SURVEYOR3, classification: "verified" }],
      },
      {
        layer: "evidence",
        title: { en: "Landing and silence", bn: "অবতরণ আর নীরবতা" },
        know: { en: "Surveyor 3 landed on April 20, 1967 (UT) in Oceanus Procellarum. NASA lists its last contact as May 4, 1967.", bn: "সার্ভেয়ার ৩ ২০ এপ্রিল ১৯৬৭ (UT) ওশেনাস প্রসেলারামে নামে। NASA-র তালিকায় শেষ যোগাযোগ ৪ মে ১৯৬৭।" },
        simple: { en: "It landed in April 1967 and went quiet two weeks later.", bn: "১৯৬৭-র এপ্রিলে নামে, দুই সপ্তাহ পরে নীরব হয়ে যায়।" },
        how: { en: "NASA mission records and Apollo 12 photographs of the lander.", bn: "NASA-র মিশন রেকর্ড আর ল্যান্ডারের অ্যাপোলো ১২ ছবি।" },
        uncertain: { en: "Some NASA captions say April 19, 1967: that is US time; April 20 is UT.", bn: "কিছু NASA ক্যাপশনে ১৯ এপ্রিল ১৯৬৭ লেখা: সেটি মার্কিন সময়; ২০ এপ্রিল UT।" },
        requires: ["surveyor-3"],
        sources: [
          { label: "NASA Science · Surveyor 3", url: SURVEYOR3, classification: "verified" },
          { label: "NASA NSSDCA · Surveyor 3 (1967-035A)", url: NSSDCA_S3, classification: "verified" },
        ],
      },
      {
        layer: "discovery",
        title: { en: "The ground could hold a landing", bn: "মাটি অবতরণের ভার সইতে পারত" },
        know: { en: "From its surface-sampling tests, scientists concluded lunar soil was like wet sand and solid enough to support an Apollo Lunar Module (about 0.7 kg per cm²).", bn: "মাটি পরীক্ষা থেকে বিজ্ঞানীরা সিদ্ধান্তে আসেন, চাঁদের মাটি ভেজা বালুর মতো এবং অ্যাপোলো লুনার মডিউলের ভার সইতে যথেষ্ট শক্ত (প্রতি বর্গসেমিতে প্রায় ০.৭ কেজি)।" },
        simple: { en: "Its digging showed the Moon's ground was firm enough for astronauts to land on.", bn: "এর খোঁড়াখুঁড়ি দেখাল, চাঁদের মাটি নভোচারীদের নামার মতো যথেষ্ট শক্ত।" },
        how: { en: "Measurements from the scoop experiments, interpreted by NASA scientists.", bn: "স্কুপ-পরীক্ষার পরিমাপ, NASA-র বিজ্ঞানীদের ব্যাখ্যায়।" },
        uncertain: { en: "It describes the soil where Surveyor 3 landed, not every place on the Moon.", bn: "এটি সার্ভেয়ার ৩ যেখানে নেমেছিল সেখানকার মাটির কথা, চাঁদের সব জায়গার নয়।" },
        requires: ["surveyor-3"],
        sources: [{ label: "NASA Science · Surveyor 3", url: SURVEYOR3, classification: "interpretation" }],
      },
      {
        layer: "legacy",
        title: { en: "Astronauts brought the machine home", bn: "নভোচারীরা যন্ত্রটি ঘরে ফিরিয়ে আনলেন" },
        know: { en: "Apollo 12 landed about 180 m (600 ft) away. Conrad and Bean recovered parts including the TV camera and soil scoop so scientists could evaluate nearly two and a half years of exposure on the Moon.", bn: "অ্যাপোলো ১২ প্রায় ১৮০ মিটার (৬০০ ফুট) দূরে নামে। কনরাড ও বিন টিভি ক্যামেরা আর মাটির স্কুপসহ অংশ ফিরিয়ে আনেন, যাতে বিজ্ঞানীরা চাঁদে প্রায় আড়াই বছর থাকার প্রভাব মূল্যায়ন করতে পারেন।" },
        simple: { en: "Astronauts walked to it and carried pieces back to Earth to study.", bn: "নভোচারীরা হেঁটে গিয়ে এর অংশ পৃথিবীতে এনে পরীক্ষা করতে দেন।" },
        how: { en: "Apollo 12 photographs and NASA mission records.", bn: "অ্যাপোলো ১২-এর ছবি আর NASA-র মিশন রেকর্ড।" },
        uncertain: { en: "What the examination found is not covered here. A widely repeated bacteria story is left out: we found no NASA statement confirming it.", bn: "পরীক্ষায় কী পাওয়া গেছে, তা এখানে নেই। বহুল প্রচলিত এক ব্যাকটেরিয়ার গল্প বাদ রাখা হয়েছে: একে নিশ্চিত করা কোনো NASA বিবৃতি আমরা পাইনি।" },
        requires: ["apollo12-retrieval"],
        sources: [
          { label: "NASA Science · Apollo 12 and Surveyor 3", url: APOLLO12_S3, classification: "verified" },
          { label: "NASA NSSDCA · Surveyor 3 (1967-035A)", url: NSSDCA_S3, classification: "verified" },
        ],
      },
    ],
    claims: [
      { id: "s-parts", bands: ALL, verdict: "verified", text: { en: "Apollo 12 astronauts brought Surveyor 3's TV camera back to Earth.", bn: "অ্যাপোলো ১২-এর নভোচারীরা সার্ভেয়ার ৩-এর টিভি ক্যামেরা পৃথিবীতে ফিরিয়ে আনেন।" }, why: { en: "Recorded by NASA and shown in Apollo 12 photographs.", bn: "NASA-র রেকর্ডে আছে, অ্যাপোলো ১২-এর ছবিতেও দেখা যায়।" } },
      { id: "s-signal", bands: ALL, verdict: "unsupported", text: { en: "Surveyor 3 was still sending pictures when Apollo 12 arrived.", bn: "অ্যাপোলো ১২ পৌঁছানোর সময়ও সার্ভেয়ার ৩ ছবি পাঠাচ্ছিল।" }, why: { en: "NASA lists last contact as May 4, 1967, two and a half years earlier.", bn: "NASA-র তালিকায় শেষ যোগাযোগ ৪ মে ১৯৬৭, আড়াই বছর আগে।" } },
      { id: "s-soil", bands: OLDER, verdict: "interpretation", text: { en: "The lunar soil where it landed could support an Apollo Lunar Module.", bn: "যেখানে নেমেছিল সেখানকার চাঁদের মাটি অ্যাপোলো লুনার মডিউলের ভার সইতে পারত।" }, why: { en: "A conclusion scientists drew from the scoop measurements.", bn: "স্কুপ-পরিমাপ থেকে বিজ্ঞানীদের টানা সিদ্ধান্ত।" } },
      { id: "s-all", bands: ["research"], verdict: "unsupported", text: { en: "Surveyor 3 showed the entire lunar surface is firm enough for landings.", bn: "সার্ভেয়ার ৩ দেখিয়েছে চাঁদের পুরো পৃষ্ঠই অবতরণের মতো শক্ত।" }, why: { en: "One landing site cannot speak for the whole Moon.", bn: "একটি অবতরণস্থল পুরো চাঁদের হয়ে কথা বলতে পারে না।" } },
    ],
  },
];

export const ECHO_CHAIN_BY_ID: ReadonlyMap<string, EchoChain> = new Map(ECHO_CHAINS.map((c) => [c.id, c]));
export const CHAIN_IDS: ReadonlySet<string> = new Set(ECHO_CHAINS.map((c) => c.id));

/** Which layers are revealed for the evidence recovered so far. */
export function revealedLayers(chain: EchoChain, evidence: readonly string[]): Layer[] {
  const have = new Set(evidence);
  return chain.links.filter((l) => l.requires.every((id) => have.has(id))).map((l) => l.layer);
}

export const chainComplete = (chain: EchoChain, evidence: readonly string[]) => revealedLayers(chain, evidence).length === chain.links.length;

/** Claims shown to a learner band (deterministic, data order). */
export const claimsFor = (chain: EchoChain, band: LearnerBand) => chain.claims.filter((c) => c.bands.includes(band));

/** Grade a Claim Check: every shown claim must be classified correctly. */
export function gradeClaims(chain: EchoChain, band: LearnerBand, answers: Readonly<Record<string, ClaimVerdict | undefined>>): { correct: boolean; wrong: string[] } {
  const shown = claimsFor(chain, band);
  const wrong = shown.filter((c) => answers[c.id] !== c.verdict).map((c) => c.id);
  return { correct: wrong.length === 0, wrong };
}
