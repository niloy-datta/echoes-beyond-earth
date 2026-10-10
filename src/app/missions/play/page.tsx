import type { Metadata } from "next";
import { Suspense } from "react";
import { PlayRoute } from "@/missions/ui/PlayRoute";

export const metadata: Metadata = {
  title: "Story chapter",
  description: "A short 3D story clip, a map challenge and a quiz about one object left on the Moon or Mars.",
};

export default function PlayPage() {
  return (
    <Suspense fallback={null}>
      <PlayRoute />
    </Suspense>
  );
}
