import type { Metadata } from "next";
import { EkoTeacherKit } from "@/components/play/EkoTeacherKit";

export const metadata: Metadata = {
  title: "Opportunity Explorer — Teacher Worksheet",
  description: "A bilingual, printable, evidence-based NASA Opportunity classroom activity.",
};

export default function TeacherPage() {
  return <EkoTeacherKit />;
}
