"use client";

import { useState, useEffect, useMemo } from "react";
import type { SourcesFile } from "@/lib/types";
import type { ObservatoryViewMode, EvidenceStats } from "./types";
import { CinematicHero } from "./CinematicHero";
import { ScientificMetrics } from "./ScientificMetrics";
import { EvidenceExplorer } from "./EvidenceExplorer";
import { MissionEvidenceTrace } from "./MissionEvidenceTrace";
import { ResearcherJudgeView } from "./ResearcherJudgeView";
import { ImageProvenanceGallery } from "./ImageProvenanceGallery";
import { MISSION_TRACE_DATA } from "./missionData";

interface EvidenceObservatoryProps {
  initialSources: SourcesFile;
}

export function EvidenceObservatory({ initialSources }: EvidenceObservatoryProps) {
  const [activeView, setActiveView] = useState<ObservatoryViewMode>("explorer");

  // Read URL hash on mount to enable deep-linking (e.g. /sources/#judge)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "") as ObservatoryViewMode;
      if (["explorer", "trace", "judge", "gallery"].includes(hash)) {
        setActiveView(hash);
      }
    }
  }, []);

  const handleViewChange = (view: ObservatoryViewMode) => {
    setActiveView(view);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${view}`);
    }
  };

  const references = initialSources.references ?? [];
  const images = initialSources.images ?? {};

  // Compute accurate statistics dynamically from data
  const stats = useMemo<EvidenceStats>(() => {
    const totalReferences = references.length;
    const verifiedCount = references.filter((r) => r.verification === "verified").length;
    const requiredCount = totalReferences - verifiedCount;
    const coveragePercentage = totalReferences > 0
      ? ((verifiedCount / totalReferences) * 100).toFixed(1)
      : "0.0";
    const imageCount = Object.keys(images).length;

    // Distinct publishers
    const pubSet = new Set(references.map((r) => r.publisher));

    // Sourced facts count from mission trace dataset
    let sourcedFactsCount = 0;
    MISSION_TRACE_DATA.forEach((m) => {
      m.facts.forEach((f) => {
        if (f.sourceId) sourcedFactsCount++;
      });
    });

    return {
      totalReferences,
      verifiedCount,
      requiredCount,
      coveragePercentage,
      imageCount,
      sourcedFactsCount,
      distinctPublishersCount: pubSet.size,
      compiledDate: initialSources.compiled || "2026-10-07",
    };
  }, [references, images, initialSources.compiled]);

  return (
    <div className="min-h-screen bg-void text-lunar selection:bg-signal selection:text-void">
      {/* 1. Cinematic Hero */}
      <CinematicHero
        activeView={activeView}
        onViewChange={handleViewChange}
        stats={stats}
      />

      {/* 2. Scientific Metrics Overview */}
      <ScientificMetrics stats={stats} />

      {/* 3. Main Content Views (TabPanels) */}
      <main className="container-x py-12 md:py-16">
        <div
          role="tabpanel"
          id={`panel-${activeView}`}
          aria-labelledby={`tab-${activeView}`}
          className="focus:outline-none"
        >
          {activeView === "explorer" && (
            <section aria-labelledby="explorer-view-heading" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 id="explorer-view-heading" className="label text-signal">
                    Interactive Evidence Explorer
                  </h2>
                  <p className="text-xl font-serif italic text-lunar">
                    Search and filter primary scientific citations
                  </p>
                </div>
              </div>
              <EvidenceExplorer references={references} />
            </section>
          )}

          {activeView === "trace" && (
            <section aria-labelledby="trace-view-heading" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 id="trace-view-heading" className="label text-signal">
                    Mission-to-Evidence Trace
                  </h2>
                  <p className="text-xl font-serif italic text-lunar">
                    Direct provenance path from mission to historical claim to primary source
                  </p>
                </div>
              </div>
              <MissionEvidenceTrace references={references} />
            </section>
          )}

          {activeView === "judge" && (
            <section aria-labelledby="judge-view-heading" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 id="judge-view-heading" className="label text-signal">
                    Researcher & Judge Evaluation Panel
                  </h2>
                  <p className="text-xl font-serif italic text-lunar">
                    Rapid academic verification audit in under 60 seconds
                  </p>
                </div>
              </div>
              <ResearcherJudgeView references={references} stats={stats} />
            </section>
          )}

          {activeView === "gallery" && (
            <section aria-labelledby="gallery-view-heading" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 id="gallery-view-heading" className="label text-signal">
                    Curated NASA Photographic Archive
                  </h2>
                  <p className="text-xl font-serif italic text-lunar">
                    Official imagery plates from JSC, JPL and GSFC with archival credits
                  </p>
                </div>
              </div>
              <ImageProvenanceGallery images={images} />
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
