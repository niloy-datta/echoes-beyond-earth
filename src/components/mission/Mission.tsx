"use client";
import { motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { assetPath } from "@/lib/asset-path";
import { useMuseum } from "@/lib/data";
import { localizeDigits, yearOf } from "@/lib/dates";
import { useT } from "@/lib/i18n";
import type { MissionFeature } from "@/lib/types";

export const EMBER = "#ef6a3a";
const EASE = [0.22, 1, 0.36, 1] as const;

/** "2004 – 2018", "2012 – present", or a single year — only from recorded dates. */
export function useYearsLabel() {
  const { t, lang } = useT();
  return (f: MissionFeature) => {
    const p = f.properties;
    const a = yearOf(p.arrived.date);
    const e = yearOf(p.end?.date ?? null);
    if (a == null) return "—";
    if (p.status === "active") return `${localizeDigits(a, lang)} – ${t("ls2.present")}`;
    if (e != null && e !== a) return `${localizeDigits(a, lang)} – ${localizeDigits(e, lang)}`;
    return localizeDigits(a, lang);
  };
}

/** Small grayscale photo of a machine; an honest placeholder when no image is on record. */
export function Thumb({ feature, active, className = "" }: { feature: MissionFeature; active?: boolean; className?: string }) {
  const { data } = useMuseum();
  const img = data?.image(feature.properties.image);
  return (
    <span className={`relative block overflow-hidden bg-void-3 ${className}`}>
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={assetPath(img.thumb)}
          alt=""
          loading="lazy"
          className={`h-full w-full object-cover transition duration-700 ${active ? "sepia-[.5] saturate-[2.2] hue-rotate-[-12deg]" : "grayscale group-hover:grayscale-0"}`}
        />
      ) : (
        <svg aria-hidden viewBox="0 0 24 24" className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-ash">
          <circle cx="12" cy="12" r="2" fill="currentColor" />
          <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="0.8" />
        </svg>
      )}
    </span>
  );
}

/** Left-hand vertical list of machines on a thread, mission-control style. */
export function MachineRail({
  title,
  dek,
  items,
  selectedId,
  onSelect,
}: {
  title: string;
  dek: string;
  items: MissionFeature[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { l } = useT();
  const years = useYearsLabel();
  const list = useRef<HTMLOListElement>(null);

  // Keep the selected machine in view inside the rail (never scroll the page).
  useEffect(() => {
    const ol = list.current;
    const el = ol?.querySelector<HTMLElement>('[aria-pressed="true"]')?.parentElement;
    if (ol && el && ol.scrollHeight > ol.clientHeight) ol.scrollTo({ top: el.offsetTop - ol.clientHeight / 2 + el.clientHeight / 2, behavior: "smooth" });
  }, [selectedId]);

  return (
    <aside aria-label={title} className="flex min-h-0 flex-col">
      <h2 className="font-mono text-[12px] uppercase tracking-[0.3em]" style={{ color: EMBER }}>
        {title}
      </h2>
      <p className="mt-2 text-[13px] leading-snug text-lunar-2">{dek}</p>
      <ol ref={list} className="relative mt-5 flex min-h-0 flex-col gap-1 overflow-y-auto pr-1 [scrollbar-width:thin] xl:max-h-[calc(100svh-var(--header-h)-23rem)]">
        <span aria-hidden className="absolute bottom-4 left-[9px] top-4 w-px bg-hairline-strong" />
        {items.map((f) => {
          const active = f.id === selectedId;
          return (
            <li key={f.id} className="relative">
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(f.id)}
                className="group flex w-full items-center gap-4 py-1.5 text-left"
              >
                <span
                  aria-hidden
                  className={`relative z-10 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border bg-void transition-colors ${
                    active ? "border-[#ef6a3a] shadow-[0_0_12px_#ef6a3a]" : "border-lunar-2/70 group-hover:border-lunar"
                  }`}
                >
                  <span className={`h-[7px] w-[7px] rounded-full ${active ? "bg-[#ef6a3a]" : "bg-lunar-2/80"}`} />
                </span>
                <span
                  className={`flex min-w-0 flex-1 items-center gap-3 border p-1.5 pr-3 transition-colors ${
                    active ? "border-[#ef6a3a]/80 bg-[#ef6a3a]/10 shadow-[0_0_24px_-6px_#ef6a3a]" : "border-transparent group-hover:border-hairline-strong"
                  }`}
                >
                  <Thumb feature={f} active={active} className="h-12 w-16 shrink-0" />
                  <span className="min-w-0">
                    <span className={`block truncate font-mono text-[12px] uppercase tracking-[0.08em] ${active ? "text-[#ff8a5c]" : "text-lunar"}`}>
                      {l(f.properties.name).split(" (")[0].split(" · ")[0]}
                    </span>
                    <span className="mt-1 block font-mono text-[11px] tracking-[0.08em] text-lunar-2">{years(f)}</span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

/** Bottom film strip: every machine, 1964 → 2026, with a node on the time thread. */
export function Filmstrip({
  title,
  dek,
  items,
  selectedId,
  onSelect,
  isSelectable = () => true,
}: {
  title: string;
  dek: string;
  items: MissionFeature[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isSelectable?: (f: MissionFeature) => boolean;
}) {
  const { t, l, lang } = useT();
  const years = useYearsLabel();
  const scroller = useRef<HTMLOListElement>(null);

  useEffect(() => {
    // Scroll only the strip — never the page — to centre the selected machine.
    const strip = scroller.current;
    const el = strip?.querySelector<HTMLElement>('[aria-pressed="true"]')?.parentElement;
    if (strip && el) strip.scrollTo({ left: el.offsetLeft - strip.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
  }, [selectedId]);

  const scrollBy = (dir: number) => scroller.current?.scrollBy({ left: dir * 480, behavior: "smooth" });

  return (
    <section aria-label={title} className="grid gap-6 border-t border-hairline pt-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
      <div className="hidden border-l border-hairline-strong pl-4 lg:block">
        <h2 className="font-mono text-[12px] uppercase leading-relaxed tracking-[0.28em] text-lunar">{title}</h2>
        <p className="mt-4 text-[13px] leading-relaxed text-lunar-2">{dek}</p>
      </div>
      <div className="min-w-0">
        <div className="mb-3 flex items-center gap-4">
          <span className="font-mono text-base tracking-[0.1em] text-lunar">{localizeDigits(1964, lang)}</span>
          <span aria-hidden className="h-px flex-1 bg-[linear-gradient(90deg,rgba(236,235,230,0.5),rgba(236,235,230,0.25)_70%,transparent)]" />
          <span className="font-mono text-base tracking-[0.1em] text-lunar">{localizeDigits(2026, lang)}</span>
        </div>
        <div className="flex items-center gap-2">
          <StripArrow dir={-1} label={t("strip.prev")} onClick={() => scrollBy(-1)} />
          <ol ref={scroller} className="relative flex min-w-0 flex-1 snap-x gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none]">
            {items.map((f) => {
              const active = f.id === selectedId;
              const selectable = isSelectable(f);
              return (
                <li key={f.id} className="w-[132px] shrink-0 snap-start">
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => onSelect(f.id)}
                    className={`group block w-full border text-left transition-[border-color,box-shadow,opacity] ${
                      active
                        ? "border-[#ef6a3a] shadow-[0_0_28px_-6px_#ef6a3a]"
                        : `border-hairline-strong hover:border-lunar-2 ${selectable ? "" : "opacity-55 hover:opacity-90"}`
                    }`}
                  >
                    <Thumb feature={f} active={active} className="h-[76px] w-full" />
                    <span className="block bg-void/90 px-2.5 py-2">
                      <span className={`block truncate font-mono text-[10.5px] uppercase tracking-[0.08em] ${active ? "text-[#ff8a5c]" : "text-lunar"}`}>
                        {l(f.properties.name).split(" (")[0].split(" · ")[0]}
                      </span>
                      <span className="mt-0.5 block font-mono text-[10px] tracking-[0.06em] text-lunar-2">{years(f)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <StripArrow dir={1} label={t("strip.next")} onClick={() => scrollBy(1)} />
        </div>
      </div>
    </section>
  );
}

function StripArrow({ dir, label, onClick }: { dir: number; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-lunar-2/60 text-lunar-2 transition-colors hover:border-lunar hover:text-lunar md:flex"
    >
      {dir < 0 ? "←" : "→"}
    </button>
  );
}

/** Shared deep-space stage: real NASA Earth (DSCOVR EPIC) and a Viking-mosaic Mars, plus a ground photo. */
export function SpaceBackdrop({ groundImage, tone = "ember" }: { groundImage?: string; tone?: "ember" | "cool" }) {
  const { data } = useMuseum();
  const earth = data?.image("GSFC_20171208_Archive_e000678")?.file;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {groundImage && (
        <motion.img
          key={groundImage}
          src={assetPath(groundImage)}
          alt=""
          className="absolute bottom-0 right-0 h-[78%] w-[72%] object-cover object-[60%_60%]"
          style={{
            maskImage: "linear-gradient(to left, black 45%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 40%)",
            WebkitMaskImage: "linear-gradient(to left, black 45%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 40%)",
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
            filter: tone === "ember" ? "sepia(0.55) saturate(2.4) hue-rotate(-14deg) brightness(0.5) contrast(1.15)" : "brightness(0.5)",
          }}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.8, ease: EASE }}
        />
      )}
      {earth && (
        <div
          className="absolute left-[-9vw] top-[10svh] aspect-square w-[27vw] min-w-[260px] rounded-full opacity-80"
          style={{ boxShadow: "0 0 70px 6px rgba(90,150,255,0.28)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={assetPath(earth)}
            alt=""
            className="h-full w-full scale-[1.27] rounded-full object-cover"
            style={{
              filter: "brightness(0.42) saturate(0.85)",
              maskImage: "radial-gradient(circle, black 49%, transparent 50%)",
              WebkitMaskImage: "radial-gradient(circle, black 49%, transparent 50%)",
            }}
          />
          <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_75%_30%,transparent_25%,rgba(3,4,5,0.85)_70%)]" />
        </div>
      )}
      <PlanetSphere className="absolute right-[-8vw] top-[18svh] w-[26vw] min-w-[220px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_70%,rgba(239,106,58,0.18),transparent_60%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-void via-void/80 to-transparent" />
    </div>
  );
}

/** Mars rendered from the Viking MDIM 2.1 global mosaic (NASA Mars Trek) — a real texture, shaded as a sphere. */
export function PlanetSphere({ className = "" }: { className?: string }) {
  return (
    <div className={`${className.includes("absolute") ? "" : "relative"} aspect-square overflow-hidden rounded-full ${className}`} style={{ boxShadow: "0 0 80px 4px rgba(239,106,58,0.22)" }}>
      <span
        className="block h-full w-full"
        style={{
          backgroundImage: `url(${assetPath("/tiles/mars-eq.jpg")})`,
          backgroundSize: "200% 100%",
          backgroundPosition: "30% 50%",
          filter: "saturate(1.4) brightness(0.8)",
        }}
      />
      <span className="absolute inset-0 rounded-full shadow-[inset_-40px_-30px_80px_rgba(0,0,0,0.9),inset_10px_8px_30px_rgba(255,190,150,0.15)]" />
    </div>
  );
}

/** Mission-control framed panel with corner ticks. */
export function Panel({ children, className = "", accent = false }: { children: ReactNode; className?: string; accent?: boolean }) {
  return (
    <div className={`relative border bg-void/70 backdrop-blur-md ${accent ? "border-[#ef6a3a]/70" : "border-hairline-strong"} ${className}`}>
      {children}
    </div>
  );
}

