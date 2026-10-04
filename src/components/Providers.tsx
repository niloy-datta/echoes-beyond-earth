"use client";
import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";
import { CapsuleProvider } from "@/lib/capsule";
import { DataProvider } from "@/lib/data";
import { PassportProvider } from "@/lib/passport";
import { SettingsProvider, useSettings } from "@/lib/settings";
import { SoundProvider } from "@/lib/sound";
import { CapsuleOverlay } from "./CapsuleOverlay";

function Motion({ children }: { children: ReactNode }) {
  const { reducedMotion } = useSettings();
  return <MotionConfig reducedMotion={reducedMotion ? "always" : "never"}>{children}</MotionConfig>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <Motion>
        <SoundProvider>
          <DataProvider>
            <PassportProvider>
              <CapsuleProvider>
                {children}
                <CapsuleOverlay />
              </CapsuleProvider>
            </PassportProvider>
          </DataProvider>
        </SoundProvider>
      </Motion>
    </SettingsProvider>
  );
}
