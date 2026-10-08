"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ACHIEVEMENTS, CHAPTERS, SIDE_DISCOVERIES } from "../content/chapters";
import { EVIDENCE, EVIDENCE_BY_ID, type Evidence } from "../content/evidence";
import { POIS } from "../content/world";
import { evidenceOf, isChapterComplete } from "../core/progress";
import type { GameSession } from "../core/session";
import { assetPath } from "@/lib/asset-path";
import { Modal } from "./Modal";
import { MAP_EXTENT, mapPct, terrainImage } from "./mapImage";
import { poiLabel } from "./Hud";
import { S } from "./strings";

type Lang = "en" | "bn";

function EvidenceDetail({ e, lang }: { e: Evidence; lang: Lang }) {
  return (
    <article className="ll-evidence">
      {e.image && (
        <figure>
          <img src={assetPath(e.image.src)} alt={e.image.alt[lang]} loading="lazy" />
          <figcaption>{e.image.credit}</figcaption>
        </figure>
      )}
      <p className="ll-kicker">{S.nasaRecord[lang]}{e.when ? ` · ${e.when}` : ""}</p>
      <h3>{e.title[lang]}</h3>
      <p>{e.fact[lang]}</p>
      <a href={e.source.url} target="_blank" rel="noopener noreferrer">{S.readSource[lang]}: {e.source.label} ↗</a>
    </article>
  );
}

export function EvidenceCard({ session, lang, onClose }: { session: GameSession; lang: Lang; onClose: () => void }) {
  const card = session.evidenceCard;
  if (!card) return null;
  const e = EVIDENCE_BY_ID.get(card.evidence);
  if (!e) return null;
  return (
    <Modal label={e.title[lang]} onClose={onClose}>
      <p className="ll-kicker ll-kicker--signal">✦ {card.restored ? S.recordRestored[lang] : S.evidenceRecovered[lang]}</p>
      <EvidenceDetail e={e} lang={lang} />
      <div className="ll-actions">
        <button type="button" className="ll-btn ll-btn--primary" data-autofocus onClick={onClose}>{S.explore[lang]} →</button>
      </div>
    </Modal>
  );
}

export function Inventory({ session, lang, onClose }: { session: GameSession; lang: Lang; onClose: () => void }) {
  const owned = evidenceOf(session.progress);
  const [selected, setSelected] = useState<string | null>(owned[0] ?? null);
  const e = selected ? EVIDENCE_BY_ID.get(selected) : null;
  return (
    <Modal label={S.inventory[lang]} onClose={onClose} wide>
      <header className="ll-panel__head">
        <h2>{S.inventory[lang]} <span className="font-mono text-sm text-dust">{owned.length}/{EVIDENCE.length}</span></h2>
        <button type="button" className="ll-btn" onClick={onClose}>{S.close[lang]} <kbd>Esc</kbd></button>
      </header>
      {owned.length === 0 ? <p className="ll-muted">{S.noEvidence[lang]}</p> : (
        <div className="ll-inventory">
          <ul className="ll-inventory__grid" aria-label={S.inventory[lang]}>
            {EVIDENCE.map((item) => {
              const has = owned.includes(item.id);
              return (
                <li key={item.id}>
                  <button type="button" disabled={!has} aria-pressed={selected === item.id} onClick={() => setSelected(item.id)} className={`ll-slot ${has ? "" : "is-locked"} ${selected === item.id ? "is-selected" : ""}`}>
                    {has && item.image ? <img src={assetPath(item.image.src.replace(".jpg", "-thumb.jpg"))} alt="" /> : <span aria-hidden>{has ? "✦" : "?"}</span>}
                    <small>{has ? item.title[lang] : S.locked[lang]}</small>
                  </button>
                </li>
              );
            })}
          </ul>
          {e && <EvidenceDetail e={e} lang={lang} />}
        </div>
      )}
    </Modal>
  );
}

export function MissionMap({ session, lang, onClose, onTravel }: { session: GameSession; lang: Lang; onClose: () => void; onTravel?: (poi: string) => void }) {
  const [bg, setBg] = useState("");
  useEffect(() => { setBg(terrainImage()); }, []);
  const active = new Set(session.active.map((o) => o.target).filter(Boolean) as string[]);
  const sideOpen = (id: string) => {
    const side = SIDE_DISCOVERIES.find((s) => s.target === id);
    return side && !session.progress.sides.includes(side.id) && (session.progress.chapter >= side.fromChapter || session.progress.finished);
  };
  const visible = POIS.filter((p) => active.has(p.id) || sideOpen(p.id));
  const p = session.player;
  return (
    <Modal label={S.map[lang]} onClose={onClose} wide>
      <header className="ll-panel__head">
        <h2>{S.map[lang]}</h2>
        <button type="button" className="ll-btn" onClick={onClose}>{S.close[lang]} <kbd>Esc</kbd></button>
      </header>
      <div className="ll-map-layout">
        <div className="ll-map" style={{ backgroundImage: bg ? `url(${bg})` : undefined }} role="img" aria-label={lang === "bn" ? "উপর থেকে দেখা মিশন এলাকা" : "Top-down view of the mission area"}>
          <span className="ll-map__boundary" />
          {visible.map((poi) => (
            <span key={poi.id} className={`ll-map__poi ${active.has(poi.id) ? "is-active" : "is-side"}`} style={{ left: `${mapPct(poi.position.x)}%`, top: `${mapPct(poi.position.z)}%` }} title={poiLabel(poi.id, lang)} />
          ))}
          <span className="ll-map__player" style={{ left: `${mapPct(p.x)}%`, top: `${mapPct(p.z)}%`, transform: `translate(-50%,-50%) rotate(${180 - (p.yaw * 180) / Math.PI}deg)` }}>▲</span>
          <span className="ll-map__eko" style={{ left: `${mapPct(session.eko.x)}%`, top: `${mapPct(session.eko.z)}%` }} />
          <span className="ll-map__scale">{Math.round(MAP_EXTENT * 2)} m</span>
        </div>
        <div>
          <p className="ll-kicker">{lang === "bn" ? "লক্ষ্য ও আবিষ্কার" : "Objectives & discoveries"}</p>
          <ul className="ll-map-list">
            {visible.length === 0 && <li className="ll-muted">{S.freeRoam[lang]}</li>}
            {visible.map((poi) => {
              const d = Math.round(Math.hypot(poi.position.x - p.x, poi.position.z - p.z));
              return (
                <li key={poi.id}>
                  <span className={active.has(poi.id) ? "text-signal" : "text-caution"}>{active.has(poi.id) ? "◆" : "⌖"}</span>
                  <span>{poiLabel(poi.id, lang)} <small>{d} m</small></span>
                  {onTravel && <button type="button" className="ll-btn ll-btn--small" onClick={() => onTravel(poi.id)}>{lang === "bn" ? "যাও" : "Travel"}</button>}
                </li>
              );
            })}
          </ul>
          <p className="ll-muted mt-4 text-xs">{lang === "bn" ? "শিল্পিত খেলার মানচিত্র — প্রকৃত মঙ্গল-স্থানাঙ্ক নয়।" : "Artistic game map — not real Martian coordinates."}</p>
        </div>
      </div>
    </Modal>
  );
}

export function Journal({ session, lang, onClose }: { session: GameSession; lang: Lang; onClose: () => void }) {
  const done = new Set(session.progress.done);
  const owned = evidenceOf(session.progress);
  return (
    <Modal label={S.journal[lang]} onClose={onClose} wide>
      <header className="ll-panel__head">
        <h2>{S.journal[lang]}</h2>
        <button type="button" className="ll-btn" onClick={onClose}>{S.close[lang]} <kbd>Esc</kbd></button>
      </header>
      <div className="ll-journal">
        <section>
          <p className="ll-kicker">{S.story[lang]}</p>
          <ol className="ll-journal__chapters">
            {CHAPTERS.map((c, i) => {
              const reached = i <= session.progress.chapter || session.progress.finished;
              const complete = isChapterComplete(session.progress, i);
              return (
                <li key={c.id} className={complete ? "is-done" : reached ? "is-current" : "is-locked"}>
                  <strong>{c.number} · {reached ? c.title[lang] : "———"}</strong>
                  {reached && <span>{c.dek[lang]}</span>}
                  {reached && (
                    <ul>
                      {c.steps.flat().filter((o) => o.kind !== "cutscene").map((o) => (
                        <li key={o.id} className={done.has(o.id) ? "is-done" : ""}>{done.has(o.id) ? "✓" : "◇"} {o.text[lang]}</li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
        <section>
          <p className="ll-kicker ll-kicker--signal">{S.historical[lang]}</p>
          <ul className="ll-journal__facts">
            {owned.length === 0 && <li className="ll-muted">{S.noEvidence[lang]}</li>}
            {owned.map((id) => {
              const e = EVIDENCE_BY_ID.get(id)!;
              return <li key={id}><strong>{e.title[lang]}</strong><span>{e.fact[lang]}</span><a href={e.source.url} target="_blank" rel="noopener noreferrer">{e.source.label} ↗</a></li>;
            })}
          </ul>
          <p className="ll-kicker mt-6">{S.achievements[lang]}</p>
          <ul className="ll-achievements">
            {ACHIEVEMENTS.map((a) => {
              const got = session.progress.achievements.includes(a.id);
              return <li key={a.id} className={got ? "is-earned" : ""}><span aria-hidden>{a.icon}</span><span><strong>{a.title[lang]}</strong><small>{a.description[lang]}</small></span><span className="sr-only">{got ? "earned" : "not earned"}</span></li>;
            })}
          </ul>
          {done.has("c4-timeline") && <Link prefetch={false} href="/lens/" className="ll-btn mt-6 inline-flex">{S.memoryLens[lang]} →</Link>}
        </section>
      </div>
    </Modal>
  );
}
