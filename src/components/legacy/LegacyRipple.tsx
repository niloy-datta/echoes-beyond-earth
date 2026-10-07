"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { SourceLink, VerificationBadge } from "@/components/ui";
import { useCapsule } from "@/lib/capsule";
import { useMuseum } from "@/lib/data";
import { localizeDigits, yearOf } from "@/lib/dates";
import { useT } from "@/lib/i18n";
import { usePassport } from "@/lib/passport";
import { useSettings } from "@/lib/settings";
import type { Ripple } from "@/lib/types";

const SIZE = 800;
const C = SIZE / 2;
const GOLDEN = 137.508;

/** Each connection sits on its own ring — order is the order of influence, outward from the origin. */
function layout(r: Ripple) {
  const step = Math.min(70, 260 / Math.max(r.rings.length, 1));
  return r.rings.map((ring, i) => {
    const radius = 110 + (i + 1) * step;
    const angle = ((-60 + i * GOLDEN) * Math.PI) / 180;
    return { ring, radius, x: C + radius * Math.cos(angle), y: C + radius * Math.sin(angle) };
  });
}

export function LegacyRipple() {
  const { data } = useMuseum();
  const { t, l, lang } = useT();
  const { open } = useCapsule();
  const { mark } = usePassport();
  const { reducedMotion } = useSettings();
  const [rippleId, setRippleId] = useState<string | null>(null);
  const [focusIdx, setFocusIdx] = useState<number | null>(null);

  const ripples = data?.stories.ripples ?? [];
  const ripple = ripples.find((r) => r.id === rippleId) ?? ripples[0];

  useEffect(() => {
    if (ripple) mark("ripples", ripple.id);
    setFocusIdx(null);
  }, [ripple, mark]);

  if (!data || !ripple) return null;
  const origin = data.byId.get(ripple.from);
  const nodes = layout(ripple);
  const focused = focusIdx != null ? nodes[focusIdx] : null;
  const focusedTarget = focused ? data.byId.get(focused.ring.to) : undefined;

  return (
    <div className="container-x pb-28">
      <div role="group" aria-label={t("legacy.choose")} className="mb-10 flex flex-wrap gap-2">
        {ripples.map((r) => (
          <button key={r.id} type="button" aria-pressed={r.id === ripple.id} onClick={() => setRippleId(r.id)} className="btn-ghost">
            {l(r.title)}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="relative mx-auto aspect-square w-full max-w-[720px]">
          <AnimatePresence mode="wait">
            <motion.svg
              key={ripple.id}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              aria-hidden
              className="absolute inset-0 h-full w-full overflow-visible"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Ambient ripple leaving the origin */}
              {!reducedMotion &&
                [0, 1, 2].map((i) => (
                  <motion.circle
                    key={i}
                    cx={C}
                    cy={C}
                    fill="none"
                    stroke="#63e6ef"
                    initial={{ r: 40, opacity: 0.35 }}
                    animate={{ r: 390, opacity: 0 }}
                    transition={{ duration: 6, delay: i * 2, repeat: Infinity, ease: "easeOut" }}
                  />
                ))}
              {nodes.map((n, i) => (
                <motion.circle
                  key={`ring-${i}`}
                  cx={C}
                  cy={C}
                  r={n.radius}
                  fill="none"
                  stroke="#ecebe6"
                  strokeOpacity={focusIdx === i ? 0.45 : 0.12}
                  strokeDasharray={n.ring.verification === "verified" ? undefined : "3 6"}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  style={{ transformOrigin: `${C}px ${C}px` }}
                  transition={{ delay: 0.15 + i * 0.18, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                />
              ))}
              {nodes.map((n, i) => (
                <motion.line
                  key={`line-${i}`}
                  x1={C}
                  y1={C}
                  x2={n.x}
                  y2={n.y}
                  stroke={focusIdx === i ? "#63e6ef" : "#ecebe6"}
                  strokeOpacity={focusIdx === i ? 0.8 : 0.1}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.5 + i * 0.18, duration: 1 }}
                />
              ))}
            </motion.svg>
          </AnimatePresence>

          {/* Origin */}
          <button
            type="button"
            onClick={() => origin && open(origin.id)}
            className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
          >
            <span className="relative flex h-5 w-5 items-center justify-center">
              <span className="pulse-ring absolute inset-0 rounded-full bg-signal" />
              <span className="relative h-3 w-3 rounded-full bg-signal" />
            </span>
            <span className="label whitespace-nowrap text-lunar">{t("legacy.origin")}</span>
            <span className="max-w-[10rem] text-center text-sm leading-tight text-lunar">{l(origin?.properties.name)}</span>
          </button>

          {/* Connections */}
          {nodes.map((n, i) => {
            const target = data.byId.get(n.ring.to);
            const y = yearOf(target?.properties.arrived.date ?? null);
            return (
              <motion.button
                key={`${ripple.id}-${i}`}
                type="button"
                onClick={() => setFocusIdx(i)}
                onFocus={() => setFocusIdx(i)}
                onMouseEnter={() => setFocusIdx(i)}
                aria-pressed={focusIdx === i}
                aria-label={`${t("legacy.ring", { n: i + 1 })}: ${l(target?.properties.name)}`}
                className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 p-2"
                style={{ left: `${(n.x / SIZE) * 100}%`, top: `${(n.y / SIZE) * 100}%` }}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + i * 0.18, duration: 0.6 }}
              >
                <span
                  className={`block h-3 w-3 rounded-full border transition-colors ${
                    focusIdx === i ? "border-signal bg-signal" : "border-lunar-2 bg-void"
                  }`}
                />
                <span className={`whitespace-nowrap text-[11px] sm:text-xs ${focusIdx === i ? "text-lunar" : "text-lunar-2"}`}>
                  {l(target?.properties.name).split(" (")[0].split(" · ")[0]}
                </span>
                {y && <span className="font-mono text-[10px] text-dust">{localizeDigits(y, lang)}</span>}
              </motion.button>
            );
          })}
        </div>

        <aside aria-live="polite" className="border-t border-hairline pt-8 lg:sticky lg:top-[calc(var(--header-h)+2rem)]">
          <p className="label mb-4">{l(ripple.title)}</p>
          {focused && focusedTarget ? (
            <motion.div key={focusIdx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <p className="label text-signal">{t("legacy.ring", { n: localizeDigits((focusIdx ?? 0) + 1, lang) })}</p>
              <h2 className="mt-3 text-[clamp(1.5rem,3vw,2.2rem)] font-medium leading-tight tracking-tight">
                {l(origin?.properties.name)} <span className="text-dust">→</span> {l(focusedTarget.properties.name)}
              </h2>
              <p className="label mt-8 mb-2">{t("legacy.relation")}</p>
              <p className="text-lg leading-relaxed text-lunar-2">{l(focused.ring.relation)}</p>
              <div className="mt-5 flex flex-col gap-2">
                <VerificationBadge status={focused.ring.verification} />
                <SourceLink id={focused.ring.source} />
              </div>
              <button type="button" className="btn-ghost mt-8" onClick={() => open(focusedTarget.id)}>
                {t("common.openCapsule")} →
              </button>
            </motion.div>
          ) : (
            <p className="text-lunar-2">{t("legacy.hint")}</p>
          )}
        </aside>
      </div>
    </div>
  );
}
