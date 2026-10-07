"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EMBER, Filmstrip, MachineRail, Panel, SpaceBackdrop, Thumb, useYearsLabel } from "@/components/mission/Mission";
import { SourceLink } from "@/components/ui";
import { useCapsule } from "@/lib/capsule";
import { useMuseum } from "@/lib/data";
import { formatDate, localizeDigits, yearOf } from "@/lib/dates";
import { useT } from "@/lib/i18n";
import { usePassport } from "@/lib/passport";
import { useSettings } from "@/lib/settings";
import { useSound } from "@/lib/sound";
import type { MissionFeature, Verification } from "@/lib/types";

const EASE = [0.22, 1, 0.36, 1] as const;
// Passive laser retroreflectors confirmed by the NASA captions in sources.json (img:as11-37-5551, img:PIA13037).
const REFLECTORS = new Set(["apollo-11", "apollo-15"]);

type Phase = "idle" | "outbound" | "listening" | "echo" | "silence";

export function LastSignal() {
  const { data } = useMuseum();
  const { t } = useT();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const silent = useMemo(() => (data?.objects ?? []).filter((f) => f.properties.status !== "active"), [data]);
  // Rail: the machines with a full story, most recently silent first.
  const rail = useMemo(
    () =>
      silent
        .filter((f) => data?.storyFor(f.id))
        .sort((a, b) => (b.properties.end?.date ?? b.properties.arrived.date).localeCompare(a.properties.end?.date ?? a.properties.arrived.date)),
    [silent, data],
  );
  // Film strip: every silent machine, in order of arrival.
  const strip = useMemo(() => [...silent].sort((a, b) => a.properties.arrived.date.localeCompare(b.properties.arrived.date)), [silent]);

  useEffect(() => {
    if (!data || selectedId) return;
    const fromUrl = new URLSearchParams(window.location.search).get("m");
    setSelectedId(fromUrl && data.byId.has(fromUrl) ? fromUrl : data.byId.has("opportunity") ? "opportunity" : (rail[0]?.id ?? null));
  }, [data, rail, selectedId]);

  const select = useCallback((id: string) => {
    setSelectedId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("m", id);
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, []);

  const selected = selectedId ? data?.byId.get(selectedId) : undefined;
  if (!data || !selected) return null;
  // The machine's own photograph sets the scene (chapter images can be diagrams).
  const ground = data.image(selected.properties.image ?? data.storyFor(selected.id)?.chapters.find((c) => c.image)?.image)?.file;

  return (
    <div className="relative isolate min-h-svh overflow-hidden">
      <SpaceBackdrop groundImage={ground} tone={selected.properties.body === "mars" ? "ember" : "cool"} />
      <div className="container-x relative pb-8 pt-[calc(var(--header-h)+1.5rem)]">
        <div className="grid gap-10 xl:grid-cols-[260px_minmax(0,1fr)_340px] xl:gap-8">
          <div className="order-2 xl:order-1">
            <MachineRail title={t("ls2.choose")} dek={t("ls2.chooseDek")} items={rail} selectedId={selected.id} onSelect={select} />
          </div>
          <div className="order-1 xl:order-2">
            <Stage key={selected.id} feature={selected} />
          </div>
          <div className="order-3">
            <InfoPanel feature={selected} />
          </div>
        </div>
        <div className="mt-10">
          <Filmstrip title={t("ls2.timeline")} dek={t("ls2.timelineDek")} items={strip} selectedId={selected.id} onSelect={select} />
        </div>
      </div>
    </div>
  );
}

function Stage({ feature }: { feature: MissionFeature }) {
  const { data } = useMuseum();
  const { t, l, lang } = useT();
  const { reducedMotion } = useSettings();
  const { ping } = useSound();
  const { mark } = usePassport();
  const { open } = useCapsule();
  const [phase, setPhase] = useState<Phase>("idle");
  const timers = useRef<number[]>([]);
  const p = feature.properties;
  const story = data?.storyFor(p.id);
  const reflector = REFLECTORS.has(p.id);
  const isMars = p.body === "mars";
  const travel = reducedMotion ? 0.01 : isMars ? 4.2 : 1.9; // compressed; real light time is stated in text

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);
  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));

  const send = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setPhase("outbound");
    ping(0.9, 1318.5);
    later(travel * 1000, () => {
      mark("signals", p.id);
      if (reflector) {
        setPhase("echo");
        ping(0.5, 1975.5);
        later(travel * 1000 + 500, () => setPhase("silence"));
      } else {
        setPhase("listening");
        later(reducedMotion ? 300 : 2400, () => setPhase("silence"));
      }
    });
  };

  const busy = phase === "outbound" || phase === "listening" || phase === "echo";
  const lightText = isMars ? t("ls.lightMars") : t("ls.lightMoon");

  return (
    <section aria-labelledby="ls-title" className="flex flex-col items-center text-center">
      {/* Earth → world link */}
      <div className="relative w-full max-w-3xl">
        <svg viewBox="0 0 1000 150" className="h-auto w-full overflow-visible" role="img" aria-label={`${t("ls.earth")} → ${l(p.name)}`}>
          <defs>
            <linearGradient id="ls-line" x1="0" x2="1">
              <stop offset="0" stopColor="#9cc7ff" stopOpacity="0.8" />
              <stop offset="1" stopColor={isMars ? EMBER : "#ecebe6"} stopOpacity="0.9" />
            </linearGradient>
          </defs>
          <path d="M60 110 Q 500 20 940 80" fill="none" stroke="url(#ls-line)" strokeWidth="1.2" strokeDasharray="2 7" />
          {phase === "outbound" && !reducedMotion && (
            <motion.path
              d="M60 110 Q 500 20 940 80"
              fill="none"
              stroke="#cfe3ff"
              strokeWidth="2"
              initial={{ pathLength: 0, opacity: 1 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: travel, ease: "linear" }}
            />
          )}
          {phase === "echo" && !reducedMotion && (
            <motion.path
              d="M940 80 Q 500 20 60 110"
              fill="none"
              stroke="#63e6ef"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: travel, ease: "linear" }}
            />
          )}
          <circle cx="60" cy="110" r="5" fill="#cfe3ff" />
          <circle cx="60" cy="110" r="12" fill="none" stroke="#9cc7ff" strokeOpacity="0.5" />
          <text x="60" y="142" textAnchor="middle" className="fill-lunar font-mono text-[15px] uppercase tracking-[0.2em]">
            {t("ls.earth")}
          </text>
          <circle cx="940" cy="80" r="6" fill={isMars ? EMBER : "#ecebe6"} />
          <circle cx="940" cy="80" r="14" fill="none" stroke={isMars ? EMBER : "#ecebe6"} strokeOpacity="0.5" />
          {phase === "listening" && !reducedMotion && (
            <motion.circle cx="940" cy="80" fill="none" stroke={EMBER} initial={{ r: 14, opacity: 0.8 }} animate={{ r: 80, opacity: 0 }} transition={{ duration: 2.2, ease: "easeOut" }} />
          )}
          <text x="940" y="54" textAnchor="middle" className="fill-lunar font-mono text-[15px] uppercase tracking-[0.2em]">
            {t(`common.body.${p.body}` as const)}
          </text>
        </svg>
        <p className="mx-auto -mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-lunar">
          {busy ? t("ls2.transmitting") : t("ls2.ready")}
        </p>
      </div>

      <h1 id="ls-title" className="mt-8 font-mono text-[clamp(1.1rem,2vw,1.8rem)] uppercase tracking-[0.2em] text-lunar sm:tracking-[0.36em]">
        {t("ls2.title")}
      </h1>
      <p className="mt-3 max-w-xl font-mono text-[11px] uppercase leading-relaxed tracking-[0.08em] text-lunar-2 sm:tracking-[0.18em]">{lightText}</p>

      <button
        type="button"
        onClick={send}
        disabled={busy}
        className="group relative mt-8 inline-flex items-center gap-4 border px-6 py-4 font-mono text-[13px] uppercase tracking-[0.16em] sm:px-10 sm:tracking-[0.24em] text-lunar transition-[background-color,box-shadow] disabled:cursor-wait disabled:opacity-60"
        style={{ borderColor: EMBER, boxShadow: `0 0 30px -6px ${EMBER}, inset 0 0 18px -8px ${EMBER}` }}
      >
        <span aria-hidden className="absolute -left-2 -top-2 h-3 w-3 border-l border-t border-lunar-2/70" />
        <span aria-hidden className="absolute -bottom-2 -right-2 h-3 w-3 border-b border-r border-lunar-2/70" />
        <span aria-hidden style={{ color: EMBER }}>
          ((·))
        </span>
        {phase === "silence" ? t("ls2.again") : t("ls2.send")}
        <span aria-hidden className="transition-transform group-hover:translate-x-1">
          →
        </span>
      </button>
      <p className="mt-3 font-mono text-[9.5px] uppercase tracking-[0.18em] text-dust">{t("ls2.simulated")}</p>

      <div aria-live="polite" className="mt-8 w-full max-w-2xl">
        <AnimatePresence mode="wait">
          {phase === "silence" && (
            <motion.div key="result" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 1, ease: EASE }}>
              <Panel className="px-6 py-6 md:px-8">
                <div className="flex items-center justify-between gap-4 border-b border-hairline pb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-lunar-2">
                  <span>{t("ls2.complete")}</span>
                  <span>{l(p.name).split(" (")[0]}</span>
                </div>
                <p className="mt-5 font-display text-[clamp(2.6rem,6vw,4.6rem)] font-bold uppercase leading-none tracking-tight">
                  {reflector ? (
                    <>
                      <span className="text-signal">{t("ls2.echoA")}</span> <span className="text-lunar">{t("ls2.echoB")}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-lunar">{t("ls2.no")}</span> <span style={{ color: EMBER }}>{t("ls2.response")}</span>
                    </>
                  )}
                </p>
                <p className="mt-4 font-mono text-[12px] uppercase tracking-[0.26em] text-lunar">{reflector ? t("ls.echo") : t("ls2.notEnd")}</p>
                {story?.lastSignal && (
                  <p className="mx-auto mt-4 max-w-lg text-[14px] leading-relaxed text-lunar-2">
                    {formatDate(story.lastSignal.date, lang)} — {l(story.lastSignal.text)}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => open(p.id)}
                  className="group mt-6 inline-flex items-center gap-4 border border-lunar/70 bg-void/50 px-7 py-3.5 font-mono text-[12px] uppercase tracking-[0.22em] text-lunar transition-colors hover:bg-lunar hover:text-void"
                >
                  {t("ls2.discover")}
                  <span aria-hidden className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </button>
              </Panel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {story && (
        <div className="mt-8 max-w-md self-start text-left xl:-ml-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: EMBER }}>
            {t("ls2.kept")}
          </p>
          <p className="mt-2 font-serif text-[clamp(1.15rem,1.8vw,1.5rem)] italic leading-snug text-lunar">{l(story.kept)}</p>
        </div>
      )}
    </section>
  );
}

function Dot({ v }: { v: Verification }) {
  const { t } = useT();
  return (
    <span
      title={v === "verified" ? t("common.verified") : t("common.required")}
      className={`ml-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full align-middle ${v === "verified" ? "bg-signal" : "border border-caution"}`}
    >
      <span className="sr-only">{v === "verified" ? t("common.verified") : t("common.required")}</span>
    </span>
  );
}

function InfoPanel({ feature }: { feature: MissionFeature }) {
  const { data } = useMuseum();
  const { t, l, lang } = useT();
  const years = useYearsLabel();
  const p = feature.properties;
  const story = data?.storyFor(p.id);
  const a = yearOf(p.arrived.date);
  const e = yearOf(p.end?.date ?? null);
  const span = a != null && e != null ? e - a : null;
  // Verified facts, minus any that repeat the end-of-mission row.
  const facts = (story?.facts ?? [])
    .filter((f) => f.verification === "verified" && (!p.end || f.label.en !== p.end.label.en))
    .slice(0, 3);

  const rows: { label: string; value: string; v?: Verification; accent?: boolean }[] = [
    { label: t("ls2.signalStatus"), value: t(`common.status.${p.status}` as const), accent: true, v: p.statusVerification },
    ...(p.end ? [{ label: l(p.end.label), value: formatDate(p.end.date, lang), v: p.end.verification }] : []),
    { label: t("ls2.duration"), value: span == null ? years(feature) : span < 1 ? t("ls2.lessThanYear") : t("ls2.aboutYears", { n: localizeDigits(span, lang) }) },
    { label: t("common.site"), value: l(p.site) },
    ...facts.map((f) => ({ label: l(f.label), value: l(f.value), v: f.verification })),
  ];

  return (
    <motion.div key={feature.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, ease: EASE }}>
      <Panel className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-lunar-2">{p.mission}</p>
            <h2 className="mt-1 font-mono text-[clamp(1.3rem,2vw,1.7rem)] font-semibold uppercase leading-tight tracking-[0.06em] text-lunar">
              {l(p.name).split(" (")[0].split(" · ")[0]}
            </h2>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-lunar-2">
              {t(`common.kind.${p.kind}` as const)} · {t(`common.body.${p.body}` as const)}
            </p>
          </div>
          <Thumb feature={feature} className="h-16 w-24 shrink-0" />
        </div>
        <dl className="mt-4 divide-y divide-hairline border-t border-hairline">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-4 py-2.5">
              <dt className="font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-lunar-2">{r.label}</dt>
              <dd className="font-mono text-[11.5px] uppercase leading-relaxed tracking-[0.06em]" style={{ color: r.accent && p.status !== "active" ? EMBER : undefined }}>
                <span className={r.accent ? "" : "text-lunar"}>{r.value}</span>
                {r.v && <Dot v={r.v} />}
              </dd>
            </div>
          ))}
        </dl>
        {facts[0]?.source && (
          <div className="mt-3 border-t border-hairline pt-3">
            <SourceLink id={facts[0].source} />
          </div>
        )}
      </Panel>
    </motion.div>
  );
}
