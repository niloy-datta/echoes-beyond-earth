"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StatusDot, VerificationBadge } from "@/components/ui";
import { useCapsule } from "@/lib/capsule";
import { useMuseum } from "@/lib/data";
import { formatDate, localizeDigits, yearOf } from "@/lib/dates";
import { formatCoords } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { usePassport } from "@/lib/passport";
import { useSettings } from "@/lib/settings";
import { useSound } from "@/lib/sound";
import { YEAR_MAX, YEAR_MIN, stateInYear } from "@/lib/timeline";
import type { Body, MissionFeature } from "@/lib/types";
import { PlanetMap, type MapStatus } from "./PlanetMap";

export function Explorer() {
  const { data } = useMuseum();
  const params = useSearchParams();
  const { t, l, lang } = useT();
  const { reducedMotion } = useSettings();
  const { mark } = usePassport();
  const { open } = useCapsule();
  const { ping } = useSound();

  const initialBody = params.get("body") === "mars" ? "mars" : "moon";
  const [body, setBody] = useState<Body>(initialBody);
  const [year, setYear] = useState(YEAR_MAX);
  const [playing, setPlaying] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(params.get("focus"));
  const [mapStatus, setMapStatus] = useState<MapStatus>("loading");
  const [listOpen, setListOpen] = useState(false);

  const features = useMemo(
    () =>
      (data?.objects ?? [])
        .filter((f) => f.properties.body === body)
        .sort((a, b) => a.properties.arrived.date.localeCompare(b.properties.arrived.date)),
    [data, body],
  );
  const selected = selectedId ? data?.byId.get(selectedId) : undefined;
  const onSurface = features.filter((f) => stateInYear(f.properties, year) !== "future").length;

  const select = useCallback(
    (id: string) => {
      setSelectedId(id);
      mark("discovered", id);
      ping(0.35, 1174.7);
      setListOpen(false);
    },
    [mark, ping],
  );

  useEffect(() => {
    if (selectedId && data?.byId.has(selectedId)) mark("discovered", selectedId);
    // only on first data arrival for a deep-linked focus
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Time Machine playback — about four years per second; a soft tone when something lands.
  const prevCount = useRef(onSurface);
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setYear((y) => {
        if (y >= YEAR_MAX) {
          setPlaying(false);
          return y;
        }
        return y + 1;
      });
    }, 260);
    return () => window.clearInterval(id);
  }, [playing]);
  useEffect(() => {
    if (playing && onSurface > prevCount.current) ping(0.25, 1567.98);
    prevCount.current = onSurface;
  }, [onSurface, playing, ping]);

  const togglePlay = () => {
    if (playing) return setPlaying(false);
    if (year >= YEAR_MAX) setYear(YEAR_MIN);
    setPlaying(true);
  };

  const switchBody = (b: Body) => {
    if (b === body) return;
    setBody(b);
    setSelectedId(null);
  };

  if (!data) return null;

  const list = (
    <ul className="divide-y divide-hairline">
      {features.map((f) => {
        const s = stateInYear(f.properties, year);
        const y = yearOf(f.properties.arrived.date);
        return (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => (f.geometry && s !== "future" ? select(f.id) : open(f.id))}
              aria-current={f.id === selectedId ? "true" : undefined}
              className={`group flex w-full items-center gap-3 px-1 py-3 text-left transition-opacity ${s === "future" ? "opacity-35" : ""}`}
            >
              <span className="w-3 shrink-0">
                {s === "future" ? (
                  <span className="block h-2 w-2 rounded-full border border-ash" />
                ) : (
                  <StatusDot status={s === "transmitting" ? "active" : s === "silent" ? "silent" : "lost"} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm ${f.id === selectedId ? "text-lunar" : "text-lunar-2 group-hover:text-lunar"}`}>
                  {l(f.properties.name)}
                </span>
                <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-dust">
                  {s === "future"
                    ? t("explore.notYet", { year: localizeDigits(y ?? "", lang) })
                    : !f.geometry
                      ? t("explore.notOnMap")
                      : localizeDigits(y ?? "", lang)}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="relative h-[100svh] min-h-[560px] w-full overflow-hidden">
      <h1 className="sr-only">{t("explore.title")}</h1>
      {mapStatus !== "unsupported" && (
        <PlanetMap
          body={body}
          features={features}
          year={year}
          selectedId={selectedId}
          onSelect={select}
          reducedMotion={reducedMotion}
          onStatus={setMapStatus}
        />
      )}

      {(mapStatus === "loading" || mapStatus === "error" || mapStatus === "unsupported") && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
          <div role={mapStatus === "loading" ? "status" : "alert"} className="pointer-events-auto max-w-sm text-center">
            {mapStatus === "loading" ? (
              <p className="label">{t("explore.loadingMap")}</p>
            ) : (
              <>
                <p className="label mb-3 text-caution">{t("common.errorTitle")}</p>
                <p className="text-sm text-lunar-2">{t("explore.webglError")}</p>
                <button type="button" className="btn-ghost mt-5" onClick={() => setListOpen(true)}>
                  {t("explore.showList")}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Top-left: world switch + count */}
      <div className="pointer-events-none absolute inset-x-0 top-[var(--header-h)] z-10 bg-gradient-to-b from-void/80 to-transparent pb-16">
        <div className="container-x pointer-events-auto flex flex-wrap items-center gap-x-6 gap-y-3 pt-5">
          <div role="group" aria-label={t("archive.body")} className="flex gap-2">
            {(["moon", "mars"] as Body[]).map((b) => (
              <button key={b} type="button" aria-pressed={body === b} onClick={() => switchBody(b)} className="btn-ghost">
                {t(`common.body.${b}` as const)}
              </button>
            ))}
          </div>
          <p className="label" aria-live="polite">
            {t("explore.onSurface", { n: localizeDigits(onSurface, lang), year: localizeDigits(year, lang) })}
          </p>
        </div>
      </div>

      {/* Desktop list */}
      <aside
        aria-label={t("explore.list")}
        className="absolute bottom-[182px] right-0 top-[calc(var(--header-h)+5.5rem)] z-10 hidden w-[300px] flex-col border-l border-hairline bg-void/70 backdrop-blur-md lg:flex"
      >
        <p className="label border-b border-hairline px-5 py-4">{t("explore.list")}</p>
        <div className="flex-1 overflow-y-auto px-4">{list}</div>
      </aside>

      {/* Mobile list sheet */}
      <AnimatePresence>
        {listOpen && (
          <motion.aside
            aria-label={t("explore.list")}
            className="absolute inset-x-0 bottom-0 top-[calc(var(--header-h)+4.5rem)] z-30 flex flex-col border-t border-hairline bg-void/95 backdrop-blur-md lg:hidden"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="container-x flex items-center justify-between border-b border-hairline py-3">
              <p className="label">{t("explore.list")}</p>
              <button type="button" className="btn-ghost !py-1.5" onClick={() => setListOpen(false)}>
                {t("explore.hideList")}
              </button>
            </div>
            <div className="container-x flex-1 overflow-y-auto">{list}</div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Selected machine */}
      <AnimatePresence>
        {selected && <SelectedCard key={selected.id} feature={selected} year={year} onClose={() => setSelectedId(null)} />}
      </AnimatePresence>

      {/* Time Machine */}
      <TimeMachine
        year={year}
        setYear={(y) => {
          setPlaying(false);
          setYear(y);
        }}
        playing={playing}
        togglePlay={togglePlay}
        onShowList={() => setListOpen(true)}
        body={body}
      />
    </div>
  );
}

function SelectedCard({ feature, year, onClose }: { feature: MissionFeature; year: number; onClose: () => void }) {
  const { t, l, lang } = useT();
  const { open } = useCapsule();
  const { data } = useMuseum();
  const p = feature.properties;
  const state = stateInYear(p, year);
  const story = data?.storyFor(p.id);
  return (
    <motion.section
      aria-label={l(p.name)}
      className="absolute inset-x-3 bottom-[128px] z-20 max-h-[calc(100svh-var(--header-h)-15rem)] overflow-y-auto md:bottom-[200px] border border-hairline bg-void/90 p-5 backdrop-blur-md sm:inset-x-auto sm:left-[max(1rem,4vw)] sm:w-[380px]"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="label mb-2 flex items-center gap-2">
            <StatusDot status={state === "transmitting" ? "active" : "silent"} />
            {state === "transmitting" ? t("explore.legendActive", { year: localizeDigits(year, lang) }) : t(`common.status.${p.status}` as const)}
          </p>
          <h2 className="text-xl font-medium leading-tight tracking-tight">{l(p.name)}</h2>
          {story && <p className="mt-2 hidden text-sm leading-relaxed text-lunar-2 sm:block">{l(story.dek)}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label={t("common.close")} className="-mr-1 -mt-1 shrink-0 p-1 text-dust hover:text-lunar">
          ✕
        </button>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-hairline pt-4 text-xs">
        <div>
          <dt className="text-dust">{t("common.arrived")}</dt>
          <dd className="mt-0.5 text-lunar">{formatDate(p.arrived.date, lang)}</dd>
        </div>
        {p.end && (
          <div>
            <dt className="text-dust">{l(p.end.label)}</dt>
            <dd className="mt-0.5 text-lunar">{formatDate(p.end.date, lang)}</dd>
          </div>
        )}
        <div className="col-span-2">
          <dt className="text-dust">{t("common.site")}</dt>
          <dd className="mt-0.5 text-lunar">{l(p.site)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-dust">{t("common.coordinates")}</dt>
          <dd className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-lunar">
            {formatCoords(feature, lang) ?? t("common.coordsUnknown")}
            <VerificationBadge status={p.coordinates.verification} />
          </dd>
        </div>
      </dl>
      <button type="button" className="btn-signal mt-5 w-full justify-center" onClick={() => open(p.id)}>
        {t("common.openCapsule")}
      </button>
    </motion.section>
  );
}

function TimeMachine({
  year,
  setYear,
  playing,
  togglePlay,
  onShowList,
  body,
}: {
  year: number;
  setYear: (y: number) => void;
  playing: boolean;
  togglePlay: () => void;
  onShowList: () => void;
  body: Body;
}) {
  const { t, lang } = useT();
  return (
    <section
      aria-label={t("explore.time")}
      className="absolute inset-x-0 bottom-0 z-20 border-t border-hairline bg-gradient-to-t from-void via-void/95 to-void/70 backdrop-blur-md"
    >
      <div className="container-x flex flex-col gap-2 py-3 md:gap-3 md:py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-4">
            <p className="label hidden sm:block">{t("explore.time")}</p>
            <p aria-hidden className="font-serif text-[2.4rem] italic leading-none md:text-5xl">
              {localizeDigits(year, lang)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onShowList} className="btn-ghost whitespace-nowrap !px-3 !py-2 lg:hidden">
              {t("explore.showList")}
            </button>
            <button
              type="button"
              onClick={togglePlay}
              aria-pressed={playing}
              aria-label={playing ? t("explore.pause") : t("explore.play")}
              className="btn-ghost whitespace-nowrap !px-3 !py-2"
            >
              <span aria-hidden>{playing ? "❚❚" : "▶"}</span>
              <span className="hidden sm:inline">{playing ? t("explore.pause") : t("explore.play")}</span>
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="tm-year" className="sr-only">
            {t("explore.year")}
          </label>
          <input
            id="tm-year"
            type="range"
            className="range"
            min={YEAR_MIN}
            max={YEAR_MAX}
            step={1}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-valuetext={localizeDigits(year, lang)}
          />
          <div aria-hidden className="mt-1 flex justify-between font-mono text-[10px] tracking-[0.14em] text-dust">
            {[1960, 1970, 1980, 1990, 2000, 2010, 2020].map((y) => (
              <span key={y} className={y % 20 === 0 ? "" : "hidden sm:inline"}>
                {localizeDigits(y, lang)}
              </span>
            ))}
            <span>{localizeDigits(2026, lang)}</span>
          </div>
        </div>
        <p className="hidden font-mono text-[10px] leading-relaxed tracking-[0.08em] text-dust md:block">
          {body === "moon" ? t("explore.basemapMoon") : t("explore.basemapMars")} · {t("explore.coordsNote")}
        </p>
      </div>
    </section>
  );
}
