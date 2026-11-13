"use client";

import type { SourcesFile } from "@/lib/types";
import { EvidenceObservatory } from "./EvidenceObservatory";
import defaultSources from "../../../public/data/sources.json";

export function Evidence({ initialSources }: { initialSources?: SourcesFile }) {
  const sources = initialSources ?? (defaultSources as unknown as SourcesFile);
  return <EvidenceObservatory initialSources={sources} />;
}
