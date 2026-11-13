"use client";

import { useMemo, useState } from "react";
import { CHAPTERS } from "@/game/content/chapters";
import { type AgeGroup } from "@/game/content/learningBank";
import { promptFor } from "@/game/core/assessment";
import { buildQuickMission, scoreQuickMission } from "@/game/core/quickMission";

type Lang = "en" | "bn";

export function QuickMissionQuiz({ lang, age }: { lang: Lang; age: AgeGroup | null }) {
  const bn = lang === "bn";
  const [active, setActive] = useState(false);
  const [round, setRound] = useState(0);
  const [step, setStep] = useState(0);
  const [choices, setChoices] = useState<Record<string, number>>({});
  const questions = useMemo(() => buildQuickMission(round), [round]);
  const finished = step >= questions.length;
  const item = finished ? null : questions[step];
  const selected = item ? choices[item.id] : undefined;
  const result = scoreQuickMission(questions, choices);

  const restart = () => {
    setRound((current) => current + 1);
    setChoices({});
    setStep(0);
    setActive(true);
  };

  return (
    <section id="quick-mission" aria-labelledby="quick-mission-title" className="mt-12 scroll-mt-28 border border-hairline bg-void-2 p-5 sm:p-8" data-testid="quick-mission">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label text-signal">{bn ? "ইন্টারঅ্যাকটিভ চ্যালেঞ্জ" : "INTERACTIVE CHALLENGE"}</p>
          <h2 id="quick-mission-title" className="mt-3 font-serif text-3xl italic text-lunar">
            {bn ? "পাঁচ অধ্যায়ের মিশন কুইজ" : "Five-chapter mission quiz"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-lunar-2">
            {bn
              ? "প্রতিটি অধ্যায় থেকে একটি করে NASA-সূত্রযুক্ত প্রশ্ন। সঙ্গে সঙ্গে ফলাফল দেখো এবং নতুন প্রশ্ন নিয়ে আবার খেলো।"
              : "One NASA-sourced question from each chapter. Get instant feedback, then replay with a different set."}
          </p>
        </div>
        <span className="border border-hairline px-3 py-2 text-xs text-dust">
          {bn ? "অনুশীলন · মূল স্কোর বদলাবে না" : "Practice · assessment scores unchanged"}
        </span>
      </div>

      {!active && (
        <button type="button" className="btn-signal mt-6" onClick={() => setActive(true)} data-testid="quick-start">
          {bn ? "মিশন শুরু করো →" : "Start quick mission →"}
        </button>
      )}

      {active && finished && (
        <div className="mt-8 border-t border-hairline pt-6" role="status" data-testid="quick-result">
          <p className="label text-signal">{bn ? "মিশন সম্পন্ন" : "MISSION COMPLETE"}</p>
          <p className="mt-3 font-mono text-5xl text-lunar" data-testid="quick-score">
            {result.correct}/{result.total} <span className="text-lg text-lunar-2">({result.pct}%)</span>
          </p>
          <p className="mt-3 text-lunar-2">
            {bn ? "এটি অনুশীলনের ফল। প্রাক/পরবর্তী মূল্যায়নের ফল অপরিবর্তিত।" : "This is a practice result. Your pre/post assessment record is unchanged."}
          </p>
          <ul className="mt-6 space-y-2">
            {questions.map((question, index) => (
              <li key={question.id} className="flex items-start gap-3 border-b border-hairline py-2 text-sm text-lunar-2">
                <span aria-label={choices[question.id] === question.correct ? (bn ? "সঠিক" : "Correct") : (bn ? "ভুল" : "Incorrect")}
                  className={choices[question.id] === question.correct ? "text-signal" : "text-caution"}>
                  {choices[question.id] === question.correct ? "✓" : "×"}
                </span>
                <span>{CHAPTERS[index].title[lang]}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="btn-signal" onClick={restart} data-testid="quick-retry">
              {bn ? "নতুন প্রশ্নে আবার খেলো ↻" : "Play new questions ↻"}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setActive(false)}>
              {bn ? "বন্ধ করো" : "Close"}
            </button>
          </div>
        </div>
      )}

      {active && item && (
        <div className="mt-8 border-t border-hairline pt-6" data-testid="quick-runner">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-lunar-2">
            <p>{bn ? "প্রশ্ন" : "Question"} {step + 1}/{questions.length} · {CHAPTERS[step].title[lang]}</p>
            <p aria-live="polite">{bn ? "সঠিক" : "Correct"}: {result.correct}</p>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded bg-void-3" aria-hidden="true">
            <div className="h-full bg-signal transition-all" style={{ width: String((step / questions.length) * 100) + "%" }} />
          </div>
          <h3 className="mt-7 text-xl leading-relaxed text-lunar sm:text-2xl" id="quick-question">
            {promptFor(item, age)[lang]}
          </h3>
          <div className="mt-5 grid gap-3" aria-labelledby="quick-question">
            {item.options.map((option, index) => (
              <button key={index} type="button" disabled={selected !== undefined}
                onClick={() => setChoices((previous) => previous[item.id] !== undefined ? previous : { ...previous, [item.id]: index })}
                aria-pressed={selected === index}
                className="min-h-12 rounded-lg border border-hairline bg-void-3 px-4 py-3 text-left text-lunar transition-colors hover:border-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:cursor-default disabled:opacity-75">
                <span className="mr-3 font-mono text-signal">{String.fromCharCode(65 + index)}.</span>{option[lang]}
                {selected !== undefined && index === item.correct ? <span className="ml-2 text-signal">✓</span> : null}
                {selected === index && index !== item.correct ? <span className="ml-2 text-caution">×</span> : null}
              </button>
            ))}
          </div>
          {selected !== undefined && (
            <div className="mt-6 border-l-2 border-signal bg-void-3 p-4 text-sm leading-relaxed" role="status" aria-live="polite" data-testid="quick-feedback">
              <p className={selected === item.correct ? "text-signal" : "text-caution"}>
                {selected === item.correct
                  ? (bn ? "সঠিক উত্তর!" : "Correct answer!")
                  : (bn ? "এবার হয়নি। সঠিক উত্তর:" : "Not quite. The correct answer is:")}
                {selected !== item.correct && <strong className="ml-2 text-lunar">{item.options[item.correct][lang]}</strong>}
              </p>
              <p className="mt-3 text-lunar-2">{item.explanation[lang]}</p>
              <a className="mt-3 inline-block text-signal underline" href={item.source.url} target="_blank" rel="noopener noreferrer">
                {bn ? "NASA প্রমাণ দেখো" : "View NASA evidence"}: {item.source.label} ↗
              </a>
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" disabled={selected === undefined} onClick={() => setStep((current) => current + 1)}
              className="btn-signal disabled:opacity-50" data-testid="quick-next">
              {step + 1 === questions.length
                ? (bn ? "ফলাফল দেখো →" : "View results →")
                : (bn ? "পরের প্রশ্ন →" : "Next question →")}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setActive(false)}>
              {bn ? "বিরতি" : "Pause"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
