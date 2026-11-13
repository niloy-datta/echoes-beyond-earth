"use client";

import { useState, useMemo } from "react";
import type { TextSource, Verification } from "@/lib/types";
import { VerificationBadge } from "@/components/ui";
import { MISSION_TRACE_DATA, type StaticMissionTraceNode } from "./missionData";
import { useT } from "@/lib/i18n";

interface MissionEvidenceTraceProps {
  references: TextSource[];
}

export function MissionEvidenceTrace({ references }: MissionEvidenceTraceProps) {
  const { lang } = useT();

  const refMap = useMemo(() => new Map(references.map((r) => [r.id, r])), [references]);

  const [selectedMissionId, setSelectedMissionId] = useState<string>("apollo-11");
  const [filterBody, setFilterBody] = useState<"all" | "moon" | "mars">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMissions = useMemo(() => {
    return MISSION_TRACE_DATA.filter((m) => {
      if (filterBody !== "all" && m.body !== filterBody) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = m.name.en.toLowerCase().includes(q) || m.name.bn.toLowerCase().includes(q);
        const matchesMission = m.mission.toLowerCase().includes(q);
        const matchesSite = m.site.en.toLowerCase().includes(q);
        if (!matchesName && !matchesMission && !matchesSite) return false;
      }
      return true;
    });
  }, [filterBody, searchTerm]);

  const currentMission = useMemo(() => {
    return (
      MISSION_TRACE_DATA.find((m) => m.id === selectedMissionId) ||
      MISSION_TRACE_DATA[0]
    );
  }, [selectedMissionId]);

  return (
    <div className="space-y-8">
      {/* Intro banner explaining the provenance pipeline */}
      <div className="rounded-2xl border border-hairline bg-void-2/60 p-6 backdrop-blur-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="label text-signal">Provenance Chain</h3>
            <p className="mt-1 font-serif text-2xl italic text-lunar md:text-3xl">
              Trace any historical claim to its primary NASA repository
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-dust">
            <span className="rounded-full border border-hairline px-3 py-1">
              Zero Invention Guarantee
            </span>
          </div>
        </div>

        {/* Visual Pipeline flow indicator */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline/60 bg-void-3/80 p-4 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-signal text-void font-bold text-[11px]">
              1
            </span>
            <span className="text-lunar font-semibold uppercase tracking-wider">Mission Target</span>
          </div>
          <span className="text-dust">──────▶</span>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-signal text-void font-bold text-[11px]">
              2
            </span>
            <span className="text-lunar font-semibold uppercase tracking-wider">Historical Fact</span>
          </div>
          <span className="text-dust">──────▶</span>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-signal text-void font-bold text-[11px]">
              3
            </span>
            <span className="text-lunar font-semibold uppercase tracking-wider">Citation Ledger</span>
          </div>
          <span className="text-dust">──────▶</span>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-signal text-void font-bold text-[11px]">
              4
            </span>
            <span className="text-lunar font-semibold uppercase tracking-wider">NASA Primary Source</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Mission Selector (Left) + Provenance Flow Panel (Right) */}
      <div className="grid gap-6 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        {/* Left Column: Mission Directory */}
        <div className="space-y-4">
          <div className="rounded-xl border border-hairline bg-void-2/60 p-4">
            <div className="flex items-center justify-between pb-3 border-b border-hairline/60">
              <span className="label">Select Mission ({filteredMissions.length})</span>
              <div className="flex gap-1">
                {(["all", "moon", "mars"] as const).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setFilterBody(b)}
                    className={`rounded px-2 py-0.5 font-mono text-[10px] uppercase transition-colors ${
                      filterBody === b
                        ? "bg-signal text-void font-bold"
                        : "text-dust hover:text-lunar"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter missions..."
                className="w-full rounded-lg border border-hairline bg-void-3 px-3 py-1.5 text-xs text-lunar placeholder:text-dust/60 focus:border-signal focus:outline-none"
              />
            </div>

            {/* Mission List */}
            <div className="mt-3 max-h-[560px] space-y-1.5 overflow-y-auto pr-1">
              {filteredMissions.map((m) => {
                const isSelected = m.id === selectedMissionId;
                const isCLPS = m.isClpsCommercial;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMissionId(m.id)}
                    className={`w-full rounded-lg p-3 text-left transition-all ${
                      isSelected
                        ? "border border-signal bg-void-3 text-lunar shadow-md"
                        : "border border-transparent bg-void-2/40 text-lunar-2 hover:border-hairline hover:bg-void-2"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-dust">
                        {m.body} · {m.kind}
                      </span>
                      {isCLPS && (
                        <span className="rounded bg-signal-dim px-1.5 py-0.2 text-[9px] font-mono uppercase tracking-wider text-signal border border-signal/30">
                          NASA CLPS
                        </span>
                      )}
                    </div>
                    <div className="mt-1 font-medium text-xs text-lunar truncate">
                      {m.name.en}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-dust">
                      <span>Arrived: {m.arrived.date}</span>
                      <span className={m.arrived.verification === "verified" ? "text-signal" : "text-caution"}>
                        {m.arrived.verification === "verified" ? "● Verified" : "○ Required"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Mission Provenance Trace Details */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-hairline bg-void-2/70 p-6 shadow-xl backdrop-blur-md">
            {/* Header of Selected Mission */}
            <div className="flex flex-col gap-4 border-b border-hairline pb-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-wider">
                  <span className="rounded bg-void-3 px-2 py-0.5 text-signal border border-signal/30">
                    Target: {currentMission.body}
                  </span>
                  <span className="rounded bg-void-3 px-2 py-0.5 text-dust border border-hairline">
                    Kind: {currentMission.kind}
                  </span>
                  <span className="rounded bg-void-3 px-2 py-0.5 text-dust border border-hairline">
                    Operator: {currentMission.operator || "NASA"}
                  </span>
                </div>

                <h3 className="mt-3 text-2xl font-bold tracking-tight text-lunar sm:text-3xl">
                  {currentMission.name.en}
                </h3>

                {currentMission.gameUsage && (
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-signal/40 bg-signal-dim/30 px-3 py-1.5 text-xs font-mono text-signal">
                    <span aria-hidden>🎮</span>
                    <span>{currentMission.gameUsage}</span>
                  </div>
                )}

                {currentMission.isClpsCommercial && (
                  <div className="mt-3 rounded-lg border border-signal/40 bg-signal-dim/30 p-3 text-xs text-lunar-2">
                    <p className="font-semibold text-signal">
                      Commercial Lunar Lander (NASA CLPS Initiative)
                    </p>
                    <p className="mt-1 leading-relaxed text-dust">
                      This mission was developed and operated by a commercial lunar partner ({currentMission.operator}) delivering NASA-funded scientific and technological payload instruments to the lunar surface.
                    </p>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-4 text-xs font-mono text-dust sm:grid-cols-3">
                  <div>
                    <span className="block text-[10px] uppercase text-dust/70">Arrival Date</span>
                    <span className="text-lunar font-semibold">{currentMission.arrived.date}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-dust/70">Landing Site</span>
                    <span className="text-lunar truncate block">{currentMission.site.en}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-dust/70">Arrival Status</span>
                    <VerificationBadge status={currentMission.arrived.verification} />
                  </div>
                </div>
              </div>
            </div>

            {/* Provenance Steps: Historical Facts Supported by Citations */}
            <div className="mt-6">
              <h4 className="label mb-4 text-signal">
                Historical Facts & Associated Primary Citations ({currentMission.facts.length})
              </h4>

              {currentMission.facts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-caution/40 bg-void-3/60 p-5 text-center">
                  <p className="font-mono text-xs text-caution">
                    Verification required — No individual fact citations recorded yet for this object.
                  </p>
                  <p className="mt-1 text-xs text-dust">
                    Raw landing coordinates and arrival date remain flagged for human verification.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentMission.facts.map((fact, idx) => {
                    const sourceRef = fact.sourceId ? refMap.get(fact.sourceId) : undefined;
                    const isVerified = fact.verification === "verified";
                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-hairline/80 bg-void-3/70 p-4 transition-all hover:border-hairline-strong"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-dust">
                            Fact {idx + 1}: {fact.label.en}
                          </span>
                          <VerificationBadge status={fact.verification} />
                        </div>

                        {/* Fact Value */}
                        <p className="mt-2 text-sm font-medium text-lunar leading-relaxed">
                          {fact.value.en}
                        </p>

                        {/* Citation Node */}
                        <div className="mt-3 rounded-lg border border-hairline/60 bg-void-2/60 p-3 text-xs">
                          {sourceRef ? (
                            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <span className="font-mono text-[10px] text-dust uppercase tracking-wider block">
                                  Supporting Citation [{sourceRef.id}]
                                </span>
                                <a
                                  href={sourceRef.url}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="font-medium text-lunar hover:text-signal transition-colors inline-flex items-center gap-1 mt-0.5"
                                >
                                  <span className="truncate">{sourceRef.title}</span>
                                  <span aria-hidden className="text-dust">↗</span>
                                </a>
                                <p className="text-[11px] text-dust">{sourceRef.publisher}</p>
                              </div>

                              <a
                                href={sourceRef.url}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="inline-flex items-center gap-1.5 self-start sm:self-center rounded-full border border-signal/40 bg-signal-dim/30 px-3 py-1 text-[11px] font-mono text-signal hover:bg-signal hover:text-void transition-colors"
                              >
                                <span>Inspect NASA Source</span>
                                <span aria-hidden>↗</span>
                              </a>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-caution font-mono text-xs">
                              <span>⚠ Verification required:</span>
                              <span className="text-dust">
                                Claim recorded from initial mission notes; pending direct archival source mapping.
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Direct Reference Ledger for this Mission */}
            <div className="mt-8 border-t border-hairline pt-6">
              <h4 className="label mb-3 text-dust">
                Related Mission Catalogue Records & Documents ({currentMission.sourceIds.length})
              </h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {currentMission.sourceIds.map((sid) => {
                  const ref = refMap.get(sid);
                  if (!ref) {
                    return (
                      <div key={sid} className="rounded-lg border border-hairline/40 bg-void-3/40 p-3 text-xs font-mono text-dust">
                        <span>{sid}</span> (unresolved reference)
                      </div>
                    );
                  }
                  return (
                    <a
                      key={sid}
                      href={ref.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="group flex flex-col justify-between rounded-lg border border-hairline bg-void-3/50 p-3 transition-colors hover:border-signal/50 hover:bg-void-3"
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-dust">
                          <span>{ref.id}</span>
                          <span className={ref.verification === "verified" ? "text-signal" : "text-caution"}>
                            {ref.verification}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-medium text-lunar group-hover:text-signal transition-colors line-clamp-1">
                          {ref.title}
                        </p>
                      </div>
                      <span className="mt-2 text-[10px] text-dust font-mono">
                        {ref.publisher} ↗
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
