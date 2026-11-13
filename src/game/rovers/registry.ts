import type { Lang, Localized } from "@/lib/types";

export type RoverId = "sojourner" | "spirit" | "opportunity" | "curiosity" | "perseverance";
export type RoverPartId = "mobility" | "vision" | "power" | "science" | "arm" | "sampling";

export interface RoverPart {
  id: RoverPartId;
  name: Localized;
  role: Localized;
  sources: { label: string; url: string }[];
}

export interface RoverActivity {
  instruction: Localized;
  action: Localized;
  result: Localized;
  /** Optional simulation target distance, in grid cells. */
  driveTarget?: number;
}

export interface RoverDefinition {
  id: RoverId;
  name: string;
  year: number;
  landing: Localized;
  theme: Localized;
  mission: Localized;
  discovery: Localized;
  challenge: Localized;
  options: Localized[];
  answer: number;
  activity: RoverActivity;
  model: { path?: string; credit: string; source: string; kind: "nasa" | "reconstruction"; upAxis?: "y" | "z" };
  distanceKm: number;
  distanceLabel: Localized;
  massKg: number;
  power: Localized;
  status: Localized;
  source: { label: string; url: string };
  parts: RoverPart[];
  timeline: { date: string; text: Localized }[];
}

const src = {
  pathfinder: { label: "NASA — Mars Pathfinder", url: "https://science.nasa.gov/mission/mars-pathfinder/" },
  spirit: { label: "NASA — Spirit", url: "https://science.nasa.gov/mission/mer-spirit/" },
  opportunity: { label: "NASA — Opportunity", url: "https://science.nasa.gov/mission/mer-opportunity/" },
  curiosity: { label: "NASA — Curiosity", url: "https://science.nasa.gov/mission/msl-curiosity/" },
  perseverance: { label: "NASA — Perseverance", url: "https://science.nasa.gov/mission/mars-2020-perseverance/" },
  autoNav: { label: "NASA — How Perseverance drives on Mars", url: "https://science.nasa.gov/resource/how-perseverance-drives-on-mars/" },
  merModel: { label: "NASA/JPL-Caltech — Spirit and Opportunity 3D model", url: "https://science.nasa.gov/resource/spirit-and-opportunity-rover-3d-model/" },
  curiosityModel: { label: "NASA VTAD — Curiosity 3D model", url: "https://science.nasa.gov/resource/curiosity-3d-model/" },
  perseveranceModel: { label: "NASA/JPL — Perseverance 3D model", url: "https://science.nasa.gov/3d-resources/mars-2020-perseverance-rover/" },
} as const;

const part = (id: RoverPartId, en: string, bn: string, roleEn: string, roleBn: string, references: { label: string; url: string }[]): RoverPart => ({
  id, name: { en, bn }, role: { en: roleEn, bn: roleBn }, sources: references,
});

export const ROVERS: readonly RoverDefinition[] = [
  {
    id: "sojourner", name: "Sojourner", year: 1997,
    landing: { en: "Ares Vallis · Mars Pathfinder", bn: "এরিস ভ্যালিস · মার্স পাথফাইন্ডার" },
    theme: { en: "The beginning of a new era", bn: "নতুন যুগের শুরু" },
    mission: { en: "Pathfinder proved a compact, free-ranging rover could work on Mars. Sojourner tested mobility and examined nearby rocks and soil with cameras and an Alpha Proton X-ray Spectrometer.", bn: "পাথফাইন্ডার দেখিয়েছিল ছোট, স্বাধীনভাবে চলা রোভার মঙ্গলে কাজ করতে পারে। সোজার্নার চলাচলের প্রযুক্তি পরীক্ষা করে এবং ক্যামেরা ও আলফা প্রোটন এক্স-রে স্পেকট্রোমিটার দিয়ে কাছের পাথর ও মাটি পরীক্ষা করে।" },
    discovery: { en: "Rounded rocks and other observations at Ares Vallis suggested ancient flowing water. Sojourner operated for 83 days, far beyond its planned seven-day rover mission.", bn: "এরিস ভ্যালিসের গোলাকার পাথরসহ বিভিন্ন পর্যবেক্ষণ প্রাচীন প্রবাহিত পানির ইঙ্গিত দেয়। সোজার্নার পরিকল্পিত সাত দিনের বদলে ৮৩ দিন কাজ করেছিল।" },
    challenge: { en: "Sojourner used its APXS to investigate a rock. Which element did the instrument measure as part of determining composition?", bn: "সোজার্নার APXS দিয়ে পাথর পরীক্ষা করত। গঠন নির্ণয়ের জন্য যন্ত্রটি কোন মৌল পরিমাপ করত?" },
    options: [{ en: "Elements in the rock", bn: "পাথরের মৌলসমূহ" }, { en: "The rock's age in years", bn: "বছরে পাথরের বয়স" }, { en: "Wind speed inside the rover", bn: "রোভারের ভেতরের বাতাসের গতি" }], answer: 0,
    activity: { instruction: { en: "Drive the small rover to the target rock, then run a composition scan.", bn: "ছোট রোভারটি লক্ষ্য পাথরের কাছে চালাও, তারপর গঠন স্ক্যান করো।" }, action: { en: "Run APXS analysis", bn: "APXS বিশ্লেষণ চালাও" }, result: { en: "The APXS measured elemental composition. This educational result is not a recovered measurement from a specific rock.", bn: "APXS মৌলিক গঠন মেপেছিল। এই শিক্ষামূলক ফল কোনো নির্দিষ্ট পাথরের উদ্ধার করা পরিমাপ নয়।" }, driveTarget: 3 },
    model: { credit: "Illustrative reconstruction based on NASA/JPL mission descriptions", source: src.pathfinder.url, kind: "reconstruction" },
    distanceKm: 0.1, distanceLabel: { en: "Approx. 0.1 km · historical estimate", bn: "প্রায় ০.১ কিমি · ঐতিহাসিক অনুমান" }, massKg: 10.6,
    power: { en: "Solar array + rechargeable battery", bn: "সৌর প্যানেল + রিচার্জেবল ব্যাটারি" }, status: { en: "Mission ended · 1997", bn: "মিশন শেষ · ১৯৯৭" }, source: src.pathfinder,
    parts: [part("mobility", "Six wheels", "ছয়টি চাকা", "A compact rocker-bogie-like mobility system helped the rover cross rocky ground.", "কম্প্যাক্ট চলাচল ব্যবস্থা রোভারকে পাথুরে ভূমিতে যেতে সাহায্য করেছিল।", [src.pathfinder]), part("vision", "Cameras", "ক্যামেরা", "The rover carried front and rear cameras to image nearby terrain.", "রোভারে আশপাশের ভূখণ্ডের ছবি তোলার জন্য সামনে ও পেছনে ক্যামেরা ছিল।", [src.pathfinder]), part("science", "APXS", "APXS", "The Alpha Proton X-ray Spectrometer measured the elemental composition of rocks and soil.", "আলফা প্রোটন এক্স-রে স্পেকট্রোমিটার পাথর ও মাটির মৌলিক গঠন মাপত।", [src.pathfinder])],
    timeline: [{ date: "04 JUL 1997", text: { en: "Pathfinder and Sojourner land at Ares Vallis.", bn: "পাথফাইন্ডার ও সোজার্নার এরিস ভ্যালিসে অবতরণ করে।" } }, { date: "27 SEP 1997", text: { en: "Final data transmission from Pathfinder.", bn: "পাথফাইন্ডার থেকে শেষ ডেটা পাঠানো হয়।" } }],
  },
  {
    id: "spirit", name: "Spirit", year: 2004,
    landing: { en: "Gusev Crater · Columbia Memorial Station", bn: "গুসেভ খাদ · কলাম্বিয়া মেমোরিয়াল স্টেশন" },
    theme: { en: "A journey beyond expectations", bn: "প্রত্যাশা ছাড়িয়ে এক যাত্রা" },
    mission: { en: "Spirit and its twin Opportunity searched rocks and soils for clues about past water and Martian environments. Spirit landed in Gusev Crater, a basin selected because it might preserve signs of an ancient lake.", bn: "স্পিরিট ও তার যমজ অপরচুনিটি পাথর ও মাটিতে অতীতের পানি ও মঙ্গলীয় পরিবেশের চিহ্ন খুঁজেছিল। প্রাচীন হ্রদের চিহ্ন থাকার সম্ভাবনায় স্পিরিট গুসেভ খাদে অবতরণ করে।" },
    discovery: { en: "Spirit found strong evidence that Mars was once wetter. After getting stuck in soft soil and losing a wheel, it became a stationary science platform; NASA ended contact efforts in 2011.", bn: "স্পিরিট মঙ্গল একসময় অনেক বেশি আর্দ্র ছিল—এমন জোরালো প্রমাণ পায়। নরম মাটিতে আটকে ও একটি চাকা নষ্ট হওয়ার পর এটি স্থির বিজ্ঞান প্ল্যাটফর্মে পরিণত হয়; NASA ২০১১ সালে যোগাযোগের চেষ্টা শেষ করে।" },
    challenge: { en: "Spirit's Mössbauer spectrometer helped identify iron-bearing minerals. What kind of evidence was the rover investigating?", bn: "স্পিরিটের Mössbauer spectrometer লোহাযুক্ত খনিজ শনাক্ত করতে সাহায্য করত। রোভারটি কী ধরনের প্রমাণ খুঁজছিল?" },
    options: [{ en: "Clues that water once altered rocks", bn: "পানি একসময় পাথর বদলেছিল—এমন চিহ্ন" }, { en: "Modern oceans", bn: "বর্তমান মহাসাগর" }, { en: "Plants growing on Mars", bn: "মঙ্গলে গাছপালা" }], answer: 0,
    activity: { instruction: { en: "Navigate around the simulated loose-soil patch to reach the rock target.", bn: "সিমুলেশনের আলগা মাটির অংশ এড়িয়ে পাথরের কাছে যাও।" }, action: { en: "Scan for alteration clues", bn: "পরিবর্তনের চিহ্ন স্ক্যান করো" }, result: { en: "Mission science linked minerals and textures to past water. The terrain and scan here are educational reconstructions.", bn: "মিশনের বিজ্ঞানীরা খনিজ ও গঠনকে অতীতের পানির সঙ্গে যুক্ত করেছিলেন। এখানকার ভূখণ্ড ও স্ক্যান শিক্ষামূলক পুনর্নির্মাণ।" }, driveTarget: 4 },
    model: { path: "/models/legacy/spirit-opportunity-nasa.glb", credit: "NASA/JPL-Caltech; twin Mars Exploration Rover model", source: "https://science.nasa.gov/resource/spirit-and-opportunity-rover-3d-model/", kind: "nasa", upAxis: "z" },
    distanceKm: 7.73, distanceLabel: { en: "7.73 km · final mission distance", bn: "৭.৭৩ কিমি · মিশন শেষে" }, massKg: 185,
    power: { en: "Solar arrays + rechargeable batteries", bn: "সৌর প্যানেল + রিচার্জেবল ব্যাটারি" }, status: { en: "Mission ended · 2011", bn: "মিশন শেষ · ২০১১" }, source: src.spirit,
    parts: [part("mobility", "Rocker-bogie wheels", "রকার-বগি চাকা", "Six independently driven wheels helped traverse rocky terrain; one wheel later stopped working.", "ছয়টি স্বাধীনভাবে চালিত চাকা পাথুরে ভূমিতে চলতে সাহায্য করত; পরে একটি চাকা কাজ করা বন্ধ করে।", [src.spirit]), part("vision", "Pancam mast", "Pancam মাস্ট", "Mast-mounted stereo cameras documented the landscape and helped scientists plan drives.", "মাস্টের স্টেরিও ক্যামেরা ভূদৃশ্য ধারণ ও চলার পরিকল্পনায় সহায়তা করত।", [src.spirit]), part("power", "Solar arrays", "সৌর প্যানেল", "Solar panels generated electricity; dust-clearing wind sometimes restored useful power.", "সৌর প্যানেল বিদ্যুৎ তৈরি করত; কখনো বাতাসের ধুলো সরানো শক্তি বাড়িয়েছে।", [src.spirit]), part("science", "Rock tools", "পাথর পরীক্ষার যন্ত্র", "APXS, Mössbauer, microscopic imaging and the Rock Abrasion Tool studied rocks close up.", "APXS, Mössbauer, মাইক্রোস্কোপিক ইমেজার ও Rock Abrasion Tool কাছ থেকে পাথর পরীক্ষা করত।", [src.spirit])],
    timeline: [{ date: "04 JAN 2004", text: { en: "Spirit lands in Gusev Crater.", bn: "স্পিরিট গুসেভ খাদে অবতরণ করে।" } }, { date: "22 MAR 2010", text: { en: "Last communication received.", bn: "শেষ যোগাযোগ পাওয়া যায়।" } }, { date: "25 MAY 2011", text: { en: "NASA concludes recovery efforts.", bn: "NASA উদ্ধার প্রচেষ্টা শেষ করে।" } }],
  },
  {
    id: "opportunity", name: "Opportunity", year: 2004,
    landing: { en: "Meridiani Planum · Eagle Crater", bn: "মেরিডিয়ানি প্ল্যানাম · ঈগল খাদ" },
    theme: { en: "A rover that went far beyond its mission", bn: "নির্ধারিত মিশনের বহু দূর পেরোনো রোভার" },
    mission: { en: "Opportunity searched Meridiani Planum for geological evidence of past water. Its solar-powered design was planned for 90 sols; it worked for nearly 15 years and travelled 45.16 km.", bn: "অপরচুনিটি মেরিডিয়ানি প্ল্যানামে অতীতের পানির ভূতাত্ত্বিক প্রমাণ খুঁজেছিল। ৯০ সলের জন্য পরিকল্পিত সৌরচালিত রোভারটি প্রায় ১৫ বছর কাজ করে ৪৫.১৬ কিমি চলে।" },
    discovery: { en: "Spherical hematite-rich concretions nicknamed “blueberries” and layered rocks supported evidence of past liquid water. A planet-wide dust storm reduced sunlight; after months of recovery attempts, NASA declared the mission complete in 2019.", bn: "“ব্লুবেরি” নামে পরিচিত গোলাকার হেমাটাইটসমৃদ্ধ কণিকা ও স্তরযুক্ত পাথর অতীতের তরল পানির প্রমাণ দেয়। গ্রহজুড়ে ধুলিঝড়ে সূর্যালোক কমে যায়; কয়েক মাসের চেষ্টার পর NASA ২০১৯ সালে মিশন শেষ ঘোষণা করে।" },
    challenge: { en: "Opportunity's hematite-rich “blueberries” were evidence of which past environment?", bn: "অপরচুনিটির হেমাটাইটসমৃদ্ধ “ব্লুবেরি” কোন অতীত পরিবেশের প্রমাণ ছিল?" },
    options: [{ en: "Water-related geological processes", bn: "পানি-সম্পর্কিত ভূতাত্ত্বিক প্রক্রিয়া" }, { en: "A modern river", bn: "একটি বর্তমান নদী" }, { en: "Confirmed ancient life", bn: "নিশ্চিত প্রাচীন জীবন" }], answer: 0,
    activity: { instruction: { en: "Drive to the outcrop, frame the target with the Pancam, then compare the evidence for water-altered rock.", bn: "পাথরের কাছে চালিয়ে Pancam দিয়ে লক্ষ্য নির্ধারণ করো, তারপর পানি-পরিবর্তিত পাথরের প্রমাণ তুলনা করো।" }, action: { en: "Capture a Pancam science frame", bn: "Pancam বিজ্ঞান-ফ্রেম নাও" }, result: { en: "Hematite-rich spherules and layered rocks helped build the case for past water. This is a learning reconstruction, not a NASA image or telemetry.", bn: "হেমাটাইটসমৃদ্ধ গোলক ও স্তরযুক্ত পাথর অতীতের পানির প্রমাণ গড়তে সাহায্য করেছিল। এটি শেখার পুনর্নির্মাণ, NASA ছবি বা টেলিমেট্রি নয়।" }, driveTarget: 4 },
    model: { path: "/models/legacy/spirit-opportunity-nasa.glb", credit: "NASA/JPL-Caltech · Spirit and Opportunity twin rover model", source: "https://science.nasa.gov/resource/spirit-and-opportunity-rover-3d-model/", kind: "nasa", upAxis: "z" },
    distanceKm: 45.16, distanceLabel: { en: "45.16 km · final mission distance", bn: "৪৫.১৬ কিমি · মিশন শেষে" }, massKg: 185,
    power: { en: "Solar arrays + rechargeable batteries", bn: "সৌর প্যানেল + রিচার্জেবল ব্যাটারি" }, status: { en: "Mission ended · 2019", bn: "মিশন শেষ · ২০১৯" }, source: src.opportunity,
    parts: [part("mobility", "Six wheels", "ছয়টি চাকা", "Six wheels and rocker-bogie suspension carried Opportunity over craters and plains.", "ছয়টি চাকা ও রকার-বগি সাসপেনশন খাদ ও সমতল পেরোতে সাহায্য করত।", [src.opportunity]), part("vision", "Pancam mast", "Pancam মাস্ট", "The panoramic camera pair captured color stereo views and the rover's final panorama.", "প্যানোরামিক ক্যামেরা রঙিন স্টেরিও দৃশ্য ও রোভারের শেষ প্যানোরামা ধারণ করে।", [src.opportunity]), part("power", "Solar panels", "সৌর প্যানেল", "The panels converted sunlight to electricity; the 2018 dust storm sharply reduced available sunlight.", "প্যানেল সূর্যালোককে বিদ্যুতে রূপান্তর করত; ২০১৮ সালের ধুলিঝড়ে আলো অনেক কমে যায়।", [src.opportunity]), part("science", "Rock abrasion + spectrometers", "পাথর ঘষার যন্ত্র + স্পেকট্রোমিটার", "The arm instruments examined rock composition and texture after the Rock Abrasion Tool exposed fresh surfaces.", "Rock Abrasion Tool নতুন পৃষ্ঠ উন্মুক্ত করার পর বাহুর যন্ত্রগুলো পাথরের গঠন পরীক্ষা করত।", [src.opportunity])],
    timeline: [{ date: "25 JAN 2004", text: { en: "Opportunity lands at Meridiani Planum.", bn: "অপরচুনিটি মেরিডিয়ানি প্ল্যানামে নামে।" } }, { date: "10 JUN 2018", text: { en: "Last contact during the planet-wide dust storm.", bn: "গ্রহজুড়ে ধুলিঝড়ের সময় শেষ যোগাযোগ।" } }, { date: "13 FEB 2019", text: { en: "NASA declares the mission complete.", bn: "NASA মিশন সম্পূর্ণ ঘোষণা করে।" } }],
  },
  {
    id: "curiosity", name: "Curiosity", year: 2012,
    landing: { en: "Gale Crater · Bradbury Landing", bn: "গেল খাদ · ব্র্যাডবেরি ল্যান্ডিং" },
    theme: { en: "Understanding ancient Mars", bn: "প্রাচীন মঙ্গলকে বোঝা" },
    mission: { en: "Curiosity is a mobile laboratory designed to determine whether Mars ever had conditions suitable for microbial life. Its onboard instruments analyze drilled rock and soil samples.", bn: "মঙ্গলে কখনো অণুজীবের উপযোগী পরিবেশ ছিল কি না নির্ণয়ে কিউরিওসিটি একটি চলমান পরীক্ষাগার। এর অনবোর্ড যন্ত্র ড্রিল-করা পাথর ও মাটির নমুনা বিশ্লেষণ করে।" },
    discovery: { en: "In Gale Crater, Curiosity found ancient lake environments with chemical ingredients and conditions that could have supported microbial life. Habitability evidence is not evidence that life was present.", bn: "গেল খাদে কিউরিওসিটি প্রাচীন হ্রদ পরিবেশ পেয়েছে, যেখানে অণুজীবের বসবাসের উপযোগী রাসায়নিক উপাদান ও শর্ত ছিল। বাসযোগ্যতার প্রমাণ মানেই জীবনের প্রমাণ নয়।" },
    challenge: { en: "Curiosity's mission asks whether Mars could support microbial life. Does a past habitable environment by itself confirm that life existed?", bn: "কিউরিওসিটির মিশন প্রশ্ন করে মঙ্গল অণুজীবকে ধারণ করতে পারত কি না। অতীতের বাসযোগ্য পরিবেশ কি একাই জীবনের অস্তিত্ব নিশ্চিত করে?" },
    options: [{ en: "No — it shows conditions may have been suitable, not that life existed", bn: "না — পরিবেশ উপযোগী হতে পারে, কিন্তু জীবন ছিল তা নয়" }, { en: "Yes, life is confirmed", bn: "হ্যাঁ, জীবন নিশ্চিত" }, { en: "It proves Mars has oceans today", bn: "এটি প্রমাণ করে আজ মঙ্গলে মহাসাগর আছে" }], answer: 0,
    activity: { instruction: { en: "Position the arm on the sample target and run the educational drill-and-analyze sequence.", bn: "নমুনার লক্ষ্যবস্তুতে বাহু স্থাপন করে শিক্ষামূলক ড্রিল ও বিশ্লেষণ চালাও।" }, action: { en: "Drill and analyze sample (simulation)", bn: "নমুনা ড্রিল ও বিশ্লেষণ (সিমুলেশন)" }, result: { en: "Curiosity's drill feeds sample to its onboard laboratory instruments. This demonstration is simulated; it is not a real sample result.", bn: "কিউরিওসিটির ড্রিল নমুনা অনবোর্ড পরীক্ষাগারে পাঠায়। এই প্রদর্শন সিমুলেশন; এটি প্রকৃত নমুনার ফল নয়।" }, driveTarget: 3 },
    model: { path: "/models/legacy/curiosity-nasa.glb", credit: "NASA Visualization Technology Applications and Development (VTAD)", source: "https://science.nasa.gov/resource/curiosity-3d-model/", kind: "nasa" },
    distanceKm: 38.07, distanceLabel: { en: ">38.07 km · NASA snapshot 11 Oct 2026", bn: ">৩৮.০৭ কিমি · NASA স্ন্যাপশট ১১ অক্টোবর ২০২৬" }, massKg: 899,
    power: { en: "Multi-Mission Radioisotope Thermoelectric Generator (MMRTG)", bn: "মাল্টি-মিশন রেডিওআইসোটোপ থার্মোইলেকট্রিক জেনারেটর (MMRTG)" }, status: { en: "Active mission · NASA page checked Oct 2026", bn: "সক্রিয় মিশন · NASA পৃষ্ঠা অক্টোবর ২০২৬-এ দেখা" }, source: src.curiosity,
    parts: [part("mobility", "Rocker-bogie wheels", "রকার-বগি চাকা", "Six wheels and a rocker-bogie suspension support mobility across rough terrain.", "ছয়টি চাকা ও রকার-বগি সাসপেনশন দুর্গম ভূখণ্ডে চলতে সাহায্য করে।", [src.curiosity]), part("vision", "Mast cameras", "মাস্ট ক্যামেরা", "Mast cameras image terrain and help scientists assess targets and routes.", "মাস্ট ক্যামেরা ভূখণ্ডের ছবি তোলে ও লক্ষ্য ও পথ মূল্যায়নে সহায়তা করে।", [src.curiosity]), part("power", "MMRTG", "MMRTG", "A radioisotope thermoelectric generator supplies electrical power and heat.", "রেডিওআইসোটোপ থার্মোইলেকট্রিক জেনারেটর বিদ্যুৎ ও তাপ সরবরাহ করে।", [src.curiosity]), part("arm", "Robotic arm + drill", "রোবোটিক বাহু + ড্রিল", "A 2.2-meter arm places tools and a drill on selected rock targets for sample analysis.", "২.২ মিটার বাহু যন্ত্র ও ড্রিল নির্বাচিত পাথরে স্থাপন করে নমুনা বিশ্লেষণ করে।", [src.curiosity])],
    timeline: [{ date: "06 AUG 2012", text: { en: "Curiosity lands in Gale Crater.", bn: "কিউরিওসিটি গেল খাদে অবতরণ করে।" } }, { date: "2013", text: { en: "Evidence shows ancient Gale Crater could have supported microbial life.", bn: "প্রমাণ দেখায় প্রাচীন গেল খাদ অণুজীবের জন্য উপযোগী হতে পারত।" } }, { date: "2026", text: { en: "Continues climbing Mount Sharp and studying its rock record.", bn: "মাউন্ট শার্পে উঠে পাথরের ইতিহাস পরীক্ষা চালিয়ে যাচ্ছে।" } }],
  },
  {
    id: "perseverance", name: "Perseverance", year: 2021,
    landing: { en: "Jezero Crater · Octavia E. Butler Landing", bn: "জেজেরো খাদ · অক্টাভিয়া ই. বাটলার ল্যান্ডিং" },
    theme: { en: "Searching for ancient life", bn: "প্রাচীন জীবনের চিহ্ন খোঁজা" },
    mission: { en: "Perseverance studies Jezero Crater, collects and caches rock and regolith samples, and tests technologies for future exploration. AutoNav helps it assess terrain and choose safe routes.", bn: "পারসিভিয়ারেন্স জেজেরো খাদ পরীক্ষা করে, পাথর ও রেগোলিথের নমুনা সংগ্রহ ও সংরক্ষণ করে এবং ভবিষ্যৎ অভিযানের প্রযুক্তি পরীক্ষা করে। AutoNav ভূখণ্ড বুঝে নিরাপদ পথ বেছে নিতে সাহায্য করে।" },
    discovery: { en: "Jezero preserves a lake-and-delta history. A 2025 peer-reviewed study described potential biosignatures in a sample; these are clues that need further study, not confirmation of life.", bn: "জেজেরোতে প্রাচীন হ্রদ ও ডেল্টার ইতিহাস রয়েছে। ২০২৫ সালের পর্যালোচিত গবেষণায় একটি নমুনায় সম্ভাব্য জীবচিহ্ন বর্ণনা করা হয়েছে; এগুলো আরও গবেষণার সূত্র, জীবনের নিশ্চিত প্রমাণ নয়।" },
    challenge: { en: "A sample contains a potential biosignature. What is the scientifically careful conclusion?", bn: "একটি নমুনায় সম্ভাব্য জীবচিহ্ন আছে। বিজ্ঞানের বিচারে সতর্ক সিদ্ধান্ত কী?" },
    options: [{ en: "It is a clue that needs more study; life is not confirmed", bn: "এটি আরও গবেষণার সূত্র; জীবন নিশ্চিত নয়" }, { en: "Life on Mars is proven", bn: "মঙ্গলে জীবন প্রমাণিত" }, { en: "It is proof of present-day organisms", bn: "এটি বর্তমান জীবের প্রমাণ" }], answer: 0,
    activity: { instruction: { en: "Use the bounded AutoNav teaching simulation to route around the hazard and reach a sample target.", bn: "বিপদ এড়িয়ে নমুনার কাছে যাওয়ার জন্য সীমাবদ্ধ AutoNav শিক্ষামূলক সিমুলেশন ব্যবহার করো।" }, action: { en: "Collect and cache sample (simulation)", bn: "নমুনা সংগ্রহ ও ক্যাশ (সিমুলেশন)" }, result: { en: "Perseverance seals and stores selected core samples in tubes for potential future return. This activity is simulated and does not claim any real-time location or operation.", bn: "পারসিভিয়ারেন্স নির্বাচিত কোর নমুনা টিউবে সিল করে সম্ভাব্য ভবিষ্যৎ ফেরতের জন্য রাখে। এই কার্যক্রম সিমুলেশন; এটি কোনো তাৎক্ষণিক অবস্থান বা কাজের দাবি করে না।" }, driveTarget: 5 },
    model: { path: "/models/legacy/perseverance-nasa.glb", credit: "NASA/JPL · Mars 2020 Perseverance Rover model", source: "https://science.nasa.gov/3d-resources/mars-2020-perseverance-rover/", kind: "nasa" },
    distanceKm: 45.22, distanceLabel: { en: "45.22 km · NASA snapshot 11 Oct 2026", bn: "৪৫.২২ কিমি · NASA স্ন্যাপশট ১১ অক্টোবর ২০২৬" }, massKg: 1025,
    power: { en: "Multi-Mission Radioisotope Thermoelectric Generator (MMRTG)", bn: "মাল্টি-মিশন রেডিওআইসোটোপ থার্মোইলেকট্রিক জেনারেটর (MMRTG)" }, status: { en: "Active mission · NASA page checked Oct 2026", bn: "সক্রিয় মিশন · NASA পৃষ্ঠা অক্টোবর ২০২৬-এ দেখা" }, source: src.perseverance,
    parts: [part("mobility", "Six wheels + AutoNav", "ছয় চাকা + AutoNav", "The six-wheel suspension handles rough ground; AutoNav creates terrain maps and selects a route around hazards.", "ছয় চাকার সাসপেনশন দুর্গম পথ সামলায়; AutoNav ভূখণ্ডের মানচিত্র করে বিপদ এড়ানোর পথ বেছে নেয়।", [src.perseverance, src.autoNav]), part("vision", "Mastcam-Z + cameras", "Mastcam-Z + ক্যামেরা", "Mastcam-Z provides zoomable stereo imaging; additional cameras support navigation and engineering.", "Mastcam-Z জুমযোগ্য স্টেরিও ছবি তোলে; অন্য ক্যামেরা চলাচল ও প্রকৌশলে সহায়তা করে।", [src.perseverance]), part("power", "MMRTG", "MMRTG", "A radioisotope thermoelectric generator supplies power and heat to the rover.", "রেডিওআইসোটোপ থার্মোইলেকট্রিক জেনারেটর রোভারকে বিদ্যুৎ ও তাপ দেয়।", [src.perseverance]), part("sampling", "Sample caching system", "নমুনা সংরক্ষণ ব্যবস্থা", "A drill cores rock; the sampling system seals selected cores into tubes for possible future return.", "ড্রিল পাথর থেকে কোর তোলে; নমুনা ব্যবস্থা নির্বাচিত কোর টিউবে সিল করে সম্ভাব্য ভবিষ্যৎ ফেরতের জন্য রাখে।", [src.perseverance]), part("science", "SHERLOC + PIXL", "SHERLOC + PIXL", "These instruments investigate chemistry and mineralogy on rock surfaces at fine scales.", "এই যন্ত্রগুলো পাথরের পৃষ্ঠে সূক্ষ্মভাবে রসায়ন ও খনিজ পরীক্ষা করে।", [src.perseverance])],
    timeline: [{ date: "18 FEB 2021", text: { en: "Perseverance lands in Jezero Crater.", bn: "পারসিভিয়ারেন্স জেজেরো খাদে নামে।" } }, { date: "2021", text: { en: "Ingenuity demonstrates powered, controlled flight on another planet.", bn: "ইনজেনুইটি অন্য গ্রহে শক্তিচালিত নিয়ন্ত্রিত উড্ডয়ন দেখায়।" } }, { date: "11 OCT 2026", text: { en: "Passes Opportunity's off-world driving-distance record; 45.22 km snapshot.", bn: "অপরচুনিটির মহাজাগতিক দূরত্বের রেকর্ড ছাড়ায়; স্ন্যাপশটে ৪৫.২২ কিমি।" } }],
  },
] as const;

export const ROVER_BY_ID = new Map(ROVERS.map((rover) => [rover.id, rover]));
export const ROVER_STORAGE_KEY = "echoes-beyond-earth:rover-legacy:v1";

export interface RoverProgress { completed: RoverId[]; parts: Partial<Record<RoverId, RoverPartId[]>>; missions: Partial<Record<RoverId, { drive: boolean; activity: boolean; answer: boolean }>>; }
export function sanitizeRoverProgress(value: unknown): RoverProgress {
  const data = value && typeof value === "object" ? value as Partial<RoverProgress> : {};
  const validIds = new Set(ROVERS.map((r) => r.id));
  const completed = Array.isArray(data.completed) ? [...new Set(data.completed.filter((id): id is RoverId => typeof id === "string" && validIds.has(id as RoverId)))] : [];
  const parts: RoverProgress["parts"] = {};
  if (data.parts && typeof data.parts === "object") for (const [id, ids] of Object.entries(data.parts)) {
    const rover = ROVER_BY_ID.get(id as RoverId);
    if (rover && Array.isArray(ids)) parts[rover.id] = [...new Set(ids.filter((partId): partId is RoverPartId => typeof partId === "string" && rover.parts.some((p) => p.id === partId)))];
  }
  const missions: RoverProgress["missions"] = {};
  if (data.missions && typeof data.missions === "object") for (const [id, mission] of Object.entries(data.missions)) {
    if (validIds.has(id as RoverId) && mission && typeof mission === "object") missions[id as RoverId] = { drive: mission.drive === true, activity: mission.activity === true, answer: mission.answer === true };
  }
  return { completed, parts, missions };
}
export function localized(value: Localized, lang: Lang): string { return value[lang] || value.en; }
