"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useT } from "@/lib/i18n";
import { ROVERS, ROVER_STORAGE_KEY, localized, sanitizeRoverProgress, type RoverDefinition, type RoverId, type RoverPartId, type RoverProgress } from "@/game/rovers/registry";
import { RoverModel } from "./RoverModel";

type View = "mission" | "inspect" | "evolution";
const INITIAL: RoverProgress = { completed: [], parts: {}, missions: {} };
const TARGETS: Record<RoverId, [number, number]> = { sojourner: [4, 2], spirit: [5, 4], opportunity: [5, 2], curiosity: [2, 5], perseverance: [5, 5] };
const OBSTACLES = new Set(["1,1", "2,1", "3,3", "4,3", "2,4", "3,5"]);
const STEP_SPEED: Record<RoverId, number> = { sojourner: 0.01, spirit: 0.05, opportunity: 0.05, curiosity: 0.09, perseverance: 0.12 };
const MILESTONES = ["Sojourner", "Spirit", "Opportunity", "Curiosity", "Perseverance"] as const;

function actionKey(event: KeyboardEvent, move: (dx: number, dy: number) => void) {
  const movements: Record<string, [number, number]> = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };
  const vector = movements[event.key];
  if (vector) { event.preventDefault(); move(...vector); }
}

export function RoverLegacy() {
  const { lang } = useT();
  const bn = lang === "bn";
  const t = useMemo(() => (en: string, bd: string) => bn ? bd : en, [bn]);
  const [selected, setSelected] = useState<RoverId>("opportunity");
  const [view, setView] = useState<View>("mission");
  const [progress, setProgress] = useState<RoverProgress>(INITIAL);
  const [hydrated, setHydrated] = useState(false);
  const [part, setPart] = useState<RoverPartId | null>(null);
  const [drive, setDrive] = useState<[number, number]>([0, 0]);
  const [driveMessage, setDriveMessage] = useState("");
  const [answer, setAnswer] = useState<number | null>(null);
  const [compare, setCompare] = useState<RoverId>("perseverance");
  const rover = ROVERS.find((item) => item.id === selected)!;
  const roverCompare = ROVERS.find((item) => item.id === compare)!;
  const mission = progress.missions[selected] ?? { drive: false, activity: false, answer: false };
  const inspected = progress.parts[selected] ?? [];
  const target = TARGETS[selected];
  const completed = progress.completed.includes(selected);
  const doneCount = [mission.drive, inspected.length > 0, mission.activity, mission.answer].filter(Boolean).length;
  const labels = {
    mission: t("MISSION CONTROL", "মিশন কন্ট্রোল"), inspect: t("HARDWARE LAB", "হার্ডওয়্যার ল্যাব"), evolution: t("EVOLUTION LAB", "বিবর্তন ল্যাব"),
  };

  useEffect(() => {
    try { setProgress(sanitizeRoverProgress(JSON.parse(localStorage.getItem(ROVER_STORAGE_KEY) || "null"))); }
    catch { setProgress(INITIAL); }
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) localStorage.setItem(ROVER_STORAGE_KEY, JSON.stringify(progress)); }, [progress, hydrated]);
  useEffect(() => { setDrive([0, 0]); setDriveMessage(""); setAnswer(null); setPart(null); }, [selected]);

  function updateMission(key: "drive" | "activity" | "answer") {
    setProgress((current) => {
      const missions = { ...current.missions, [selected]: { ...(current.missions[selected] ?? { drive: false, activity: false, answer: false }), [key]: true } };
      const parts = current.parts[selected] ?? [];
      const next = missions[selected]!;
      const isComplete = next.drive && next.activity && next.answer && parts.length > 0;
      return { ...current, missions, completed: isComplete ? [...new Set([...current.completed, selected])] : current.completed };
    });
  }
  function markPart(id: RoverPartId) {
    setPart(id);
    setProgress((current) => {
      const parts = [...new Set([...(current.parts[selected] ?? []), id])];
      const missionState = current.missions[selected] ?? { drive: false, activity: false, answer: false };
      const isComplete = missionState.drive && missionState.activity && missionState.answer && parts.length > 0;
      return { ...current, parts: { ...current.parts, [selected]: parts }, completed: isComplete ? [...new Set([...current.completed, selected])] : current.completed };
    });
  }
  function move(dx: number, dy: number) {
    if (mission.drive) return;
    const [x, y] = drive;
    const nx = Math.max(0, Math.min(6, x + dx)), ny = Math.max(0, Math.min(6, y + dy));
    if (nx === x && ny === y) { setDriveMessage(t("Boundary reached. Choose another direction.", "সীমানায় পৌঁছেছ। অন্য দিক বেছে নাও।")); return; }
    if (OBSTACLES.has(`${nx},${ny}`)) { setDriveMessage(t("Loose-rock hazard: route around it.", "আলগা পাথরের ঝুঁকি: অন্য পথ নাও।")); return; }
    setDrive([nx, ny]); setDriveMessage("");
    if (nx === target[0] && ny === target[1]) { updateMission("drive"); setDriveMessage(t("Target reached. Route complete.", "লক্ষ্যে পৌঁছেছ। পথ সম্পূর্ণ।")); }
  }

  const missionNames = ["SOJOURNER / BEGINNING", "SPIRIT / JOURNEY", "OPPORTUNITY / LAST LIGHT", "CURIOSITY / ANCIENT MARS", "PERSEVERANCE / NEXT GENERATION"];
  return (
    <main className="rover-legacy" id="main">
      <div className="rover-legacy__grid" aria-hidden="true" />
      <header className="rover-legacy__header container-x">
        <Link href="/play/" className="rover-back">← {t("MARS EXPLORATION", "মঙ্গল অনুসন্ধান")}</Link>
        <div className="label">{t("THE ROVER LEGACY · 1997—2026", "রোভার লিগ্যাসি · ১৯৯৭—২০২৬")}</div>
      </header>
      <section className="rover-intro container-x">
        <div className="rover-intro__copy">
          <p className="label text-signal">{t("FIVE GENERATIONS · ONE RED PLANET", "পাঁচ প্রজন্ম · একটি লাল গ্রহ")}</p>
          <h1>{t("Echoes beyond\nearth", "পৃথিবীর সীমানা\nছাড়িয়ে প্রতিধ্বনি")}</h1>
          <p>{t("Five real Mars rovers. Five distinct scientific missions. Drive an educational scenario, investigate evidence, and explore how each generation changed what we could learn.", "মঙ্গলের পাঁচটি বাস্তব রোভার। পাঁচটি আলাদা বৈজ্ঞানিক মিশন। শিক্ষামূলক পরিস্থিতিতে চালাও, প্রমাণ পরীক্ষা করো, আর দেখো প্রতিটি প্রজন্ম আমাদের শেখার সুযোগ কীভাবে বদলেছে।")}</p>
          <div className="rover-honesty">{t("SCIENTIFIC RECORD · SIMULATED ACTIVITIES ARE LABELED · NO LIVE TELEMETRY", "বৈজ্ঞানিক রেকর্ড · সিমুলেশন স্পষ্টভাবে চিহ্নিত · লাইভ টেলিমেট্রি নয়")}</div>
        </div>
        <div className="rover-era">{ROVERS.map((item, i) => <button key={item.id} type="button" onClick={() => { setSelected(item.id); setView("mission"); }} className={item.id === selected ? "is-current" : ""} aria-label={`${item.name}, ${item.year}`}><span>{String(i + 1).padStart(2, "0")}</span><b>{item.name}</b><small>{item.year}</small></button>)}</div>
      </section>

      <section className="rover-selector container-x" aria-label={t("Select a rover", "রোভার বেছে নাও")}>
        {ROVERS.map((item, i) => <button type="button" key={item.id} className={`rover-selector__item ${item.id === selected ? "is-selected" : ""} ${progress.completed.includes(item.id) ? "is-complete" : ""}`} onClick={() => setSelected(item.id)} aria-pressed={item.id === selected}>
          <span className="rover-selector__index">0{i + 1} / {String(item.year).slice(2)}</span><strong>{item.name}</strong><span>{localized(item.landing, lang)}</span><small>{progress.completed.includes(item.id) ? t("MISSION COMPLETE", "মিশন সম্পূর্ণ") : localized(item.status, lang)}</small>
        </button>)}
      </section>

      <section className="rover-workspace container-x" aria-labelledby="rover-name">
        <div className="rover-workspace__top"><div><p className="label">{labels[view]} · {missionNames[ROVERS.findIndex((r) => r.id === selected)]}</p><h2 id="rover-name">{rover.name}<span> / {rover.year}</span></h2><p className="rover-theme">{localized(rover.theme, lang)}</p></div>
          <nav className="rover-tabs" aria-label={t("Rover experience", "রোভার অভিজ্ঞতা")}>
            {(["mission", "inspect", "evolution"] as const).map((key) => <button type="button" key={key} onClick={() => setView(key)} aria-pressed={view === key}>{key === "mission" ? t("MISSION", "মিশন") : key === "inspect" ? t("INSPECT", "পরিদর্শন") : t("COMPARE", "তুলনা")}</button>)}
          </nav>
        </div>

        {view === "evolution" ? <EvolutionLab rover={rover} compare={roverCompare} setCompare={setCompare} lang={lang} /> : <div className="rover-main-grid">
          <div className="rover-visual">
            <RoverModel rover={rover} lang={lang} part={view === "inspect" ? part : null} />
            <div className="rover-model-credit"><span>{rover.model.kind === "nasa" ? t("NASA MODEL", "NASA মডেল") : t("RECONSTRUCTION", "পুনর্নির্মাণ")}</span><a href={rover.model.source} target="_blank" rel="noreferrer">{rover.model.credit} ↗</a></div>
            <div className="rover-interaction-hint">{t("Drag to rotate · Scroll / pinch to zoom · Tap hardware labels to inspect", "ঘোরাতে ড্র্যাগ · জুম করতে স্ক্রল / পিঞ্চ · যন্ত্রাংশ দেখতে লেবেলে চাপ দাও")}</div>
          </div>
          <aside className="rover-info">
            <div className="rover-factline"><span>{t("LANDING SITE", "অবতরণস্থল")}</span><strong>{localized(rover.landing, lang)}</strong></div>
            <div className="rover-factline"><span>{t("POWER", "শক্তি")}</span><strong>{localized(rover.power, lang)}</strong></div>
            <div className="rover-factline"><span>{t("MASS", "ভর")}</span><strong>{rover.massKg.toLocaleString(bn ? "bn-BD" : "en-US")} kg</strong></div>
            <div className="rover-story"><span className="label">{t("WHY THIS ROVER", "এই রোভার কেন")}</span><p>{localized(rover.mission, lang)}</p></div>
            <div className="rover-story rover-story--discovery"><span className="label">{t("EVIDENCE / DISCOVERY", "প্রমাণ / আবিষ্কার")}</span><p>{localized(rover.discovery, lang)}</p></div>
            <a className="rover-source-link" href={rover.source.url} target="_blank" rel="noreferrer">{rover.source.label} ↗</a>
          </aside>
        </div>}

        {view === "inspect" && <section className="rover-part-panel" aria-labelledby="parts-heading">
          <div className="rover-panel-heading"><div><p className="label">{t("SELECT HARDWARE", "হার্ডওয়্যার বেছে নাও")}</p><h3 id="parts-heading">{t("What made this rover work", "রোভারটি কীভাবে কাজ করত")}</h3></div><span>{inspected.length}/{rover.parts.length} {t("inspected", "দেখা হয়েছে")}</span></div>
          <div className="rover-part-buttons">{rover.parts.map((item, index) => <button type="button" key={item.id} aria-pressed={part === item.id} onClick={() => markPart(item.id)}><span>0{index + 1}</span><strong>{localized(item.name, lang)}</strong><small>{inspected.includes(item.id) ? t("INSPECTED ✓", "দেখা হয়েছে ✓") : t("SELECT TO INSPECT", "দেখতে চাপ দাও")}</small></button>)}</div>
          {part && <article className="rover-part-detail" aria-live="polite"><p className="label">{t("COMPONENT BRIEF", "যন্ত্রাংশের পরিচিতি")}</p><h4>{localized(rover.parts.find((item) => item.id === part)!.name, lang)}</h4><p>{localized(rover.parts.find((item) => item.id === part)!.role, lang)}</p><div>{rover.parts.find((item) => item.id === part)!.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a>)}</div></article>}
        </section>}

        {view === "mission" && <section className="rover-mission" aria-labelledby="objective-heading">
          <div className="rover-mission__head"><div><p className="label">{t("EDUCATIONAL SCENARIO · NOT HISTORICAL TELEMETRY", "শিক্ষামূলক সিমুলেশন · ঐতিহাসিক টেলিমেট্রি নয়")}</p><h3 id="objective-heading">{t("Field science assignment", "মাঠ-বিজ্ঞানের কাজ")}</h3></div><div className="rover-progress"><strong>{doneCount}/4</strong><span>{completed ? t("COMPLETE", "সম্পূর্ণ") : t("OBJECTIVES", "কাজ")}</span></div></div>
          <div className="rover-mission-grid">
            <section className="rover-drive" aria-labelledby="drive-heading">
              <div className="rover-card-title"><span>01 / DRIVE</span><h4 id="drive-heading">{t("Reach the science target", "বিজ্ঞান লক্ষ্যে পৌঁছাও")}</h4></div>
              <p>{localized(rover.activity.instruction, lang)}</p>
              <div className="rover-map" tabIndex={0} role="application" aria-label={t("Educational rover driving grid. Use arrow or WASD keys.", "শিক্ষামূলক রোভার চালানোর গ্রিড। অ্যারো বা WASD চাপো।")} onKeyDown={(event) => actionKey(event, move)}>
                {Array.from({ length: 49 }, (_, cell) => { const x = cell % 7, y = Math.floor(cell / 7), rock = OBSTACLES.has(`${x},${y}`), here = drive[0] === x && drive[1] === y, goal = target[0] === x && target[1] === y; return <span key={cell} className={`rover-map__cell ${rock ? "is-rock" : ""} ${goal ? "is-target" : ""} ${here ? "is-rover" : ""}`} aria-hidden>{here ? "◆" : rock ? "▪" : goal ? "◎" : ""}</span>; })}
              </div>
              <div className="rover-drive-controls"><button aria-label={t("Move up", "সামনে যাও")} onClick={() => move(0, -1)}>↑</button><div><button aria-label={t("Move left", "বামে যাও")} onClick={() => move(-1, 0)}>←</button><button aria-label={t("Move down", "পেছনে যাও")} onClick={() => move(0, 1)}>↓</button><button aria-label={t("Move right", "ডানে যাও")} onClick={() => move(1, 0)}>→</button></div><small>{t("STEP SPEED", "ধাপের গতি")} · {STEP_SPEED[selected].toFixed(2)} m/s</small></div>
              <p className="rover-feedback" role="status">{mission.drive ? t("Route complete · target reached", "পথ সম্পূর্ণ · লক্ষ্যে পৌঁছেছ") : driveMessage || t("WASD / arrows or touch controls · avoid dark rock hazards", "WASD / অ্যারো বা স্পর্শ নিয়ন্ত্রণ · কালো পাথর এড়াও")}</p>
            </section>
            <section className="rover-science-activity"><div className="rover-card-title"><span>02 / SCIENCE</span><h4>{t("Operate a mission instrument", "মিশনের যন্ত্র চালাও")}</h4></div><p>{localized(rover.activity.instruction, lang)}</p><button type="button" className="rover-action" disabled={!mission.drive || mission.activity} onClick={() => updateMission("activity")}>{mission.activity ? t("SCIENCE ACTIVITY COMPLETE ✓", "বিজ্ঞান কার্যক্রম সম্পূর্ণ ✓") : localized(rover.activity.action, lang)}</button>{mission.activity && <p className="rover-result">{localized(rover.activity.result, lang)}</p>}<small>{!mission.drive ? t("First complete the drive route.", "আগে চালানোর পথ শেষ করো।") : ""}</small></section>
            <section className="rover-science-quiz"><div className="rover-card-title"><span>03 / ANALYZE</span><h4>{t("Read the evidence", "প্রমাণ পড়ো")}</h4></div><p>{localized(rover.challenge, lang)}</p><div className="rover-options">{rover.options.map((option, index) => <button key={index} type="button" disabled={mission.answer} className={answer === index ? (index === rover.answer ? "is-correct" : "is-wrong") : ""} onClick={() => { setAnswer(index); if (index === rover.answer) updateMission("answer"); }}>{String.fromCharCode(65 + index)} · {localized(option, lang)}</button>)}</div>{mission.answer ? <p className="rover-result">{t("Correct. The source record is linked below.", "সঠিক। নিচে মূল উৎস দেওয়া হয়েছে।")}</p> : answer !== null && <p className="rover-feedback" role="status">{t("Not quite — reconsider what the instrument or evidence can actually show.", "সঠিক নয় — যন্ত্র বা প্রমাণটি আসলে কী দেখাতে পারে, তা আবার ভাবো।")}</p>}</section>
          </div>
          <div className="rover-objectives" aria-label={t("Mission objectives", "মিশনের কাজ")}><span className={mission.drive ? "is-done" : ""}>01 {t("DRIVE", "চালনা")}</span><span className={inspected.length ? "is-done" : ""}>02 {t("INSPECT HARDWARE", "যন্ত্রাংশ দেখো")}</span><span className={mission.activity ? "is-done" : ""}>03 {t("RUN SCIENCE", "বিজ্ঞান চালাও")}</span><span className={mission.answer ? "is-done" : ""}>04 {t("SOLVE CHALLENGE", "প্রশ্ন সমাধান")}</span></div>
          {completed && <div className="rover-complete" role="status"><span>✳</span><div><strong>{t("Mission record recovered", "মিশনের নথি উদ্ধার হয়েছে")}</strong><p>{t("Your rover-specific learning progress has been saved on this device.", "এই ডিভাইসে রোভার-নির্দিষ্ট শেখার অগ্রগতি সংরক্ষিত হয়েছে।")}</p></div></div>}
        </section>}
      </section>

      <section className="rover-history container-x"><div><p className="label">{t("MISSION RECORD", "মিশনের নথি")}</p><h2>{t("A timeline of discoveries", "আবিষ্কারের সময়রেখা")}</h2></div><ol>{rover.timeline.map((entry) => <li key={entry.date}><span>{entry.date}</span><p>{localized(entry.text, lang)}</p></li>)}</ol></section>
      <footer className="rover-footer container-x"><p>{t("Independent educational experience. NASA source attribution; no NASA sponsorship or endorsement implied. Scenarios and the Sojourner reconstruction are illustrative.", "স্বতন্ত্র শিক্ষামূলক অভিজ্ঞতা। NASA উৎসের স্বীকৃতি দেওয়া হয়েছে; NASA-এর পৃষ্ঠপোষকতা বা অনুমোদনের দাবি নেই। সিমুলেশন ও সোজার্নার পুনর্নির্মাণ শিক্ষামূলক চিত্রায়ন।")}</p><Link href="/play/game/">{t("Return to The Last Light campaign", "দ্য লাস্ট লাইট অভিযানে ফেরো")} ↗</Link></footer>
    </main>
  );
}

function EvolutionLab({ rover, compare, setCompare, lang }: { rover: RoverDefinition; compare: RoverDefinition; setCompare: (id: RoverId) => void; lang: "en" | "bn" }) {
  const t = (en: string, bd: string) => lang === "bn" ? bd : en;
  const maxDistance = 46;
  return <section className="rover-evolution" aria-labelledby="evolution-heading">
    <div className="rover-evolution__intro"><div><p className="label">{t("ENGINEERING TRADE-OFFS · NOT A SCORE", "প্রকৌশলগত পার্থক্য · কোনো স্কোর নয়")}</p><h3 id="evolution-heading">{t("Different missions. Different machines.", "আলাদা মিশন। আলাদা যন্ত্র।")}</h3></div><p>{t("Distance is one measure, not a universal measure of scientific success. Compare mission design, power, scale and context.", "দূরত্ব একটি পরিমাপ, বৈজ্ঞানিক সাফল্যের সার্বজনীন মাপকাঠি নয়। নকশা, শক্তি, আকার ও প্রেক্ষাপট তুলনা করো।")}</p></div>
    <div className="rover-distance"><div className="rover-distance__heading"><h4>{t("Driving distance on Mars", "মঙ্গলে চলার দূরত্ব")}</h4><span>{t("SNAPSHOT · 11 OCT 2026", "স্ন্যাপশট · ১১ অক্টোবর ২০২৬")}</span></div>{ROVERS.map((item) => <div className="rover-bar" key={item.id}><button type="button" onClick={() => setCompare(item.id)} aria-pressed={compare.id === item.id}>{item.name}<small>{item.year}</small></button><div className="rover-bar__track"><i style={{ width: `${Math.max(0.5, (item.distanceKm / maxDistance) * 100)}%` }} /></div><strong>{item.distanceKm.toFixed(2)} km</strong><span>{localized(item.distanceLabel, lang)}</span></div>)}<p>{t("Snapshot includes terminal distances for ended missions and the latest NASA-published values checked for active missions. Curiosity and Perseverance values are time-bound, not live telemetry.", "শেষ হওয়া মিশনের চূড়ান্ত দূরত্ব এবং সক্রিয় মিশনের জন্য NASA-প্রকাশিত সর্বশেষ দেখা মান এতে রয়েছে। কিউরিওসিটি ও পারসিভিয়ারেন্সের মান সময়-নির্দিষ্ট, লাইভ টেলিমেট্রি নয়।")} <a href="https://science.nasa.gov/photojournal/comparing-off-world-rover-driving-distances/" target="_blank" rel="noreferrer">NASA/JPL comparison ↗</a></p></div>
    <div className="rover-compare-select"><label htmlFor="rover-compare">{t("COMPARE WITH", "তুলনা করো")}</label><select id="rover-compare" value={compare.id} onChange={(event) => setCompare(event.target.value as RoverId)}>{ROVERS.filter((item) => item.id !== rover.id).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div>
    <div className="rover-compare-grid">{[rover, compare].map((item) => <article key={item.id}><p className="label">{item.year} · {item.name}</p><div className="rover-compare-model"><RoverModel rover={item} lang={lang} compact /></div><h4>{localized(item.landing, lang)}</h4><dl><div><dt>{t("Mass", "ভর")}</dt><dd>{item.massKg} kg</dd></div><div><dt>{t("Power", "শক্তি")}</dt><dd>{localized(item.power, lang)}</dd></div><div><dt>{t("Mission status", "মিশনের অবস্থা")}</dt><dd>{localized(item.status, lang)}</dd></div><div><dt>{t("Distance", "দূরত্ব")}</dt><dd>{localized(item.distanceLabel, lang)}</dd></div></dl><p>{localized(item.mission, lang)}</p><a href={item.source.url} target="_blank" rel="noreferrer">{item.source.label} ↗</a></article>)}</div>
    <div className="rover-lineup"><span>{t("SCALE CONTEXT", "আকারের প্রেক্ষাপট")}</span><div>{ROVERS.map((item) => <button key={item.id} type="button" onClick={() => setCompare(item.id)} aria-pressed={compare.id === item.id}><i style={{ height: `${Math.max(17, Math.sqrt(item.massKg) * 3.05)}px` }} /><b>{item.name}</b><small>{item.massKg} kg</small></button>)}</div><p>{t("Mass bars use the reported rover mass where available; Sojourner is 10.6 kg, MER twins ~185 kg, Curiosity 899 kg, Perseverance ~1,025 kg. Scale is illustrative and not a shared universal performance rating.", "প্রকাশিত রোভারের ভর দেখানো হয়েছে: সোজার্নার ১০.৬ কেজি, MER যমজ প্রায় ১৮৫ কেজি, কিউরিওসিটি ৮৯৯ কেজি, পারসিভিয়ারেন্স প্রায় ১,০২৫ কেজি। স্তম্ভের আকার চিত্রায়ন; সার্বজনীন কর্মক্ষমতার স্কোর নয়।")}</p></div>
  </section>;
}
