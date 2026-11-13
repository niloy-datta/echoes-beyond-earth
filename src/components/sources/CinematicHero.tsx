"use client";

import type { ObservatoryViewMode, EvidenceStats } from "./types";
import { useT } from "@/lib/i18n";
import { localizeDigits } from "@/lib/dates";

interface CinematicHeroProps {
  activeView: ObservatoryViewMode;
  onViewChange: (view: ObservatoryViewMode) => void;
  stats: EvidenceStats;
}

export function CinematicHero({ activeView, onViewChange, stats }: CinematicHeroProps) {
  const { t, lang } = useT();

  const navItems: { id: ObservatoryViewMode; label: string; count?: string; hint: string }[] = [
    {
      id: "explorer",
      label: "Evidence Explorer",
      count: localizeDigits(stats.totalReferences, lang),
      hint: "Searchable primary citation index",
    },
    {
      id: "trace",
      label: "Mission Trace",
      count: "20",
      hint: "Mission ➔ Fact ➔ Citation",
    },
    {
      id: "judge",
      label: "Researcher / Judge View",
      count: "60s",
      hint: "Rapid verification audit",
    },
    {
      id: "gallery",
      label: "NASA Imagery",
      count: localizeDigits(stats.imageCount, lang),
      hint: "Curated archive plates & credits",
    },
  ];

  return (
    <header className="relative border-b border-hairline bg-gradient-to-b from-void via-void-2/60 to-void pt-[calc(var(--header-h)+clamp(1.5rem,5vw,4rem))] pb-10">
      {/* Background celestial grid & signal glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden opacity-30"
      >
        <div
          className="absolute -top-32 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full blur-[140px]"
          style={{
            background:
              "radial-gradient(circle, rgba(99,230,239,0.12) 0%, rgba(200,117,79,0.04) 50%, transparent 80%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ecebe6 1px, transparent 1px), linear-gradient(to bottom, #ecebe6 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <div className="container-x relative z-10">
        {/* Top breadcrumb / classification badge */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-signal/30 bg-signal-dim/50 px-3.5 py-1 text-[11px] font-mono uppercase tracking-[0.2em] text-signal">
            <span className="relative flex h-2 w-2">
              <span className="pulse-ring absolute inset-0 rounded-full bg-signal" />
              <span className="relative h-2 w-2 rounded-full bg-signal" />
            </span>
            <span>Exhibit 08 · Evidence Observatory</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-dust">
            <span>NASA Space Apps Verified Archive</span>
            <span aria-hidden className="text-hairline-strong">·</span>
            <span>Static Provenance Ledger</span>
          </div>
        </div>

        {/* Hero Title & Subtitle */}
        <div className="mt-8 max-w-4xl">
          <h1 className="font-display text-[clamp(2.6rem,7.5vw,5.5rem)] font-bold tracking-tight uppercase leading-[0.94] text-lunar">
            Evidence Observatory
          </h1>
          <p className="mt-5 font-serif text-[clamp(1.25rem,2.8vw,2.1rem)] italic leading-snug text-lunar-2">
            &ldquo;Every discovery has a story. Every story deserves evidence.&rdquo;
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-dust md:text-base">
            Every coordinate, arrival date, telemetry claim, and historic event across this museum links to official NASA primary archives. Unconfirmed records remain transparently flagged—nothing is assumed or generated.
          </p>
        </div>

        {/* Fast Jump / View Mode Navigation Tabs */}
        <div className="mt-12">
          <div
            role="tablist"
            aria-label="Evidence Observatory Views"
            className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3"
          >
            {navItems.map((item) => {
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  role="tab"
                  id={`tab-${item.id}`}
                  aria-selected={active}
                  aria-controls={`panel-${item.id}`}
                  onClick={() => onViewChange(item.id)}
                  type="button"
                  className={`group relative flex flex-col items-start justify-between rounded-xl border p-4 text-left transition-all duration-300 ${
                    active
                      ? "border-signal bg-void-3 text-lunar shadow-[0_0_24px_rgba(99,230,239,0.14)]"
                      : "border-hairline bg-void-2/60 text-lunar-2 hover:border-hairline-strong hover:bg-void-2"
                  }`}
                >
                  <div className="flex w-full items-baseline justify-between gap-2">
                    <span
                      className={`font-mono text-[10px] uppercase tracking-[0.16em] ${
                        active ? "text-signal" : "text-dust group-hover:text-lunar-2"
                      }`}
                    >
                      {item.hint}
                    </span>
                    {item.count && (
                      <span
                        className={`font-mono text-xs font-semibold ${
                          active ? "text-signal" : "text-dust"
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </div>

                  <span className="mt-3 text-sm font-medium tracking-tight sm:text-base">
                    {item.label}
                  </span>

                  {/* Active bottom cyan indicator bar */}
                  {active && (
                    <span
                      aria-hidden
                      className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-signal"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
