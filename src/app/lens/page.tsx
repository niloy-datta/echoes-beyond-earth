import type { Metadata } from "next";
import { MemoryLens } from "@/components/lens/MemoryLens";
import { PageHeader } from "@/components/PageHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { DataGate } from "@/components/ui";

export const metadata: Metadata = {
  title: "Memory Lens",
  description: "Compare the same places on the Moon and Mars, then and now, in NASA imagery.",
};

export default function LensPage() {
  return (
    <>
      <PageHeader n={5} title="lens.title" dek="lens.dek" />
      <DataGate>
        <MemoryLens />
      </DataGate>
      <SiteFooter />
    </>
  );
}
