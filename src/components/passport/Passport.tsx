"use client";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { NasaImage } from "@/components/ui";
import { useCapsule } from "@/lib/capsule";
import { useMuseum } from "@/lib/data";
import { formatDate, localizeDigits, yearOf } from "@/lib/dates";
import { useT, type StringKey } from "@/lib/i18n";
import { usePassport } from "@/lib/passport";

export function Passport() {
  const { data } = useMuseum();
  const { t, l, lang } = useT();
  const { passport, reset } = usePassport();
  const { open } = useCapsule();
  const [confirming, setConfirming] = useState(false);
  if (!data) return null;

  const total = data.objects.length;
  const discovered = data.objects.filter((o) => passport.discovered.includes(o.id));
  const pathsDone = data.stories.paths.filter((p) => p.steps.every((s) => (passport.pathSteps[p.id] ?? []).includes(s.object))).length;
  const score =
    discovered.length / total + passport.capsules.length / Math.max(data.stories.stories.length, 1) + pathsDone / data.stories.paths.length + Math.min(passport.signals.length, 3) / 3;
  const rank = score >= 3 ? 3 : score >= 1.6 ? 2 : score >= 0.4 ? 1 : 0;

  const stats: [StringKey, number, number?][] = [
    ["pp.discovered", discovered.length, total],
    ["pp.capsules", passport.capsules.length, data.stories.stories.length],
    ["pp.paths", pathsDone, data.stories.paths.length],
    ["pp.signals", passport.signals.length],
    ["pp.lenses", passport.lenses.length, data.stories.lens.length],
    ["pp.ripples", passport.ripples.length, data.stories.ripples.length],
  ];

  return (
    <div className="container-x pb-28">
      <section aria-labelledby="pp-rank" className="grid gap-10 border-t border-hairline pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div>
          <p className="label">{t("pp.rank")}</p>
          <h2 id="pp-rank" className="mt-3 font-serif text-[clamp(2.4rem,5vw,4rem)] italic leading-none">
            {t(`pp.rank${rank}` as StringKey)}
          </h2>
          {passport.firstVisit && <p className="label mt-5">{t("pp.since", { date: formatDate(passport.firstVisit, lang) })}</p>}
          <div className="mt-6 flex gap-1.5" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`h-0.5 w-10 ${i <= rank ? "bg-signal" : "bg-hairline-strong"}`} />
            ))}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-px bg-hairline sm:grid-cols-3">
          {stats.map(([key, n, of]) => (
            <div key={key} className="bg-void p-5">
              <dt className="label">{t(key)}</dt>
              <dd className="mt-3 font-serif text-4xl italic leading-none">
                {localizeDigits(n, lang)}
                {of != null && <span className="ml-1 font-sans text-sm not-italic text-dust">/ {localizeDigits(of, lang)}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="pp-stamps" className="mt-20">
        <h2 id="pp-stamps" className="label mb-8">
          {t("pp.stamps")}
        </h2>
        {discovered.length === 0 && (
          <div className="mb-12 flex flex-col items-start gap-5">
            <p className="max-w-xl text-[clamp(1.2rem,2.4vw,1.7rem)] leading-snug text-lunar-2">{t("pp.empty")}</p>
            <Link href="/explore/" className="btn-signal">
              {t("pp.startExploring")} →
            </Link>
          </div>
        )}
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {data.objects.map((o, i) => {
            const got = passport.discovered.includes(o.id);
            const p = o.properties;
            return (
              <motion.li
                key={o.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 6) * 0.05, duration: 0.6 }}
              >
                <button
                  type="button"
                  onClick={() => open(o.id)}
                  aria-label={got ? l(p.name) : `${t("pp.locked")} — ${l(p.name)}`}
                  className="group flex w-full flex-col items-center text-center"
                >
                  <span
                    className={`relative flex aspect-square w-full max-w-[150px] items-center justify-center overflow-hidden rounded-full border ${
                      got ? "border-signal/60" : "border-dashed border-hairline-strong"
                    }`}
                  >
                    {got ? (
                      <NasaImage image={data.image(p.image)} alt="" thumb className="h-full w-full" imgClassName="opacity-80 transition duration-700 group-hover:opacity-100" />
                    ) : (
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ash">{localizeDigits(yearOf(p.arrived.date) ?? "", lang)}</span>
                    )}
                    {got && (
                      <span className="absolute inset-x-0 bottom-3 font-mono text-[10px] uppercase tracking-[0.16em] text-lunar drop-shadow">
                        {localizeDigits(yearOf(p.arrived.date) ?? "", lang)}
                      </span>
                    )}
                  </span>
                  <span className={`mt-3 text-xs leading-snug ${got ? "text-lunar-2" : "text-ash"}`}>{got ? l(p.name) : t("pp.locked")}</span>
                </button>
              </motion.li>
            );
          })}
        </ul>
      </section>

      <section className="mt-24 border-t border-hairline pt-8">
        <AnimatePresence mode="wait" initial={false}>
          {confirming ? (
            <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="alertdialog" aria-labelledby="pp-confirm" className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <p id="pp-confirm" className="text-lunar-2">
                {t("pp.resetConfirm")}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-ghost !border-caution !text-caution"
                  autoFocus
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
            <motion.button key="reset" type="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="btn-ghost" onClick={() => setConfirming(true)}>
              {t("pp.reset")}
            </motion.button>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}
