import type { Metadata } from "next";
import { GameRoot } from "@/game/ui/GameRoot";

export const metadata: Metadata = {
  title: "The Last Light — Mars expedition game",
  description:
    "A third-person Mars exploration game with the EKO companion: five chapters through Opportunity's NASA-documented history, with a full 2D alternative. Independent educational demo, not affiliated with NASA.",
};

export default function LastLightGamePage() {
  return <GameRoot />;
}
