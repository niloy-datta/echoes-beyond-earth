"use client";
import { useMemo, useState } from "react";
import { NasaImage, VerificationBadge } from "@/components/ui";
import { useMuseum } from "@/lib/data";
import { formatDate, localizeDigits } from "@/lib/dates";
import { useT } from "@/lib/i18n";
import type { Verification } from "@/lib/types";

export function Evidence() {
  const { data } = useMuseum();
  const { t, lang } = useT();
  const [filter, setFilter] = useState<Verification | "all">("all");

  const refs = useMemo(() => data?.sources.references ?? [], [data]);
  const shown = filter === "all" ? refs : refs.filter((r) => r.verification === filter);
  if (!data) return null;
  const verified = refs.filter((r) => r.verification === "verified").length;
  const required = refs.length - verified;

  return (
    <div className="container-x pb-28">
      <section aria-labelledby="ev-method" className="grid gap-10 border-t border-hairline pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div>
          <h2 id="ev-method" className="label">
            {t("src.method")}
          </h2>
          <p className="label mt-3">{t("src.compiled", { date: formatDate(data.sources.compiled, lang) })}</p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <VerificationBadge status="verified" />
            <p className="mt-3 text-sm leading-relaxed text-lunar-2">{t("src.method1")}</p>
          </div>
          <div>
            <VerificationBadge status="required" />
            <p className="mt-3 text-sm leading-relaxed text-lunar-2">{t("src.method2")}</p>
          </div>
          <div>
            <p className="label">∅</p>
            <p className="mt-3 text-sm leading-relaxed text-lunar-2">{t("src.method3")}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="ev-ledger" className="mt-20">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-wrap gap-x-10 gap-y-3">
            <p className="font-serif text-5xl italic leading-none text-signal">{localizeDigits(verified, lang)}</p>
            <p className="font-serif text-5xl italic leading-none text-caution">{localizeDigits(required, lang)}</p>
            <h2 id="ev-ledger" className="sr-only">
              {t("common.sources")}
            </h2>
          </div>
          <div role="group" aria-label={t("common.sources")} className="flex flex-wrap gap-2">
            {(
              [
                ["all", t("src.filterAll")],
                ["verified", t("src.filterVerified")],
                ["required", t("src.filterRequired")],
              ] as const
            ).map(([v, label]) => (
              <button key={v} type="button" aria-pressed={filter === v} onClick={() => setFilter(v)} className="btn-ghost !py-1.5">
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="label mt-4">
          {t("src.verified", { n: localizeDigits(verified, lang) })} · {t("src.required", { n: localizeDigits(required, lang) })}
        </p>

        <ul className="mt-8 border-t border-hairline">
          {shown.map((r) => (
            <li key={r.id} className="grid gap-2 border-b border-hairline py-5 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_200px] md:items-baseline md:gap-6">
              <div className="min-w-0">
                <a href={r.url} target="_blank" rel="noreferrer noopener" className="link-underline text-lunar hover:text-lunar">
                  {r.title}
                </a>
                <span aria-hidden className="ml-2 text-dust">
                  ↗
                </span>
                {r.note && <p className="mt-1.5 text-xs leading-relaxed text-dust">{r.note}</p>}
              </div>
              <p className="text-sm text-lunar-2">
                {r.publisher}
                <span className="label ml-2">{t(`src.kind.${r.kind}` as const)}</span>
              </p>
              <div className="md:text-right">
                <VerificationBadge status={r.verification} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="ev-images" className="mt-24">
        <h2 id="ev-images" className="label mb-3">
          {t("src.images")}
        </h2>
        <p className="mb-8 max-w-2xl text-sm text-dust">{t("src.usage")}</p>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(data.sources.images).map(([id, img]) => (
            <li key={id}>
              <a href={img.page} target="_blank" rel="noreferrer noopener" className="group block">
                <NasaImage image={img} alt="" thumb className="aspect-[4/3] w-full" imgClassName="grayscale transition duration-700 group-hover:grayscale-0" />
                <p className="mt-2 line-clamp-2 text-xs text-lunar-2 group-hover:text-lunar">{img.title}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-dust">
                  {id} · {img.credit}
                </p>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
