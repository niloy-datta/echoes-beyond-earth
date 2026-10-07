import { ExpeditionHero } from "@/components/landing/ExpeditionHero";
import { LensTeaser, Mirror, Prologue, Silence } from "@/components/landing/Sections";
import { SiteFooter } from "@/components/SiteFooter";

export default function Home() {
  return (
    <>
      <ExpeditionHero />
      <Prologue />
      <Mirror />
      <Silence />
      <LensTeaser />
      <SiteFooter />
    </>
  );
}
