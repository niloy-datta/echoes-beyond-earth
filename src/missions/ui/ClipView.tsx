"use client";
import { useEffect, useRef, useState } from "react";
import { assetPath } from "@/lib/asset-path";
import type { Chapter, CatalogObject } from "../core/types";
import { formatDate, formatLatLon, siteName } from "../core/geo";
import type { ChapterClip } from "../three/clip";
import type { Quality } from "../three/kit";
import { MAP_IMG } from "./data";
import { BhuluAvatar, ExtLink, PhotoStrip } from "./parts";
import { useM } from "./strings";

type Q = "auto" | "low" | "medium" | "high";

/** Shows the factual chips for a beat — read from the catalog, never typed into the story text. */
function Facts({ chapter, beat, o }: { chapter: Chapter; beat: number; o: CatalogObject | undefined }) {
  const { m, lang } = useM();
  if (!o) return null;
  const keys = chapter.beats[beat].facts;
  if (!keys.length) return null;
  const approx = o.precision !== "reported";
  const rows = keys.map((k) => {
    switch (k) {
      case "left": return [m("play.fact.left"), formatDate(o.left_behind, lang)] as const;
      case "coords": return [m("play.fact.coords"), o.lat != null && o.lon != null ? `${formatLatLon(o.lat, o.lon, lang)}${approx ? " " + m("play.fact.approx") : ""}` : o.coords_raw] as const;
      case "last": return [m("play.fact.last"), o.status === "active" ? m("play.fact.active") : o.last_contact ? `${formatDate(o.last_contact, lang)}${o.last_contact_approx ? " " + m("play.fact.approx") : ""}` : m("play.fact.none")] as const;
      case "site": return [m("play.fact.site"), siteName(o) ?? (lang === "bn" ? o.mission : o.mission)] as const;
    }
  });
  return (
    <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 border-t border-hairline pt-3">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt className="label">{k}</dt>
          <dd className="font-mono text-[13px] text-lunar">{v}</dd>
        </div>
      ))}
      {o.source_url && (
        <div>
          <dt className="label">{m("play.fact.src")}</dt>
          <dd className="text-[13px]"><ExtLink href={o.source_url}>{new URL(o.source_url).hostname.replace(/^www\./, "")}</ExtLink></dd>
        </div>
      )}
    </dl>
  );
}

/** Static fallback when WebGL is unavailable: the story as a captioned slideshow over the NASA map. */
function Slideshow({ chapter, o, beat, setBeat }: { chapter: Chapter; o: CatalogObject | undefined; beat: number; setBeat: (i: number) => void }) {
  const { l } = useM();
  const lon = o?.lon ?? 0, lat = o?.lat ?? 0;
  return (
    <div
      className="absolute inset-0 bg-void-3"
      style={{
        backgroundImage: `url(${MAP_IMG[chapter.body]})`,
        backgroundSize: "800% 800%",
        backgroundPosition: `${((lon + 180) / 360) * 100}% ${((90 - lat) / 180) * 100}%`,
        opacity: 0.55,
      }}
      aria-hidden
      onClick={() => setBeat((beat + 1) % chapter.beats.length)}
    >
      <span className="sr-only">{l(chapter.title)}</span>
    </div>
  );
}

export function ClipView({
  chapter, object, reduced, onBeat, onEnd, onSkip,
}: {
  chapter: Chapter;
  object: CatalogObject | undefined;
  reduced: boolean;
  onBeat?: (i: number) => void;
  onEnd: () => void;
  onSkip: () => void;
}) {
  const { m, l } = useM();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clipRef = useRef<ChapterClip | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "nowebgl" | "lost">("loading");
  const [beat, setBeat] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [quality, setQuality] = useState<Q>("auto");
  const cb = useRef({ onBeat, onEnd });
  cb.current = { onBeat, onEnd };

  useEffect(() => {
    let disposed = false;
    let clip: ChapterClip | null = null;
    setState("loading"); setBeat(0); setEnded(false); setPlaying(false);
    (async () => {
      const [{ ChapterClip }, kit] = await Promise.all([import("../three/clip"), import("../three/kit")]);
      if (disposed) return;
      if (!kit.webglAvailable()) { setState("nowebgl"); return; }
      const q: Quality = kit.pickQuality(quality === "auto" ? null : quality);
      try {
        clip = new ChapterClip({
          canvas: canvasRef.current!, chapter, object, quality: q, assetBase: assetPath("").replace(/\/$/, ""), reduced,
          onBeat: (i) => { setBeat(i); cb.current.onBeat?.(i); },
          onEnd: () => { setPlaying(false); setEnded(true); cb.current.onEnd(); },
          onContextLost: () => setState("lost"),
        });
      } catch {
        setState("nowebgl");
        return;
      }
      clipRef.current = clip;
      if (new URLSearchParams(window.location.search).has("debug")) (window as unknown as { __clip?: ChapterClip }).__clip = clip;
      setState("ready");
      if (!reduced) { clip.play(); setPlaying(true); }
    })();
    return () => { disposed = true; clipRef.current = null; clip?.dispose(); };
  }, [chapter, object, reduced, quality]);

  const toggle = () => {
    const c = clipRef.current;
    if (!c) return;
    if (ended) { setEnded(false); c.restart(); setPlaying(true); return; }
    c.toggle(); setPlaying(c.playing);
  };
  const go = (i: number) => {
    const c = clipRef.current;
    const n = Math.min(chapter.beats.length - 1, Math.max(0, i));
    setEnded(false);
    if (c) { c.seekBeat(n); if (!reduced && !c.playing) { c.play(); setPlaying(true); } } else setBeat(n);
    setBeat(n);
  };
  const b = chapter.beats[beat];
  const mood = beat === 2 ? "sad" : beat === 3 ? "happy" : beat === 0 ? "point" : "talk";

  return (
    <div>
      <div className="relative aspect-[4/3] w-full overflow-hidden border border-hairline-strong bg-black sm:aspect-[16/9]">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-label={l(chapter.title)} role="img" />
        {state === "nowebgl" && <Slideshow chapter={chapter} o={object} beat={beat} setBeat={go} />}
        {state === "loading" && (
          <div className="absolute inset-0 grid place-items-center bg-black/60"><p className="label" role="status">{m("play.loading3d")}</p></div>
        )}
        {state === "lost" && (
          <div className="absolute inset-0 grid place-items-center bg-black/80 p-6 text-center"><p role="alert" className="max-w-sm text-lunar-2">{m("play.contextLost")}</p></div>
        )}
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 bg-black/55 px-2.5 py-1.5 backdrop-blur">
          <span className="label !text-lunar-2">{m(`play.beat.${b.id}` as "play.beat.arrive")}</span>
          <span className="label">{m("play.scene", { n: beat + 1, total: chapter.beats.length })}</span>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-dust">{m("credits.models")}</p>

      <div className="mt-3 grid gap-4 md:grid-cols-[auto_1fr]">
        <BhuluAvatar mood={mood} size={84} className="hidden shrink-0 md:block" />
        <div className="border border-hairline-strong bg-void-2/80 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <BhuluAvatar mood={mood} size={52} className="shrink-0 md:hidden" />
            <p className="min-h-[3.2em] text-[clamp(1rem,1.5vw,1.15rem)] leading-relaxed text-lunar" aria-live="polite">{l(b.caption)}</p>
          </div>
          <Facts chapter={chapter} beat={beat} o={object} />
          <p className="mt-3 text-[11px] text-dust">{m("play.storyNote")}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" className="btn-ghost" onClick={() => go(beat - 1)} disabled={beat === 0} aria-label={m("play.prev")}>◀</button>
        <button type="button" className="btn-ghost" onClick={toggle} disabled={state !== "ready"}>
          {ended ? `↻ ${m("play.replay")}` : playing ? `❚❚ ${m("play.pause")}` : `▶ ${m("play.play")}`}
        </button>
        <button type="button" className="btn-ghost" onClick={() => go(beat + 1)} disabled={beat >= chapter.beats.length - 1} aria-label={m("play.next")}>▶</button>
        <div className="ml-1 flex gap-1" aria-hidden>
          {chapter.beats.map((_, i) => (
            <span key={i} className={`h-1.5 w-6 rounded-full ${i === beat ? "bg-signal" : i < beat ? "bg-lunar-2/60" : "bg-void-3"}`} />
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-[12px] text-dust">
          {m("play.quality")}
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value as Q)}
            className="border border-hairline-strong bg-void-2 px-2 py-1 font-mono text-[11px] text-lunar-2"
          >
            <option value="auto">Auto</option>
            <option value="low">{m("play.q.low")}</option>
            <option value="medium">{m("play.q.medium")}</option>
            <option value="high">{m("play.q.high")}</option>
          </select>
        </label>
        <button type="button" className={ended ? "btn-signal" : "btn-ghost"} onClick={onSkip}>{ended ? m("play.startChallenge") : m("play.skip")} →</button>
      </div>
      <div className="mt-5"><PhotoStrip objectId={chapter.objectId} /></div>
    </div>
  );
}
