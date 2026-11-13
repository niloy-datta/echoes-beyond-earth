/**
 * Quiz Portal question bank. Every item restates a fact verified from a NASA
 * page or computed from NASA PDS data (see `kind` and `source`). Nothing here is
 * invented telemetry. Pre- and post-assessments are parallel forms: two items
 * per competency, different wording and context, same skills.
 *
 * Verified anchors used below (read 2026-11-12/13):
 * - JPL "Opportunity Rover Mission on Mars Comes to End" (Feb. 13, 2019): landed
 *   Jan. 24, 2004; designed for 90 days; more than 15 years; last communication
 *   June 10, 2018; hematite at landing site; one-day record 220 m (Mar. 20, 2005);
 *   more than 217,000 images.
 * - JPL "Opportunity Hunkers Down During Dust Storm": tau about 10.8 on June 10, 2018.
 * - Photojournal PIA22929 / PIA22930 / PIA22909 / PIA23178 / PIA22521.
 * - NASA PDS product 1TAU880_5106_20181207A (Opportunity Pancam 880 nm opacity).
 * - science.nasa.gov Surveyor 3; "Apollo 12 and Surveyor 3".
 */
export type Competency = "hardware" | "environment" | "history" | "evidence" | "reasoning";
export type AgeGroup = "beginner" | "intermediate" | "advanced";
export type ItemUse = "pre" | "post" | "chapter" | "challenge";
/** What kind of knowledge the answer rests on (shown to the player). */
export type EvidenceKind = "observed" | "derived" | "model" | "interpretation";
type T = { en: string; bn: string };

export interface BankItem {
  id: string;
  competency: Competency;
  use: ItemUse;
  /** Game chapter index (0..4) for chapter items. */
  chapter?: number;
  prompt: T;
  /** Simpler wording for ages 8–10. Same options, same answer. */
  simple?: T;
  options: readonly T[];
  correct: number;
  explanation: T;
  /** The misconception behind the most common wrong answer. */
  misconception: T;
  /** Age-appropriate hint shown after a wrong first attempt. */
  hint: T;
  kind: EvidenceKind;
  source: { label: string; url: string };
}

export const COMPETENCIES: readonly { id: Competency; title: T }[] = [
  { id: "hardware", title: { en: "Spacecraft hardware", bn: "মহাকাশযানের যন্ত্রাংশ" } },
  { id: "environment", title: { en: "Mars environmental science", bn: "মঙ্গলের পরিবেশ বিজ্ঞান" } },
  { id: "history", title: { en: "NASA mission history", bn: "NASA মিশনের ইতিহাস" } },
  { id: "evidence", title: { en: "Interpreting scientific evidence", bn: "বৈজ্ঞানিক প্রমাণ ব্যাখ্যা" } },
  { id: "reasoning", title: { en: "Observation versus hypothesis", bn: "পর্যবেক্ষণ বনাম অনুমান" } },
];

export const AGE_GROUPS: readonly { id: AgeGroup; ages: string; title: T }[] = [
  { id: "beginner", ages: "8–10", title: { en: "Beginner explorer", bn: "নবীন অভিযাত্রী" } },
  { id: "intermediate", ages: "11–13", title: { en: "Intermediate investigator", bn: "মধ্যম অনুসন্ধানী" } },
  { id: "advanced", ages: "14–17", title: { en: "Advanced scientist", bn: "উন্নত বিজ্ঞানী" } },
];

const JPL_END = { label: "NASA/JPL · Opportunity mission comes to end (Feb. 13, 2019)", url: "https://www.jpl.nasa.gov/news/nasas-opportunity-rover-mission-on-mars-comes-to-end" };
const JPL_STORM = { label: "NASA/JPL · Opportunity hunkers down during dust storm", url: "https://www.jpl.nasa.gov/news/opportunity-hunkers-down-during-dust-storm" };
const PIA22929 = { label: "NASA · PIA22929 Opportunity's Last Message", url: "https://science.nasa.gov/photojournal/opportunitys-last-message/" };
const PIA22930 = { label: "NASA · PIA22930 Last Images Opportunity Took", url: "https://science.nasa.gov/photojournal/last-images-opportunity-took/" };
const PIA22909 = { label: "NASA · PIA22909 Opportunity Legacy Pan", url: "https://science.nasa.gov/photojournal/opportunity-legacy-pan-true-color/" };
const PIA23178 = { label: "NASA · PIA23178 Opportunity's Final Traverse Map", url: "https://images.nasa.gov/details/PIA23178" };
const PIA22521 = { label: "NASA · PIA22521 Shades of Martian Darkness (simulation)", url: "https://science.nasa.gov/photojournal/shades-of-martian-darkness/" };
const PDS_TAU = { label: "NASA PDS · MER Pancam derived opacity, product 1TAU880_5106_20181207A (DOI 10.17189/1518992)", url: "https://pds-geosciences.wustl.edu/mer/mer1_mer2-m-pancam-5-atmos-opacity-v1/merao_1xxx/data/1tau880_5106_20181207a.tab" };
const SURVEYOR = { label: "NASA Science · Surveyor 3", url: "https://science.nasa.gov/mission/surveyor-3/" };
const APOLLO_S3 = { label: "NASA Science · Apollo 12 and Surveyor 3", url: "https://science.nasa.gov/resource/apollo-12-and-surveyor-3/" };

const o = (...pairs: [string, string][]): T[] => pairs.map(([en, bn]) => ({ en, bn }));

export const BANK: readonly BankItem[] = [
  // ── Pre-assessment (2 per competency) ────────────────────────────────────
  { id: "pre-hw-1", competency: "hardware", use: "pre", kind: "observed", source: JPL_END,
    prompt: { en: "Where did Opportunity get the energy to move and run its instruments?", bn: "অপরচুনিটি চলা ও যন্ত্র চালানোর শক্তি কোথা থেকে পেত?" },
    simple: { en: "What gave Opportunity its power?", bn: "অপরচুনিটি শক্তি পেত কী থেকে?" },
    options: o(["Sunlight, through solar panels and batteries", "সৌর প্যানেল ও ব্যাটারির মাধ্যমে সূর্যের আলো থেকে"], ["Wind turbines on its mast", "মাস্টের বায়ুকল থেকে"], ["Fuel delivered by later missions", "পরের মিশনের আনা জ্বালানি থেকে"], ["Heat from the Martian ground", "মঙ্গলের মাটির তাপ থেকে"]),
    correct: 0, explanation: { en: "NASA describes Opportunity as a solar-powered rover.", bn: "NASA অপরচুনিটিকে সৌরচালিত রোভার বলে বর্ণনা করে।" },
    misconception: { en: "Rovers do not refuel; no later mission visited Opportunity.", bn: "রোভার জ্বালানি নেয় না; পরের কোনো মিশন অপরচুনিটির কাছে যায়নি।" },
    hint: { en: "Think about what the dust storm blocked.", bn: "ভাবো, ধুলিঝড় কী আটকে দিয়েছিল।" } },
  { id: "pre-hw-2", competency: "hardware", use: "pre", kind: "observed", source: PIA22909,
    prompt: { en: "Which instrument took the 354 images of Opportunity's Legacy Pan?", bn: "অপরচুনিটির লেগ্যাসি প্যানের ৩৫৪টি ছবি কোন যন্ত্র তুলেছিল?" },
    options: o(["The Pancam on the mast", "মাস্টের প্যানক্যাম"], ["The wheels", "চাকা"], ["The solar panels", "সৌর প্যানেল"], ["An orbiting satellite", "কক্ষপথের উপগ্রহ"]),
    correct: 0, explanation: { en: "NASA's PIA22909 says the panorama is made of 354 Pancam images.", bn: "NASA-র PIA22909 অনুযায়ী প্যানোরামাটি ৩৫৪টি প্যানক্যাম ছবি দিয়ে তৈরি।" },
    misconception: { en: "Orbiters photograph Mars from above; this panorama was taken on the ground.", bn: "কক্ষপথের যান ওপর থেকে ছবি তোলে; এই প্যানোরামা মাটি থেকে তোলা।" },
    hint: { en: "Pan in “Legacy Pan” is short for panorama, and for the camera's name.", bn: "“লেগ্যাসি প্যান”-এর প্যান মানে প্যানোরামা, আবার ক্যামেরার নামও।" } },
  { id: "pre-env-1", competency: "environment", use: "pre", kind: "model", source: PIA22521,
    prompt: { en: "When dust makes the Martian sky thicker (higher tau), what happens to sunlight reaching the ground?", bn: "ধুলায় মঙ্গলের আকাশ ঘন হলে (টাউ বাড়লে) মাটিতে পৌঁছানো সূর্যালোকের কী হয়?" },
    simple: { en: "If the sky gets very dusty, does more or less sunlight reach the rover?", bn: "আকাশ খুব ধুলাময় হলে রোভারে বেশি না কম সূর্যালোক পৌঁছায়?" },
    options: o(["It decreases", "কমে যায়"], ["It increases", "বেড়ে যায়"], ["It stays exactly the same", "একদম একই থাকে"], ["It turns into wind", "বাতাসে পরিণত হয়"]),
    correct: 0, explanation: { en: "Higher opacity blocks more direct sunlight; NASA's PIA22521 simulates the Sun fading as tau rises.", bn: "অস্বচ্ছতা বাড়লে বেশি সরাসরি আলো আটকায়; NASA-র PIA22521 টাউ বাড়লে সূর্য ম্লান হওয়ার সিমুলেশন দেখায়।" },
    misconception: { en: "Dust in the air is not fuel; it shades the panels.", bn: "বাতাসের ধুলা জ্বালানি নয়; এটি প্যানেলকে ছায়া দেয়।" },
    hint: { en: "Think of a curtain getting thicker.", bn: "ভাবো একটা পর্দা ক্রমশ ঘন হচ্ছে।" } },
  { id: "pre-env-2", competency: "environment", use: "pre", kind: "observed", source: PIA22909,
    prompt: { en: "What is a “sol”?", bn: "“সল” কী?" },
    options: o(["A Martian day", "মঙ্গলের একটি দিন"], ["A Martian year", "মঙ্গলের একটি বছর"], ["A type of rock", "এক ধরনের পাথর"], ["A unit of dust", "ধুলার একক"]),
    correct: 0, explanation: { en: "Mission days on Mars are counted in sols, or Martian days.", bn: "মঙ্গলে মিশনের দিন গোনা হয় সল বা মঙ্গল-দিনে।" },
    misconception: { en: "A sol is a day, not a year.", bn: "সল একটি দিন, বছর নয়।" },
    hint: { en: "Opportunity was planned for about 90 of them.", bn: "অপরচুনিটির পরিকল্পনা ছিল এর প্রায় ৯০টির জন্য।" } },
  { id: "pre-his-1", competency: "history", use: "pre", kind: "observed", source: JPL_END,
    prompt: { en: "Opportunity was designed for about 90 days. How long did its exploration last?", bn: "অপরচুনিটি প্রায় ৯০ দিনের জন্য তৈরি। এর অনুসন্ধান কতদিন চলেছিল?" },
    options: o(["More than 15 years", "১৫ বছরের বেশি"], ["Exactly 90 days", "ঠিক ৯০ দিন"], ["About 1 year", "প্রায় ১ বছর"], ["It never landed", "এটি নামেইনি"]),
    correct: 0, explanation: { en: "JPL: designed to run for 90 days, the exploration spanned more than 15 years (2004–2019).", bn: "JPL: ৯০ দিনের জন্য তৈরি, অনুসন্ধান চলেছিল ১৫ বছরের বেশি (২০০৪–২০১৯)।" },
    misconception: { en: "The plan was 90 days, but the rover kept working far longer.", bn: "পরিকল্পনা ৯০ দিনের ছিল, কিন্তু রোভার অনেক বেশি দিন কাজ করেছে।" },
    hint: { en: "It landed in 2004; the mission ended in 2019.", bn: "এটি নামে ২০০৪-এ; মিশন শেষ হয় ২০১৯-এ।" } },
  { id: "pre-his-2", competency: "history", use: "pre", kind: "observed", source: SURVEYOR,
    prompt: { en: "Which spacecraft did Apollo 12 astronauts visit on the Moon in 1969?", bn: "১৯৬৯-এ অ্যাপোলো ১২-এর নভোচারীরা চাঁদে কোন মহাকাশযানের কাছে গিয়েছিলেন?" },
    options: o(["Surveyor 3", "সার্ভেয়ার ৩"], ["Opportunity", "অপরচুনিটি"], ["Spirit", "স্পিরিট"], ["Curiosity", "কিউরিওসিটি"]),
    correct: 0, explanation: { en: "Apollo 12 landed near Surveyor 3 and recovered some of its parts.", bn: "অ্যাপোলো ১২ সার্ভেয়ার ৩-এর কাছে নামে এবং এর কিছু অংশ ফিরিয়ে আনে।" },
    misconception: { en: "Opportunity, Spirit and Curiosity are Mars rovers, not on the Moon.", bn: "অপরচুনিটি, স্পিরিট ও কিউরিওসিটি মঙ্গলের রোভার, চাঁদের নয়।" },
    hint: { en: "It was a lander from 1967.", bn: "এটি ১৯৬৭ সালের একটি ল্যান্ডার।" } },
  { id: "pre-ev-1", competency: "evidence", use: "pre", kind: "observed", source: PIA22929,
    prompt: { en: "NASA's PIA22929 is the last image Opportunity transmitted. Why is its bottom black?", bn: "NASA-র PIA22929 অপরচুনিটির শেষ পাঠানো ছবি। এর নিচের অংশ কালো কেন?" },
    options: o(["Transmission stopped before the image was complete", "ছবি সম্পূর্ণ হওয়ার আগেই প্রেরণ থেমে যায়"], ["The camera saw a black rock", "ক্যামেরা একটি কালো পাথর দেখেছিল"], ["NASA painted it to look dramatic", "NASA নাটকীয় করতে রং করেছে"], ["It was taken at night", "এটি রাতে তোলা"]),
    correct: 0, explanation: { en: "NASA: the transmission stopped before the full image was sent; the missing part is shown as black pixels.", bn: "NASA: পুরো ছবি পাঠানোর আগেই প্রেরণ থেমে যায়; হারানো অংশ কালো পিক্সেলে দেখানো।" },
    misconception: { en: "Black pixels here mean missing data, not a dark object.", bn: "এখানে কালো পিক্সেল মানে হারানো তথ্য, কোনো অন্ধকার বস্তু নয়।" },
    hint: { en: "The word “incomplete” is the clue.", bn: "“অসম্পূর্ণ” শব্দটিই সূত্র।" } },
  { id: "pre-ev-2", competency: "evidence", use: "pre", kind: "observed", source: PIA22930,
    prompt: { en: "Was the last image Opportunity sent (PIA22929) also the last image it took?", bn: "অপরচুনিটির শেষ পাঠানো ছবি (PIA22929) কি শেষ তোলা ছবিও?" },
    options: o(["No: later images were taken, but only thumbnails were sent", "না: পরে ছবি তোলা হয়েছিল, শুধু থাম্বনেইল পাঠানো গেছে"], ["Yes, it was both", "হ্যাঁ, দুটোই"], ["No: the last image was taken in 2019", "না: শেষ ছবি তোলা হয় ২০১৯-এ"], ["Nobody knows anything about it", "এ বিষয়ে কেউ কিছুই জানে না"]),
    correct: 0, explanation: { en: "NASA's PIA22930: two later images were taken; only their thumbnails were transmitted.", bn: "NASA-র PIA22930: পরে দুটি ছবি তোলা হয়; শুধু থাম্বনেইল পাঠানো গিয়েছিল।" },
    misconception: { en: "“Last sent” and “last taken” are different events.", bn: "“শেষ পাঠানো” আর “শেষ তোলা” আলাদা ঘটনা।" },
    hint: { en: "Look up PIA22930: “Last Images Opportunity Took”.", bn: "PIA22930 দেখো: “Last Images Opportunity Took”।" } },
  { id: "pre-rs-1", competency: "reasoning", use: "pre", kind: "interpretation", source: JPL_END,
    prompt: { en: "Opportunity found hematite, a mineral that forms in water. Which statement is an interpretation, not a direct observation?", bn: "অপরচুনিটি হেমাটাইট পায়, যে খনিজ পানিতে তৈরি হয়। কোন বক্তব্যটি সরাসরি পর্যবেক্ষণ নয়, ব্যাখ্যা?" },
    options: o(["Conditions there may once have been habitable", "সেখানের পরিবেশ একসময় বাসযোগ্য থাকতে পারে"], ["Hematite was found at the landing site", "অবতরণস্থলে হেমাটাইট পাওয়া গেছে"], ["The rover landed in 2004", "রোভার ২০০৪-এ নামে"], ["The rover had solar panels", "রোভারের সৌর প্যানেল ছিল"]),
    correct: 0, explanation: { en: "Finding hematite is an observation; “may have been habitable” is NASA's interpretation of it.", bn: "হেমাটাইট পাওয়া পর্যবেক্ষণ; “বাসযোগ্য থাকতে পারে” হলো তার ওপর NASA-র ব্যাখ্যা।" },
    misconception: { en: "An interpretation can be well supported and still not be a direct observation.", bn: "ব্যাখ্যা ভালোভাবে সমর্থিত হলেও সরাসরি পর্যবেক্ষণ নয়।" },
    hint: { en: "Look for the word “may”.", bn: "“থাকতে পারে” শব্দগুলো খোঁজো।" } },
  { id: "pre-rs-2", competency: "reasoning", use: "pre", kind: "model", source: PIA22521,
    prompt: { en: "NASA's PIA22521 shows the Sun fading at tau 1 to 11. What kind of evidence is it?", bn: "NASA-র PIA22521 টাউ ১ থেকে ১১-এ সূর্য ম্লান হওয়া দেখায়। এটি কোন ধরনের প্রমাণ?" },
    options: o(["A simulation (a model of what the sky would look like)", "সিমুলেশন (আকাশ কেমন দেখাবে তার মডেল)"], ["A photo taken on June 10, 2018", "১০ জুন ২০১৮-এ তোলা ছবি"], ["Rover telemetry", "রোভারের টেলিমেট্রি"], ["An artist's guess with no data", "কোনো তথ্য ছাড়া শিল্পীর অনুমান"]),
    correct: 0, explanation: { en: "NASA labels PIA22521 as simulated views of a darkening sky.", bn: "NASA PIA22521-কে ধুলাময় আকাশের সিমুলেটেড দৃশ্য বলে চিহ্নিত করে।" },
    misconception: { en: "A realistic picture is not automatically a photograph.", bn: "বাস্তবসম্মত ছবি মানেই আলোকচিত্র নয়।" },
    hint: { en: "Read the NASA caption's first word: “simulated”.", bn: "NASA ক্যাপশনের শব্দটি দেখো: “simulated”।" } },

  // ── Post-assessment (parallel form) ──────────────────────────────────────
  { id: "post-hw-1", competency: "hardware", use: "post", kind: "observed", source: JPL_END,
    prompt: { en: "Why could a planet-wide dust storm threaten Opportunity but not a rover that runs without sunlight?", bn: "একটি গ্রহজোড়া ধুলিঝড় কেন অপরচুনিটির জন্য বিপজ্জনক ছিল, কিন্তু সূর্যালোক ছাড়া চলা রোভারের জন্য নয়?" },
    simple: { en: "Why was a big dust storm dangerous for Opportunity?", bn: "বড় ধুলিঝড় অপরচুনিটির জন্য বিপজ্জনক ছিল কেন?" },
    options: o(["Opportunity depended on sunlight for power", "অপরচুনিটি শক্তির জন্য সূর্যালোকের ওপর নির্ভরশীল ছিল"], ["Dust made the wheels too heavy", "ধুলায় চাকা খুব ভারী হয়ে যেত"], ["Storms erase radio signals forever", "ঝড় রেডিও সংকেত চিরতরে মুছে দেয়"], ["Opportunity had no camera", "অপরচুনিটির ক্যামেরা ছিল না"]),
    correct: 0, explanation: { en: "A solar-powered rover loses power when dust blocks sunlight.", bn: "ধুলা সূর্যালোক আটকালে সৌরচালিত রোভার শক্তি হারায়।" },
    misconception: { en: "The danger was lost sunlight, not extra weight.", bn: "বিপদ ছিল সূর্যালোক হারানো, বাড়তি ওজন নয়।" },
    hint: { en: "What powered its batteries?", bn: "এর ব্যাটারি কী দিয়ে চার্জ হতো?" } },
  { id: "post-hw-2", competency: "hardware", use: "post", kind: "observed", source: SURVEYOR,
    prompt: { en: "Surveyor 3 carried a tool that could dig about 18 cm into the lunar soil. What was it?", bn: "সার্ভেয়ার ৩-এ এমন যন্ত্র ছিল যা চাঁদের মাটিতে প্রায় ১৮ সেমি খুঁড়তে পারত। সেটি কী?" },
    options: o(["A surface sampler (scoop)", "মাটি তোলার যন্ত্র (স্কুপ)"], ["A solar sail", "সৌর পাল"], ["A drill for Mars rocks", "মঙ্গলের পাথরের ড্রিল"], ["A weather balloon", "আবহাওয়া বেলুন"]),
    correct: 0, explanation: { en: "NASA: Surveyor 3 was the first Surveyor with a surface sampler that could dig up to 7 inches (18 cm).", bn: "NASA: সার্ভেয়ার ৩ ছিল প্রথম সার্ভেয়ার যার মাটি তোলার যন্ত্র ১৮ সেমি পর্যন্ত খুঁড়তে পারত।" },
    misconception: { en: "Surveyor 3 was on the Moon, not Mars.", bn: "সার্ভেয়ার ৩ চাঁদে ছিল, মঙ্গলে নয়।" },
    hint: { en: "Apollo 12 astronauts brought this part home.", bn: "অ্যাপোলো ১২-এর নভোচারীরা এই অংশ ফিরিয়ে আনেন।" } },
  { id: "post-env-1", competency: "environment", use: "post", kind: "derived", source: PDS_TAU,
    prompt: { en: "In NASA's Opportunity opacity data (880 nm), the typical daily tau over 2004–2018 was about 0.7. On sol 5105 (June 2018) it was 2.26. What does that show?", bn: "NASA-র অপরচুনিটি অস্বচ্ছতা তথ্যে (৮৮০ ন্যানোমিটার) ২০০৪–২০১৮-এ সাধারণ দৈনিক টাউ ছিল প্রায় ০.৭। ৫১০৫ সলে (জুন ২০১৮) ছিল ২.২৬। এতে কী বোঝা যায়?" },
    simple: { en: "The sky's dust number jumped from about 0.7 to 2.26. Was the sky getting clearer or dustier?", bn: "আকাশের ধুলার মান প্রায় ০.৭ থেকে ২.২৬-এ লাফ দিল। আকাশ পরিষ্কার হচ্ছিল নাকি ধুলাময়?" },
    options: o(["The sky was becoming much dustier than usual", "আকাশ স্বাভাবিকের চেয়ে অনেক বেশি ধুলাময় হচ্ছিল"], ["The sky was clearing", "আকাশ পরিষ্কার হচ্ছিল"], ["The rover drove faster", "রোভার দ্রুত চলছিল"], ["Nothing changed", "কিছুই বদলায়নি"]),
    correct: 0, explanation: { en: "Higher tau means more dust. Computed from NASA PDS product 1TAU880_5106_20181207A (median per sol).", bn: "টাউ বেশি মানে বেশি ধুলা। NASA PDS পণ্য 1TAU880_5106_20181207A থেকে গণনা (প্রতি সলের মধ্যমা)।" },
    misconception: { en: "A higher opacity number means less transparent, not clearer.", bn: "অস্বচ্ছতার সংখ্যা বেশি মানে কম স্বচ্ছ, পরিষ্কার নয়।" },
    hint: { en: "Opacity measures how much the sky blocks light.", bn: "অস্বচ্ছতা মাপে আকাশ কতটা আলো আটকায়।" } },
  { id: "post-env-2", competency: "environment", use: "post", kind: "observed", source: PDS_TAU,
    prompt: { en: "NASA's opacity table records “solar longitude”. What does it describe?", bn: "NASA-র অস্বচ্ছতা টেবিলে “সৌর দ্রাঘিমা” লেখা থাকে। এটি কী বোঝায়?" },
    options: o(["The Martian season (degrees past northern spring equinox)", "মঙ্গলের ঋতু (উত্তর বসন্ত বিষুবের পর কত ডিগ্রি)"], ["The rover's speed", "রোভারের গতি"], ["The color of the dust", "ধুলার রং"], ["The time on Earth", "পৃথিবীর সময়"]),
    correct: 0, explanation: { en: "The PDS label defines solar longitude as the Martian season in degrees past northern spring equinox.", bn: "PDS লেবেলে সৌর দ্রাঘিমাকে উত্তর বসন্ত বিষুবের পরের ডিগ্রিতে মঙ্গলের ঋতু বলা হয়েছে।" },
    misconception: { en: "It is a season marker, not a place on the map.", bn: "এটি ঋতুর মাপ, মানচিত্রের অবস্থান নয়।" },
    hint: { en: "Dust storms on Mars depend on the season.", bn: "মঙ্গলের ধুলিঝড় ঋতুর ওপর নির্ভর করে।" } },
  { id: "post-his-1", competency: "history", use: "post", kind: "observed", source: JPL_END,
    prompt: { en: "When did NASA last hear from Opportunity, and when did it declare the mission complete?", bn: "NASA শেষ কবে অপরচুনিটির সাড়া পায়, আর কবে মিশন সম্পন্ন ঘোষণা করে?" },
    options: o(["Last contact June 10, 2018; declared complete Feb. 13, 2019", "শেষ যোগাযোগ ১০ জুন ২০১৮; সম্পন্ন ঘোষণা ১৩ ফেব্রুয়ারি ২০১৯"], ["Both in 2004", "দুটোই ২০০৪-এ"], ["Last contact 2019; complete 2018", "শেষ যোগাযোগ ২০১৯; সম্পন্ন ২০১৮"], ["The mission is still running", "মিশন এখনো চলছে"]),
    correct: 0, explanation: { en: "JPL: final communication June 10, 2018; mission declared complete Feb. 13, 2019 after months of attempts.", bn: "JPL: শেষ যোগাযোগ ১০ জুন ২০১৮; কয়েক মাস চেষ্টার পর ১৩ ফেব্রুয়ারি ২০১৯-এ মিশন সম্পন্ন ঘোষণা।" },
    misconception: { en: "NASA kept trying for months after the last contact.", bn: "শেষ যোগাযোগের পরও NASA কয়েক মাস চেষ্টা করেছিল।" },
    hint: { en: "The storm came first; the decision came later.", bn: "আগে ঝড়, পরে সিদ্ধান্ত।" } },
  { id: "post-his-2", competency: "history", use: "post", kind: "observed", source: APOLLO_S3,
    prompt: { en: "Why could Apollo 12 astronauts collect Surveyor 3's TV camera?", bn: "অ্যাপোলো ১২-এর নভোচারীরা কেন সার্ভেয়ার ৩-এর টিভি ক্যামেরা আনতে পেরেছিলেন?" },
    options: o(["Their lander set down about 600 feet away", "তাঁদের ল্যান্ডার প্রায় ৬০০ ফুট দূরে নামে"], ["Surveyor 3 flew back to Earth", "সার্ভেয়ার ৩ পৃথিবীতে উড়ে আসে"], ["It was found on Mars", "এটি মঙ্গলে পাওয়া যায়"], ["A robot carried it to them", "একটি রোবট তাঁদের কাছে নিয়ে আসে"]),
    correct: 0, explanation: { en: "NASA: the Apollo 12 lunar module landed about 600 feet from Surveyor 3; the camera and other pieces were brought back.", bn: "NASA: অ্যাপোলো ১২-এর লুনার মডিউল সার্ভেয়ার ৩ থেকে প্রায় ৬০০ ফুট দূরে নামে; ক্যামেরা ও অন্যান্য অংশ ফিরিয়ে আনা হয়।" },
    misconception: { en: "Surveyor 3 never moved after landing.", bn: "অবতরণের পর সার্ভেয়ার ৩ আর নড়েনি।" },
    hint: { en: "Astronauts walked over to it.", bn: "নভোচারীরা হেঁটে গিয়েছিলেন।" } },
  { id: "post-ev-1", competency: "evidence", use: "post", kind: "observed", source: PIA22930,
    prompt: { en: "PIA22930 shows a faint dot of Sun in two thumbnails. What do these images tell scientists?", bn: "PIA22930-এর দুটি থাম্বনেইলে সূর্যের ক্ষীণ বিন্দু দেখা যায়। এগুলো বিজ্ঞানীদের কী জানায়?" },
    options: o(["Very little sunlight was getting through the dust", "ধুলা ভেদ করে খুব কম সূর্যালোক আসছিল"], ["The Sun had moved", "সূর্য সরে গিয়েছিল"], ["The camera was broken", "ক্যামেরা ভাঙা ছিল"], ["It was night on Mars", "মঙ্গলে তখন রাত ছিল"]),
    correct: 0, explanation: { en: "NASA: with tau about 10.8, only a tiny amount of sunlight was getting through.", bn: "NASA: টাউ প্রায় ১০.৮ থাকায় খুব সামান্য সূর্যালোক আসছিল।" },
    misconception: { en: "A faint Sun means thick dust, not a broken camera.", bn: "ম্লান সূর্য মানে ঘন ধুলা, ভাঙা ক্যামেরা নয়।" },
    hint: { en: "Compare a clear day with a foggy day.", bn: "পরিষ্কার দিন আর কুয়াশার দিনের তুলনা করো।" } },
  { id: "post-ev-2", competency: "evidence", use: "post", kind: "observed", source: PIA23178,
    prompt: { en: "NASA's final traverse map (PIA23178) shows a route of 45.16 km. What is this evidence of?", bn: "NASA-র শেষ যাত্রাপথের মানচিত্রে (PIA23178) ৪৫.১৬ কিমি পথ দেখা যায়। এটি কিসের প্রমাণ?" },
    options: o(["How far Opportunity drove from landing to its final spot", "অবতরণ থেকে শেষ স্থান পর্যন্ত অপরচুনিটি কতদূর চলেছিল"], ["How far the dust storm traveled", "ধুলিঝড় কতদূর গিয়েছিল"], ["The distance from Earth to Mars", "পৃথিবী থেকে মঙ্গলের দূরত্ব"], ["Where Surveyor 3 landed", "সার্ভেয়ার ৩ কোথায় নেমেছিল"]),
    correct: 0, explanation: { en: "The map traces Opportunity's route from Eagle crater to the rim of Endeavour crater.", bn: "মানচিত্রটি ঈগল খাদ থেকে এনডেভার খাদের কিনারা পর্যন্ত অপরচুনিটির পথ দেখায়।" },
    misconception: { en: "A traverse map tracks the rover, not the weather.", bn: "যাত্রাপথের মানচিত্র রোভারের পথ দেখায়, আবহাওয়া নয়।" },
    hint: { en: "“Traverse” means a journey across.", bn: "“Traverse” মানে পার হয়ে যাওয়া।" } },
  { id: "post-rs-1", competency: "reasoning", use: "post", kind: "interpretation", source: JPL_END,
    prompt: { en: "Which conclusion goes beyond the evidence?", bn: "কোন সিদ্ধান্তটি প্রমাণের সীমা ছাড়িয়ে যায়?" },
    options: o(["Opportunity proved that life existed on Mars", "অপরচুনিটি প্রমাণ করেছে মঙ্গলে জীবন ছিল"], ["Opportunity found a mineral that forms in water", "অপরচুনিটি পানিতে তৈরি এক খনিজ পেয়েছে"], ["Opportunity explored for more than 15 years", "অপরচুনিটি ১৫ বছরের বেশি অনুসন্ধান করেছে"], ["Opportunity drove more than 45 km", "অপরচুনিটি ৪৫ কিমির বেশি চলেছে"]),
    correct: 0, explanation: { en: "Water-formed minerals suggest possibly habitable conditions; that is not evidence that life existed.", bn: "পানিতে তৈরি খনিজ সম্ভাব্য বাসযোগ্য পরিবেশের ইঙ্গিত দেয়; এটি জীবন থাকার প্রমাণ নয়।" },
    misconception: { en: "“Could support life” is not the same as “had life”.", bn: "“জীবন সম্ভব ছিল” আর “জীবন ছিল” এক নয়।" },
    hint: { en: "Which statement claims more than NASA reported?", bn: "কোন বক্তব্য NASA-র জানানোর চেয়ে বেশি দাবি করে?" } },
  { id: "post-rs-2", competency: "reasoning", use: "post", kind: "observed", source: JPL_STORM,
    prompt: { en: "JPL reported tau “about 10.8” on June 10, 2018. Why does it say “about”?", bn: "JPL ১০ জুন ২০১৮-এ টাউ “প্রায় ১০.৮” জানায়। “প্রায়” কেন বলা হয়েছে?" },
    options: o(["It is an estimate from images, with uncertainty", "এটি ছবি থেকে অনুমান, এতে অনিশ্চয়তা আছে"], ["Because the number is made up", "কারণ সংখ্যাটি বানানো"], ["Because tau cannot be measured at all", "কারণ টাউ মাপাই যায় না"], ["Because it was measured on Earth", "কারণ এটি পৃথিবীতে মাপা হয়েছে"]),
    correct: 0, explanation: { en: "Scientists estimate tau from Pancam images of the Sun; estimates carry uncertainty.", bn: "বিজ্ঞানীরা প্যানক্যামের সূর্যের ছবি থেকে টাউ অনুমান করেন; অনুমানে অনিশ্চয়তা থাকে।" },
    misconception: { en: "Uncertainty does not mean the number is invented.", bn: "অনিশ্চয়তা মানে সংখ্যাটি বানানো নয়।" },
    hint: { en: "Scientists say how sure they are.", bn: "বিজ্ঞানীরা জানান তাঁরা কতটা নিশ্চিত।" } },

  // ── Chapter quizzes: 4 new per chapter (+1 existing reviewed EKO item each) ──
  // Ch1 The Awakening: mission history and traverse maps
  { id: "c1-landed", competency: "history", use: "chapter", chapter: 0, kind: "observed", source: JPL_END,
    prompt: { en: "In which year did Opportunity land on Mars?", bn: "অপরচুনিটি কোন বছর মঙ্গলে নামে?" },
    options: o(["2004", "২০০৪"], ["1997", "১৯৯৭"], ["2012", "২০১২"], ["2018", "২০১৮"]),
    correct: 0, explanation: { en: "JPL: Opportunity landed on Jan. 24, 2004.", bn: "JPL: অপরচুনিটি ২৪ জানুয়ারি ২০০৪-এ নামে।" },
    misconception: { en: "2018 is when contact was lost, not when it landed.", bn: "২০১৮ হলো যোগাযোগ হারানোর বছর, অবতরণের নয়।" },
    hint: { en: "It worked for more than 15 years before 2019.", bn: "২০১৯-এর আগে এটি ১৫ বছরের বেশি কাজ করেছে।" } },
  { id: "c1-endeavour", competency: "evidence", use: "chapter", chapter: 0, kind: "observed", source: PIA23178,
    prompt: { en: "On the final traverse map, where did Opportunity's journey end?", bn: "শেষ যাত্রাপথের মানচিত্রে অপরচুনিটির যাত্রা কোথায় শেষ হয়?" },
    options: o(["On the rim of Endeavour crater", "এনডেভার খাদের কিনারায়"], ["At Eagle crater, where it landed", "ঈগল খাদে, যেখানে নেমেছিল"], ["On the Moon", "চাঁদে"], ["Back on Earth", "পৃথিবীতে"]),
    correct: 0, explanation: { en: "PIA23178 runs from Eagle crater to the rim of Endeavour crater.", bn: "PIA23178 ঈগল খাদ থেকে এনডেভার খাদের কিনারা পর্যন্ত।" },
    misconception: { en: "Eagle crater is the start, not the end.", bn: "ঈগল খাদ শুরু, শেষ নয়।" },
    hint: { en: "Follow the line away from the landing site.", bn: "অবতরণস্থল থেকে রেখাটি অনুসরণ করো।" } },
  { id: "c1-record", competency: "history", use: "chapter", chapter: 0, kind: "observed", source: JPL_END,
    prompt: { en: "Opportunity set a one-day Mars driving record in 2005. About how far did it drive that day?", bn: "অপরচুনিটি ২০০৫-এ মঙ্গলে একদিনে চলার রেকর্ড গড়ে। সেদিন প্রায় কতদূর চলেছিল?" },
    options: o(["220 m", "২২০ মিটার"], ["45 km", "৪৫ কিমি"], ["2 m", "২ মিটার"], ["1,000 km", "১,০০০ কিমি"]),
    correct: 0, explanation: { en: "JPL: a one-day record of 721 feet (220 m) on March 20, 2005.", bn: "JPL: ২০ মার্চ ২০০৫-এ একদিনে ৭২১ ফুট (২২০ মিটার)।" },
    misconception: { en: "45 km is the whole mission's total, not one day.", bn: "৪৫ কিমি হলো পুরো মিশনের মোট, একদিনের নয়।" },
    hint: { en: "Rovers drive slowly and carefully.", bn: "রোভার ধীরে ও সাবধানে চলে।" } },
  { id: "c1-images", competency: "evidence", use: "chapter", chapter: 0, kind: "observed", source: JPL_END,
    prompt: { en: "About how many images did Opportunity return during its mission?", bn: "মিশনে অপরচুনিটি প্রায় কতগুলো ছবি পাঠিয়েছিল?" },
    options: o(["More than 217,000", "২,১৭,০০০-এর বেশি"], ["About 90", "প্রায় ৯০"], ["Exactly 354", "ঠিক ৩৫৪"], ["None", "একটিও না"]),
    correct: 0, explanation: { en: "JPL: Opportunity returned more than 217,000 images.", bn: "JPL: অপরচুনিটি ২,১৭,০০০-এর বেশি ছবি পাঠিয়েছিল।" },
    misconception: { en: "354 is the number in one panorama, not the whole mission.", bn: "৩৫৪ একটি প্যানোরামার সংখ্যা, পুরো মিশনের নয়।" },
    hint: { en: "It worked for over 15 years and took pictures nearly every day.", bn: "এটি ১৫ বছরের বেশি কাজ করেছে।" } },
  // Ch2 Footprints in the Dust: components, imaging, solar power
  { id: "c2-mast", competency: "hardware", use: "chapter", chapter: 1, kind: "observed", source: PIA22909,
    prompt: { en: "Why is the Pancam mounted high on a mast?", bn: "প্যানক্যাম কেন উঁচু মাস্টে বসানো?" },
    options: o(["To see far across the landscape for panoramas", "প্যানোরামার জন্য দূর পর্যন্ত দেখতে"], ["To catch rain", "বৃষ্টি ধরতে"], ["To drive faster", "দ্রুত চলতে"], ["To dig soil", "মাটি খুঁড়তে"]),
    correct: 0, explanation: { en: "From the mast the Pancam captured wide panoramas such as the 354-image Legacy Pan.", bn: "মাস্ট থেকে প্যানক্যাম চওড়া প্যানোরামা তোলে, যেমন ৩৫৪ ছবির লেগ্যাসি প্যান।" },
    misconception: { en: "Cameras take pictures; they do not dig.", bn: "ক্যামেরা ছবি তোলে, খোঁড়ে না।" },
    hint: { en: "Think about standing on a hill to look around.", bn: "পাহাড়ে দাঁড়িয়ে চারপাশ দেখার কথা ভাবো।" } },
  { id: "c2-sun-filter", competency: "hardware", use: "chapter", chapter: 1, kind: "observed", source: PDS_TAU,
    prompt: { en: "NASA's opacity data come from Pancam photos of what target?", bn: "NASA-র অস্বচ্ছতার তথ্য প্যানক্যামের কোন লক্ষ্যের ছবি থেকে আসে?" },
    options: o(["The Sun", "সূর্য"], ["The ground", "মাটি"], ["Earth", "পৃথিবী"], ["The rover's wheels", "রোভারের চাকা"]),
    correct: 0, explanation: { en: "The PDS label lists the target as the Sun, through an 880 nm solar filter.", bn: "PDS লেবেলে লক্ষ্য সূর্য, ৮৮০ ন্যানোমিটার সৌর ফিল্টারে।" },
    misconception: { en: "Opacity is measured by how dim the Sun looks.", bn: "সূর্য কতটা ম্লান দেখায় তা দিয়েই অস্বচ্ছতা মাপা হয়।" },
    hint: { en: "How much light gets through the dust?", bn: "ধুলা ভেদ করে কতটা আলো আসে?" } },
  { id: "c2-batteries", competency: "hardware", use: "chapter", chapter: 1, kind: "observed", source: JPL_STORM,
    prompt: { en: "During the 2018 storm, what happened to Opportunity's batteries?", bn: "২০১৮-র ঝড়ে অপরচুনিটির ব্যাটারির কী হয়েছিল?" },
    options: o(["Their charge fell below 24 volts and it entered low-power fault mode", "চার্জ ২৪ ভোল্টের নিচে নামে, রোভার লো-পাওয়ার ফল্ট মোডে যায়"], ["They were replaced by astronauts", "নভোচারীরা বদলে দেন"], ["They charged faster", "আরও দ্রুত চার্জ হয়"], ["They were not affected", "কোনো প্রভাব পড়েনি"]),
    correct: 0, explanation: { en: "JPL: the batteries dipped below 24 volts and the rover entered low-power fault mode.", bn: "JPL: ব্যাটারি ২৪ ভোল্টের নিচে নামে, রোভার লো-পাওয়ার ফল্ট মোডে চলে যায়।" },
    misconception: { en: "No astronauts have visited Mars.", bn: "কোনো নভোচারী মঙ্গলে যাননি।" },
    hint: { en: "Less sunlight, less charge.", bn: "কম সূর্যালোক, কম চার্জ।" } },
  { id: "c2-wheels", competency: "hardware", use: "chapter", chapter: 1, kind: "observed", source: PIA23178,
    prompt: { en: "Which part carried Opportunity across 45.16 km of Mars?", bn: "কোন অংশ অপরচুনিটিকে মঙ্গলে ৪৫.১৬ কিমি বয়ে নিয়েছিল?" },
    options: o(["Its wheels", "এর চাকা"], ["Its Pancam", "এর প্যানক্যাম"], ["Its solar panels", "এর সৌর প্যানেল"], ["A parachute", "একটি প্যারাসুট"]),
    correct: 0, explanation: { en: "The rover drove on wheels; the traverse map records 45.16 km.", bn: "রোভার চাকায় চলত; যাত্রাপথের মানচিত্রে ৪৫.১৬ কিমি।" },
    misconception: { en: "Solar panels make power; wheels move the rover.", bn: "সৌর প্যানেল শক্তি দেয়; চাকা রোভার চালায়।" },
    hint: { en: "What touches the ground?", bn: "কোনটি মাটি ছোঁয়?" } },
  // Ch3 The Great Storm: opacity, sunlight, predictions, models
  { id: "c3-onset", competency: "environment", use: "chapter", chapter: 2, kind: "derived", source: PDS_TAU,
    prompt: { en: "In NASA's data, tau was about 0.75 on sol 5102 and 1.71 on sol 5103. What does this rise suggest?", bn: "NASA-র তথ্যে ৫১০২ সলে টাউ প্রায় ০.৭৫, ৫১০৩ সলে ১.৭১। এই বৃদ্ধি কী ইঙ্গিত দেয়?" },
    simple: { en: "The dust number more than doubled in one sol. What was starting?", bn: "এক সলে ধুলার মান দ্বিগুণের বেশি হলো। কী শুরু হচ্ছিল?" },
    options: o(["A dust storm was starting to darken the sky", "একটি ধুলিঝড় আকাশ অন্ধকার করতে শুরু করেছিল"], ["The storm was ending", "ঝড় শেষ হচ্ছিল"], ["The rover was moving to a sunnier place", "রোভার রৌদ্রোজ্জ্বল জায়গায় যাচ্ছিল"], ["The camera's lens was cleaned", "ক্যামেরার লেন্স পরিষ্কার হয়েছিল"]),
    correct: 0, explanation: { en: "A sharp rise in opacity marks the onset of the 2018 storm (NASA PDS 1TAU880_5106_20181207A, median per sol).", bn: "অস্বচ্ছতার দ্রুত বৃদ্ধি ২০১৮-র ঝড়ের শুরু নির্দেশ করে (NASA PDS 1TAU880_5106_20181207A, প্রতি সলের মধ্যমা)।" },
    misconception: { en: "Rising tau means a darker, dustier sky.", bn: "টাউ বাড়া মানে আকাশ আরও অন্ধকার ও ধুলাময়।" },
    hint: { en: "Bigger number, more dust.", bn: "বড় সংখ্যা, বেশি ধুলা।" } },
  { id: "c3-gap", competency: "reasoning", use: "chapter", chapter: 2, kind: "observed", source: PDS_TAU,
    prompt: { en: "NASA's Pancam opacity table ends on June 5, 2018 (sol 5106). Where does “tau 10.8 on June 10” come from?", bn: "NASA-র প্যানক্যাম অস্বচ্ছতা টেবিল ৫ জুন ২০১৮ (৫১০৬ সল)-এ শেষ। তাহলে “১০ জুন টাউ ১০.৮” কোথা থেকে এল?" },
    options: o(["A separate JPL estimate, not this table", "আলাদা একটি JPL অনুমান, এই টেবিল নয়"], ["The same table", "একই টেবিল"], ["A guess by the game", "গেমের অনুমান"], ["Apollo 12", "অ্যাপোলো ১২"]),
    correct: 0, explanation: { en: "The table stops on sol 5106; the 10.8 figure is JPL's estimate published in its storm updates.", bn: "টেবিল ৫১০৬ সলে থামে; ১০.৮ হলো JPL-এর ঝড়-সংক্রান্ত হালনাগাদে প্রকাশিত অনুমান।" },
    misconception: { en: "Two NASA numbers can come from different products; always check the source.", bn: "দুটি NASA সংখ্যা ভিন্ন উৎস থেকে আসতে পারে; সূত্র যাচাই করো।" },
    hint: { en: "Compare the dates.", bn: "তারিখগুলো মেলাও।" } },
  { id: "c3-model", competency: "reasoning", use: "chapter", chapter: 2, kind: "model", source: PIA22521,
    prompt: { en: "The storm lab's e^−τ curve is a simplified model. What does it NOT include?", bn: "ঝড়-ল্যাবের e^−τ বক্ররেখা একটি সরলীকৃত মডেল। এতে কী ধরা হয়নি?" },
    options: o(["Scattered light, sun angle and dust on the panels", "বিক্ষিপ্ত আলো, সূর্যের কোণ আর প্যানেলের ধুলা"], ["Any effect of dust", "ধুলার কোনো প্রভাব"], ["The Sun", "সূর্য"], ["Numbers", "সংখ্যা"]),
    correct: 0, explanation: { en: "The model covers the direct beam only; real panels also receive scattered light and collect dust.", bn: "মডেল শুধু সরাসরি রশ্মি ধরে; আসল প্যানেলে বিক্ষিপ্ত আলোও পড়ে, ধুলাও জমে।" },
    misconception: { en: "A model is useful because it simplifies; it is not the full reality.", bn: "মডেল সরল করে বলেই কাজের; এটি পুরো বাস্তবতা নয়।" },
    hint: { en: "Read the “SIMULATED” label in the lab.", bn: "ল্যাবের “SIMULATED” লেবেল পড়ো।" } },
  { id: "c3-2007", competency: "environment", use: "chapter", chapter: 2, kind: "derived", source: PDS_TAU,
    prompt: { en: "In NASA's 880 nm data, the highest daily tau (4.53) was on sol 1234, in 2007. What does that tell us?", bn: "NASA-র ৮৮০ ন্যানোমিটার তথ্যে সর্বোচ্চ দৈনিক টাউ (৪.৫৩) ছিল ১২৩৪ সলে, ২০০৭ সালে। এটি কী জানায়?" },
    options: o(["Opportunity had survived an earlier major dust storm", "অপরচুনিটি আগেও এক বড় ধুলিঝড় পার করেছিল"], ["Mars never has dust storms", "মঙ্গলে কখনো ধুলিঝড় হয় না"], ["The 2018 storm was smaller than 2007's", "২০১৮-র ঝড় ২০০৭-এর চেয়ে ছোট ছিল"], ["The rover stopped in 2007", "রোভার ২০০৭-এ থেমে যায়"]),
    correct: 0, explanation: { en: "The data record a dusty period in 2007 that the rover survived. The 2018 peak is not in this table (it ends June 5, 2018).", bn: "তথ্যে ২০০৭-এর এক ধুলাময় সময় দেখা যায়, যা রোভার পার করেছিল। ২০১৮-র শীর্ষ এই টেবিলে নেই (এটি ৫ জুন ২০১৮-তে শেষ)।" },
    misconception: { en: "A missing value is not a small value: the table simply ends before the 2018 peak.", bn: "অনুপস্থিত মান মানে ছোট মান নয়: টেবিলটি ২০১৮-র শীর্ষের আগেই শেষ।" },
    hint: { en: "Check when the table ends.", bn: "টেবিল কবে শেষ দেখো।" } },
  // Ch4 Echoes of the Past: imagery, chronology, reconstruction
  { id: "c4-order", competency: "history", use: "chapter", chapter: 3, kind: "observed", source: PIA22909,
    prompt: { en: "Which happened first?", bn: "কোনটি আগে ঘটেছিল?" },
    options: o(["Legacy Pan imaging began (May 13, 2018)", "লেগ্যাসি প্যানের ছবি তোলা শুরু (১৩ মে ২০১৮)"], ["Last contact (June 10, 2018)", "শেষ যোগাযোগ (১০ জুন ২০১৮)"], ["Mission declared complete (Feb. 13, 2019)", "মিশন সম্পন্ন ঘোষণা (১৩ ফেব্রুয়ারি ২০১৯)"], ["NASA released the Legacy Pan (March 2019)", "NASA লেগ্যাসি প্যান প্রকাশ (মার্চ ২০১৯)"]),
    correct: 0, explanation: { en: "The Legacy Pan was taken from May 13 through June 10, 2018; release came in 2019.", bn: "লেগ্যাসি প্যান তোলা হয় ১৩ মে থেকে ১০ জুন ২০১৮; প্রকাশ ২০১৯-এ।" },
    misconception: { en: "An image is published after it is taken.", bn: "ছবি আগে তোলা হয়, পরে প্রকাশ।" },
    hint: { en: "Compare the dates in brackets.", bn: "বন্ধনীর তারিখগুলো মেলাও।" } },
  { id: "c4-sols", competency: "evidence", use: "chapter", chapter: 3, kind: "observed", source: PIA22909,
    prompt: { en: "The Legacy Pan's images span sols 5,084 to 5,111. Roughly how many Martian days is that?", bn: "লেগ্যাসি প্যানের ছবি ৫,০৮৪ থেকে ৫,১১১ সল জুড়ে। মোটামুটি কত মঙ্গল-দিন?" },
    options: o(["About 28 sols", "প্রায় ২৮ সল"], ["About 5,000 sols", "প্রায় ৫,০০০ সল"], ["1 sol", "১ সল"], ["354 sols", "৩৫৪ সল"]),
    correct: 0, explanation: { en: "5,111 − 5,084 + 1 = 28 sols, matching May 13 to June 10, 2018.", bn: "৫,১১১ − ৫,০৮৪ + ১ = ২৮ সল, যা ১৩ মে থেকে ১০ জুন ২০১৮।" },
    misconception: { en: "354 is the number of images, not days.", bn: "৩৫৪ ছবির সংখ্যা, দিনের নয়।" },
    hint: { en: "Subtract the first sol from the last.", bn: "শেষ সল থেকে প্রথম সল বিয়োগ করো।" } },
  { id: "c4-artistic", competency: "reasoning", use: "chapter", chapter: 3, kind: "interpretation", source: PIA22929,
    prompt: { en: "The game's holographic archive is labeled artistic. Which item in it is a real NASA record?", bn: "গেমের হলোগ্রাফিক আর্কাইভ শিল্পিত। এর কোনটি আসল NASA রেকর্ড?" },
    options: o(["The PIA22929 image on the panel", "প্যানেলের PIA22929 ছবি"], ["The glowing pillars", "জ্বলজ্বলে স্তম্ভ"], ["EKO's voice", "ইকোর কণ্ঠ"], ["The archive building", "আর্কাইভ ভবন"]),
    correct: 0, explanation: { en: "The archive is a fictional setting; the NASA images shown in it are real and credited.", bn: "আর্কাইভ কাল্পনিক; এতে দেখানো NASA ছবিগুলো আসল ও কৃতজ্ঞতাসহ।" },
    misconception: { en: "A real image inside a fictional scene is still real; the scene is not.", bn: "কাল্পনিক দৃশ্যে আসল ছবি আসলই থাকে; দৃশ্যটি নয়।" },
    hint: { en: "Look for a NASA image ID.", bn: "NASA ছবির আইডি খোঁজো।" } },
  { id: "c4-thumbs", competency: "evidence", use: "chapter", chapter: 3, kind: "observed", source: PIA22930,
    prompt: { en: "Why were the last images Opportunity took never seen in full?", bn: "অপরচুনিটির তোলা শেষ ছবিগুলো কেন কখনো পুরোটা দেখা যায়নি?" },
    options: o(["Contact was lost before the full-frame versions were sent", "পূর্ণ সংস্করণ পাঠানোর আগেই যোগাযোগ হারিয়ে যায়"], ["NASA deleted them", "NASA মুছে দেয়"], ["They were taken on the Moon", "এগুলো চাঁদে তোলা"], ["The camera had no memory", "ক্যামেরার মেমরি ছিল না"]),
    correct: 0, explanation: { en: "NASA's PIA22930: the thumbnails arrived, but contact was lost before the full frames.", bn: "NASA-র PIA22930: থাম্বনেইল পৌঁছায়, পূর্ণ ছবির আগে যোগাযোগ হারায়।" },
    misconception: { en: "Missing data is not hidden data.", bn: "হারানো তথ্য মানে লুকানো তথ্য নয়।" },
    hint: { en: "Small versions travel first.", bn: "ছোট সংস্করণ আগে যায়।" } },
  // Ch5 The Last Light: reasoning, uncertainty, supported conclusions
  { id: "c5-unknown", competency: "reasoning", use: "chapter", chapter: 4, kind: "interpretation", source: JPL_END,
    prompt: { en: "No signal was received after June 10, 2018. What can scientists NOT know from the data?", bn: "১০ জুন ২০১৮-এর পরে কোনো সংকেত আসেনি। তথ্য থেকে বিজ্ঞানীরা কী জানতে পারেন না?" },
    options: o(["Exactly what happened inside the rover afterwards", "পরে রোভারের ভেতরে ঠিক কী ঘটেছিল"], ["That the storm reduced sunlight", "ঝড় সূর্যালোক কমিয়েছিল"], ["The date of last contact", "শেষ যোগাযোগের তারিখ"], ["That the rover was solar-powered", "রোভার সৌরচালিত ছিল"]),
    correct: 0, explanation: { en: "Without signals there is no record of the rover's final internal state; NASA's records show the storm and the loss of contact.", bn: "সংকেত না থাকায় রোভারের শেষ অভ্যন্তরীণ অবস্থার কোনো রেকর্ড নেই; NASA-র রেকর্ডে ঝড় আর যোগাযোগ হারানো দেখা যায়।" },
    misconception: { en: "Silence is not data: we cannot see what we did not receive.", bn: "নীরবতা তথ্য নয়: যা পাইনি তা দেখা যায় না।" },
    hint: { en: "What would scientists need in order to know it?", bn: "জানতে হলে বিজ্ঞানীদের কী লাগত?" } },
  { id: "c5-support", competency: "reasoning", use: "chapter", chapter: 4, kind: "interpretation", source: JPL_STORM,
    prompt: { en: "Which conclusion is best supported by NASA's records?", bn: "কোন সিদ্ধান্ত NASA-র রেকর্ডে সবচেয়ে ভালোভাবে সমর্থিত?" },
    options: o(["The storm cut the sunlight a solar rover needed, and contact was lost", "ঝড় সৌরচালিত রোভারের প্রয়োজনীয় সূর্যালোক কমায়, আর যোগাযোগ হারায়"], ["The rover chose to stop talking", "রোভার নিজে কথা বলা বন্ধ করে"], ["A meteor destroyed the rover", "উল্কা রোভার ধ্বংস করে"], ["The rover drove off a cliff", "রোভার খাদে পড়ে যায়"]),
    correct: 0, explanation: { en: "NASA documents the storm, the low-power fault mode and the lost contact; the other options have no supporting record.", bn: "NASA ঝড়, লো-পাওয়ার ফল্ট মোড ও যোগাযোগ হারানো নথিভুক্ত করেছে; বাকি বিকল্পের কোনো রেকর্ড নেই।" },
    misconception: { en: "A dramatic story is not evidence.", bn: "নাটকীয় গল্প প্রমাণ নয়।" },
    hint: { en: "Choose the option with a NASA source.", bn: "যে বিকল্পের NASA সূত্র আছে সেটি বেছে নাও।" } },
  { id: "c5-words", competency: "evidence", use: "chapter", chapter: 4, kind: "observed", source: PIA22929,
    prompt: { en: "What was Opportunity's final transmission?", bn: "অপরচুনিটির শেষ প্রেরণ কী ছিল?" },
    options: o(["Data, including an incomplete image (PIA22929)", "তথ্য, যার মধ্যে একটি অসম্পূর্ণ ছবি (PIA22929)"], ["A spoken goodbye", "মুখে বলা বিদায়"], ["A written poem", "লেখা কবিতা"], ["A video call", "ভিডিও কল"]),
    correct: 0, explanation: { en: "Rovers send data and images, not sentences; the last data included the partial image PIA22929.", bn: "রোভার তথ্য ও ছবি পাঠায়, বাক্য নয়; শেষ তথ্যে আংশিক ছবি PIA22929 ছিল।" },
    misconception: { en: "Any “last words” you may have read were written by people; the rover transmitted data.", bn: "যে “শেষ কথা” পড়ে থাকতে পারো তা মানুষের লেখা; রোভার পাঠিয়েছিল তথ্য।" },
    hint: { en: "What does a camera send?", bn: "ক্যামেরা কী পাঠায়?" } },
  { id: "c5-legacy", competency: "history", use: "chapter", chapter: 4, kind: "observed", source: JPL_END,
    prompt: { en: "How does NASA describe Opportunity's legacy?", bn: "NASA অপরচুনিটির উত্তরাধিকার কীভাবে বর্ণনা করে?" },
    options: o(["It laid the groundwork for future Mars missions", "এটি ভবিষ্যৎ মঙ্গল মিশনের ভিত গড়েছে"], ["It had no scientific value", "এর কোনো বৈজ্ঞানিক মূল্য ছিল না"], ["It was replaced the next week", "পরের সপ্তাহেই বদলানো হয়"], ["It is still exploring", "এখনো অনুসন্ধান করছে"]),
    correct: 0, explanation: { en: "JPL: Opportunity's record-breaking exploration laid the groundwork for future missions to the Red Planet.", bn: "JPL: অপরচুনিটির রেকর্ড-ভাঙা অনুসন্ধান লাল গ্রহের ভবিষ্যৎ মিশনের ভিত গড়েছে।" },
    misconception: { en: "A mission can end and still shape later ones.", bn: "মিশন শেষ হলেও পরের মিশনকে প্রভাবিত করতে পারে।" },
    hint: { en: "Think of Curiosity and Mars 2020.", bn: "কিউরিওসিটি আর মার্স ২০২০-এর কথা ভাবো।" } },

  // ── Optional advanced challenges (offered after demonstrated mastery) ────
  { id: "ch-hw", competency: "hardware", use: "challenge", kind: "observed", source: PDS_TAU,
    prompt: { en: "The opacity product uses Pancam's 880 nm filter, which is in the near-infrared. Which statement is supported by the PDS label?", bn: "অস্বচ্ছতা পণ্যে প্যানক্যামের ৮৮০ ন্যানোমিটার ফিল্টার ব্যবহৃত, যা নিকট-অবলোহিতে। PDS লেবেল কোন বক্তব্য সমর্থন করে?" },
    options: o(["The measurements come from Pancam's right camera imaging the Sun", "পরিমাপ আসে প্যানক্যামের ডান ক্যামেরায় সূর্যের ছবি থেকে"], ["The measurements come from an orbiter", "পরিমাপ আসে কক্ষপথের যান থেকে"], ["The filter photographs rocks", "ফিল্টারটি পাথরের ছবি তোলে"], ["The values are estimated by the game", "মানগুলো গেম অনুমান করে"]),
    correct: 0, explanation: { en: "The label lists INSTRUMENT_ID PANCAM_RIGHT, filter PANCAM_R8_880NM, target SUN.", bn: "লেবেলে INSTRUMENT_ID PANCAM_RIGHT, ফিল্টার PANCAM_R8_880NM, লক্ষ্য SUN।" },
    misconception: { en: "Read the metadata before assuming where data came from.", bn: "তথ্য কোথা থেকে এল ধরে নেওয়ার আগে মেটাডেটা পড়ো।" },
    hint: { en: "Open the product label (.lbl).", bn: "পণ্যের লেবেল (.lbl) খোলো।" } },
  { id: "ch-env", competency: "environment", use: "challenge", kind: "model", source: PDS_TAU,
    prompt: { en: "Using the model e^−τ for the direct beam: going from τ 0.69 (the data's typical value) to τ 2.26 (sol 5105), the direct beam falls to roughly what fraction?", bn: "সরাসরি রশ্মির মডেল e^−τ ধরে: τ ০.৬৯ (তথ্যের সাধারণ মান) থেকে τ ২.২৬ (৫১০৫ সল)-এ গেলে সরাসরি রশ্মি মোটামুটি কত ভাগে নামে?" },
    options: o(["About one fifth (≈0.21)", "প্রায় এক-পঞ্চমাংশ (≈০.২১)"], ["About half", "প্রায় অর্ধেক"], ["It doubles", "দ্বিগুণ হয়"], ["About 99%", "প্রায় ৯৯%"]),
    correct: 0, explanation: { en: "e^−(2.26−0.69) = e^−1.57 ≈ 0.21. This is the simplified model, not a measured power value.", bn: "e^−(২.২৬−০.৬৯) = e^−১.৫৭ ≈ ০.২১। এটি সরলীকৃত মডেল, মাপা শক্তির মান নয়।" },
    misconception: { en: "Opacity works exponentially, not linearly.", bn: "অস্বচ্ছতা সূচকীয়ভাবে কাজ করে, রৈখিক নয়।" },
    hint: { en: "Subtract the taus, then take e to the minus of that.", bn: "টাউ দুটি বিয়োগ করে e-এর ঋণাত্মক ঘাত নাও।" } },
  { id: "ch-his", competency: "history", use: "challenge", kind: "observed", source: SURVEYOR,
    prompt: { en: "Surveyor 3 landed on April 20, 1967 (UT). Some NASA captions say April 19. Which explanation is most reasonable?", bn: "সার্ভেয়ার ৩ নামে ২০ এপ্রিল ১৯৬৭ (UT)। কিছু NASA ক্যাপশনে ১৯ এপ্রিল লেখা। কোন ব্যাখ্যা সবচেয়ে যুক্তিসঙ্গত?" },
    options: o(["Different time zones (US time vs Universal Time)", "ভিন্ন সময় অঞ্চল (মার্কিন সময় বনাম ইউনিভার্সাল টাইম)"], ["It landed twice", "এটি দুবার নেমেছিল"], ["One of them is a different spacecraft", "একটি অন্য মহাকাশযান"], ["Dates on the Moon are unknown", "চাঁদে তারিখ অজানা"]),
    correct: 0, explanation: { en: "The landing was at 00:04 UT on April 20, which was still April 19 in US time zones.", bn: "অবতরণ ২০ এপ্রিল ০০:০৪ UT-তে, যা মার্কিন সময়ে তখনো ১৯ এপ্রিল।" },
    misconception: { en: "Two dates can both be right when the time zone differs.", bn: "সময় অঞ্চল আলাদা হলে দুটি তারিখই ঠিক হতে পারে।" },
    hint: { en: "Check the time of day in UT.", bn: "UT-তে দিনের সময় দেখো।" } },
  { id: "ch-ev", competency: "evidence", use: "challenge", kind: "observed", source: APOLLO_S3,
    prompt: { en: "Why are parts returned from Surveyor 3 stronger evidence about lunar exposure than photographs alone?", bn: "লুনার পরিবেশের প্রভাব বোঝাতে সার্ভেয়ার ৩-এর ফিরিয়ে আনা অংশ কেন শুধু ছবির চেয়ে শক্তিশালী প্রমাণ?" },
    options: o(["They can be examined directly in a laboratory", "এগুলো সরাসরি ল্যাবে পরীক্ষা করা যায়"], ["They are prettier", "এগুলো বেশি সুন্দর"], ["They still send signals", "এগুলো এখনো সংকেত পাঠায়"], ["They prove life on the Moon", "এগুলো চাঁদে জীবন প্রমাণ করে"]),
    correct: 0, explanation: { en: "NASA: the parts were brought back so scientists could evaluate nearly two and a half years of exposure.", bn: "NASA: প্রায় আড়াই বছরের প্রভাব মূল্যায়নের জন্য অংশগুলো ফিরিয়ে আনা হয়।" },
    misconception: { en: "Physical samples allow tests that pictures cannot.", bn: "বস্তুগত নমুনায় এমন পরীক্ষা সম্ভব যা ছবিতে নয়।" },
    hint: { en: "What can you do with an object that you cannot do with a photo?", bn: "ছবিতে যা পারো না, বস্তু হাতে পেলে কী করতে পারো?" } },
  { id: "ch-rs", competency: "reasoning", use: "challenge", kind: "derived", source: PDS_TAU,
    prompt: { en: "A classmate says: “The data show the 2018 storm was weaker than 2007's, because the table's 2018 maximum (2.26) is below 2007's (4.53).” What is wrong?", bn: "এক সহপাঠী বলে: “টেবিলে ২০১৮-র সর্বোচ্চ (২.২৬) ২০০৭-এর (৪.৫৩) চেয়ে কম, তাই ২০১৮-র ঝড় দুর্বল ছিল।” ভুলটা কোথায়?" },
    options: o(["The table ends on June 5, 2018, before the storm peaked", "টেবিলটি ৫ জুন ২০১৮-তে শেষ, ঝড়ের শীর্ষের আগেই"], ["Nothing is wrong", "কোনো ভুল নেই"], ["2007 had no storm", "২০০৭-এ কোনো ঝড় ছিল না"], ["Tau cannot be compared", "টাউ তুলনা করা যায় না"]),
    correct: 0, explanation: { en: "Absence of data is not a low value; JPL estimated about 10.8 on June 10, after the table ends.", bn: "তথ্য না থাকা মানে কম মান নয়; টেবিল শেষ হওয়ার পর ১০ জুন JPL প্রায় ১০.৮ অনুমান করে।" },
    misconception: { en: "Always check a dataset's coverage before comparing.", bn: "তুলনার আগে সবসময় ডেটাসেটের সময়সীমা দেখো।" },
    hint: { en: "Look at the table's stop time.", bn: "টেবিলের শেষ সময় দেখো।" } },
];

export const BANK_BY_ID: ReadonlyMap<string, BankItem> = new Map(BANK.map((i) => [i.id, i]));
