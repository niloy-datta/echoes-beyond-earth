"use client";

import type { EvidenceStats } from "./types";
import { VerificationBadge } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { formatDate, localizeDigits } from "@/lib/dates";

interface ScientificMetricsProps {
  stats: EvidenceStats;
}

export function ScientificMetrics({ stats }: ScientificMetricsProps) {
  const { t, lang } = useT();

  const verifiedNum = stats.verifiedCount;
  const requiredNum = stats.requiredCount;
  const totalNum = stats.totalReferences;
  const coverageNum = parseFloat(stats.coveragePercentage);

  return (
    <section aria-labelledby="scientific-overview-heading" className="border-b border-hairline py-10">
      <div className="container-x">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 id="scientific-overview-heading" className="label text-signal">
              Scientific Overview & Provenance Statistics
            </h2>
            <p className="mt-2 text-2xl font-serif italic text-lunar md:text-3xl">
              Transparent, data-derived evidence accounting
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-dust">
            <span>Archive compiled:</span>
            <span className="text-lunar-2">{formatDate(stats.compiledDate, lang)}</span>
          </div>
        </div>

        {/* 5 Key Metric Cards */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {/* 1. Total References */}
          <div className="rounded-xl border border-hairline bg-void-2/60 p-4 transition-colors hover:border-hairline-strong">
            <p className="label">Total References</p>
            <p className="mt-2 font-serif text-3xl italic text-lunar lg:text-4xl">
              {localizeDigits(totalNum, lang)}
            </p>
            <p className="mt-1 text-xs text-dust">Catalogued source entries</p>
          </div>

          {/* 2. Verified Primary Sources */}
          <div className="rounded-xl border border-signal/30 bg-void-2/60 p-4 transition-colors hover:border-signal/50">
            <div className="flex items-center justify-between">
              <p className="label text-signal">Verified</p>
              <span className="h-1.5 w-1.5 rounded-full bg-signal" />
            </div>
            <p className="mt-2 font-serif text-3xl italic text-signal lg:text-4xl">
              {localizeDigits(verifiedNum, lang)}
            </p>
            <p className="mt-1 text-xs text-dust">Sources marked verified in project ledger</p>
          </div>

          {/* 3. Verification Required */}
          <div className="rounded-xl border border-caution/30 bg-void-2/60 p-4 transition-colors hover:border-caution/50">
            <div className="flex items-center justify-between">
              <p className="label text-caution">Needs Verification</p>
              <span className="h-1.5 w-1.5 rounded-full border border-caution" />
            </div>
            <p className="mt-2 font-serif text-3xl italic text-caution lg:text-4xl">
              {localizeDigits(requiredNum, lang)}
            </p>
            <p className="mt-1 text-xs text-dust">Pending primary audit</p>
          </div>

          {/* 4. Curated NASA Imagery */}
          <div className="rounded-xl border border-hairline bg-void-2/60 p-4 transition-colors hover:border-hairline-strong">
            <p className="label">NASA Images</p>
            <p className="mt-2 font-serif text-3xl italic text-lunar lg:text-4xl">
              {localizeDigits(stats.imageCount, lang)}
            </p>
            <p className="mt-1 text-xs text-dust">JSC, JPL & GSFC plates</p>
          </div>

          {/* 5. Verification Coverage */}
          <div className="rounded-xl border border-hairline bg-void-2/60 p-4 transition-colors hover:border-hairline-strong">
            <p className="label">Verification Coverage</p>
            <p className="mt-2 font-serif text-3xl italic text-lunar lg:text-4xl">
              {stats.coveragePercentage}%
            </p>
            <p className="mt-1 text-xs text-dust">Share marked verified in project ledger</p>
          </div>
        </div>

        {/* Visual Verification Spectrum Bar */}
        <div className="mt-6 rounded-xl border border-hairline bg-void-2/40 p-4">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-signal">
              ● Project-Ledger Verified: {stats.coveragePercentage}% ({verifiedNum})
            </span>
            <span className="text-caution">
              ○ Flagged for Source Check: {(100 - coverageNum).toFixed(1)}% ({requiredNum})
            </span>
          </div>

          <div
            className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-void-3"
            role="progressbar"
            aria-label="Verification coverage progress"
            aria-valuenow={coverageNum}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="bg-signal transition-all duration-700"
              style={{ width: `${coverageNum}%` }}
            />
            <div
              className="bg-caution/60 transition-all duration-700"
              style={{ width: `${100 - coverageNum}%` }}
            />
          </div>
        </div>

        {/* Scientific Methodology Standard Rules */}
        <div className="mt-8 grid gap-4 rounded-xl border border-hairline/80 bg-void-3/50 p-6 md:grid-cols-3">
          <div className="border-b border-hairline/40 pb-4 md:border-b-0 md:border-r md:pr-6">
            <div className="flex items-center gap-2">
              <VerificationBadge status="verified" />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-lunar-2">
              Marked verified by project maintainers against linked sources; this status is not NASA certification or independent peer review.
            </p>
          </div>

          <div className="border-b border-hairline/40 pb-4 md:border-b-0 md:border-r md:pr-6">
            <div className="flex items-center gap-2">
              <VerificationBadge status="required" />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-lunar-2">
              Recorded in the catalog but the direct archive page could not be programmatically reached or audited during compilation. Transparently disclosed.
            </p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-dust">
              <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-dust" />
              <span>Zero-Hallucination Policy</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-lunar-2">
              Facts and reconstructions are labelled separately. Scientific accuracy and numerical claims still require independent human review.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
