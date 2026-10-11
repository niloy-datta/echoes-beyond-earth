"use client";

import Link from "next/link";
import { EKO_STOPS } from "@/lib/eko-mission";
import { useT } from "@/lib/i18n";

export function EkoTeacherKit() {
  const { lang } = useT();
  const bn = lang === "bn";
  return (
    <main className="container-x min-h-[85svh] pb-24 pt-[calc(var(--header-h)+3rem)]">
      <header className="mb-12 max-w-4xl">
        <Link href="/play/" className="btn-ghost print:hidden">← {bn ? "মিশনে ফিরে যাও" : "Back to EKO mission"}</Link>
        <p className="label mt-10 text-signal">{bn ? "শিক্ষকদের জন্য • প্রস্তুত পাঠ" : "EDUCATOR EDITION · PRINTABLE LESSON"}</p>
        <h1 className="display mt-5 text-[clamp(2.7rem,6vw,5.8rem)]">{bn ? "অপরচুনিটি: ৪টি বৈজ্ঞানিক রহস্য" : "Four clues from Opportunity"}</h1>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-lunar-2">
          {bn
            ? "১০–১৫ মিনিটের একটি স্কুল উপযোগী activity। প্রথমে মিশনটি explore করো, তারপর NASA-এর আসল প্রমাণ দিয়ে উত্তর যাচাই করো।"
            : "A 10–15 minute inquiry-based space-science activity for school-age learners. Explore the mission, make predictions, then check them against NASA's primary sources."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3 print:hidden">
          <button type="button" className="btn-signal" onClick={() => window.print()}>{bn ? "প্রিন্ট / PDF সেভ" : "Print / Save as PDF"} ↗</button>
          <Link href="/play/" className="btn-ghost">{bn ? "3D অভিযান" : "Start the 3D adventure"}</Link>
        </div>
      </header>

      <section className="grid gap-5 md:grid-cols-3" aria-labelledby="learning-goals">
        <h2 id="learning-goals" className="sr-only">{bn ? "শেখার উদ্দেশ্য" : "Learning objectives"}</h2>
        {[
          bn ? "১. সৌরশক্তি ও ধুলিঝড়ের সম্পর্ক বোঝা" : "1. Explain how atmospheric dust affects solar power",
          bn ? "২. পর্যবেক্ষণ, অনুমান ও সত্য যাচাই আলাদা করা" : "2. Separate observations from interpretation",
          bn ? "৩. বৈজ্ঞানিক আবিষ্কারের দীর্ঘমেয়াদি মূল্য বোঝা" : "3. Explain the lasting value of mission discoveries",
        ].map((text, i) => (
          <div key={i} className="border border-hairline bg-void-2 p-5 text-sm leading-relaxed text-lunar-2">{text}</div>
        ))}
      </section>

      <section className="mt-12 space-y-8" aria-labelledby="worksheet">
        <h2 id="worksheet" className="font-serif text-3xl italic">{bn ? "শিক্ষার্থীর worksheet" : "Student worksheet"}</h2>
        {EKO_STOPS.map((stop, idx) => (
          <article key={stop.id} className="break-inside-avoid border-t border-hairline pt-7">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3 className="font-serif text-2xl italic">{idx + 1}. {stop.name[lang]}</h3>
              <a className="text-xs text-signal underline underline-offset-4" href={stop.source.url} target="_blank" rel="noopener noreferrer">
                {bn ? "NASA আসল উৎস" : "Primary NASA source"} ↗
              </a>
            </div>
            <p className="mt-4 text-base text-lunar-2">{stop.question[lang]}</p>
            <div className="mt-4 space-y-2">
              {stop.options.map((option, optionIdx) => (
                <div key={optionIdx} className="flex gap-3 text-sm text-lunar-2">
                  <span aria-hidden="true">□</span>
                  <span>{String.fromCharCode(65 + optionIdx)}. {option[lang]}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs text-dust">{bn ? "কী প্রমাণ দেখে সিদ্ধান্ত নিলে?" : "What evidence supports your choice?"}</p>
            <div className="mt-4 h-12 border-b border-hairline" aria-hidden="true"/>
          </article>
        ))}
      </section>
      <section className="mt-14 break-before-page border-t border-hairline pt-8" aria-labelledby="answer-guide">
        <h2 id="answer-guide" className="font-serif text-3xl italic">{bn ? "শিক্ষকের উত্তর ও আলোচনা" : "Educator answer key & discussion"}</h2>
        <p className="mt-4 text-sm text-dust">{bn ? "প্রিন্ট করার সময় প্রয়োজন অনুযায়ী উত্তর অংশ আলাদা করো।" : "For student handouts, print the worksheet pages separately from this answer key."}</p>
        <ol className="mt-6 space-y-5">
          {EKO_STOPS.map((s, i) => (
            <li key={s.id} className="border-l border-signal/50 pl-5 text-sm leading-relaxed">
              <strong className="text-lunar">{i + 1}. {s.options[s.correct][lang]}</strong>
              <p className="mt-2 text-lunar-2">{s.fact[lang]}</p>
            </li>
          ))}
        </ol>
      </section>
      <footer className="mt-12 max-w-4xl border-t border-hairline pt-5 text-xs leading-relaxed text-dust">
        {bn
          ? "EKO-র 3D পৃথিবী কল্পনানির্ভর। NASA-এর সত্যিকারের মিশন তথ্য এবং প্রাথমিক উৎস উপরে যুক্ত করা আছে। NASA এই শিক্ষামূলক প্রজেক্ট অনুমোদন করেনি।"
          : "EKO's 3D world is an illustration; mission records and all quiz evidence are NASA-sourced. This independent learning activity is not endorsed by NASA."}
      </footer>
    </main>
  );
}
