"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { EMBER, Panel } from "@/components/mission/Mission";
import { SourceLink, VerificationBadge } from "@/components/ui";
import { assetPath } from "@/lib/asset-path";
import { useCapsule } from "@/lib/capsule";
import { useMuseum, type MuseumData } from "@/lib/data";
import { formatDate, localizeDigits } from "@/lib/dates";
import { formatCoords } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { usePassport } from "@/lib/passport";
import type { Hotspot, ImageSource, LensPair, Localized } from "@/lib/types";

const EASE = [0.22, 1, 0.36, 1] as const;
const COOL = "#9cc7ff";

export function MemoryLens() {
  const { data } = useMuseum();
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!data || activeId) return;
    const fromUrl = new URLSearchParams(window.location.search).get("pair");
    setActiveId(data.stories.lens.find((p) => p.id === fromUrl)?.id ?? data.stories.lens.find((p) => p.id === "tranquility")?.id ?? data.stories.lens[0]?.id ?? null);
  }, [data, activeId]);

  const choose = useCallback((id: string) => {
    setActiveId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("pair", id);
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, []);

  const pair = data?.stories.lens.find((p) => p.id === activeId);
  if (!data || !pair) return null;

  return (
    <div className="relative isolate overflow-hidden">
      <div className="container-x relative pb-10 pt-[calc(var(--header-h)+1.25rem)]">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 xl:grid-cols-[190px_minmax(0,1fr)] xl:gap-7">
          <SiteRail pairs={data.stories.lens} activeId={pair.id} onChoose={choose} data={data} />
          <div className="min-w-0">
            <Stage key={pair.id} pair={pair} data={data} />
          </div>
        </div>
        <Moments pair={pair} data={data} />
      </div>
    </div>
  );
}

/* ───────────────────────── left rail ───────────────────────── */

function SiteRail({ pairs, activeId, onChoose, data }: { pairs: LensPair[]; activeId: string; onChoose: (id: string) => void; data: MuseumData }) {
  const { t, l, lang } = useT();
  const active = pairs.find((p) => p.id === activeId);
  const obj = active?.object ? data.byId.get(active.object) : undefined;
  return (
    <aside aria-label={t("ml.sites")} className="flex flex-col">
      <ol className="relative -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 xl:mx-0 xl:flex-col xl:gap-0 xl:overflow-visible xl:px-0">
        <span aria-hidden className="absolute bottom-6 left-[15px] top-6 hidden w-px bg-hairline-strong xl:block" />
        {pairs.map((p, i) => {
          const on = p.id === activeId;
          return (
            <li key={p.id} className="relative shrink-0">
              <button type="button" aria-pressed={on} onClick={() => onChoose(p.id)} className="group flex items-start gap-4 py-4 text-left">
                <span
                  aria-hidden
                  className="relative z-10 mt-1 flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-full border-2 bg-void"
                  style={{ borderColor: on ? EMBER : "#b9b8b2", boxShadow: on ? `0 0 16px ${EMBER}` : undefined }}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: on ? EMBER : "#b9b8b2" }} />
                </span>
                <span>
                  <span className="block font-mono text-[15px]" style={{ color: on ? EMBER : "#ecebe6" }}>
                    {localizeDigits(String(i + 1).padStart(2, "0"), lang)}
                  </span>
                  <span className={`block font-mono text-[13px] uppercase tracking-[0.08em] ${on ? "text-lunar" : "text-lunar-2 group-hover:text-lunar"}`}>{l(p.short)}</span>
                  <span className="mt-1 block font-mono text-[11px] text-lunar-2">
                    {localizeDigits(p.then.year, lang)} – {localizeDigits(p.now.year, lang)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {obj && (
        <div className="mt-6 hidden border-l border-hairline-strong pl-4 font-mono text-[10px] uppercase leading-[1.9] tracking-[0.16em] text-lunar-2 xl:block">
          {t(`common.body.${obj.properties.body}` as const)}
          <br />
          {l(obj.properties.site).split(" (")[0]}
          <br />
          {l(obj.properties.name).split(" · ")[0]}
        </div>
      )}
    </aside>
  );
}

/* ───────────────────────── comparison stage ───────────────────────── */

/** Where a point on the photo lands once the photo is drawn with object-fit: cover. */
function coverPoint(x: number, y: number, box: { w: number; h: number }, img: ImageSource) {
  const s = Math.max(box.w / img.width, box.h / img.height);
  return {
    left: (x / 100) * img.width * s + (box.w - img.width * s) / 2,
    top: (y / 100) * img.height * s + (box.h - img.height * s) / 2,
  };
}

function Stage({ pair, data }: { pair: LensPair; data: MuseumData }) {
  const { t, lang } = useT();
  const { mark } = usePassport();
  const then = data.image(pair.then.image);
  const now = data.image(pair.now.image);
  const frame = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [pos, setPos] = useState(52);
  const dragging = useRef(false);
  const marked = useRef(false);

  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!marked.current && (pos < 15 || pos > 85)) {
      marked.current = true;
      mark("lenses", pair.id);
    }
  }, [pos, mark, pair.id]);

  const fromPointer = (clientX: number) => {
    const r = frame.current?.getBoundingClientRect();
    if (r) setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };

  const split = (box.w * pos) / 100;
  // On wide screens the info panel floats over the right side; only show the plate when it has room.
  const panelEdge = box.w >= 1000 ? box.w - 400 : box.w;
  const nowPlateFits = split + 300 < panelEdge;

  return (
    <div className="relative">
      <div
        ref={frame}
        className="relative h-[68svh] min-h-[460px] w-full cursor-ew-resize touch-pan-y select-none overflow-hidden border border-hairline bg-void-2 xl:h-[calc(100svh-var(--header-h)-13.5rem)] xl:min-h-[540px]"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button,a")) return;
          dragging.current = true;
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          fromPointer(e.clientX);
        }}
        onPointerMove={(e) => dragging.current && fromPointer(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        {/* eslint-disable @next/next/no-img-element */}
        {now && <img src={assetPath(now.file)} alt={now.title} draggable={false} className="absolute inset-0 h-full w-full object-cover" style={{ filter: "brightness(0.8) contrast(1.08)" }} />}
        {then && (
          <img
            src={assetPath(then.file)}
            alt={then.title}
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ clipPath: `inset(0 ${100 - pos}% 0 0)`, filter: "brightness(0.85) contrast(1.08)" }}
          />
        )}
        {/* eslint-enable @next/next/no-img-element */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(3,4,5,0.85),rgba(3,4,5,0.15)_38%,rgba(3,4,5,0)_60%,rgba(3,4,5,0.7))]" />

        {/* Marker layers — each only on its own side of the split */}
        {box.w > 0 && then && <Spots spots={pair.then.hotspots ?? []} img={then} box={box} visible={(left) => left < split - 20} />}
        {box.w > 0 && now && <Spots spots={pair.now.hotspots ?? []} img={now} box={box} visible={(left) => left > split + 20} />}

        {/* Year plates */}
        <div aria-hidden className="pointer-events-none absolute bottom-[20%] left-[3%] hidden md:block" style={{ opacity: pos > 22 ? 1 : 0, transition: "opacity .4s" }}>
          <p className="font-display text-[clamp(3rem,6vw,5.5rem)] font-bold leading-none text-lunar/60">{localizeDigits(pair.then.year, lang)}</p>
          <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.3em] text-lunar-2">{t("ml.thenSub")}</p>
        </div>
        {/* "Now" plate rides just right of the divider */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-[42%] hidden md:block"
          style={{ left: `calc(${pos}% + 2.5rem)`, opacity: nowPlateFits ? 1 : 0, transition: "opacity .4s" }}
        >
          <p className="font-display text-[clamp(3rem,6vw,5.5rem)] font-bold leading-none text-lunar/60">{localizeDigits(pair.now.year, lang)}</p>
          <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.3em] text-lunar-2">{t("ml.nowSub")}</p>
        </div>

        {/* Divider + handle */}
        <div aria-hidden className="pointer-events-none absolute inset-y-0 w-px bg-[linear-gradient(180deg,transparent,#cfe3ff_20%,#cfe3ff_80%,transparent)]" style={{ left: `${pos}%`, boxShadow: `0 0 12px ${COOL}` }} />
        <div aria-hidden className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${pos}%` }}>
          <span
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 bg-void/60 text-xl text-lunar backdrop-blur-sm"
            style={{ borderColor: COOL, boxShadow: `0 0 24px ${COOL}88, inset 0 0 12px ${COOL}55` }}
          >
            ⟷
          </span>
          <span className="mt-3 block whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.24em] text-lunar">{t("ml.drag")}</span>
        </div>

        {/* Headline over the "then" side */}
        <div className="pointer-events-none absolute left-[3%] right-[3%] top-[4%] xl:right-auto">
          <p className="font-mono text-[11px] uppercase tracking-[0.42em] text-lunar-2">{t("ml.eyebrow")}</p>
          <h1 className="mt-3 font-display text-[clamp(1.35rem,2.9vw,3rem)] font-bold uppercase leading-[1.02] tracking-[-0.005em]">
            <span className="block bg-[linear-gradient(180deg,#ffffff,#c9d0d8)] bg-clip-text text-transparent xl:whitespace-nowrap">{t("ml.line1")}</span>
            <span className="block bg-[linear-gradient(180deg,#cfe3ff,#7fa8e0)] bg-clip-text text-transparent xl:whitespace-nowrap">{t("ml.line2")}</span>
          </h1>
          <p className="mt-3 font-mono text-[12px] tracking-[0.12em] text-lunar">{t("ml.dek")}</p>
        </div>

        {/* Info panel (desktop: floating over the "now" side) */}
        <div className="absolute right-[2%] top-[4%] hidden w-[360px] xl:block">
          <InfoPanel pair={pair} data={data} />
        </div>

        {/* Closing line */}
        <div aria-hidden className="pointer-events-none absolute bottom-[5%] right-[3%] hidden text-right xl:block">
          <p className="font-mono text-[14px] uppercase leading-[1.9] tracking-[0.3em] text-lunar">
            “{t("ml.quote1")}
            <br />
            {t("ml.quote2")}”
          </p>
          <span className="ml-auto mt-3 block h-px w-16" style={{ background: EMBER }} />
          <p className="mt-3 font-mono text-[9.5px] uppercase tracking-[0.24em] text-lunar-2">{t("ml.quoteSub")}</p>
        </div>
      </div>

      <label htmlFor={`lens-range-${pair.id}`} className="sr-only">
        {t("lens.slider", { value: Math.round(100 - pos) })}
      </label>
      <input
        id={`lens-range-${pair.id}`}
        type="range"
        min={0}
        max={100}
        value={Math.round(pos)}
        onChange={(e) => setPos(Number(e.target.value))}
        className="range mt-2"
        aria-valuetext={t("lens.slider", { value: Math.round(100 - pos) })}
      />
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-dust">
        {t("lens.hint")} {t("ml.spotsHint")}
      </p>

      <div className="mt-6 xl:hidden">
        <InfoPanel pair={pair} data={data} />
      </div>
    </div>
  );
}

function Spots({ spots, img, box, visible }: { spots: Hotspot[]; img: ImageSource; box: { w: number; h: number }; visible: (left: number) => boolean }) {
  const { t, l } = useT();
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      {spots.map((s, i) => {
        const p = coverPoint(s.x, s.y, box, img);
        if (p.left < 8 || p.left > box.w - 8 || p.top < 8 || p.top > box.h - 8) return null;
        const show = visible(p.left);
        const flip = p.left > box.w * 0.6;
        return (
          <div
            key={i}
            className="absolute z-10 -translate-y-1/2 transition-opacity duration-300"
            style={{ left: p.left, top: p.top, opacity: show ? 1 : 0, pointerEvents: show ? "auto" : "none" }}
          >
            <div className={`flex items-center gap-2 ${flip ? "-translate-x-full flex-row-reverse" : "-translate-x-[11px]"}`}>
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
                tabIndex={show ? 0 : -1}
                className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-lunar bg-void/50 text-[14px] leading-none text-lunar backdrop-blur-sm transition-colors hover:bg-lunar hover:text-void"
              >
                <span aria-hidden>{open === i ? "−" : "+"}</span>
                <span className="sr-only">{l(s.label)}</span>
              </button>
              <span className="hidden whitespace-nowrap border border-hairline-strong bg-void/75 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-lunar backdrop-blur-sm md:inline">
                {l(s.label)}
              </span>
            </div>
            <AnimatePresence>
              {open === i && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`absolute mt-2 w-64 border border-hairline-strong bg-void/90 p-3 backdrop-blur-md ${flip ? "right-0" : "left-0"}`}
                >
                  <p className="mb-2 text-[12.5px] leading-snug text-lunar md:hidden">{l(s.label)}</p>
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-lunar-2">{t("ml.spotSource")}</p>
                  <div className="mt-1.5">
                    <SourceLink id={s.source} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </>
  );
}

/* ───────────────────────── info panel ───────────────────────── */

type Tab = "story" | "remains" | "matters";

function InfoPanel({ pair, data }: { pair: LensPair; data: MuseumData }) {
  const { t, l, lang } = useT();
  const { open } = useCapsule();
  const [tab, setTab] = useState<Tab>("story");
  const obj = pair.object ? data.byId.get(pair.object) : undefined;
  const story = obj ? data.storyFor(obj.id) : undefined;
  const now = data.image(pair.now.image);
  const then = data.image(pair.then.image);
  const coords = obj ? formatCoords(obj, lang) : null;
  const matters: Localized | undefined = pair.matters ?? story?.kept;
  const tabs: { id: Tab; label: string }[] = [
    { id: "story", label: t("ml.tabStory") },
    { id: "remains", label: t("ml.tabRemains") },
    ...(matters ? [{ id: "matters" as Tab, label: t("ml.tabMatters") }] : []),
  ];

  return (
    <motion.div key={pair.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }}>
      <Panel className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-mono text-[clamp(1.05rem,1.5vw,1.3rem)] uppercase leading-tight tracking-[0.16em] text-lunar">{l(pair.short)}</h2>
            {obj && <p className="mt-1 font-mono text-[12px] uppercase tracking-[0.14em] text-lunar-2">{l(obj.properties.name).split(" · ")[0]}</p>}
            {coords && (
              <p className="mt-1 font-mono text-[10.5px] tracking-[0.08em] text-lunar-2">
                {coords}
                <span title={t("common.required")} className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full border border-caution align-middle">
                  <span className="sr-only">{t("common.required")}</span>
                </span>
              </p>
            )}
          </div>
          {then && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={assetPath(then.thumb)} alt="" className="h-16 w-20 shrink-0 object-cover" />
          )}
        </div>
        {obj && (
          <p className="mt-3 flex items-center gap-4 border-t border-hairline pt-3 font-mono text-[10.5px] uppercase tracking-[0.16em]">
            <span className="text-lunar-2">{t("ml.status")}</span>
            <span style={{ color: obj.properties.status === "active" ? "#63e6ef" : EMBER }}>{t(`common.status.${obj.properties.status}` as const)}</span>
          </p>
        )}
        <div role="tablist" aria-label={l(pair.short)} className="mt-4 flex border-b border-hairline">
          {tabs.map((x) => (
            <button
              key={x.id}
              role="tab"
              type="button"
              aria-selected={tab === x.id}
              onClick={() => setTab(x.id)}
              className={`relative flex-1 px-1 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${tab === x.id ? "text-lunar" : "text-lunar-2 hover:text-lunar"}`}
            >
              {x.label}
              {tab === x.id && <span aria-hidden className="absolute inset-x-2 -bottom-px h-0.5" style={{ background: COOL, boxShadow: `0 0 8px ${COOL}` }} />}
            </button>
          ))}
        </div>
        <div role="tabpanel" className="min-h-[7.5rem] pt-4 text-[13px] leading-relaxed text-lunar-2">
          {tab === "story" && <p>{l(pair.caption)}</p>}
          {tab === "remains" && now && (
            <div>
              <p className="text-lunar">{now.title}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em]">
                {now.credit} · {t("ml.released", { date: formatDate(now.date, lang) })}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <VerificationBadge status="verified" />
                <SourceLink id={`img:${pair.now.image}`} />
              </div>
            </div>
          )}
          {tab === "matters" && matters && <p>{l(matters)}</p>}
        </div>
        {obj ? (
          <button
            type="button"
            onClick={() => open(obj.id)}
            className="group mt-4 flex w-full items-center justify-center gap-4 border py-3.5 font-mono text-[12px] uppercase tracking-[0.24em] text-lunar transition-colors hover:bg-[#ef6a3a]/15"
            style={{ borderColor: EMBER, boxShadow: `0 0 22px -8px ${EMBER}` }}
          >
            {t("ml.enter")}
            <span aria-hidden className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </button>
        ) : (
          now && (
            <a
              href={now.page}
              target="_blank"
              rel="noreferrer noopener"
              className="group mt-4 flex w-full items-center justify-center gap-4 border py-3.5 font-mono text-[12px] uppercase tracking-[0.2em] text-lunar transition-colors hover:bg-[#ef6a3a]/15"
              style={{ borderColor: EMBER }}
            >
              {t("ml.viewSource")} ↗
            </a>
          )
        )}
      </Panel>
    </motion.div>
  );
}

/* ───────────────────────── moments ───────────────────────── */

interface Moment {
  key: string;
  image: string;
  when: string;
  what: string;
}

function Moments({ pair, data }: { pair: LensPair; data: MuseumData }) {
  const { t, l, lang } = useT();
  const { open } = useCapsule();
  const obj = pair.object ? data.byId.get(pair.object) : undefined;
  const story = obj ? data.storyFor(obj.id) : undefined;

  const moments = useMemo<Moment[]>(() => {
    const out: Moment[] = [{ key: "then", image: pair.then.image, when: localizeDigits(pair.then.year, lang), what: data.image(pair.then.image)?.title ?? "" }];
    for (const c of story?.chapters ?? []) {
      if (c.image && c.image !== pair.then.image && c.image !== pair.now.image) out.push({ key: c.image, image: c.image, when: l(c.kicker), what: l(c.title) });
    }
    out.push({ key: "now", image: pair.now.image, when: localizeDigits(pair.now.year, lang), what: data.image(pair.now.image)?.title ?? "" });
    return out;
  }, [pair, story, data, l, lang]);

  const go = (m: Moment) => {
    if (obj) open(obj.id);
    else window.open(data.image(m.image)?.page, "_blank", "noopener");
  };

  return (
    <section aria-label={t("ml.move")} className="mt-8 grid gap-6 border-t border-hairline pt-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className="border-l border-hairline-strong pl-4">
        <h2 className="font-mono text-[12px] uppercase leading-relaxed tracking-[0.24em] text-lunar">{t("ml.move")}</h2>
        <p className="mt-2 text-[12px] text-lunar-2">{t("ml.moveDek")}</p>
      </div>
      <div className="min-w-0">
        <div className="mb-3 flex items-center gap-4">
          <span className="font-mono text-base text-lunar">{moments[0]?.when}</span>
          <span aria-hidden className="relative h-px flex-1 bg-hairline-strong">
            {moments.map((m, i) => (
              <span
                key={m.key}
                className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ left: `${moments.length > 1 ? (i / (moments.length - 1)) * 100 : 0}%`, background: i === 0 ? EMBER : "#ecebe6", boxShadow: i === 0 ? `0 0 10px ${EMBER}` : undefined }}
              />
            ))}
          </span>
          <span className="font-mono text-base text-lunar">{moments[moments.length - 1]?.when}</span>
        </div>
        <ol className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
          {moments.map((m, i) => {
            const img = data.image(m.image);
            return (
              <li key={m.key} className="w-[260px] shrink-0">
                <button
                  type="button"
                  onClick={() => go(m)}
                  className={`group grid w-full grid-cols-[96px_minmax(0,1fr)] items-center gap-3 border bg-void/70 p-2 text-left transition-colors ${i === 0 ? "border-[#ef6a3a]" : "border-hairline-strong hover:border-lunar-2"}`}
                  style={i === 0 ? { boxShadow: `0 0 24px -8px ${EMBER}` } : undefined}
                >
                  <span className="block h-16 overflow-hidden bg-void-3">
                    {img && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={assetPath(img.thumb)} alt="" className="h-full w-full object-cover grayscale transition duration-700 group-hover:grayscale-0" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-mono text-[12px] uppercase tracking-[0.08em] text-lunar">{m.when}</span>
                    <span className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-lunar-2">{m.what}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
