export type Lang = "en" | "bn";
export type Body = "moon" | "mars";
export type Localized = { en: string; bn: string };

/** Partial ISO date: "YYYY", "YYYY-MM" or "YYYY-MM-DD". */
export type PartialDate = string;

export type ObjectStatus = "silent" | "active" | "lost";
export type ObjectKind =
  | "crewed-landing"
  | "lander"
  | "rover"
  | "helicopter"
  | "impactor";

/** "verified" = checked against the linked NASA source. "required" = the team must still confirm it. */
export type Verification = "verified" | "required";

export interface DateClaim {
  date: PartialDate;
  verification: Verification;
  source: string | null;
}

export interface MissionProperties {
  id: string;
  body: Body;
  name: Localized;
  mission: string;
  kind: ObjectKind;
  status: ObjectStatus;
  arrived: DateClaim;
  /** The event that ended (or paused) contact — last contact, final flight, impact… */
  end: (DateClaim & { label: Localized }) | null;
  /** Location precision. "approx" points are rounded; null geometry means unknown. */
  coordinates: { precision: "approx" | "unknown"; verification: Verification };
  statusAsOf: PartialDate;
  statusVerification: Verification;
  site: Localized;
  image: string | null;
  sources: string[];
}

export interface MissionFeature {
  type: "Feature";
  id: string;
  geometry: { type: "Point"; coordinates: [number, number] } | null;
  properties: MissionProperties;
}

export interface MissionCollection {
  type: "FeatureCollection";
  features: MissionFeature[];
}

export interface Fact {
  label: Localized;
  value: Localized;
  source: string | null;
  verification: Verification;
}

export interface Chapter {
  kicker: Localized;
  title: Localized;
  body: Localized;
  image?: string;
}

export interface Story {
  id: string;
  object: string;
  title: Localized;
  dek: Localized;
  chapters: Chapter[];
  facts: Fact[];
  lastSignal: { date: PartialDate; text: Localized; verification: Verification } | null;
  kept: Localized;
}

export interface Hotspot {
  /** position on the photograph, in % of its width/height */
  x: number;
  y: number;
  label: Localized;
  source: string | null;
}

export interface LensPair {
  id: string;
  /** related museum object, when the pair belongs to one */
  object: string | null;
  short: Localized;
  title: Localized;
  caption: Localized;
  matters?: Localized;
  then: { image: string; year: string; hotspots?: Hotspot[] };
  now: { image: string; year: string; hotspots?: Hotspot[] };
}

export interface DiscoveryPath {
  id: string;
  title: Localized;
  dek: Localized;
  steps: { object: string; note: Localized }[];
}

export interface Ripple {
  id: string;
  from: string;
  title: Localized;
  rings: { to: string; relation: Localized; source: string | null; verification: Verification }[];
}

export interface TimelineEvent {
  date: PartialDate;
  object: string | null;
  text: Localized;
  source: string | null;
}

export interface StoriesFile {
  stories: Story[];
  lens: LensPair[];
  paths: DiscoveryPath[];
  ripples: Ripple[];
  timeline: TimelineEvent[];
}

export interface ImageSource {
  file: string;
  thumb: string;
  width: number;
  height: number;
  title: string;
  date: string;
  center: string | null;
  credit: string;
  page: string;
}

export interface TextSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  kind: "catalog" | "mission-page" | "image-caption" | "dataset";
  verification: Verification;
  note?: string;
}

export interface SourcesFile {
  compiled: string;
  images: Record<string, ImageSource>;
  references: TextSource[];
}
