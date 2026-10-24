"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useT } from "@/lib/i18n";
import { assetPath } from "@/lib/asset-path";

const EASE = [0.22, 1, 0.36, 1] as const;
const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-10% 0px" },
  transition: { duration: 1.0, ease: EASE },
};

export function MissionStoriesTeaser() {
  const { lang } = useT();
  const bn = lang === "bn";

  const missions = [
    { name: bn ? "অ্যাপোলো ১১" : "Apollo 11", body: "moon", year: "1969", chip: "Mare Tranquillitatis" },
    { name: bn ? "সার্ভেয়ার ৩" : "Surveyor 3", body: "moon", year: "1967", chip: "Oceanus Procellarum" },
    { name: bn ? "ভাইকিং ১" : "Viking 1", body: "mars", year: "1976", chip: "Chryse Planitia" },
    { name: bn ? "পাথফাইন্ডার" : "Pathfinder", body: "mars", year: "1997", chip: "Ares Vallis" },
    { name: bn ? "ইনজেনুইটি" : "Ingenuity", body: "mars", year: "2021", chip: "Jezero Crater" },
  ];

  return (
    <section
      aria-labelledby="mission-stories-title"
      className="relative overflow-hidden border-t border-hairline py-[clamp(5rem,10vw,8.5rem)] bg-gradient-to-b from-void via-void-2/60 to-void"
    >
      {/* Decorative ambient background glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-48 top-1/4 h-96 w-96 rounded-full bg-signal/5 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-48 bottom-1/4 h-96 w-96 rounded-full bg-mars/5 blur-[120px]"
      />

      <div className="container-x relative">
        <motion.div {...reveal} className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-signal shadow-[0_0_8px_#63e6ef]" />
              <p className="label text-signal tracking-[0.28em]">
                {bn ? "মিশন স্টোরিজ · ১০টি অধ্যায়" : "MISSION STORIES · 10 EXPEDITIONS"}
              </p>
            </div>
            <h2 id="mission-stories-title" className="display mt-3 max-w-3xl text-[clamp(2.4rem,5.2vw,4.5rem)] leading-tight">
              {bn ? "ভুলুর মহাকাশ ডায়েরি ও অভিযান" : "Bhulu’s Echo Missions & 3D Stories"}
            </h2>
          </div>
          <Link href="/missions/" className="btn-ghost shrink-0 self-start md:self-auto">
            {bn ? "সব মিশন এক্সপ্লোর করুন" : "Explore All Missions"} →
          </Link>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-12 lg:items-stretch">
          {/* Main feature spotlight */}
          <motion.div
            {...reveal}
            className="group relative flex flex-col justify-between overflow-hidden border border-hairline-strong bg-void-2 p-6 sm:p-8 lg:col-span-7"
          >
            {/* Background graphic */}
            <div className="absolute inset-0 z-0 opacity-20 transition-opacity duration-700 group-hover:opacity-30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assetPath("/images/nasa/as11-37-5551.jpg")}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-void via-void/80 to-transparent" />
            </div>

            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-signal/40 bg-signal/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-signal">
                  {bn ? "3D স্টোরি ক্লিপ + ম্যাপ চ্যালেঞ্জ" : "3D Story Clips + Map Challenge"}
                </span>
                <span className="font-mono text-[11px] text-lunar-2">
                  {bn ? "চাঁদ ও মঙ্গলপৃষ্ঠের আসল ডাটা" : "Real NASA Coordinates & Telemetry"}
                </span>
              </div>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-lunar">
                {bn
                  ? "আর্লি অ্যাপোলো থেকে ইনজেনুইটি হেলিকপ্টার—প্রতিটি যন্ত্রের অবতরণ, মিশন ও নীরবতার মুহূর্তকে ৪-দৃশ্যের 3D অ্যানিমেশনে আবিষ্কার করুন।"
                  : "From Apollo 11's lunar touchdown to Ingenuity’s 72 flights on Mars—explore how NASA's machines arrived, worked, fell silent, and left echoes that travel still."}
              </p>
            </div>

            <div className="relative z-10 mt-8 pt-6 border-t border-hairline">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                  <Link href="/missions/play/?c=apollo-11" className="btn-signal">
                    {bn ? "প্রথম অধ্যায় শুরু করো" : "Launch Chapter 01 (Apollo 11)"} →
                  </Link>
                  <Link href="/missions/arena/" className="btn-ghost">
                    {bn ? "কুইজ অ্যারেনা" : "Quiz Arena"}
                  </Link>
                  <Link href="/missions/vr/" className="btn-ghost">
                    {bn ? "VR ওয়াক" : "VR Walk"}
                  </Link>
                </div>
                <span className="font-mono text-xs text-dust">
                  {bn ? "অফলাইন-রেডি · কোনো লগইন নেই" : "Zero Login · Local Progress"}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Quick list of chapter highlights */}
          <motion.div
            {...reveal}
            className="flex flex-col justify-between border border-hairline-strong bg-void-2/60 p-6 sm:p-7 lg:col-span-5"
          >
            <div>
              <p className="label text-lunar-2 mb-4 tracking-[0.2em]">
                {bn ? "বাছাইকৃত অভিযানসমূহ" : "FEATURED MISSIONS"}
              </p>
              <ul className="divide-y divide-hairline">
                {missions.map((m, idx) => (
                  <li key={m.name} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/missions/play/?c=${
                        idx === 0
                          ? "apollo-11"
                          : idx === 1
                          ? "surveyor-3"
                          : idx === 2
                          ? "viking-1"
                          : idx === 3
                          ? "pathfinder"
                          : "ingenuity"
                      }`}
                      className="group flex items-center justify-between transition-colors hover:text-signal"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            m.body === "moon"
                              ? "bg-lunar-2 shadow-[0_0_6px_#ffffff]"
                              : "bg-mars shadow-[0_0_6px_#ff6b4a]"
                          }`}
                        />
                        <div>
                          <p className="font-semibold text-sm text-lunar group-hover:text-signal transition-colors">
                            {m.name}
                          </p>
                          <p className="font-mono text-[10px] text-dust">{m.chip}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-xs text-lunar-2">{m.year}</span>
                        <span className="ml-2 inline-block text-xs text-lunar-2/60 transition-transform group-hover:translate-x-1 group-hover:text-signal">
                          →
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 rounded border border-hairline bg-void/50 p-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-lunar-2">
                  {bn ? "১০টি ব্যাজ ও স্তর উন্মোচন" : "10 Explorer Badges & XP"}
                </span>
                <Link href="/missions/catalog/" className="text-signal hover:underline font-mono text-[11px]">
                  {bn ? "সম্পূর্ণ ক্যাটালগ (৯৪)" : "Full Catalog (94)"} →
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
