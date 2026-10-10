"use client";
import Link from "next/link";
import { CHAPTERS } from "../content/chapters";
import { chapterDone, hasBadge, LEVELS, MAX_XP } from "../core/progress";
import { localizeDigits } from "../core/geo";
import type { Chapter, CatalogObject } from "../core/types";
import { MAP_IMG, todayKey, useCatalog, useProgress } from "./data";
import { Bar, BhuluAvatar, ErrorBox, Loading, Panel, Stars } from "./parts";
import { useMuseum } from "@/lib/data";
import { assetPath } from "@/lib/asset-path";
import { photoKeys } from "../content/photos";
import { useM } from "./strings";

function Thumb({ chapter, o }: { chapter: Chapter; o: CatalogObject | undefined }) {
  const { data } = useMuseum();
  const photo = data?.image(photoKeys(chapter.objectId)[0]);
  const pos = o?.lon != null && o?.lat != null ? `${((o.lon + 180) / 360) * 100}% ${((90 - o.lat) / 180) * 100}%` : "50% 50%";
  if (photo) {
    return (
      <div className="relative h-32 w-full overflow-hidden bg-void-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- static export */}
        <img src={assetPath(photo.thumb)} alt={photo.title} loading="lazy" className="h-full w-full object-cover" />
        <span className="absolute bottom-1 right-1 bg-black/60 px-1.5 py-0.5 font-mono text-[9px] text-lunar-2">{photo.credit}</span>
      </div>
    );
  }
  return (
    <div className="relative h-32 w-full overflow-hidden bg-void-3" style={{ backgroundImage: `url(${MAP_IMG[chapter.body]})`, backgroundSize: "700% 700%", backgroundPosition: pos }} aria-hidden>
      <span className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-signal shadow-[0_0_12px_#63e6ef]" />
    </div>
  );
}

export function Hub() {
  const { m, l, lang } = useM();
  const cat = useCatalog();
  const pr = useProgress();
  const num = (n: number | string) => localizeDigits(String(n), lang);
  if (cat.status === "loading" || !pr.hydrated) return <Loading label={m("common.loading")} />;
  if (cat.status === "error") return <ErrorBox message={cat.error} onRetry={cat.retry} />;

  const done = CHAPTERS.filter((c) => pr.progress.chapters[c.id] && chapterDone(pr.progress.chapters[c.id])).length;
  const badges = CHAPTERS.filter((c) => pr.progress.chapters[c.id] && hasBadge(pr.progress.chapters[c.id])).length;
  const nextUnfinished = CHAPTERS.find((c) => !(pr.progress.chapters[c.id] && chapterDone(pr.progress.chapters[c.id])));
  const lv = pr.level;
  const dailyScore = pr.progress.arena.daily[todayKey()];
  const counts = { moon: cat.catalog.objects.filter((o) => o.body === "moon").length, mars: cat.catalog.objects.filter((o) => o.body === "mars").length };

  const section = (body: "moon" | "mars") => (
    <section aria-labelledby={`h-${body}`} className="mt-12">
      <h2 id={`h-${body}`} className="label mb-4 !text-lunar-2">{m(body === "moon" ? "hub.moon" : "hub.mars")}</h2>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="list">
        {CHAPTERS.filter((c) => c.body === body).map((c) => {
          const r = pr.progress.chapters[c.id];
          const o = cat.byId.get(c.objectId);
          return (
            <li key={c.id}>
              <Link href={`/missions/play/?c=${c.id}`} prefetch={false} className="group block h-full border border-hairline-strong bg-void-2/80 transition-colors hover:border-signal">
                <Thumb chapter={c} o={o} />
                <div className="p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="label">{m("hub.chapter", { n: num(c.order) })}</span>
                    {r && hasBadge(r) && <span className="text-xl" title={l(c.badge.name)}>{c.badge.icon}</span>}
                  </div>
                  <h3 className="text-lg font-medium leading-snug text-lunar group-hover:text-signal">{l(c.title)}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-lunar-2">{l(c.dek)}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-dust">
                    <span>{r?.clip ? "✓" : "○"} {m("hub.clip")}</span>
                    <span className="inline-flex items-center gap-1">{m("hub.stars")} <Stars n={Math.max(0, r?.stars ?? 0)} size={12} /></span>
                    <span>{m("hub.quiz")} {r && r.quiz >= 0 ? `${num(r.quiz)}/${num(3)}` : "–"}</span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );

  const card = (href: string, title: string, dek: string, foot: string, icon: string) => (
    <Link href={href} prefetch={false} className="group flex h-full flex-col border border-hairline-strong bg-void-2/80 p-5 transition-colors hover:border-signal">
      <span className="text-3xl" aria-hidden>{icon}</span>
      <h3 className="mt-3 text-lg font-medium text-lunar group-hover:text-signal">{title}</h3>
      <p className="mt-2 flex-1 text-[14px] leading-relaxed text-lunar-2">{dek}</p>
      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-signal">{foot} →</p>
    </Link>
  );

  return (
    <div className="container-x pb-24 pt-[calc(var(--header-h)+clamp(2rem,6vw,4.5rem))]">
      <header className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
        <div>
          <p className="label mb-4">{m("hub.kicker")}</p>
          <h1 className="display text-[clamp(2.2rem,6.5vw,5rem)]">{m("hub.title")}</h1>
          <p className="mt-5 max-w-2xl text-[clamp(1rem,1.5vw,1.15rem)] leading-relaxed text-lunar-2">{m("hub.dek")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link prefetch={false} href={`/missions/play/?c=${(nextUnfinished ?? CHAPTERS[0]).id}`} className="btn-signal">
              {done === 0 ? m("hub.start") : nextUnfinished ? m("hub.continue") : m("hub.allDone")} →
            </Link>
          </div>
        </div>
        <BhuluAvatar mood="wave" size={170} className="hidden md:block" />
      </header>

      <Panel className="mt-10 p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label">{m("hub.level")} {num(lv.index + 1)}</p>
            <p className="font-display text-2xl text-lunar">{l(lv.level.name)}</p>
          </div>
          <div className="flex gap-6 font-mono text-[13px] text-lunar-2">
            <span>{num(pr.xp)} {m("hub.xp")}</span>
            <span>{m("hub.chaptersDone", { n: num(done), total: num(CHAPTERS.length) })}</span>
            <span>{m("hub.badges")}: {num(badges)}</span>
          </div>
        </div>
        <div className="mt-4"><Bar value={lv.next ? lv.into : 1} max={lv.next ? lv.span : 1} label={m("hub.level")} /></div>
        <p className="mt-2 text-[12px] text-dust">{lv.next ? m("hub.nextLevel", { n: num(lv.next.xp - pr.xp), name: l(lv.next.name) }) : m("hub.maxLevel")}</p>
        <span className="sr-only">max {MAX_XP} {LEVELS.length}</span>
      </Panel>

      {section("moon")}
      {section("mars")}

      <section aria-labelledby="h-more" className="mt-14">
        <h2 id="h-more" className="label mb-4 !text-lunar-2">{m("hub.more")}</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {card("/missions/arena/", m("hub.arena"), m("hub.arenaDek"), pr.progress.arena.best ? m("hub.arenaBest", { n: num(pr.progress.arena.best) }) : m("hub.open"), "🎯")}
          {card("/missions/arena/?mode=daily", m("hub.daily"), m("hub.dailyDek"), dailyScore != null ? m("hub.dailyToday", { n: num(dailyScore) }) : m("hub.open"), "📅")}
          {card("/missions/vr/", m("hub.vr"), m("hub.vrDek"), m("hub.open"), "🥽")}
          {card("/missions/catalog/", m("hub.catalog"), m("hub.catalogDek", { n: num(cat.catalog.objects.length) }), `${m("cat.moon")} ${num(counts.moon)} · ${m("cat.mars")} ${num(counts.mars)}`, "🗂️")}
        </div>
      </section>

      <aside className="mt-14 border-l-2 border-caution bg-void-2/60 p-5">
        <h2 className="label mb-2 !text-caution">{m("hub.honestyTitle")}</h2>
        <p className="max-w-3xl text-[14px] leading-relaxed text-lunar-2">{m("hub.honesty")}</p>
        <p className="mt-2 text-[12px] text-dust">{m("common.disclaimer")}</p>
        <p className="mt-2 text-[12px] text-dust">{m("credits.models")}</p>
        <button type="button" className="btn-ghost mt-4" onClick={() => { if (window.confirm(m("hub.resetAsk"))) pr.reset(); }}>{m("hub.reset")}</button>
      </aside>
    </div>
  );
}
