import type { Metadata } from "next";
import { CatalogView } from "@/missions/ui/CatalogView";

export const metadata: Metadata = {
  title: "Spreadsheet dataset",
  description: "Every Moon and Mars object from the two source spreadsheets, with coordinates, dates, photo and source links.",
};

export default function CatalogPage() {
  return <CatalogView />;
}
