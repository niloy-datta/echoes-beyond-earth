import type { ImageSource, TextSource, Verification, Body, ObjectKind, ObjectStatus, Localized } from "@/lib/types";

export type ObservatoryViewMode = "explorer" | "trace" | "judge" | "gallery";

export interface EvidenceReference extends TextSource {
  targetBody?: Body | "both";
  missionIds?: string[];
  associatedImages?: string[];
  secondaryUrl?: string;
  secondaryTitle?: string;
  statusDetail?: "caption-reviewed" | "facts-corroborated" | "catalog-pending";
  gameUsage?: string;
}

export interface FactTraceItem {
  label: Localized;
  value: Localized;
  sourceId: string | null;
  verification: Verification;
  sourceRef?: TextSource;
}

export interface MissionTraceNode {
  id: string;
  name: Localized;
  mission: string;
  body: Body;
  kind: ObjectKind;
  status: ObjectStatus;
  isClpsCommercial?: boolean;
  operator?: string;
  arrived: {
    date: string;
    verification: Verification;
    sourceId: string | null;
    sourceRef?: TextSource;
  };
  site: Localized;
  coordinates: {
    lon: number | null;
    lat: number | null;
    precision: "approx" | "unknown";
    verification: Verification;
  };
  facts: FactTraceItem[];
  sources: TextSource[];
  image?: ImageSource;
  imageId?: string | null;
  storyTitle?: Localized;
  storyDek?: Localized;
  gameUsage?: string;
}

export interface EvidenceStats {
  totalReferences: number;
  verifiedCount: number;
  requiredCount: number;
  coveragePercentage: string;
  imageCount: number;
  sourcedFactsCount: number;
  distinctPublishersCount: number;
  compiledDate: string;
}

export interface FilterOptions {
  searchQuery: string;
  verification: "all" | "verified" | "required";
  kind: "all" | "catalog" | "image-caption" | "mission-page" | "dataset";
  publisher: string;
  body: "all" | "moon" | "mars";
  mission: string;
  sortBy: "default" | "title" | "publisher" | "verification";
}
