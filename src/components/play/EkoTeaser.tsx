"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";
import { assetPath } from "@/lib/asset-path";

export function EkoTeaser() {
  const { lang } = useT();
  const bn = lang === "bn";
  return (
    <section aria-labelledby="eko-teaser-title" className="relative overflow-hidden border-t border-hairline py-[clamp(5rem,10vw,9rem)]">
      <div className="container-x grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <p className="label mb-6 text-signal">{bn ? "ইন্টারঅ্যাকটিভ অভিযান / ০০১" : "INTERACTIVE EXPEDITION / 001"}</p>
          <h2 id="eko-teaser-title" className="display max-w-2xl text-[clamp(2.8rem,5.5vw,5rem)]">
            {bn ? "ইকোর সঙ্গে মঙ্গলে চলো" : "Enter Mars with EKO"}
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-lunar-2">
            {bn
              ? "একটি ছোট রোবট, একটি নিঃশব্দ রোভার, আর চারটি NASA প্রমাণ। অপরচুনিটি রোভারকে নতুনভাবে জানো।"
              : "One small robot, one silent rover, and four real NASA clues. Experience Opportunity's journey through an illustrated interactive mission."}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/play/game/" className="btn-signal">
              {bn ? "শেষ আলো খেলো" : "Play The Last Light"} →
            </Link>
            <Link href="/play/" className="btn-ghost">
              {bn ? "ক্লাসিক ইকো পাঠ" : "Classic EKO lesson"}
            </Link>
          </div>
          <p className="mt-4 text-xs text-dust">{bn ? "থার্ড-পারসন 3D খেলা ও ২ডি বিকল্প · শিল্পিত দৃশ্য · NASA সূত্রসহ তথ্য" : "Third-person 3D game with a 2D alternative · artistic scene · NASA-sourced facts"}</p>
        </div>
        <Link href="/play/" className="group relative block overflow-hidden border border-hairline-strong bg-void-2">
          {/* Existing credited NASA imagery, not claimed to depict EKO or the illustrated game scene. */}
          <img
            src={assetPath("/images/nasa/pia23178.jpg")}
            alt={bn ? "অপরচুনিটি রোভারের NASA মিশন ম্যাপ" : "NASA's Opportunity final traverse map"}
            loading="lazy"
            className="aspect-[4/3] w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105"
          />
          <span className="absolute bottom-4 left-4 border border-white/30 bg-void/85 px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-signal">
            {bn ? "মেমোরি গার্ডিয়ান / ইকো" : "THE MEMORY GUARDIAN / EKO"} ↗
          </span>
          <span className="absolute right-4 top-4 bg-void/70 px-3 py-2 font-mono text-[9px] text-lunar-2">NASA/JPL-Caltech/MSSS</span>
        </Link>
      </div>
    </section>
  );
}
