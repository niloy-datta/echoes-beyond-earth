"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useDeferredValue, useMemo, useState } from "react";
import { NasaImage, StatusDot } from "@/components/ui";
import { useCapsule } from "@/lib/capsule";
import { useMuseum } from "@/lib/data";
import { formatDate, localizeDigits, yearOf } from "@/lib/dates";
import { normalize } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { usePassport } from "@/lib/passport";
import type { Body, MissionFeature, ObjectStatus } from "@/lib/types";

type Filter<T> = T | "all";

export function Archive() {
  const { data } = useMuseum();
  const { t, l, lang } = useT();
  const { open } = useCapsule();
  const { passport } = usePassport();
  const [query, setQuery] = useState("");
  const [body, setBody] = useState<Filter<Body>>("all");
  const [status, setStatus] = useState<Filter<ObjectStatus>>("all");
  const [decade, setDecade] = useState<Filter<number>>("all");
  const q = useDeferredValue(query);

  // Each record is searchable by both languages, mission, site and story text.
  const index = useMemo(
    () =>
      (data?.objects ?? []).map((f) => {
        const p = f.properties;
        const story = data?.storyFor(p.id);
        const hay = [p.name.en, p.name.bn, p.mission, p.site.en, p.site.bn, p.kind, story?.title.en, story?.title.bn, story?.dek.en, story?.dek.bn]
          .filter(Boolean)
          .join(" ");
        return { f, hay: normalize(hay) };
      }),
    [data],
  );

  const decades = useMemo(
    () => Array.from(new Set((data?.objects ?? []).map((f) => Math.floor((yearOf(f.properties.arrived.date) ?? 0) / 10) * 10))).sort(),
    [data],
  );

  const results = useMemo(() => {
    const terms = normalize(q).split(" ").filter(Boolean);
    return index
      .filter(({ f, hay }) => {
        const p = f.properties;
        if (body !== "all" && p.body !== body) return false;
        if (status !== "all" && p.status !== status) return false;
        if (decade !== "all" && Math.floor((yearOf(p.arrived.date) ?? 0) / 10) * 10 !== decade) return false;
        return terms.every((term) => hay.includes(term));
      })
      .map((x) => x.f)
      .sort((a, b) => a.properties.arrived.date.localeCompare(b.properties.arrived.date));
  }, [index, q, body, status, decade]);

  const filtered = body !== "all" || status !== "all" || decade !== "all";
  const clear = () => {
    setQuery("");
    setBody("all");
    setStatus("all");
    setDecade("all");
  };

  if (!data) return null;

  return (
    <div className="container-x pb-24">
      <div className="sticky top-[var(--header-h)] z-20 -mx-[clamp(1rem,4vw,3.5rem)] border-b border-hairline bg-void/90 px-[clamp(1rem,4vw,3.5rem)] py-5 backdrop-blur-md">
        <label htmlFor="archive-q" className="sr-only">
          {t("archive.searchLabel")}
        </label>
        <div className="flex items-center gap-3 border-b border-hairline-strong pb-3 focus-within:border-signal">
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" className="shrink-0 text-dust">
            <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M15.5 15.5 21 21" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <input
            id="archive-q"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("archive.search")}
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-transparent text-[clamp(1.1rem,2.4vw,1.6rem)] text-lunar placeholder:text-ash focus:outline-none"
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Chips
            label={t("archive.body")}
            value={body}
            onChange={setBody}
            options={[
              ["all", t("common.all")],
              ["moon", t("common.body.moon")],
              ["mars", t("common.body.mars")],
            ]}
          />
          <Chips
            label={t("archive.status")}
            value={status}
            onChange={setStatus}
            options={[
              ["all", t("common.all")],
              ["silent", t("common.status.silent")],
              ["active", t("common.status.active")],
              ["lost", t("common.status.lost")],
            ]}
          />
          <div className="flex items-center gap-3">
            <label htmlFor="archive-decade" className="label">
              {t("archive.decade")}
            </label>
            <select
              id="archive-decade"
              value={decade}
              onChange={(e) => setDecade(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="rounded-full border border-hairline-strong bg-void px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-lunar-2"
            >
              <option value="all">{t("archive.decadeAll")}</option>
              {decades.map((d) => (
                <option key={d} value={d}>
                  {localizeDigits(`${d}s`, lang)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <p className="label mt-8" aria-live="polite">
        {results.length === 1 ? t("archive.oneResult") : t("archive.results", { n: localizeDigits(results.length, lang) })}
      </p>

      {results.length === 0 ? (
        <div className="flex flex-col items-start gap-5 py-24">
          <p className="max-w-xl text-[clamp(1.3rem,2.6vw,2rem)] leading-snug text-lunar-2">
            {q ? t("archive.empty", { q }) : t("archive.emptyFilters")}
          </p>
          <button type="button" className="btn-ghost" onClick={clear}>
            {t("archive.clear")}
          </button>
        </div>
      ) : (
        <ol className="mt-4 border-t border-hairline">
          <AnimatePresence initial={false}>
            {results.map((f) => (
              <Row key={f.id} f={f} discovered={passport.discovered.includes(f.id)} onOpen={() => open(f.id)} />
            ))}
          </AnimatePresence>
        </ol>
      )}
      {(filtered || q) && results.length > 0 && (
        <button type="button" className="btn-ghost mt-8" onClick={clear}>
          {t("archive.clear")}
        </button>
      )}
    </div>
  );

}

function Row({ f, discovered, onOpen }: { f: MissionFeature; discovered: boolean; onOpen: () => void }) {
  const { data } = useMuseum();
  const { t, l, lang } = useT();
  const p = f.properties;
  const img = data?.image(p.image);
  return (
    <motion.li layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
      <button
        type="button"
        onClick={onOpen}
        className="group grid w-full grid-cols-[64px_minmax(0,1fr)] items-center gap-4 border-b border-hairline py-4 text-left md:grid-cols-[88px_minmax(0,1.4fr)_minmax(0,1fr)_140px_120px] md:gap-6 md:py-5"
      >
        <NasaImage image={img} alt="" thumb className="aspect-square w-16 md:w-[88px]" imgClassName="grayscale transition duration-700 group-hover:grayscale-0" />
        <span className="min-w-0">
          <span className="block truncate text-[1.05rem] text-lunar md:text-lg">{l(p.name)}</span>
          <span className="mt-1 block truncate text-sm text-dust">{l(p.site)}</span>
          <span className="mt-2 flex items-center gap-3 md:hidden">
            <span className="label">{formatDate(p.arrived.date, lang)}</span>
          </span>
        </span>
        <span className="hidden text-sm text-lunar-2 md:block">
            {t(`common.kind.${p.kind}` as const)}
            {!l(p.name).startsWith(p.mission) && <span className="text-dust"> · {p.mission}</span>}
          </span>
        <span className="hidden md:block">
          <span className="label block">{t(`common.body.${p.body}` as const)}</span>
          <span className="mt-1 block text-sm text-lunar-2">{formatDate(p.arrived.date, lang)}</span>
        </span>
        <span className="hidden items-center justify-end gap-2 md:flex">
          {discovered && <span className="label mr-2 text-signal" title={t("pp.discovered")}>✓</span>}
          <StatusDot status={p.status} />
          <span className="label">{t(`common.status.${p.status}` as const)}</span>
        </span>
      </button>
    </motion.li>
  );
}

function Chips<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T | "all";
  onChange: (v: T | "all") => void;
  options: [T | "all", string][];
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      <span className="label mr-1" aria-hidden>
        {label}
      </span>
      {options.map(([v, text]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)} className="btn-ghost !px-3 !py-1.5">
          {text}
        </button>
      ))}
    </div>
  );
}
