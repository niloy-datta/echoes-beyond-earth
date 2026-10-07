"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useT } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { useSound } from "@/lib/sound";
import { assetPath } from "@/lib/asset-path";

const EASE = [0.22, 1, 0.36, 1] as const;

function Line({ text, delay, className = "" }: { text: string; delay: number; className?: string }) {
  const words = text.split(" ");
  return (
    <span className={`block ${className}`}>
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: "105%" }}
            animate={{ y: "0%" }}
            transition={{ delay: delay + i * 0.08, duration: 1.1, ease: EASE }}
          >
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

export function Hero() {
  const { t, lang } = useT();
  const { reducedMotion } = useSettings();
  const { ping } = useSound();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", reducedMotion ? "0%" : "18%"]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, reducedMotion ? 1 : 1.08]);
  const copyY = useTransform(scrollYProgress, [0, 1], ["0%", reducedMotion ? "0%" : "-30%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const begin = () => {
    ping(0.8);
    document.getElementById("prologue")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  };

  return (
    <section ref={ref} aria-labelledby="hero-title" className="relative h-[100svh] min-h-[620px] w-full overflow-hidden bg-void">
      {/* Earthset — Artemis II, 6 April 2026 (NASA art002e021278) */}
      <motion.div className="absolute inset-0" style={{ y: imageY, scale: imageScale }}>
        <motion.img
          src={assetPath("/images/nasa/art002e021278.jpg")}
          alt={t("hero.imageAlt")}
          width={3000}
          height={2000}
          fetchPriority="high"
          className="h-full w-full object-cover object-[47%_50%] md:object-[50%_32%]"
          initial={{ opacity: 0, scale: 1.14 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 3.2, ease: EASE }}
        />
      </motion.div>
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgb(3_4_5/0.6),rgb(3_4_5/0)_30%,rgb(3_4_5/0)_55%,rgb(3_4_5/0.7)_80%,#030405)]" />

      <motion.div
        style={{ y: copyY, opacity: fade }}
        className="container-x relative flex h-full flex-col pt-[calc(var(--header-h)+5svh)] md:pt-[calc(var(--header-h)+6svh)]"
      >
        {/* One heading for assistive tech; the two lines are staged above and below the Earth. */}
        <h1 id="hero-title" className="sr-only">
          {t("hero.line1")} {t("hero.line2")}
        </h1>
        <motion.p
          className="label mb-5 md:mb-7"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 1.2 }}
        >
          {t("hero.eyebrow")}
        </motion.p>
        <p aria-hidden key={`l1-${lang}`} className="display max-w-[13ch] text-[clamp(2.1rem,5.4vw,5.25rem)] text-lunar sm:max-w-none">
          <Line text={t("hero.line1")} delay={0.6} />
        </p>

        <div className="mt-auto pb-8 md:pb-11">
          <p aria-hidden key={`l2-${lang}`} className="display max-w-[14ch] text-[clamp(2.1rem,5.4vw,5.25rem)] text-lunar/80 sm:max-w-none">
            <Line text={t("hero.line2")} delay={1.5} />
          </p>
          {/* The signal: one thin line that keeps traveling. */}
          <div aria-hidden className="relative mt-6 h-px w-full max-w-md overflow-hidden bg-hairline-strong md:mt-8">
            <motion.span
              className="absolute inset-y-0 left-0 w-24 bg-[linear-gradient(90deg,transparent,#63e6ef,transparent)]"
              initial={{ x: "-6rem" }}
              animate={reducedMotion ? { x: "10rem" } : { x: ["-6rem", "28rem"] }}
              transition={reducedMotion ? { duration: 0 } : { delay: 2.4, duration: 3.6, repeat: Infinity, repeatDelay: 2.2, ease: "easeInOut" }}
            />
          </div>
          <div className="mt-7 flex flex-col items-start gap-5 sm:flex-row sm:items-end sm:justify-between md:mt-9">
            <motion.button
              type="button"
              onClick={begin}
              className="btn-signal bg-void/40 backdrop-blur-sm"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.1, duration: 1, ease: EASE }}
            >
              <span aria-hidden className="relative flex h-2 w-2">
                <span className="pulse-ring absolute inset-0 rounded-full bg-signal" />
                <span className="relative h-2 w-2 rounded-full bg-signal" />
              </span>
              {t("hero.cta")}
            </motion.button>
            <motion.p
              className="max-w-xs font-mono text-[10px] uppercase leading-relaxed tracking-[0.16em] text-lunar-2/70 sm:text-right"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.6, duration: 1.2 }}
            >
              {t("hero.credit")}
            </motion.p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
