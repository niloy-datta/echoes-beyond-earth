import type { Metadata } from "next";
import { RoverLegacy } from "@/components/rover-legacy/RoverLegacy";

export const metadata: Metadata = {
  title: "Rover Legacy Lab — Echoes Beyond Earth",
  description: "Explore NASA's Sojourner, Spirit, Opportunity, Curiosity, and Perseverance rovers through interactive hardware inspection, educational science missions, and an evidence-based comparison.",
};

export default function RoverLegacyPage() { return <RoverLegacy />; }
