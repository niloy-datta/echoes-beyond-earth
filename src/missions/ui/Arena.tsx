"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildArena, type ArenaQuestion } from "../content/arena";
import { localizeDigits } from "../core/geo";
import { seedFrom } from "../core/rng";
import { todayKey, useCatalog, useProgress } from "./data";
import { Bar, BhuluAvatar, ErrorBox, ExtLink, Loading } from "./parts";
import { useM } from "./strings";

const COUNT = 10;
const SECONDS = 20;
type Phase = "menu" | "run" | "done";

export function Arena() {
  const { m, l, lang } = useM();
  const cat = useCatalog();
  const pr = useProgress();
  const params = useSearchParams();
  const [phase, setPhase] = useState<Phase>("menu");
  const [daily, setDaily] = useState(params.get("mode") === "daily");
  const [timed, setTimed] = useState(true);
  const [qs, setQs] = useState<ArenaQuestion[]>([]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | "timeout" | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [fifty, setFifty] = useState<number[] | null>(null);
  const [fiftyUsed, setFiftyUsed] = useState(false);
  const [left, setLeft] = useState(SECONDS);
  const [newBest, setNewBest] = useState(false);
  const [copied, setCopied] = useState(false);
  const prevBest = useRef(0);
  const startedAt = useRef(0);
  const num = (n: number | string) => localizeDigits(String(n), lang);

  const start = () => {
    if (cat.status !== "ready") return;
    const seed = daily ? seedFrom(`daily:${todayKey()}`) : Math.floor(Math.random() * 2 ** 31);
    setQs(buildArena(cat.catalog, seed, COUNT));
    setI(0); setPicked(null); setScore(0); setStreak(0); setBestStreak(0); setCorrect(0); setFifty(null); setFiftyUsed(false);
    setNewBest(false); setCopied(false); setLeft(SECONDS);
    prevBest.current = daily ? pr.progress.arena.daily[todayKey()] ?? 0 : pr.progress.arena.best;
    startedAt.current = performance.now();
    setPhase("run");
  };

  const q = qs[i];
  const answer = (choice: number | "timeout") => {
    if (picked !== null || !q) return;
    setPicked(choice);
    if (choice === q.answer) {
      const speed = timed ? Math.round((50 * left) / SECONDS) : 0;
      const nextStreak = streak + 1;
      const bonus = Math.min(50, (nextStreak - 1) * 10);
      setScore((s) => s + 100 + speed + bonus);
      setStreak(nextStreak);
      setBestStreak((b) => Math.max(b, nextStreak));
      setCorrect((c) => c + 1);
    } else setStreak(0);
  };

  // countdown
  useEffect(() => {
    if (phase !== "run" || !timed || picked !== null) return;
    startedAt.current = performance.now();
    setLeft(SECONDS);
    const id = window.setInterval(() => {
      const rest = SECONDS - (performance.now() - startedAt.current) / 1000;
      if (rest <= 0) { window.clearInterval(id); setLeft(0); answer("timeout"); } else setLeft(rest);
    }, 100);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, i, timed, picked === null]);

  const next = () => {
    if (i + 1 >= qs.length) {
      pr.arena(score, bestStreak, daily ? todayKey() : undefined);
      setNewBest(score > prevBest.current);
      setPhase("done");
    } else { setI(i + 1); setPicked(null); setFifty(null); }
  };

  const useFifty = () => {
    if (!q || fiftyUsed || picked !== null) return;
    const wrong = q.options.map((_, k) => k).filter((k) => k !== q.answer);
    const keep = wrong[Math.floor(Math.random() * wrong.length)];
    setFifty(q.options.map((_, k) => k).filter((k) => k !== q.answer && k !== keep));
    setFiftyUsed(true);
  };

  const shareText = useMemo(() => m("arena.shareText", { score: num(score), n: num(correct), total: num(COUNT), streak: num(bestStreak) }), [score, correct, bestStreak, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const copy = async () => {
    try { await navigator.clipboard.writeText(shareText); setCopied(true); } catch { /* clipboard unavailable */ }
  };

  if (cat.status === "loading" || !pr.hydrated) return <Loading label={m("common.loading")} />;
  if (cat.status === "error") return <ErrorBox message={cat.error} onRetry={cat.retry} />;

  return (
    <div className="container-x pb-24 pt-[calc(var(--header-h)+1.5rem)]">
      <Link href="/missions/" prefetch={false} className="btn-ghost mb-6">← {m("arena.hub")}</Link>

      {phase === "menu" && (
        <div className="mx-auto max-w-2xl text-center">
          <BhuluAvatar mood="talk" size={110} className="mx-auto" />
          <h1 className="display mt-4 text-[clamp(2rem,6vw,3.6rem)]">{m("arena.title")}</h1>
          <p className="mt-4 text-lunar-2">{m("arena.dek")}</p>
          <fieldset className="mt-8 grid gap-3 text-left sm:grid-cols-2">
            <legend className="sr-only">{m("arena.title")}</legend>
            {[false, true].map((d) => (
              <label key={String(d)} className={`cursor-pointer border p-4 ${daily === d ? "border-signal bg-signal/10" : "border-hairline-strong bg-void-2/80"}`}>
                <input type="radio" name="mode" className="sr-only" checked={daily === d} onChange={() => setDaily(d)} />
                <span className="font-medium text-lunar">{m(d ? "arena.mode.daily" : "arena.mode.random")}</span>
                <span className="mt-1 block text-[13px] text-dust">{d ? m("hub.dailyDek") : m("hub.arenaDek")}</span>
              </label>
            ))}
          </fieldset>
          <label className="mt-5 inline-flex cursor-pointer items-center gap-3 text-lunar-2">
            <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} className="h-4 w-4 accent-[#63e6ef]" />
            {m(timed ? "arena.timerOn" : "arena.timerOff")}
          </label>
          <p className="mt-4 font-mono text-[12px] text-dust">{m("arena.best", { n: num(pr.progress.arena.best) })}</p>
          <button type="button" className="btn-signal mt-6" onClick={start}>{m("arena.start")} →</button>
        </div>
      )}

      {phase === "run" && q && (
        <div className="mx-auto max-w-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[12px] text-lunar-2">
            <span>{daily ? m("arena.dailyDate", { date: num(todayKey()) }) : m("arena.title")}</span>
            <span>{m("arena.q", { n: num(i + 1), total: num(COUNT) })}</span>
            <span>{m("arena.score", { n: num(score) })}</span>
            {streak > 1 && <span className="text-caution">{m("arena.streak", { n: num(streak) })}</span>}
          </div>
          <div className="mt-2"><Bar value={timed ? left : SECONDS} max={SECONDS} label={m("arena.timer")} /></div>
          <h1 className="mt-5 text-[clamp(1.25rem,2.6vw,1.75rem)] font-medium leading-snug text-lunar">{l(q.prompt)}</h1>
          <ul className="mt-5 grid gap-3" role="list">
            {q.options.map((o, k) => {
              const hidden = fifty?.includes(k);
              const right = picked !== null && k === q.answer;
              const wrong = picked === k && k !== q.answer;
              return (
                <li key={k} className={hidden ? "invisible" : ""}>
                  <button
                    type="button"
                    disabled={picked !== null || hidden}
                    onClick={() => answer(k)}
                    className={`flex w-full items-center gap-3 border px-4 py-3.5 text-left text-[16px] ${right ? "border-signal bg-signal/15" : wrong ? "border-mars bg-mars/15" : picked !== null ? "border-hairline bg-void-2/40 text-dust" : "border-hairline-strong bg-void-2/80 text-lunar hover:border-signal"}`}
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-current font-mono text-[12px]" aria-hidden>{right ? "✓" : wrong ? "✕" : String.fromCharCode(65 + k)}</span>
                    <span>{l(o)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {picked === null && (
            <button type="button" className="btn-ghost mt-4" disabled={fiftyUsed} onClick={useFifty}>{m("arena.fifty")}</button>
          )}
          {picked !== null && (
            <div className="mt-5 border-l-2 border-signal bg-void-2/80 p-4" role="status">
              <p className="font-medium text-lunar">{picked === "timeout" ? m("arena.timeUp") : picked === q.answer ? m("quiz.correct") : m("quiz.wrong")} {picked !== q.answer && <span className="text-lunar-2">{m("quiz.answerWas", { a: l(q.options[q.answer]) })}</span>}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-lunar-2">{l(q.explain)}</p>
              {q.source && <p className="mt-2 text-[13px]">{m("arena.source")}: <ExtLink href={q.source}>{q.source.replace(/^https?:\/\/(www\.)?/, "")}</ExtLink></p>}
              <button type="button" className="btn-signal mt-4" onClick={next}>{i + 1 >= qs.length ? m("arena.seeResult") : m("arena.next")} →</button>
            </div>
          )}
        </div>
      )}

      {phase === "done" && (
        <div className="mx-auto max-w-xl text-center" aria-live="polite">
          <BhuluAvatar mood={correct >= 6 ? "happy" : "talk"} size={110} className="mx-auto" />
          <p className="label mt-4">{m("arena.result")}</p>
          <p className="display text-[clamp(3rem,10vw,6rem)] text-signal">{num(score)}</p>
          <p className="text-lunar">{m("arena.correctOf", { n: num(correct), total: num(COUNT) })} · {m("arena.streak", { n: num(bestStreak) })}</p>
          {newBest && <p className="mt-2 font-medium text-caution">★ {m("arena.newBest")}</p>}
          <p className="mt-1 font-mono text-[12px] text-dust">{m("arena.best", { n: num(Math.max(score, pr.progress.arena.best)) })}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button type="button" className="btn-signal" onClick={start}>{m("arena.again")}</button>
            <button type="button" className="btn-ghost" onClick={copy}>{copied ? m("arena.copied") : m("arena.share")}</button>
            <Link href="/missions/" prefetch={false} className="btn-ghost">{m("arena.hub")}</Link>
          </div>
        </div>
      )}
    </div>
  );
}
