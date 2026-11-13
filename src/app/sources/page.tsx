import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { EvidenceObservatory } from "@/components/sources/EvidenceObservatory";
import type { SourcesFile } from "@/lib/types";
import sourcesData from "../../../public/data/sources.json";

export const metadata: Metadata = {
  title: "Evidence Observatory · Echoes Beyond Earth",
  description: "Every discovery has a story. Every story deserves evidence. Scientific provenance ledger and NASA primary citations behind Echoes Beyond Earth.",
};

export default function SourcesPage() {
  const sources = sourcesData as unknown as SourcesFile;

  return (
    <>
      <EvidenceObservatory initialSources={sources} />
      <SiteFooter />
    </>
  );
}
