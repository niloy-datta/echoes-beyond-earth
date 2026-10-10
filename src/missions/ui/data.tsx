"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { assetPath } from "@/lib/asset-path";
import { readStore, writeStore, clearStore } from "@/lib/storage";
import type { Catalog, CatalogObject } from "../core/types";
import { levelOf, newProgress, sanitize, xpOf, recordArena, recordClip, recordCompass, recordQuiz, type MissionProgress } from "../core/progress";

let catalogPromise: Promise<Catalog> | null = null;
function loadCatalog(): Promise<Catalog> {
  catalogPromise ??= fetch(assetPath("/data/catalog.json"), { cache: "force-cache" })
    .then((r) => {
      if (!r.ok) throw new Error(`catalog.json → HTTP ${r.status}`);
      return r.json() as Promise<Catalog>;
    })
    .catch((e) => {
      catalogPromise = null; // allow retry
      throw e;
    });
  return catalogPromise;
}

export type CatalogState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; catalog: Catalog; byId: Map<string, CatalogObject> };

export function useCatalog(): CatalogState & { retry: () => void } {
  const [state, setState] = useState<CatalogState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let off = false;
    setState({ status: "loading" });
    loadCatalog().then(
      (catalog) => !off && setState({ status: "ready", catalog, byId: new Map(catalog.objects.map((o) => [o.id, o])) }),
      (e) => !off && setState({ status: "error", error: String(e?.message ?? e) }),
    );
    return () => { off = true; };
  }, [attempt]);
  return { ...state, retry: () => setAttempt((a) => a + 1) };
}

const KEY = "missions";

/** Mission progress in localStorage (key "the-last-signal:missions"). Always sanitised on read. */
export function useProgress() {
  const [progress, setProgress] = useState<MissionProgress>(newProgress);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setProgress(sanitize(readStore<unknown>(KEY, null)));
    setHydrated(true);
  }, []);
  const commit = useCallback((fn: (p: MissionProgress) => MissionProgress) => {
    setProgress((cur) => {
      const next = fn(cur);
      writeStore(KEY, next);
      return next;
    });
  }, []);
  const xp = useMemo(() => xpOf(progress), [progress]);
  const level = useMemo(() => levelOf(xp), [xp]);
  return {
    progress, hydrated, xp, level,
    clip: (id: string) => commit((p) => recordClip(p, id)),
    compass: (id: string, stars: number, hints: number) => commit((p) => recordCompass(p, id, stars, hints)),
    quiz: (id: string, correct: number) => commit((p) => recordQuiz(p, id, correct)),
    arena: (score: number, streak: number, daily?: string) => commit((p) => recordArena(p, score, streak, daily)),
    vr: () => commit((p) => (p.vrVisited ? p : { ...p, vrVisited: true })),
    reset: () => { clearStore(KEY); setProgress(newProgress()); },
  };
}

export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const MAP_IMG = { moon: assetPath("/tiles/moon-eq.jpg"), mars: assetPath("/tiles/mars-eq.jpg") } as const;
