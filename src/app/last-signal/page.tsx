import type { Metadata } from "next";
import { LastSignal } from "@/components/last-signal/LastSignal";
import { PageHeader } from "@/components/PageHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { DataGate } from "@/components/ui";

export const metadata: Metadata = {
  title: "The Last Signal",
  description: "Send a signal to a NASA machine that went silent — and see what kept traveling.",
};

export default function LastSignalPage() {
  return (
    <>
      <PageHeader n={2} title="ls.title" dek="ls.dek" />
      <DataGate>
        <LastSignal />
      </DataGate>
      <SiteFooter />
    </>
  );
}
