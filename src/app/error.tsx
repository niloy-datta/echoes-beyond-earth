"use client";
import { useEffect } from "react";
import { useT } from "@/lib/i18n";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useT();
  useEffect(() => console.error(error), [error]);
  return (
    <section role="alert" className="container-x flex min-h-[100svh] flex-col items-start justify-center gap-6 pt-[var(--header-h)]">
      <p className="label text-caution">{t("common.errorTitle")}</p>
      <h1 className="display max-w-4xl text-[clamp(2.2rem,6vw,4.8rem)]">{t("err.title")}</h1>
      <p className="max-w-md text-lunar-2">{t("err.body")}</p>
      <button type="button" onClick={reset} className="btn-signal mt-4">
        {t("err.retry")}
      </button>
    </section>
  );
}
