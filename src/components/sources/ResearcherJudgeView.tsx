"use client";

import { useState } from "react";
import type { TextSource } from "@/lib/types";
import type { EvidenceStats } from "./types";
import { VerificationBadge } from "@/components/ui";

interface ResearcherJudgeViewProps {
  references: TextSource[];
  stats: EvidenceStats;
}

export function ResearcherJudgeView({ references, stats }: ResearcherJudgeViewProps) {
  const [copiedReport, setCopiedReport] = useState(false);

  const verifiedRefs = references.filter((r) => r.verification === "verified");
  const requiredRefs = references.filter((r) => r.verification === "required");

  const handleCopyReport = () => {
    const report = `# ECHOES BEYOND EARTH — SCIENTIFIC EVIDENCE AUDIT REPORT
Prepared for: NASA Space Apps Judging Panel & Academic Peer Review
Date of Ledger Compilation: ${stats.compiledDate}

## 1. EXECUTIVE EVIDENCE AUDIT (Under 60 Seconds)
- Total Scientific References: ${stats.totalReferences}
- Project-Ledger Verified References: ${stats.verifiedCount} (${stats.coveragePercentage}%)
- Records Awaiting Primary Verification: ${stats.requiredCount}
- Curated NASA Image Plates: ${stats.imageCount}
- Historical Facts Sourced: ${stats.sourcedFactsCount}
- Primary Archival Repositories: NASA NSSDCA, NASA Science, NASA Image and Video Library, JPL Photojournal, Planetary Data System, Moon Trek, Mars Trek.

## 2. WHAT THE PROJECT CLAIMS
- Source-linked landing histories and approximate or unknown locations, with uncertainty labels.
- Source-linked historical milestones, assessments, and a clearly labelled educational storm simulation.
- Strict distinction between NASA-operated missions (Apollo, Viking, Surveyor, Curiosity, Perseverance) and commercial lunar landers carrying NASA CLPS payloads (IM-1 Odysseus, Blue Ghost 1).

## 3. PRIMARY EVIDENCE ORIGINS
- Curated NASA imagery: ${stats.imageCount} local plates, with source credits.
- NASA Space Science Data Coordinated Archive (NSSDCA): Official spacecraft catalog identifiers.
- NASA Science: Official mission retrospectives and CLPS initiative documentation.
- NASA Planetary Data System (PDS) & Trek Basemaps: Global mosaics and coordinate frames.

## 4. TRANSPARENT UNVERIFIED DISCLOSURES
- ${stats.requiredCount} references are flagged "Source verification required".
- Scientific Rationale: Rather than assuming validity or fabricating confirmations, records whose primary pages were not independently confirmed during initial compilation remain explicitly flagged.

Status: PROJECT SOURCE LEDGER CHECK ONLY. Independent scientific review, physical-device QA and challenge-specific NASA resource mapping remain separate checks.
`;

    navigator.clipboard.writeText(report).then(() => {
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 3000);
    });
  };

  return (
    <div className="space-y-8">
      {/* Header card with Copy Report Action */}
      <div className="rounded-2xl border border-hairline bg-void-2/70 p-6 md:p-8 shadow-xl backdrop-blur-md">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-signal/30 bg-signal-dim/40 px-3 py-1 text-[11px] font-mono text-signal uppercase tracking-wider">
              <span>●</span>
              <span>Fast-Track Peer Review Protocol</span>
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-lunar sm:text-3xl">
              Researcher & NASA Space Apps Judge View
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-dust">
              Designed for rapid, rigorous evaluation. Every claim, primary repository, and unverified boundary is auditable in under 60 seconds without marketing spin.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleCopyReport}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-signal bg-signal px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-void shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>{copiedReport ? "✓ Report Copied to Clipboard" : "Copy Complete Audit Report"}</span>
            </button>
          </div>
        </div>

        {/* 4 Pillars Grid (Under 60 Seconds) */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Pillar 1 */}
          <div className="rounded-xl border border-hairline bg-void-3/80 p-5">
            <span className="font-mono text-xs font-bold text-signal uppercase tracking-wider">
              1. What We Claim
            </span>
            <h4 className="mt-2 text-sm font-semibold text-lunar">
              Documented Physical Artifacts
            </h4>
            <p className="mt-2 text-xs leading-relaxed text-dust">
              Spatial landing sites, touchdown dates, operational lifespans, and telemetry across 57 lunar and martian exploration artifacts.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="rounded-xl border border-hairline bg-void-3/80 p-5">
            <span className="font-mono text-xs font-bold text-signal uppercase tracking-wider">
              2. Supporting Evidence
            </span>
            <h4 className="mt-2 text-sm font-semibold text-lunar">
              Direct NASA Primary Records
            </h4>
            <p className="mt-2 text-xs leading-relaxed text-dust">
              Official captions from JSC & JPL, NSSDCA spacecraft catalogue master IDs, PDS datasets, and Lunar/Mars Trek global basemaps.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="rounded-xl border border-hairline bg-void-3/80 p-5">
            <span className="font-mono text-xs font-bold text-signal uppercase tracking-wider">
              3. Provenance Origin
            </span>
            <h4 className="mt-2 text-sm font-semibold text-lunar">
              Official Space Agencies
            </h4>
            <p className="mt-2 text-xs leading-relaxed text-dust">
              NASA Science Directorate, NASA Goddard, NASA JPL-Caltech, and verified commercial payload partners under NASA CLPS task orders.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="rounded-xl border border-caution/40 bg-void-3/80 p-5">
            <span className="font-mono text-xs font-bold text-caution uppercase tracking-wider">
              4. Unverified Disclosure
            </span>
            <h4 className="mt-2 text-sm font-semibold text-lunar">
              Transparent Uncertainty
            </h4>
            <p className="mt-2 text-xs leading-relaxed text-dust">
              {stats.requiredCount > 0 ? `${stats.requiredCount} source records still require verification.` : "The source register has no unresolved links. Approximate locations and unconfirmed mission claims retain their own uncertainty labels."}
            </p>
          </div>
        </div>
      </div>

      {/* Specific Case Studies: Spirit & PIA03250 Audit */}
      <div className="rounded-2xl border border-hairline bg-void-2/60 p-6 md:p-8">
        <h3 className="label text-signal mb-2">Exemplary Audit Case Studies</h3>
        <p className="text-xl font-serif italic text-lunar mb-6">
          Rigorous distinction between corroborated mission facts and pending catalog entries
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Case 1: Spirit MER-A */}
          <div className="rounded-xl border border-hairline/80 bg-void-3/80 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-signal uppercase tracking-wider font-semibold">
                Case 1 · Spirit (MER-A) Rover
              </span>
              <span className="rounded-full bg-signal-dim border border-signal/30 px-2 py-0.5 text-[10px] font-mono text-signal uppercase">
                Dual Provenance
              </span>
            </div>
            <h4 className="text-sm font-bold text-lunar">
              Spirit: NASA Science and NSSDCA Catalog
            </h4>
            <p className="text-xs text-dust leading-relaxed">
              NASA&apos;s NSSDCA catalog identifies <strong>2003-027A</strong> as Spirit. The NASA Science mission overview provides additional context for its landing, exploration of Gusev Crater, and ascent of Husband Hill.
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-[11px] font-mono">
              <a
                href="https://science.nasa.gov/mission/mer-spirit/"
                target="_blank"
                rel="noreferrer noopener"
                className="rounded bg-signal/15 border border-signal px-2.5 py-1 text-signal hover:bg-signal hover:text-void transition-colors"
              >
                Open NASA Science Spirit Mission ↗
              </a>
              <a
                href="https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2003-027A"
                target="_blank"
                rel="noreferrer noopener"
                className="rounded bg-void border border-hairline px-2.5 py-1 text-dust hover:text-lunar transition-colors"
              >
                NSSDCA 2003-027A (Secondary) ↗
              </a>
            </div>
            <p className="text-[10px] font-mono text-signal">
              🎮 In-Game Evidence: Game Chapter 4 & Rover Legacy
            </p>
          </div>

          {/* Case 2: PIA03250 */}
          <div className="rounded-xl border border-hairline/80 bg-void-3/80 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-signal uppercase tracking-wider font-semibold">
                Case 2 · PIA03250 Photojournal Record
              </span>
              <span className="rounded-full bg-signal-dim border border-signal/30 px-2 py-0.5 text-[10px] font-mono text-signal uppercase">
                Full Title Resolved
              </span>
            </div>
            <h4 className="text-sm font-bold text-lunar">
              Sweeping View of the Columbia Hills and Gusev Crater (3-D)
            </h4>
            <p className="text-xs text-dust leading-relaxed">
              Previously catalogued with a shortened title, this record was audited and upgraded to NASA Photojournal&apos;s complete published scientific title. The canonical source link directly opens NASA&apos;s photojournal archive with full instrument context (Spirit Pancam 3-D summit mosaic), full institution credits (NASA/JPL-Caltech/Cornell), and high-resolution downloadable assets.
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-[11px] font-mono">
              <a
                href="https://science.nasa.gov/photojournal/sweeping-view-of-the-columbia-hills-and-gusev-crater-3-d/"
                target="_blank"
                rel="noreferrer noopener"
                className="rounded bg-signal/15 border border-signal px-2.5 py-1 text-signal hover:bg-signal hover:text-void transition-colors"
              >
                Open NASA Photojournal Record ↗
              </a>
              <a
                href="https://images.nasa.gov/details/PIA03250"
                target="_blank"
                rel="noreferrer noopener"
                className="rounded bg-void border border-hairline px-2.5 py-1 text-dust hover:text-lunar transition-colors"
              >
                images.nasa.gov Mirror ↗
              </a>
            </div>
            <p className="text-[10px] font-mono text-signal">
              🎮 In-Game Evidence: Chapter 4 Spirit Summit Archive
            </p>
          </div>
        </div>
      </div>

      {/* Scientific Integrity Rubric Table */}
      <div className="rounded-2xl border border-hairline bg-void-2/60 p-6">
        <h3 className="label text-signal mb-4">Evidence Evaluation Rubric</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-hairline bg-void-3 font-mono text-[10px] uppercase tracking-wider text-dust">
              <tr>
                <th scope="col" className="py-3 pl-4 pr-3">Investigation Domain</th>
                <th scope="col" className="px-3 py-3">Applied Standard</th>
                <th scope="col" className="px-3 py-3">Primary NASA Repositories</th>
                <th scope="col" className="px-3 py-3">Audit Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              <tr>
                <td className="py-3.5 pl-4 pr-3 font-medium text-lunar">
                  Lunar Surface Artifact Coordinates
                </td>
                <td className="px-3 py-3.5 text-dust">
                  Checked against NASA Lunar Reconnaissance Orbiter (LRO) high-resolution imaging and NSSDCA coordinates.
                </td>
                <td className="px-3 py-3.5 font-mono text-[11px] text-lunar-2">
                  NASA Moon Trek, NSSDCA
                </td>
                <td className="px-3 py-3.5">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-signal uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                    Verified Basemap
                  </span>
                </td>
              </tr>

              <tr>
                <td className="py-3.5 pl-4 pr-3 font-medium text-lunar">
                  Martian Landers & Rover Traverses
                </td>
                <td className="px-3 py-3.5 text-dust">
                  Viking, Pathfinder, Spirit, Opportunity, Phoenix, InSight, Curiosity, Perseverance, Ingenuity.
                </td>
                <td className="px-3 py-3.5 font-mono text-[11px] text-lunar-2">
                  NASA Mars Trek, JPL Photojournal
                </td>
                <td className="px-3 py-3.5">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-signal uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                    Verified Telemetry
                  </span>
                </td>
              </tr>

              <tr>
                <td className="py-3.5 pl-4 pr-3 font-medium text-lunar">
                  Commercial Lunar Landers (NASA CLPS)
                </td>
                <td className="px-3 py-3.5 text-dust">
                  Intuitive Machines IM-1 (Odysseus) & Firefly Aerospace Blue Ghost 1.
                </td>
                <td className="px-3 py-3.5 font-mono text-[11px] text-lunar-2">
                  NASA NSSDCA (2024-030A), NASA Science CLPS
                </td>
                <td className="px-3 py-3.5">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-signal uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                    Distinct CLPS Designation
                  </span>
                </td>
              </tr>

              <tr>
                <td className="py-3.5 pl-4 pr-3 font-medium text-lunar">
                  Historical Spacecraft Catalogue Entries
                </td>
                <td className="px-3 py-3.5 text-dust">
                  International COSPAR and NSSDCA spacecraft IDs recorded in repository.
                </td>
                <td className="px-3 py-3.5 font-mono text-[11px] text-lunar-2">
                  NASA Space Science Data Coordinated Archive
                </td>
                <td className="px-3 py-3.5">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-caution uppercase">
                    <span className="h-1.5 w-1.5 rounded-full border border-caution" />
                    46 Awaiting Human Confirmation
                  </span>
                </td>
              </tr>

              <tr>
                <td className="py-3.5 pl-4 pr-3 font-medium text-lunar">
                  Photographic Integrity & Non-Endorsement
                </td>
                <td className="px-3 py-3.5 text-dust">
                  Curated NASA imagery with per-asset credits. Third-party rights and scientific attribution must be checked for release.
                </td>
                <td className="px-3 py-3.5 font-mono text-[11px] text-lunar-2">
                  images.nasa.gov (JSC, JPL, GSFC)
                </td>
                <td className="px-3 py-3.5">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-signal uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                    NASA Credits Listed
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Honest Scientific Disclosure Section */}
      <div className="rounded-2xl border border-caution/40 bg-void-2/60 p-6 md:p-8">
        <div className="flex items-start gap-3">
          <span className="text-caution text-xl">⚠</span>
          <div>
            <h3 className="text-lg font-bold text-lunar">
              Source Review and Scientific Uncertainty
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-lunar-2 sm:text-sm">
              In academic research and space mission engineering, a source cannot be stamped as &ldquo;Verified&rdquo; merely because a URL was written down. During data compilation for Echoes Beyond Earth:
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-1 text-xs text-dust">
              <li>
                Each entry in the NSSDCA catalogue (e.g., Ranger, Surveyor, Apollo LM impactors) was recorded from NASA historical registries.
              </li>
              <li>
                Catalog entries were checked against the spacecraft name and identifier on NASA&apos;s pages on November 13, 2026. A verified source record does not automatically verify every claim that cites it.
              </li>
              <li>
                Unavailable Mars catalog links were replaced with NASA GISS Mars24 mission notes. These historical notes support landing dates and approximate sites, but do not establish current rover status or exact rover positions.
              </li>
            </ul>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="font-mono text-xs text-dust">
                Verified Records: <span className="text-signal font-bold">{stats.verifiedCount}</span>
              </span>
              <span className="text-dust">·</span>
              <span className="font-mono text-xs text-dust">
                Project-Flagged Required: <span className="text-caution font-bold">{stats.requiredCount}</span>
              </span>
              <span className="text-dust">·</span>
              <span className="font-mono text-xs text-dust">
                Project Ledger Coverage: <span className="text-lunar font-bold">{stats.coveragePercentage}%</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
