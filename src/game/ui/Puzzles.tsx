"use client";

import { useEffect, useMemo, useState } from "react";
import { OBJECTIVE_BY_ID } from "../content/chapters";
import { EVIDENCE_BY_ID } from "../content/evidence";
import {
  PUZZLE_BY_ID, TAU_RECHARGE, TAU_STORM_PEAK, TAU_USUAL, checkMatch, checkOrder, checkPower, checkQuiz, comparePrediction, directBeam, shuffledOrder,
  type PowerPrediction, type Puzzle,
} from "../content/puzzles";
import type { GameSession } from "../core/session";
import { Modal } from "./Modal";
import { S } from "./strings";

type Lang = "en" | "bn";
type Submit = (correct: boolean) => boolean;

function Feedback({ state, lang }: { state: "idle" | "wrong" | "right"; lang: Lang }) {
  if (state === "idle") return null;
  return <p role="status" aria-live="assertive" className={`ll-feedback ${state === "right" ? "is-right" : "is-wrong"}`}>{state === "right" ? S.correct[lang] : S.tryAgain[lang]}</p>;
}

function MatchPuzzle({ p, lang, submit }: { p: Extract<Puzzle, { kind: "match" }>; lang: Lang; submit: Submit }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "wrong" | "right">("idle");
  const complete = p.clues.every((c) => answers[c.id]);
  return (
    <>
      <ol className="ll-match">
        {p.clues.map((clue, i) => (
          <li key={clue.id}>
            <p><span className="font-mono text-signal">0{i + 1}</span> {clue.text[lang]}</p>
            <div role="radiogroup" aria-label={clue.text[lang]} className="ll-choices">
              {p.parts.map((part) => (
                <button key={part.id} type="button" role="radio" aria-checked={answers[clue.id] === part.id}
                  className={`ll-choice ${answers[clue.id] === part.id ? "is-selected" : ""}`}
                  onClick={() => { setAnswers({ ...answers, [clue.id]: part.id }); setState("idle"); }}>
                  {part.label[lang]}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <Feedback state={state} lang={lang} />
      <div className="ll-actions">
        <button type="button" className="ll-btn ll-btn--primary" disabled={!complete} onClick={() => setState(submit(checkMatch(p, answers)) ? "right" : "wrong")}>{S.check[lang]}</button>
      </div>
    </>
  );
}

/** JPL, "Six things about Opportunity's recovery efforts" (Aug 16, 2018). */
const TAU_SOURCE = "https://www.jpl.nasa.gov/news/six-things-about-opportunitys-recovery-efforts/";
const TAU_MIN = TAU_USUAL, TAU_MAX = 11;
const TAU_MARKS: readonly { tau: number; label: { en: string; bn: string } }[] = [
  { tau: TAU_USUAL, label: { en: "usual sky ≈ 0.5", bn: "স্বাভাবিক আকাশ ≈ ০.৫" } },
  { tau: TAU_RECHARGE, label: { en: "needed < 2 to recharge", bn: "রিচার্জে দরকার < ২" } },
  { tau: TAU_STORM_PEAK, label: { en: "June 10, 2018: 10.8", bn: "১০ জুন ২০১৮: ১০.৮" } },
];
const pctOf = (f: number) => { const pct = f * 100; return pct >= 10 ? pct.toFixed(0) : pct >= 0.1 ? pct.toFixed(1) : pct.toFixed(4); };

/** A science label: OBSERVED (NASA record) or SIMULATED (this game's model). */
function Tag({ kind, lang }: { kind: "observed" | "simulated"; lang: Lang }) {
  const t = kind === "observed" ? { en: "OBSERVED · NASA record", bn: "পর্যবেক্ষণ · NASA রেকর্ড" } : { en: "SIMULATED · teaching model", bn: "সিমুলেশন · শিক্ষণ মডেল" };
  return <span className={`ll-tag ll-tag--${kind}`}>{t[lang]}</span>;
}

/**
 * Chapter 03 storm lab: HYPOTHESIZE (commit a prediction) → EXPERIMENT (τ slider,
 * live sky) → VERIFY (prediction vs model vs NASA record) → EXPLAIN (answer).
 */
function PowerPuzzle({ p, lang, submit }: { p: Extract<Puzzle, { kind: "power" }>; lang: Lang; submit: Submit }) {
  const [prediction, setPrediction] = useState<PowerPrediction | null>(null);
  const [dust, setDust] = useState(0);
  const [explored, setExplored] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [state, setState] = useState<"idle" | "wrong" | "right">("idle");
  const [wrongHint, setWrongHint] = useState<number | null>(null);
  const bn = lang === "bn";
  const tau = TAU_MIN + dust * (TAU_MAX - TAU_MIN);
  const pctText = pctOf(directBeam(tau));
  const ran = explored >= 0.8;
  const verdict = prediction ? comparePrediction(prediction) : null;
  // Mirror the slider in the 3D sky behind the dialog; release on close.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("ll-storm-preview", { detail: Math.min(1, (tau - TAU_MIN) / 6) }));
  }, [tau]);
  useEffect(() => () => { window.dispatchEvent(new CustomEvent("ll-storm-preview", { detail: null })); }, []);
  const at = (t: number) => `${((t - TAU_MIN) / (TAU_MAX - TAU_MIN)) * 100}%`;
  const outcomeLabel = (id: PowerPrediction) => p.prediction.options.find((o) => o.id === id)!.label[lang];
  return (
    <>
      <fieldset className="ll-quiz ll-lab-step">
        <legend><span className="ll-step">1 · {bn ? "অনুমান" : "Hypothesize"}</span> {p.prediction.question[lang]}</legend>
        <div role="radiogroup" aria-label={bn ? "তোমার অনুমান" : "Your prediction"} className="ll-choices">
          {p.prediction.options.map((o) => (
            <button key={o.id} type="button" role="radio" aria-checked={prediction === o.id} disabled={ran} data-autofocus={o === p.prediction.options[0] || undefined}
              className={`ll-choice ${prediction === o.id ? "is-selected" : ""}`} onClick={() => setPrediction(o.id)}>{o.label[lang]}</button>
          ))}
        </div>
        {ran && <p className="ll-muted text-xs">{bn ? "পরীক্ষা চালানোর পর অনুমান বদলানো যায় না।" : "Your prediction is locked once the experiment has run."}</p>}
      </fieldset>

      <div className="ll-power ll-lab-step" aria-disabled={!prediction}>
        <p className="ll-step">2 · {bn ? "পরীক্ষা" : "Experiment"}{!prediction && <small className="ll-muted"> — {bn ? "আগে একটি অনুমান বেছে নাও" : "choose a prediction first"}</small>}</p>
        <div className="ll-power__sky" style={{ "--dust": Math.min(1, (tau - TAU_MIN) / 6) } as React.CSSProperties} aria-hidden>
          <span className="ll-power__sun" />
          <span className="ll-power__panel" />
        </div>
        <label className="ll-range">
          <span>{bn ? "বায়ুমণ্ডলের অস্বচ্ছতা (τ, টাউ)" : "Atmospheric opacity (τ, “tau”)"}: <strong>{tau.toFixed(1)}</strong></span>
          <input type="range" min={0} max={1000} value={Math.round(dust * 1000)} disabled={!prediction}
            aria-valuetext={`tau ${tau.toFixed(1)}`}
            onChange={(e) => { const v = Number(e.target.value) / 1000; setDust(v); setExplored((x) => Math.max(x, v)); }} />
          <span className="ll-tau-marks" aria-hidden>
            {TAU_MARKS.map((m, i) => <span key={m.tau} className={i === 1 ? "is-low" : ""} style={{ left: at(m.tau) }}>{m.label[lang]}</span>)}
          </span>
        </label>
        <div className="ll-gauge" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number(pctText)} aria-label={bn ? "সরাসরি সূর্যালোক (সরল মডেল)" : "Direct sunlight reaching the panels (simplified model)"}>
          <span style={{ width: `${Number(pctText)}%` }} />
        </div>
        <p className="text-sm"><Tag kind="simulated" lang={lang} /> {bn ? "সরাসরি সূর্যালোক" : "Direct sunlight"}: <strong>{pctText}%</strong> <span className="ll-muted">= e<sup>−τ</sup></span></p>
        <p className="ll-muted text-xs">
          {bn
            ? "সরল পদার্থবিজ্ঞান মডেল (মাথার ওপর সূর্য, শুধু সরাসরি আলো); ধুলা কিছু আলো ছড়িয়ে দেয়, তাই প্যানেল পুরো অন্ধকার হয় না। τ-এর চিহ্নিত মানগুলো NASA/JPL-এর প্রকাশিত অনুমান (পর্যবেক্ষণ); শক্তির শতাংশ এই মডেলের হিসাব (সিমুলেশন), রোভারের টেলিমেট্রি নয়।"
            : "Simplified physics (sun overhead, direct beam only); dust also scatters some light, so panels are never fully dark. The marked τ values are NASA/JPL published estimates (OBSERVED); the sunlight percentage is this model's output (SIMULATED), not rover telemetry."}{" "}
          <a href={TAU_SOURCE} target="_blank" rel="noreferrer" className="underline">NASA/JPL</a>
        </p>
      </div>

      {ran && verdict && (
        <section className="ll-lab-step ll-compare" aria-label={bn ? "যাচাই" : "Verify"} data-testid="storm-compare">
          <p className="ll-step">3 · {bn ? "যাচাই" : "Verify"}</p>
          <ul>
            <li><span className="ll-tag">{bn ? "তোমার অনুমান" : "Your prediction"}</span> {outcomeLabel(prediction!)}</li>
            <li>
              <Tag kind="simulated" lang={lang} />{" "}
              {bn
                ? `τ ০.৫ থেকে ১০.৮ হলে সরাসরি আলো আগের মাত্র ${pctOf(verdict.ratio)}% থাকে — ${outcomeLabel(verdict.outcome)}।`
                : `From τ 0.5 to 10.8 the direct beam falls to ${pctOf(verdict.ratio)}% of its usual value — ${outcomeLabel(verdict.outcome).toLowerCase()}.`}
            </li>
            <li>
              <Tag kind="observed" lang={lang} />{" "}
              {bn
                ? "JPL-এর অনুমানে ১০ জুন ২০১৮ τ ছিল প্রায় ১০.৮; সেদিনই অপরচুনিটির সঙ্গে শেষ যোগাযোগ হয়। JPL হিসাব করেছিল, ব্যাটারি রিচার্জের জন্য τ ২-এর নিচে নামা দরকার।"
                : "JPL estimated τ ≈ 10.8 on June 10, 2018, the date of the last contact with Opportunity. JPL estimated the rover needed τ below 2 to recharge its batteries."}{" "}
              <a href={TAU_SOURCE} target="_blank" rel="noreferrer" className="underline">NASA/JPL</a>
            </li>
          </ul>
          <p role="status" className={`ll-feedback ${verdict.matches ? "is-right" : "is-info"}`}>
            {verdict.matches
              ? (bn ? "তোমার অনুমান মডেলের সঙ্গে মিলেছে।" : "Your prediction matches the model.")
              : (bn ? "মডেল তোমার অনুমানের সঙ্গে মেলেনি — বিজ্ঞানীরাও এভাবেই শেখেন। গেজে কী দেখলে, তা থেকে ব্যাখ্যা করো।" : "The model disagrees with your prediction. That is how scientists learn too: explain using what the gauge showed.")}
          </p>
        </section>
      )}

      <fieldset className="ll-quiz ll-lab-step" disabled={!ran}>
        <legend><span className="ll-step">4 · {bn ? "ব্যাখ্যা" : "Explain"}</span> {p.question[lang]}{!ran && <small> — {bn ? "আগে স্লাইডারটি ২০১৮-র ঝড়ের মাত্রা পর্যন্ত টেনে দেখো" : "first drag τ up to the 2018 storm level"}</small>}</legend>
        {p.options.map((o, i) => (
          <button key={i} type="button" role="radio" aria-checked={choice === i} className={`ll-choice ll-choice--block ${choice === i ? "is-selected" : ""}`} onClick={() => { setChoice(i); setState("idle"); setWrongHint(null); }}>{o[lang]}</button>
        ))}
      </fieldset>
      <Feedback state={state} lang={lang} />
      {state === "wrong" && wrongHint !== null && p.hints[wrongHint] && <p className="ll-hint text-sm" data-testid="storm-hint"><strong>EKO:</strong> {p.hints[wrongHint]![lang]}</p>}
      <div className="ll-actions">
        <button type="button" className="ll-btn ll-btn--primary" disabled={choice === null || !ran}
          onClick={() => { const ok = submit(checkPower(p, choice ?? -1, explored)); setState(ok ? "right" : "wrong"); setWrongHint(ok ? null : choice); }}>{S.check[lang]}</button>
      </div>
    </>
  );
}

function OrderPuzzle({ p, lang, submit }: { p: Extract<Puzzle, { kind: "order" }>; lang: Lang; submit: Submit }) {
  const [order, setOrder] = useState(() => shuffledOrder(p.events.map((e) => e.id)));
  const [state, setState] = useState<"idle" | "wrong" | "right">("idle");
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next); setState("idle");
  };
  return (
    <>
      <ol className="ll-order">
        {order.map((id, i) => {
          const e = p.events.find((x) => x.id === id)!;
          return (
            <li key={id} data-event={id}>
              <span className="font-mono text-signal">{i + 1}</span>
              <span><strong>{e.label[lang]}</strong><small>{e.when[lang]}</small></span>
              <span className="ll-order__btns">
                <button type="button" className="ll-btn ll-btn--small" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`${lang === "bn" ? "উপরে সরাও" : "Move up"}: ${e.label[lang]}`}>↑</button>
                <button type="button" className="ll-btn ll-btn--small" disabled={i === order.length - 1} onClick={() => move(i, 1)} aria-label={`${lang === "bn" ? "নিচে সরাও" : "Move down"}: ${e.label[lang]}`}>↓</button>
              </span>
            </li>
          );
        })}
      </ol>
      <Feedback state={state} lang={lang} />
      <div className="ll-actions">
        <button type="button" className="ll-btn ll-btn--primary" onClick={() => setState(submit(checkOrder(p, order)) ? "right" : "wrong")}>{S.check[lang]}</button>
      </div>
    </>
  );
}

function QuizPuzzle({ p, lang, submit }: { p: Extract<Puzzle, { kind: "quiz" }>; lang: Lang; submit: Submit }) {
  const [answers, setAnswers] = useState<number[]>([]);
  const [state, setState] = useState<"idle" | "wrong" | "right">("idle");
  return (
    <>
      <ol className="ll-match">
        {p.questions.map((q, qi) => (
          <li key={qi}>
            <p><span className="font-mono text-signal">0{qi + 1}</span> {q.prompt[lang]} <small className="ll-muted">({EVIDENCE_BY_ID.get(q.evidence)?.title[lang]})</small></p>
            <div role="radiogroup" aria-label={q.prompt[lang]} className="ll-choices">
              {q.options.map((o, oi) => (
                <button key={oi} type="button" role="radio" aria-checked={answers[qi] === oi} className={`ll-choice ${answers[qi] === oi ? "is-selected" : ""}`}
                  onClick={() => { const next = [...answers]; next[qi] = oi; setAnswers(next); setState("idle"); }}>{o[lang]}</button>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <Feedback state={state} lang={lang} />
      <div className="ll-actions">
        <button type="button" className="ll-btn ll-btn--primary" disabled={p.questions.some((_, i) => answers[i] === undefined)} onClick={() => setState(submit(checkQuiz(p, answers)) ? "right" : "wrong")}>{S.check[lang]}</button>
      </div>
    </>
  );
}

export function PuzzleDialog({ session, lang, onClose, onSolved }: { session: GameSession; lang: Lang; onClose: () => void; onSolved: () => void }) {
  const objective = session.puzzle ? OBJECTIVE_BY_ID.get(session.puzzle) : null;
  const puzzle = useMemo(() => (objective?.puzzle ? PUZZLE_BY_ID.get(objective.puzzle) : null), [objective]);
  if (!objective || !puzzle) return null;
  const submit: Submit = (correct) => {
    const ok = session.answerPuzzle(correct);
    if (ok) window.setTimeout(onSolved, 0);
    return ok;
  };
  return (
    <Modal label={puzzle.title[lang]} onClose={onClose} wide>
      <header className="ll-panel__head">
        <div>
          <p className="ll-kicker ll-kicker--signal">{lang === "bn" ? "ধাঁধা" : "Puzzle"}</p>
          <h2>{puzzle.title[lang]}</h2>
        </div>
        <button type="button" className="ll-btn" onClick={onClose}>{S.close[lang]} <kbd>Esc</kbd></button>
      </header>
      <p className="ll-intro">{puzzle.intro[lang]}</p>
      {puzzle.kind === "match" && <MatchPuzzle p={puzzle} lang={lang} submit={submit} />}
      {puzzle.kind === "power" && <PowerPuzzle p={puzzle} lang={lang} submit={submit} />}
      {puzzle.kind === "order" && <OrderPuzzle p={puzzle} lang={lang} submit={submit} />}
      {puzzle.kind === "quiz" && <QuizPuzzle p={puzzle} lang={lang} submit={submit} />}
    </Modal>
  );
}
