"use client";
import Link from "next/link";
import { useT } from "@/lib/i18n";
import { NAV } from "./SiteHeader";

export function SiteFooter() {
  const { t } = useT();
  return (
    <footer className="relative border-t border-hairline bg-void">
      <div className="container-x grid gap-12 py-16 md:grid-cols-[1.2fr_1fr] md:py-20">
        <div className="max-w-md">
          <p className="font-mono text-[11px] tracking-[0.24em] text-lunar">ECHOES BEYOND EARTH</p>
          <p className="mt-5 text-sm leading-relaxed text-lunar-2">{t("site.tagline")}</p>
          <p className="mt-8 text-xs leading-relaxed text-dust">{t("footer.disclaimer")}</p>
          <p className="mt-2 text-xs leading-relaxed text-dust">{t("footer.imagery")}</p>
          <p className="mt-2 text-xs leading-relaxed text-dust">{t("footer.static")}</p>
        </div>
        <nav aria-label="Footer">
          <ul className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="link-underline text-sm text-lunar-2 hover:text-lunar">
                  {t(n.key)}
                </Link>
              </li>
            ))}
          </ul>
          <p className="label mt-10">{t("site.event")}</p>
        </nav>
      </div>
    </footer>
  );
}
