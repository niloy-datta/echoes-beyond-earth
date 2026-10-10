"use client";
import type { ReactNode } from "react";
import type { Mood } from "../three/bhulu";
import { useMuseum } from "@/lib/data";
import { assetPath } from "@/lib/asset-path";
import { photoKeys } from "../content/photos";
import { useM } from "./strings";

/** Flat SVG portrait of Bhulu for dialogue boxes (the 3D model lives in three/bhulu.ts). */
export function BhuluAvatar({ mood = "idle", size = 72, className = "" }: { mood?: Mood; size?: number; className?: string }) {
  const sad = mood === "sad";
  const happy = mood === "happy" || mood === "wave" || mood === "salute";
  const talk = mood === "talk" || mood === "point";
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label="Bhulu" className={className}>
      <defs>
        <radialGradient id="bh-glass" cx="35%" cy="28%" r="80%">
          <stop offset="0" stopColor="#e9f6ff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#8fc7ff" stopOpacity="0.12" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="52" r="44" fill="#0b1a2a" opacity="0.5" />
      {/* ears */}
      <g fill="#a8702f">
        <ellipse cx="22" cy={sad ? 62 : 52} rx="9" ry={sad ? 17 : 19} transform={`rotate(${sad ? 8 : 18} 22 ${sad ? 62 : 52})`} />
        <ellipse cx="78" cy={sad ? 62 : 52} rx="9" ry={sad ? 17 : 19} transform={`rotate(${sad ? -8 : -18} 78 ${sad ? 62 : 52})`} />
      </g>
      {/* head */}
      <ellipse cx="50" cy="52" rx="28" ry="26" fill="#d9a05b" />
      <ellipse cx="50" cy="63" rx="16" ry="12" fill="#f6e7c8" />
      <ellipse cx="36" cy="46" rx="6.5" ry="7.5" fill="#a8702f" opacity="0.85" />
      {/* eyes */}
      <g>
        <ellipse cx="38" cy="46" rx="6" ry={happy ? 3 : 6.5} fill="#fff" />
        <ellipse cx="62" cy="46" rx="6" ry={happy ? 3 : 6.5} fill="#fff" />
        {!happy && (<><circle cx="39" cy="47.5" r="3.4" fill="#14110f" /><circle cx="61" cy="47.5" r="3.4" fill="#14110f" /><circle cx="40.2" cy="46" r="1.1" fill="#fff" /><circle cx="62.2" cy="46" r="1.1" fill="#fff" /></>)}
        {sad && (<><path d="M31 37 L44 40" stroke="#6b4118" strokeWidth="2" strokeLinecap="round" /><path d="M69 37 L56 40" stroke="#6b4118" strokeWidth="2" strokeLinecap="round" /></>)}
      </g>
      {/* nose + mouth */}
      <ellipse cx="50" cy="58" rx="4.6" ry="3.4" fill="#14110f" />
      {sad && <path d="M42 70 Q50 64 58 70" fill="none" stroke="#14110f" strokeWidth="2" strokeLinecap="round" />}
      {!sad && !talk && <path d="M42 66 Q50 74 58 66" fill="none" stroke="#14110f" strokeWidth="2" strokeLinecap="round" />}
      {talk && <ellipse cx="50" cy="69" rx="5" ry="3.8" fill="#7a1f2a" />}
      {happy && <ellipse cx="50" cy="72" rx="4" ry="3" fill="#e46a7a" />}
      {/* helmet */}
      <circle cx="50" cy="50" r="40" fill="url(#bh-glass)" stroke="#cfe8ff" strokeOpacity="0.7" strokeWidth="2.2" />
      <path d="M22 30 A34 34 0 0 1 44 15" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" />
      <rect x="28" y="86" width="44" height="8" rx="4" fill="#f08a3c" />
    </svg>
  );
}

export function Stars({ n, of = 3, size = 16 }: { n: number; of?: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${Math.max(0, n)}/${of}`} role="img">
      {Array.from({ length: of }, (_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path d="M12 2.6l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.8l-5.8 3.3 1.4-6.4L2.7 9.3l6.5-.7z" fill={i < n ? "#ffd166" : "none"} stroke={i < n ? "#ffd166" : "#7d7c78"} strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
}

export function ExtLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  const { m } = useM();
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className={`link-underline inline-flex max-w-full items-baseline gap-1.5 break-all text-signal hover:text-lunar ${className}`}>
      <span>{children}</span>
      <span aria-hidden>↗</span>
      <span className="sr-only">({m("rev.opensNew")})</span>
    </a>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`border border-hairline-strong bg-void-2/80 backdrop-blur-sm ${className}`}>{children}</div>;
}

export function StatusPill({ status, label, body }: { status: "silent" | "active" | "lost"; label: string; body: string }) {
  return (
    <span className="flex shrink-0 flex-col items-end gap-1 font-mono text-[10px] uppercase tracking-[0.12em]">
      <span className="text-lunar-2">{body}</span>
      <span className={status === "active" ? "text-signal" : status === "lost" ? "text-caution" : "text-dust"}>{label}</span>
    </span>
  );
}

export function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)} className="h-2 w-full overflow-hidden rounded-full bg-void-3">
      <div className="h-full rounded-full bg-signal transition-[width] duration-700" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Loading({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[40svh] flex-col items-center justify-center gap-5">
      <span className="relative flex h-2.5 w-2.5">
        <span className="pulse-ring absolute inset-0 rounded-full bg-signal" />
        <span className="relative h-2.5 w-2.5 rounded-full bg-signal" />
      </span>
      <p className="label">{label}</p>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { m } = useM();
  return (
    <div role="alert" className="mx-auto flex min-h-[40svh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-lunar-2">{m("common.error")}</p>
      <p className="font-mono text-[11px] text-dust">{message}</p>
      {onRetry && <button type="button" className="btn-ghost" onClick={onRetry}>{m("common.retry")}</button>}
    </div>
  );
}

/** Real NASA photographs (bundled) for a catalog object: thumbnails that open full size, each with credit and NASA page. */
export function PhotoStrip({ objectId, compact = false }: { objectId: string | undefined; compact?: boolean }) {
  const { m } = useM();
  const { data } = useMuseum();
  const imgs = photoKeys(objectId).map((k) => data?.image(k)).filter((x): x is NonNullable<typeof x> => !!x);
  if (!imgs.length) return null;
  return (
    <section aria-label={m("ph.title")} className="border border-hairline-strong bg-void-2/80 p-3">
      <h3 className="label mb-2">{m("ph.title")}</h3>
      <ul className={`grid gap-3 ${compact ? "grid-cols-2" : imgs.length > 1 ? "sm:grid-cols-2" : ""}`} role="list">
        {imgs.map((img) => (
          <li key={img.file}>
            <figure>
              <a href={assetPath(img.file)} target="_blank" rel="noreferrer noopener" aria-label={`${m("ph.open")}: ${img.title}`} className="block overflow-hidden bg-void-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- static export */}
                <img src={assetPath(img.file)} alt={img.title} width={img.width} height={img.height} loading="lazy" className="h-40 w-full object-cover transition-transform hover:scale-[1.03]" />
              </a>
              <figcaption className="mt-1.5 text-[11px] leading-snug text-dust">
                <span className="text-lunar-2">{img.title}</span> · {m("ph.credit")}: {img.credit}{" "}
                <a className="link-underline" href={img.page} target="_blank" rel="noreferrer noopener">NASA ↗</a>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
