"use client";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState, type ReactNode } from "react";
import { EMBER, PlanetSphere, Thumb } from "@/components/mission/Mission";
import { assetPath } from "@/lib/asset-path";
import { useCapsule } from "@/lib/capsule";
import { useMuseum, type MuseumData } from "@/lib/data";
import { formatDate, localizeDigits, yearOf } from "@/lib/dates";
import { useT, type StringKey } from "@/lib/i18n";
import { usePassport } from "@/lib/passport";
import { LEVEL_SIZE, computeProgress, type Achievement, type NextMission, type Progress } from "@/lib/progress";
import type { MissionFeature } from "@/lib/types";

const EASE = [0.22, 1, 0.36, 1] as const;
const MOON = "#9cc7ff";
const MARS = "#f39a6b";
const VIOLET = "#b9a4ff";

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.9, ease: EASE },
});

export function Passport() {
  const { data } = useMuseum();
  const { passport } = usePassport();
  const progress = useMemo(() => (data ? computeProgress(data, passport) : null), [data, passport]);
  if (!data || !progress) return null;

  return (
    <div className="relative isolate overflow-hidden">
      <Backdrop />
      <div className="container-x relative pb-16 pt-[calc(var(--header-h)+1.5rem)]">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 xl:grid-cols-[190px_minmax(0,1fr)_310px] xl:gap-7">
          <ExplorerMenu />
          <div className="min-w-0">
            <Header />
            <div className="mt-8 grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
              <PassportBook />
              <IdCard progress={progress} />
              <Worlds progress={progress} data={data} />
            </div>
            <Stamps progress={progress} data={data} />
          </div>
          <NextMissions progress={progress} data={data} />
        </div>
        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <Achievements progress={progress} />
          <Journey progress={progress} />
        </div>
        <ResetRow />
      </div>
    </div>
  );
}

/* ───────────────────────── layout pieces ───────────────────────── */

function Frame({ children, className = "", id, accent = false }: { children: ReactNode; className?: string; id?: string; accent?: boolean }) {
  return (
    <section id={id} className={`relative scroll-mt-24 border bg-void/70 backdrop-blur-md ${accent ? "border-[#ef6a3a]/60" : "border-hairline-strong"} ${className}`}>
      {children}
    </section>
  );
}

function FrameTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline px-5 py-3">
      <h2 className="border-l-2 border-lunar-2/60 pl-3 font-mono text-[12px] uppercase tracking-[0.26em] text-lunar">{children}</h2>
      {aside && <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-lunar-2">{aside}</span>}
    </div>
  );
}

function Backdrop() {
  const { data } = useMuseum();
  const ground = data?.image("PIA19807")?.file;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <PlanetSphere className="absolute left-[46%] top-[-22vw] w-[46vw] min-w-[380px] opacity-95" />
      {ground && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={assetPath(ground)}
          alt=""
          className="absolute right-0 top-0 h-[420px] w-[70%] object-cover object-[50%_75%]"
          style={{
            maskImage: "linear-gradient(to left, black 30%, transparent 95%), linear-gradient(to bottom, transparent 5%, black 40%, transparent 95%)",
            WebkitMaskImage: "linear-gradient(to left, black 30%, transparent 95%), linear-gradient(to bottom, transparent 5%, black 40%, transparent 95%)",
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
            filter: "sepia(0.6) saturate(2.2) hue-rotate(-14deg) brightness(0.35)",
          }}
        />
      )}
      <div className="absolute left-[44%] top-[150px] h-40 w-[40vw] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(255,170,90,0.35),transparent_65%)] blur-2xl" />
      <div className="absolute inset-x-0 top-[360px] h-[260px] bg-gradient-to-b from-transparent to-void" />
    </div>
  );
}

function ExplorerMenu() {
  const { t } = useT();
  const items: { href: string; key: StringKey; icon: string }[] = [
    { href: "#px-passport", key: "px.menuPassport", icon: "▤" },
    { href: "#px-missions", key: "px.menuMissions", icon: "✦" },
    { href: "#px-stamps", key: "px.menuStamps", icon: "◎" },
    { href: "#px-achievements", key: "px.menuAchievements", icon: "⬡" },
    { href: "/paths/", key: "px.menuQuests", icon: "☰" },
    { href: "#px-journey", key: "px.menuJourney", icon: "↗" },
  ];
  return (
    <aside aria-label={t("px.menu")} className="xl:sticky xl:top-[calc(var(--header-h)+1.5rem)] xl:self-start">
      <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.26em] text-lunar-2">{t("px.menu")}</p>
      <nav>
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 xl:mx-0 xl:flex-col xl:gap-1.5 xl:overflow-visible xl:px-0">
          {items.map((it, i) => {
            const active = i === 0;
            return (
              <li key={it.href} className="shrink-0">
                <a
                  href={it.href}
                  className={`group flex items-center gap-3 border px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
                    active ? "border-[#ef6a3a]/80 bg-[#ef6a3a]/10 text-[#ff8a5c] shadow-[0_0_24px_-8px_#ef6a3a]" : "border-hairline text-lunar-2 hover:border-hairline-strong hover:text-lunar"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[13px] ${active ? "border-[#ef6a3a]" : "border-lunar-2/50"}`}
                  >
                    {it.icon}
                  </span>
                  {t(it.key)}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="relative mt-5 hidden h-44 overflow-hidden border border-hairline-strong bg-void/60 p-4 xl:block">
        <svg aria-hidden viewBox="0 0 160 100" className="absolute inset-0 h-full w-full opacity-80">
          {[
            [20, 70, 50, 40],
            [50, 40, 90, 55],
            [90, 55, 120, 25],
            [90, 55, 110, 85],
            [50, 40, 40, 15],
          ].map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ecebe6" strokeOpacity="0.25" strokeWidth="0.5" />
          ))}
          {[
            [20, 70],
            [50, 40],
            [90, 55],
            [120, 25],
            [110, 85],
            [40, 15],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i === 2 ? 2.4 : 1.3} fill={i === 2 ? EMBER : "#ecebe6"} />
          ))}
        </svg>
        <p className="absolute bottom-4 left-4 right-4 font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-lunar-2">{t("px.menuNote")}</p>
      </div>
    </aside>
  );
}

function Header() {
  const { t } = useT();
  return (
    <div id="px-passport" className="relative scroll-mt-24">
      <div>
        <motion.p {...fade(0.1)} className="font-mono text-[11px] uppercase tracking-[0.42em] text-lunar-2">
          {t("px.eyebrow")}
        </motion.p>
        <motion.h1 {...fade(0.2)} className="mt-3 font-display text-[clamp(2rem,3.9vw,3.7rem)] font-bold uppercase leading-[0.98] tracking-[-0.01em]">
          <span className="block bg-[linear-gradient(180deg,#ffffff,#b9c2cc)] bg-clip-text text-transparent sm:whitespace-nowrap">{t("px.line1")}</span>
          <span className="block bg-[linear-gradient(180deg,#ffb48a,#ef6a3a_60%,#c2451c)] bg-clip-text text-transparent sm:whitespace-nowrap">{t("px.line2")}</span>
        </motion.h1>
        <motion.p {...fade(0.35)} className="mt-3 max-w-xl font-mono text-[12px] leading-relaxed tracking-[0.1em] text-lunar-2">
          {t("px.dek")}
        </motion.p>
      </div>
      <motion.div {...fade(0.5)} className="absolute right-0 top-4 hidden gap-8 min-[1900px]:flex">
                <div className="max-w-[14rem] border-r border-[#ef6a3a]/70 pr-4 text-right">
          <p className="font-serif text-[1.3rem] italic leading-snug text-lunar">“{t("px.quote")}”</p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-lunar-2">{t("px.quoteSub")}</p>
        </div>
      </motion.div>
    </div>
  );
}

function PassportBook() {
  const { t } = useT();
  const { data } = useMuseum();
  const cover = data?.image("art002e021278")?.file;
  return (
    <motion.div {...fade(0.3)} className="flex justify-center [perspective:1200px] lg:block">
      <div
        className="relative h-[340px] w-[240px] overflow-hidden rounded-[10px] border border-[#ef6a3a]/40 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9),0_0_40px_-10px_rgba(239,106,58,0.6)] transition-transform duration-700 [transform:rotateY(-14deg)_rotateZ(-3deg)] hover:[transform:rotateY(-4deg)_rotateZ(-1deg)]"
        style={{ background: "linear-gradient(135deg,#1b1d22,#0c0d10 60%,#1a1310)" }}
      >
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={assetPath(cover)}
            alt=""
            className="absolute inset-x-0 bottom-0 h-[55%] w-full object-cover object-[50%_60%]"
            style={{ filter: "sepia(0.7) saturate(2) hue-rotate(-14deg) brightness(0.65)", maskImage: "linear-gradient(to bottom, transparent, black 40%)", WebkitMaskImage: "linear-gradient(to bottom, transparent, black 40%)" }}
          />
        )}
        <span aria-hidden className="absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-black/70 to-transparent" />
        <div className="relative px-6 pt-6 text-center">
          <p className="font-mono text-[14px] tracking-[0.5em] text-lunar-2">ECHOES</p>
          <p className="font-mono text-[7px] tracking-[0.4em] text-lunar-2/80">BEYOND EARTH</p>
          <p className="mt-3 font-display text-[1.45rem] font-bold uppercase leading-tight text-[#f6d4bf] [text-shadow:0_1px_0_#000]">{t("px.coverTitle")}</p>
          <svg aria-hidden viewBox="0 0 100 100" className="mx-auto mt-3 h-20 w-20 text-[#e9b98d]">
            <circle cx="50" cy="50" r="22" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <ellipse cx="50" cy="50" rx="44" ry="13" fill="none" stroke="currentColor" strokeWidth="1.1" transform="rotate(-18 50 50)" />
            <circle cx="88" cy="38" r="2.4" fill="currentColor" />
          </svg>
        </div>
        <span aria-hidden className="absolute bottom-14 left-6 h-6 w-8 rounded-[3px] bg-[linear-gradient(135deg,#e7c27a,#a8792f)] opacity-90" />
        <p className="absolute inset-x-0 bottom-3 text-center font-mono text-[7px] uppercase tracking-[0.16em] text-lunar-2">{t("px.coverFoot")}</p>
      </div>
    </motion.div>
  );
}

function IdCard({ progress }: { progress: Progress }) {
  const { t, lang } = useT();
  const { passport } = usePassport();
  const { data } = useMuseum();
  const avatar = data?.image("GSFC_20171208_Archive_e000678")?.thumb;
  const rank = Math.min(3, Math.floor((progress.level - 1) / 2));
  return (
    <motion.div {...fade(0.4)}>
      <Frame className="h-full">
        <div className="flex justify-between gap-4 border-b border-hairline px-5 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-lunar-2">
          <div>
            <p>{t("px.explorerId")}</p>
            <p className="mt-1 whitespace-nowrap text-[12px] tracking-[0.2em] text-lunar">{passport.explorerId ?? "—"}</p>
          </div>
          <div className="text-right">
            <p>{t("px.joined")}</p>
            <p className="mt-1 text-[12px] text-lunar">{passport.firstVisit ? formatDate(passport.firstVisit, lang) : "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 px-5 py-4">
          <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-lunar-2/40 shadow-[0_0_24px_-4px_rgba(120,180,255,0.6)]">
            {avatar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={assetPath(avatar)} alt="" className="h-full w-full scale-125 object-cover" />
            )}
          </span>
          <div>
            <p className="font-mono text-[18px] uppercase tracking-[0.16em] text-lunar">{t(`pp.rank${rank}` as StringKey)}</p>
            <p className="mt-1 text-[12px] text-lunar-2">{t("px.xp", { n: localizeDigits(progress.xp, lang) })}</p>
          </div>
        </div>
        <div className="mx-5 border-t border-hairline pt-3">
          <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.16em]">
            <span style={{ color: EMBER }}>{t("px.level")}</span>
            <span className="text-lunar-2">{t("px.toNext", { n: localizeDigits(LEVEL_SIZE - progress.levelXp, lang) })}</span>
          </div>
          <p className="mt-1 font-mono text-[20px] uppercase tracking-[0.12em] text-lunar">{t("px.levelN", { n: localizeDigits(progress.level, lang) })}</p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-hairline" role="progressbar" aria-valuemin={0} aria-valuemax={LEVEL_SIZE} aria-valuenow={progress.levelXp}>
            <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg,#c2451c,${EMBER},#ffb48a)` }} initial={{ width: 0 }} animate={{ width: `${(progress.levelXp / LEVEL_SIZE) * 100}%` }} transition={{ duration: 1.2, ease: EASE }} />
          </div>
        </div>
        <div className="relative px-5 pb-5 pt-4">
          <p className="max-w-[17rem] font-serif text-[14px] italic leading-relaxed text-lunar-2">“{t("px.motto")}”</p>
          <span aria-hidden className="absolute bottom-3 right-4 flex h-20 w-20 rotate-[-14deg] items-center justify-center rounded-full border border-dashed border-lunar-2/40 p-2 text-center font-mono text-[7px] uppercase leading-tight tracking-[0.14em] text-lunar-2/60">
            {t("px.seal")}
          </span>
        </div>
      </Frame>
    </motion.div>
  );
}

function Ring({ pct, color, children }: { pct: number; color: string; children: ReactNode }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative flex h-[84px] w-[84px] shrink-0 items-center justify-center">
      <svg aria-hidden viewBox="0 0 84 84" className="absolute inset-0 -rotate-90">
        <circle cx="42" cy="42" r={r} fill="none" stroke="#ecebe61f" strokeWidth="4" />
        <motion.circle
          cx="42"
          cy="42"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1.4, ease: EASE }}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      </svg>
      <span className="relative h-[56px] w-[56px] overflow-hidden rounded-full">{children}</span>
    </span>
  );
}

function Worlds({ progress, data }: { progress: Progress; data: MuseumData }) {
  const { t, lang } = useT();
  const img = (id: string) => data.image(id)?.thumb;
  const visuals: Record<string, { color: string; label: StringKey; of: StringKey; inner: ReactNode }> = {
    moon: { color: MOON, label: "px.world.moon", of: "px.ofMachines", inner: <Img src={img("GSFC_20171208_Archive_e001861")} /> },
    mars: {
      color: MARS,
      label: "px.world.mars",
      of: "px.ofMachines",
      // Viking MDIM 2.1 mosaic texture (NASA Mars Trek)
      inner: <span className="block h-full w-full" style={{ backgroundImage: `url(${assetPath("/tiles/mars-eq.jpg")})`, backgroundSize: "200% 100%", backgroundPosition: "30% 50%", filter: "saturate(1.3)" }} />,
    },
    signal: { color: "#cfe3ff", label: "px.world.signal", of: "px.ofSignals", inner: <Img src={img("GSFC_20171208_Archive_e000678")} /> },
    legacy: { color: VIOLET, label: "px.world.legacy", of: "px.ofLegacy", inner: <Img src={img("as08-14-2383")} /> },
  };
  return (
    <motion.div {...fade(0.5)} className="lg:col-span-2">
      <Frame className="h-full">
        <FrameTitle>{t("px.worlds")}</FrameTitle>
        <ul className="grid grid-cols-2 gap-px bg-hairline">
          {progress.worlds.map((w) => {
            const v = visuals[w.key];
            const pct = w.total ? w.done / w.total : 0;
            return (
              <li key={w.key} className="flex flex-col items-center gap-2 bg-void/80 p-4 text-center sm:flex-row sm:text-left">
                <Ring pct={pct} color={v.color}>
                  {v.inner}
                </Ring>
                <div className="min-w-0">
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lunar">{t(v.label)}</p>
                  <p className="font-mono text-[24px] leading-tight" style={{ color: v.color }}>
                    {localizeDigits(Math.round(pct * 100), lang)}%
                  </p>
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-lunar-2">
                    {t(v.of, { done: localizeDigits(w.done, lang), total: localizeDigits(w.total, lang) })}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </Frame>
    </motion.div>
  );
}

function Img({ src }: { src?: string }) {
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={assetPath(src)} alt="" className="h-full w-full scale-125 object-cover" />;
}

/* ───────────────────────── stamps ───────────────────────── */

function Stamps({ progress, data }: { progress: Progress; data: MuseumData }) {
  const { t, lang } = useT();
  const collected = progress.stamps.filter((s) => s.collected).length;
  return (
    <motion.div {...fade(0.6)} className="mt-6">
      <Frame id="px-stamps">
        <FrameTitle
          aside={
            <Link href="/archive/" className="hover:text-lunar" style={{ color: EMBER }}>
              {t("px.viewArchive")} →
            </Link>
          }
        >
          {t("px.stamps")}{" "}
          <span className="ml-2 text-lunar-2">{t("px.collected", { n: localizeDigits(collected, lang), total: localizeDigits(progress.stamps.length, lang) })}</span>
        </FrameTitle>
        <ol className="flex gap-3 overflow-x-auto px-5 py-4 [scrollbar-width:thin]">
          {progress.stamps.map((s) => {
            const f = data.byId.get(s.id);
            return f ? <Stamp key={s.id} feature={f} collected={s.collected} /> : null;
          })}
        </ol>
      </Frame>
    </motion.div>
  );
}

function Stamp({ feature, collected }: { feature: MissionFeature; collected: boolean }) {
  const { t, l, lang } = useT();
  const { open } = useCapsule();
  const p = feature.properties;
  const paper = collected ? (p.body === "moon" ? MOON : MARS) : "#3a3d42";
  return (
    <li className="shrink-0">
      <button
        type="button"
        onClick={() => open(feature.id)}
        aria-label={collected ? l(p.name) : `${t("px.lockedStamp")} — ${l(p.name)}`}
        className="group block w-[104px] transition-transform hover:-translate-y-1"
      >
        {/* Perforated edge: the paper colour only shows in the padding ring; holes stay transparent. */}
        <span
          className="block p-[6px]"
          style={{ background: `radial-gradient(circle, transparent 2.6px, ${paper} 3px) -5px -5px / 10px 10px`, filter: collected ? `drop-shadow(0 0 10px ${paper}66)` : undefined }}
        >
          <span className="relative block bg-void">
            <Thumb feature={feature} active={collected && p.body === "mars"} className={`h-[100px] w-full ${collected ? "" : "opacity-40"}`} />
            {!collected && (
              <span aria-hidden className="absolute inset-0 flex items-center justify-center text-lg text-lunar-2">
                🔒
              </span>
            )}
            <span className="block bg-void/95 px-1.5 py-1 text-center">
              <span className="block truncate font-mono text-[9px] uppercase tracking-[0.06em] text-lunar">{l(p.name).split(" (")[0].split(" · ")[0]}</span>
              <span className="block font-mono text-[9px] text-lunar-2">{collected ? localizeDigits(yearOf(p.arrived.date) ?? "", lang) : t("px.lockedStamp")}</span>
            </span>
          </span>
        </span>
      </button>
    </li>
  );
}

/* ───────────────────────── next missions ───────────────────────── */

function NextMissions({ progress, data }: { progress: Progress; data: MuseumData }) {
  const { t, lang } = useT();
  return (
    <aside id="px-missions" aria-labelledby="px-next" className="scroll-mt-24 xl:sticky xl:top-[calc(var(--header-h)+1.5rem)] xl:self-start">
      <div className="mb-3 flex items-baseline justify-between border-l-2 border-lunar-2/60 pl-3">
        <h2 id="px-next" className="font-mono text-[13px] uppercase tracking-[0.3em] text-lunar">
          {t("px.next")}
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: EMBER }}>
          {t("px.newCount", { n: localizeDigits(progress.next.length, lang) })}
        </span>
      </div>
      {progress.next.length === 0 ? (
        <Frame className="p-5">
          <p className="text-[13px] text-lunar-2">{t("px.allDone")}</p>
        </Frame>
      ) : (
        <ul className="flex flex-col gap-3">
          {progress.next.map((m, i) => (
            <MissionCard key={m.id} mission={m} data={data} delay={0.4 + i * 0.1} />
          ))}
        </ul>
      )}
    </aside>
  );
}

function MissionCard({ mission, data, delay }: { mission: NextMission; data: MuseumData; delay: number }) {
  const { t, l, lang } = useT();
  const { open } = useCapsule();
  const objectImage = data.image(mission.image);
  const tag = mission.body ? t(`common.body.${mission.body}` as const) : mission.kind === "lens" ? t("nm.lensTag") : t("nm.pathTag");
  const color = mission.body === "mars" ? MARS : mission.body === "moon" ? MOON : VIOLET;
  const body = (
    <span className="grid grid-cols-[84px_minmax(0,1fr)_auto] items-center gap-3 p-3">
      <span className="block h-[92px] overflow-hidden bg-void-3">
        {objectImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={assetPath(objectImage.thumb)} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        )}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.16em]" style={{ color }}>
          <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
          {tag}
        </span>
        <span className="mt-1 block font-mono text-[11.5px] uppercase leading-snug tracking-[0.06em] text-lunar">
          {t(mission.title.key, { name: l(mission.title.name).split(" (")[0] })}
        </span>
        {mission.note && <span className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-lunar-2">{l(mission.note)}</span>}
        <span className="mt-1.5 flex items-center justify-between gap-2 whitespace-nowrap border-t border-hairline pt-1.5 font-mono text-[9px] uppercase tracking-[0.06em] text-lunar-2">
          <span>{t("px.earn")}</span>
          <span style={{ color: EMBER }}>+{localizeDigits(mission.xp, lang)} XP</span>
        </span>
      </span>
      <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full border border-lunar-2/60 text-lunar transition-colors group-hover:bg-lunar group-hover:text-void">
        →
      </span>
    </span>
  );
  const cls = "group block w-full border border-hairline-strong bg-void/75 text-left backdrop-blur-md transition-colors hover:border-lunar-2";
  return (
    <motion.li {...fade(delay)}>
      {mission.capsule ? (
        <button type="button" className={cls} onClick={() => open(mission.capsule!.objectId, { pathId: mission.capsule!.pathId })}>
          {body}
        </button>
      ) : (
        <Link href={mission.href ?? "/"} className={cls}>
          {body}
        </Link>
      )}
    </motion.li>
  );
}

/* ───────────────────────── achievements & journey ───────────────────────── */

const ACH_COLORS = [MOON, MARS, "#ecebe6", "#e7b45a", VIOLET, MOON, MARS, "#e7b45a"];

function Glyph({ icon }: { icon: Achievement["icon"] }) {
  const paths: Record<Achievement["icon"], ReactNode> = {
    signal: <path d="M8 20h4l3-8 4 16 4-12 3 4h6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />,
    rover: (
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="11" y="14" width="18" height="7" />
        <path d="M20 14v-5h5" />
        <circle cx="13" cy="25" r="2.5" />
        <circle cx="20" cy="25" r="2.5" />
        <circle cx="27" cy="25" r="2.5" />
      </g>
    ),
    moon: <path d="M24 9a11 11 0 1 0 7 17A9 9 0 0 1 24 9z" fill="none" stroke="currentColor" strokeWidth="1.6" />,
    archive: (
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <ellipse cx="20" cy="12" rx="9" ry="3" />
        <path d="M11 12v14c0 1.7 4 3 9 3s9-1.3 9-3V12M11 19c0 1.7 4 3 9 3s9-1.3 9-3" />
      </g>
    ),
    legacy: (
      <g fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="20" cy="20" r="3" />
        <circle cx="20" cy="20" r="7" strokeOpacity="0.7" />
        <circle cx="20" cy="20" r="11" strokeOpacity="0.4" />
      </g>
    ),
    path: <path d="M10 28c6-10 12 2 20-14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="3 3" />,
    lens: (
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="18" cy="18" r="7" />
        <path d="M23 23l6 6" />
      </g>
    ),
    guardian: <path d="M20 8l10 4v8c0 6-4 10-10 12-6-2-10-6-10-12v-8z" fill="none" stroke="currentColor" strokeWidth="1.5" />,
  };
  return (
    <svg aria-hidden viewBox="0 0 40 40" className="h-7 w-7">
      {paths[icon]}
    </svg>
  );
}

function Achievements({ progress }: { progress: Progress }) {
  const { t, lang } = useT();
  const unlocked = progress.achievements.filter((a) => a.done >= a.goal).length;
  return (
    <Frame id="px-achievements">
      <FrameTitle aside={t("px.unlocked", { n: localizeDigits(unlocked, lang), total: localizeDigits(progress.achievements.length, lang) })}>{t("px.achievements")}</FrameTitle>
      <ul className="grid grid-cols-2 gap-px bg-hairline sm:grid-cols-4">
        {progress.achievements.map((a, i) => {
          const done = a.done >= a.goal;
          const color = done ? ACH_COLORS[i] : "#5b5e63";
          return (
            <li key={a.id} className="flex items-center gap-3 bg-void/85 p-3.5">
              <span className="relative flex h-14 w-12 shrink-0 items-center justify-center" style={{ color }}>
                <svg aria-hidden viewBox="0 0 48 56" className="absolute inset-0 h-full w-full">
                  <polygon
                    points="24,2 46,15 46,41 24,54 2,41 2,15"
                    fill={done ? `${color}22` : "transparent"}
                    stroke={color}
                    strokeWidth="1.6"
                    style={{ filter: done ? `drop-shadow(0 0 6px ${color})` : undefined }}
                  />
                </svg>
                <span className="relative">{done ? <Glyph icon={a.icon} /> : <span className="text-sm">🔒</span>}</span>
              </span>
              <span className="min-w-0">
                <span className={`block font-mono text-[11px] uppercase leading-tight tracking-[0.08em] ${done ? "text-lunar" : "text-lunar-2"}`}>{t(`ach.${a.id}` as StringKey)}</span>
                <span className="mt-1 block text-[11px] leading-snug text-lunar-2">{t(`ach.${a.id}.d` as StringKey)}</span>
                {!done && (
                  <span className="mt-1 block font-mono text-[9.5px] tracking-[0.1em] text-dust">
                    {localizeDigits(a.done, lang)} / {localizeDigits(a.goal, lang)}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </Frame>
  );
}

function Journey({ progress }: { progress: Progress }) {
  const { t, l, lang } = useT();
  const icons: Record<string, string> = { joined: "◉", firstStamp: "▣", moon: "☾", mars: "●", signal: "((·))", path: "↝", next: "◌" };
  return (
    <Frame id="px-journey">
      <FrameTitle aside={t("px.journeyDek")}>{t("px.journey")}</FrameTitle>
      <ol className="relative grid grid-cols-4 gap-y-6 px-4 py-6 sm:grid-cols-7">
        <span aria-hidden className="absolute left-8 right-8 top-[46px] hidden h-px bg-[linear-gradient(90deg,#9cc7ff,#ef6a3a_60%,rgba(236,235,230,0.2))] sm:block" />
        {progress.journey.map((s) => {
          const color = s.key === "mars" ? MARS : s.key === "next" ? "#7d7c78" : s.key === "moon" ? MOON : "#ecebe6";
          const detail = s.detail == null ? null : typeof s.detail === "string" ? (s.key === "joined" ? formatDate(s.detail, lang) : s.detail) : l(s.detail).split(" (")[0].split(" · ")[0];
          return (
            <li key={s.key} className="relative flex flex-col items-center text-center">
              <span
                className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border text-[11px] ${s.key === "next" ? "border-dashed" : ""}`}
                style={{
                  borderColor: s.done || s.key === "next" ? color : "#3a3d42",
                  color: s.done || s.key === "next" ? color : "#5b5e63",
                  background: "#07090b",
                  boxShadow: s.done ? `0 0 14px -2px ${color}` : undefined,
                }}
              >
                {icons[s.key]}
              </span>
              <span className={`mt-3 font-mono text-[9.5px] uppercase leading-tight tracking-[0.1em] ${s.done ? "text-lunar" : "text-lunar-2"}`}>{t(`jr.${s.key}` as StringKey)}</span>
              <span className="mt-1 line-clamp-2 font-mono text-[9px] uppercase leading-tight tracking-[0.06em]" style={{ color: s.done ? color : "#7d7c78" }}>
                {detail ?? (s.done ? "✓" : t("jr.pending"))}
              </span>
            </li>
          );
        })}
      </ol>
    </Frame>
  );
}

function ResetRow() {
  const { t } = useT();
  const { reset } = usePassport();
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="mt-10 flex flex-col gap-4 border-t border-hairline pt-6 md:flex-row md:items-center md:justify-between">
      <p className="max-w-2xl text-[12px] leading-relaxed text-dust">
        {t("px.xpNote")} {t("pp.dek")}
      </p>
      <AnimatePresence mode="wait" initial={false}>
        {confirming ? (
          <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="alertdialog" aria-labelledby="pp-confirm" className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p id="pp-confirm" className="text-[13px] text-lunar-2">
              {t("pp.resetConfirm")}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                autoFocus
                className="btn-ghost !border-caution !text-caution"
                onClick={() => {
                  reset();
                  setConfirming(false);
                }}
              >
                {t("pp.resetYes")}
              </button>
              <button type="button" className="btn-ghost" onClick={() => setConfirming(false)}>
                {t("pp.resetNo")}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.button key="reset" type="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="btn-ghost shrink-0" onClick={() => setConfirming(true)}>
            {t("pp.reset")}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

