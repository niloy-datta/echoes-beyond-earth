"use client";

import { useMemo, useState } from "react";
import { OBJECTIVE_BY_ID } from "../content/chapters";
import { EVIDENCE_BY_ID } from "../content/evidence";
import { PUZZLE_BY_ID, checkMatch, checkOrder, checkPower, checkQuiz, illustrativeLight, shuffledOrder, type Puzzle } from "../content/puzzles";
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
