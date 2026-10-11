"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import type { EkoStopId } from "@/lib/eko-mission";
import { assetPath } from "@/lib/asset-path";

const FINAL_IMAGE = "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia22/pia22929/PIA22929.jpg?crop=faces%2Cfocalpoint&fit=clip&h=1024&w=1024";
const LAST_IMAGE_URL = "https://science.nasa.gov/photojournal/opportunitys-last-message/";
const LAST_CAPTURED_URL = "https://science.nasa.gov/photojournal/last-images-opportunity-took/";

export function EkoEvidenceGallery() {
  const { lang } = useT();
  const bn = lang === "bn";
  const [original, setOriginal] = useState<"transmitted" | "map">("transmitted");
  return (
    <section aria-labelledby="eko-evidence-gallery" className="mt-10 border border-hairline-strong bg-void-2">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline p-5">
        <div>
          <p className="label text-signal">{bn ? "বাস্তব NASA প্রমাণ" : "REAL NASA EVIDENCE"}</p>
          <h2 id="eko-evidence-gallery" className="mt-2 font-serif text-2xl italic">
            {bn ? "কল্পিত দৃশ্যের বাইরে" : "Beyond the illustration"}
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            type="button" aria-pressed={original === "transmitted"}
            onClick={() => setOriginal("transmitted")}
            className="btn-ghost !px-3 !py-2"
          >{bn ? "শেষ সংকেত" : "Final signal"}</button>
          <button
            type="button" aria-pressed={original === "map"}
            onClick={() => setOriginal("map")}
            className="btn-ghost !px-3 !py-2"
          >{bn ? "চলার মানচিত্র" : "Route map"}</button>
        </div>
      </div>
      <figure>
        <div className="relative flex aspect-[4/3] max-h-[440px] items-center justify-center overflow-hidden bg-[#090b0d]">
          {original === "transmitted" ? (
            // NASA-hosted PIA22929. We do not interpolate missing image pixels.
            <img
              src={FINAL_IMAGE}
              alt={bn ? "নাসার পাওয়া শেষ অসম্পূর্ণ Pancam ছবি; নিচের অংশে তথ্য অনুপস্থিত" : "NASA PIA22929 last transmitted partial Pancam image with missing lower data"}
              loading="lazy"
              className="h-full max-w-full object-contain"
            />
          ) : (
            <img
              src={assetPath("/images/nasa/pia23178.jpg")}
              alt={bn ? "NASA Opportunity rover-এর আসল ৪৫.১৬ কিমি যাত্রার মানচিত্র" : "NASA's original 45.16-km Opportunity rover traverse map"}
              loading="lazy"
              className="h-full max-w-full object-contain"
            />
          )}
          <span className="absolute left-4 top-4 bg-void/85 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-signal">
            {bn ? "নাসার আর্কাইভ" : "NASA ARCHIVE · ORIGINAL"}
          </span>
        </div>
        <figcaption className="p-5 text-sm leading-relaxed text-lunar-2">
          {original === "transmitted"
            ? bn
              ? "PIA22929 · ১০ জুন ২০১৮-তে প্রেরিত শেষ অসম্পূর্ণ পূর্ণ-ফ্রেম ছবি। এর কয়েক মিনিট পরে তোলা ছবির থাম্বনেইল আগে পাঠানো হয়েছিল—তাই এটিকে শেষ তোলা ছবি বলা সঠিক নয়। ক্রেডিট: NASA/JPL-Caltech/Cornell/ASU।"
              : "PIA22929 · Last partial full-frame image transmitted on June 10, 2018—not the last image captured. Thumbnails of images captured a few minutes later were also sent. Credit: NASA/JPL-Caltech/Cornell/ASU."
            : bn
              ? "PIA23178 · অপরচুনিটির শেষ যাত্রাপথ, মোট ৪৫.১৬ কিমি। ক্রেডিট: NASA/JPL-Caltech/MSSS।"
              : "PIA23178 · Opportunity's final traverse map: 45.16 km. Credit: NASA/JPL-Caltech/MSSS."}
        </figcaption>
      </figure>
      <div className="flex flex-wrap gap-4 border-t border-hairline p-5 text-xs">
        <a href={original === "transmitted" ? LAST_IMAGE_URL : "https://www.jpl.nasa.gov/images/pia23178-opportunitys-final-traverse-map/"}
          target="_blank" rel="noopener noreferrer" className="text-signal underline underline-offset-4">
          {bn ? "আসল NASA সূত্র দেখো" : "Read original NASA evidence"} ↗
        </a>
        {original === "transmitted" && (
          <a href={LAST_CAPTURED_URL} target="_blank" rel="noopener noreferrer"
            className="text-lunar-2 underline underline-offset-4">
            {bn ? "শেষ তোলা ছবিগুলো" : "See last images captured"} ↗
          </a>
        )}
        <a
          href="https://science.nasa.gov/3d-resources/mars-exploration-rover-opportunity-mer-b/"
          target="_blank" rel="noopener noreferrer" className="text-lunar-2 underline underline-offset-4">
          {bn ? "NASA-র আসল রোভার 3D মডেল" : "Inspect NASA's authentic rover GLB"} ↗
        </a>
      </div>
    </section>
  );
}

export function EkoMissionTimeline() {
  const { lang } = useT();
  const bn = lang === "bn";
  const milestones = [
    { year: "2004", en: "Opportunity landed on Mars in January.", bn: "জানুয়ারিতে অপরচুনিটি মঙ্গলে নামে।" },
    { year: "2018", en: "Last contact on June 10 during the global dust storm.", bn: "বিশ্বব্যাপী ধুলিঝড়ের সময় ১০ জুন শেষ যোগাযোগ।" },
    { year: "2019", en: "NASA announced the mission complete on February 13.", bn: "১৩ ফেব্রুয়ারি NASA মিশন শেষ ঘোষণা করে।" },
  ];
  return (
    <section aria-labelledby="eko-timeline" className="mt-10 border-t border-hairline pt-8">
      <p className="label text-signal">{bn ? "ঐতিহাসিক সময়রেখা" : "HISTORICAL TIMELINE"}</p>
      <h2 id="eko-timeline" className="mt-3 font-serif text-3xl italic">{bn ? "একটি রোভার, দীর্ঘ যাত্রা" : "90 sols became nearly 15 years"}</h2>
      <ol className="mt-7 grid gap-4 md:grid-cols-3">
        {milestones.map(m => (
          <li key={m.year} className="border-l-2 border-signal/50 bg-void-2 px-5 py-4">
            <strong className="font-mono text-2xl text-lunar">{m.year}</strong>
            <p className="mt-2 text-sm leading-relaxed text-lunar-2">{bn ? m.bn : m.en}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function EkoVoiceButton({ content }: { content: string }) {
  const { lang } = useT();
  const [available, setAvailable] = useState(false);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    setAvailable(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);
  useEffect(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    // Only cancel on content/language transitions, not on play-state changes.
    setPlaying(false);
  }, [content, lang]);
  if (!available) return null;
  const play = () => {
    const synth = window.speechSynthesis;
    if (playing) { synth.cancel(); setPlaying(false); return; }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = lang === "bn" ? "bn-BD" : "en-US";
    utterance.rate = 0.90;
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);
    synth.speak(utterance);
    setPlaying(true);
  };
  return (
    <button type="button" onClick={play} className="btn-ghost !px-3 !py-2">
      {playing ? (lang === "bn" ? "■ শোনা বন্ধ" : "■ Stop narration") : (lang === "bn" ? "▶ শুনে শেখো" : "▶ Hear this story")}
    </button>
  );
}

function xmlSafe(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export function EkoCertificate({ scanned }: { scanned: readonly EkoStopId[] }) {
  const { lang } = useT();
  const bn = lang === "bn";
  if (new Set(scanned).size !== 4) return null;
  const download = () => {
    const title = "ECHOES BEYOND EARTH";
    const subtitle = "OPPORTUNITY EXPLORER · FOUR NASA CLUES RECOVERED";
    const date = new Date().toISOString().slice(0, 10);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="780" viewBox="0 0 1200 780">
      <rect width="1200" height="780" fill="#090d15"/>
      <rect x="42" y="42" width="1116" height="696" rx="12" fill="none" stroke="#63e6ef" stroke-width="2"/>
      <circle cx="1018" cy="148" r="80" fill="#8f432d" opacity=".65"/>
      <text x="100" y="145" font-size="27" fill="#63e6ef" font-family="Arial,sans-serif" letter-spacing="8">${xmlSafe(title)}</text>
      <text x="100" y="300" font-size="66" fill="#ecebe6" font-family="Georgia,serif">MISSION COMPLETE</text>
      <text x="100" y="395" font-size="26" fill="#b9b8b2" font-family="Arial,sans-serif" letter-spacing="2">${xmlSafe(subtitle)}</text>
      <line x1="100" y1="445" x2="1100" y2="445" stroke="#38505d"/>
      <text x="100" y="510" font-size="26" fill="#ecebe6" font-family="Arial,sans-serif">Curiosity kept the signal alive.</text>
      <text x="100" y="626" font-size="22" fill="#63e6ef" font-family="Arial,sans-serif">SELF-GUIDED LEARNING CERTIFICATE</text>
      <text x="100" y="669" font-size="19" fill="#b9b8b2" font-family="Arial,sans-serif">${date}  |  NASA educational sources cited in the exhibit</text>
    </svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "eko-opportunity-explorer.svg";
    document.body.append(a);
    a.click(); a.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <button type="button" onClick={download} className="btn-ghost">
      ↓ {bn ? "শিক্ষণ সার্টিফিকেট সেভ করো" : "Download mission certificate (SVG)"}
    </button>
  );
}
