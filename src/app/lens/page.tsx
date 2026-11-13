import type { Metadata } from "next";
import { MemoryLens } from "@/components/lens/MemoryLens";
import { SiteFooter } from "@/components/SiteFooter";
import { DataGate } from "@/components/ui";

export const metadata: Metadata = {
  title: "Memory Lens",
  description: "Compare the same places on the Moon and Mars, then and now, in NASA imagery.",
};

export default function LensPage() {
  return (
    <>
      <DataGate>
        <MemoryLens />
      </DataGate>
      <SiteFooter />
    </>
  );
}
