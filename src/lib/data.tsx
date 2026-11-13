"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ImageSource, MissionCollection, MissionFeature, SourcesFile, StoriesFile, Story, TextSource } from "./types";
import { assetPath } from "./asset-path";

type State =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; objects: MissionCollection; stories: StoriesFile; sources: SourcesFile };

export interface MuseumData {
  objects: MissionFeature[];
  stories: StoriesFile;
  sources: SourcesFile;
  byId: Map<string, MissionFeature>;
  storyFor: (objectId: string) => Story | undefined;
  image: (id: string | null | undefined) => ImageSource | undefined;
  reference: (id: string | null | undefined) => TextSource | undefined;
}

interface Ctx {
  state: State;
  data: MuseumData | null;
  retry: () => void;
}

const DataCtx = createContext<Ctx | null>(null);

// All mission content is static, versioned JSON shipped with the site — no backend.
const FILES = {
  objects: assetPath("/data/objects.geojson"),
  stories: assetPath("/data/stories.json"),
  sources: assetPath("/data/sources.json"),
} as const;

async function load<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    Promise.all([
      load<MissionCollection>(FILES.objects),
      load<StoriesFile>(FILES.stories),
      load<SourcesFile>(FILES.sources),
    ])
      .then(([objects, stories, sources]) => {
        if (!cancelled) setState({ status: "ready", objects, stories, sources });
      })
      .catch((e: unknown) => {
        if (!cancelled) setState({ status: "error", error: e instanceof Error ? e.message : String(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const data = useMemo<MuseumData | null>(() => {
    if (state.status !== "ready") return null;
    const byId = new Map(state.objects.features.map((f) => [f.id, f]));
    const storyByObject = new Map(state.stories.stories.map((s) => [s.object, s]));
    const refs = new Map(state.sources.references.map((r) => [r.id, r]));
    return {
      objects: state.objects.features,
      stories: state.stories,
      sources: state.sources,
      byId,
      storyFor: (id) => storyByObject.get(id),
      image: (id) => (id ? state.sources.images[id] : undefined),
      reference: (id) => (id ? refs.get(id) : undefined),
    };
  }, [state]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return <DataCtx.Provider value={{ state, data, retry }}>{children}</DataCtx.Provider>;
}

export function useMuseum() {
  const ctx = useContext(DataCtx);
  if (!ctx) throw new Error("useMuseum must be used inside <DataProvider>");
  return ctx;
}
