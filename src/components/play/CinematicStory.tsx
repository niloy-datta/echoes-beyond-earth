"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { readStore, writeStore, clearStore } from "@/lib/storage";
import {
  STORY_CHAPTERS,
  STORY_STORAGE_KEY,
  advanceStory,
  initialStoryProgress,
  recoverStoryMemory,
  resetStory,
  sanitizeStoryProgress,
  storyPercent,
  type StoryChapterId,
  type StoryProgress,
} from "@/lib/story";

interface CinematicStoryProps {
  onOpenField: () => void;
}

export function EkoCharacter({ emotion }: { emotion: string }) {
  return (
    <div className="eko-character" data-emotion={emotion} aria-label={`EKO ${emotion} emotion`} role="img">
      <div className="eko-character__antenna" />
      <div className="eko-character__head"><span /><span /></div>
      <div className="eko-character__core" />
      <div className="eko-character__float" />
    </div>
  );
}

export function EkoDialogue({ children }: { children: React.ReactNode }) {
  return <div className="story-dialogue" aria-live="polite"><span className="story-dialogue__mark">EKO</span><p>{children}</p></div>;
}

export function CinematicStory({ onOpenField }: CinematicStoryProps) {
  const { lang } = useT();
  const [progress, setProgress] = useState<StoryProgress>(initialStoryProgress);
  const [ready, setReady] = useState(false);
  const current = useMemo(() => STORY_CHAPTERS.find((chapter) => chapter.id === progress.chapter) ?? STORY_CHAPTERS[0], [progress.chapter]);
  const index = STORY_CHAPTERS.findIndex((chapter) => chapter.id === current.id);
  const recoveredHere = progress.recovered.includes(current.memory);
  const text = useCallback((value: { en: string; bn: string }) => value[lang], [lang]);

  useEffect(() => {
    setProgress(sanitizeStoryProgress(readStore(STORY_STORAGE_KEY, initialStoryProgress())));
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) writeStore(STORY_STORAGE_KEY, progress);
  }, [progress, ready]);

  const recover = () => setProgress((before) => recoverStoryMemory(before, current.id));
  const continueStory = () => setProgress((before) => advanceStory(before));
  const reset = () => {
    clearStore(STORY_STORAGE_KEY);
    setProgress(resetStory());
  };

  return (
    <section id="story-campaign" className={`story-campaign story-campaign--${current.id}`} aria-labelledby="story-campaign-title">
      <div className="story-campaign__aurora" aria-hidden="true" />
      <div className="container-x relative py-10 sm:py-16 lg:py-24">
        <div className="story-campaign__topline">
          <div><p className="label text-signal">THE LAST LIGHT OF OPPORTUNITY</p><p className="mt-2 text-xs text-dust">{lang === "bn" ? "একটি কাল্পনিক EKO গাইড · ঐতিহাসিক দাবি NASA-সূত্রে" : "A fictional EKO guide · historical claims are NASA-sourced"}</p></div>
          <div className="flex items-center gap-3"><span className="label">{storyPercent(progress)}%</span><button type="button" className="btn-ghost !px-3 !py-2" onClick={reset}>{lang === "bn" ? "রিসেট" : "Reset"}</button></div>
        </div>

        <div className="story-campaign__grid">
          <div className="story-stage" data-chapter={current.id}>
            <div className="story-stage__stars" aria-hidden="true" />
            <div className="story-stage__horizon" aria-hidden="true" />
            <div className="story-stage__chapter"><span className="label text-signal">CHAPTER {current.number}</span><span className="story-stage__signal" /></div>
            <div className="story-stage__content">
              <EkoCharacter emotion={current.emotion} />
              <div className="max-w-2xl">
                <h1 id="story-campaign-title" className="display text-[clamp(2.8rem,7vw,7rem)]">{text(current.title)}</h1>
                <p className="mt-5 max-w-xl text-lg leading-relaxed text-lunar-2">{text(current.dek)}</p>
                <EkoDialogue>{text(current.eko)}</EkoDialogue>
                <div className="mt-6 flex flex-wrap gap-3">
                  {!recoveredHere && <button type="button" className="btn-signal" onClick={recover}>{lang === "bn" ? "স্মৃতি উদ্ধার" : "Recover memory"} ↗</button>}
                  {current.id === "journey" && <button type="button" className="btn-ghost" onClick={onOpenField}>{lang === "bn" ? "মঙ্গল মাঠে প্রবেশ" : "Enter Mars field"} →</button>}
                  {recoveredHere && index < STORY_CHAPTERS.length - 1 && <button type="button" className="btn-signal" onClick={continueStory}>{lang === "bn" ? "পরের অধ্যায়" : "Continue chapter"} →</button>}
                  {recoveredHere && index === STORY_CHAPTERS.length - 1 && <span className="story-complete-badge">✦ {lang === "bn" ? "মিশন সম্পন্ন" : "Mission complete"}</span>}
                </div>
              </div>
            </div>
            {current.factualNote && <div className="story-stage__fact"><span className="label text-signal">NASA RECORD</span><p>{text(current.factualNote)}</p>{current.source && <a href={current.source.url} target="_blank" rel="noreferrer">{current.source.label} ↗</a>}</div>}
          </div>

          <aside className="story-rail" aria-label={lang === "bn" ? "গল্পের অধ্যায়" : "Story chapters"}>
            <div className="story-rail__header"><span className="label">MISSION PROGRESS</span><span className="font-mono text-xs text-dust">{progress.recovered.length}/{STORY_CHAPTERS.length}</span></div>
            <div className="story-rail__line" aria-hidden="true"><span style={{ width: `${Math.max(4, storyPercent(progress))}%` }} /></div>
            <ol className="story-rail__list">
              {STORY_CHAPTERS.map((chapter, chapterIndex) => {
                const done = progress.recovered.includes(chapter.memory);
                const active = chapter.id === current.id;
                return <li key={chapter.id}><button type="button" className={`story-rail__item ${active ? "is-active" : ""} ${done ? "is-done" : ""}`} onClick={() => setProgress((before) => ({ ...before, chapter: chapter.id, completed: false }))}><span className="story-rail__number">{chapter.number}</span><span><strong>{text(chapter.title)}</strong><small>{done ? (lang === "bn" ? "স্মৃতি উদ্ধার" : "Memory recovered") : chapterIndex <= index ? (lang === "bn" ? "প্রবেশযোগ্য" : "Available") : (lang === "bn" ? "পরবর্তী" : "Next")}</small></span><span aria-hidden>{done ? "✓" : active ? "●" : "○"}</span></button></li>;
              })}
            </ol>
            <p className="mt-6 text-xs leading-relaxed text-dust">{lang === "bn" ? "অধ্যায় বদলালে তোমার অগ্রগতি স্থানীয়ভাবে সংরক্ষিত থাকে। 3D দৃশ্য শিল্পীর কল্পনা; NASA তথ্যের পাশে উৎস দেওয়া আছে।" : "Your progress is saved locally as chapters change. The 3D scene is artistic; NASA records are cited beside the facts."}</p>
          </aside>
        </div>
      </div>
    </section>
  );
}
