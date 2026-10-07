"use client";
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { ImageCredit } from "@/components/ui";
import { useMuseum } from "@/lib/data";
import { localizeDigits } from "@/lib/dates";
import { useT } from "@/lib/i18n";
import { usePassport } from "@/lib/passport";
import { assetPath } from "@/lib/asset-path";
import type { ImageSource, LensPair } from "@/lib/types";

export function MemoryLens() {
  const { data } = useMuseum();
  const { t, l, lang } = useT();
  const [activeId, setActiveId] = useState<string | null>(null);
  if (!data) return null;
  const pairs = data.stories.lens;
  const active = pairs.find((p) => p.id === activeId) ?? pairs[0];

  return (
    <div className="container-x pb-28">
      <div role="group" aria-label={t("lens.choose")} className="mb-8 flex flex-wrap gap-2">
        {pairs.map((p) => (
          <button key={p.id} type="button" aria-pressed={p.id === active.id} onClick={() => setActiveId(p.id)} className="btn-ghost">
            {localizeDigits(p.then.year, lang)} / {localizeDigits(p.now.year, lang)}
          </button>
        ))}
      </div>
      <Comparison key={active.id} pair={active} then={data.image(active.then.image)} now={data.image(active.now.image)} />
      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <h2 className="text-[clamp(1.5rem,3.2vw,2.4rem)] font-medium leading-tight tracking-tight">{l(active.title)}</h2>
          <p className="mt-4 max-w-xl leading-relaxed text-lunar-2">{l(active.caption)}</p>
        </div>
        <div className="flex flex-col gap-3 lg:pt-2">
          <p className="label">
            {t("lens.then")} · {localizeDigits(active.then.year, lang)}
          </p>
          <ImageCredit image={data.image(active.then.image)} />
          <p className="label mt-4">
            {t("lens.now")} · {localizeDigits(active.now.year, lang)}
          </p>
          <ImageCredit image={data.image(active.now.image)} />
        </div>
      </div>
    </div>
  );
}

function Comparison({ pair, then, now }: { pair: LensPair; then?: ImageSource; now?: ImageSource }) {
  const { t, lang } = useT();
  const { mark } = usePassport();
  const [pos, setPos] = useState(50);
  const frame = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const touched = useRef(false);

  const fromPointer = useCallback((clientX: number) => {
    const r = frame.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  }, []);

  useEffect(() => {
    if (!touched.current && (pos < 15 || pos > 85)) {
      touched.current = true;
      mark("lenses", pair.id);
    }
  }, [pos, mark, pair.id]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
      <div
        ref={frame}
        className="relative aspect-square w-full cursor-ew-resize touch-pan-y select-none overflow-hidden bg-void-2 sm:aspect-[3/2]"
        onPointerDown={(e) => {
          dragging.current = true;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          fromPointer(e.clientX);
        }}
        onPointerMove={(e) => dragging.current && fromPointer(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        {/* eslint-disable @next/next/no-img-element */}
        {now && <img src={assetPath(now.file)} alt={now.title} className="absolute inset-0 h-full w-full object-cover" draggable={false} />}
        {then && (
          <img
            src={assetPath(then.file)}
            alt={then.title}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
            draggable={false}
          />
        )}
        {/* eslint-enable @next/next/no-img-element */}
        <div aria-hidden className="pointer-events-none absolute inset-y-0 w-px bg-lunar/80" style={{ left: `${pos}%` }}>
          <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-lunar/80 bg-void/40 backdrop-blur-sm">
            <span className="font-mono text-[10px] text-lunar">⟷</span>
          </div>
        </div>
        <span className="label pointer-events-none absolute left-4 top-4 text-lunar">
          {t("lens.then")} · {localizeDigits(pair.then.year, lang)}
        </span>
        <span className="label pointer-events-none absolute right-4 top-4 text-lunar">
          {t("lens.now")} · {localizeDigits(pair.now.year, lang)}
        </span>
      </div>
      <label htmlFor={`lens-${pair.id}`} className="sr-only">
        {t("lens.slider", { value: Math.round(100 - pos) })}
      </label>
      <input
        id={`lens-${pair.id}`}
        type="range"
        min={0}
        max={100}
        step={1}
        value={Math.round(pos)}
        onChange={(e) => setPos(Number(e.target.value))}
        className="range mt-3"
        aria-valuetext={t("lens.slider", { value: Math.round(100 - pos) })}
      />
      <p className="label mt-1">{t("lens.hint")}</p>
    </motion.div>
  );
}
