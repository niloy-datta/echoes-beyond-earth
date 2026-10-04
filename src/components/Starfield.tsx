"use client";
import { useEffect, useRef } from "react";
import { useSettings } from "@/lib/settings";

/**
 * A sparse, quiet star field. Decorative only (aria-hidden): it is an atmosphere,
 * not a representation of the real sky. Twinkle stops entirely under reduced motion.
 */
export function Starfield({ density = 0.00012 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { reducedMotion } = useSettings();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let stars: { x: number; y: number; r: number; a: number; s: number; p: number }[] = [];
    // Deterministic PRNG so the sky doesn't reshuffle between renders.
    let seed = 1969;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed = 1969;
      const count = Math.round(w * h * density);
      stars = Array.from({ length: count }, () => {
        const bright = rand() > 0.94;
        return {
          x: rand() * w,
          y: rand() * h,
          r: bright ? 0.7 + rand() * 0.7 : 0.25 + rand() * 0.45,
          a: bright ? 0.55 + rand() * 0.35 : 0.18 + rand() * 0.35,
          s: 0.2 + rand() * 0.8,
          p: rand() * Math.PI * 2,
        };
      });
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const st of stars) {
        const twinkle = reducedMotion ? 1 : 0.75 + 0.25 * Math.sin(time * 0.0006 * st.s + st.p);
        ctx.globalAlpha = st.a * twinkle;
        ctx.fillStyle = "#ecebe6";
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reducedMotion && !document.hidden) raf = requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(draw);
    };

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reducedMotion, density]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-10" />;
}
