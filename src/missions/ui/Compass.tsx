"use client";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { Body, CatalogObject, Chapter } from "../core/types";
import { arcDegrees, distanceKm, formatLatLon, fromMap, localizeDigits, starsFor, toMap } from "../core/geo";
import { MAP_IMG } from "./data";
import { Stars } from "./parts";
import { useM } from "./strings";

const LON_LINES = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];
const LAT_LINES = [-60, -30, 0, 30, 60];

function Marker({ lat, lon, kind }: { lat: number; lon: number; kind: "pin" | "truth" }) {
  const p = toMap(lat, lon);
  return (
    <div
      className="pointer-events-none absolute z-10"
      style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, transform: "translate(-50%, -50%)" }}
      aria-hidden
    >
      {kind === "pin" ? (
        <svg width="26" height="34" viewBox="0 0 26 34" style={{ transform: "translateY(-14px)" }}>
          <path d="M13 33 C13 33 2 20 2 12 A11 11 0 0 1 24 12 C24 20 13 33 13 33Z" fill="#f08a3c" stroke="#fff" strokeWidth="2" />
          <circle cx="13" cy="12" r="4" fill="#fff" />
        </svg>
      ) : (
        <span className="relative flex h-6 w-6 items-center justify-center">
          <span className="pulse-ring absolute inset-0 rounded-full bg-signal" />
          <span className="relative h-4 w-4 rotate-45 border-2 border-void bg-signal" />
        </span>
      )}
    </div>
  );
}

export function Compass({
  chapter, object, onDone,
}: {
  chapter: Chapter;
  object: CatalogObject;
  onDone: (stars: number, hints: number) => void;
}) {
  const { m, l, lang } = useM();
  const body: Body = chapter.body;
  const truth = { lat: object.lat ?? 0, lon: object.lon ?? 0 };
  const [zoom, setZoom] = useState(1);
  const [pin, setPin] = useState<{ lat: number; lon: number } | null>(null);
  const [hints, setHints] = useState(0);
  const [result, setResult] = useState<{ arc: number; km: number; stars: number } | null>(null);
  const [latTxt, setLatTxt] = useState("");
  const [lonTxt, setLonTxt] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  const setPinSafe = (lat: number, lon: number) => {
    if (result) return;
    setPin({ lat, lon });
    setLatTxt(lat.toFixed(1)); setLonTxt(lon.toFixed(1));
  };
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const r = inner.current!.getBoundingClientRect();
    const p = fromMap((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    setPinSafe(p.lat, p.lon);
  };
  const fromInputs = (la: string, lo: string) => {
    setLatTxt(la); setLonTxt(lo);
    const a = Number(la), b = Number(lo);
    if (la.trim() && lo.trim() && Number.isFinite(a) && Number.isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180) setPin({ lat: a, lon: b });
  };

  // keep the pin (or the centre) in view when zooming
  useEffect(() => {
    const s = scroller.current, i = inner.current;
    if (!s || !i) return;
    const target = pin ? toMap(pin.lat, pin.lon) : { x: 0.5, y: 0.5 };
    s.scrollLeft = target.x * i.clientWidth - s.clientWidth / 2;
    s.scrollTop = target.y * i.clientHeight - s.clientHeight / 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  const check = () => {
    if (!pin) return;
    const arc = arcDegrees(pin.lat, pin.lon, truth.lat, truth.lon);
    const km = Math.round(distanceKm(body, pin.lat, pin.lon, truth.lat, truth.lon));
    setResult({ arc, km, stars: starsFor(arc) });
    setZoom(1);
  };
  const name = object.name.replace(/\([^)]*\)/g, "").split(/[^\x00-\x7FÀ-ɏ–’]/)[0].trim() || object.id;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div>
        <p className="mb-3 text-lunar-2">{m("cmp.prompt", { name })}</p>
        <div className="relative border border-hairline-strong bg-void-3">
          <div ref={scroller} className="max-h-[70svh] overflow-auto" tabIndex={0} aria-label={m(body === "moon" ? "cmp.world.moon" : "cmp.world.mars")}>
            <div
              ref={inner}
              onClick={onClick}
              className="relative cursor-crosshair select-none"
              style={{ width: `${zoom * 100}%`, aspectRatio: "2 / 1", backgroundImage: `url(${MAP_IMG[body]})`, backgroundSize: "100% 100%" }}
            >
              <svg viewBox="0 0 360 180" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
                {LON_LINES.map((x) => <line key={x} x1={x + 180} x2={x + 180} y1="0" y2="180" stroke="#fff" strokeOpacity={x === 0 ? 0.35 : 0.16} strokeWidth="0.3" vectorEffect="non-scaling-stroke" />)}
                {LAT_LINES.map((y) => <line key={y} y1={90 - y} y2={90 - y} x1="0" x2="360" stroke="#fff" strokeOpacity={y === 0 ? 0.35 : 0.16} strokeWidth="0.3" vectorEffect="non-scaling-stroke" />)}
                {result && pin && <line x1={pin.lon + 180} y1={90 - pin.lat} x2={truth.lon + 180} y2={90 - truth.lat} stroke="#63e6ef" strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />}
              </svg>
              {LON_LINES.filter((_, i) => i % 2 === 0).map((x) => <span key={x} className="pointer-events-none absolute bottom-0 -translate-x-1/2 bg-black/50 px-1 font-mono text-[9px] text-lunar-2" style={{ left: `${((x + 180) / 360) * 100}%` }}>{localizeDigits(`${Math.abs(x)}°${x < 0 ? "W" : x > 0 ? "E" : ""}`, lang)}</span>)}
              {LAT_LINES.map((y) => <span key={y} className="pointer-events-none absolute left-0 -translate-y-1/2 bg-black/50 px-1 font-mono text-[9px] text-lunar-2" style={{ top: `${((90 - y) / 180) * 100}%` }}>{localizeDigits(`${Math.abs(y)}°${y < 0 ? "S" : y > 0 ? "N" : ""}`, lang)}</span>)}
              {pin && <Marker lat={pin.lat} lon={pin.lon} kind="pin" />}
              {result && <Marker lat={truth.lat} lon={truth.lon} kind="truth" />}
            </div>
          </div>
          <div className="absolute right-2 top-2 z-20 flex flex-col gap-1">
            {[1, 2, 4].map((z) => (
              <button key={z} type="button" aria-pressed={zoom === z} onClick={() => setZoom(z)} className={`btn-ghost !px-3 !py-1.5 ${zoom === z ? "" : "bg-black/60"}`} aria-label={`${m("cmp.zoom")} ×${z}`}>×{z}</button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-[11px] text-dust">NASA/GSFC/ASU · NASA/JPL-Caltech/USGS (Moon Trek · Mars Trek)</p>
      </div>

      <aside className="space-y-4">
        <div className="border border-hairline-strong bg-void-2/80 p-4">
          <p className="label mb-2">{m("cmp.keyboard")}</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-dust">{m("cmp.lat")}
              <input inputMode="decimal" value={latTxt} disabled={!!result} onChange={(e) => fromInputs(e.target.value, lonTxt)} className="mt-1 w-full border border-hairline-strong bg-void px-2 py-2 font-mono text-[13px] text-lunar" />
            </label>
            <label className="text-[11px] text-dust">{m("cmp.lon")}
              <input inputMode="decimal" value={lonTxt} disabled={!!result} onChange={(e) => fromInputs(latTxt, e.target.value)} className="mt-1 w-full border border-hairline-strong bg-void px-2 py-2 font-mono text-[13px] text-lunar" />
            </label>
          </div>
          <p className="mt-3 font-mono text-[12px] text-lunar-2" aria-live="polite">{pin ? m("cmp.pinAt", { pos: formatLatLon(pin.lat, pin.lon, lang, 1) }) : m("cmp.noPin")}</p>
          {!result && <button type="button" className="btn-signal mt-3 w-full justify-center disabled:opacity-40" disabled={!pin} onClick={check}>{m("cmp.check")}</button>}
        </div>

        {!result && (
          <div className="space-y-2">
            {[1, 2].map((n) => hints >= n ? (
              <p key={n} className="border-l-2 border-caution bg-void-2/80 p-3 text-[14px] text-lunar-2"><span className="label mr-2 !text-caution">{m("cmp.hintShown", { n })}</span>{l(n === 1 ? chapter.hint1 : chapter.hint2)}</p>
            ) : (
              <button key={n} type="button" className="btn-ghost w-full justify-center" disabled={hints !== n - 1} onClick={() => setHints(n)}>💡 {m("cmp.hint", { n })}</button>
            ))}
          </div>
        )}

        {result && (
          <div className="space-y-3 border border-signal/50 bg-void-2/90 p-4" role="status">
            <Stars n={result.stars} size={26} />
            <p className="font-display text-lg text-lunar">{m(`cmp.result.${result.stars}` as "cmp.result.0")}</p>
            <p className="text-[13px] text-lunar-2">{m("cmp.result.off", { km: localizeDigits(result.km.toLocaleString("en-US"), lang) })}</p>
            <p className="font-mono text-[12px] text-lunar-2">{m("cmp.truth")}: {formatLatLon(truth.lat, truth.lon, lang)}</p>
            {object.precision !== "reported" && <p className="text-[12px] text-caution">{m("cmp.result.approxNote")}</p>}
            <button type="button" className="btn-signal w-full justify-center" onClick={() => onDone(result.stars, hints)}>{m("cmp.continue")} →</button>
          </div>
        )}
      </aside>
    </div>
  );
}
