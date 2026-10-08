"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useSettings } from "@/lib/settings";
import { usePassport } from "@/lib/passport";
import { readStore, writeStore } from "@/lib/storage";
import { assetPath } from "@/lib/asset-path";
import { GameAudio, type Mood } from "../audio";
import { GameSession, type Cue } from "../core/session";
import { SAVE_KEY, newProgress, sanitizeProgress, type GameProgress } from "../core/progress";
import type { Engine, EngineView } from "../engine/Engine";
import { InputController, type UiAction } from "../input";
import { DEFAULT_GAME_SETTINGS, GAME_SETTINGS_KEY, SUIT_COLORS, autoPreset, sanitizeGameSettings, type GameSettings, type QualityPreset } from "../settings";
import { Console2D } from "./Console2D";
import {
  ChapterCard, Compass, CutsceneOverlay, InteractionPrompt, Minimap, ObjectiveMarker, ObjectivePanel, PerfBadge, StormBadge, Subtitles, Toasts, TouchControls,
} from "./Hud";
import { ChapterSelect, CompletionScreen, Confirm, ControlsHelp, MainMenu, PauseMenu, SettingsPanel } from "./Menus";
import { EvidenceCard, Inventory, Journal, MissionMap } from "./Panels";
import { PuzzleDialog } from "./Puzzles";
import { Modal } from "./Modal";
import { S } from "./strings";
import "./game.css";

type Overlay = null | "pause" | "inventory" | "map" | "journal" | "settings" | "controls" | "chapters" | "confirm-new";
type Phase = "menu" | "playing";

const noopSubscribe = () => () => {};
const zero = () => 0;

function detectWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") ?? c.getContext("webgl");
    const ok = !!gl;
    (gl as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context")?.loseContext();
    return ok;
  } catch { return false; }
}

function loadSave(): GameProgress | null {
  const raw = readStore<unknown>(SAVE_KEY, null);
  return raw ? sanitizeProgress(raw) : null;
}

export function GameRoot() {
  const { lang, reducedMotion, setLang, setMotion, hydrated } = useSettings();
  const { mark } = usePassport();
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);
  const [save, setSave] = useState<GameProgress | null>(null);
  const [phase, setPhase] = useState<Phase>("menu");
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  const [webgl, setWebgl] = useState(true);
  const [ready, setReady] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [overlay, setOverlayState] = useState<Overlay>(null);
  const [returnTo, setReturnTo] = useState<Overlay>(null);
  const [contextLost, setContextLost] = useState(false);
  const [engineKey, setEngineKey] = useState(0);
  const [touch, setTouch] = useState(false);
  const [quality, setQuality] = useState<Exclude<QualityPreset, "auto">>("medium");
  const [session, setSession] = useState<GameSession | null>(null);
  const [firstPerson, setFirstPerson] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const audioRef = useRef<GameAudio | null>(null);
  const viewRef = useRef<EngineView | null>(null);
  const overlayRef = useRef<Overlay>(null);
  const phaseRef = useRef<Phase>("menu");
  const sessionRef = useRef<GameSession | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  phaseRef.current = phase;
  sessionRef.current = session;

  useSyncExternalStore(session?.subscribe ?? noopSubscribe, session?.getVersion ?? zero, zero);

  const setOverlay = useCallback((o: Overlay) => {
    overlayRef.current = o;
    setOverlayState(o);
    if (o && document.pointerLockElement) document.exitPointerLock();
  }, []);

  // ── Input ───────────────────────────────────────────────────────────────
  const onAction = useCallback((a: UiAction) => {
    const s = sessionRef.current;
    if (phaseRef.current !== "playing" || !s) return;
    const current = overlayRef.current;
    if (a === "pause") {
      if (current) setOverlay(current === "settings" || current === "controls" || current === "chapters" ? "pause" : null);
      else if (s.puzzle) s.closePuzzle();
      else if (s.evidenceCard) s.closeEvidence();
      else if (!s.completed) setOverlay("pause");
      return;
    }
    if (a === "advance") { if (s.cutscene) s.skipCutscene(); else s.advanceDialogue(); return; }
    if (a === "view") { if (engineRef.current && !current) { engineRef.current.firstPerson = !engineRef.current.firstPerson; setFirstPerson(engineRef.current.firstPerson); } return; }
    if (s.puzzle || s.evidenceCard || s.completed) return;
    if (current && current !== a) return;
    setOverlay(current === a ? null : a);
  }, [setOverlay]);
  const input = useMemo(() => new InputController(onAction), [onAction]);
  const consume = useCallback(() => input.consume(), [input]);
  const onConsoleStorm = useCallback((v: number) => audioRef.current?.setStorm(v), []);

  // ── Mount: settings, save, capabilities ─────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stored = sanitizeGameSettings(readStore(GAME_SETTINGS_KEY, {}));
    // ?quality=low|medium|high overrides the graphics preset for weak demo machines and tests.
    const forced = params.get("quality");
    const gs = forced === "low" || forced === "medium" || forced === "high" || forced === "ultra" ? { ...stored, quality: forced } as GameSettings : stored;
    setSettings(gs);
    const loaded = loadSave();
    setSave(loaded);
    const gl = detectWebGL() && !params.has("force2d");
    setWebgl(gl);
    setMode(gl ? "3d" : "2d");
    const coarse = window.matchMedia?.("(pointer: coarse)").matches || params.has("touch");
    setTouch(!!coarse);
    setQuality(gs.quality === "auto" ? autoPreset({ coarsePointer: !!coarse, cores: navigator.hardwareConcurrency || 4, width: window.innerWidth }) : gs.quality);
    // Preview session for the attract-mode backdrop (never persisted).
    setSession(new GameSession(loaded));
    setReady(true);
  }, []);

  useEffect(() => { if (ready) writeStore(GAME_SETTINGS_KEY, settings); }, [settings, ready]);

  // Read-only diagnostics handle used by the automated browser tests (both modes).
  useEffect(() => {
    const w = window as unknown as { __LAST_LIGHT__?: unknown };
    w.__LAST_LIGHT__ = { get session() { return sessionRef.current; }, engine: () => engineRef.current?.debugInfo() ?? null, roverParts: () => engineRef.current?.roverParts() ?? null, input };
    return () => { delete w.__LAST_LIGHT__; };
  }, [input]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    input.attach(stage);
    return () => input.detach();
  }, [input, ready]);

  // ── 3D engine lifecycle (lazy-loaded Three.js chunk) ────────────────────
  useEffect(() => {
    if (!ready || mode !== "3d" || !webgl || !canvasRef.current || !sessionRef.current) return;
    let cancelled = false;
    let engine: Engine | null = null;
    setEngineReady(false);
    import("../engine/Engine").then(({ Engine }) => {
      if (cancelled || !canvasRef.current || !sessionRef.current) return;
      try {
        const st = settingsRef.current;
        engine = new Engine(canvasRef.current, sessionRef.current, input, {
          preset: st.quality,
          initialQuality: quality,
          suit: SUIT_COLORS[st.suit],
          reducedMotion,
          lang,
          assetBase: assetPath(""),
          attract: phaseRef.current === "menu",
          onContextLost: () => setContextLost(true),
          onQualityChange: (q) => setQuality(q),
          onFrame: (view) => { viewRef.current = view; },
        });
        engineRef.current = engine;
        engine.start();
        setEngineReady(true);
      } catch (error) {
        console.error("3D engine failed; switching to the 2D mission console.", error);
        setWebgl(false);
        setMode("2d");
      }
    }).catch((error) => {
      console.error("Could not load the 3D engine chunk.", error);
      setMode("2d");
    });
    return () => {
      cancelled = true;
      engine?.dispose();
      if (engineRef.current === engine) engineRef.current = null;
      viewRef.current = null;
    };
    // Rebuild only when the mode changes or after a lost context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, mode, webgl, engineKey]);

  useEffect(() => { if (session) engineRef.current?.setSession(session); }, [session, engineReady]);
  useEffect(() => { engineRef.current?.setAttract(phase === "menu"); }, [phase, engineReady]);
  useEffect(() => { engineRef.current?.setReducedMotion(reducedMotion); if (session) session.options = { ...session.options, reducedMotion }; }, [reducedMotion, session, engineReady]);
  useEffect(() => { engineRef.current?.setLang(lang); }, [lang, engineReady]);
  useEffect(() => { engineRef.current?.setSuit(SUIT_COLORS[settings.suit]); }, [settings.suit, engineReady]);
  useEffect(() => { engineRef.current?.setPreset(settings.quality); }, [settings.quality, engineReady]);
  useEffect(() => {
    if (!session) return;
    session.options = { ...session.options, sensitivity: settings.sensitivity, invertY: settings.invertY, autoCamera: mode === "3d" && settings.autoCamera, reducedMotion };
  }, [session, settings.sensitivity, settings.invertY, settings.autoCamera, mode, reducedMotion]);
  useEffect(() => { audioRef.current?.setVolumes(settings.master, settings.music, settings.sfx); }, [settings.master, settings.music, settings.sfx]);

  // Pause the simulation whenever a menu covers the game.
  const blockedByUi = phase !== "playing" || overlay !== null || contextLost;
  useEffect(() => {
    session?.setPaused(blockedByUi);
    input.enabled = !blockedByUi && !session?.puzzle && !session?.evidenceCard;
    if (input.enabled === false) input.reset();
  });

  // ── Audio wiring ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    return session.onCue((cue: Cue) => {
      const audio = audioRef.current;
      if (!audio || phaseRef.current !== "playing") return;
      audio.play(cue, viewRef.current?.ekoPan ?? 0);
    });
  }, [session]);

  useEffect(() => {
    if (phase !== "playing") return;
    const id = window.setInterval(() => {
      const audio = audioRef.current, s = sessionRef.current;
      if (!audio || !s) return;
      audio.setStorm(s.storm);
      const v = viewRef.current;
      if (v) audio.updateSpatial(v.listener, s.cutscene ? null : v.beacon);
      const mood: Mood = s.cutscene?.id === "finale" || s.completed ? "finale" : s.progress.chapter === 2 ? "storm" : s.progress.chapter === 3 ? "archive" : "calm";
      audio.setMood(mood);
    }, 150);
    return () => window.clearInterval(id);
  }, [phase]);

  // Optional voice narration through the browser's speech synthesis.
  const subtitleKey = session?.subtitle?.key;
  useEffect(() => {
    if (!settings.voice || !session?.subtitle || phase !== "playing" || typeof speechSynthesis === "undefined") return;
    const u = new SpeechSynthesisUtterance(session.subtitle.line.text[lang]);
    u.lang = lang === "bn" ? "bn-BD" : "en-US";
    u.rate = 1; u.pitch = session.subtitle.line.speaker === "eko" ? 1.25 : 0.95;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtitleKey, settings.voice, lang, phase]);
  // Leaving the route (client-side navigation keeps the page alive): stop audio, speech and mouse capture.
  useEffect(() => () => {
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    audioRef.current?.dispose();
    audioRef.current = null;
    if (document.pointerLockElement) document.exitPointerLock();
  }, []);

  // ── Passport integration on completion ──────────────────────────────────
  const completed = !!session?.completed;
  useEffect(() => { if (completed && phase === "playing") mark("discovered", "opportunity"); }, [completed, phase, mark]);

  // Exiting pointer lock with Esc (swallowed by the browser) opens the pause menu.
  useEffect(() => {
    const onLock = () => {
      if (!document.pointerLockElement && phaseRef.current === "playing" && !overlayRef.current && !sessionRef.current?.puzzle && !sessionRef.current?.evidenceCard && !sessionRef.current?.completed) setOverlay("pause");
    };
    document.addEventListener("pointerlockchange", onLock);
    return () => document.removeEventListener("pointerlockchange", onLock);
  }, [setOverlay]);

  // ── Session control ─────────────────────────────────────────────────────
  const persist = useCallback((p: GameProgress) => { writeStore(SAVE_KEY, p); setSave(p); }, []);

  const begin = useCallback((progress: GameProgress, chapter?: number) => {
    if (!audioRef.current) {
      try { audioRef.current = new GameAudio(); } catch { audioRef.current = null; }
    }
    audioRef.current?.resume();
    audioRef.current?.setVolumes(settingsRef.current.master, settingsRef.current.music, settingsRef.current.sfx);
    const s = new GameSession(progress, persist);
    s.options = { sensitivity: settingsRef.current.sensitivity, invertY: settingsRef.current.invertY, autoCamera: settingsRef.current.autoCamera, reducedMotion };
    if (chapter !== undefined) s.replayChapter(chapter);
    else s.save();
    input.reset();
    setSession(s);
    setOverlay(null);
    setPhase("playing");
    window.setTimeout(() => stageRef.current?.focus(), 0);
  }, [persist, input, reducedMotion, setOverlay]);

  const continueGame = () => begin(loadSave() ?? newProgress());
  const newGame = () => {
    const old = loadSave();
    if (old && (old.done.length > 0 || old.finished) && overlay !== "confirm-new") { setOverlay("confirm-new"); return; }
    const fresh = newProgress();
    begin(old ? { ...fresh, achievements: old.achievements, bestXp: old.bestXp } : fresh);
  };
  const startNewConfirmed = () => {
    const old = loadSave();
    const fresh = newProgress();
    begin(old ? { ...fresh, achievements: old.achievements, bestXp: old.bestXp } : fresh);
  };
  const pickChapter = (i: number) => begin(loadSave() ?? newProgress(), i);
  const toMenu = () => {
    session?.save();
    setOverlay(null);
    setPhase("menu");
    const loaded = loadSave();
    setSave(loaded);
    setSession(new GameSession(loaded));
    if (document.pointerLockElement) document.exitPointerLock();
  };

  const interact = () => session?.interact();
  const onTravel = (poi: string) => { session?.travelTo(poi); setOverlay(null); };

  const requestLock = (e: React.MouseEvent) => {
    if (phase !== "playing" || mode !== "3d" || overlay || !settings.mouseCapture || touch) return;
    if (session?.puzzle || session?.evidenceCard || session?.cutscene) return;
    if (e.target === canvasRef.current) {
      try {
        const r = canvasRef.current?.requestPointerLock() as unknown;
        if (r instanceof Promise) r.catch(() => {});
      } catch { /* pointer lock unavailable */ }
    }
  };

  if (!ready || !hydrated) {
    return <div className="ll-root ll-root--loading" aria-busy="true"><p className="ll-loading">{S.loading[lang]}</p></div>;
  }

  const playing = phase === "playing" && session;
  const s = session!;

  return (
    <div className="ll-root" data-phase={phase} data-mode={mode} data-reduced={reducedMotion ? "true" : "false"}>
      <div
        ref={stageRef}
        className="ll-stage"
        tabIndex={-1}
        onClick={requestLock}
        aria-label={lang === "bn" ? "শেষ আলো — খেলার দৃশ্য" : "The Last Light — game view"}
        role="application"
      >
        {mode === "3d" && webgl && <canvas key={engineKey} ref={canvasRef} className="ll-canvas" data-testid="game-canvas" />}
        {mode === "2d" && session && (
          <Console2D session={session} lang={lang} paused={blockedByUi} consume={consume} onTravel={onTravel} onStorm={onConsoleStorm} />
        )}
        {mode === "3d" && <div className="ll-grade" aria-hidden />}
      </div>

      {phase === "menu" && (
        <MainMenu
          lang={lang} save={save} webgl={webgl} loading={mode === "3d" && !engineReady} mode={mode}
          onContinue={continueGame} onNew={newGame} onChapter={() => setOverlay("chapters")}
          onSettings={() => setOverlay("settings")} onControls={() => setOverlay("controls")} onMode={setMode}
        />
      )}

      {playing && (
        <div className="ll-hud" data-testid="hud">
          {!s.cutscene && (
            <>
              <ObjectivePanel session={s} lang={lang} />
              {mode === "3d" && <Compass session={s} view={() => viewRef.current} />}
              <Minimap session={s} view={() => viewRef.current} lang={lang} onOpen={() => setOverlay("map")} />
              {mode === "3d" && <ObjectiveMarker session={s} view={() => viewRef.current} lang={lang} />}
              <InteractionPrompt session={s} lang={lang} onInteract={interact} />
              <StormBadge session={s} lang={lang} />
              <div className="ll-quickbar">
                <button type="button" onClick={() => setOverlay("inventory")}>{S.inventory[lang]} <kbd>Tab</kbd></button>
                <button type="button" onClick={() => setOverlay("map")}>{S.map[lang]} <kbd>M</kbd></button>
                <button type="button" onClick={() => setOverlay("journal")}>{S.journal[lang]} <kbd>J</kbd></button>
                {mode === "3d" && (
                  <button type="button" aria-pressed={firstPerson} onClick={() => { const e = engineRef.current; if (e) { e.firstPerson = !e.firstPerson; setFirstPerson(e.firstPerson); } }}>
                    {firstPerson ? S.view3p[lang] : S.view1p[lang]} <kbd>V</kbd>
                  </button>
                )}
                <button type="button" onClick={() => setOverlay("pause")} data-testid="pause-button">{S.menu[lang]} <kbd>Esc</kbd></button>
              </div>
              {touch && <TouchControls input={input} lang={lang} onAction={(a) => {
                if (a === "interact") interact(); else if (a === "jump") input.pressJump(); else setOverlay(a);
              }} />}
            </>
          )}
          <CutsceneOverlay session={s} lang={lang} onSkip={() => s.skipCutscene()} />
          <Subtitles session={s} lang={lang} large={settings.subtitles === "large"} onAdvance={() => s.advanceDialogue()} />
          <ChapterCard session={s} lang={lang} />
          <Toasts session={s} lang={lang} />
          {settings.showFps && <PerfBadge view={() => viewRef.current} />}
        </div>
      )}

      {playing && s.puzzle && !overlay && <PuzzleDialog session={s} lang={lang} onClose={() => s.closePuzzle()} onSolved={() => stageRef.current?.focus()} />}
      {playing && s.evidenceCard && !overlay && !s.puzzle && <EvidenceCard session={s} lang={lang} onClose={() => { s.closeEvidence(); stageRef.current?.focus(); }} />}
      {playing && s.completed && !s.cutscene && !overlay && !s.evidenceCard && (
        <CompletionScreen lang={lang} progress={s.progress} onExplore={() => s.freeRoam()} onReplay={() => setOverlay("chapters")} onMenu={toMenu} />
      )}

      {overlay === "pause" && playing && (
        <PauseMenu lang={lang} mode={mode} webgl={webgl}
          onResume={() => { setOverlay(null); stageRef.current?.focus(); }}
          onRestart={() => { s.replayChapter(s.progress.chapter); setOverlay(null); }}
          onChapter={() => setOverlay("chapters")}
          onMenu={toMenu}
          onSettings={() => { setReturnTo("pause"); setOverlay("settings"); }}
          onControls={() => { setReturnTo("pause"); setOverlay("controls"); }}
          onMode={(m) => { setMode(m); setOverlay(null); }}
        />
      )}
      {overlay === "inventory" && playing && <Inventory session={s} lang={lang} onClose={() => setOverlay(null)} />}
      {overlay === "map" && playing && <MissionMap session={s} lang={lang} onClose={() => setOverlay(null)} onTravel={mode === "2d" ? onTravel : undefined} />}
      {overlay === "journal" && playing && <Journal session={s} lang={lang} onClose={() => setOverlay(null)} />}
      {overlay === "chapters" && (
        <ChapterSelect lang={lang} save={loadSave() ?? newProgress()} onPick={pickChapter} onClose={() => setOverlay(phase === "playing" ? "pause" : null)} />
      )}
      {overlay === "controls" && <ControlsHelp lang={lang} onClose={() => setOverlay(phase === "playing" ? returnTo : null)} />}
      {overlay === "settings" && (
        <Modal label={S.settings[lang]} onClose={() => setOverlay(phase === "playing" ? returnTo : null)} wide>
          <header className="ll-panel__head">
            <h2>{S.settings[lang]}</h2>
            <button type="button" className="ll-btn" onClick={() => setOverlay(phase === "playing" ? returnTo : null)}>{S.back[lang]}</button>
          </header>
          <SettingsPanel
            lang={lang} settings={settings} onChange={setSettings}
            reducedMotion={reducedMotion} onReducedMotion={(v) => setMotion(v ? "reduce" : "system")}
            onLang={setLang} measuredQuality={mode === "3d" ? quality : undefined}
          />
        </Modal>
      )}
      {overlay === "confirm-new" && (
        <Confirm lang={lang} text={S.confirmNew[lang]} onYes={startNewConfirmed} onNo={() => setOverlay(null)} />
      )}
      {contextLost && (
        <Modal label={S.contextLost[lang]}>
          <p className="ll-intro">{S.contextLost[lang]}</p>
          <div className="ll-actions">
            <button type="button" className="ll-btn ll-btn--primary" onClick={() => { setContextLost(false); setEngineKey((k) => k + 1); }}>{S.retry3d[lang]}</button>
            <button type="button" className="ll-btn" onClick={() => { setContextLost(false); setMode("2d"); }}>{S.use2d[lang]}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
