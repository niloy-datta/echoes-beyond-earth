import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { Hub } from "@/missions/ui/Hub";

export const metadata: Metadata = {
  title: "Mission Stories",
  description: "Ten story clips narrated by Bhulu, map challenges, quizzes, a quiz arena and a VR walk — built on real Moon and Mars lander data.",
};

export default function MissionsPage() {
  return (
    <>
      <Hub />
      <SiteFooter />
    </>
  );
}
