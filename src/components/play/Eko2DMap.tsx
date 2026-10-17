"use client";

import { EKO_STOPS, type EkoLocale, type EkoStopId } from "@/lib/eko-mission";

/**
 * Low-GPU alternative to the procedural WebGL world.
 * The paths are decorative and not geographic Mars coordinates.
 * Every station is a normal keyboard/touch button with the same science content.
 */
export function Eko2DMap({
  lang,
  scanned,
  onOpen,
}: {
  lang: EkoLocale;
  scanned: readonly EkoStopId[];
  onOpen: (id: EkoStopId) => void;
}) {
  const bn = lang === "bn";
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[radial-gradient(circle_at_50%_40%,#763c2e_0%,#2b1715_50%,#120d11_95%)] px-4 py-5 sm:px-7 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label text-signal">{bn ? "ইকো / সহজ ২ডি অভিযান" : "EKO / ACCESSIBLE 2D MISSION"}</p>
          <h2 className="mt-2 font-serif text-2xl italic text-lunar sm:text-3xl">
            {bn ? "মঙ্গলের চারটি স্মৃতি" : "The four memories of Mars"}
          </h2>
        </div>
        <span className="border border-signal/40 bg-void/55 px-3 py-2 font-mono text-xs text-signal">
          {scanned.length}/4 {bn ? "পাওয়া" : "recovered"}
        </span>
      </div>
      <p className="mt-3 max-w-xl text-xs leading-relaxed text-lunar-2">
        {bn
          ? "এটি বাস্তব মঙ্গলের মানচিত্র নয়—শুধু গল্পের ২ডি ছবি। প্রতিটি চিহ্ন খুলে NASA-র তথ্য পড়ো ও প্রশ্নের উত্তর দাও।"
          : "An illustrated story map, not actual Mars terrain or rover coordinates. Open any station for NASA evidence and the same four quizzes as the 3D mission."}
      </p>
      <div role="group" aria-label={bn ? "চারটি প্রমাণ স্টেশন" : "Four accessible evidence stations"}
        className="relative mx-auto mt-6 grid w-full max-w-2xl flex-1 grid-cols-2 content-center gap-3 sm:gap-5">
        <div aria-hidden="true" className="pointer-events-none absolute inset-[15%] rotate-[-15deg] rounded-full border border-dashed border-[#efab75]/35" />
        {EKO_STOPS.map((stop, index) => {
          const discovered = scanned.includes(stop.id);
          const label = stop.name[lang].split(" / ").at(-1) || stop.name[lang];
          return (
            <button key={stop.id} type="button" onClick={(e) => { e.currentTarget.focus(); onOpen(stop.id); }}
              aria-label={bn ? `২ডি প্রমাণ খুলুন: ${label}` : `Open ${label} 2D hotspot`}
              className={`group relative z-10 flex min-h-28 flex-col justify-center gap-2 border p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal sm:min-h-32 sm:p-5 ${discovered ? "border-[#88d4a5]/60 bg-[#132f2c]/90" : "border-[#dc9870]/50 bg-[#301e1e]/90 hover:border-signal hover:bg-[#4b2c29]"}`}>
              <span className="flex items-center justify-between font-mono text-xs">
                <span className={discovered ? "text-[#88d4a5]" : "text-[#f0b889]"}>0{index + 1}</span>
                <span className={discovered ? "text-[#88d4a5]" : "text-signal"} aria-hidden="true">{discovered ? "✓" : "↗"}</span>
              </span>
              <span className="font-serif text-lg italic leading-snug text-lunar sm:text-2xl">{label}</span>
              <span className="text-xs text-lunar-2">{discovered
                ? (bn ? "প্রমাণ উদ্ধার হয়েছে" : "Evidence recovered")
                : (bn ? "প্রমাণটি দেখো" : "Inspect this evidence")}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-center text-xs text-lunar-2">
        {bn ? "মিশনের সব প্রশ্ন ৩ডি ছাড়াও সম্পন্ন করা যায়।" : "No 3D device, GPU, login, or account needed."}
      </p>
    </div>
  );
}
