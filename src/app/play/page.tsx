import type { Metadata } from "next";
import { EkoGame } from "@/components/play/EkoGame";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "EKO / Opportunity — Interactive Mars Story",
  description: "An illustrated 3D learning experience about the Opportunity rover, with four NASA-sourced discoveries and bilingual quizzes.",
};

export default function EkoPlayPage() {
  return (
    <>
      <EkoGame />
      <SiteFooter />
    </>
  );
}
