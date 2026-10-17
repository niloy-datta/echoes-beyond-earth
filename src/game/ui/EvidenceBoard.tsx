"use client";

import { useMemo, useState } from "react";
import { EVIDENCE, EVIDENCE_BY_ID, type Evidence, type EvidenceCategory } from "../content/evidence";
import { evidenceOf } from "../core/progress";
import type { GameSession } from "../core/session";
import { assetPath } from "@/lib/asset-path";
import { Modal } from "./Modal";
import { S } from "./strings";

type Lang = "en" | "bn";

const CATEGORIES: readonly { id: "all" | EvidenceCategory; label: { en: string; bn: string } }[] = [
  { id: "all", label: S.categoryAll },
  { id: "locomotion", label: S.categoryLocomotion },
  { id: "power", label: S.categoryPower },
  { id: "imaging", label: S.categoryImaging },
  { id: "telemetry", label: S.categoryTelemetry },
];

export function EvidenceBoard({
  session,
  lang,
  onClose,
}: {
  session: GameSession;
  lang: Lang;
  onClose: () => void;
}) {
  const owned = evidenceOf(session.progress);
  const [filter, setFilter] = useState<"all" | EvidenceCategory>("all");
  const [selectedId, setSelectedId] = useState<string | null>(owned[0] ?? null);
  const [viewMode, setViewMode] = useState<"board" | "compare">("board");
  const [compareSlider, setCompareSlider] = useState(50);

  const selectedEvidence = selectedId ? EVIDENCE_BY_ID.get(selectedId) ?? null : null;

  const filteredItems = useMemo(() => {
    return filter === "all" ? EVIDENCE : EVIDENCE.filter((e) => e.category === filter);
  }, [filter]);

  // Optical comparison frames (PIA22909 Legacy Pan vs PIA22929 Last Transmitted Frame)
  const compareBefore = {
    src: "/images/nasa/pia22909.jpg",
    label: { en: "Legacy Pan Composite (PIA22909)", bn: "লেগ্যাসি প্যান মোজাইক (PIA22909)" },
    date: "2018-05-13 to 2018-06-10 (Sols 5084–5111)",
    tau: "Estimated ~0.6–0.9",
    pia: "PIA22909 (354-frame mosaic)",
  };
  const compareAfter = {
    src: "/images/nasa/pia22929.jpg",
    label: { en: "Opportunity's Last Message (PIA22929)", bn: "অপরচুনিটির শেষ বার্তা (PIA22929)" },
    date: "2018-06-10 (Sol 5111)",
    tau: "Estimated ~10.8",
    pia: "PIA22929 (Partial transmission)",
  };


  return (
    <Modal label={S.evidenceBoard[lang]} onClose={onClose} wide className="ll-board-modal">
      <header className="ll-panel__head ll-board__header">
        <div>
          <div className="flex items-center gap-2">
            <span className="ll-kicker ll-kicker--signal font-mono uppercase tracking-wider">
              ✦ NASA Investigation
            </span>
            <span className="text-xs text-dust font-mono">
              [{owned.length} / {EVIDENCE.length} {lang === "bn" ? "উদ্ধার" : "Recovered"}]
            </span>
          </div>
          <h2 className="text-xl font-bold text-bone">{S.evidenceBoard[lang]}</h2>
          <p className="ll-muted text-xs">{S.boardSubtitle[lang]}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="ll-board-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "board"}
              className={`ll-board-tab ${viewMode === "board" ? "is-active" : ""}`}
              onClick={() => setViewMode("board")}
            >
              📋 {lang === "bn" ? "পিনবোর্ড" : "Pinboard"}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "compare"}
              className={`ll-board-tab ${viewMode === "compare" ? "is-active" : ""}`}
              onClick={() => setViewMode("compare")}
            >
              🔬 {S.compareFrames[lang]}
            </button>
          </div>
          <button type="button" className="ll-btn" onClick={onClose}>
            {S.close[lang]} <kbd>Esc</kbd>
          </button>
        </div>
      </header>

      {viewMode === "compare" ? (
        <section className="ll-board-compare-panel" aria-label={S.compareFrames[lang]}>
          <div className="ll-compare-viewer">
            <div className="ll-compare-container">
              <div className="ll-compare-layer ll-compare-layer--after">
                <img src={assetPath(compareAfter.src)} alt={compareAfter.label[lang]} />
                <div className="ll-compare-badge ll-compare-badge--right">
                  <strong>{compareAfter.label[lang]}</strong>
                  <small>{compareAfter.date} · Tau: {compareAfter.tau} ({compareAfter.pia})</small>
                </div>
              </div>
              <div
                className="ll-compare-layer ll-compare-layer--before"
                style={{ clipPath: `inset(0 ${100 - compareSlider}% 0 0)` }}
              >
                <img src={assetPath(compareBefore.src)} alt={compareBefore.label[lang]} />
                <div className="ll-compare-badge ll-compare-badge--left">
                  <strong>{compareBefore.label[lang]}</strong>
                  <small>{compareBefore.date} · Tau: {compareBefore.tau} ({compareBefore.pia})</small>
                </div>
              </div>
              <div className="ll-compare-divider" style={{ left: `${compareSlider}%` }}>
                <span className="ll-compare-handle">↔</span>
              </div>
            </div>

            <label className="ll-range">
              <span>{S.sliderInstruction[lang]}: {compareSlider}%</span>
              <input
                type="range"
                min={0}
                max={100}
                value={compareSlider}
                data-autofocus
                onChange={(e) => setCompareSlider(Number(e.target.value))}
              />
            </label>

            <div className="ll-compare-metrics-grid">
              <div className="ll-metric-card">
                <span className="ll-metric-label">{lang === "bn" ? "লেগ্যাসি প্যান মোজাইক (PIA22909)" : "Legacy Pan Composite (PIA22909)"}</span>
                <span className="ll-metric-val font-mono text-signal">Estimated Tau ~0.6–0.9</span>
                <p className="text-xs ll-muted">
                  {lang === "bn"
                    ? "পারসিভিয়ারেন্স ভ্যালিতে একাধিক সলে (৫০৮৪–৫১১১) প্যানক্যামের ৩৫৪টি ফ্রেম একত্র করে প্রস্তুত মোজাইক।"
                    : "Composite of 354 individual Pancam frames acquired across multiple sols (5084–5111) overlooking Endeavour Crater."}
                </p>
              </div>
              <div className="ll-metric-card">
                <span className="ll-metric-label">{lang === "bn" ? "শেষ পাঠানো ট্রান্সমিশন ও শেষ ধারণকৃত ফ্রেম (PIA22929 / PIA22930)" : "Last Transmitted Frame & Last Captured Frame (PIA22929 / PIA22930)"}</span>
                <span className="ll-metric-val font-mono text-caution">Estimated Tau ≈ 10.8</span>
                <div className="flex items-center gap-3 mt-2">
                  <img src={assetPath("/images/nasa/pia22930.jpg")} alt="PIA22930 last captured frame" className="w-12 h-12 object-contain border border-dust/30 rounded bg-black flex-shrink-0" />
                  <p className="text-xs ll-muted m-0">
                    {lang === "bn"
                      ? "PIA22929 ছিল শেষ প্রেরিত অসম্পূর্ণ ফ্রেম (সংযোগ বিচ্ছিন্ন হওয়ায় নিচের সারি কাটা পড়ে)। ৩ মিনিট পরের থাম্বনেইল (PIA22930) ছিল অপরচুনিটির শেষ ধারণকৃত ফ্রেম।"
                      : "PIA22929 was the last transmitted partial frame (interrupted by loss of signal). Thumbnails captured 3 min later (PIA22930) were Opportunity's final captured frames."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div className="ll-board-body">
          {/* Domain Filter Pills */}
          <div className="ll-board-filters" role="radiogroup" aria-label={S.filterBy[lang]}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                role="radio"
                aria-checked={filter === cat.id}
                className={`ll-board-pill ${filter === cat.id ? "is-selected" : ""}`}
                onClick={() => setFilter(cat.id)}
              >
                {cat.label[lang]}
              </button>
            ))}
          </div>

          <div className="ll-board-layout">
            {/* Investigative Pinboard Canvas */}
            <div className="ll-board-pinboard" role="region" aria-label="Investigation Pinboard">
              <div className="ll-board-grid">
                {filteredItems.map((item) => {
                  const has = owned.includes(item.id);
                  const isSelected = selectedId === item.id;
                  const isConnected = selectedEvidence?.connections.includes(item.id);

                  return (
                    <article
                      key={item.id}
                      className={`ll-pin-card ${has ? "is-unlocked" : "is-locked"} ${
                        isSelected ? "is-selected" : ""
                      } ${isConnected ? "is-connected" : ""}`}
                      onClick={() => has && setSelectedId(item.id)}
                      onKeyDown={(e) => {
                        if (has && (e.key === " " || e.key === "Enter")) setSelectedId(item.id);
                      }}
                      tabIndex={has ? 0 : -1}
                      role="button"
                      aria-pressed={isSelected}
                    >
                      <div className="ll-pin-head">
                        <span className="ll-pin-tack" aria-hidden />
                        <span className="ll-pin-category font-mono text-xs">{item.category}</span>
                        {item.piaId && (
                          <span className="ll-pin-pia font-mono text-xs text-signal">
                            {item.piaId}
                          </span>
                        )}
                      </div>

                      {has && item.image ? (
                        <div className="ll-pin-thumb">
                          <img
                            src={assetPath(item.image.src.replace(".jpg", "-thumb.jpg"))}
                            alt=""
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="ll-pin-placeholder" aria-hidden>
                          {has ? "✦" : "🔒"}
                        </div>
                      )}

                      <div className="ll-pin-content">
                        <h4>{has ? item.title[lang] : S.locked[lang]}</h4>
                        {has ? (
                          <>
                            <span className="ll-pin-badge">{item.tag[lang]}</span>
                            {item.when && <small className="ll-muted block mt-1">{item.when}</small>}
                          </>
                        ) : (
                          <small className="ll-muted block">
                            {lang === "bn" ? "বিকন স্ক্যান করে উদ্ধার করো" : "Scan beacon to recover"}
                          </small>
                        )}
                      </div>

                      {has && item.connections.length > 0 && (
                        <div className="ll-pin-links">
                          <small className="text-xs text-dust">
                            🔗 {item.connections.length} {lang === "bn" ? "সংযোগ" : "links"}
                          </small>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>

            {/* Evidence Inspector Detail */}
            <aside className="ll-board-detail">
              {selectedEvidence && owned.includes(selectedEvidence.id) ? (
                <article className="ll-board-inspect">
                  {selectedEvidence.image && (
                    <figure className="ll-inspect-fig">
                      <img
                        src={assetPath(selectedEvidence.image.src)}
                        alt={selectedEvidence.image.alt[lang]}
                      />
                      <figcaption className="text-xs ll-muted">
                        {selectedEvidence.image.credit}
                      </figcaption>
                    </figure>
                  )}

                  <div className="ll-inspect-meta">
                    <span className="ll-kicker font-mono text-signal">
                      {selectedEvidence.piaId ?? "NASA MER Record"}
                      {selectedEvidence.when ? ` · ${selectedEvidence.when}` : ""}
                    </span>
                    <h3 className="text-lg font-bold mt-1">{selectedEvidence.title[lang]}</h3>
                    <span className="ll-pin-badge inline-block mt-1">
                      {selectedEvidence.tag[lang]}
                    </span>
                  </div>

                  <p className="ll-inspect-fact mt-3 text-sm leading-relaxed text-bone">
                    {selectedEvidence.fact[lang]}
                  </p>

                  {/* Connected records quick navigation */}
                  {selectedEvidence.connections.length > 0 && (
                    <div className="ll-inspect-connections mt-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-dust mb-2">
                        {S.connectedEvidence[lang]}
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedEvidence.connections.map((cId) => {
                          const cItem = EVIDENCE_BY_ID.get(cId);
                          if (!cItem) return null;
                          const hasConn = owned.includes(cId);
                          return (
                            <button
                              key={cId}
                              type="button"
                              disabled={!hasConn}
                              className={`ll-conn-chip ${hasConn ? "is-available" : "is-locked"}`}
                              onClick={() => setSelectedId(cId)}
                            >
                              <span>{hasConn ? "✦" : "🔒"}</span>
                              <span>{hasConn ? cItem.title[lang] : S.locked[lang]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-dust/20">
                    <a
                      href={selectedEvidence.source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-signal hover:underline inline-flex items-center gap-1"
                    >
                      {S.readSource[lang]}: {selectedEvidence.source.label} ↗
                    </a>
                  </div>
                </article>
              ) : (
                <div className="ll-board-empty">
                  <p className="ll-muted text-sm">
                    {lang === "bn"
                      ? "বিস্তারিত ও সংযোগ দেখতে বামপাশের কোনো প্রমাণ কার্ডে ক্লিক করুন।"
                      : "Click any recovered evidence card to inspect verified telemetry and connections."}
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      )}
    </Modal>
  );
}
