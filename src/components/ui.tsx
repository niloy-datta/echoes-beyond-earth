"use client";
import { useState, type ReactNode } from "react";
import { useMuseum } from "@/lib/data";
import { useT } from "@/lib/i18n";
import type { ImageSource, Verification } from "@/lib/types";
import { assetPath } from "@/lib/asset-path";

/** The one place the museum states how much a claim can be trusted. */
export function VerificationBadge({ status }: { status: Verification }) {
  const { t } = useT();
  const verified = status === "verified";
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.14em] ${
        verified ? "text-signal" : "text-caution"
      }`}
      title={verified ? t("common.verified") : t("common.required")}
    >
      <span
        aria-hidden
        className={`inline-block h-1.5 w-1.5 rounded-full ${verified ? "bg-signal" : "border border-caution"}`}
      />
      {verified ? t("common.verified") : t("common.required")}
    </span>
  );
}

/** Renders a source id as an outbound link with its verification state. */
export function SourceLink({ id, className = "" }: { id: string | null | undefined; className?: string }) {
  const { data } = useMuseum();
  const { t } = useT();
  const ref = data?.reference(id);
  if (!id || !ref) {
    return <span className={`font-mono text-[10px] uppercase tracking-[0.14em] text-dust ${className}`}>{t("common.noSource")}</span>;
  }
  return (
    <a
      href={ref.url}
      target="_blank"
      rel="noreferrer noopener"
      className={`group inline-flex max-w-full items-baseline gap-2 text-[12px] text-lunar-2 hover:text-lunar ${className}`}
    >
      <span className="link-underline truncate">{ref.title}</span>
      <span aria-hidden className="text-dust transition-transform group-hover:translate-x-0.5">↗</span>
      <span className="sr-only">({ref.publisher}, opens in a new tab)</span>
    </a>
  );
}

/** Static NASA image with a quiet fade-in and an honest fallback when it fails. */
export function NasaImage({
  image,
  alt,
  className = "",
  imgClassName = "",
  thumb = false,
  priority = false,
}: {
  image: ImageSource | undefined;
  alt: string;
  className?: string;
  imgClassName?: string;
  thumb?: boolean;
  priority?: boolean;
}) {
  const { t } = useT();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!image || failed) {
    return (
      <div className={`flex items-center justify-center bg-void-3 ${className}`} role="img" aria-label={alt}>
        {thumb ? (
          <svg aria-hidden width="22" height="22" viewBox="0 0 22 22" className="text-ash">
            <circle cx="11" cy="11" r="2" fill="currentColor" />
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="0.8" />
          </svg>
        ) : (
          <span className="label px-3 text-center">{image ? t("common.imageUnavailable") : t("common.noImage")}</span>
        )}
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden bg-void-2 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static export: images are pre-sized at build */}
      <img
        src={assetPath(thumb ? image.thumb : image.file)}
        alt={alt}
        width={image.width}
        height={image.height}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover transition-opacity duration-1000 ${loaded ? "opacity-100" : "opacity-0"} ${imgClassName}`}
      />
    </div>
  );
}

export function ImageCredit({ image, className = "" }: { image: ImageSource | undefined; className?: string }) {
  const { t } = useT();
  if (!image) return null;
  return (
    <p className={`font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-dust ${className}`}>
      {t("common.imageCredit")}: {image.credit} ·{" "}
      <a href={image.page} target="_blank" rel="noreferrer noopener" className="link-underline hover:text-lunar-2">
        {image.title}
      </a>
    </p>
  );
}

/** Loading, error and ready states for anything that depends on the museum data files. */
export function DataGate({ children }: { children: ReactNode }) {
  const { state, retry } = useMuseum();
  const { t } = useT();
  if (state.status === "loading") {
    return (
      <div role="status" aria-live="polite" className="flex min-h-[50svh] flex-col items-center justify-center gap-5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="pulse-ring absolute inset-0 rounded-full bg-signal" />
          <span className="relative h-2.5 w-2.5 rounded-full bg-signal" />
        </span>
        <p className="label">{t("common.loading")}</p>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div role="alert" className="mx-auto flex min-h-[50svh] max-w-md flex-col items-center justify-center gap-5 px-4 text-center">
        <p className="label text-caution">{t("common.errorTitle")}</p>
        <p className="text-lunar-2">{t("common.errorBody")}</p>
        <p className="font-mono text-[11px] text-dust">{state.error}</p>
        <button type="button" className="btn-ghost" onClick={retry}>
          {t("common.retry")}
        </button>
      </div>
    );
  }
  return <>{children}</>;
}

export function PageIntro({ kicker, title, dek, children }: { kicker: string; title: string; dek: string; children?: ReactNode }) {
  return (
    <header className="container-x pt-[calc(var(--header-h)+clamp(2.5rem,8vw,6rem))] pb-10 md:pb-14">
      <p className="label mb-5">{kicker}</p>
      <h1 className="display max-w-5xl text-[clamp(2.4rem,7vw,5.75rem)]">{title}</h1>
      <p className="mt-6 max-w-2xl text-[clamp(1rem,1.6vw,1.2rem)] leading-relaxed text-lunar-2">{dek}</p>
      {children}
    </header>
  );
}

export function StatusDot({ status }: { status: "silent" | "active" | "lost" }) {
  if (status === "active") {
    return (
      <span aria-hidden className="relative inline-flex h-2 w-2">
        <span className="pulse-ring absolute inset-0 rounded-full bg-signal" />
        <span className="relative h-2 w-2 rounded-full bg-signal" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={`inline-block h-2 w-2 rounded-full ${status === "lost" ? "border border-dust" : "bg-lunar-2/70"}`}
    />
  );
}
