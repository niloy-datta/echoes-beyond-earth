import type { Metadata } from "next";
import { LegacyRipple } from "@/components/legacy/LegacyRipple";
import { PageHeader } from "@/components/PageHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { DataGate } from "@/components/ui";

export const metadata: Metadata = {
  title: "Legacy Ripple",
  description: "How knowledge from silent NASA missions rippled into the missions that followed.",
};

export default function LegacyPage() {
  return (
    <>
      <PageHeader n={4} title="legacy.title" dek="legacy.dek" />
      <DataGate>
        <LegacyRipple />
      </DataGate>
      <SiteFooter />
    </>
  );
}
