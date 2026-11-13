"use client";
import { motion } from "framer-motion";
import { NasaImage } from "@/components/ui";
import { useCapsule } from "@/lib/capsule";
import { useMuseum } from "@/lib/data";
import { localizeDigits } from "@/lib/dates";
import { useT } from "@/lib/i18n";
import { usePassport } from "@/lib/passport";

export function Paths() {
  const { data } = useMuseum();
  const { t, l, lang } = useT();
  const { open } = useCapsule();
  const { passport } = usePassport();
  if (!data) return null;

  return (
    <div className="container-x flex flex-col gap-24 pb-28 md:gap-32">
      {data.stories.paths.map((path, pi) => {
        const visited = passport.pathSteps[path.id] ?? [];
        const done = path.steps.filter((s) => visited.includes(s.object)).length;
        const complete = done === path.steps.length;
        const next = path.steps.find((s) => !visited.includes(s.object)) ?? path.steps[0];
        const cover = data.image(data.byId.get(path.steps[0].object)?.properties.image);
        return (
          <motion.section
            key={path.id}
            aria-labelledby={`path-${path.id}`}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-10 border-t border-hairline pt-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16"
          >
            <div>
              <p className="label mb-5">{localizeDigits(String(pi + 1).padStart(2, "0"), lang)}</p>
              <h2 id={`path-${path.id}`} className="display text-[clamp(2rem,4.4vw,3.6rem)]">
                {l(path.title)}
              </h2>
              <p className="mt-5 max-w-md text-lunar-2">{l(path.dek)}</p>
              <div className="mt-8" aria-label={t("paths.progress", { done, total: path.steps.length })}>
                <div className="flex gap-1.5" aria-hidden>
                  {path.steps.map((s) => (
                    <span key={s.object} className={`h-0.5 flex-1 ${visited.includes(s.object) ? "bg-signal" : "bg-hairline-strong"}`} />
                  ))}
                </div>
                <p className={`label mt-3 ${complete ? "text-signal" : ""}`}>
                  {complete
                    ? t("paths.complete")
                    : t("paths.progress", { done: localizeDigits(done, lang), total: localizeDigits(path.steps.length, lang) })}
                </p>
              </div>
              <button type="button" className="btn-signal mt-8" onClick={() => open(complete ? path.steps[0].object : next.object, { pathId: path.id })}>
                {complete ? t("paths.review") : done > 0 ? t("paths.continue") : t("paths.start")} →
              </button>
              <NasaImage image={cover} alt="" className="mt-10 hidden aspect-[16/10] w-full lg:block" imgClassName="opacity-80" />
            </div>
            <ol className="border-t border-hairline lg:border-t-0">
              {path.steps.map((s, i) => {
                const f = data.byId.get(s.object);
                if (!f) return null;
                const seen = visited.includes(s.object);
                return (
                  <li key={s.object}>
                    <button
                      type="button"
                      onClick={() => open(s.object, { pathId: path.id })}
                      className="group grid w-full grid-cols-[4.5rem_minmax(0,1fr)_auto] items-baseline gap-4 border-b border-hairline py-5 text-left"
                    >
                      <span className={`label whitespace-nowrap ${seen ? "text-signal" : ""}`}>{t("paths.stop", { n: localizeDigits(i + 1, lang) })}</span>
                      <span className="min-w-0">
                        <span className="block text-lg text-lunar-2 transition-colors group-hover:text-lunar">{l(f.properties.name)}</span>
                        <span className="mt-1 block text-sm text-dust">{l(s.note)}</span>
                      </span>
                      <span aria-hidden className={`transition-transform group-hover:translate-x-1 ${seen ? "text-signal" : "text-dust"}`}>
                        {seen ? "✓" : "→"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </motion.section>
        );
      })}
    </div>
  );
}
