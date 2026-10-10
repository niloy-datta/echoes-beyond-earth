"use client";
import { useSearchParams } from "next/navigation";
import { Player } from "./Player";

export function PlayRoute() {
  const id = useSearchParams().get("c") ?? "apollo-11";
  return <Player chapterId={id} />;
}
