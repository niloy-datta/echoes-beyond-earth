import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Evidence } from "@/components/sources/Evidence";
import { DataGate } from "@/components/ui";

export const metadata: Metadata = {
  title: "Evidence",
  description: "Every source behind Echoes Beyond Earth, with its verification status.",
};

export default function SourcesPage() {
  return (
    <>
      <PageHeader n={7} title="src.title" dek="src.dek" />
      <DataGate>
        <Evidence />
      </DataGate>
      <SiteFooter />
    </>
  );
}
