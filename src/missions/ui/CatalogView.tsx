"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AGENCY } from "../content/arena";
import { formatDate, formatLatLon, localizeDigits } from "../core/geo";
import { useMuseum } from "@/lib/data";
import { assetPath } from "@/lib/asset-path";
import { photoKeys } from "../content/photos";
import { useCatalog } from "./data";
import { ErrorBox, ExtLink, Loading, StatusPill } from "./parts";
import { useM } from "./strings";

const PAGE = 24;

export function CatalogView() {
  const { m, l, lang } = useM();
  const cat = useCatalog();
  const [q, setQ] = useState("");
  const [body, setBody] = useState<"all" | "moon" | "mars">("all");
  const [status, setStatus] = useState<"all" | "silent" | "active" | "lost">("all");
  const [shown, setShown] = useState(PAGE);
  const num = (n: number | string) => localizeDigits(String(n), lang);
  const { data: museum } = useMuseum();

  const rows = useMemo(() => {
    if (cat.status !== "ready") return [];
    const needle = q.trim().toLowerCase();
    return cat.catalog.objects.filter((o) =>
      (body === "all" || o.body === body) && (status === "all" || o.status === status) &&
      (!needle || `${o.name} ${o.mission} ${o.coords_raw}`.toLowerCase().includes(needle)));
  }, [cat, q, body, status]);

  if (cat.status === "loading") return <Loading label={m("common.loading")} />;
  if (cat.status === "error") return <ErrorBox message={cat.error} onRetry={cat.retry} />;

  const chip = (active: boolean, label: string, onClick: () => void) => (
    <button key={label} type="button" className="btn-ghost" aria-pressed={active} onClick={() => { onClick(); setShown(PAGE); }}>{label}</button>
  );

  return (
    <div className="container-x pb-24 pt-[calc(var(--header-h)+1.5rem)]">
      <Link href="/missions/" prefetch={false} className="btn-ghost mb-6">← {m("arena.hub")}</Link>
      <h1 className="display text-[clamp(2rem,6vw,4rem)]">{m("cat.title")}</h1>
      <p className="mt-3 max-w-2xl text-lunar-2">{m("cat.dek")}</p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <input
          type="search" value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} placeholder={m("cat.search")} aria-label={m("cat.search")}
          className="min-w-[14rem] flex-1 border border-hairline-strong bg-void-2 px-3 py-2.5 text-lunar placeholder:text-dust"
        />
        {chip(body === "all", m("cat.all"), () => setBody("all"))}
        {chip(body === "moon", m("cat.moon"), () => setBody("moon"))}
        {chip(body === "mars", m("cat.mars"), () => setBody("mars"))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="label mr-1">{m("cat.status")}</span>
        {chip(status === "all", m("cat.all"), () => setStatus("all"))}
        {(["silent", "active", "lost"] as const).map((s) => chip(status === s, m(`rev.status.${s}` as "rev.status.silent"), () => setStatus(s)))}
      </div>
      <p className="mt-4 font-mono text-[12px] text-dust" aria-live="polite">{m("cat.showing", { n: num(Math.min(shown, rows.length)), total: num(rows.length) })}</p>

      {rows.length === 0 ? <p className="mt-8 text-lunar-2">{m("cat.empty")}</p> : (
        <ul className="mt-4 grid gap-3 md:grid-cols-2" role="list">
          {rows.slice(0, shown).map((o) => (
            <li key={o.id} className="border border-hairline-strong bg-void-2/80 p-4">
              {(() => {
                const ph = museum?.image(photoKeys(o.id)[0]);
                return ph ? (
                  <figure className="mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element -- static export */}
                    <img src={assetPath(ph.thumb)} alt={ph.title} loading="lazy" className="h-36 w-full object-cover" />
                    <figcaption className="mt-1 text-[11px] text-dust">{ph.title} · {ph.credit}</figcaption>
                  </figure>
                ) : null;
              })()}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-medium text-lunar">{o.name}</h2>
                  <p className="text-[13px] text-lunar-2">{o.mission} · {AGENCY[o.agency] ? l(AGENCY[o.agency]) : o.agency}</p>
                </div>
                <StatusPill status={o.status} label={m(`rev.status.${o.status}` as "rev.status.silent")} body={m(o.body === "moon" ? "cat.moon" : "cat.mars")} />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                <div className="col-span-2"><dt className="label">{m("rev.coords")}</dt><dd className="font-mono text-lunar">{o.lat != null && o.lon != null ? formatLatLon(o.lat, o.lon, lang) : "—"} <span className="text-dust">· {m(`rev.precision.${o.precision}` as "rev.precision.reported")}</span></dd><dd className="font-mono text-[11px] text-dust">{m("cat.coordsRaw")}: {o.coords_raw}</dd></div>
                <div><dt className="label">{m("rev.left")}</dt><dd className="text-lunar">{formatDate(o.left_behind, lang)}</dd></div>
                <div><dt className="label">{m("rev.last")}</dt><dd className="text-lunar">{o.status === "active" ? m("rev.status.active") : o.last_contact ? formatDate(o.last_contact, lang) : "—"}</dd></div>
              </dl>
              <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
                {o.image_url ? <ExtLink href={o.image_url}>{m("cat.photo")}</ExtLink> : <span className="text-dust">{m("cat.photo")}: —</span>}
                {o.source_url ? <ExtLink href={o.source_url}>{m("cat.src")}</ExtLink> : <span className="text-dust">{m("cat.src")}: —</span>}
              </p>
            </li>
          ))}
        </ul>
      )}
      {shown < rows.length && <button type="button" className="btn-ghost mt-6" onClick={() => setShown((s) => s + PAGE)}>{m("cat.more")}</button>}
    </div>
  );
}
