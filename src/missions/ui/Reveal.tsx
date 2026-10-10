"use client";
import Link from "next/link";
import { useMuseum } from "@/lib/data";
import { assetPath } from "@/lib/asset-path";
import type { CatalogObject, Chapter } from "../core/types";
import { formatDate, formatLatLon } from "../core/geo";
import { AGENCY } from "../content/arena";
import { MAP_IMG } from "./data";
import { photoKeys } from "../content/photos";
import { ExtLink, PhotoStrip } from "./parts";
import { useM } from "./strings";

/** The "mission file": every field of the spreadsheet row, plus the story's why/science and visible sources. */
export function Reveal({ chapter, object, onNext, nextLabel }: { chapter: Chapter; object: CatalogObject; onNext?: () => void; nextLabel?: string }) {
  const { m, l, lang } = useM();
  const { data } = useMuseum();
  const feature = object.museum_id ? data?.byId.get(object.museum_id) : undefined;
  const img = data?.image(feature?.properties.image ?? undefined);
  const row = (k: string, v: React.ReactNode) => (
    <div className="border-b border-hairline py-2.5 sm:grid sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="label pt-0.5">{k}</dt>
      <dd className="text-[15px] text-lunar">{v}</dd>
    </div>
  );
  const pos = object.lat != null && object.lon != null ? formatLatLon(object.lat, object.lon, lang) : null;
  const bgPos = object.lon != null && object.lat != null ? `${((object.lon + 180) / 360) * 100}% ${((90 - object.lat) / 180) * 100}%` : "50% 50%";
  const agency = AGENCY[object.agency];
  const last = object.status === "active" ? m("rev.status.active") : object.last_contact ? `${formatDate(object.last_contact, lang)}${object.last_contact_approx ? ` (${m("rev.contactApprox")})` : ""}` : (lang === "bn" ? "রেকর্ড নেই" : "no record");

  return (
    <article className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div>
        <p className="label mb-2">{m("rev.title")}</p>
        <h2 className="display text-[clamp(1.6rem,4vw,2.8rem)]">{l(chapter.title)}</h2>
        <dl className="mt-5 border-t border-hairline">
          {row(m("rev.mission"), <><span className="font-medium">{object.name}</span><span className="block text-lunar-2">{object.mission}</span></>)}
          {row(m("rev.agency"), agency ? l(agency) : object.agency)}
          {row(m("rev.coords"), <>
            {pos && <span className="font-mono">{pos}</span>}
            <span className="mt-1 block text-[13px] text-dust">{m("rev.precision." + object.precision as "rev.precision.reported")}{object.coords_note ? ` — ${object.coords_note}` : ""}</span>
            <span className="mt-0.5 block font-mono text-[12px] text-dust">{object.coords_raw}</span>
          </>)}
          {row(m("rev.left"), <>{formatDate(object.left_behind, lang)}<span className="block font-mono text-[12px] text-dust">{object.left_raw}</span></>)}
          {row(m("rev.last"), <>{last}{object.last_raw && <span className="block font-mono text-[12px] text-dust">{object.last_raw}</span>}</>)}
          {row(m("rev.status"), m(`rev.status.${object.status}` as "rev.status.silent"))}
          {row(m("rev.photo"), object.image_url ? <ExtLink href={object.image_url}>{new URL(object.image_url).hostname.replace(/^www\./, "")}</ExtLink> : <span className="text-dust">{m("rev.noPhoto")}</span>)}
          {row(m("rev.source"), object.sources.length ? (
            <ul className="space-y-1">{object.sources.map((s) => <li key={s}><ExtLink href={s}>{s.replace(/^https?:\/\/(www\.)?/, "")}</ExtLink></li>)}</ul>
          ) : <span className="text-dust">{m("rev.noSource")}</span>)}
          {object.note_bn && row(m("rev.note"), <span lang="bn" className="text-lunar-2">{object.note_bn}</span>)}
        </dl>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <section className="border-l-2 border-signal bg-void-2/80 p-4"><h3 className="label !text-signal mb-2">{m("rev.why")}</h3><p className="text-[15px] leading-relaxed text-lunar-2">{l(chapter.why)}</p></section>
          <section className="border-l-2 border-mars bg-void-2/80 p-4"><h3 className="label !text-mars mb-2">{m("rev.science")}</h3><p className="text-[15px] leading-relaxed text-lunar-2">{l(chapter.science)}</p></section>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {chapter.link && <Link href={chapter.link.href} prefetch={false} className="btn-ghost">{m("rev.exhibit")}: {l(chapter.link.label)} →</Link>}
          {onNext && <button type="button" className="btn-signal" onClick={onNext}>{nextLabel ?? m("rev.toQuiz")} →</button>}
        </div>
      </div>

      <aside className="space-y-4">
        {photoKeys(object.id).length > 0 ? <PhotoStrip objectId={object.id} compact /> : img && (
          <figure className="border border-hairline-strong bg-void-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- static export */}
            <img src={assetPath(img.file)} alt={img.title} width={img.width} height={img.height} className="w-full" loading="lazy" />
            <figcaption className="p-3 font-mono text-[10px] uppercase leading-relaxed tracking-[0.12em] text-dust">{m("rev.museumPhoto")}: {img.credit} · <a className="link-underline" href={img.page} target="_blank" rel="noreferrer noopener">{img.title}</a></figcaption>
          </figure>
        )}
        <figure className="border border-hairline-strong bg-void-2">
          <div className="relative aspect-square w-full overflow-hidden" style={{ backgroundImage: `url(${MAP_IMG[object.body]})`, backgroundSize: "600% 600%", backgroundPosition: bgPos }} role="img" aria-label={m("rev.mapPhoto")}>
            <span className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-signal shadow-[0_0_14px_#63e6ef]" aria-hidden />
          </div>
          <figcaption className="p-3 font-mono text-[10px] uppercase tracking-[0.12em] text-dust">{m("rev.mapPhoto")} · NASA Trek</figcaption>
        </figure>
      </aside>
    </article>
  );
}
