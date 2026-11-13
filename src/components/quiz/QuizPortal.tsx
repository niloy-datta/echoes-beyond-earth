"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { readStore, writeStore } from "@/lib/storage";
import { assetPath } from "@/lib/asset-path";
import { AGE_GROUPS, COMPETENCIES, type AgeGroup } from "@/game/content/learningBank";
import { CHAPTERS } from "@/game/content/chapters";
import {
  ASSESSMENT_KEY, canStart, compare, correctedMisconceptions, itemById, itemsFor, mastery, newAssessment, promptFor,
  recommendations, sanitizeAssessment, scoreOf, setAge, answer as answerItem,
  type AssessmentState, type QuizItem, type QuizSet,
} from "@/game/core/assessment";
import { escapeHtml } from "@/game/core/learningSummary";
import { QuickMissionQuiz } from "@/components/quiz/QuickMissionQuiz";

type Lang = "en" | "bn";
type View = { kind: "home" } | { kind: "run"; set: QuizSet | { kind: "single"; id: string } };

const KIND_LABEL: Record<QuizItem["kind"], { en: string; bn: string }> = {
  observed: { en: "NASA record", bn: "NASA রেকর্ড" },
  derived: { en: "Computed from NASA data", bn: "NASA তথ্য থেকে গণনা" },
  model: { en: "Simplified model", bn: "সরলীকৃত মডেল" },
  interpretation: { en: "Scientific interpretation", bn: "বৈজ্ঞানিক ব্যাখ্যা" },
};
const MASTERY_LABEL = {
  "not-enough-evidence": { en: "Not enough answers yet", bn: "এখনো যথেষ্ট উত্তর নেই" },
  "needs-practice": { en: "Needs practice", bn: "অনুশীলন দরকার" },
  developing: { en: "Developing", bn: "উন্নতি হচ্ছে" },
  demonstrated: { en: "Demonstrated", bn: "দক্ষতা দেখিয়েছে" },
} as const;

function setTitle(set: QuizSet | { kind: "single"; id: string }, lang: Lang): string {
  const bn = lang === "bn";
  if (set.kind === "pre") return bn ? "প্রাক-মূল্যায়ন" : "Pre-assessment";
  if (set.kind === "post") return bn ? "পরবর্তী মূল্যায়ন" : "Post-assessment";
  if (set.kind === "chapter") return `${bn ? "অধ্যায়" : "Chapter"} ${CHAPTERS[set.chapter].number} · ${CHAPTERS[set.chapter].title[lang]}`;
  if (set.kind === "challenge") return bn ? "উন্নত চ্যালেঞ্জ" : "Advanced challenges";
  return bn ? "লক্ষ্যভিত্তিক অনুশীলন" : "Targeted practice";
}

/** One question at a time; wrong answers show the misconception, hint and evidence, then allow another try. */
function Runner({ items, state, lang, onAnswer, onExit, title }: {
  items: QuizItem[]; state: AssessmentState; lang: Lang; title: string;
  onAnswer: (id: string, choice: number) => boolean; onExit: () => void;
}) {
  const bn = lang === "bn";
  const firstOpen = Math.max(0, items.findIndex((i) => !state.attempts[i.id]?.solved));
  const [index, setIndex] = useState(firstOpen);
  const [choice, setChoice] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"right" | "wrong" | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const item = items[index];
  useEffect(() => { headingRef.current?.focus(); }, [index]);
  if (!item) return null;
  const solved = !!state.attempts[item.id]?.solved;
  const doneCount = items.filter((i) => state.attempts[i.id]?.solved).length;
  const submit = () => {
    if (choice === null) return;
    setFeedback(onAnswer(item.id, choice) ? "right" : "wrong");
  };
  const next = () => {
    setChoice(null); setFeedback(null);
    const n = items.findIndex((i, k) => k > index && !state.attempts[i.id]?.solved);
    if (n >= 0) setIndex(n); else onExit();
  };
  return (
    <section className="mx-auto max-w-3xl" aria-labelledby="quiz-q" data-testid="quiz-runner">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="label text-signal">{title}</p>
        <p className="text-sm text-lunar-2" aria-live="polite">{bn ? `সমাধান ${doneCount}/${items.length}` : `Solved ${doneCount}/${items.length}`}</p>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-void-3" aria-hidden><div className="h-full bg-signal" style={{ width: `${(doneCount / items.length) * 100}%` }} /></div>
      <p className="mt-8 text-xs uppercase tracking-widest text-dust">{bn ? "প্রশ্ন" : "Question"} {index + 1}/{items.length} · {KIND_LABEL[item.kind][lang]}</p>
      <h2 id="quiz-q" ref={headingRef} tabIndex={-1} className="mt-3 text-2xl leading-snug text-lunar outline-none">{promptFor(item, state.age)[lang]}</h2>
      <div role="radiogroup" aria-labelledby="quiz-q" className="mt-6 grid gap-3">
        {item.options.map((o, i) => {
          const selected = choice === i;
          return (
            <button key={i} type="button" role="radio" aria-checked={selected} disabled={solved || feedback === "right"}
              onClick={() => { setChoice(i); if (feedback === "wrong") setFeedback(null); }}
              className={`min-h-12 rounded-lg border px-4 py-3 text-left text-base transition-colors ${selected ? "border-signal bg-signal/10 text-lunar" : "border-hairline bg-void-2 text-lunar-2 hover:border-signal/60"} disabled:opacity-70`}>
              <span className="mr-3 font-mono text-dust">{String.fromCharCode(65 + i)}</span>{o[lang]}
            </button>
          );
        })}
      </div>
      {feedback === "wrong" && (
        <div role="alert" className="mt-6 border-l-2 border-caution bg-void-2 p-4 text-sm leading-relaxed" data-testid="quiz-wrong">
          <p className="text-caution">{bn ? "এখনো ঠিক হয়নি। এটি তোমার প্রথম চেষ্টার ফল হিসেবে রেকর্ড হয়েছে।" : "Not yet. Your first answer is recorded as-is."}</p>
          <p className="mt-2 text-lunar-2"><strong>{bn ? "ভুল ধারণা:" : "Common misconception:"}</strong> {item.misconception[lang]}</p>
          <p className="mt-2 text-lunar-2"><strong>{bn ? "সূত্র:" : "Hint:"}</strong> {item.hint[lang]}</p>
          <a className="mt-2 inline-block text-signal underline" href={item.source.url} target="_blank" rel="noopener noreferrer">{bn ? "প্রমাণ দেখো" : "See the evidence"}: {item.source.label} ↗</a>
        </div>
      )}
      {(feedback === "right" || solved) && (
        <div role="status" className="mt-6 border-l-2 border-signal bg-void-2 p-4 text-sm leading-relaxed" data-testid="quiz-right">
          <p className="text-signal">{state.attempts[item.id]?.firstCorrect ? (bn ? "✓ প্রথম চেষ্টায় সঠিক।" : "✓ Correct on the first try.") : (bn ? "✓ সঠিক (সাহায্যসহ)।" : "✓ Correct (with help).")}</p>
          <p className="mt-2 text-lunar-2">{item.explanation[lang]}</p>
          <a className="mt-2 inline-block text-signal underline" href={item.source.url} target="_blank" rel="noopener noreferrer">{item.source.label} ↗</a>
        </div>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        {feedback === "right" || solved
          ? <button type="button" className="btn-signal" onClick={next} data-testid="quiz-next">{bn ? "পরেরটি →" : "Next →"}</button>
          : <button type="button" className="btn-signal disabled:opacity-50" disabled={choice === null} onClick={submit} data-testid="quiz-submit">{bn ? "উত্তর জমা দাও" : "Submit answer"}</button>}
        <button type="button" className="btn-ghost" onClick={onExit}>{bn ? "পোর্টালে ফিরে যাও" : "Back to portal"}</button>
      </div>
    </section>
  );
}

function Bar({ label, value, testId }: { label: string; value: number | null; testId?: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-3 text-sm" data-testid={testId}>
      <span className="text-lunar-2">{label}</span>
      <span className="text-right font-mono text-lunar">{value === null ? "—" : `${value}%`}</span>
      <div className="col-span-2 h-2 overflow-hidden rounded bg-void-3" aria-hidden><div className="h-full bg-signal" style={{ width: `${value ?? 0}%` }} /></div>
    </div>
  );
}

/** Real NASA PDS data: Opportunity Pancam 880 nm opacity, median per sol. */
function OpacityChart({ lang }: { lang: Lang }) {
  const bn = lang === "bn";
  const [data, setData] = useState<{ sols: [number, number, number][]; provenance: Record<string, unknown> } | null | "error">(null);
  useEffect(() => {
    let live = true;
    fetch(assetPath("/data/nasa/mer1-opacity.json")).then((r) => (r.ok ? r.json() : Promise.reject())).then((d) => { if (live) setData(d); }).catch(() => { if (live) setData("error"); });
    return () => { live = false; };
  }, []);
  if (data === "error") return <p className="text-sm text-caution">{bn ? "NASA তথ্য লোড হয়নি।" : "Could not load the NASA data file."}</p>;
  if (!data) return <p className="text-sm text-lunar-2">{bn ? "NASA তথ্য লোড হচ্ছে…" : "Loading NASA data…"}</p>;
  const W = 720, H = 200, maxSol = 5106, maxTau = 5;
  const pts = data.sols.map(([s, t]) => `${((s / maxSol) * W).toFixed(1)},${(H - (Math.min(t, maxTau) / maxTau) * H).toFixed(1)}`).join(" ");
  const p = data.provenance as { product: string; doi: string; url: string; coverage: { start: string; stop: string } };
  return (
    <figure className="border border-hairline bg-void-2 p-5" data-testid="opacity-chart">
      <figcaption className="mb-3 text-sm text-lunar-2">
        <strong className="text-lunar">{bn ? "অপরচুনিটির আকাশের ধুলা (টাউ), ২০০৪–২০১৮" : "Dust over Opportunity (tau), 2004–2018"}</strong>{" "}
        · <span className="text-signal">{bn ? "আসল NASA তথ্য" : "Real NASA data"}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H + 24}`} className="h-auto w-full" role="img"
        aria-label={bn ? "সল অনুযায়ী দৈনিক মধ্যমা টাউ; ২০০৭-এ সর্বোচ্চ ৪.৫৩, শেষ মান ৫১০৫ সলে ২.২৬" : "Daily median tau by sol; peak 4.53 in 2007, last value 2.26 on sol 5105"}>
        <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1" className="text-signal" />
        <line x1="0" y1={H} x2={W} y2={H} stroke="currentColor" className="text-dust" strokeWidth="0.5" />
        <text x="0" y={H + 18} fontSize="12" fill="currentColor" className="text-dust">{bn ? "সল ০" : "sol 0"}</text>
        <text x={W} y={H + 18} fontSize="12" textAnchor="end" fill="currentColor" className="text-dust">{bn ? "সল ৫১০৬ (৫ জুন ২০১৮)" : "sol 5106 (June 5, 2018)"}</text>
      </svg>
      <p className="mt-3 text-xs leading-relaxed text-dust">
        {bn
          ? "উৎস: NASA PDS, প্যানক্যাম ৮৮০ ন্যানোমিটার, পণ্য " : "Source: NASA PDS, Pancam 880 nm, product "}
        <a className="underline" href={p.url} target="_blank" rel="noopener noreferrer">{p.product}</a> · DOI {p.doi}.{" "}
        {bn
          ? "প্রতি সলের মধ্যমা; কোনো মান অনুমান করে বসানো হয়নি। টেবিলটি ৫ জুন ২০১৮-তে শেষ; ১০ জুনের প্রায় ১০.৮ মান JPL-এর আলাদা অনুমান।"
          : "Median per sol; no values interpolated. The table ends on June 5, 2018; the June 10 estimate of about 10.8 is a separate JPL figure."}
      </p>
    </figure>
  );
}

function reportHtml(s: AssessmentState, lang: Lang): string {
  const bn = lang === "bn";
  const c = compare(s);
  const pct = (v: number | null) => (v === null ? "—" : `${v}%`);
  const rows = c.byCompetency.map((x) => {
    const m = mastery(s, x.id);
    const title = COMPETENCIES.find((k) => k.id === x.id)!.title[lang];
    return `<tr><td>${escapeHtml(title)}</td><td>${pct(x.pre)}</td><td>${pct(x.post)}</td><td>${x.deltaPoints === null ? "—" : `${x.deltaPoints > 0 ? "+" : ""}${x.deltaPoints}`}</td><td>${escapeHtml(MASTERY_LABEL[m.level][lang])}</td></tr>`;
  }).join("");
  const chapters = CHAPTERS.map((ch, i) => { const sc = scoreOf(s, itemsFor({ kind: "chapter", chapter: i })); return `<li>${escapeHtml(ch.number)} ${escapeHtml(ch.title[lang])}: ${sc.answered}/${sc.total}${sc.pct === null ? "" : ` · ${bn ? "প্রথম চেষ্টায়" : "first try"} ${sc.pct}%`}</li>`; }).join("");
  const age = AGE_GROUPS.find((a) => a.id === s.age);
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${bn ? "শেখার ফলাফল" : "Learning report"}</title>
<style>body{font:15px/1.5 system-ui,"Noto Sans Bengali",sans-serif;max-width:52rem;margin:2rem auto;padding:0 1rem;color:#111}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:.4rem;text-align:left}small{color:#555}</style></head><body>
<h1>${bn ? "শেষ আলো: শেখার ফলাফল" : "The Last Light: learning report"}</h1>
<p>${bn ? "বয়স-গোষ্ঠী" : "Age group"}: ${age ? escapeHtml(`${age.title[lang]} (${age.ages})`) : "—"} · ${escapeHtml(new Date().toISOString().slice(0, 10))}</p>
<p>${bn ? "প্রাক-মূল্যায়ন" : "Pre-assessment"}: ${pct(c.pre)} · ${bn ? "পরবর্তী মূল্যায়ন" : "Post-assessment"}: ${pct(c.post)} · ${bn ? "পরিবর্তন" : "Change"}: ${c.deltaPoints === null ? "—" : `${c.deltaPoints > 0 ? "+" : ""}${c.deltaPoints} ${bn ? "শতাংশ পয়েন্ট" : "percentage points"}`}</p>
<table><thead><tr><th>${bn ? "দক্ষতা" : "Competency"}</th><th>${bn ? "প্রাক" : "Pre"}</th><th>${bn ? "পরবর্তী" : "Post"}</th><th>${bn ? "পরিবর্তন (পয়েন্ট)" : "Change (pts)"}</th><th>${bn ? "অবস্থা" : "Status"}</th></tr></thead><tbody>${rows}</tbody></table>
<h2>${bn ? "অধ্যায়ের কুইজ" : "Chapter quizzes"}</h2><ul>${chapters}</ul>
<p>${bn ? "সংশোধিত ভুল ধারণা" : "Misconceptions corrected"}: ${correctedMisconceptions(s).length}</p>
<p><small>${bn ? "স্কোর শুধু প্রথম চেষ্টার উত্তর থেকে; সাহায্য নিয়ে সমাধান আলাদা গোনা হয়। ফলাফল শুধু এই ডিভাইসে তৈরি; কোনো ব্যক্তিগত তথ্য নেই। NASA-র অফিসিয়াল নথি নয়।" : "Scores use first-try answers only; assisted solutions are counted separately. Generated on this device; no personal data. Not an official NASA document."}</small></p></body></html>`;
}

function Dashboard({ state, lang, onStart }: { state: AssessmentState; lang: Lang; onStart: (set: QuizSet | { kind: "single"; id: string }) => void }) {
  const bn = lang === "bn";
  const c = compare(state);
  const recs = recommendations(state);
  const all = useMemo(() => [...itemsFor({ kind: "pre" }), ...itemsFor({ kind: "post" }), ...[0, 1, 2, 3, 4].flatMap((n) => itemsFor({ kind: "chapter", chapter: n }))], []);
  const total = scoreOf(state, all);
  const download = () => {
    const url = URL.createObjectURL(new Blob([reportHtml(state, lang)], { type: "text/html" }));
    const a = document.createElement("a"); a.href = url; a.download = "learning-report.html"; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  return (
    <section aria-labelledby="dash" className="mt-14" data-testid="learning-dashboard">
      <h2 id="dash" className="font-serif text-3xl italic">{bn ? "শেখার ড্যাশবোর্ড" : "Learning dashboard"}</h2>
      <p className="mt-2 max-w-3xl text-sm text-lunar-2">{bn ? "স্কোর শুধু প্রথম চেষ্টার উত্তর থেকে। বারবার চেষ্টা করে সমাধান করলে সেটি \"সাহায্যসহ\" হিসেবে আলাদা গোনা হয়। খেলা শেষ করলেই শেখা প্রমাণ হয় না, তাই পরিবর্তন দেখানো হয় শুধু দুটি মূল্যায়ন শেষ হলে।" : "Scores use first-try answers only. Solving after retries counts separately as \"assisted\". Finishing the game does not prove learning, so change is shown only once both assessments are complete."}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="border border-hairline bg-void-2 p-5"><p className="label">{bn ? "প্রাক-মূল্যায়ন" : "Pre-assessment"}</p><p className="mt-2 font-mono text-3xl" data-testid="pre-score">{c.pre === null ? "—" : `${c.pre}%`}</p></div>
        <div className="border border-hairline bg-void-2 p-5"><p className="label">{bn ? "পরবর্তী মূল্যায়ন" : "Post-assessment"}</p><p className="mt-2 font-mono text-3xl" data-testid="post-score">{c.post === null ? "—" : `${c.post}%`}</p></div>
        <div className="border border-hairline bg-void-2 p-5"><p className="label">{bn ? "পরিবর্তন" : "Change"}</p><p className="mt-2 font-mono text-3xl" data-testid="delta">{c.deltaPoints === null ? "—" : `${c.deltaPoints > 0 ? "+" : ""}${c.deltaPoints} ${bn ? "পয়েন্ট" : "pts"}`}</p></div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 border border-hairline bg-void-2 p-5">
          <h3 className="label">{bn ? "দক্ষতা অনুযায়ী (প্রাক → পরবর্তী)" : "By competency (pre → post)"}</h3>
          {c.byCompetency.map((x) => {
            const m = mastery(state, x.id);
            const title = COMPETENCIES.find((k) => k.id === x.id)!.title[lang];
            return (
              <div key={x.id}>
                <Bar label={`${title} · ${bn ? "পরবর্তী" : "post"}`} value={x.post} />
                <p className="mt-1 text-xs text-dust">{bn ? "প্রাক" : "Pre"} {x.pre === null ? "—" : `${x.pre}%`} · {MASTERY_LABEL[m.level][lang]}{m.assisted ? ` · ${bn ? "সাহায্যসহ" : "assisted"} ${m.assisted}` : ""}</p>
              </div>
            );
          })}
        </div>
        <div className="space-y-4 border border-hairline bg-void-2 p-5">
          <h3 className="label">{bn ? "সামগ্রিক" : "Overall"}</h3>
          <Bar label={bn ? "প্রথম চেষ্টায় সঠিক (সব উত্তর)" : "First-try accuracy (all answers)"} value={total.pct} testId="first-try" />
          <p className="text-sm text-lunar-2">{bn ? "উত্তর দেওয়া" : "Answered"}: {total.answered}/{total.total} · {bn ? "সাহায্যসহ সমাধান" : "Solved with help"}: {total.assisted} · {bn ? "সংশোধিত ভুল ধারণা" : "Misconceptions corrected"}: {correctedMisconceptions(state).length}</p>
          <p className="text-sm text-lunar-2">{bn ? "সম্পন্ন অধ্যায়-কুইজ" : "Chapter quizzes completed"}: {Object.keys(state.completed.chapters).length}/5</p>
          {recs.length > 0 && (
            <div>
              <h4 className="label mt-4">{bn ? "পরামর্শ" : "Suggested next"}</h4>
              <ul className="mt-2 space-y-2">
                {recs.map((r) => {
                  const title = COMPETENCIES.find((k) => k.id === r.competency)!.title[lang];
                  return (
                    <li key={r.competency}>
                      <button type="button" className="btn-ghost text-left text-sm" onClick={() => onStart({ kind: "single", id: r.itemId })} data-testid={`rec-${r.type}-${r.competency}`}>
                        {r.type === "practice" ? (bn ? "অনুশীলন: " : "Practice: ") : (bn ? "চ্যালেঞ্জ: " : "Challenge: ")}{title} →
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <button type="button" className="btn-signal mt-2" onClick={download} data-testid="download-report">{bn ? "শেখার রিপোর্ট ডাউনলোড" : "Download learning report"}</button>
        </div>
      </div>
    </section>
  );
}

export function QuizPortal() {
  const { lang } = useT();
  const bn = lang === "bn";
  const [state, setState] = useState<AssessmentState>(newAssessment);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>({ kind: "home" });
  useEffect(() => { setState(sanitizeAssessment(readStore(ASSESSMENT_KEY, null))); setReady(true); }, []);
  const save = (next: AssessmentState) => { setState(next); writeStore(ASSESSMENT_KEY, next); };
  const onAnswer = (id: string, choice: number) => { const r = answerItem(state, id, choice); save(r.state); return r.correct; };
  const chooseAge = (age: AgeGroup) => save(setAge(state, age));

  if (!ready) return <main className="container-x min-h-[70svh] pt-[calc(var(--header-h)+3rem)]"><p className="text-lunar-2">{bn ? "লোড হচ্ছে…" : "Loading…"}</p></main>;

  if (view.kind === "run") {
    const set = view.set;
    const items = set.kind === "single" ? [itemById(set.id)!].filter(Boolean) : itemsFor(set);
    return (
      <main className="container-x min-h-[85svh] pb-24 pt-[calc(var(--header-h)+3rem)]">
        <Runner key={JSON.stringify(set)} items={items} state={state} lang={lang} title={setTitle(set, lang)} onAnswer={onAnswer} onExit={() => setView({ kind: "home" })} />
      </main>
    );
  }

  const status = (set: QuizSet) => { const sc = scoreOf(state, itemsFor(set)); const solved = itemsFor(set).filter((i) => state.attempts[i.id]?.solved).length; return { sc, solved }; };
  const Card = ({ set, label, note }: { set: QuizSet; label: string; note: string }) => {
    const { solved } = status(set);
    const total = itemsFor(set).length;
    const locked = !canStart(state, set);
    return (
      <button type="button" disabled={locked} onClick={() => setView({ kind: "run", set })} data-testid={`start-${set.kind}${set.kind === "chapter" ? set.chapter : ""}`}
        className="flex min-h-28 flex-col justify-between border border-hairline bg-void-2 p-5 text-left transition-colors hover:border-signal disabled:cursor-not-allowed disabled:opacity-50">
        <span className="text-lg text-lunar">{label}</span>
        <span className="mt-2 text-sm text-lunar-2">{locked ? (bn ? "🔒 আগে প্রাক-মূল্যায়ন শেষ করো" : "🔒 Finish the pre-assessment first") : note}</span>
        <span className="mt-2 font-mono text-xs text-dust">{solved}/{total} {bn ? "সমাধান" : "solved"}</span>
      </button>
    );
  };

  return (
    <main className="container-x min-h-[85svh] pb-24 pt-[calc(var(--header-h)+3rem)]" data-testid="quiz-portal">
      <header className="max-w-4xl">
        <Link href="/play/game/" className="btn-ghost">← {bn ? "শেষ আলো খেলায় ফিরে যাও" : "Back to The Last Light"}</Link>
        <p className="label mt-10 text-signal">{bn ? "NASA বিজ্ঞান কুইজ পোর্টাল" : "NASA SCIENCE QUIZ PORTAL"}</p>
        <h1 className="display mt-5 text-[clamp(2.5rem,6vw,5rem)]">{bn ? "যা শিখলে, তা প্রমাণ দিয়ে যাচাই করো" : "Test what you learned against the evidence"}</h1>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-lunar-2">{bn ? "প্রতিটি প্রশ্ন NASA-র রেকর্ড বা NASA-র আসল তথ্য থেকে। ভুল উত্তরে ভুল ধারণা, সূত্র আর প্রমাণ দেখানো হয়, তারপর আবার চেষ্টা করা যায়। সব ফলাফল শুধু এই ডিভাইসে থাকে; নাম বা জন্মতারিখ লাগে না।" : "Every question comes from a NASA record or real NASA data. A wrong answer shows the misconception, a hint and the evidence, then you can try again. Results stay on this device; no name or birth date is needed."}</p>
      </header>

      <QuickMissionQuiz lang={lang} age={state.age} />

      <section aria-labelledby="age" className="mt-10">
        <h2 id="age" className="label">{bn ? "বয়স-গোষ্ঠী (ঐচ্ছিক)" : "Age group (optional)"}</h2>
        <div role="radiogroup" aria-labelledby="age" className="mt-3 grid gap-3 sm:grid-cols-3">
          {AGE_GROUPS.map((a) => (
            <button key={a.id} type="button" role="radio" aria-checked={state.age === a.id} onClick={() => chooseAge(a.id)} data-age={a.id}
              className={`min-h-16 rounded-lg border px-4 py-3 text-left ${state.age === a.id ? "border-signal bg-signal/10" : "border-hairline bg-void-2 hover:border-signal/60"}`}>
              <span className="block text-lunar">{a.title[lang]}</span>
              <span className="text-sm text-lunar-2">{bn ? "বয়স" : "Ages"} {a.ages}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-dust">{bn ? "বয়স বদলালে প্রশ্নের ভাষা সহজ বা বিস্তারিত হয়; বিকল্প আর সঠিক উত্তর একই থাকে, তাই প্রাক ও পরবর্তী ফলাফল তুলনীয়।" : "Age changes how questions are worded; options and correct answers stay the same, so pre and post results remain comparable."}</p>
      </section>

      <section aria-labelledby="sets" className="mt-12">
        <h2 id="sets" className="font-serif text-3xl italic">{bn ? "মূল্যায়ন ও অধ্যায়-কুইজ" : "Assessments and chapter quizzes"}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card set={{ kind: "pre" }} label={bn ? "১. প্রাক-মূল্যায়ন (১০)" : "1. Pre-assessment (10)"} note={bn ? "অভিযানের আগে তোমার শুরুর ধারণা মাপো" : "Measure your starting point before the expedition"} />
          {CHAPTERS.map((ch, i) => (
            <Card key={ch.id} set={{ kind: "chapter", chapter: i }} label={`${ch.number} · ${ch.title[lang]} (5)`} note={ch.dek[lang]} />
          ))}
          <Card set={{ kind: "post" }} label={bn ? "৭. পরবর্তী মূল্যায়ন (১০)" : "7. Post-assessment (10)"} note={bn ? "একই দক্ষতা, নতুন প্রশ্ন" : "Same skills, different questions"} />
        </div>
      </section>

      <section aria-labelledby="data" className="mt-14">
        <h2 id="data" className="font-serif text-3xl italic">{bn ? "আসল NASA তথ্য" : "Real NASA data"}</h2>
        <div className="mt-6"><OpacityChart lang={lang} /></div>
      </section>

      <Dashboard state={state} lang={lang} onStart={(set) => setView({ kind: "run", set })} />
    </main>
  );
}
