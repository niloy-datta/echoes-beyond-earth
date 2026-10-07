"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useT, type StringKey } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { useSound } from "@/lib/sound";
import { localizeDigits } from "@/lib/dates";

export const NAV: { href: string; key: StringKey; dek: StringKey; short?: StringKey }[] = [
  { href: "/explore/", key: "nav.explore", dek: "nav.explore.dek", short: "nav.short.explore" },
  { href: "/last-signal/", key: "nav.lastSignal", dek: "nav.lastSignal.dek", short: "nav.short.lastSignal" },
  { href: "/lens/", key: "nav.lens", dek: "nav.lens.dek", short: "nav.short.lens" },
  { href: "/legacy/", key: "nav.legacy", dek: "nav.legacy.dek", short: "nav.short.legacy" },
  { href: "/paths/", key: "nav.paths", dek: "nav.paths.dek" },
  { href: "/passport/", key: "nav.passport", dek: "nav.passport.dek" },
  { href: "/archive/", key: "nav.archive", dek: "nav.archive.dek" },
  { href: "/sources/", key: "nav.sources", dek: "nav.sources.dek", short: "nav.short.evidence" },
];

function Wordmark() {
  return (
    <span className="flex flex-col leading-none">
      <span className="whitespace-nowrap font-mono text-[13px] tracking-[0.42em] text-lunar sm:text-[15px]">ECHOES</span>
      <span className="mt-1.5 whitespace-nowrap font-mono text-[8px] tracking-[0.34em] text-lunar-2 sm:text-[9px]">BEYOND EARTH</span>
    </span>
  );
}

/** Desktop inline navigation — the most-visited exhibits; the menu holds all eight. */
function InlineNav({ pathname }: { pathname: string }) {
  const { t } = useT();
  const items = [{ href: "/", short: "nav.short.home" as StringKey }, ...NAV.filter((n) => n.short).map((n) => ({ href: n.href, short: n.short! }))];
  return (
    <nav aria-label={t("nav.menu")} className="hidden xl:block">
      <ul className="flex items-center gap-1">
        {items.map((n) => {
          const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href.slice(0, -1));
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`relative block px-5 py-2 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors hover:text-lunar ${
                  active ? "text-lunar" : "text-lunar-2/80"
                }`}
              >
                {t(n.short)}
                {active && <span aria-hidden className="absolute bottom-0 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-signal shadow-[0_0_8px_#63e6ef]" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function LanguageToggle() {
  const { t } = useT();
  const { toggleLang } = useSettings();
  return (
    <button type="button" onClick={toggleLang} className="btn-ghost !px-3 !py-2 sm:!px-3.5" aria-label={t("lang.switchAria")}>
      <span lang={t("lang.switchTo") === "English" ? "en" : "bn"} className="normal-case tracking-normal text-[12px]">
        {t("lang.switchTo")}
      </span>
    </button>
  );
}

export function SoundToggle() {
  const { t } = useT();
  const { sound, setSound } = useSettings();
  const { ping } = useSound();
  return (
    <button
      type="button"
      onClick={() => {
        setSound(!sound);
        if (!sound) window.setTimeout(() => ping(0.6), 400);
      }}
      aria-pressed={sound}
      aria-label={t("sound.label")}
      title={sound ? t("sound.on") : t("sound.off")}
      className="group flex h-9 w-9 items-center justify-center rounded-full border border-hairline-strong text-lunar-2 transition-colors hover:border-lunar-2 hover:text-lunar"
    >
      {/* Equaliser bars: still when off, breathing when on */}
      <span aria-hidden className="flex h-3.5 items-end gap-[2.5px]">
        {[0.45, 1, 0.7, 0.3].map((h, i) => (
          <motion.span
            key={i}
            className={`block w-[2px] rounded-full ${sound ? "bg-signal" : "bg-current"}`}
            initial={false}
            animate={sound ? { height: [`${h * 100}%`, `${(1 - h * 0.6) * 100}%`, `${h * 100}%`] } : { height: `${30 + h * 45}%` }}
            transition={sound ? { duration: 1.4 + i * 0.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.4 }}
          />
        ))}
      </span>
    </button>
  );
}

export function SiteHeader() {
  const { t, lang } = useT();
  const { reducedMotion, motion: motionPref, setMotion } = useSettings();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Menu: lock scroll, trap focus, close on Escape, restore focus to the trigger.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = panel.current?.querySelector<HTMLElement>("a,button");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab" && panel.current) {
        const items = Array.from(panel.current.querySelectorAll<HTMLElement>("a,button,input"));
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    const trigger = menuButton.current;
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [open]);

  const solid = scrolled || pathname !== "/";

  return (
    <>
      <a
        href="#main"
        className="sr-only-focusable fixed left-4 top-3 z-[90] rounded-full bg-lunar px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-void"
      >
        {t("skip")}
      </a>
      <header
        className={`fixed inset-x-0 top-0 z-50 h-[var(--header-h)] transition-[background-color,border-color] duration-700 ${
          solid ? "border-b border-hairline bg-void/80 backdrop-blur-md" : "border-b border-transparent"
        }`}
      >
        <div className="container-x flex h-full items-center justify-between gap-4">
          <Link href="/" aria-label={t("site.title")} className="shrink-0">
            <Wordmark />
          </Link>
          <InlineNav pathname={pathname} />
          <div className="flex items-center gap-1.5 sm:gap-3">
            <LanguageToggle />
            <SoundToggle />
            <button
              ref={menuButton}
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-controls="site-menu"
              className="btn-ghost !px-3.5 !py-2"
            >
              <span aria-hidden className="flex flex-col gap-[3px]">
                <span className="block h-px w-3.5 bg-current" />
                <span className="block h-px w-3.5 bg-current" />
              </span>
              <span className="hidden sm:inline">{t("nav.menu")}</span>
              <span className="sr-only sm:hidden">{t("nav.menu")}</span>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="site-menu"
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={t("nav.menu")}
            className="fixed inset-0 z-[80] overflow-y-auto bg-void"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="container-x flex h-[var(--header-h)] items-center justify-between">
              <Link href="/" onClick={() => setOpen(false)}>
                <Wordmark />
              </Link>
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost !px-3.5 !py-2">
                <span aria-hidden>✕</span> {t("nav.close")}
              </button>
            </div>
            <nav aria-label={t("nav.menu")} className="container-x grid gap-12 pb-16 pt-8 lg:grid-cols-[1fr_320px] lg:pt-16">
              <ol className="border-t border-hairline">
                <li>
                  <Link
                    href="/"
                    className="group flex items-baseline gap-5 border-b border-hairline py-4 md:py-5"
                    aria-current={pathname === "/" ? "page" : undefined}
                  >
                    <span className="label w-8 shrink-0">{localizeDigits("00", lang)}</span>
                    <span className="display text-[clamp(1.6rem,4.2vw,3rem)] text-lunar-2 transition-colors group-hover:text-lunar">
                      {t("nav.home")}
                    </span>
                  </Link>
                </li>
                {NAV.map((item, i) => {
                  const active = pathname.startsWith(item.href.slice(0, -1));
                  return (
                    <motion.li
                      key={item.href}
                      initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.06 + i * 0.04, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className="group flex flex-col gap-1 border-b border-hairline py-4 sm:flex-row sm:items-baseline sm:gap-5 md:py-5"
                      >
                        <span className={`label w-8 shrink-0 ${active ? "text-signal" : ""}`}>
                          {localizeDigits(String(i + 1).padStart(2, "0"), lang)}
                        </span>
                        <span
                          className={`display text-[clamp(1.6rem,4.2vw,3rem)] transition-colors group-hover:text-lunar ${
                            active ? "text-lunar" : "text-lunar-2"
                          }`}
                        >
                          {t(item.key)}
                        </span>
                        <span className="text-sm text-dust sm:ml-auto sm:text-right">{t(item.dek)}</span>
                      </Link>
                    </motion.li>
                  );
                })}
              </ol>
              <aside className="flex flex-col gap-8 lg:pt-2">
                <div>
                  <p className="label mb-3">{t("lang.label")}</p>
                  <LanguageToggle />
                </div>
                <div>
                  <p className="label mb-3">{t("sound.label")}</p>
                  <SoundToggle />
                </div>
                <div>
                  <p className="label mb-3">{t("motion.label")}</p>
                  <button
                    type="button"
                    className="btn-ghost"
                    aria-pressed={motionPref === "reduce"}
                    onClick={() => setMotion(motionPref === "reduce" ? "system" : "reduce")}
                  >
                    {t("motion.label")}
                  </button>
                </div>
                <p className="max-w-xs text-sm leading-relaxed text-dust">{t("site.tagline")}</p>
              </aside>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
