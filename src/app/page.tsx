import { Hero } from "@/components/landing/Hero";
import { Exhibits, LensTeaser, Mirror, Prologue, Silence } from "@/components/landing/Sections";
import { SiteFooter } from "@/components/SiteFooter";

export default function Home() {
  return (
    <>
      <Hero />
      <Prologue />
      <Mirror />
      <Silence />
      <LensTeaser />
      <Exhibits />
      <SiteFooter />
    </>
  );
}
