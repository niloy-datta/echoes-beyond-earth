"use client";

import Link from "next/link";
import { useState } from "react";
import { ACHIEVEMENTS, CHAPTERS, LEVELS } from "../content/chapters";
import { PREVIEW_CHAPTERS, evidenceOf, isChapterComplete, learningRecord, levelOf, levelXp, unlockedChapters, type GameProgress } from "../core/progress";
import { LEARNING_GOALS, PUZZLE_BY_ID } from "../content/puzzles";
import { learningSummaryHtml } from "../core/learningSummary";
import { LEARNER_BANDS, SUIT_COLORS, bandOf, sanitizeDisplayName, type GameSettings, type LearnerBand, type QualityPreset, type SuitAccent } from "../settings";
import { Modal } from "./Modal";
import { S } from "./strings";

type Lang = "en" | "bn";

export function MainMenu({ lang, save, webgl, loading, onContinue, onNew, onChapter, onPreview, onSettings, onControls, onMode, mode }: {
  lang: Lang; save: GameProgress | null; webgl: boolean; loading: boolean; mode: "3d" | "2d";
  onContinue: () => void; onNew: () => void; onChapter: () => void; onPreview: () => void; onSettings: () => void; onControls: () => void; onMode: (m: "3d" | "2d") => void;
}) {
  const hasSave = !!save && (save.done.length > 0 || save.finished);
  const chapter = save ? CHAPTERS[save.chapter] : null;
  return (
    <div className="ll-menu" data-testid="main-menu">
      <div className="ll-menu__vignette" aria-hidden />
      <div className="ll-menu__inner">
        <p className="ll-menu__super">{S.supertitle[lang]}</p>
        <h1 className="ll-menu__title">{S.title[lang]}</h1>
        <p className="ll-menu__tagline">{S.tagline[lang]}</p>
        <nav className="ll-menu__nav" aria-label={lang === "bn" ? "মূল মেনু" : "Main menu"}>
          {hasSave && (
            <button type="button" className="ll-menu__item is-primary" onClick={onContinue} data-autofocus>
              <span>{S.continue[lang]}</span>
              {chapter && <small>{chapter.number} · {chapter.title[lang]}{save?.finished ? " · ✓" : ""}</small>}
            </button>
          )}
          <button type="button" className={`ll-menu__item ${hasSave ? "" : "is-primary"}`} onClick={onNew}><span>{S.newGame[lang]}</span></button>
          <button type="button" className="ll-menu__item" onClick={onChapter} disabled={!hasSave}><span>{S.chapterSelect[lang]}</span></button>
          <button type="button" className="ll-menu__item" onClick={onPreview} data-testid="judge-preview"><span>{S.preview[lang]}</span><small>{lang === "bn" ? "যেকোনো অধ্যায় · সংরক্ষণ হয় না" : "Any chapter · not saved"}</small></button>
          <button type="button" className="ll-menu__item" onClick={onSettings}><span>{S.settings[lang]}</span></button>
          <button type="button" className="ll-menu__item" onClick={onControls}><span>{S.controls[lang]}</span></button>
        </nav>
        <div className="ll-menu__mode" role="group" aria-label={lang === "bn" ? "খেলার ধরন" : "Play mode"}>
          <button type="button" aria-pressed={mode === "3d"} disabled={!webgl} onClick={() => onMode("3d")}>{S.mode3d[lang]}</button>
          <button type="button" aria-pressed={mode === "2d"} onClick={() => onMode("2d")}>{S.mode2d[lang]}</button>
        </div>
        {!webgl && <p className="ll-menu__note" role="status">{S.webglMissing[lang]}</p>}
        {loading && webgl && mode === "3d" && <p className="ll-menu__note" role="status">{S.loading[lang]}</p>}
        <div className="ll-menu__links">
          <Link prefetch={false} href="/play/">{S.classic[lang]}</Link>
          <Link prefetch={false} href="/">{S.museum[lang]}</Link>
        </div>
        <p className="ll-menu__disclaimer">{S.disclaimer[lang]}</p>
      </div>
    </div>
  );
}

export function ChapterSelect({ lang, save, preview = false, onPick, onClose }: { lang: Lang; save: GameProgress; preview?: boolean; onPick: (i: number) => void; onClose: () => void }) {
  const unlocked = preview ? PREVIEW_CHAPTERS : unlockedChapters(save);
  const title = preview ? S.preview[lang] : S.chapterSelect[lang];
  return (
    <Modal label={title} onClose={onClose} wide>
      <header className="ll-panel__head">
        <h2>{title}</h2>
        <button type="button" className="ll-btn" onClick={onClose}>{S.back[lang]}</button>
      </header>
      <ol className="ll-chapters">
        {CHAPTERS.map((c, i) => {
          const open = unlocked.includes(i);
          return (
            <li key={c.id}>
              <button type="button" disabled={!open} onClick={() => onPick(i)} className="ll-chapter">
                <span className="ll-chapter__num">{c.number}</span>
                <span><strong>{open ? c.title[lang] : S.locked[lang]}</strong><small>{open ? c.dek[lang] : "———"}</small></span>
                <span aria-hidden>{!preview && isChapterComplete(save, i) ? "✓" : open ? "→" : "🔒"}</span>
              </button>
            </li>
          );
        })}
      </ol>
      {preview ? <p className="ll-muted text-xs" data-testid="preview-hint">{S.previewHint[lang]}</p> : <p className="ll-muted text-xs">{lang === "bn" ? "অধ্যায় আবার খেললে সেই অধ্যায় ও পরের অধ্যায়ের লক্ষ্য রিসেট হয়; অর্জন ও লেভেল থাকে।" : "Replaying a chapter resets that chapter and later ones; achievements and level are kept. Chapters open in order."}</p>}
    </Modal>
  );
}

function Range({ label, value, onChange, min = 0, max = 1, step = 0.05 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <label className="ll-range">
      <span>{label}: {Math.round(value * 100)}%</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="ll-toggle">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function SettingsPanel({ lang, settings, onChange, reducedMotion, onReducedMotion, onLang, measuredQuality }: {
  lang: Lang; settings: GameSettings; onChange: (s: GameSettings) => void; reducedMotion: boolean; onReducedMotion: (v: boolean) => void; onLang: (l: Lang) => void; measuredQuality?: string;
}) {
  const set = <K extends keyof GameSettings>(k: K, v: GameSettings[K]) => onChange({ ...settings, [k]: v });
  const bn = lang === "bn";
  return (
    <div className="ll-settings">
      <section>
        <h3>{bn ? "শেখার ধাপ" : "Learning level"}</h3>
        <p className="ll-muted text-xs">{bn ? "শুধু প্রশ্নের ভাষা ও সাহায্যের ধরন বদলায়। অগ্রগতি, অর্জন ও সংরক্ষিত খেলা একই থাকে।" : "Changes question wording and hint pacing only. Progress, achievements and your saved game stay the same."}</p>
        <div role="radiogroup" aria-label={bn ? "শেখার ধাপ" : "Learning level"} className="ll-choices">
          {LEARNER_BANDS.map((b) => (
            <button key={b} type="button" role="radio" data-band={b} aria-checked={bandOf(settings) === b}
              className={`ll-choice ${bandOf(settings) === b ? "is-selected" : ""}`} onClick={() => set("learnerBand", b)}>
              {BAND_TEXT[b].title[lang]}
            </button>
          ))}
        </div>
      </section>
      <section>
        <h3>{S.graphics[lang]}</h3>
        <div role="radiogroup" aria-label={S.graphics[lang]} className="ll-choices">
          {(["auto", "low", "medium", "high", "ultra"] as QualityPreset[]).map((q) => (
            <button key={q} type="button" role="radio" aria-checked={settings.quality === q} className={`ll-choice ${settings.quality === q ? "is-selected" : ""}`} onClick={() => set("quality", q)}>
              {q === "auto" ? (bn ? "স্বয়ংক্রিয়" : "Auto") : q === "low" ? (bn ? "কম" : "Low") : q === "medium" ? (bn ? "মাঝারি" : "Medium") : q === "high" ? (bn ? "উচ্চ" : "High") : (bn ? "সর্বোচ্চ" : "Ultra")}
            </button>
          ))}
        </div>
        {measuredQuality && <p className="ll-muted text-xs">{bn ? "এখন চলছে" : "Currently running"}: {measuredQuality}</p>}
        <Toggle label={bn ? "পারফরম্যান্স (FPS) দেখাও" : "Show performance (FPS)"} value={settings.showFps} onChange={(v) => set("showFps", v)} />
      </section>
      <section>
        <h3>{S.audio[lang]}</h3>
        <Range label={bn ? "মূল ভলিউম" : "Master"} value={settings.master} onChange={(v) => set("master", v)} />
        <Range label={bn ? "সংগীত" : "Music"} value={settings.music} onChange={(v) => set("music", v)} />
        <Range label={bn ? "ইফেক্ট" : "Effects"} value={settings.sfx} onChange={(v) => set("sfx", v)} />
        <Toggle label={bn ? "ইকোর কণ্ঠ (ব্রাউজারের ভয়েস)" : "Voice narration (browser voices)"} value={settings.voice} onChange={(v) => set("voice", v)} />
      </section>
      <section>
        <h3>{S.controls[lang]}</h3>
        <label className="ll-range">
          <span>{bn ? "ক্যামেরা সংবেদনশীলতা" : "Camera sensitivity"}: {settings.sensitivity.toFixed(1)}×</span>
          <input type="range" min={0.3} max={2.5} step={0.1} value={settings.sensitivity} onChange={(e) => set("sensitivity", Number(e.target.value))} />
        </label>
        <Toggle label={bn ? "Y-অক্ষ উল্টাও" : "Invert Y axis"} value={settings.invertY} onChange={(v) => set("invertY", v)} />
        <Toggle label={bn ? "ক্যামেরা নিজে পেছনে ঘুরবে" : "Auto-follow camera"} value={settings.autoCamera} onChange={(v) => set("autoCamera", v)} />
        <Toggle label={bn ? "ক্লিক করলে মাউস ধরে রাখো" : "Capture mouse on click"} value={settings.mouseCapture} onChange={(v) => set("mouseCapture", v)} />
      </section>
      <section>
        <h3>{S.accessibility[lang]}</h3>
        <Toggle label={bn ? "গতি কমাও (ক্যামেরা নড়াচড়া ও অ্যানিমেশন)" : "Reduce motion (camera moves & animation)"} value={reducedMotion} onChange={onReducedMotion} />
        <Toggle label={bn ? "বড় সাবটাইটেল" : "Large subtitles"} value={settings.subtitles === "large"} onChange={(v) => set("subtitles", v ? "large" : "normal")} />
        <div role="radiogroup" aria-label={S.language[lang]} className="ll-choices mt-3">
          <button type="button" role="radio" aria-checked={lang === "en"} className={`ll-choice ${lang === "en" ? "is-selected" : ""}`} onClick={() => onLang("en")}>English</button>
          <button type="button" role="radio" aria-checked={lang === "bn"} className={`ll-choice ${lang === "bn" ? "is-selected" : ""}`} onClick={() => onLang("bn")}>বাংলা</button>
        </div>
      </section>
      <section>
        <h3>{S.explorer[lang]}</h3>
        <div role="radiogroup" aria-label={S.suit[lang]} className="ll-choices">
          {(Object.keys(SUIT_COLORS) as SuitAccent[]).map((s) => (
            <button key={s} type="button" role="radio" aria-checked={settings.suit === s} aria-label={`${S.suit[lang]}: ${s}`} className={`ll-swatch ${settings.suit === s ? "is-selected" : ""}`} style={{ background: SUIT_COLORS[s] }} onClick={() => set("suit", s)} />
          ))}
        </div>
      </section>
    </div>
  );
}

export function ControlsHelp({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const bn = lang === "bn";
  const rows: [string, string][] = [
    ["W A S D / ← ↑ → ↓", bn ? "চলা" : "Move"],
    [bn ? "মাউস টানো / ক্লিক করে মাউস লক" : "Mouse drag / click to capture", bn ? "ক্যামেরা ঘোরাও" : "Rotate camera"],
    [bn ? "মাউস হুইল" : "Mouse wheel", bn ? "জুম" : "Zoom"],
    ["Shift", bn ? "দৌড়" : "Sprint"],
    ["Space", bn ? "লাফ (মঙ্গলের মাধ্যাকর্ষণ)" : "Jump (Mars gravity)"],
    ["E", bn ? "স্ক্যান / ইন্টারঅ্যাক্ট" : "Scan / interact"],
    ["V", bn ? "ফার্স্ট-পারসন পরিদর্শন দৃশ্য" : "First-person inspection view"],
    ["Tab", S.inventory[lang]],
    ["M", S.map[lang]],
    ["J", S.journal[lang]],
    ["Enter", bn ? "সংলাপ এগোও / দৃশ্য এড়াও" : "Advance dialogue / skip cinematic"],
    ["Esc", bn ? "বিরতি মেনু" : "Pause menu"],
  ];
  return (
    <Modal label={S.controls[lang]} onClose={onClose}>
      <header className="ll-panel__head"><h2>{S.controls[lang]}</h2><button type="button" className="ll-btn" onClick={onClose}>{S.close[lang]}</button></header>
      <dl className="ll-controls">
        {rows.map(([k, v]) => <div key={k}><dt><kbd>{k}</kbd></dt><dd>{v}</dd></div>)}
      </dl>
      <p className="ll-muted text-sm mt-4">{bn ? "টাচস্ক্রিন: বাঁ দিকে জয়স্টিক, ডান দিকে টেনে ক্যামেরা ঘোরাও, বোতামে ইন্টারঅ্যাক্ট/লাফ/দৌড়।" : "Touch: joystick on the left, drag the right side to look, buttons for interact / jump / sprint."}</p>
    </Modal>
  );
}

export function PauseMenu({ lang, onResume, onRestart, onChapter, onMenu, onSettings, onControls, onMode, mode, webgl, preview = false }: {
  preview?: boolean;
  lang: Lang; onResume: () => void; onRestart: () => void; onChapter: () => void; onMenu: () => void; onSettings: () => void; onControls: () => void;
  onMode: (m: "3d" | "2d") => void; mode: "3d" | "2d"; webgl: boolean;
}) {
  return (
    <Modal label={S.paused[lang]} onClose={onResume}>
      <h2 className="ll-pause__title">{S.paused[lang]}</h2>
      <nav className="ll-pause">
        <button type="button" className="ll-btn ll-btn--primary" onClick={onResume} data-autofocus>{S.resume[lang]}</button>
        <button type="button" className="ll-btn" onClick={onSettings}>{S.settings[lang]}</button>
        <button type="button" className="ll-btn" onClick={onControls}>{S.controls[lang]}</button>
        <button type="button" className="ll-btn" onClick={onRestart}>{S.restartChapter[lang]}</button>
        <button type="button" className="ll-btn" onClick={onChapter}>{S.chapterSelect[lang]}</button>
        {webgl && <button type="button" className="ll-btn" onClick={() => onMode(mode === "3d" ? "2d" : "3d")}>{mode === "3d" ? S.mode2d[lang] : S.mode3d[lang]}</button>}
        <button type="button" className="ll-btn" onClick={onMenu}>{preview ? S.previewExit[lang] : S.saveExit[lang]}</button>
        <Link prefetch={false} className="ll-btn" href="/">{S.museum[lang]}</Link>
      </nav>
    </Modal>
  );
}

function certificateSvg(lang: Lang, progress: GameProgress, name = ""): string {
  const xp = levelXp(progress);
  const lv = levelOf(xp);
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
  const date = new Date().toISOString().slice(0, 10);
  const title = lang === "bn" ? "শেষ আলো — অভিযান সম্পন্ন" : "THE LAST LIGHT — EXPEDITION COMPLETE";
  const body = lang === "bn"
    ? `অপরচুনিটির ${evidenceOf(progress).length}টি NASA রেকর্ড উদ্ধার · লেভেল ${lv.level + 1} · ${xp} XP`
    : `${evidenceOf(progress).length} NASA records of Opportunity recovered · Level ${lv.level + 1} · ${xp} XP`;
  const note = lang === "bn" ? "শিক্ষামূলক পুরস্কার — NASA-র অফিসিয়াল সনদ নয়।" : "Educational reward — not an official NASA certificate.";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
<rect width="1200" height="800" fill="#05080b"/><rect x="30" y="30" width="1140" height="740" fill="none" stroke="#63e6ef" stroke-width="2"/>
<circle cx="600" cy="250" r="90" fill="none" stroke="#e7a94f" stroke-width="2"/><circle cx="600" cy="250" r="40" fill="#e7a94f" opacity="0.85"/>
<text x="600" y="420" text-anchor="middle" fill="#ecebe6" font-family="sans-serif" font-size="44" font-weight="600">${esc(title)}</text>${name ? `
<text x="600" y="370" text-anchor="middle" fill="#e7a94f" font-family="sans-serif" font-size="30">${esc(name)}</text>` : ""}
<text x="600" y="480" text-anchor="middle" fill="#b9b8b2" font-family="sans-serif" font-size="26">${esc(body)}</text>
<text x="600" y="530" text-anchor="middle" fill="#63e6ef" font-family="monospace" font-size="22">${esc(LEVELS[lv.level].title[lang])} · ${date}</text>
<text x="600" y="690" text-anchor="middle" fill="#7d7c78" font-family="sans-serif" font-size="18">${esc(note)} Echoes Beyond Earth</text></svg>`;
}

const BAND_TEXT: Record<LearnerBand, { title: { en: string; bn: string }; age: { en: string; bn: string }; note: { en: string; bn: string } }> = {
  junior: { title: { en: "Junior Explorer", bn: "জুনিয়র এক্সপ্লোরার" }, age: { en: "about 8–12", bn: "প্রায় ৮–১২" }, note: { en: "Shorter explanations, earlier hints", bn: "ছোট ব্যাখ্যা, আগে আগে সাহায্য" } },
  young: { title: { en: "Young Scientist", bn: "তরুণ বিজ্ঞানী" }, age: { en: "about 13–17", bn: "প্রায় ১৩–১৭" }, note: { en: "Evidence comparisons, cause and effect", bn: "প্রমাণ তুলনা, কারণ ও ফল" } },
  research: { title: { en: "Research Explorer", bn: "গবেষক এক্সপ্লোরার" }, age: { en: "18+", bn: "১৮+" }, note: { en: "Source evaluation and uncertainty", bn: "উৎস মূল্যায়ন ও অনিশ্চয়তা" } },
};
export const bandTitle = (b: LearnerBand, lang: Lang) => BAND_TEXT[b].title[lang];

/**
 * Optional first-run onboarding. Every field is optional; nothing leaves this
 * device. The learner band changes pacing and wording, never the science.
 */
export function Onboarding({ lang, settings, reducedMotion, onLang, onReducedMotion, on2d, onDone }: {
  lang: Lang; settings: GameSettings; reducedMotion: boolean;
  onLang: (l: Lang) => void; onReducedMotion: (v: boolean) => void; on2d: () => void;
  onDone: (patch: Partial<GameSettings>) => void;
}) {
  const [name, setName] = useState(settings.displayName);
  const [band, setBand] = useState<LearnerBand | null>(settings.learnerBand);
  const [large, setLarge] = useState(settings.subtitles === "large");
  const [twoD, setTwoD] = useState(false);
  const bn = lang === "bn";
  const finish = (skip: boolean) => {
    if (twoD && !skip) on2d();
    onDone(skip ? { onboarded: true } : { onboarded: true, displayName: sanitizeDisplayName(name), learnerBand: band, subtitles: large ? "large" : "normal" });
  };
  return (
    <Modal label={bn ? "অভিযানের প্রস্তুতি" : "Mission setup"} onClose={() => finish(true)} wide>
      <header className="ll-panel__head">
        <div>
          <p className="ll-kicker ll-kicker--signal">{bn ? "ঐচ্ছিক · শুধু এই ডিভাইসে সংরক্ষিত" : "Optional · saved only on this device"}</p>
          <h2>{bn ? "অভিযানের প্রস্তুতি" : "Mission setup"}</h2>
        </div>
      </header>
      <div className="ll-onboard" data-testid="onboarding">
        <fieldset>
          <legend>{bn ? "ভাষা" : "Language"}</legend>
          <div className="ll-choices" role="radiogroup" aria-label={bn ? "ভাষা" : "Language"}>
            <button type="button" role="radio" aria-checked={lang === "en"} className={`ll-choice ${lang === "en" ? "is-selected" : ""}`} onClick={() => onLang("en")}>English</button>
            <button type="button" role="radio" aria-checked={lang === "bn"} className={`ll-choice ${lang === "bn" ? "is-selected" : ""}`} onClick={() => onLang("bn")}>বাংলা</button>
          </div>
        </fieldset>
        <label className="ll-field">
          <span>{bn ? "সনদে দেখানোর নাম (ঐচ্ছিক)" : "Name for your certificate (optional)"}</span>
          <input type="text" value={name} maxLength={32} autoComplete="off" onChange={(e) => setName(e.target.value)} placeholder={bn ? "অতিথি এক্সপ্লোরার" : "Guest explorer"} />
        </label>
        <fieldset>
          <legend>{bn ? "শেখার ধাপ (ঐচ্ছিক) — বিজ্ঞান একই থাকে, শুধু ব্যাখ্যার ধরন বদলায়" : "Learning level (optional): the science stays the same, only the pacing and wording change"}</legend>
          <div className="ll-bands" role="radiogroup" aria-label={bn ? "শেখার ধাপ" : "Learning level"}>
            {LEARNER_BANDS.map((b) => (
              <button key={b} type="button" role="radio" aria-checked={band === b} data-band={b} className={`ll-choice ll-band ${band === b ? "is-selected" : ""}`} onClick={() => setBand(b)}>
                <strong>{BAND_TEXT[b].title[lang]}</strong><small>{BAND_TEXT[b].age[lang]} · {BAND_TEXT[b].note[lang]}</small>
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>{bn ? "নিয়ন্ত্রণ ও প্রবেশযোগ্যতা" : "Controls and accessibility"}</legend>
          <label className="ll-toggle"><input type="checkbox" checked={twoD} onChange={(e) => setTwoD(e.target.checked)} /><span>{bn ? "2D মিশন কনসোলে খেলো (কম GPU, কিবোর্ড ও স্ক্রিন-রিডার বান্ধব)" : "Play in the 2D mission console (low GPU, keyboard and screen-reader friendly)"}</span></label>
          <label className="ll-toggle"><input type="checkbox" checked={reducedMotion} onChange={(e) => onReducedMotion(e.target.checked)} /><span>{bn ? "কম অ্যানিমেশন" : "Reduce motion"}</span></label>
          <label className="ll-toggle"><input type="checkbox" checked={large} onChange={(e) => setLarge(e.target.checked)} /><span>{bn ? "বড় সাবটাইটেল" : "Large subtitles"}</span></label>
        </fieldset>
      </div>
      <div className="ll-actions">
        <button type="button" className="ll-btn ll-btn--primary" data-autofocus onClick={() => finish(false)} data-testid="onboarding-start">{bn ? "অভিযান শুরু" : "Start the mission"}</button>
        <button type="button" className="ll-btn" onClick={() => finish(true)} data-testid="onboarding-skip">{bn ? "বাদ দাও, অতিথি হিসেবে খেলো" : "Skip, play as guest"}</button>
      </div>
    </Modal>
  );
}

/** End of a judge preview: no certificate, stats or passport stamp, because nothing was earned. */
export function PreviewComplete({ lang, onPick, onMenu }: { lang: Lang; onPick: () => void; onMenu: () => void }) {
  return (
    <Modal label={S.previewDone[lang]} className="ll-complete">
      <p className="ll-kicker ll-kicker--signal">✦ {S.preview[lang]}</p>
      <h2 className="ll-complete__title">{lang === "bn" ? "সংকেত থেমেছে। বিজ্ঞান থেকে গেছে।" : "The signal ended. The science remained."}</h2>
      <p className="ll-muted text-sm" role="status">{S.previewDone[lang]}</p>
      <div className="ll-actions ll-actions--wrap">
        <button type="button" className="ll-btn ll-btn--primary" onClick={onPick} data-autofocus>{S.preview[lang]}</button>
        <button type="button" className="ll-btn" onClick={onMenu}>{S.previewExit[lang]}</button>
      </div>
    </Modal>
  );
}

export function CompletionScreen({ lang, progress, onReplay, onExplore, onMenu, name = "", band = null }: { lang: Lang; progress: GameProgress; onReplay: () => void; onExplore: () => void; onMenu: () => void; name?: string; band?: LearnerBand | null }) {
  const [downloaded, setDownloaded] = useState(false);
  const xp = levelXp(progress);
  const lv = levelOf(xp);
  const minutes = Math.round(progress.stats.seconds / 60);
  const download = () => {
    const blob = new Blob([certificateSvg(lang, progress, name)], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "the-last-light-certificate.svg";
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    setDownloaded(true);
  };
  return (
    <Modal label={S.missionComplete[lang]} wide className="ll-complete">
      <p className="ll-kicker ll-kicker--signal">✦ {S.missionComplete[lang]}</p>
      <h2 className="ll-complete__title">{lang === "bn" ? "সংকেত থেমেছে। বিজ্ঞান থেকে গেছে।" : "The signal ended. The science remained."}</h2>
      <dl className="ll-stats">
        <div><dt>{S.level[lang]}</dt><dd>{lv.level + 1} · {LEVELS[lv.level].title[lang]}</dd></div>
        <div><dt>XP</dt><dd>{xp}</dd></div>
        <div><dt>{S.inventory[lang]}</dt><dd>{evidenceOf(progress).length}</dd></div>
        <div><dt>{lang === "bn" ? "হাঁটা পথ" : "Distance walked"}</dt><dd>{(progress.stats.distance / 1000).toFixed(2)} km</dd></div>
        <div><dt>{lang === "bn" ? "সময়" : "Play time"}</dt><dd>{minutes} min</dd></div>
        <div><dt>{S.achievements[lang]}</dt><dd>{progress.achievements.length}/{ACHIEVEMENTS.length}</dd></div>
      </dl>
      <section className="ll-learning" aria-labelledby="ll-learning-title">
        <h3 id="ll-learning-title" className="ll-kicker">{lang === "bn" ? "তোমার শেখার রেকর্ড (শুধু এই ডিভাইসে)" : "Your learning record (this device only)"}</h3>
        <ul>
          {learningRecord(progress).map((r) => (
            <li key={r.puzzle}>
              <strong>{PUZZLE_BY_ID.get(r.puzzle)?.title[lang]}</strong>
              <span className={`ll-learning__tag ${r.firstTry ? "is-first" : ""}`}>
                {!r.solved ? (lang === "bn" ? "বাকি" : "Not yet") : r.firstTry ? (lang === "bn" ? "✓ প্রথম চেষ্টায়" : "✓ First try") : (lang === "bn" ? "↻ সূত্র দেখে" : "↻ After hints")}
              </span>
              <small>{LEARNING_GOALS[r.puzzle]?.[lang]}</small>
            </li>
          ))}
        </ul>
      </section>
      <p className="ll-muted text-sm">{lang === "bn" ? "তোমার এক্সপ্লোরার পাসপোর্টে অপরচুনিটি যুক্ত হয়েছে। খেলার জগৎ শিল্পিত; প্রতিটি ঐতিহাসিক তথ্যের NASA সূত্র জার্নালে আছে।" : "Opportunity has been added to your Explorer Passport. The game world is artistic; every historical fact's NASA source is in the journal."}</p>
      <div className="ll-actions ll-actions--wrap">
        <button type="button" className="ll-btn ll-btn--primary" onClick={download} data-autofocus>{S.certificate[lang]}</button>
        <button type="button" className="ll-btn" data-testid="learning-summary" onClick={() => {
          const blob = new Blob([learningSummaryHtml(progress, { lang, name, band })], { type: "text/html" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = "the-last-light-learning-summary.html"; a.click();
          window.setTimeout(() => URL.revokeObjectURL(url), 2000);
        }}>{lang === "bn" ? "শেখার সারসংক্ষেপ (প্রিন্টযোগ্য)" : "Learning summary (printable)"}</button>
        <Link prefetch={false} href="/passport/" className="ll-btn">{S.passport[lang]} →</Link>
        <button type="button" className="ll-btn" onClick={onExplore}>{S.explore[lang]}</button>
        <button type="button" className="ll-btn" onClick={onReplay}>{S.replay[lang]}</button>
        <button type="button" className="ll-btn" onClick={onMenu}>{S.saveExit[lang]}</button>
      </div>
      {downloaded && <p role="status" className="ll-muted text-xs mt-2">{lang === "bn" ? "সনদ ডাউনলোড হয়েছে (কোনো নাম সংগ্রহ করা হয়নি)।" : "Certificate downloaded (no name collected)."}</p>}
    </Modal>
  );
}

export function Confirm({ lang, text, onYes, onNo }: { lang: Lang; text: string; onYes: () => void; onNo: () => void }) {
  return (
    <Modal label={text} onClose={onNo}>
      <p className="ll-intro">{text}</p>
      <div className="ll-actions">
        <button type="button" className="ll-btn" onClick={onNo} data-autofocus>{S.cancel[lang]}</button>
        <button type="button" className="ll-btn ll-btn--primary" onClick={onYes}>{S.yes[lang]}</button>
      </div>
    </Modal>
  );
}
