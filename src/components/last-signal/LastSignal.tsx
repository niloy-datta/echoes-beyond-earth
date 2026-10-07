"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { NasaImage, VerificationBadge } from "@/components/ui";
import { useCapsule } from "@/lib/capsule";
import { useMuseum } from "@/lib/data";
import { formatDate, localizeDigits, yearOf } from "@/lib/dates";
import { useT } from "@/lib/i18n";
import { usePassport } from "@/lib/passport";
import { useSettings } from "@/lib/settings";
import { useSound } from "@/lib/sound";
import type { MissionFeature } from "@/lib/types";

const EASE = [0.22, 1, 0.36, 1] as const;
// Passive laser retroreflectors confirmed by the NASA captions in sources.json (img:as11-37-5551, img:PIA13037).
const REFLECTORS = new Set(["apollo-11", "apollo-15"]);

type Phase = "idle" | "outbound" | "listening" | "echo" | "silence";

export function LastSignal() {
  const { data } = useMuseum();
  const { t, l, lang } = useT();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const candidates = useMemo(
    () =>
      (data?.objects ?? [])
        .filter((f) => f.properties.status !== "active")
        .sort((a, b) => (b.properties.end?.date ?? b.properties.arrived.date).localeCompare(a.properties.end?.date ?? a.properties.arrived.date)),
    [data],
  );
  const selected = selectedId ? data?.byId.get(selectedId) : undefined;
  if (!data) return null;

  return (
    <div className="container-x pb-28">
      <AnimatePresence mode="wait">
        {!selected ? (
          <motion.section
            key="choose"
            aria-labelledby="ls-choose"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 id="ls-choose" className="label mb-6">
              {t("ls.choose")}
            </h2>
            <ul className="grid gap-px bg-hairline sm:grid-cols-2 lg:grid-cols-3">
              {candidates.map((f) => {
                const p = f.properties;
                return (
                  <li key={f.id} className="bg-void">
                    <button type="button" onClick={() => setSelectedId(f.id)} className="group flex h-full w-full items-center gap-4 p-4 text-left transition-colors hover:bg-void-2">
                      <NasaImage image={data.image(p.image)} alt="" thumb className="aspect-square w-14 shrink-0" imgClassName="grayscale transition duration-700 group-hover:grayscale-0" />
                      <span className="min-w-0">
                        <span className="block truncate text-lunar-2 group-hover:text-lunar">{l(p.name)}</span>
                        <span className="label mt-1 block">
                          {t(`common.body.${p.body}` as const)} · {p.end ? localizeDigits(yearOf(p.end.date) ?? "", lang) : "—"}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.section>
        ) : (
          <Sequence key={selected.id} feature={selected} onBack={() => setSelectedId(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function Sequence({ feature, onBack }: { feature: MissionFeature; onBack: () => void }) {
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
  // Animation time is compressed; the real light time is stated in text.
  const travel = reducedMotion ? 0.01 : isMars ? 4.2 : 1.9;

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));

  const send = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setPhase("outbound");
    ping(0.9, 1318.5);
    later(travel * 1000, () => {
      if (reflector) {
        setPhase("echo");
        ping(0.5, 1975.5);
        later(travel * 1000 + 600, () => setPhase("silence"));
      } else {
        setPhase("listening");
        later(reducedMotion ? 300 : 2600, () => setPhase("silence"));
      }
      mark("signals", p.id);
    });
  };

  const endYear = yearOf(p.end?.date ?? story?.lastSignal?.date ?? null);
  const asOf = yearOf(p.statusAsOf) ?? 2026;
  const silentYears = endYear != null ? asOf - endYear : null;
  const lastDate = story?.lastSignal?.date ?? p.end?.date ?? null;
  const lastVerification = story?.lastSignal?.verification ?? p.end?.verification ?? "required";

  return (
    <motion.section
      aria-label={l(p.name)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      <button type="button" onClick={onBack} className="btn-ghost mb-10">
        ← {t("ls.again")}
      </button>

      {/* Stage */}
      <div className="relative border-y border-hairline py-10 md:py-16">
        <svg viewBox="0 0 1000 220" className="h-auto w-full overflow-visible" role="img" aria-label={`${t("ls.earth")} → ${l(p.name)}`}>
          <line x1="90" y1="110" x2="910" y2="110" stroke="#ecebe6" strokeOpacity="0.14" strokeDasharray="2 8" />
          {/* Earth */}
          <circle cx="90" cy="110" r="26" fill="#0d1013" stroke="#63e6ef" strokeOpacity="0.55" />
          <circle cx="90" cy="110" r="5" fill="#63e6ef" />
          <text x="90" y="170" textAnchor="middle" className="fill-dust font-mono text-[13px] uppercase tracking-[0.2em]">
            {t("ls.earth")}
          </text>
          {/* Target world */}
          <circle cx="910" cy="110" r={isMars ? 22 : 30} fill={isMars ? "#3a1f14" : "#24252a"} stroke={isMars ? "#c8754f" : "#b9b8b2"} strokeOpacity="0.6" />
          <circle cx="910" cy="110" r="4" fill={phase === "echo" ? "#63e6ef" : "#7d7c78"} />
          <text x="910" y="170" textAnchor="middle" className="fill-dust font-mono text-[13px] uppercase tracking-[0.2em]">
            {t(`common.body.${p.body}` as const)}
          </text>

          {phase === "outbound" && (
            <motion.g initial={{ x: 0 }} animate={{ x: 820 }} transition={{ duration: travel, ease: "linear" }}>
              <circle cx="90" cy="110" r="4" fill="#63e6ef" />
              <rect x="10" y="109.5" width="80" height="1" fill="url(#trail)" />
            </motion.g>
          )}
          {phase === "echo" && (
            <motion.g initial={{ x: 820 }} animate={{ x: 0 }} transition={{ duration: travel, ease: "linear" }}>
              <circle cx="90" cy="110" r="3" fill="#63e6ef" />
              <rect x="90" y="109.5" width="80" height="1" fill="url(#trail-back)" />
            </motion.g>
          )}
          {phase === "listening" && !reducedMotion && (
            <motion.circle
              cx="910"
              cy="110"
              fill="none"
              stroke="#63e6ef"
              initial={{ r: 30, opacity: 0.6 }}
              animate={{ r: 90, opacity: 0 }}
              transition={{ duration: 2.4, ease: "easeOut" }}
            />
          )}
          <defs>
            <linearGradient id="trail" x1="0" x2="1">
              <stop offset="0" stopColor="#63e6ef" stopOpacity="0" />
              <stop offset="1" stopColor="#63e6ef" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="trail-back" x1="0" x2="1">
              <stop offset="0" stopColor="#63e6ef" stopOpacity="0.9" />
              <stop offset="1" stopColor="#63e6ef" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        <div className="mt-8 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-[clamp(1.4rem,3vw,2.2rem)] font-medium tracking-tight">{l(p.name)}</h2>
            <p className="mt-2 max-w-xl text-sm text-dust">
              {isMars ? t("ls.lightMars") : t("ls.lightMoon")} {t("ls.timeScaled")}
            </p>
          </div>
          <button
            type="button"
            onClick={send}
            disabled={phase === "outbound" || phase === "listening" || phase === "echo"}
            className="btn-signal shrink-0 disabled:cursor-wait disabled:opacity-50"
          >
            <span aria-hidden className="relative flex h-2 w-2">
              <span className="pulse-ring absolute inset-0 rounded-full bg-signal" />
              <span className="relative h-2 w-2 rounded-full bg-signal" />
            </span>
            {phase === "outbound" ? t("ls.sending") : t("ls.send")}
          </button>
        </div>
      </div>

      {/* Outcome */}
      <div aria-live="polite" className="min-h-[2rem]">
        <AnimatePresence>
          {(phase === "listening" || phase === "silence") && !reflector && (
            <motion.p
              key="noreply"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.6 }}
              className="mt-14 font-serif text-[clamp(2.6rem,7vw,5.5rem)] italic leading-none text-lunar-2"
            >
              {t("ls.noReply")}
            </motion.p>
          )}
          {(phase === "echo" || phase === "silence") && reflector && (
            <motion.p
              key="echo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2 }}
              className="mt-14 max-w-3xl font-serif text-[clamp(2rem,5vw,4rem)] italic leading-[1.05] text-signal"
            >
              {t("ls.echo")}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {phase === "silence" && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: EASE }}
            className="mt-16 grid gap-14 border-t border-hairline pt-12 lg:grid-cols-2"
          >
            <div>
              <p className="label mb-4">{t("ls.lastHeard")}</p>
              <p className="font-serif text-[clamp(2.2rem,5vw,3.8rem)] italic leading-none">
                {lastDate ? formatDate(lastDate, lang) : t("ls.noEndDate")}
              </p>
              {story?.lastSignal && <p className="mt-5 max-w-md text-lunar-2">{l(story.lastSignal.text)}</p>}
              <div className="mt-4">
                <VerificationBadge status={lastVerification} />
              </div>
              {silentYears != null && (
                <p className="label mt-8">
                  {silentYears < 1 ? t("ls.silentLessThan") : t("ls.silentFor", { n: localizeDigits(silentYears, lang) })}
                </p>
              )}
            </div>
            <div>
              <p className="label mb-4 text-signal">{t("ls.kept")}</p>
              <p className="text-[clamp(1.2rem,2.4vw,1.7rem)] leading-snug">
                {story ? l(story.kept) : t("capsule.noStory")}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button type="button" className="btn-signal" onClick={() => open(p.id)}>
                  {t("ls.readCapsule")}
                </button>
                <button type="button" className="btn-ghost" onClick={onBack}>
                  {t("ls.again")}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
