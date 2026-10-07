"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ACHIEVEMENTS, CHAPTERS, LEVELS } from "@/game/content/chapters";
import { EVIDENCE } from "@/game/content/evidence";
import { SAVE_KEY, chaptersCompleted, evidenceOf, levelOf, levelXp, sanitizeProgress, type GameProgress } from "@/game/core/progress";
import { useT } from "@/lib/i18n";
import { readStore } from "@/lib/storage";

/** Explorer Passport card for THE LAST LIGHT game (reads the local save only). */
export function GameRecord() {
  const { lang } = useT();
  const bn = lang === "bn";
  const [save, setSave] = useState<GameProgress | null>(null);
  useEffect(() => {
    const raw = readStore<unknown>(SAVE_KEY, null);
    setSave(raw ? sanitizeProgress(raw) : null);
  }, []);
  const xp = save ? levelXp(save) : 0;
  const lv = levelOf(xp);
  const chapters = save ? (save.finished ? CHAPTERS.length : chaptersCompleted(save)) : 0;
  return (
    <section aria-labelledby="game-record-title" className="mt-6 border border-hairline-strong bg-void/70 p-5 backdrop-blur-md md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label text-signal">{bn ? "খেলা · শেষ আলো" : "GAME · THE LAST LIGHT"}</p>
          <h2 id="game-record-title" className="mt-2 font-serif text-3xl italic">{bn ? "মঙ্গল অভিযানের রেকর্ড" : "Mars expedition record"}</h2>
        </div>
        <Link prefetch={false} href="/play/game/" className="btn-signal">{save ? (bn ? "খেলা চালিয়ে যাও" : "Continue The Last Light") : (bn ? "শেষ আলো খেলো" : "Play The Last Light")} →</Link>
      </div>
      {save ? (
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [bn ? "লেভেল" : "Level", `${lv.level + 1} · ${LEVELS[lv.level].title[lang]}`],
            [bn ? "অধ্যায়" : "Chapters", `${chapters}/${CHAPTERS.length}`],
            [bn ? "প্রমাণ" : "Evidence", `${evidenceOf(save).length}/${EVIDENCE.length}`],
            [bn ? "অর্জন" : "Achievements", `${save.achievements.length}/${ACHIEVEMENTS.length}`],
          ].map(([k, v]) => (
            <div key={k} className="border border-hairline p-3">
              <dt className="label">{k}</dt>
              <dd className="mt-1 text-lunar">{v}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-lunar-2">
          {bn ? "ইকোর সঙ্গে পাঁচ অধ্যায়ের থার্ড-পারসন অভিযান। শেষ করলে অপরচুনিটি তোমার পাসপোর্টে যুক্ত হবে।" : "A five-chapter third-person expedition with EKO. Finish it to add Opportunity to this passport."}
        </p>
      )}
      {save && save.achievements.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2" aria-label={bn ? "অর্জন" : "Achievements"}>
          {ACHIEVEMENTS.filter((a) => save.achievements.includes(a.id)).map((a) => (
            <li key={a.id} className="border border-hairline px-3 py-1.5 font-mono text-[11px] text-lunar-2">{a.icon} {a.title[lang]}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
