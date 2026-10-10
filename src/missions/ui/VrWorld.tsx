"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { assetPath } from "@/lib/asset-path";
import { CHAPTERS } from "../content/chapters";
import { formatDate, formatLatLon } from "../core/geo";
import type { Body, CatalogObject } from "../core/types";
import type { VrPark, PanelInfo } from "../three/vr";
import { useCatalog, useProgress } from "./data";
import { ErrorBox, ExtLink, Loading, Panel } from "./parts";
import { useM, tr } from "./strings";

export function VrWorld() {
  const { m, l, lang } = useM();
  const cat = useCatalog();
  const pr = useProgress();
  const [body, setBody] = useState<Body>("moon");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const parkRef = useRef<VrPark | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "nowebgl" | "lost">("loading");
  const [xr, setXr] = useState<"checking" | "yes" | "no" | "insecure">("checking");
  const [inXr, setInXr] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [alive, setAlive] = useState(false);
  const langRef = useRef(lang);
  langRef.current = lang;
  const byIdRef = useRef<Map<string, CatalogObject> | null>(null);
  byIdRef.current = cat.status === "ready" ? cat.byId : null;
  const chapters = useMemo(() => CHAPTERS.filter((c) => c.body === body), [body]);
  const ready = cat.status === "ready";

  useEffect(() => {
    let off = false;
    import("../three/vr").then(async ({ xrSupported }) => {
      if (!window.isSecureContext) { if (!off) setXr("insecure"); return; }
      const ok = await xrSupported();
      if (!off) setXr(ok ? "yes" : "no");
    });
    return () => { off = true; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    let off = false;
    let park: VrPark | null = null;
    setState("loading"); setSelected(null); setAlive(false);
    (async () => {
      const [{ VrPark }, kit] = await Promise.all([import("../three/vr"), import("../three/kit")]);
      if (off) return;
      if (!kit.webglAvailable()) { setState("nowebgl"); return; }
      const q = kit.pickQuality(null);
      const info = (id: string): PanelInfo => {
        const L = langRef.current;
        const ch = CHAPTERS.find((c) => c.id === id)!;
        const o = byIdRef.current?.get(ch.objectId);
        const lines = o ? [
          `${o.name}`,
          `${tr(L, "rev.coords")}: ${o.lat != null && o.lon != null ? formatLatLon(o.lat, o.lon, L) : o.coords_raw}`,
          `${tr(L, "rev.left")}: ${formatDate(o.left_behind, L)}`,
          `${tr(L, "rev.last")}: ${o.status === "active" ? tr(L, "rev.status.active") : o.last_contact ? formatDate(o.last_contact, L) : "—"}`,
          `${tr(L, "rev.status")}: ${tr(L, `rev.status.${o.status}` as "rev.status.silent")}`,
        ] : [];
        return { title: ch.title[L], lines, footer: o?.source_url ? `${tr(L, "rev.source")}: ${o.source_url.replace(/^https?:\/\/(www\.)?/, "")}` : "" };
      };
      try {
        park = new VrPark({
          canvas: canvasRef.current!, body, chapters, quality: q, assetBase: assetPath(""),
          getInfo: info,
          getLabel: (id) => CHAPTERS.find((c) => c.id === id)!.title[langRef.current],
          onSelect: (id) => setSelected(id),
          onXR: setInXr,
          onContextLost: () => setState("lost"),
        });
      } catch { setState("nowebgl"); return; }
      parkRef.current = park;
      if (new URLSearchParams(window.location.search).has("debug")) (window as unknown as { __vr?: VrPark }).__vr = park;
      park.start();
      setState("ready");
      pr.vr();
    })();
    return () => { off = true; parkRef.current = null; park?.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, ready, chapters]);

  useEffect(() => { parkRef.current?.refresh(); }, [lang]);

  if (cat.status === "loading") return <Loading label={m("vr.loading")} />;
  if (cat.status === "error") return <ErrorBox message={cat.error} onRetry={cat.retry} />;

  const sel = selected ? CHAPTERS.find((c) => c.id === selected) : null;
  const o = sel ? cat.byId.get(sel.objectId) : undefined;
  const walk = (f: number, s: number) => ({
    onPointerDown: () => parkRef.current?.setMove(f, s),
    onPointerUp: () => parkRef.current?.setMove(0, 0),
    onPointerLeave: () => parkRef.current?.setMove(0, 0),
    onPointerCancel: () => parkRef.current?.setMove(0, 0),
  });

  return (
    <div className="container-x pb-20 pt-[calc(var(--header-h)+1.5rem)]">
      <Link href="/missions/" prefetch={false} className="btn-ghost mb-5">← {m("arena.hub")}</Link>
      <h1 className="display text-[clamp(2rem,6vw,4rem)]">{m("vr.title")}</h1>
      <p className="mt-3 max-w-2xl text-lunar-2">{m("vr.dek")}</p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="label mr-1">{m("vr.world")}</span>
        {(["moon", "mars"] as const).map((b) => (
          <button key={b} type="button" className="btn-ghost" aria-pressed={body === b} onClick={() => setBody(b)}>{m(b === "moon" ? "vr.moon" : "vr.mars")}</button>
        ))}
        <button type="button" className="btn-ghost" aria-pressed={alive} onClick={() => { const v = !alive; setAlive(v); parkRef.current?.setAlive(v); }}>
          {alive ? m("vr.asleep") : m("vr.alive")}
        </button>
        {xr === "yes" && (
          <button type="button" className="btn-signal ml-auto" onClick={() => (inXr ? parkRef.current?.exitXR() : void parkRef.current?.enterXR())}>
            🥽 {inXr ? m("vr.exit") : m("vr.enter")}
          </button>
        )}
      </div>
      <p className="mt-2 text-[12px] text-dust" role="status">
        {xr === "checking" ? m("vr.checking") : xr === "insecure" ? m("vr.insecure") : xr === "no" ? m("vr.unsupported") : m("vr.controlsXr")}
      </p>

      <div className="relative mt-4 aspect-[4/3] w-full overflow-hidden border border-hairline-strong bg-black sm:aspect-[16/9]">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" role="img" aria-label={m("vr.title")} />
        {state === "loading" && <div className="absolute inset-0 grid place-items-center bg-black/70"><p className="label" role="status">{m("vr.loading")}</p></div>}
        {state === "nowebgl" && <div className="absolute inset-0 grid place-items-center bg-void p-6 text-center"><p className="text-lunar-2">{m("vr.noWebgl")}</p></div>}
        {state === "lost" && <div className="absolute inset-0 grid place-items-center bg-black/80 p-6 text-center"><p role="alert" className="text-lunar-2">{m("play.contextLost")}</p></div>}
        <p className="pointer-events-none absolute bottom-2 left-3 max-w-[70%] bg-black/55 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-lunar-2">{m("vr.orbHint")} · {m("vr.objectsHere", { n: chapters.length })}</p>
        {state === "ready" && (
          <div className="absolute bottom-3 right-3 grid grid-cols-3 gap-1 sm:hidden" aria-label={m("vr.walkHint")}>
            <span />
            <button type="button" className="btn-ghost !p-3 bg-black/60" aria-label="forward" {...walk(1, 0)}>▲</button>
            <span />
            <button type="button" className="btn-ghost !p-3 bg-black/60" aria-label="left" {...walk(0, -1)}>◀</button>
            <button type="button" className="btn-ghost !p-3 bg-black/60" aria-label="back" {...walk(-1, 0)}>▼</button>
            <button type="button" className="btn-ghost !p-3 bg-black/60" aria-label="right" {...walk(0, 1)}>▶</button>
          </div>
        )}
        {sel && o && (
          <Panel className="absolute left-3 top-3 max-h-[88%] w-[min(22rem,calc(100%-1.5rem))] overflow-auto p-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-medium text-lunar">{l(sel.title)}</h2>
              <button type="button" className="btn-ghost !px-2.5 !py-1" onClick={() => parkRef.current?.select(null)} aria-label={m("vr.close")}>✕</button>
            </div>
            <p className="mt-1 text-[13px] text-lunar-2">{o.name}</p>
            <dl className="mt-3 space-y-2 text-[13px]">
              <div><dt className="label">{m("rev.coords")}</dt><dd className="font-mono text-lunar">{o.lat != null && o.lon != null ? formatLatLon(o.lat, o.lon, lang) : o.coords_raw}</dd></div>
              <div><dt className="label">{m("rev.left")}</dt><dd className="text-lunar">{formatDate(o.left_behind, lang)}</dd></div>
              <div><dt className="label">{m("rev.last")}</dt><dd className="text-lunar">{o.status === "active" ? m("rev.status.active") : o.last_contact ? formatDate(o.last_contact, lang) : "—"}</dd></div>
            </dl>
            <p className="mt-3 flex flex-wrap gap-x-4 text-[13px]">
              {o.source_url && <ExtLink href={o.source_url}>{m("rev.source")}</ExtLink>}
              {o.image_url && <ExtLink href={o.image_url}>{m("rev.photo")}</ExtLink>}
            </p>
            <Link href={`/missions/play/?c=${sel.id}`} prefetch={false} className="btn-signal mt-4 w-full justify-center">{m("vr.panelMore")} →</Link>
          </Panel>
        )}
      </div>
      <p className="mt-3 text-[12px] text-dust">{m("vr.controlsDesktop")}</p>
      <p className="mt-1 max-w-3xl text-[12px] text-dust">{m("vr.untested")}</p>
      <p className="mt-1 max-w-3xl text-[12px] text-dust">{m("credits.models")}</p>
    </div>
  );
}
