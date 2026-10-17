"use client";

import { useMemo, useState } from "react";
import { OBJECTIVE_BY_ID } from "../content/chapters";
import { EVIDENCE_BY_ID } from "../content/evidence";
import { PUZZLE_BY_ID, checkMatch, checkOrder, checkPower, checkQuiz, checkCompare, checkConclusion, illustrativeLight, shuffledOrder, type Puzzle } from "../content/puzzles";
import type { GameSession } from "../core/session";
import { assetPath } from "@/lib/asset-path";
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

function PowerPuzzle({ p, lang, submit }: { p: Extract<Puzzle, { kind: "power" }>; lang: Lang; submit: Submit }) {
  const [dust, setDust] = useState(0);
  const [explored, setExplored] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [state, setState] = useState<"idle" | "wrong" | "right">("idle");
  const light = illustrativeLight(dust);
  return (
    <>
      <div className="ll-power">
        <div className="ll-power__sky" style={{ "--dust": dust } as React.CSSProperties} aria-hidden>
          <span className="ll-power__sun" />
          <span className="ll-power__panel" />
        </div>
        <label className="ll-range">
          <span>{lang === "bn" ? "আকাশে ধুলা" : "Dust in the sky"}: {Math.round(dust * 100)}%</span>
          <input type="range" min={0} max={100} value={Math.round(dust * 100)} data-autofocus
            onChange={(e) => { const v = Number(e.target.value) / 100; setDust(v); setExplored((x) => Math.max(x, v)); }} />
        </label>
        <div className="ll-gauge" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(light * 100)} aria-label={lang === "bn" ? "প্যানেলে আলো (উদাহরণমূলক)" : "Light reaching the panels (illustrative)"}>
          <span style={{ width: `${light * 100}%` }} />
        </div>
        <p className="ll-muted text-xs">{lang === "bn" ? "উদাহরণমূলক শিক্ষণ মডেল — আসল রোভার ডেটা নয়।" : "Illustrative teaching model — not real rover data."}</p>
      </div>
      <fieldset className="ll-quiz" disabled={explored < 0.8}>
        <legend>{p.question[lang]}{explored < 0.8 && <small> — {lang === "bn" ? "আগে স্লাইডারটি ঘন ধুলায় টেনে দেখো" : "first drag the slider into a dense storm"}</small>}</legend>
        {p.options.map((o, i) => (
          <button key={i} type="button" role="radio" aria-checked={choice === i} className={`ll-choice ll-choice--block ${choice === i ? "is-selected" : ""}`} onClick={() => { setChoice(i); setState("idle"); }}>{o[lang]}</button>
        ))}
      </fieldset>
      <Feedback state={state} lang={lang} />
      <div className="ll-actions">
        <button type="button" className="ll-btn ll-btn--primary" disabled={choice === null || explored < 0.8} onClick={() => setState(submit(checkPower(p, choice ?? -1, explored)) ? "right" : "wrong")}>{S.check[lang]}</button>
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

function ComparePuzzle({ p, lang, submit }: { p: Extract<Puzzle, { kind: "compare" }>; lang: Lang; submit: Submit }) {
  const [slider, setSlider] = useState(50);
  const [explored, setExplored] = useState(false);
  const [choice, setChoice] = useState<number | null>(null);
  const [state, setState] = useState<"idle" | "wrong" | "right">("idle");

  const onSliderChange = (val: number) => {
    setSlider(val);
    if (val <= 20 || val >= 80) setExplored(true);
  };

  return (
    <>
      <div className="ll-compare-viewer">
        <div className="ll-compare-container">
          <div className="ll-compare-layer ll-compare-layer--after">
            <img src={assetPath(p.after.image)} alt={p.after.title[lang]} />
            <div className="ll-compare-badge ll-compare-badge--right">
              <strong>{p.after.title[lang]}</strong>
              <small>{p.after.sol} · Tau: {p.after.tau}</small>
            </div>
          </div>
          <div className="ll-compare-layer ll-compare-layer--before" style={{ clipPath: `inset(0 ${100 - slider}% 0 0)` }}>
            <img src={assetPath(p.before.image)} alt={p.before.title[lang]} />
            <div className="ll-compare-badge ll-compare-badge--left">
              <strong>{p.before.title[lang]}</strong>
              <small>{p.before.sol} · Tau: {p.before.tau}</small>
            </div>
          </div>
          <div className="ll-compare-divider" style={{ left: `${slider}%` }}>
            <span className="ll-compare-handle">↔</span>
          </div>
        </div>

        <label className="ll-range">
          <span>{S.sliderInstruction[lang]}: {slider}%</span>
          <input
            type="range"
            min={0}
            max={100}
            value={slider}
            data-autofocus
            onChange={(e) => onSliderChange(Number(e.target.value))}
          />
        </label>
        <p className="ll-muted text-xs">
          {lang === "bn"
            ? "NASA JPL Photojournal PIA22909 (Legacy Pan) ও PIA22929 (সল ৫১১১ শেষ বার্তা) থেকে সংকলিত।"
            : "Compiled from NASA JPL Photojournal PIA22909 (Legacy Pan) and PIA22929 (Sol 5111 Last Message)."}
        </p>
      </div>

      <fieldset className="ll-quiz" disabled={!explored}>
        <legend>
          {p.question[lang]}
          {!explored && (
            <small> — {lang === "bn" ? "প্রথমে স্লাইডার টেনে দুই ফ্রেম তুলনা করে দেখো" : "first drag the slider to compare both frames"}</small>
          )}
        </legend>
        {p.options.map((o, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={choice === i}
            className={`ll-choice ll-choice--block ${choice === i ? "is-selected" : ""}`}
            onClick={() => { setChoice(i); setState("idle"); }}
          >
            {o[lang]}
          </button>
        ))}
      </fieldset>
      <Feedback state={state} lang={lang} />
      {state === "right" && (
        <p className="ll-explanation text-xs text-signal">
          ✓ {p.explanation[lang]}
        </p>
      )}
      <div className="ll-actions">
        <button
          type="button"
          className="ll-btn ll-btn--primary"
          disabled={choice === null || !explored}
          onClick={() => {
            const ok = submit(checkCompare(p, choice ?? -1, explored));
            setState(ok ? "right" : "wrong");
          }}
        >
          {S.check[lang]}
        </button>
      </div>
    </>
  );
}

function ConclusionPuzzle({ p, lang, submit }: { p: Extract<Puzzle, { kind: "conclusion" }>; lang: Lang; submit: Submit }) {
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([]);
  const [chosenHypothesis, setChosenHypothesis] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "wrong" | "right">("idle");
  const [showSynthesis, setShowSynthesis] = useState(false);

  const toggleEvidence = (id: string) => {
    setSelectedEvidence((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setState("idle");
  };

  const hasAllEvidence = p.requiredEvidence.every((e) => selectedEvidence.includes(e));

  const onSubmit = () => {
    if (!chosenHypothesis) return;
    const ok = checkConclusion(p, selectedEvidence, chosenHypothesis);
    const accepted = submit(ok);
    if (accepted) {
      setState("right");
      setShowSynthesis(true);
    } else {
      setState("wrong");
    }
  };

  const candidateEvidence = ["solar", "storm", "last-image", "wheels", "traverse"];

  return (
    <div className="ll-conclusion-puzzle">
      <section className="ll-conclusion-step">
        <h3 className="text-sm font-bold uppercase tracking-wider text-signal">
          {lang === "bn" ? "ধাপ ১: প্রাসঙ্গিক NASA প্রমাণ নিশ্চিত করো" : "Step 1: Select Supporting NASA Evidence"}
        </h3>
        <p className="ll-muted text-xs">
          {lang === "bn"
            ? "অপরচুনিটির শক্তি ও ঝড়ের পরিণতি বিশ্লেষণে কোন প্রমাণগুলো প্রাসঙ্গিক? (কমপক্ষে ৩টি নির্বাচন করো)"
            : "Which mission records directly address Opportunity's power loss and the storm? (Select at least 3)"}
        </p>
        <div className="ll-evidence-selector-grid">
          {candidateEvidence.map((id) => {
            const ev = EVIDENCE_BY_ID.get(id);
            if (!ev) return null;
            const checked = selectedEvidence.includes(id);
            return (
              <button
                key={id}
                type="button"
                className={`ll-evidence-chip ${checked ? "is-selected" : ""}`}
                onClick={() => toggleEvidence(id)}
              >
                <span>{checked ? "✓" : "○"}</span>
                <span>{ev.title[lang]}</span>
                <small className="ll-muted font-mono">{ev.piaId ?? ev.id}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="ll-conclusion-step">
        <h3 className="text-sm font-bold uppercase tracking-wider text-signal">
          {lang === "bn" ? "ধাপ ২: বৈজ্ঞানিক অনুসিদ্ধান্ত মূল্যায়ন" : "Step 2: Evaluate Scientific Hypotheses"}
        </h3>
        <p className="ll-muted text-xs">
          {lang === "bn"
            ? "সংগৃহীত প্রমাণের আলোকে কোন অনুসিদ্ধান্তটি সত্য প্রমাণিত হয়?"
            : "Based on empirical evidence, which hypothesis is supported by NASA mission data?"}
        </p>
        <div role="radiogroup" className="ll-hypotheses-list">
          {p.hypotheses.map((h) => {
            const isSelected = chosenHypothesis === h.id;
            return (
              <div
                key={h.id}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                className={`ll-hypothesis-card ${isSelected ? "is-selected" : ""}`}
                onClick={() => { setChosenHypothesis(h.id); setState("idle"); }}
                onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { setChosenHypothesis(h.id); setState("idle"); } }}
              >
                <div className="ll-hypothesis-header">
                  <span className="ll-radio-dot">{isSelected ? "●" : "○"}</span>
                  <strong>{h.claim[lang]}</strong>
                </div>
                <p className="ll-hypothesis-reason text-xs ll-muted">
                  {lang === "bn" ? "প্রমাণ পরীক্ষা" : "Tested against"}: {EVIDENCE_BY_ID.get(h.testedEvidence)?.title[lang]} — {h.reason[lang]}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <Feedback state={state} lang={lang} />

      {showSynthesis && (
        <article className="ll-synthesis-card">
          <h4>✦ {p.synthesis.title[lang]}</h4>
          <p>{p.synthesis.takeaway[lang]}</p>
        </article>
      )}

      <div className="ll-actions">
        <button
          type="button"
          className="ll-btn ll-btn--primary"
          disabled={!hasAllEvidence || !chosenHypothesis}
          onClick={onSubmit}
        >
          {S.check[lang]}
        </button>
      </div>
    </div>
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
      {puzzle.kind === "compare" && <ComparePuzzle p={puzzle} lang={lang} submit={submit} />}
      {puzzle.kind === "conclusion" && <ConclusionPuzzle p={puzzle} lang={lang} submit={submit} />}
    </Modal>
  );
}
