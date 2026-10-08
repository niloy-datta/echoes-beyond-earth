"use client";

import { useEffect, useRef, useState } from "react";
import { ACHIEVEMENTS, CHAPTERS, LEVELS, OBJECTIVE_BY_ID, SIDE_DISCOVERIES } from "../content/chapters";
import { CUTSCENE_BY_ID } from "../content/cutscenes";
import { EVIDENCE_BY_ID, type L } from "../content/evidence";
import { POIS, POI_BY_ID } from "../content/world";
import type { GameSession, Toast } from "../core/session";
import { levelOf, levelXp } from "../core/progress";
import type { EngineView } from "../engine/Engine";
import type { InputController } from "../input";
import { mapPct, terrainImage } from "./mapImage";
import { S } from "./strings";

type Lang = "en" | "bn";

function useRaf(cb: () => void) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    let id = 0;
    const loop = () => { ref.current(); id = requestAnimationFrame(loop); };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);
}

export function ObjectivePanel({ session, lang }: { session: GameSession; lang: Lang }) {
  const chapter = CHAPTERS[session.progress.chapter];
  const active = session.active;
  const done = new Set(session.progress.done);
  const step = chapter.steps.find((s) => s.some((o) => active.includes(o)));
  const xp = levelXp(session.progress);
  const lv = levelOf(xp);
  const pct = lv.next ? ((xp - lv.current) / (lv.next - lv.current)) * 100 : 100;
  return (
    <section className="ll-objectives" aria-label={S.objective[lang]} data-testid="objectives">
      <p className="ll-kicker">{S.chapter[lang]} {chapter.number} · {chapter.title[lang]}</p>
      {active.length === 0 ? (
        <p className="ll-objective-free">{S.freeRoam[lang]}</p>
      ) : (
        <ul>
          {(step ?? active).filter((o) => o.kind !== "cutscene").map((o) => (
            <li key={o.id} className={done.has(o.id) ? "is-done" : ""} data-objective={o.id}>
              <span aria-hidden>{done.has(o.id) ? "✓" : "◇"}</span>
              <span>{o.text[lang]}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="ll-level" aria-label={`${S.level[lang]} ${lv.level + 1}: ${LEVELS[lv.level].title[lang]}, ${xp} XP`}>
        <span>{S.level[lang]} {lv.level + 1} · {LEVELS[lv.level].title[lang]}</span>
        <span className="ll-level__bar"><span style={{ width: `${pct}%` }} /></span>
        <span className="font-mono">{xp} XP</span>
      </div>
    </section>
  );
}

const DIRS = [["N", 0], ["NE", 45], ["E", 90], ["SE", 135], ["S", 180], ["SW", 225], ["W", 270], ["NW", 315]] as const;

export function Compass({ session, view }: { session: GameSession; view: () => EngineView | null }) {
  const strip = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLSpanElement>(null);
  useRaf(() => {
    const v = view();
    const heading = v ? v.heading : 0;
    const deg = ((heading * 180) / Math.PI + 360) % 360;
    if (strip.current) strip.current.style.setProperty("--heading", String(deg));
    const target = session.objectiveTarget();
    if (marker.current) {
      if (!target) { marker.current.style.opacity = "0"; return; }
      const bearing = (Math.atan2(target.x - session.player.x, -(target.z - session.player.z)) * 180) / Math.PI;
      let rel = ((bearing - deg + 540) % 360) - 180;
      rel = Math.max(-90, Math.min(90, rel));
      marker.current.style.opacity = "1";
      marker.current.style.left = `${50 + (rel / 90) * 50}%`;
    }
  });
  return (
    <div className="ll-compass" aria-hidden="true">
      <div ref={strip} className="ll-compass__strip">
        {[-1, 0, 1].flatMap((k) => DIRS.map(([label, d]) => (
          <span key={`${k}${label}`} className={label.length === 1 ? "is-major" : ""} style={{ "--deg": d + k * 360 } as React.CSSProperties}>{label}</span>
        )))}
      </div>
      <span ref={marker} className="ll-compass__marker">◆</span>
    </div>
  );
}

export function Minimap({ session, view, lang, onOpen }: { session: GameSession; view: () => EngineView | null; lang: Lang; onOpen: () => void }) {
  const [bg, setBg] = useState("");
  const player = useRef<HTMLSpanElement>(null);
  const eko = useRef<HTMLSpanElement>(null);
  const goal = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  useEffect(() => { setBg(terrainImage()); }, []);
  useRaf(() => {
    const p = session.player;
    // Minimap shows a 70 m window centred on the explorer.
    const zoom = (112 * 2) / 70;
    if (inner.current) {
      inner.current.style.width = inner.current.style.height = `${zoom * 100}%`;
      inner.current.style.left = `${50 - mapPct(p.x) * zoom}%`;
      inner.current.style.top = `${50 - mapPct(p.z) * zoom}%`;
    }
    if (player.current) player.current.style.transform = `translate(-50%,-50%) rotate(${(-p.yaw * 180) / Math.PI + 180}deg)`;
    const place = (el: HTMLSpanElement | null, x: number, z: number, show = true) => {
      if (!el) return;
      const dx = ((x - p.x) / 35) * 50, dz = ((z - p.z) / 35) * 50;
      const r = Math.hypot(dx, dz), k = r > 46 ? 46 / r : 1;
      el.style.left = `${50 + dx * k}%`; el.style.top = `${50 + dz * k}%`;
      el.style.opacity = show ? "1" : "0";
    };
    place(eko.current, session.eko.x, session.eko.z);
    const t = session.objectiveTarget();
    place(goal.current, t?.x ?? 0, t?.z ?? 0, !!t);
    void view;
  });
  return (
    <button type="button" className="ll-minimap" onClick={onOpen} aria-label={`${S.map[lang]} (M)`}>
      <div className="ll-minimap__clip">
        <div ref={inner} className="ll-minimap__world" style={{ backgroundImage: bg ? `url(${bg})` : undefined }} />
      </div>
      <span ref={goal} className="ll-minimap__goal" />
      <span ref={eko} className="ll-minimap__eko" />
      <span ref={player} className="ll-minimap__player">▲</span>
      <span className="ll-minimap__n">N</span>
    </button>
  );
}

export function ObjectiveMarker({ session, view, lang }: { session: GameSession; view: () => EngineView | null; lang: Lang }) {
  const ref = useRef<HTMLDivElement>(null);
  const dist = useRef<HTMLSpanElement>(null);
  useRaf(() => {
    const v = view(), el = ref.current;
    if (!el) return;
    if (!v || !v.marker.visible || session.blocked) { el.style.opacity = "0"; return; }
    el.style.opacity = v.marker.distance < 3 ? "0.35" : "1";
    el.style.left = `${v.marker.x}%`;
    el.style.top = `${v.marker.y}%`;
    el.dataset.offscreen = v.marker.onScreen ? "false" : "true";
    if (dist.current) dist.current.textContent = `${Math.round(v.marker.distance)} m`;
  });
  return (
    <div ref={ref} className="ll-marker" aria-hidden="true">
      <span className="ll-marker__diamond" />
      <span ref={dist} className="ll-marker__dist" />
      <span className="sr-only">{S.objective[lang]}</span>
    </div>
  );
}

export function InteractionPrompt({ session, lang, onInteract }: { session: GameSession; lang: Lang; onInteract: () => void }) {
  const p = session.prompt;
  if (!p || session.blocked) return null;
  let name: string;
  if (p.kind === "side") {
    const side = SIDE_DISCOVERIES.find((s) => s.id === p.id)!;
    name = EVIDENCE_BY_ID.get(side.evidence)!.title[lang];
  } else name = OBJECTIVE_BY_ID.get(p.id)!.text[lang];
  const verb = p.kind === "puzzle" ? S.open[lang] : p.kind === "side" ? S.discover[lang] : S.scan[lang];
  return (
    <button type="button" className="ll-prompt" onClick={onInteract} data-testid="interact-prompt">
      <kbd>E</kbd><span className="ll-prompt__verb">{verb}</span><span className="ll-prompt__name">{name}</span>
    </button>
  );
}

const SPEAKER: Record<string, L> = { eko: { en: "EKO", bn: "ইকো" }, narrator: { en: "Narrator", bn: "কথক" }, record: { en: "NASA record", bn: "NASA রেকর্ড" } };

export function Subtitles({ session, lang, large, onAdvance }: { session: GameSession; lang: Lang; large: boolean; onAdvance: () => void }) {
  const sub = session.subtitle;
  if (!sub) return null;
  return (
    <div className={`ll-subtitle ${large ? "is-large" : ""}`} role="status" aria-live="polite" onClick={onAdvance}>
      <span className={`ll-subtitle__speaker is-${sub.line.speaker}`}>{SPEAKER[sub.line.speaker][lang]}</span>
      <p key={sub.key}>{sub.line.text[lang]}</p>
    </div>
  );
}

function toastText(t: Toast, lang: Lang): { kicker: string; title: string; icon: string } {
  switch (t.kind) {
    case "objective": return { kicker: S.objectiveDone[lang], title: `${OBJECTIVE_BY_ID.get(t.id)?.text[lang] ?? ""} · +${t.xp} XP`, icon: "✓" };
    case "evidence": return { kicker: S.evidenceRecovered[lang], title: EVIDENCE_BY_ID.get(t.id)?.title[lang] ?? "", icon: "✦" };
    case "side": return { kicker: S.sideFound[lang], title: `+${t.xp} XP`, icon: "⌖" };
    case "achievement": {
      const a = ACHIEVEMENTS.find((x) => x.id === t.id);
      return { kicker: S.achievement[lang], title: a?.title[lang] ?? "", icon: a?.icon ?? "★" };
    }
    case "level": return { kicker: S.levelUp[lang], title: `${S.level[lang]} ${Number(t.id) + 1} · ${LEVELS[Number(t.id)]?.title[lang] ?? ""}`, icon: "▲" };
    case "chapter": {
      const c = CHAPTERS[Number(t.id)];
      return { kicker: S.chapterBegins[lang], title: `${c?.number} · ${c?.title[lang]}`, icon: "◈" };
    }
  }
}

export function Toasts({ session, lang }: { session: GameSession; lang: Lang }) {
  const toasts = session.toasts;
  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((t) => window.setTimeout(() => session.dismissToast(t.key), t.kind === "achievement" ? 5200 : 3800));
    return () => timers.forEach(clearTimeout);
  }, [toasts, session]);
  return (
    <div className="ll-toasts" aria-live="polite">
      {toasts.map((t) => {
        const x = toastText(t, lang);
        return (
          <div key={t.key} className={`ll-toast is-${t.kind}`} data-toast={t.kind}>
            <span className="ll-toast__icon" aria-hidden>{x.icon}</span>
            <span><small>{x.kicker}</small><strong>{x.title}</strong></span>
          </div>
        );
      })}
    </div>
  );
}

export function ChapterCard({ session, lang }: { session: GameSession; lang: Lang }) {
  const card = session.chapterCard;
  if (!card) return null;
  const c = CHAPTERS[card.chapter];
  return (
    <div className="ll-chapter-card" role="status" aria-live="polite">
      <p>{S.chapter[lang]} {c.number}</p>
      <h2>{c.title[lang]}</h2>
      <span>{c.dek[lang]}</span>
    </div>
  );
}

export function CutsceneOverlay({ session, lang, onSkip }: { session: GameSession; lang: Lang; onSkip: () => void }) {
  if (!session.cutscene) return null;
  const cs = CUTSCENE_BY_ID.get(session.cutscene.id);
  return (
    <>
      <div className="ll-letterbox ll-letterbox--top" aria-hidden />
      <div className="ll-letterbox ll-letterbox--bottom" aria-hidden />
      {cs?.label && <p className="ll-cutscene-label">{cs.label[lang]}</p>}
      <button type="button" className="ll-skip" onClick={onSkip} data-testid="skip-cutscene">{S.skip[lang]} <kbd>Enter</kbd></button>
    </>
  );
}

export function StormBadge({ session, lang }: { session: GameSession; lang: Lang }) {
  if (session.storm < 0.25 || session.cutscene) return null;
  return <p className="ll-storm-badge">{S.stormLabel[lang]}</p>;
}

export function PerfBadge({ view }: { view: () => EngineView | null }) {
  const ref = useRef<HTMLSpanElement>(null);
  useRaf(() => {
    const v = view();
    if (ref.current) ref.current.textContent = v ? `${v.fps} FPS · ${v.quality.toUpperCase()} · ${v.frameMs} ms CPU` : "2D";
  });
  return <span ref={ref} className="ll-perf" data-testid="perf" />;
}

/** Virtual joystick + action buttons for touch screens. */
export function TouchControls({ input, lang, onAction }: { input: InputController; lang: Lang; onAction: (a: "interact" | "jump" | "pause" | "inventory" | "map" | "journal") => void }) {
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLSpanElement>(null);
  const active = useRef<number | null>(null);
  const [sprint, setSprint] = useState(input.sprintToggle);
  const move = (e: React.PointerEvent) => {
    const el = base.current;
    if (!el || active.current !== e.pointerId) return;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const len = Math.hypot(dx, dy), k = len > 1 ? 1 / len : 1;
    input.stick = { x: dx * k, y: -dy * k };
    if (knob.current) knob.current.style.transform = `translate(${dx * k * 38}px, ${dy * k * 38}px)`;
  };
  const end = () => {
    active.current = null;
    input.stick = { x: 0, y: 0 };
    if (knob.current) knob.current.style.transform = "";
  };
  return (
    <div className="ll-touch" data-testid="touch-controls">
      <div
        ref={base}
        className="ll-stick"
        role="application"
        aria-label={lang === "bn" ? "চলার জয়স্টিক" : "Movement joystick"}
        onPointerDown={(e) => {
          e.stopPropagation();
          active.current = e.pointerId;
          try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer already released */ }
          move(e);
        }}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <span ref={knob} className="ll-stick__knob" />
      </div>
      <div className="ll-touch__buttons">
        <button type="button" className="ll-touch__btn is-primary" onPointerDown={(e) => e.stopPropagation()} onClick={() => onAction("interact")}>{S.interact[lang]}</button>
        <button type="button" className="ll-touch__btn" onPointerDown={(e) => e.stopPropagation()} onClick={() => onAction("jump")}>{S.jump[lang]}</button>
        <button type="button" aria-pressed={sprint} className={`ll-touch__btn ${sprint ? "is-on" : ""}`} onPointerDown={(e) => e.stopPropagation()} onClick={() => { input.sprintToggle = !input.sprintToggle; setSprint(input.sprintToggle); }}>{S.sprint[lang]}</button>
      </div>
    </div>
  );
}

export const poiLabel = (id: string, lang: Lang): string => {
  const objective = [...OBJECTIVE_BY_ID.values()].find((o) => o.target === id);
  if (objective) return objective.text[lang];
  const side = SIDE_DISCOVERIES.find((s) => s.target === id);
  if (side) return EVIDENCE_BY_ID.get(side.evidence)!.title[lang];
  return id;
};
export const ALL_POIS = POIS;
export const poiById = (id: string) => POI_BY_ID.get(id);
