import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

const objects = read("public/data/objects.geojson");
const stories = read("public/data/stories.json");
const sources = read("public/data/sources.json");

const storyMap = new Map(stories.stories.map((s) => [s.object, s]));
const refMap = new Map(sources.references.map((r) => [r.id, r]));

const featuredIds = [
  "apollo-11", "surveyor-1", "surveyor-3", "apollo-12", "apollo-14",
  "apollo-15", "apollo-16", "apollo-17", "viking-1", "viking-2",
  "pathfinder", "spirit", "opportunity", "phoenix", "insight",
  "curiosity", "perseverance", "ingenuity", "im-1", "blue-ghost-1"
];

const nodes = [];

for (const id of featuredIds) {
  const obj = objects.features.find((f) => f.id === id);
  if (!obj) continue;
  const p = obj.properties;
  const story = storyMap.get(id);

  const facts = [];
  if (id === "spirit") {
    facts.push({
      label: { en: "Landed Date", bn: "অবতরণের তারিখ" },
      value: { en: "4 January 2004", bn: "৪ জানুয়ারি ২০০৪" },
      sourceId: "sci:mer-spirit",
      verification: "verified",
    });
    facts.push({
      label: { en: "Last Communication", bn: "শেষ যোগাযোগ" },
      value: { en: "22 March 2010 (concluded May 2011)", bn: "২২ মার্চ ২০১০ (সমাপ্ত মে ২০১১)" },
      sourceId: "sci:mer-spirit",
      verification: "verified",
    });
    facts.push({
      label: { en: "Summit Panorama (3-D)", bn: "শীর্ষ প্যানোরামা (৩-ডি)" },
      value: { en: "Sweeping View of Columbia Hills & Gusev Crater", bn: "কলম্বিয়া হিলস ও গুসেভ খাদের ৩-ডি দৃশ্য" },
      sourceId: "img:PIA03250",
      verification: "verified",
    });
    facts.push({
      label: { en: "NSSDCA Catalog Entry", bn: "এনএসএসডিসিএ ক্যাটালগ এন্ট্রি" },
      value: { en: "COSPAR ID 2003-027A (Secondary Reference · Catalog Pending)", bn: "কসপার আইডি ২০০৩-০২৭এ (অপেক্ষমান ক্যাটালগ)" },
      sourceId: "nssdca:2003-027A",
      verification: "required",
    });
  } else if (story) {
    for (const f of story.facts) {
      facts.push({
        label: f.label,
        value: f.value,
        sourceId: f.source,
        verification: f.verification,
      });
    }
  } else if (id === "im-1") {
    facts.push({
      label: { en: "Landed Date", bn: "অবতরণের তারিখ" },
      value: { en: "22 February 2024", bn: "২২ ফেব্রুয়ারি ২০২৪" },
      sourceId: "clps:im-1-nova",
      verification: "verified",
    });
    facts.push({
      label: { en: "Operator & Initiative", bn: "পরিচালক ও উদ্যোগ" },
      value: { en: "Intuitive Machines (Nova-C) under NASA CLPS", bn: "নাসা সিএলপিএস-এর অধীনে ইনটুইটিভ মেশিনস (নোভা-সি)" },
      sourceId: "clps:im-1-mission",
      verification: "verified",
    });
    facts.push({
      label: { en: "NASA Scientific Payloads", bn: "নাসার বৈজ্ঞানিক পে-লোড" },
      value: { en: "6 NASA instruments (Doppler Lidar, radio astronomy, stereo cameras)", bn: "৬টি নাসার যন্ত্র (ডপলার লিডার, রেডিও জ্যোতির্বিদ্যা, স্টেরিও ক্যামেরা)" },
      sourceId: "clps:im-1-nova",
      verification: "verified",
    });
  } else if (id === "blue-ghost-1") {
    facts.push({
      label: { en: "Landed Date", bn: "অবতরণের তারিখ" },
      value: { en: "2 March 2025", bn: "২ মার্চ ২০২৫" },
      sourceId: "clps:blue-ghost-1",
      verification: "verified",
    });
    facts.push({
      label: { en: "Operator & Task Order", bn: "পরিচালক ও টাস্ক অর্ডার" },
      value: { en: "Firefly Aerospace under NASA CLPS initiative", bn: "নাসা সিএলপিএস উদ্যোগের অধীনে ফায়ারফ্লাই অ্যারোস্পেস" },
      sourceId: "clps:blue-ghost-1",
      verification: "verified",
    });
    facts.push({
      label: { en: "Site & Scientific Goal", bn: "স্থান ও বৈজ্ঞানিক লক্ষ্য" },
      value: { en: "Mare Crisium (10 NASA instruments: regolith drill & radiation detectors)", bn: "মেয়ার ক্রিসিয়াম (১০টি নাসার যন্ত্র: রেগোলিথ ড্রিল ও বিকিরণ ডিটেক্টর)" },
      sourceId: "clps:blue-ghost-1",
      verification: "verified",
    });
  } else if (id === "apollo-12") {
    facts.push({
      label: { en: "Landed Date", bn: "অবতরণের তারিখ" },
      value: { en: "19 November 1969", bn: "১৯ নভেম্বর ১৯৬৯" },
      sourceId: "img:AS12-48-7133",
      verification: "verified",
    });
    facts.push({
      label: { en: "Surveyor 3 Precision Rendezvous", bn: "সার্ভেয়ার ৩ সুনির্দিষ্ট সাক্ষাৎ" },
      value: { en: "Landed within walking distance (~180m / 600ft) of Surveyor 3", bn: "সার্ভেয়ার ৩-এর হাঁটার দূরত্বের মধ্যে (~১৮০ মিটার) অবতরণ" },
      sourceId: "img:AS12-48-7133",
      verification: "verified",
    });
  }

  const isClps = id === "im-1" || id === "blue-ghost-1";
  const sourceIds = [...(p.sources || [])];
  if (id === "im-1") sourceIds.push("clps:im-1-nova", "clps:im-1-mission");
  if (id === "blue-ghost-1") sourceIds.push("clps:blue-ghost-1");
  if (id === "spirit") {
    if (!sourceIds.includes("sci:mer-spirit")) sourceIds.unshift("sci:mer-spirit");
    if (!sourceIds.includes("img:PIA03250")) sourceIds.push("img:PIA03250");
  }

  const GAME_USAGE_MAP = {
    "apollo-11": "Game Chapter 4 Objective & Exhibit 01 (Tranquility Base, Laser Retroreflector, Solar Wind)",
    "surveyor-1": "Exhibit 03 & Lunar Exploration Legacy (First U.S. soft lunar landing)",
    "surveyor-3": "Game Chapter 2 Puzzle & Exhibit 02 (Apollo 12 precision landing 600 ft away)",
    "apollo-12": "Game Chapter 2 & Exhibit 02 (Precision walk to Surveyor 3)",
    "apollo-14": "Exhibit 04 (Fra Mauro highlands, modular equipment transporter)",
    "apollo-15": "Exhibit 05 (Hadley Rille, Lunar Roving Vehicle, laser retroreflector)",
    "apollo-16": "Exhibit 06 (Descartes Highlands, far-ultraviolet camera)",
    "apollo-17": "Exhibit 07 (Taurus-Littrow valley, geologist astronaut mission)",
    "viking-1": "Game Chapter 3 & Exhibit 08 (Chryse Planitia, first continuous Mars surface operations)",
    "viking-2": "Game Chapter 3 & Exhibit 09 (Utopia Planitia biological search)",
    "pathfinder": "Game Chapter 1 side-discovery & Exhibit 10 (Sojourner first mobile wheeled rover)",
    "spirit": "Game Chapter 4 & Rover Legacy (Husband Hill summit panorama PIA03250, storm lab, past-water clues)",
    "opportunity": "Game Chapter 1 (Endeavour crater 45.16 km traverse & Legacy Pan PIA22909)",
    "phoenix": "Exhibit 12 (Vastitas Borealis arctic water-ice confirmation)",
    "insight": "Game Chapter 5 & Exhibit 13 (Elysium Planitia marsquakes, SEIS seismometer, HP3 heat probe)",
    "curiosity": "Exhibit 14 & Rover Legacy (Gale Crater Mount Sharp drilling & ancient lake bed evidence)",
    "perseverance": "Exhibit 15 & Rover Legacy (Jezero Crater river delta sampling & biosignature hunt)",
    "ingenuity": "Exhibit 16 & Rover Legacy (First powered atmospheric flight on another planet)",
    "im-1": "Modern Lunar Exploration (Commercial Lunar Lander carrying 6 NASA CLPS payloads to Malapert A)",
    "blue-ghost-1": "Modern Lunar Exploration (Commercial Lunar Lander carrying 10 NASA CLPS payloads to Mare Crisium)",
  };

  nodes.push({
    id: obj.id,
    name: p.name,
    mission: p.mission,
    body: p.body,
    kind: p.kind,
    status: p.status,
    isClpsCommercial: isClps,
    operator: isClps
      ? id === "im-1"
        ? "Intuitive Machines (Commercial CLPS Contractor)"
        : "Firefly Aerospace (Commercial CLPS Contractor)"
      : "NASA",
    arrived: {
      date: p.arrived.date,
      verification: isClps || id === "spirit" ? "verified" : p.arrived.verification,
      sourceId: isClps
        ? id === "im-1"
          ? "clps:im-1-nova"
          : "clps:blue-ghost-1"
        : id === "spirit"
        ? "sci:mer-spirit"
        : p.arrived.source,
    },
    site: p.site,
    coordinates: {
      lon: obj.geometry ? obj.geometry.coordinates[0] : null,
      lat: obj.geometry ? obj.geometry.coordinates[1] : null,
      precision: p.coordinates.precision,
      verification: p.coordinates.verification,
    },
    facts,
    sourceIds,
    imageId: p.image,
    storyTitle: story ? story.title : undefined,
    storyDek: story ? story.dek : undefined,
    gameUsage: GAME_USAGE_MAP[id] || "Museum Archive & Scientific Ledger",
  });
}

const fileContent = `// Auto-generated mission trace dataset for /sources/ Evidence Observatory
import type { MissionTraceNode } from "./types";

export interface StaticMissionTraceNode extends Omit<MissionTraceNode, "sources"> {
  sourceIds: string[];
}

export const MISSION_TRACE_DATA: StaticMissionTraceNode[] = ${JSON.stringify(nodes, null, 2)};
`;

writeFileSync(join(root, "src/components/sources/missionData.ts"), fileContent, "utf8");
console.log(`Generated missionData.ts with ${nodes.length} mission trace records.`);
