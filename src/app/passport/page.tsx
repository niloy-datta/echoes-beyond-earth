import type { Metadata } from "next";
import { Passport } from "@/components/passport/Passport";
import { SiteFooter } from "@/components/SiteFooter";
import { DataGate } from "@/components/ui";

export const metadata: Metadata = {
  title: "Explorer Passport",
  description: "Your stamps and progress through Echoes Beyond Earth, stored only in your browser.",
};

export default function PassportPage() {
  return (
    <>
      <DataGate>
        <Passport />
      </DataGate>
      <SiteFooter />
    </>
  );
}
