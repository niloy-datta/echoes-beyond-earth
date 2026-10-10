import type { Metadata } from "next";
import { Suspense } from "react";
import { Arena } from "@/missions/ui/Arena";

export const metadata: Metadata = {
  title: "Quiz Arena",
  description: "Ten quick questions generated from the Moon and Mars lander spreadsheets, with a daily mission.",
};

export default function ArenaPage() {
  return (
    <Suspense fallback={null}>
      <Arena />
    </Suspense>
  );
}
