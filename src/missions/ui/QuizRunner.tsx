"use client";
import { useMemo, useState } from "react";
import type { Question } from "../core/types";
import { localizeDigits } from "../core/geo";
import { mulberry32, seedFrom, shuffle } from "../core/rng";
import { Bar } from "./parts";
import { useM } from "./strings";

/** Three-question chapter quiz. Options are shuffled with a seed so tests and replays are stable per attempt. */
export function QuizRunner({ questions, seed, onFinish }: { questions: Question[]; seed: string; onFinish: (correct: number) => void }) {
  const { m, l, lang } = useM();
  const order = useMemo(() => {
    const rand = mulberry32(seedFrom(seed));
    return questions.map((q) => {
      const idx = shuffle(q.options.map((_, i) => i), rand);
      return { q, idx };
    });
  }, [questions, seed]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const cur = order[i];
  const correctPos = cur.idx.indexOf(cur.q.answer);
  const pick = (pos: number) => {
    if (picked !== null) return;
    setPicked(pos);
    if (pos === correctPos) setScore((s) => s + 1);
  };
  const next = () => {
    if (i + 1 >= order.length) onFinish(score);
    else { setI(i + 1); setPicked(null); }
  };
  const num = (n: number) => localizeDigits(String(n), lang);

  return (
    <div className="mx-auto max-w-2xl">
      <p className="label mb-2">{m("quiz.q", { n: num(i + 1), total: num(order.length) })}</p>
      <Bar value={i + (picked !== null ? 1 : 0)} max={order.length} label={m("quiz.title")} />
      <h2 className="mt-5 text-[clamp(1.25rem,2.6vw,1.75rem)] font-medium leading-snug text-lunar">{l(cur.q.prompt)}</h2>
      <ul className="mt-5 grid gap-3" role="list">
        {cur.idx.map((optIndex, pos) => {
          const isCorrect = pos === correctPos;
          const state = picked === null ? "idle" : isCorrect ? "right" : pos === picked ? "wrong" : "dim";
          return (
            <li key={optIndex}>
              <button
                type="button"
                onClick={() => pick(pos)}
                disabled={picked !== null}
                aria-pressed={picked === pos}
                className={`flex w-full items-center gap-3 border px-4 py-3.5 text-left text-[16px] transition-colors ${
                  state === "idle" ? "border-hairline-strong bg-void-2/80 text-lunar hover:border-signal hover:bg-void-3"
                  : state === "right" ? "border-signal bg-signal/15 text-lunar"
                  : state === "wrong" ? "border-mars bg-mars/15 text-lunar"
                  : "border-hairline bg-void-2/40 text-dust"
                }`}
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-current font-mono text-[12px]" aria-hidden>
                  {state === "right" ? "✓" : state === "wrong" ? "✕" : String.fromCharCode(65 + pos)}
                </span>
                <span>{l(cur.q.options[optIndex])}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {picked !== null && (
        <div className="mt-5 border-l-2 border-signal bg-void-2/80 p-4" role="status">
          <p className="font-medium text-lunar">{picked === correctPos ? m("quiz.correct") : m("quiz.wrong")} <span className="text-lunar-2">{picked !== correctPos && m("quiz.answerWas", { a: l(cur.q.options[cur.q.answer]) })}</span></p>
          <p className="mt-2 text-[15px] leading-relaxed text-lunar-2">{l(cur.q.explain)}</p>
          <button type="button" className="btn-signal mt-4" onClick={next}>{i + 1 >= order.length ? m("quiz.finish") : m("quiz.next")} →</button>
        </div>
      )}
    </div>
  );
}
