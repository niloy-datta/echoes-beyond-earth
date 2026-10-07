"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { NasaImage, SourceLink, VerificationBadge } from "@/components/ui";
import { useCapsule } from "@/lib/capsule";
import { useMuseum } from "@/lib/data";
import { localizeDigits, yearOf } from "@/lib/dates";
import { useT } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";

const EASE = [0.22, 1, 0.36, 1] as const;
const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-12% 0px" },
  transition: { duration: 1.1, ease: EASE },
};

export function Prologue() {
  const { t } = useT();
  return (
    <section id="prologue" aria-labelledby="prologue-title" className="relative scroll-mt-[var(--header-h)] py-[clamp(6rem,16vw,12rem)]">
      <div className="container-x grid gap-10 md:grid-cols-[160px_minmax(0,1fr)]">
        <h2 id="prologue-title" className="label pt-3">
          {t("prologue.kicker")}
        </h2>
        <div className="flex max-w-4xl flex-col gap-10 md:gap-14">
          <motion.p {...reveal} className="text-[clamp(1.6rem,3.6vw,3rem)] leading-[1.18] tracking-tight text-lunar">
            {t("prologue.p1")}
          </motion.p>
          <motion.p {...reveal} className="font-serif text-[clamp(2rem,4.6vw,4rem)] italic leading-[1.05] text-lunar-2">
            {t("prologue.p2")}
          </motion.p>
          <motion.p {...reveal} className="max-w-3xl text-[clamp(1.15rem,2vw,1.6rem)] leading-relaxed text-lunar-2">
            {t("prologue.p3")}
          </motion.p>
        </div>
      </div>
    </section>
  );
}

export function Mirror() {
  const { t } = useT();
  const { data } = useMuseum();
  const { reducedMotion } = useSettings();
  const moon = data?.image("GSFC_20171208_Archive_e001861");
  const lightTimeSource = data?.reference("calc:moon-light-time");
  return (
    <section aria-labelledby="mirror-title" className="relative overflow-hidden border-t border-hairline py-[clamp(5rem,12vw,10rem)]">
      <div className="container-x grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <motion.div {...reveal} className="relative order-2 mx-auto aspect-square w-full max-w-[560px] lg:order-1">
          {/* A laser pulse leaves Earth, touches the Moon, returns. Symbolic — not a measurement. */}
          <svg aria-hidden viewBox="0 0 560 560" className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible">
            <line x1="-400" y1="80" x2="300" y2="268" stroke="#63e6ef" strokeOpacity="0.12" strokeWidth="1" />
            {!reducedMotion && (
              <motion.circle
                r="2.4"
                fill="#63e6ef"
                initial={{ cx: -400, cy: 80, opacity: 0 }}
                animate={{ cx: [-400, 300, -400], cy: [80, 268, 80], opacity: [0, 1, 1, 0] }}
                transition={{ duration: 2.56 * 1.6, times: [0, 0.5, 1], repeat: Infinity, repeatDelay: 2.4, ease: "linear" }}
              />
            )}
            <circle cx="300" cy="268" r="3" fill="#63e6ef" />
            <circle cx="300" cy="268" r="10" fill="none" stroke="#63e6ef" strokeOpacity="0.4" className="pulse-ring origin-[300px_268px]" />
          </svg>
          <div className="h-full w-full overflow-hidden rounded-full">
            <NasaImage image={moon} alt={t("mirror.imageAlt")} className="h-full w-full scale-[1.06]" />
          </div>
        </motion.div>
        <motion.div {...reveal} className="order-1 lg:order-2">
          <p className="label mb-6 text-signal">{t("mirror.kicker")}</p>
          <h2 id="mirror-title" className="display text-[clamp(2.2rem,5.2vw,4.4rem)]">
            {t("mirror.title")}
          </h2>
          <p className="mt-7 max-w-lg text-[1.1rem] leading-relaxed text-lunar-2">{t("mirror.body")}</p>
          <div className="mt-12 border-t border-hairline pt-6">
            <p className="font-serif text-[clamp(3.2rem,7vw,5.5rem)] leading-none">{t("mirror.stat")}</p>
            <p className="mt-3 max-w-sm text-sm text-dust">{t("mirror.statLabel")}</p>
            {lightTimeSource && (
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <VerificationBadge status={lightTimeSource.verification} />
                <SourceLink id={lightTimeSource.id} />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/** Real data, drawn quietly: one mark per machine, placed by its year of arrival. */
export function Silence() {
  const { t, l, lang } = useT();
  const { data } = useMuseum();
  const { open } = useCapsule();
  if (!data) return null;
  const objects = [...data.objects].sort((a, b) => a.properties.arrived.date.localeCompare(b.properties.arrived.date));
  const silent = objects.filter((o) => o.properties.status !== "active").length;
  const active = objects.length - silent;
  const start = 1960;
  const end = 2026;
  const pos = (y: number) => ((y - start) / (end - start)) * 100;
  // Stack marks that share a year so none overlap.
  const stacks = new Map<number, number>();

  return (
    <section aria-labelledby="silence-title" className="border-t border-hairline py-[clamp(5rem,12vw,10rem)]">
      <div className="container-x">
        <motion.div {...reveal} className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <p className="label mb-6">{t("silence.kicker")}</p>
            <h2 id="silence-title" className="display text-[clamp(2.2rem,5.2vw,4.4rem)]">
              {t("silence.title")}
            </h2>
          </div>
          <div className="lg:pt-12">
            <p className="max-w-xl text-[1.1rem] leading-relaxed text-lunar-2">{t("silence.body")}</p>
            <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-2 font-mono text-[11px] uppercase tracking-[0.16em]">
              <li className="text-lunar">{t("silence.count", { n: localizeDigits(objects.length, lang) })}</li>
              <li className="text-dust">{t("silence.silent", { n: localizeDigits(silent, lang) })}</li>
              <li className="text-signal">{t("silence.active", { n: localizeDigits(active, lang) })}</li>
            </ul>
          </div>
        </motion.div>

        <motion.div {...reveal} className="relative mt-16 md:mt-24">
          <div className="relative h-44 border-b border-hairline md:h-52">
            {objects.map((o, i) => {
              const y = yearOf(o.properties.arrived.date) ?? start;
              const level = stacks.get(y) ?? 0;
              stacks.set(y, level + 1);
              const isActive = o.properties.status === "active";
              return (
                <motion.button
                  key={o.id}
                  type="button"
                  onClick={() => open(o.id)}
                  aria-label={`${l(o.properties.name)}, ${localizeDigits(y, lang)}`}
                  title={`${l(o.properties.name)} · ${localizeDigits(y, lang)}`}
                  className="group absolute -translate-x-1/2 p-1.5"
                  style={{ left: `${pos(y)}%`, bottom: `${8 + level * 22}px` }}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.035, duration: 0.6 }}
                >
                  <span
                    className={`block h-2 w-2 rounded-full transition-transform group-hover:scale-150 ${
                      isActive ? "bg-signal shadow-[0_0_12px_#63e6ef]" : o.properties.body === "mars" ? "bg-mars/80" : "bg-lunar-2/80"
                    }`}
                  />
                </motion.button>
              );
            })}
          </div>
          <div className="mt-3 flex justify-between font-mono text-[10px] tracking-[0.14em] text-dust">
            {[1960, 1970, 1980, 1990, 2000, 2010, 2020].map((y) => (
              <span key={y}>{localizeDigits(y, lang)}</span>
            ))}
            <span className="text-lunar-2">{localizeDigits(2026, lang)}</span>
          </div>
          <div className="mt-6 flex flex-wrap gap-6 font-mono text-[10px] uppercase tracking-[0.14em] text-dust">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-lunar-2/80" /> {t("common.body.moon")}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-mars/80" /> {t("common.body.mars")}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-signal" /> {t("common.status.active")}
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function LensTeaser() {
  const { t } = useT();
  const { data } = useMuseum();
  const then = data?.image("as08-14-2383");
  const now = data?.image("art002e021278");
  return (
    <section aria-labelledby="lens-teaser" className="border-t border-hairline py-[clamp(5rem,12vw,10rem)]">
      <div className="container-x">
        <motion.div {...reveal} className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="label mb-6">{t("lensTeaser.kicker")}</p>
            <h2 id="lens-teaser" className="display max-w-3xl text-[clamp(2.2rem,5.2vw,4.4rem)]">
              {t("lensTeaser.title")}
            </h2>
          </div>
          <Link href="/lens/" className="btn-ghost shrink-0 self-start md:self-auto">
            {t("lensTeaser.cta")} →
          </Link>
        </motion.div>
        <motion.div {...reveal} className="grid gap-px bg-hairline sm:grid-cols-2">
          {[
            { img: then, year: "1968", label: "Apollo 8" },
            { img: now, year: "2026", label: "Artemis II" },
          ].map((x) => (
            <figure key={x.year} className="relative bg-void">
              <NasaImage image={x.img} alt={x.img?.title ?? ""} className="aspect-[4/3] w-full" />
              <figcaption className="absolute left-4 top-4 flex items-baseline gap-3">
                <span className="font-serif text-4xl italic">{x.year}</span>
                <span className="label text-lunar-2">{x.label}</span>
              </figcaption>
            </figure>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
