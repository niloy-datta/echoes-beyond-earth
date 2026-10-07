"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { EMBER, Filmstrip, MachineRail, Panel, PlanetSphere, Thumb, useYearsLabel } from "@/components/mission/Mission";
import { SourceLink, VerificationBadge } from "@/components/ui";
import { assetPath } from "@/lib/asset-path";
import { useCapsule } from "@/lib/capsule";
import { useMuseum, type MuseumData } from "@/lib/data";
import { useT } from "@/lib/i18n";
import { usePassport } from "@/lib/passport";
import { useSettings } from "@/lib/settings";
import type { Localized, MissionFeature, Verification } from "@/lib/types";

const EASE = [0.22, 1, 0.36, 1] as const;

interface Edge {
  from: string;
  to: string;
  relation: Localized;
  source: string | null;
  verification: Verification;
}

/** Every ripple ring becomes a directed edge; a machine's legacy is read in both directions. */
function edgesOf(data: MuseumData | null): Edge[] {
  return (data?.stories.ripples ?? []).flatMap((r) => r.rings.map((g) => ({ from: r.from, to: g.to, relation: g.relation, source: g.source, verification: g.verification })));
}

export function LegacyRipple() {
  const { data } = useMuseum();
  const { t } = useT();
  const { mark } = usePassport();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const edges = useMemo(() => edgesOf(data), [data]);
  const connected = useMemo(() => new Set(edges.flatMap((e) => [e.from, e.to])), [edges]);
  const byArrival = useMemo(() => [...(data?.objects ?? [])].sort((a, b) => a.properties.arrived.date.localeCompare(b.properties.arrived.date)), [data]);
  const rail = useMemo(() => byArrival.filter((f) => connected.has(f.id)), [byArrival, connected]);

  useEffect(() => {
    if (!data || selectedId) return;
    const fromUrl = new URLSearchParams(window.location.search).get("m");
    setSelectedId(fromUrl && data.byId.has(fromUrl) ? fromUrl : data.byId.has("opportunity") ? "opportunity" : (rail[0]?.id ?? null));
  }, [data, rail, selectedId]);

  const select = useCallback(
    (id: string) => {
      setSelectedId(id);
      mark("ripples", id);
      const url = new URL(window.location.href);
      url.searchParams.set("m", id);
      history.replaceState(null, "", url.pathname + url.search + url.hash);
    },
    [mark],
  );

  const selected = selectedId ? data?.byId.get(selectedId) : undefined;
  if (!data || !selected) return null;

  return (
    <div className="relative isolate min-h-svh overflow-hidden">
      <Backdrop feature={selected} />
      <div className="container-x relative pb-8 pt-[calc(var(--header-h)+1.5rem)]">
        <div className="grid gap-10 xl:grid-cols-[250px_minmax(0,1fr)] xl:gap-10">
          <div className="order-2 xl:order-1">
            <MachineRail title={t("lg2.railTitle")} dek={t("lg2.railDek")} items={rail} selectedId={selected.id} onSelect={select} />
          </div>
          <div className="order-1 min-w-0 xl:order-2">
            <Header />
            <Network key={selected.id} feature={selected} edges={edges} onFollow={select} />
          </div>
        </div>
        <div className="mt-10">
          <Filmstrip
            title={t("lg2.journey")}
            dek={t("lg2.journeyDek")}
            items={byArrival}
            selectedId={selected.id}
            onSelect={select}
            isSelectable={(f) => connected.has(f.id)}
          />
        </div>
      </div>
    </div>
  );
}

function Backdrop({ feature }: { feature: MissionFeature }) {
  const { data } = useMuseum();
  const isMars = feature.properties.body === "mars";
  const img = data?.image(feature.properties.image);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={img.file}
          src={assetPath(img.file)}
          alt=""
          className="absolute inset-x-0 bottom-0 h-[70%] w-full object-cover opacity-60"
          style={{
            maskImage: "linear-gradient(to bottom, transparent 0%, black 45%, black 70%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 45%, black 70%, transparent 100%)",
            filter: isMars ? "sepia(0.6) saturate(2.4) hue-rotate(-14deg) brightness(0.45)" : "grayscale(0.5) brightness(0.45)",
          }}
        />
      )}
      {isMars ? (
        <PlanetSphere className="absolute left-[38%] top-[6svh] w-[30vw] min-w-[260px] opacity-90" />
      ) : (
        data?.image("GSFC_20171208_Archive_e001861") && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={assetPath(data.image("GSFC_20171208_Archive_e001861")!.file)}
            alt=""
            className="absolute left-[40%] top-[6svh] w-[28vw] min-w-[240px] rounded-full opacity-70"
            style={{ filter: "brightness(0.7)", boxShadow: "0 0 80px rgba(200,210,230,0.15)" }}
          />
        )
      )}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_55%_60%,rgba(239,106,58,0.16),transparent_60%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[35%] bg-gradient-to-t from-void via-void/80 to-transparent" />
    </div>
  );
}

function Header() {
  const { t } = useT();
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.42em] text-lunar-2">{t("lg2.eyebrow")}</p>
        <h1 className="mt-4 font-display text-[clamp(2.3rem,5.4vw,4.6rem)] font-bold uppercase leading-[0.98] tracking-[-0.01em]">
          <span className="block bg-[linear-gradient(180deg,#ffffff,#b9c2cc)] bg-clip-text text-transparent">{t("lg2.line1")}</span>
          <span className="block bg-[linear-gradient(180deg,#ffb48a,#ef6a3a_60%,#c2451c)] bg-clip-text text-transparent">{t("lg2.line2")}</span>
        </h1>
        <p className="mt-4 max-w-md font-mono text-[12px] leading-relaxed tracking-[0.12em] text-lunar-2">{t("lg2.dek")}</p>
      </div>
      <ul className="flex shrink-0 gap-5 font-mono text-[10px] uppercase tracking-[0.14em] text-lunar-2 lg:flex-col lg:gap-2 lg:pt-2">
        <li className="flex items-center gap-2">
          <span className="h-px w-6 bg-signal shadow-[0_0_6px_#63e6ef]" /> {t("lg2.legendVerified")}
        </li>
        <li className="flex items-center gap-2">
          <span className="h-px w-6 border-t border-dashed border-caution" /> {t("lg2.legendRequired")}
        </li>
      </ul>
    </div>
  );
}

interface Line {
  d: string;
  kind: "record" | "verified" | "required";
}

function Network({ feature, edges, onFollow }: { feature: MissionFeature; edges: Edge[]; onFollow: (id: string) => void }) {
  const { data } = useMuseum();
  const { t, l } = useT();
  const { open } = useCapsule();
  const { reducedMotion } = useSettings();
  const years = useYearsLabel();
  const p = feature.properties;
  const story = data?.storyFor(p.id);
  const records = (story?.facts ?? []).filter((f) => f.verification === "verified").slice(0, 3);
  const chapterImages = (story?.chapters ?? []).map((c) => c.image).filter(Boolean) as string[];
  const builtOn = edges.filter((e) => e.to === p.id);
  const passedOn = edges.filter((e) => e.from === p.id);
  const links = [...builtOn.map((e) => ({ e, dir: "in" as const, other: e.from })), ...passedOn.map((e) => ({ e, dir: "out" as const, other: e.to }))];

  // Measure anchors and draw curves from the machine to each record and connection.
  const box = useRef<HTMLDivElement>(null);
  const center = useRef<HTMLSpanElement>(null);
  const leftAnchors = useRef<(HTMLSpanElement | null)[]>([]);
  const rightAnchors = useRef<(HTMLSpanElement | null)[]>([]);
  const [lines, setLines] = useState<Line[]>([]);

  useLayoutEffect(() => {
    const measure = () => {
      const b = box.current?.getBoundingClientRect();
      const c = center.current?.getBoundingClientRect();
      if (!b || !c || window.innerWidth < 1024) return setLines([]);
      const cx = c.left + c.width / 2 - b.left;
      const cy = c.top + c.height / 2 - b.top;
      const curve = (x: number, y: number) => `M ${cx} ${cy} C ${(cx + x) / 2} ${cy}, ${(cx + x) / 2} ${y}, ${x} ${y}`;
      const out: Line[] = [];
      leftAnchors.current.forEach((el) => {
        const r = el?.getBoundingClientRect();
        if (r) out.push({ d: curve(r.left + r.width / 2 - b.left, r.top + r.height / 2 - b.top), kind: "record" });
      });
      rightAnchors.current.forEach((el, i) => {
        const r = el?.getBoundingClientRect();
        if (r) out.push({ d: curve(r.left + r.width / 2 - b.left, r.top + r.height / 2 - b.top), kind: links[i]?.e.verification === "verified" ? "verified" : "required" });
      });
      setLines(out);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (box.current) ro.observe(box.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feature.id, records.length, links.length]);

  return (
    <div ref={box} className="relative mt-8 grid gap-8 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)_minmax(0,370px)] lg:gap-6">
      {/* Curves */}
      <svg aria-hidden className="pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible lg:block">
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {lines.map((ln, i) => (
          <motion.path
            key={`${feature.id}-${i}`}
            d={ln.d}
            fill="none"
            filter="url(#glow)"
            stroke={ln.kind === "record" ? EMBER : ln.kind === "verified" ? "#63e6ef" : "#d9b26f"}
            strokeWidth={ln.kind === "record" ? 1.4 : 1.6}
            strokeDasharray={ln.kind === "required" ? "4 6" : undefined}
            strokeOpacity={0.85}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: reducedMotion ? 0 : 1.4, delay: reducedMotion ? 0 : 0.2 + i * 0.12, ease: EASE }}
          />
        ))}
      </svg>

      {/* Key records */}
      <Panel accent className="relative order-2 self-center p-4 lg:order-1">
        <h2 className="font-mono text-[12px] uppercase tracking-[0.22em] text-lunar">{t("lg2.records")}</h2>
        {records.length ? (
          <ul className="mt-3 flex flex-col gap-3">
            {records.map((f, i) => {
              const img = data?.image(chapterImages[i % Math.max(chapterImages.length, 1)] ?? p.image);
              return (
                <li key={i} className="relative grid grid-cols-[64px_minmax(0,1fr)] gap-3 border-t border-hairline pt-3">
                  <span className="block h-14 w-16 overflow-hidden bg-void-3">
                    {img && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={assetPath(img.thumb)} alt="" className="h-full w-full object-cover sepia-[.4] saturate-150" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-lunar">{l(f.label)}</p>
                    <p className="mt-1 text-[12px] leading-snug text-lunar-2">{l(f.value)}</p>
                    <button type="button" onClick={() => open(p.id)} className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-lunar-2 hover:text-lunar">
                      {t("common.openCapsule")} →
                    </button>
                  </div>
                  <span
                    ref={(el) => {
                      leftAnchors.current[i] = el;
                    }}
                    aria-hidden
                    className="absolute -right-[22px] top-1/2 hidden h-2.5 w-2.5 -translate-y-1/2 rounded-full border lg:block"
                    style={{ borderColor: EMBER, boxShadow: `0 0 10px ${EMBER}` }}
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-[13px] leading-relaxed text-lunar-2">{t("lg2.noRecords")}</p>
        )}
      </Panel>

      {/* The machine */}
      <div className="order-1 flex flex-col items-center justify-center py-6 lg:order-2 lg:py-0">
        <div className="relative flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: EASE }}
            className="relative h-40 w-40 overflow-hidden rounded-full border md:h-52 md:w-52"
            style={{ borderColor: `${EMBER}aa`, boxShadow: `0 0 60px -6px ${EMBER}` }}
          >
            <Thumb feature={feature} active className="h-full w-full" />
          </motion.div>
          {/* ripple rings on the ground */}
          {!reducedMotion &&
            [0, 1, 2].map((i) => (
              <motion.span
                key={i}
                aria-hidden
                className="absolute top-1/2 h-24 w-[22rem] -translate-y-1/2 rounded-[50%] border"
                style={{ borderColor: `${EMBER}55` }}
                initial={{ scale: 0.6, opacity: 0.9 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 4, delay: i * 1.3, repeat: Infinity, ease: "easeOut" }}
              />
            ))}
          <span ref={center} aria-hidden className="absolute left-1/2 top-1/2 h-1 w-1" />
          <div className="mt-5 text-center">
            <p className="font-mono text-[clamp(1.1rem,1.8vw,1.5rem)] uppercase tracking-[0.12em] text-lunar">{l(p.name).split(" (")[0].split(" · ")[0]}</p>
            <p className="mt-1 font-mono text-[12px] tracking-[0.12em] text-lunar-2">{years(feature)}</p>
            <span className="mt-2 inline-block border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ borderColor: EMBER, color: EMBER }}>
              {t(`common.status.${p.status}` as const)}
            </span>
          </div>
        </div>
      </div>

      {/* Connections */}
      <div className="order-3 flex flex-col gap-3 self-center">
        <h2 className="font-mono text-[12px] uppercase tracking-[0.22em] text-lunar">{t("lg2.connections")}</h2>
        {links.length === 0 && (
          <Panel className="p-4">
            <p className="text-[13px] leading-relaxed text-lunar-2">{t("lg2.none")}</p>
          </Panel>
        )}
        <AnimatePresence>
          {links.map(({ e, dir, other }, i) => {
            const target = data?.byId.get(other);
            if (!target) return null;
            const verified = e.verification === "verified";
            return (
              <motion.div
                key={`${other}-${dir}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.3 + i * 0.1, ease: EASE }}
                className="relative"
              >
                <span
                  ref={(el) => {
                    rightAnchors.current[i] = el;
                  }}
                  aria-hidden
                  className="absolute -left-[22px] top-1/2 hidden h-3 w-3 -translate-y-1/2 rounded-full border-2 bg-void lg:block"
                  style={{ borderColor: verified ? "#63e6ef" : "#d9b26f", boxShadow: verified ? "0 0 12px #63e6ef" : undefined }}
                />
                <Panel className={`grid grid-cols-[88px_minmax(0,1fr)] gap-4 p-3 ${verified ? "!border-signal/40 shadow-[0_0_30px_-12px_#63e6ef]" : ""}`}>
                  <Thumb feature={target} className="h-full min-h-[84px] w-full" />
                  <div className="min-w-0">
                    <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-lunar-2">{dir === "in" ? t("lg2.inherited") : t("lg2.passed")}</p>
                    <p className="mt-0.5 font-mono text-[14px] uppercase tracking-[0.08em] text-lunar">{l(target.properties.name).split(" (")[0].split(" · ")[0]}</p>
                    <p className="font-mono text-[11px] tracking-[0.1em] text-lunar-2">{years(target)}</p>
                    <p className="mt-1.5 text-[12px] leading-snug text-lunar-2">{l(e.relation)}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <VerificationBadge status={e.verification} />
                      {e.source && <SourceLink id={e.source} className="!text-[11px]" />}
                    </div>
                    <button
                      type="button"
                      onClick={() => onFollow(target.id)}
                      className="mt-2.5 inline-flex items-center gap-2 border border-lunar-2/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-lunar transition-colors hover:bg-lunar hover:text-void"
                    >
                      {t("lg2.view")} →
                    </button>
                  </div>
                </Panel>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* What kept traveling */}
      {story && (
        <Panel className="order-4 flex items-start gap-4 p-4 lg:col-span-1 lg:col-start-2">
          <span aria-hidden className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-hairline-strong text-lunar-2">
            ◎
          </span>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-lunar">{t("lg2.kept")}</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-lunar-2">{l(story.kept)}</p>
          </div>
        </Panel>
      )}
    </div>
  );
}
