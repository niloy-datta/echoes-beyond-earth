"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EKO_INTRO, EKO_STOPS, type EkoStopId } from "@/lib/eko-mission";
import { useT } from "@/lib/i18n";
import { usePassport } from "@/lib/passport";
import { useSettings } from "@/lib/settings";
import { readStore, writeStore } from "@/lib/storage";
import { EkoScene } from "./EkoScene";
import { CinematicStory } from "./CinematicStory";
import { Eko2DMap } from "./Eko2DMap";
import { EkoAuthenticRover } from "./EkoAuthenticRover";
import { EkoOfflineSupport } from "./EkoOfflineSupport";
import { EkoCertificate, EkoEvidenceGallery, EkoMissionTimeline, EkoVoiceButton } from "./EkoLearningTools";
import { EKO_START, moveEko, nearestEkoStop, sanitizeEkoProgress, type EkoDirection, type EkoPosition } from "@/lib/eko-logic";


export function EkoGame() {
  const { lang } = useT();
  const { reducedMotion } = useSettings();
  const { mark } = usePassport();
  const copy = EKO_INTRO[lang];
  const [mode, setMode] = useState<"scene" | "story">("scene");
  const [player, setPlayer] = useState<EkoPosition>({ ...EKO_START });
  const [scanned, setScanned] = useState<EkoStopId[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [activeId, setActiveId] = useState<EkoStopId | null>(null);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [started, setStarted] = useState(false);
  const dialogReturnFocus = useRef<HTMLElement | null>(null);
  const sceneFocusRef = useRef<HTMLDivElement | null>(null);
  const onUnsupported = useCallback(() => setMode("story"), []);

  useEffect(() => {
    const previous = readStore<EkoStopId[]>("eko-opportunity", []);
    setScanned(sanitizeEkoProgress(previous, EKO_STOPS.map((stop) => stop.id)));
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated) writeStore("eko-opportunity", scanned);
    if (hydrated && scanned.length === EKO_STOPS.length) mark("discovered", "opportunity");
  }, [scanned, hydrated, mark]);

  const move = useCallback((direction: EkoDirection) => {
    setPlayer((p) => moveEko(p, direction));
  }, []);

  const nearest = useMemo(() => nearestEkoStop(player, EKO_STOPS), [player]);

  const activate = useCallback((id: EkoStopId) => {
    dialogReturnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setActiveId(id);
    setResult(null);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (activeId || !started || mode === "story" || event.ctrlKey || event.metaKey || event.altKey) return;
      // Move only when the game region has keyboard focus.
      // Arrow keys must scroll the rest of the museum normally.
      if (document.activeElement !== sceneFocusRef.current) return;
      const key = event.key.toLowerCase();
      const direction: Record<string, EkoDirection> = {
        w: "forward", arrowup: "forward", s: "back", arrowdown: "back",
        a: "left", arrowleft: "left", d: "right", arrowright: "right",
      };
      if (direction[key]) { event.preventDefault(); move(direction[key]); }
      if (key === "e" && nearest) { event.preventDefault(); activate(nearest.id); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, nearest, activate, activeId, started, mode]);

  useEffect(() => {
    if (!activeId) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleModalKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setActiveId(null); return; }
      if (event.key !== "Tab") return;
      const dialog = document.getElementById("eko-evidence-dialog");
      if (!dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
      const first = items[0], last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleModalKeys);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handleModalKeys);
      dialogReturnFocus.current?.focus();
    };
  }, [activeId]);

  const active = activeId ? EKO_STOPS.find((stop) => stop.id === activeId) : null;
  const completed = scanned.length === EKO_STOPS.length;
  const answer = (index: number) => {
    if (!active) return;
    if (index !== active.correct) { setResult("wrong"); return; }
    setResult("correct");
    setScanned((old) => old.includes(active.id) ? old : [...old, active.id]);
  };
  const txt = (en: string, bn: string) => lang === "bn" ? bn : en;

  return (
    <div data-eko-ready={hydrated ? "true" : "false"} className="relative isolate min-h-screen overflow-hidden pt-[calc(var(--header-h)+2rem)]">
      <CinematicStory onOpenField={() => document.getElementById("eko-field")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" })} />
      <div className="pointer-events-none absolute -top-28 right-0 h-[40rem] w-[40rem] rounded-full bg-[#c8754f]/[0.06] blur-3xl" />
      <div className="container-x relative pb-24">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link prefetch={false} href="/explore/" className="btn-ghost">← {txt("Back to museum", "মিউজিয়ামে ফিরে যাও")}</Link>
          <span className="label text-signal">{copy.eyebrow}</span>
        </div>
        <Link prefetch={false} href="/play/game/" className="mb-10 flex flex-wrap items-center justify-between gap-4 border border-signal/50 bg-signal/[0.06] p-5 transition-colors hover:bg-signal/[0.12]">
          <span>
            <span className="label text-signal">{txt("NEW · THIRD-PERSON GAME", "নতুন · থার্ড-পারসন খেলা")}</span>
            <span className="mt-2 block font-serif text-3xl italic">{txt("The Last Light", "শেষ আলো")}</span>
            <span className="mt-1 block text-sm text-lunar-2">{txt("Five chapters with EKO — explore, scan, solve, and recover Opportunity's NASA record.", "ইকোর সঙ্গে পাঁচ অধ্যায় — ঘুরে দেখো, স্ক্যান করো, সমাধান করো, অপরচুনিটির NASA রেকর্ড উদ্ধার করো।")}</span>
          </span>
          <span className="btn-signal">{txt("Play", "খেলো")} →</span>
        </Link>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(330px,0.75fr)] lg:items-start">
          <section id="eko-field" aria-labelledby="eko-title" className="min-w-0 scroll-mt-24">
            <h1 id="eko-title" className="display max-w-4xl text-[clamp(2.8rem,6vw,6rem)]">{copy.title}</h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-lunar-2">{copy.description}</p>

            <div className="mt-8 overflow-hidden border border-hairline-strong bg-[#160d0a]">
              <div
                ref={sceneFocusRef}
                tabIndex={0}
                role="group"
                aria-label={mode === "scene"
                  ? txt("Interactive Mars scene. Use arrow keys or WASD to move EKO; press E near a beacon to scan.", "মঙ্গলের গেম। অ্যারো বা WASD দিয়ে ইকোকে চালাও, বিকনের কাছে E চাপলে স্ক্যান হবে।")
                  : txt("Accessible 2D evidence map. Open any station to learn and answer a question.", "সহজ ২ডি মানচিত্র। প্রতিটি প্রমাণ খুলে পড়ো ও প্রশ্নের উত্তর দাও।")}
                onPointerDown={(event) => {
                  if (event.target instanceof HTMLCanvasElement) event.currentTarget.focus();
                }}
                className="relative h-[clamp(320px,55vw,580px)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
              >
                {mode === "scene" ? (
                  <EkoScene
                    player={player}
                    scanned={scanned}
                    reducedMotion={reducedMotion}
                    onUnsupported={onUnsupported}
                  />
                ) : (
                  <Eko2DMap lang={lang} scanned={scanned} onOpen={activate} />
                )}
                {mode === "scene" && (
                  <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap justify-between gap-3">
                    <span className="border border-white/20 bg-black/55 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-lunar">
                      {txt("Illustrative 3D / not actual terrain", "কল্পিত 3D / প্রকৃত ভূপ্রকৃতি নয়")}
                    </span>
                    <span className="border border-white/20 bg-black/55 px-3 py-2 font-mono text-[10px] tracking-wide text-signal">
                      {scanned.length}/4 {txt("memories", "স্মৃতি")}
                    </span>
                  </div>
                )}
                {mode === "scene" && started && nearest && (
                  <button
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 border border-signal bg-void/90 px-5 py-3 font-mono text-xs uppercase tracking-[0.1em] text-signal hover:bg-signal hover:text-void"
                    onClick={() => activate(nearest.id)}
                  >
                    {txt("E / scan", "E / স্ক্যান")} · {nearest.name[lang]}
                  </button>
                )}
                {mode === "scene" && !started && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-void/70 p-7 text-center backdrop-blur-sm">
                    <p className="max-w-lg font-serif text-3xl italic text-lunar">{txt("Some signals end. Their stories do not.", "কিছু সংকেত থামে। গল্প থামে না।")}</p>
                    <button onClick={() => { setStarted(true); sceneFocusRef.current?.focus(); }} className="btn-signal bg-void/80">{copy.start} ↗</button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline bg-void-2 px-4 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  {mode === "scene" && started && (
                    <div className="grid grid-cols-3 gap-1" aria-label={txt("Movement controls", "চলার বোতাম")}>
                      <span />
                      <button type="button" className="btn-ghost !rounded-sm !p-2" onClick={() => move("forward")} aria-label={txt("Move forward", "সামনে যাও")}>↑</button>
                      <span />
                      <button type="button" className="btn-ghost !rounded-sm !p-2" onClick={() => move("left")} aria-label={txt("Move left", "বামে যাও")}>←</button>
                      <button type="button" className="btn-ghost !rounded-sm !p-2" onClick={() => move("back")} aria-label={txt("Move backward", "পেছনে যাও")}>↓</button>
                      <button type="button" className="btn-ghost !rounded-sm !p-2" onClick={() => move("right")} aria-label={txt("Move right", "ডানে যাও")}>→</button>
                    </div>
                  )}
                  <p className="max-w-sm text-xs leading-relaxed text-dust">{mode === "scene" ? copy.controls : copy.fallback}</p>
                </div>
                <button type="button" className="btn-ghost" onClick={() => { setMode((m) => m === "scene" ? "story" : "scene"); setStarted(true); }}>
                  {mode === "scene" ? copy.fallback : txt("Return to 3D", "3D-তে ফিরে যাও")}
                </button>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-dust">{copy.warning}</p>
            <EkoMissionTimeline />
            <EkoEvidenceGallery />
            <EkoAuthenticRover />
            <EkoOfflineSupport />
            <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-hairline pt-6">
              <Link prefetch={false} href="/play/teacher/" className="btn-ghost">
                {txt("Printable teacher worksheet", "প্রিন্ট করার শিক্ষকের ওয়ার্কশিট")} →
              </Link>
              <span className="text-xs text-dust">{txt("4 NASA-based questions · EN / BN", "NASA-এর ৪টি প্রশ্ন · বাংলা / ইংরেজি")}</span>
            </div>

            {completed && (
              <div role="status" className="mt-8 border border-signal/50 bg-signal/[0.07] p-7">
                <p className="label text-signal">✦ 04 / 04</p>
                <h2 className="mt-3 font-serif text-4xl italic">{copy.complete}</h2>
                <p className="mt-4 max-w-2xl text-lunar-2">{copy.completeBody}</p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link prefetch={false} href="/passport/" className="btn-signal">{copy.passport} →</Link>
                  <EkoCertificate scanned={scanned} />
                  <button type="button" className="btn-ghost" onClick={() => {
                    setScanned([]);
                    setPlayer({ ...EKO_START });
                    setStarted(true);
                  }}>
                    {txt("Replay mission (passport stamp stays)", "মিশন আবার খেলো (পাসপোর্ট স্ট্যাম্প থাকবে)")}
                  </button>
                </div>
              </div>
            )}
          </section>

          <aside className="border border-hairline-strong bg-void/90 p-5 md:p-7" aria-labelledby="eko-evidence-title">
            <div className="flex items-center justify-between gap-3">
              <h2 id="eko-evidence-title" className="label text-signal">{txt("Evidence to recover", "উদ্ধারের প্রমাণ")}</h2>
              <span className="font-mono text-xs text-dust">{scanned.length}/04</span>
            </div>
            <div className="mt-4 h-1 bg-hairline">
              <div className="h-full bg-signal transition-[width] duration-300" style={{ width: `${scanned.length * 25}%` }} />
            </div>
            <ol className="mt-7 space-y-3">
              {EKO_STOPS.map((stop) => {
                const found = scanned.includes(stop.id);
                const near = nearest?.id === stop.id;
                return (
                  <li key={stop.id}>
                    <button
                      type="button"
                      onClick={() => { setStarted(true); activate(stop.id); }}
                      className="group w-full border border-hairline p-4 text-left transition-colors hover:border-signal/50 focus-visible:border-signal"
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="font-mono text-sm text-lunar">{stop.name[lang]}</span>
                        <span className={`font-mono text-[10px] uppercase ${found ? "text-signal" : near ? "text-caution" : "text-dust"}`}>
                          {found ? txt("Recovered ✓", "উদ্ধার ✓") : near ? txt("Near", "কাছে") : txt("Explore", "খোঁজো")}
                        </span>
                      </span>
                      <span className="mt-2 block text-xs leading-relaxed text-lunar-2">{stop.lead[lang]}</span>
                      <span className="mt-3 block font-mono text-[10px] uppercase tracking-wider text-signal">
                        {txt("Inspect evidence + quiz", "প্রমাণ ও প্রশ্ন দেখো")} ↗
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="mt-6 text-xs leading-relaxed text-dust">{txt(
              "Beacons are navigation hints only. You may open any story directly for keyboard and screen-reader accessibility.",
              "বিকন শুধু দিকনির্দেশনার জন্য। কিবোর্ড বা স্ক্রিন রিডার দিয়েও যেকোনো গল্প সরাসরি খোলা যায়।"
            )}</p>
            {!completed && (
              <button type="button" className="btn-signal mt-5" onClick={() => {
                setStarted(true);
                const first = EKO_STOPS.find((stop) => !scanned.includes(stop.id));
                if (first) activate(first.id);
              }}>
                {txt("Continue guided story", "ধাপে ধাপে গল্প চালিয়ে যাও")} →
              </button>
            )}
            <button
              className="btn-ghost mt-5"
              type="button"
              onClick={() => { setPlayer({ ...EKO_START }); setStarted(false); setActiveId(null); }}
            >
              {txt("Restart walk", "হাঁটা আবার শুরু")}
            </button>
          </aside>
        </div>
      </div>

      {active && (
        <div role="presentation" className="fixed inset-0 z-[100] flex items-center justify-center bg-void/90 p-4 backdrop-blur-lg">
          <section
            id="eko-evidence-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="eko-modal-title"
            className="max-h-[90svh] w-full max-w-2xl overflow-y-auto border border-hairline-strong bg-void-2 p-6 shadow-2xl md:p-9"
            onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setActiveId(null); } }}
          >
            <div className="flex items-start justify-between gap-4">
              <span className="label text-signal">{txt("NASA evidence", "NASA প্রমাণ")}</span>
              <button type="button" autoFocus className="btn-ghost !px-3 !py-2" onClick={() => setActiveId(null)} aria-label={txt("Close story", "গল্প বন্ধ করো")}>✕</button>
            </div>
            <h2 id="eko-modal-title" className="mt-6 font-serif text-[clamp(2.3rem,6vw,3.5rem)] italic leading-tight">{active.name[lang]}</h2>
            <p className="mt-5 text-base leading-relaxed text-lunar-2">{active.fact[lang]}</p>
            <div className="mt-5 flex flex-wrap gap-3"><EkoVoiceButton content={active.fact[lang]} /></div>
            <a className="mt-4 inline-flex border-b border-signal/40 pb-1 text-sm text-signal hover:border-signal" href={active.source.url} target="_blank" rel="noopener noreferrer">
              {active.source.label} ↗
            </a>
            <div className="mt-8 border-t border-hairline pt-6">
              <h3 className="font-serif text-2xl italic">{active.question[lang]}</h3>
              <div className="mt-5 grid gap-3">
                {active.options.map((option, i) => (
                  <button
                    type="button"
                    disabled={result === "correct"}
                    key={i}
                    onClick={() => answer(i)}
                    className="border border-hairline p-4 text-left text-sm leading-relaxed text-lunar-2 transition-colors hover:border-signal hover:text-lunar disabled:cursor-default disabled:opacity-50"
                  >
                    <span className="mr-4 font-mono text-signal">0{i + 1}</span>{option[lang]}
                  </button>
                ))}
              </div>
              {result && (
                <p role="status" aria-live="polite" className={`mt-5 text-sm ${result === "correct" ? "text-signal" : "text-caution"}`}>
                  {result === "correct" ? txt("Correct. Evidence recovered and saved.", "সঠিক! প্রমাণ উদ্ধার ও সংরক্ষণ হয়েছে।") : txt("Not quite. Re-read the evidence and try again.", "ঠিক হয়নি। প্রমাণ আবার পড়ে চেষ্টা করো।")}
                </p>
              )}
              {result === "correct" && (
                <button className="btn-signal mt-6" onClick={() => setActiveId(null)}>{txt("Continue exploring", "অনুসন্ধান চালিয়ে যাও")} →</button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
