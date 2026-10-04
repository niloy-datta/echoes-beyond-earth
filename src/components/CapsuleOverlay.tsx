"use client";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef } from "react";
import { useCapsule } from "@/lib/capsule";
import { useMuseum, type MuseumData } from "@/lib/data";
import { formatDate } from "@/lib/dates";
import { formatCoords } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { usePassport } from "@/lib/passport";
import { useSound } from "@/lib/sound";
import type { MissionFeature, Story } from "@/lib/types";
import { useDialog } from "@/lib/useDialog";
import { ImageCredit, NasaImage, SourceLink, StatusDot, VerificationBadge } from "./ui";

const EASE = [0.22, 1, 0.36, 1] as const;

export function CapsuleOverlay() {
  const { current, close } = useCapsule();
  const { data } = useMuseum();
  const feature = current && data ? data.byId.get(current.objectId) : undefined;

  return (
    <AnimatePresence>
      {current && data && feature && (
        <CapsuleDialog key={`${current.objectId}@${current.pathId ?? ""}`} data={data} feature={feature} pathId={current.pathId} onClose={close} />
      )}
    </AnimatePresence>
  );
}

function CapsuleDialog({
  data,
  feature,
  pathId,
  onClose,
}: {
  data: MuseumData;
  feature: MissionFeature;
  pathId?: string;
  onClose: () => void;
}) {
  const { t, l, lang } = useT();
  const { open } = useCapsule();
  const { mark, markPathStep } = usePassport();
  const { ping } = useSound();
  const ref = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const p = feature.properties;
  const story = data.storyFor(p.id);
  const path = pathId ? data.stories.paths.find((x) => x.id === pathId) : undefined;
  const stepIndex = path ? path.steps.findIndex((s) => s.object === p.id) : -1;

  const handleClose = useCallback(() => onClose(), [onClose]);
  useDialog(ref, true, handleClose);

  useEffect(() => {
    mark("capsules", p.id);
    mark("discovered", p.id);
    if (path && stepIndex >= 0) markPathStep(path.id, p.id);
    ping(0.4, 987.8);
    scroller.current?.scrollTo({ top: 0 });
  }, [p.id, path, stepIndex, mark, markPathStep, ping]);

  const heroImageId = story?.chapters.find((c) => c.image)?.image ?? p.image;
  const hero = data.image(heroImageId);
  const name = l(p.name);

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={t("capsule.dialog", { name })}
      className="fixed inset-0 z-[70] bg-void"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <div ref={scroller} className="h-full overflow-y-auto overscroll-contain">
        {/* Top bar */}
        <div className="sticky top-0 z-20 border-b border-hairline bg-void/85 backdrop-blur-md">
          <div className="container-x flex h-[var(--header-h)] items-center justify-between gap-4">
            <p className="label truncate">
              {path && stepIndex >= 0
                ? t("capsule.pathOf", { path: l(path.title), n: stepIndex + 1, total: path.steps.length })
                : t("capsule.label")}
            </p>
            <button type="button" onClick={handleClose} className="btn-ghost !px-3.5 !py-2 shrink-0" data-autofocus>
              <span aria-hidden>✕</span> {t("common.close")}
            </button>
          </div>
        </div>

        {/* Hero */}
        <section className="relative">
          {hero && hero.width / hero.height > 2.4 ? (
            // Panoramas are shown whole, as a strip, rather than cropped and upscaled.
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.6 }} className="pt-10 md:pt-16">
              <NasaImage image={hero} alt={hero.title} className="w-full" imgClassName="!h-auto" priority />
              <div className="h-[30svh] min-h-[220px]" />
            </motion.div>
          ) : hero ? (
            <motion.div
              initial={{ scale: 1.06, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 2.2, ease: EASE }}
              className="h-[62svh] min-h-[360px] w-full md:h-[74svh]"
            >
              <NasaImage image={hero} alt={hero.title} className="h-full w-full" priority />
            </motion.div>
          ) : (
            <div className="h-[34svh] min-h-[240px]" />
          )}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgb(3_4_5/0.15),rgb(3_4_5/0)_35%,rgb(3_4_5/0.9)_85%,#030405)]" />
          <div className="container-x absolute inset-x-0 bottom-0 pb-8 md:pb-12">
            <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25, duration: 1, ease: EASE }}>
              <p className="label mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="flex items-center gap-2 text-lunar-2">
                  <StatusDot status={p.status} /> {t(`common.status.${p.status}` as const)}
                </span>
                <span>{t(`common.body.${p.body}` as const)}</span>
                <span>{t(`common.kind.${p.kind}` as const)}</span>
              </p>
              <h2 className="display max-w-5xl text-[clamp(2.1rem,6.4vw,5.2rem)]">{story ? l(story.title) : name}</h2>
              {story && <p className="mt-5 max-w-2xl text-[clamp(1rem,1.7vw,1.25rem)] leading-relaxed text-lunar-2">{l(story.dek)}</p>}
            </motion.div>
          </div>
        </section>
        {hero && (
          <div className="container-x">
            <ImageCredit image={hero} />
          </div>
        )}

        <div className="container-x grid gap-16 py-14 md:py-20 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-20">
          <div className="min-w-0">
            {story ? <Chapters story={story} data={data} heroImageId={heroImageId} /> : <p className="max-w-2xl text-lg leading-relaxed text-lunar-2">{t("capsule.noStory")}</p>}

            {story?.lastSignal && (
              <section className="mt-20 border-t border-hairline pt-10" aria-labelledby="cap-last">
                <h3 id="cap-last" className="label mb-6 text-signal">
                  {t("capsule.lastSignal")}
                </h3>
                <p className="font-serif text-[clamp(2rem,5vw,3.6rem)] italic leading-none">{formatDate(story.lastSignal.date, lang)}</p>
                <p className="mt-5 max-w-xl text-lunar-2">{l(story.lastSignal.text)}</p>
                <div className="mt-4">
                  <VerificationBadge status={story.lastSignal.verification} />
                </div>
              </section>
            )}

            {story && (
              <section className="mt-20 border-t border-hairline pt-10" aria-labelledby="cap-kept">
                <h3 id="cap-kept" className="label mb-6">
                  {t("capsule.kept")}
                </h3>
                <p className="max-w-3xl text-[clamp(1.25rem,2.6vw,1.9rem)] leading-snug text-lunar">{l(story.kept)}</p>
              </section>
            )}

            {story && story.facts.length > 0 && (
              <section className="mt-20 border-t border-hairline pt-10" aria-labelledby="cap-evidence">
                <h3 id="cap-evidence" className="label mb-6">
                  {t("capsule.evidence")}
                </h3>
                <dl className="divide-y divide-hairline border-y border-hairline">
                  {story.facts.map((f, i) => (
                    <div key={i} className="grid gap-2 py-5 md:grid-cols-[200px_minmax(0,1fr)] md:gap-6">
                      <dt className="text-sm text-dust">{l(f.label)}</dt>
                      <dd className="min-w-0">
                        <p className="text-lunar">{l(f.value)}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <VerificationBadge status={f.verification} />
                          <SourceLink id={f.source} />
                        </div>
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>

          <Record feature={feature} data={data} onClose={handleClose} />
        </div>

        {path && stepIndex >= 0 && (
          <nav aria-label={l(path.title)} className="border-t border-hairline">
            <div className="container-x grid grid-cols-2 gap-4 py-8">
              <div>
                {stepIndex > 0 && (
                  <button type="button" className="btn-ghost" onClick={() => open(path.steps[stepIndex - 1].object, { pathId: path.id })}>
                    ← {t("capsule.prev")}
                  </button>
                )}
              </div>
              <div className="text-right">
                {stepIndex < path.steps.length - 1 ? (
                  <button type="button" className="btn-signal" onClick={() => open(path.steps[stepIndex + 1].object, { pathId: path.id })}>
                    {t("capsule.next")} · {l(data.byId.get(path.steps[stepIndex + 1].object)?.properties.name)} →
                  </button>
                ) : (
                  <p className="label text-signal">{t("paths.complete")}</p>
                )}
              </div>
            </div>
          </nav>
        )}
      </div>
    </motion.div>
  );
}

function Chapters({ story, data, heroImageId }: { story: Story; data: MuseumData; heroImageId: string | null | undefined }) {
  const { l } = useT();
  return (
    <div className="flex flex-col gap-20 md:gap-28">
      {story.chapters.map((c, i) => {
        const img = data.image(c.image);
        return (
          <motion.article
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 1, ease: EASE }}
          >
            <p className="label mb-4 text-signal">{l(c.kicker)}</p>
            <h3 className="text-[clamp(1.5rem,3.2vw,2.4rem)] font-medium leading-tight tracking-tight">{l(c.title)}</h3>
            <p className="mt-5 max-w-2xl text-[1.05rem] leading-relaxed text-lunar-2">{l(c.body)}</p>
            {img && c.image !== heroImageId && (
              <figure className="mt-8">
                <NasaImage
                  image={img}
                  alt={img.title}
                  className="w-full"
                  imgClassName="!h-auto max-h-[75svh] !object-contain"
                />
                <figcaption className="mt-3">
                  <ImageCredit image={img} />
                </figcaption>
              </figure>
            )}
          </motion.article>
        );
      })}
    </div>
  );
}

function Record({ feature, data, onClose }: { feature: MissionFeature; data: MuseumData; onClose: () => void }) {
  const { t, l, lang } = useT();
  const p = feature.properties;
  const coords = formatCoords(feature, lang);
  return (
    <aside aria-labelledby="cap-record" className="h-fit lg:sticky lg:top-[calc(var(--header-h)+2rem)]">
      <h3 id="cap-record" className="label mb-5">
        {t("capsule.record")}
      </h3>
      <dl className="divide-y divide-hairline border-y border-hairline text-sm">
        <Row label={t("common.mission")}>{p.mission}</Row>
        <Row label={t("common.site")}>{l(p.site)}</Row>
        <Row label={t("common.arrived")}>
          {formatDate(p.arrived.date, lang)}
          <div className="mt-1.5">
            <VerificationBadge status={p.arrived.verification} />
          </div>
        </Row>
        {p.end && (
          <Row label={l(p.end.label)}>
            {formatDate(p.end.date, lang)}
            <div className="mt-1.5">
              <VerificationBadge status={p.end.verification} />
            </div>
          </Row>
        )}
        <Row label={t("common.coordinates")}>
          {coords ? (
            <>
              {coords} <span className="text-dust">({t("common.coordsApprox")})</span>
            </>
          ) : (
            t("common.coordsUnknown")
          )}
          <div className="mt-1.5">
            <VerificationBadge status={p.coordinates.verification} />
          </div>
        </Row>
        <Row label={t("archive.status")}>
          {t(`common.status.${p.status}` as const)}
          <p className="mt-1 text-xs text-dust">{t("common.statusAsOf", { date: formatDate(p.statusAsOf, lang) })}</p>
          <div className="mt-1.5">
            <VerificationBadge status={p.statusVerification} />
          </div>
        </Row>
      </dl>
      <h4 className="label mb-3 mt-8">{t("common.sources")}</h4>
      {p.sources.length ? (
        <ul className="flex flex-col gap-3">
          {p.sources.map((s) => (
            <li key={s} className="flex flex-col gap-1">
              <SourceLink id={s} />
              {data.reference(s) && <VerificationBadge status={data.reference(s)!.verification} />}
            </li>
          ))}
        </ul>
      ) : (
        <VerificationBadge status="required" />
      )}
      {feature.geometry && (
        <Link
          href={`/explore/?body=${p.body}&focus=${p.id}`}
          onClick={onClose}
          className="btn-ghost mt-8"
        >
          {t("capsule.onMap")} →
        </Link>
      )}
    </aside>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-4 py-3.5">
      <dt className="text-dust">{label}</dt>
      <dd className="text-lunar">{children}</dd>
    </div>
  );
}
