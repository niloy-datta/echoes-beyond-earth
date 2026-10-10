"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CHAPTERS } from "../content/chapters";
import { chapterXp } from "../core/progress";
import { localizeDigits } from "../core/geo";
import { ClipView } from "./ClipView";
import { Compass } from "./Compass";
import { useCatalog, useProgress } from "./data";
import { BhuluAvatar, ErrorBox, Loading, Stars } from "./parts";
import { QuizRunner } from "./QuizRunner";
import { Reveal } from "./Reveal";
import { useM } from "./strings";

type Step = "clip" | "compass" | "reveal" | "quiz" | "badge";
const STEPS: Step[] = ["clip", "compass", "reveal", "quiz", "badge"];

function Stepper({ step }: { step: Step }) {
  const { m } = useM();
  return (
    <ol className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="progress">
      {STEPS.map((s, i) => (
        <li key={s} aria-current={s === step ? "step" : undefined} className={`flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] ${s === step ? "text-signal" : STEPS.indexOf(step) > i ? "text-lunar-2" : "text-dust"}`}>
          <span className={`grid h-5 w-5 place-items-center rounded-full border text-[10px] ${s === step ? "border-signal" : "border-current"}`}>{STEPS.indexOf(step) > i ? "✓" : i + 1}</span>
          {m(`play.step.${s}` as "play.step.clip")}
        </li>
      ))}
    </ol>
  );
}

export function Player({ chapterId }: { chapterId: string }) {
  const { m, l, lang, reduced } = useM();
  const cat = useCatalog();
  const pr = useProgress();
  const chapter = useMemo(() => CHAPTERS.find((c) => c.id === chapterId), [chapterId]);
  const [step, setStep] = useState<Step>("clip");
  const [stars, setStars] = useState(0);
  const [hints, setHints] = useState(0);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => { setStep("clip"); setQuizScore(null); setAttempt(0); }, [chapterId]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" }); }, [step, reduced]);

  if (!chapter) {
    return (
      <div className="container-x pt-[calc(var(--header-h)+3rem)]">
        <p className="text-lunar-2">{m("play.unknownChapter")}</p>
        <Link href="/missions/" className="btn-ghost mt-4">{m("play.back")}</Link>
      </div>
    );
  }
  if (cat.status === "loading" || !pr.hydrated) return <Loading label={m("common.loading")} />;
  if (cat.status === "error") return <ErrorBox message={cat.error} onRetry={cat.retry} />;
  const object = cat.byId.get(chapter.objectId);
  if (!object) return <ErrorBox message={`catalog: ${chapter.objectId}`} />;

  const idx = CHAPTERS.findIndex((c) => c.id === chapter.id);
  const nextChapter = CHAPTERS[idx + 1];
  const rec = pr.progress.chapters[chapter.id];
  const num = (n: number) => localizeDigits(String(n), lang);

  return (
    <div className="container-x pb-20 pt-[calc(var(--header-h)+1.5rem)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/missions/" prefetch={false} className="btn-ghost">← {m("play.back")}</Link>
        <p className="label">{m("hub.chapter", { n: num(chapter.order) })} · {l(chapter.title)}</p>
      </div>
      <Stepper step={step} />

      {step === "clip" && (
        <section aria-labelledby="clip-h">
          <h1 id="clip-h" className="display mb-1 text-[clamp(1.5rem,3.6vw,2.6rem)]">{l(chapter.title)}</h1>
          <p className="mb-5 max-w-3xl text-lunar-2">{l(chapter.dek)}</p>
          <ClipView
            chapter={chapter}
            object={object}
            reduced={reduced}
            onEnd={() => pr.clip(chapter.id)}
            onSkip={() => { pr.clip(chapter.id); setStep("compass"); }}
          />
        </section>
      )}

      {step === "compass" && (
        <section aria-labelledby="cmp-h">
          <h1 id="cmp-h" className="display mb-4 text-[clamp(1.6rem,4vw,2.8rem)]">{m("cmp.title")}</h1>
          <Compass chapter={chapter} object={object} onDone={(s, h) => { setStars(s); setHints(h); pr.compass(chapter.id, s, h); setStep("reveal"); }} />
        </section>
      )}

      {step === "reveal" && <Reveal chapter={chapter} object={object} onNext={() => setStep("quiz")} />}

      {step === "quiz" && (
        <section aria-labelledby="quiz-h">
          <h1 id="quiz-h" className="sr-only">{m("quiz.title")}</h1>
          <QuizRunner key={attempt} questions={chapter.quiz} seed={`${chapter.id}:${attempt}`} onFinish={(c) => { setQuizScore(c); pr.quiz(chapter.id, c); setStep("badge"); }} />
        </section>
      )}

      {step === "badge" && quizScore !== null && (
        <section className="mx-auto max-w-xl text-center" aria-live="polite">
          <BhuluAvatar mood={quizScore >= 2 ? "happy" : "talk"} size={110} className="mx-auto" />
          {quizScore >= 2 ? (
            <>
              <div className="mx-auto mt-4 grid h-28 w-28 place-items-center rounded-full border-2 border-signal bg-signal/10 text-5xl shadow-[0_0_40px_rgb(99_230_239/0.35)]" aria-hidden>{chapter.badge.icon}</div>
              <h1 className="display mt-5 text-[clamp(1.8rem,5vw,3rem)]">{m("badge.earned")}</h1>
              <p className="mt-2 text-xl text-lunar">{l(chapter.badge.name)}</p>
            </>
          ) : (
            <h1 className="mt-6 text-xl text-lunar-2">{m("badge.notYet")}</h1>
          )}
          <p className="mt-4 font-mono text-[13px] text-lunar-2">{m("badge.score", { n: num(quizScore), s: num(Math.max(stars, rec?.stars ?? 0)) })}</p>
          <div className="mt-2 flex justify-center"><Stars n={Math.max(stars, rec?.stars ?? 0)} size={24} /></div>
          <p className="mt-2 font-mono text-[13px] text-signal">{m("badge.xp", { n: num(Math.max(0, chapterXp(rec ?? { clip: true, stars, hints, quiz: quizScore }))) })}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {quizScore < 2 && <button type="button" className="btn-ghost" onClick={() => { setAttempt((a) => a + 1); setStep("quiz"); }}>{m("badge.retry")}</button>}
            {nextChapter ? (
              <Link href={`/missions/play/?c=${nextChapter.id}`} prefetch={false} className="btn-signal">{m("badge.next")} →</Link>
            ) : (
              <Link href="/missions/arena/" prefetch={false} className="btn-signal">{m("badge.arena")} →</Link>
            )}
            <Link href="/missions/" prefetch={false} className="btn-ghost">{m("badge.hub")}</Link>
          </div>
          {!nextChapter && <p className="mt-4 text-lunar-2">{m("badge.last")}</p>}
        </section>
      )}
    </div>
  );
}
