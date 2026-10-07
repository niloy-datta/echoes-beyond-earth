import type { Metadata } from "next";
import { LegacyRipple } from "@/components/legacy/LegacyRipple";
import { SiteFooter } from "@/components/SiteFooter";
import { DataGate } from "@/components/ui";

export const metadata: Metadata = {
  title: "Legacy Ripple",
  description: "How knowledge from silent NASA missions rippled into the missions that followed.",
};

export default function LegacyPage() {
  return (
    <>
      <DataGate>
        <LegacyRipple />
      </DataGate>
      <SiteFooter />
    </>
  );
}
