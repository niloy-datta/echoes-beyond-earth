"use client";

import { useEffect, useRef, useState } from "react";
import { SIDE_DISCOVERIES } from "../content/chapters";
import { POIS } from "../content/world";
import type { GameSession, SessionInput } from "../core/session";
import { mapPct, terrainImage } from "./mapImage";
import { poiLabel } from "./Hud";

type Lang = "en" | "bn";

/**
 * 2D mission console: the complete campaign without WebGL. It drives the same
 * GameSession as the 3D renderer (north-up camera, so W/↑ walks north) and
 * offers an accessible "travel to" list for keyboard and screen-reader users.
 */
export function Console2D({ session, lang, consume, onTravel, paused, onStorm }: {
  session: GameSession;
  lang: Lang;
  consume: () => SessionInput;
  onTravel: (poi: string) => void;
  paused: boolean;
  onStorm?: (storm: number) => void;
}) {
  const [bg, setBg] = useState("");
  const player = useRef<HTMLSpanElement>(null);
  const eko = useRef<HTMLSpanElement>(null);
  const dust = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  useEffect(() => { setBg(terrainImage()); }, []);

  useEffect(() => {
    let raf = 0, last = performance.now(), stormTimer = 0;
    session.options = { ...session.options, autoCamera: false };
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      // North-up: camera yaw 0 means "forward" walks toward -z (up on the map).
      session.rig = { ...session.rig, yaw: 0 };
      const input = consume();
      if (!pausedRef.current) session.tick(dt, { ...input, lookX: 0, lookY: 0, zoom: 0 });
      const p = session.player;
      if (player.current) {
        player.current.style.left = `${mapPct(p.x)}%`;
        player.current.style.top = `${mapPct(p.z)}%`;
        player.current.style.transform = `translate(-50%,-50%) rotate(${180 - (p.yaw * 180) / Math.PI}deg)`;
      }
      if (eko.current) { eko.current.style.left = `${mapPct(session.eko.x)}%`; eko.current.style.top = `${mapPct(session.eko.z)}%`; }
      if (dust.current) dust.current.style.opacity = String(Math.min(0.85, session.storm * 0.9));
      stormTimer += dt;
      if (stormTimer > 0.25) { stormTimer = 0; onStorm?.(session.storm); }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [session, consume, onStorm]);

  const active = new Set(session.active.map((o) => o.target).filter(Boolean) as string[]);
  const sides = new Set(SIDE_DISCOVERIES.filter((s) => !session.progress.sides.includes(s.id) && (session.progress.chapter >= s.fromChapter || session.progress.finished)).map((s) => s.target));
  const shown = POIS.filter((p) => active.has(p.id) || sides.has(p.id));

  return (
    <div className="ll-console" data-testid="console-2d">
      <div className="ll-console__map" style={{ backgroundImage: bg ? `url(${bg})` : undefined }} role="img"
        aria-label={lang === "bn" ? "২ডি মিশন মানচিত্র। W A S D দিয়ে চলো, E দিয়ে স্ক্যান করো, অথবা তালিকা থেকে যাও।" : "2D mission map. Move with W A S D, press E to scan, or travel from the list."}>
        <div ref={dust} className="ll-console__dust" />
        <span className="ll-map__boundary" />
        {shown.map((poi) => (
          <button key={poi.id} type="button" className={`ll-map__poi ll-map__poi--button ${active.has(poi.id) ? "is-active" : "is-side"}`}
            style={{ left: `${mapPct(poi.position.x)}%`, top: `${mapPct(poi.position.z)}%` }}
            onClick={() => onTravel(poi.id)} aria-label={`${lang === "bn" ? "যাও" : "Travel to"}: ${poiLabel(poi.id, lang)}`} />
        ))}
        <span ref={eko} className="ll-map__eko" aria-hidden />
        <span ref={player} className="ll-map__player" aria-hidden>▲</span>
        <span className="ll-console__north" aria-hidden>N ↑</span>
      </div>
      <aside className="ll-console__list" aria-label={lang === "bn" ? "যাওয়ার জায়গা" : "Destinations"}>
        <p className="ll-kicker">{lang === "bn" ? "২ডি মিশন কনসোল" : "2D mission console"}</p>
        <ul>
          {shown.map((poi) => (
            <li key={poi.id}>
              <button type="button" className="ll-btn ll-btn--block" onClick={() => onTravel(poi.id)} data-travel={poi.id}>
                <span className={active.has(poi.id) ? "text-signal" : "text-caution"}>{active.has(poi.id) ? "◆" : "⌖"}</span> {poiLabel(poi.id, lang)}
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className="ll-muted text-sm">{lang === "bn" ? "এখন যাওয়ার কোনো লক্ষ্য নেই।" : "No destination right now."}</li>}
        </ul>
      </aside>
    </div>
  );
}
