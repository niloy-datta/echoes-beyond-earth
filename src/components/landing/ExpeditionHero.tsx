"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { NAV } from "@/components/SiteHeader";
import { assetPath } from "@/lib/asset-path";
import { useCapsule } from "@/lib/capsule";
import { useMuseum, type MuseumData } from "@/lib/data";
import { formatDate, localizeDigits, yearOf } from "@/lib/dates";
import { formatCoords } from "@/lib/format";
import { useT, type StringKey } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { useSound } from "@/lib/sound";
import type { Body } from "@/lib/types";

const EASE = [0.22, 1, 0.36, 1] as const;
const START = 1964;
const END = 2026;

// Exhibit cards — each uses a real NASA photograph from sources.json.
const CARDS: { href: string; desc: StringKey; image: string }[] = [
  { href: "/explore/", desc: "card.explore", image: "GSFC_20171208_Archive_e001861" },
  { href: "/last-signal/", desc: "card.lastSignal", image: "PIA25287" },
  { href: "/lens/", desc: "card.lens", image: "as08-14-2383" },
  { href: "/legacy/", desc: "card.legacy", image: "PIA24542" },
  { href: "/paths/", desc: "card.paths", image: "as17-147-22548" },
  { href: "/passport/", desc: "card.passport", image: "PIA12910" },
  { href: "/archive/", desc: "card.archive", image: "AS12-48-7133" },
  { href: "/sources/", desc: "card.evidence", image: "PIA23178" },
];

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 1.1, ease: EASE },
});

function worldStats(data: MuseumData | null, body: Body) {
  const objs = (data?.objects ?? []).filter((o) => o.properties.body === body);
  const years = objs.map((o) => yearOf(o.properties.arrived.date)).filter((y): y is number => y != null);
  return { count: objs.length, from: years.length ? Math.min(...years) : null, to: years.length ? Math.max(...years) : null };
}

/**
 * The opening frame: the Moon (Apollo 11, left) and Mars (Curiosity, right) meeting beneath Earth.
 * Every number on this screen is computed from the museum's data files.
 */
export function ExpeditionHero() {
  const { t, lang } = useT();
  const { data } = useMuseum();
  const { reducedMotion } = useSettings();
  const { ping } = useSound();
  const img = (id: string) => {
    const file = data?.image(id)?.file;
    return file ? assetPath(file) : undefined;
  };

  const begin = () => {
    ping(0.8);
    document.getElementById("prologue")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  };

  return (
    <section aria-labelledby="hero-title" className="relative isolate min-h-[100svh] overflow-hidden bg-void">
      <Backdrop img={img} />

      <div className="container-x relative flex min-h-[100svh] flex-col pt-[calc(var(--header-h)+1.25rem)] pb-6 xl:pt-[calc(var(--header-h)+2rem)]">
        <div className="grid flex-1 gap-8 xl:grid-cols-[240px_minmax(0,1fr)_270px] xl:gap-6">
          {/* Left column — Moon */}
          <div className="order-2 flex flex-col gap-6 xl:order-1">
            <WorldBadge body="moon" />
            <div className="mt-auto hidden xl:block">
              <Apollo11 />
            </div>
          </div>

          {/* Centre */}
          <div className="order-1 flex flex-col items-center justify-center pt-[6svh] text-center xl:order-2 xl:pt-[6svh]">
            <motion.p {...fadeUp(0.3)} className="label mb-6 text-lunar-2 [letter-spacing:0.6em] md:mb-8">
              {t("eh.eyebrow")}
            </motion.p>
            <h1 id="hero-title">
              <motion.span
                {...fadeUp(0.55)}
                className="display mx-auto block max-w-[12.5ch] bg-[linear-gradient(100deg,#dbe9f7_0%,#ffffff_42%,#f6d4bf_68%,#f0a27a_100%)] bg-clip-text pb-2 text-[clamp(2.6rem,6.4vw,6.6rem)] font-semibold leading-[0.95] text-transparent drop-shadow-[0_6px_30px_rgba(0,0,0,0.55)]"
              >
                {t("hero.line1")}
              </motion.span>
              <motion.span {...fadeUp(1)} className="mt-5 block font-mono text-[clamp(0.8rem,1.5vw,1.25rem)] uppercase tracking-[0.42em] text-lunar/90 md:mt-7">
                {t("hero.line2")}
              </motion.span>
            </h1>
            <motion.button
              {...fadeUp(1.35)}
              type="button"
              onClick={begin}
              className="group mt-9 inline-flex items-center gap-5 border border-lunar/70 bg-void/40 px-7 py-4 font-mono text-[12px] uppercase tracking-[0.26em] text-lunar backdrop-blur-sm transition-colors hover:border-lunar hover:bg-lunar hover:text-void md:mt-12"
            >
              {t("eh.cta")}
              <span aria-hidden className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </motion.button>
          </div>

          {/* Right column — Mars */}
          <div className="order-3 flex flex-col gap-6 xl:items-end">
            <WorldBadge body="mars" />
            <Opportunity />
          </div>

          <div className="order-4 xl:hidden">
            <Apollo11 />
          </div>
        </div>

        <Timeline />
        <ExhibitCards img={img} />
        <p className="mt-4 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-dust/80">{t("eh.credits")}</p>
      </div>
    </section>
  );
}

/** Real photographs, graded and blended: Moon left, Mars right, Earth rising between them. */
function Backdrop({ img }: { img: (id: string) => string | undefined }) {
  const { t } = useT();
  const moon = img("as11-40-5948");
  const mars = img("PIA19807");
  const earth = img("GSFC_20171208_Archive_e000678");
  return (
    <div className="absolute inset-0 -z-10">
      {/* Moon — Apollo 11, AS11-40-5948 */}
      {moon && (
      <motion.img
        src={moon}
        alt={t("eh.moonAlt")}
        className="absolute inset-y-0 left-0 h-full w-full object-cover object-[30%_70%] md:w-[64%] md:object-[62%_70%]"
        style={{
          maskImage: "linear-gradient(to right, black 45%, transparent 98%)",
          WebkitMaskImage: "linear-gradient(to right, black 45%, transparent 98%)",
          filter: "grayscale(0.35) brightness(0.62) contrast(1.15)",
        }}
        initial={{ opacity: 0, scale: 1.08 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2.6, ease: EASE }}
      />
      )}
      {/* Mars — Curiosity, PIA19807 */}
      {mars && (
      <motion.img
        src={mars}
        alt={t("eh.marsAlt")}
        className="absolute right-0 top-[16%] hidden h-full w-[62%] object-cover object-[40%_40%] md:block"
        style={{
          maskImage: "linear-gradient(to left, black 50%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 22%)",
          WebkitMaskImage: "linear-gradient(to left, black 50%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 22%)",
          maskComposite: "intersect",
          WebkitMaskComposite: "source-in",
          filter: "saturate(1.25) brightness(0.62) contrast(1.12)",
        }}
        initial={{ opacity: 0, scale: 1.08 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2.6, delay: 0.15, ease: EASE }}
      />
      )}
      {/* Grading: cold light on the Moon, ember light on Mars */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_10%_45%,rgba(90,140,210,0.22),transparent_55%),radial-gradient(ellipse_at_88%_42%,rgba(240,110,50,0.32),transparent_55%)] mix-blend-screen" />
      {/* Earth — DSCOVR EPIC, a dome rising behind the headline and fading into both horizons */}
      {earth && (
        <motion.div
          aria-hidden
          className="absolute left-1/2 top-[9svh] aspect-square w-[120vw] -translate-x-1/2 md:top-[7svh] md:w-[78vw] xl:w-[66vw]"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 3.2, ease: EASE }}
        >
          <div
            className="absolute inset-0"
            style={{
              maskImage: "radial-gradient(circle at 50% 50%, black 49.2%, transparent 50%), linear-gradient(to bottom, black 8%, transparent 46%)",
              WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 49.2%, transparent 50%), linear-gradient(to bottom, black 8%, transparent 46%)",
              maskComposite: "intersect",
              WebkitMaskComposite: "source-in",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={earth} alt="" className="h-full w-full scale-[1.27] object-cover" style={{ filter: "brightness(0.42) saturate(0.85) contrast(1.1)" }} />
            {/* night side toward the lower left, sunlight from the upper right */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_8%,transparent_20%,rgba(3,4,5,0.75)_62%)]" />
          </div>
          {/* atmospheric limb */}
          <div className="absolute inset-0 rounded-full shadow-[0_-6px_40px_-4px_rgba(120,180,255,0.55),inset_0_10px_30px_-10px_rgba(150,200,255,0.6)] [mask-image:linear-gradient(to_bottom,black_5%,transparent_40%)]" />
        </motion.div>
      )}
      {/* Readability + floor */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(3,4,5,0.55),transparent_60%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-void via-void/85 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-void/80 to-transparent" />
    </div>
  );
}

function WorldBadge({ body }: { body: Body }) {
  const { t, lang } = useT();
  const { data } = useMuseum();
  const s = useMemo(() => worldStats(data, body), [data, body]);
  const isMoon = body === "moon";
  const moonThumb = data?.image("GSFC_20171208_Archive_e001861")?.thumb;
  const sphere = isMoon ? (
    moonThumb ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={assetPath(moonThumb)} alt="" className="h-full w-full scale-[1.12] object-cover" />
    ) : null
  ) : (
    // Viking MDIM 2.1 mosaic (NASA Mars Trek) wrapped onto a shaded disc
    <span
      className="block h-full w-full"
      style={{ backgroundImage: `url(${assetPath("/tiles/mars-eq.jpg")})`, backgroundSize: "210% 100%", backgroundPosition: "38% 50%" }}
    />
  );
  return (
    <motion.div {...fadeUp(0.8)} className={`flex flex-col gap-5 ${isMoon ? "" : "xl:items-end xl:text-right"}`}>
      <div className={`flex items-center gap-4 ${isMoon ? "" : "xl:flex-row-reverse"}`}>
        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full md:h-16 md:w-16">
          {sphere}
          <span aria-hidden className="absolute inset-0 rounded-full shadow-[inset_-10px_-8px_18px_rgba(0,0,0,0.85),inset_4px_3px_8px_rgba(255,255,255,0.12)]" />
        </span>
        <div>
          <p className={`font-mono text-[13px] uppercase tracking-[0.36em] ${isMoon ? "text-lunar" : "text-[#f39a6b]"}`}>{t(`common.body.${body}` as const)}</p>
          {data && (
            <p className="mt-2 font-mono text-[10px] uppercase leading-relaxed tracking-[0.16em] text-lunar-2">
              {t("eh.machines", { n: localizeDigits(s.count, lang) })}
              <br />
              {s.from && s.to ? `${localizeDigits(s.from, lang)} — ${localizeDigits(s.to, lang)}` : ""}
            </p>
          )}
        </div>
      </div>
      <p
        className={`hidden max-w-[16rem] font-mono text-[10px] uppercase leading-relaxed tracking-[0.16em] text-lunar-2/80 sm:block ${
          isMoon ? "border-l border-hairline-strong pl-3" : "xl:border-r xl:border-l-0 border-l border-hairline-strong pl-3 xl:pl-0 xl:pr-3"
        }`}
      >
        {isMoon ? t("eh.moonTag") : t("eh.marsTag")}
      </p>
    </motion.div>
  );
}

function Apollo11() {
  const { t, l, lang } = useT();
  const { data } = useMuseum();
  const { open } = useCapsule();
  const f = data?.byId.get("apollo-11");
  if (!f) return null;
  const coords = formatCoords(f, lang)?.split(" · ");
  return (
    <motion.button {...fadeUp(1.5)} type="button" onClick={() => open(f.id)} className="group flex items-end gap-5 text-left">
      {coords && (
        <span className="whitespace-nowrap border border-hairline-strong bg-void/50 px-4 py-3 font-mono text-[12px] leading-relaxed tracking-[0.12em] text-lunar-2 backdrop-blur-sm transition-colors group-hover:border-lunar-2">
          {coords[0]}
          <br />
          {coords[1]}
          {f.properties.coordinates.verification === "required" && (
            <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full border border-caution align-middle" title={t("common.required")}>
              <span className="sr-only">{t("common.required")}</span>
            </span>
          )}
        </span>
      )}
      <span className="flex items-start gap-3">
        <span aria-hidden className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-lunar-2/60">
          <span className="h-1.5 w-1.5 rounded-full bg-lunar-2" />
        </span>
        <span className="font-mono text-[10px] uppercase leading-relaxed tracking-[0.16em] whitespace-nowrap text-lunar-2">
          <span className="text-[12px] text-lunar">{l(f.properties.name).split(" · ")[0]}</span>
          <br />
          {t("eh.lunarModule")}
          <br />
          {t("eh.landed", { date: formatDate(f.properties.arrived.date, lang) })}
        </span>
      </span>
    </motion.button>
  );
}

function Opportunity() {
  const { t, lang } = useT();
  const { data } = useMuseum();
  const { open } = useCapsule();
  const f = data?.byId.get("opportunity");
  if (!f) return null;
  const p = f.properties;
  const thumb = data?.image("PIA22909");
  return (
    <motion.article
      {...fadeUp(1.2)}
      aria-labelledby="opp-title"
      className="w-full max-w-[22rem] border border-hairline-strong bg-void/55 p-5 text-left backdrop-blur-md xl:mt-6"
    >
      <div className="flex items-start justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-lunar-2">MER-B</p>
          <h2 id="opp-title" className="mt-1 font-mono text-[17px] font-semibold uppercase tracking-[0.06em] text-lunar">
            Opportunity
          </h2>
        </div>
        <div className="border-l border-hairline-strong pl-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-lunar-2">{t("eh.status")}</p>
          <p className="mt-1 font-mono text-[17px] font-semibold uppercase tracking-[0.06em] text-[#f39a6b]">{t(`common.status.${p.status}` as const)}</p>
        </div>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 py-3 font-mono text-[10px] uppercase tracking-[0.14em]">
        <dt className="text-dust">{t("eh.mission")}</dt>
        <dd className="text-right text-lunar-2">
          {localizeDigits(yearOf(p.arrived.date) ?? "", lang)} — {localizeDigits(yearOf(p.end?.date ?? null) ?? "", lang)}
        </dd>
        <dt className="text-dust">{t("eh.lastContact")}</dt>
        <dd className="text-right text-lunar-2">{formatDate(p.end?.date, lang)}</dd>
      </dl>
      <div className="flex gap-4 border-t border-hairline pt-4">
        {thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={assetPath(thumb.thumb)} alt="" className="h-16 w-20 shrink-0 object-cover" />
        )}
        <div>
          <p className="text-[12px] leading-relaxed text-lunar-2">{t("eh.oppBody")}</p>
          <button
            type="button"
            onClick={() => open(f.id)}
            className="group mt-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-lunar hover:text-[#f39a6b]"
          >
            {t("eh.exploreStory")}
            <span aria-hidden className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </button>
        </div>
      </div>
    </motion.article>
  );
}

/** 1964 → 2026: one mark per arrival year and world, sized by how many machines arrived. */
function Timeline() {
  const { t, l, lang } = useT();
  const { data } = useMuseum();
  const { open } = useCapsule();
  const groups = useMemo(() => {
    const m = new Map<string, { year: number; body: Body; ids: string[]; names: string[] }>();
    for (const o of data?.objects ?? []) {
      const y = yearOf(o.properties.arrived.date);
      if (y == null) continue;
      const key = `${o.properties.body}-${y}`;
      const g = m.get(key) ?? { year: y, body: o.properties.body, ids: [], names: [] };
      g.ids.push(o.id);
      g.names.push(l(o.properties.name));
      m.set(key, g);
    }
    return [...m.values()];
  }, [data, l]);

  const total = data?.objects.length ?? 0;
  const pos = (y: number) => ((y - START) / (END - START)) * 100;

  return (
    <motion.div {...fadeUp(1.6)} className="mt-10 xl:mt-4">
      <div className="flex items-center gap-4 md:gap-6">
        <span className="font-mono text-base tracking-[0.12em] text-lunar md:text-lg">{localizeDigits(START, lang)}</span>
        <div role="group" aria-label={t("eh.timelineLabel")} className="relative h-8 flex-1">
          <span aria-hidden className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[linear-gradient(90deg,rgba(156,199,255,0.25),rgba(156,199,255,0.8)_45%,rgba(243,154,107,0.8)_70%,rgba(243,154,107,0.3))]" />
          {groups.map((g) => (
            <button
              key={`${g.body}-${g.year}`}
              type="button"
              onClick={() => open(g.ids[0])}
              aria-label={`${localizeDigits(g.year, lang)}: ${g.names.join(", ")}`}
              title={`${localizeDigits(g.year, lang)} · ${g.names.join(" · ")}`}
              className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2 p-1.5"
              style={{ left: `${pos(g.year)}%` }}
            >
              <span
                className={`block rounded-full transition-transform group-hover:scale-150 ${
                  g.body === "moon" ? "bg-[#cfe3ff] shadow-[0_0_10px_#9cc7ff]" : "bg-[#f39a6b] shadow-[0_0_10px_#ef7d45]"
                }`}
                style={{ width: 5 + g.ids.length * 2, height: 5 + g.ids.length * 2 }}
              />
            </button>
          ))}
        </div>
        <span className="font-mono text-base tracking-[0.12em] text-lunar md:text-lg">{localizeDigits(END, lang)}</span>
      </div>
      <p className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.24em] text-lunar-2 md:text-[11px] md:tracking-[0.3em]">
        <span>{t("eh.statYears", { n: localizeDigits(END - START, lang) })}</span>
        <span aria-hidden className="text-ash">|</span>
        <span>{t("eh.statWorlds")}</span>
        <span aria-hidden className="text-ash">|</span>
        <span>{t("eh.statMachines", { n: localizeDigits(total, lang) })}</span>
        <span aria-hidden className="text-ash">|</span>
        <span className="text-[#f39a6b]">{t("eh.statStory")}</span>
      </p>
    </motion.div>
  );
}

function ExhibitCards({ img }: { img: (id: string) => string | undefined }) {
  const { t, lang } = useT();
  const cards = CARDS.map((c) => ({ ...c, nav: NAV.find((n) => n.href === c.href)! }));
  return (
    <nav aria-label={t("exhibits.kicker")} className="-mx-[clamp(1rem,4vw,3.5rem)] mt-8 xl:mx-0 xl:mt-6">
      <ol className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-[clamp(1rem,4vw,3.5rem)] pb-2 xl:grid xl:grid-cols-8 xl:gap-2 xl:overflow-visible xl:px-0 xl:pb-0">
        {cards.map((c, i) => (
          <motion.li
            key={c.href}
            className="w-[210px] shrink-0 snap-start xl:w-auto"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8 + i * 0.07, duration: 0.9, ease: EASE }}
          >
            <Link
              href={c.href}
              className="group relative block h-[200px] overflow-hidden border border-hairline-strong bg-void-2 transition-[border-color,transform] duration-500 [clip-path:polygon(7%_0,100%_0,93%_100%,0_100%)] hover:-translate-y-1 hover:border-lunar-2 xl:h-[184px]"
            >
              {img(c.image) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                src={img(c.image)}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover opacity-45 transition duration-700 group-hover:scale-105 group-hover:opacity-70"
              />
              )}
              <span aria-hidden className="absolute inset-0 bg-gradient-to-b from-void/85 via-void/30 to-void/80" />
              <span className="relative flex h-full flex-col p-4 pl-6">
                <span className="font-mono text-lg text-lunar">{localizeDigits(String(i + 1).padStart(2, "0"), lang)}</span>
                <span className="mt-2 text-[15px] font-semibold uppercase leading-tight tracking-[0.04em] text-lunar">{t(c.nav.key)}</span>
                <span className="mt-2 text-[11px] leading-snug text-lunar-2">{t(c.desc)}</span>
                <span
                  aria-hidden
                  className="mt-auto ml-auto mr-2 flex h-8 w-8 items-center justify-center rounded-full border border-lunar/70 text-sm text-lunar transition-colors group-hover:bg-lunar group-hover:text-void"
                >
                  →
                </span>
              </span>
            </Link>
          </motion.li>
        ))}
      </ol>
    </nav>
  );
}
