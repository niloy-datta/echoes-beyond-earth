"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { clearStore, readStore, writeStore } from "./storage";

export interface Passport {
  discovered: string[]; // objects found on the explorer, archive or in capsules
  capsules: string[]; // memory capsules opened
  signals: string[]; // last-signal sequences witnessed
  lenses: string[]; // then/now pairs compared
  ripples: string[]; // legacy ripples explored
  pathSteps: Record<string, string[]>; // path id → object ids visited along it
  firstVisit: string | null;
  /** A playful, locally generated explorer number — never sent anywhere. */
  explorerId: string | null;
}

const EMPTY: Passport = { discovered: [], capsules: [], signals: [], lenses: [], ripples: [], pathSteps: {}, firstVisit: null, explorerId: null };
export type PassportList = "discovered" | "capsules" | "signals" | "lenses" | "ripples";

interface Ctx {
  passport: Passport;
  mark: (key: PassportList, id: string) => void;
  markPathStep: (pathId: string, objectId: string) => void;
  reset: () => void;
}

const PassportCtx = createContext<Ctx | null>(null);

function newExplorerId() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `EBE-${new Date().getFullYear()}-${n}`;
}

export function PassportProvider({ children }: { children: ReactNode }) {
  const [passport, setPassport] = useState<Passport>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStore<Partial<Passport>>("passport", {});
    setPassport({ ...EMPTY, ...stored, firstVisit: stored.firstVisit ?? new Date().toISOString().slice(0, 10), explorerId: stored.explorerId ?? newExplorerId() });
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) writeStore("passport", passport);
  }, [passport, ready]);

  const mark = useCallback((key: PassportList, id: string) => {
    setPassport((p) => (p[key].includes(id) ? p : { ...p, [key]: [...p[key], id] }));
  }, []);

  const markPathStep = useCallback((pathId: string, objectId: string) => {
    setPassport((p) => {
      const steps = p.pathSteps[pathId] ?? [];
      if (steps.includes(objectId)) return p;
      return { ...p, pathSteps: { ...p.pathSteps, [pathId]: [...steps, objectId] } };
    });
  }, []);

  const reset = useCallback(() => {
    clearStore("passport");
    setPassport({ ...EMPTY, firstVisit: new Date().toISOString().slice(0, 10), explorerId: newExplorerId() });
  }, []);

  const value = useMemo(() => ({ passport, mark, markPathStep, reset }), [passport, mark, markPathStep, reset]);
  return <PassportCtx.Provider value={value}>{children}</PassportCtx.Provider>;
}

export function usePassport() {
  const ctx = useContext(PassportCtx);
  if (!ctx) throw new Error("usePassport must be used inside <PassportProvider>");
  return ctx;
}
