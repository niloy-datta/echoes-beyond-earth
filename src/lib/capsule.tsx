"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface CapsuleState {
  objectId: string;
  pathId?: string;
}

interface Ctx {
  current: CapsuleState | null;
  open: (objectId: string, opts?: { pathId?: string }) => void;
  close: () => void;
}

const CapsuleCtx = createContext<Ctx | null>(null);
const HASH = "#capsule=";

/** Memory Capsules open over any page. The URL hash makes each one deep-linkable without a server. */
export function CapsuleProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<CapsuleState | null>(null);

  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash;
      if (h.startsWith(HASH)) {
        const [objectId, pathId] = decodeURIComponent(h.slice(HASH.length)).split("@");
        if (objectId) setCurrent({ objectId, pathId: pathId || undefined });
      } else {
        setCurrent(null);
      }
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  const open = useCallback((objectId: string, opts?: { pathId?: string }) => {
    const value = opts?.pathId ? `${objectId}@${opts.pathId}` : objectId;
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}${HASH}${encodeURIComponent(value)}`);
    setCurrent({ objectId, pathId: opts?.pathId });
  }, []);

  const close = useCallback(() => {
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    setCurrent(null);
  }, []);

  const value = useMemo(() => ({ current, open, close }), [current, open, close]);
  return <CapsuleCtx.Provider value={value}>{children}</CapsuleCtx.Provider>;
}

export function useCapsule() {
  const ctx = useContext(CapsuleCtx);
  if (!ctx) throw new Error("useCapsule must be used inside <CapsuleProvider>");
  return ctx;
}
