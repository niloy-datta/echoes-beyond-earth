import type { Metadata } from "next";
import { Archive } from "@/components/archive/Archive";
import { PageHeader } from "@/components/PageHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { DataGate } from "@/components/ui";

export const metadata: Metadata = {
  title: "Silent Archive",
  description: "Search every NASA surface machine in the collection, in English and Bangla.",
};

export default function ArchivePage() {
  return (
    <>
      <PageHeader n={7} title="archive.title" dek="archive.dek" />
      <DataGate>
        <Archive />
      </DataGate>
      <SiteFooter />
    </>
  );
}
