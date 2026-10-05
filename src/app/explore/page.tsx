import type { Metadata } from "next";
import { Suspense } from "react";
import { Explorer } from "@/components/explorer/Explorer";
import { DataGate } from "@/components/ui";

export const metadata: Metadata = {
  title: "Planetary Explorer",
  description: "A Moon and Mars globe of NASA surface missions, with a 1960–2026 Time Machine.",
};

export default function ExplorePage() {
  return (
    <DataGate>
      <Suspense fallback={null}>
        <Explorer />
      </Suspense>
    </DataGate>
  );
}
