export type Lang = "en" | "bn";
export interface L { en: string; bn: string }
export type Body = "moon" | "mars";

/** One row of public/data/catalog.json (built from the two spreadsheets by scripts/build-catalog.py). */
export interface CatalogObject {
  id: string;
  body: Body;
  kind: "landed" | "crashed" | "impact";
  status: "silent" | "active" | "lost";
  name: string;
  mission: string;
  agency: string;
  lat: number | null;
  lon: number | null;
  precision: "reported" | "approx" | "near-parent";
  coords_raw: string;
  coords_note: string | null;
  left_behind: string | null;
  left_raw: string;
  last_contact: string | null;
  last_contact_approx: boolean;
  last_raw: string;
  image_url: string | null;
  source_url: string | null;
  sources: string[];
  note_bn: string | null;
  museum_id: string | null;
}
export interface Catalog { objects: CatalogObject[] }

export type HardwareKind = "lm" | "surveyor" | "nova-c" | "viking" | "pathfinder" | "mer" | "phoenix" | "insight" | "ingenuity";

export type FactKey = "left" | "coords" | "last" | "site";

export interface Beat {
  id: "arrive" | "work" | "silence" | "echo";
  /** What Bhulu says. Storytelling voice — facts live in `facts`, which are read from the catalog. */
  caption: L;
  facts: FactKey[];
  seconds: number;
}

export interface Question {
  id: string;
  prompt: L;
  options: L[];
  /** index into options (before shuffling) */
  answer: number;
  explain: L;
}

export interface Chapter {
  id: string;
  order: number;
  body: Body;
  objectId: string;
  hardware: HardwareKind;
  title: L;
  dek: L;
  beats: Beat[];
  /** reveal card shown after the map challenge */
  why: L;
  science: L;
  hint1: L;
  hint2: L;
  quiz: Question[];
  badge: { id: string; name: L; icon: string };
  /** optional call-to-action to an existing exhibit */
  link?: { href: string; label: L };
}
