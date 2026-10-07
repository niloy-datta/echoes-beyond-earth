"use client";
import Link from "next/link";
import { useT } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useT();
  return (
    <section className="container-x flex min-h-[100svh] flex-col items-start justify-center gap-6 pt-[var(--header-h)]">
      <p className="label text-caution">404</p>
      <h1 className="display text-[clamp(2.6rem,8vw,6rem)]">{t("nf.title")}</h1>
      <p className="max-w-md text-lunar-2">{t("nf.body")}</p>
      <Link href="/" className="btn-signal mt-4">
        {t("nf.home")}
      </Link>
    </section>
  );
}
