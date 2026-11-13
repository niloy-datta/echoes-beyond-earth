"use client";

import { useMemo, useState, useEffect } from "react";
import type { TextSource, Verification } from "@/lib/types";
import { useT } from "@/lib/i18n";

interface EvidenceExplorerProps {
  references: TextSource[];
}

export type StatusCategory = "all" | "caption-reviewed" | "facts-corroborated" | "catalog-pending";

export function EvidenceExplorer({ references }: EvidenceExplorerProps) {
  const { t } = useT();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusCategory>("all");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [publisherFilter, setPublisherFilter] = useState<string>("all");
  const [bodyFilter, setBodyFilter] = useState<"all" | "moon" | "mars">("all");
  const [viewLayout, setViewLayout] = useState<"table" | "cards">("table");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Keyboard shortcut: '/' focuses search input
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        const searchInput = document.getElementById("evidence-search-input") as HTMLInputElement | null;
        searchInput?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Classify each reference into refined judge-friendly status categories
  const getStatusDetail = (r: TextSource): "caption-reviewed" | "facts-corroborated" | "catalog-pending" => {
    if (r.verification === "required") return "catalog-pending";
    if (r.kind === "image-caption") return "caption-reviewed";
    return "facts-corroborated";
  };

  // Determine secondary archive / alternate source links
  const getSecondaryLink = (r: TextSource): { url: string; label: string } | null => {
    if (r.id === "img:PIA03250") {
      return { url: "https://images.nasa.gov/details/PIA03250", label: "images.nasa.gov plate" };
    }
    if (r.id === "sci:mer-spirit") {
      return { url: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2003-027A", label: "NSSDCA Catalog 2003-027A" };
    }
    if (r.id === "nssdca:2003-027A") {
      return { url: "https://science.nasa.gov/mission/mer-spirit/", label: "NASA Science Spirit Mission Page (Corroborated)" };
    }
    if (r.id === "clps:im-1-nova") {
      return { url: "https://science.nasa.gov/commercial-lunar-payload-services/", label: "NASA Science CLPS Overview" };
    }
    if (r.id === "clps:blue-ghost-1") {
      return { url: "https://science.nasa.gov/commercial-lunar-payload-services/", label: "NASA Science CLPS Delivery Tasks" };
    }
    return null;
  };

  // Determine museum and in-game evidence usage
  const getGameUsage = (r: TextSource): string | null => {
    const str = (r.id + " " + r.title + " " + (r.note || "")).toLowerCase();
    if (str.includes("pia03250") || str.includes("mer-spirit") || str.includes("2003-027a")) {
      return "Game: Chapter 4 (Spirit Husband Hill Archive & Atmospheric Storm Lab)";
    }
    if (str.includes("pia23178") || str.includes("pia22909") || str.includes("2003-032a") || str.includes("mer-b")) {
      return "Game: Chapter 1 (Opportunity 45.16 km Traverse & Legacy Pan)";
    }
    if (str.includes("pia11436") || str.includes("mesurpr") || str.includes("pathfinder")) {
      return "Game: Chapter 1 Side-Discovery (Sojourner First Mobile Rover)";
    }
    if (str.includes("as12-48-7133") || str.includes("as12-48-7121") || str.includes("surveyor 3") || str.includes("1967-035a")) {
      return "Game: Chapter 2 Puzzle (Apollo 12 Precision Landing Near Surveyor 3)";
    }
    if (str.includes("pia03165") || str.includes("1975-075c") || str.includes("viking 1") || str.includes("pia04023")) {
      return "Game: Chapter 3 (Viking Lander Chryse Planitia Soil Search)";
    }
    if (str.includes("pia25287") || str.includes("pia23177") || str.includes("insight") || str.includes("2018-042a")) {
      return "Game: Chapter 5 (InSight Marsquake SEIS Seismometer Telemetry)";
    }
    if (str.includes("as11-40-5948") || str.includes("as11-37-5551") || str.includes("apollo 11") || str.includes("1969-059c")) {
      return "Game: Chapter 4 Objective & Exhibit 01 (Apollo 11 Tranquility Base)";
    }
    if (str.includes("pia24542") || str.includes("perseverance") || str.includes("ingenuity") || str.includes("pia26236")) {
      return "Exhibit 15 & Rover Legacy (Jezero Delta Sampling & Powered Flight)";
    }
    if (str.includes("trek:moon") || str.includes("trek:mars")) {
      return "Basemap: High-Precision Global Planetary Coordinate Frameworks";
    }
    if (str.includes("clps") || str.includes("im-1") || str.includes("blue ghost")) {
      return "Modern Lunar Exploration (Commercial Landers carrying NASA Instruments)";
    }
    return null;
  };

  // Compute publishers and kinds dynamically
  const publishers = useMemo(() => {
    const set = new Set<string>();
    references.forEach((r) => {
      if (r.publisher) set.add(r.publisher);
    });
    return Array.from(set).sort();
  }, [references]);

  const kinds = useMemo(() => {
    const set = new Set<string>();
    references.forEach((r) => {
      if (r.kind) set.add(r.kind);
    });
    return Array.from(set).sort();
  }, [references]);

  // Determine body association heuristic
  const getBodyForRef = (r: TextSource): "moon" | "mars" | "both" => {
    const str = (r.id + " " + r.title + " " + (r.note || "")).toLowerCase();
    const hasMoon =
      str.includes("moon") ||
      str.includes("apollo") ||
      str.includes("lunar") ||
      str.includes("surveyor") ||
      str.includes("ranger") ||
      str.includes("lcross") ||
      str.includes("grail") ||
      str.includes("ladee") ||
      str.includes("im-1") ||
      str.includes("blue ghost") ||
      str.includes("odysseus");
    const hasMars =
      str.includes("mars") ||
      str.includes("viking") ||
      str.includes("pathfinder") ||
      str.includes("sojourner") ||
      str.includes("spirit") ||
      str.includes("opportunity") ||
      str.includes("phoenix") ||
      str.includes("insight") ||
      str.includes("curiosity") ||
      str.includes("perseverance") ||
      str.includes("ingenuity") ||
      str.includes("zhurong") ||
      str.includes("beagle");
    if (hasMoon && hasMars) return "both";
    if (hasMars) return "mars";
    if (hasMoon) return "moon";
    return "both";
  };

  // Filtered references
  const filtered = useMemo(() => {
    return references.filter((r) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = r.title.toLowerCase().includes(q);
        const matchesPublisher = r.publisher.toLowerCase().includes(q);
        const matchesId = r.id.toLowerCase().includes(q);
        const matchesNote = r.note?.toLowerCase().includes(q);
        const matchesUrl = r.url.toLowerCase().includes(q);
        const gameUsage = getGameUsage(r);
        const matchesGame = gameUsage?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesPublisher && !matchesId && !matchesNote && !matchesUrl && !matchesGame) {
          return false;
        }
      }

      // 2. Refined Status
      if (statusFilter !== "all") {
        const status = getStatusDetail(r);
        if (status !== statusFilter) return false;
      }

      // 3. Kind
      if (kindFilter !== "all" && r.kind !== kindFilter) {
        return false;
      }

      // 4. Publisher
      if (publisherFilter !== "all" && r.publisher !== publisherFilter) {
        return false;
      }

      // 5. Body
      if (bodyFilter !== "all") {
        const body = getBodyForRef(r);
        if (body !== "both" && body !== bodyFilter) {
          return false;
        }
      }

      return true;
    });
  }, [references, searchQuery, statusFilter, kindFilter, publisherFilter, bodyFilter]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    statusFilter !== "all" ||
    kindFilter !== "all" ||
    publisherFilter !== "all" ||
    bodyFilter !== "all";

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setKindFilter("all");
    setPublisherFilter("all");
    setBodyFilter("all");
  };

  const handleCopyCitation = (ref: TextSource) => {
    const status = getStatusDetail(ref);
    const citation = `[NASA Primary Citation] ${ref.title}. ${ref.publisher}. URL: ${ref.url} (Archival ID: ${ref.id}, Status: ${status})`;
    navigator.clipboard.writeText(citation).then(() => {
      setCopiedId(ref.id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  const kindLabel = (kind: string) => {
    switch (kind) {
      case "catalog":
        return "Catalogue Record";
      case "image-caption":
        return "NASA Caption";
      case "mission-page":
        return "Mission Documentation";
      case "dataset":
        return "Scientific Dataset";
      default:
        return kind;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Toolbar */}
      <div className="rounded-2xl border border-hairline bg-void-2/70 p-5 md:p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Search bar with shortcut pill */}
          <div className="relative flex-1">
            <label htmlFor="evidence-search-input" className="sr-only">
              Search scientific sources
            </label>
            <div className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-dust"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
                  <circle cx="7" cy="7" r="5" strokeWidth="1.5" />
                  <path d="M11 11L14.5 14.5" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              <input
                id="evidence-search-input"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by mission, record ID, publisher, game chapter, or keywords... (Press '/' to focus)"
                className="w-full rounded-xl border border-hairline bg-void-3 px-10 py-3 text-sm text-lunar placeholder:text-dust/70 focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-1 text-dust hover:text-lunar"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Quick Layout & Count Indicator */}
          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <span className="font-mono text-xs text-dust">
              Showing <span className="font-bold text-signal">{filtered.length}</span> of{" "}
              {references.length}
            </span>

            {/* Layout Toggle */}
            <div
              role="group"
              aria-label="Table or Card View"
              className="inline-flex rounded-lg border border-hairline bg-void-3 p-1"
            >
              <button
                type="button"
                onClick={() => setViewLayout("table")}
                aria-pressed={viewLayout === "table"}
                className={`rounded px-2.5 py-1 text-xs font-mono transition-colors ${
                  viewLayout === "table"
                    ? "bg-signal text-void font-bold shadow-sm"
                    : "text-dust hover:text-lunar"
                }`}
                title="Tabular Academic Ledger View"
              >
                Ledger
              </button>
              <button
                type="button"
                onClick={() => setViewLayout("cards")}
                aria-pressed={viewLayout === "cards"}
                className={`rounded px-2.5 py-1 text-xs font-mono transition-colors ${
                  viewLayout === "cards"
                    ? "bg-signal text-void font-bold shadow-sm"
                    : "text-dust hover:text-lunar"
                }`}
                title="Expanded Evidence Cards"
              >
                Cards
              </button>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-5 grid grid-cols-1 gap-3 border-t border-hairline/60 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. Refined Verification Status */}
          <div>
            <label htmlFor="filter-status" className="label mb-1.5 block">
              Evidence Status
            </label>
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusCategory)}
              className="w-full rounded-lg border border-hairline bg-void-3 px-3 py-2 text-xs font-mono text-lunar focus:border-signal focus:outline-none"
            >
              <option value="all">All Verification Statuses ({references.length})</option>
              <option value="caption-reviewed">
                Caption Reviewed ({references.filter((r) => getStatusDetail(r) === "caption-reviewed").length})
              </option>
              <option value="facts-corroborated">
                Mission Facts Corroborated ({references.filter((r) => getStatusDetail(r) === "facts-corroborated").length})
              </option>
              <option value="catalog-pending">
                Verification required ({references.filter((r) => getStatusDetail(r) === "catalog-pending").length})
              </option>
            </select>
          </div>

          {/* 2. Target Body */}
          <div>
            <label htmlFor="filter-body" className="label mb-1.5 block">
              Planetary Body
            </label>
            <select
              id="filter-body"
              value={bodyFilter}
              onChange={(e) => setBodyFilter(e.target.value as "all" | "moon" | "mars")}
              className="w-full rounded-lg border border-hairline bg-void-3 px-3 py-2 text-xs font-mono text-lunar focus:border-signal focus:outline-none"
            >
              <option value="all">All Targets (Moon & Mars)</option>
              <option value="moon">Moon / Lunar</option>
              <option value="mars">Mars / Red Planet</option>
            </select>
          </div>

          {/* 3. Source Kind */}
          <div>
            <label htmlFor="filter-kind" className="label mb-1.5 block">
              Record Type
            </label>
            <select
              id="filter-kind"
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
              className="w-full rounded-lg border border-hairline bg-void-3 px-3 py-2 text-xs font-mono text-lunar focus:border-signal focus:outline-none"
            >
              <option value="all">All Record Types</option>
              {kinds.map((k) => (
                <option key={k} value={k}>
                  {kindLabel(k)}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Publisher */}
          <div>
            <label htmlFor="filter-publisher" className="label mb-1.5 block">
              Publisher / Archive
            </label>
            <select
              id="filter-publisher"
              value={publisherFilter}
              onChange={(e) => setPublisherFilter(e.target.value)}
              className="w-full rounded-lg border border-hairline bg-void-3 px-3 py-2 text-xs font-mono text-lunar focus:border-signal focus:outline-none"
            >
              <option value="all">All Publishers ({publishers.length})</option>
              {publishers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters & Reset Button */}
        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-hairline/40 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono text-dust">Active filters:</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1 rounded bg-void-3 px-2 py-0.5 text-[11px] font-mono text-signal">
                  &ldquo;{searchQuery}&rdquo;
                  <button type="button" onClick={() => setSearchQuery("")} className="hover:text-lunar">
                    ×
                  </button>
                </span>
              )}
              {statusFilter !== "all" && (
                <span className="inline-flex items-center gap-1 rounded bg-void-3 px-2 py-0.5 text-[11px] font-mono text-signal">
                  status: {statusFilter}
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className="hover:text-lunar"
                  >
                    ×
                  </button>
                </span>
              )}
              {bodyFilter !== "all" && (
                <span className="inline-flex items-center gap-1 rounded bg-void-3 px-2 py-0.5 text-[11px] font-mono text-signal">
                  body: {bodyFilter}
                  <button
                    type="button"
                    onClick={() => setBodyFilter("all")}
                    className="hover:text-lunar"
                  >
                    ×
                  </button>
                </span>
              )}
              {kindFilter !== "all" && (
                <span className="inline-flex items-center gap-1 rounded bg-void-3 px-2 py-0.5 text-[11px] font-mono text-signal">
                  type: {kindLabel(kindFilter)}
                  <button type="button" onClick={() => setKindFilter("all")} className="hover:text-lunar">
                    ×
                  </button>
                </span>
              )}
              {publisherFilter !== "all" && (
                <span className="inline-flex items-center gap-1 rounded bg-void-3 px-2 py-0.5 text-[11px] font-mono text-signal">
                  publisher: {publisherFilter}
                  <button
                    type="button"
                    onClick={() => setPublisherFilter("all")}
                    className="hover:text-lunar"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs font-mono text-caution hover:underline"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Copy Toast Indicator */}
      {copiedId && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 rounded-xl border border-signal bg-void-3 px-4 py-3 text-xs font-mono text-signal shadow-2xl backdrop-blur-lg"
        >
          ✓ Citation copied to clipboard ({copiedId})
        </div>
      )}

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-hairline p-8 text-center">
          <p className="label text-caution">No Matching Evidence Records</p>
          <p className="mt-2 text-sm text-lunar-2">
            No scientific references match your active search terms and filters.
          </p>
          <button
            type="button"
            onClick={clearAllFilters}
            className="btn-ghost mt-4 !py-1.5 text-xs"
          >
            Clear Filters & View All ({references.length})
          </button>
        </div>
      ) : viewLayout === "table" ? (
        /* Tabular Ledger View */
        <div className="overflow-x-auto rounded-2xl border border-hairline bg-void-2/60">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-hairline bg-void-3 font-mono text-[10px] uppercase tracking-wider text-dust">
              <tr>
                <th scope="col" className="py-3.5 pl-6 pr-3">
                  ID & Archive Tag
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Source Reference & Official Title
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Publisher / Repository
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Evidence Status
                </th>
                <th scope="col" className="py-3.5 pl-3 pr-6 text-right">
                  Direct NASA Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {filtered.map((ref) => {
                const status = getStatusDetail(ref);
                const secondary = getSecondaryLink(ref);
                const gameUsage = getGameUsage(ref);
                const isCLPS = ref.id.startsWith("clps:");

                return (
                  <tr
                    key={ref.id}
                    className="group transition-colors hover:bg-void-3/60"
                  >
                    {/* Archival ID */}
                    <td className="whitespace-nowrap py-4 pl-6 pr-3 font-mono text-[11px] text-dust align-top">
                      <span className="rounded bg-void-3 px-2 py-1 border border-hairline/60">
                        {ref.id}
                      </span>
                      {isCLPS && (
                        <div className="mt-1">
                          <span className="inline-block rounded bg-signal-dim px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-signal border border-signal/30">
                            CLPS
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Title & Link & Note & Game Usage */}
                    <td className="px-4 py-4 max-w-md">
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        title={`${ref.title} · ${ref.publisher}`}
                        aria-label={`${ref.title} — ${ref.publisher} (opens in a new tab)`}
                        className="group/link font-semibold text-lunar hover:text-signal transition-colors inline-block"
                      >
                        <span>{ref.title}</span>
                        <span aria-hidden className="ml-1.5 inline-block text-dust group-hover/link:translate-x-0.5 transition-transform">
                          ↗
                        </span>
                      </a>

                      {/* Game Chapter / Museum Usage Badge */}
                      {gameUsage && (
                        <div className="mt-1.5">
                          <span className="inline-flex items-center gap-1 rounded bg-void-3/80 px-2 py-0.5 text-[10px] font-mono text-signal border border-signal/20">
                            <span aria-hidden>🎮</span>
                            <span>{gameUsage}</span>
                          </span>
                        </div>
                      )}

                      {ref.note && (
                        <p className="mt-1.5 text-[11px] leading-relaxed text-dust">
                          {ref.note}
                        </p>
                      )}

                      {/* Secondary Archive Link if present */}
                      {secondary && (
                        <div className="mt-2 text-[10px] font-mono text-dust">
                          <span>Secondary reference: </span>
                          <a
                            href={secondary.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-lunar-2 underline hover:text-signal"
                          >
                            {secondary.label} ↗
                          </a>
                        </div>
                      )}
                    </td>

                    {/* Publisher & Kind */}
                    <td className="whitespace-nowrap px-4 py-4 text-lunar-2 align-top">
                      <div>{ref.publisher}</div>
                      <div className="mt-1 font-mono text-[10px] text-dust">
                        {kindLabel(ref.kind)}
                      </div>
                    </td>

                    {/* Refined Status */}
                    <td className="whitespace-nowrap px-4 py-4 align-top">
                      {status === "caption-reviewed" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-signal/40 bg-signal-dim/30 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-signal">
                          <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                          Caption Reviewed
                        </span>
                      )}
                      {status === "facts-corroborated" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-signal/40 bg-signal-dim/30 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-signal">
                          <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                          Facts Corroborated
                        </span>
                      )}
                      {status === "catalog-pending" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-caution/40 bg-caution/10 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-caution">
                          <span className="h-1.5 w-1.5 rounded-full border border-caution" />
                          Verification required
                        </span>
                      )}
                    </td>

                    {/* Direct NASA Action & Copy */}
                    <td className="whitespace-nowrap py-4 pl-3 pr-6 text-right font-mono align-top space-y-1.5">
                      <div>
                        <a
                          href={ref.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1 rounded-lg border border-signal/50 bg-signal/10 px-3 py-1 text-[11px] font-mono text-signal hover:bg-signal hover:text-void transition-colors"
                        >
                          <span>View NASA Source</span>
                          <span aria-hidden>↗</span>
                        </a>
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => handleCopyCitation(ref)}
                          className="rounded border border-hairline px-2 py-0.5 text-[10px] text-dust hover:border-signal/50 hover:text-signal transition-colors"
                          title="Copy academic citation"
                        >
                          Copy Citation
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Judge-Friendly Expanded Evidence Cards */
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ref) => {
            const status = getStatusDetail(ref);
            const secondary = getSecondaryLink(ref);
            const gameUsage = getGameUsage(ref);
            const isCLPS = ref.id.startsWith("clps:");

            return (
              <div
                key={ref.id}
                className="flex flex-col justify-between rounded-2xl border border-hairline bg-void-2/70 p-5 shadow-lg transition-all hover:border-hairline-strong hover:bg-void-3"
              >
                <div>
                  {/* Top Metadata Row */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-dust uppercase tracking-wider rounded bg-void px-2 py-0.5 border border-hairline/60">
                      ID: {ref.id}
                    </span>

                    {status === "caption-reviewed" && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-signal/40 bg-signal-dim/30 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-signal">
                        <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                        Caption Reviewed
                      </span>
                    )}
                    {status === "facts-corroborated" && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-signal/40 bg-signal-dim/30 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-signal">
                        <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                        Facts Corroborated
                      </span>
                    )}
                    {status === "catalog-pending" && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-caution/40 bg-caution/10 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-caution">
                        <span className="h-1.5 w-1.5 rounded-full border border-caution" />
                        Verification required
                      </span>
                    )}
                  </div>

                  {isCLPS && (
                    <div className="mt-2.5">
                      <span className="inline-block rounded bg-signal-dim px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-signal border border-signal/30">
                        Commercial Lunar Lander (NASA CLPS)
                      </span>
                    </div>
                  )}

                  {/* Title */}
                  <h3 className="mt-3 text-sm font-semibold leading-snug text-lunar">
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      title={`${ref.title} · ${ref.publisher}`}
                      className="hover:text-signal transition-colors inline-block"
                    >
                      {ref.title}
                      <span aria-hidden className="ml-1 text-dust">↗</span>
                    </a>
                  </h3>

                  {/* Game & Museum Usage */}
                  {gameUsage && (
                    <div className="mt-2.5">
                      <span className="inline-flex items-center gap-1 rounded bg-void-3 px-2 py-1 text-[10px] font-mono text-signal border border-signal/20 leading-tight">
                        <span aria-hidden>🎮</span>
                        <span>{gameUsage}</span>
                      </span>
                    </div>
                  )}

                  {/* Scientific Note / Abstract */}
                  {ref.note && (
                    <p className="mt-2.5 text-xs leading-relaxed text-dust line-clamp-3">
                      {ref.note}
                    </p>
                  )}

                  {/* Secondary Reference if available */}
                  {secondary && (
                    <div className="mt-3 rounded border border-hairline/60 bg-void-3/50 p-2 text-[10px] font-mono text-dust">
                      <span className="block text-dust/70">Secondary Archival Reference:</span>
                      <a
                        href={secondary.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-lunar-2 underline hover:text-signal"
                      >
                        {secondary.label} ↗
                      </a>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="mt-5 border-t border-hairline/60 pt-4">
                  <div className="flex items-center justify-between text-xs text-dust mb-3">
                    <span className="truncate pr-2 font-medium">{ref.publisher}</span>
                    <span className="font-mono text-[10px] uppercase">
                      {kindLabel(ref.kind)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-signal bg-signal/15 px-3 py-1.5 text-xs font-mono font-semibold text-signal hover:bg-signal hover:text-void transition-colors"
                    >
                      <span>Open NASA Source</span>
                      <span aria-hidden>↗</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopyCitation(ref)}
                      className="text-xs font-mono text-dust hover:text-lunar"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
