import type { Metadata } from "next";
import { LastSignal } from "@/components/last-signal/LastSignal";
import { SiteFooter } from "@/components/SiteFooter";
import { DataGate } from "@/components/ui";

export const metadata: Metadata = {
  title: "The Last Signal",
  description: "Send a signal to a NASA machine that went silent — and see what kept traveling.",
};

export default function LastSignalPage() {
  return (
    <>
      <DataGate>
        <LastSignal />
      </DataGate>
      <SiteFooter />
    </>
  );
}
