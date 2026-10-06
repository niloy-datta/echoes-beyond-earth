import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { Paths } from "@/components/paths/Paths";
import { SiteFooter } from "@/components/SiteFooter";
import { DataGate } from "@/components/ui";

export const metadata: Metadata = {
  title: "Discovery Paths",
  description: "Guided routes through NASA's silent machines on the Moon and Mars.",
};

export default function PathsPage() {
  return (
    <>
      <PageHeader n={5} title="paths.title" dek="paths.dek" />
      <DataGate>
        <Paths />
      </DataGate>
      <SiteFooter />
    </>
  );
}
