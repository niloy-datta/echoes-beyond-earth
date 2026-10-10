import type { Metadata } from "next";
import { VrWorld } from "@/missions/ui/VrWorld";

export const metadata: Metadata = {
  title: "VR Mission Park",
  description: "Walk among life-size 3D landers and rovers on the Moon and Mars — in a VR headset or on screen.",
};

export default function VrPage() {
  return <VrWorld />;
}
