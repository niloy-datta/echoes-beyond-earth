/**
 * Game-only preferences (graphics, audio, controls, explorer customisation).
 * Language and reduced motion stay in the museum-wide SettingsProvider.
 */
export type QualityPreset = "auto" | "low" | "medium" | "high" | "ultra";
export type SuitAccent = "amber" | "cyan" | "coral" | "ivory";

export interface GameSettings {
  quality: QualityPreset;
  showFps: boolean;
  master: number;
  music: number;
  sfx: number;
  voice: boolean;
  subtitles: "normal" | "large";
  sensitivity: number;
  invertY: boolean;
  autoCamera: boolean;
  mouseCapture: boolean;
  suit: SuitAccent;
}

export const GAME_SETTINGS_KEY = "game:settings";

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  quality: "auto", showFps: false, master: 0.8, music: 0.55, sfx: 0.8, voice: false, subtitles: "normal",
  sensitivity: 1, invertY: false, autoCamera: true, mouseCapture: true, suit: "amber",
};

export const SUIT_COLORS: Record<SuitAccent, string> = { amber: "#d9934a", cyan: "#4fd8e6", coral: "#e0715c", ivory: "#d8d2c4" };

const unit = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d);

export function sanitizeGameSettings(raw: unknown): GameSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_GAME_SETTINGS;
  return {
    quality: (["auto", "low", "medium", "high", "ultra"] as const).includes(r.quality as QualityPreset) ? r.quality as QualityPreset : d.quality,
    showFps: r.showFps === true,
    master: unit(r.master, d.master),
    music: unit(r.music, d.music),
    sfx: unit(r.sfx, d.sfx),
    voice: r.voice === true,
    subtitles: r.subtitles === "large" ? "large" : "normal",
    sensitivity: typeof r.sensitivity === "number" && Number.isFinite(r.sensitivity) ? Math.min(2.5, Math.max(0.3, r.sensitivity)) : d.sensitivity,
    invertY: r.invertY === true,
    autoCamera: r.autoCamera !== false,
    mouseCapture: r.mouseCapture !== false,
    suit: (Object.keys(SUIT_COLORS) as SuitAccent[]).includes(r.suit as SuitAccent) ? r.suit as SuitAccent : d.suit,
  };
}

export interface QualityProfile {
  pixelRatio: number;
  shadows: 0 | 1024 | 2048 | 3072;
  terrainSegments: number;
  rocks: number;
  dust: number;
  antialias: boolean;
  astronaut: "low" | "high" | "ultra";
}

export function qualityProfile(preset: Exclude<QualityPreset, "auto">, dpr: number): QualityProfile {
  switch (preset) {
    case "low": return { pixelRatio: Math.min(dpr, 1) * 0.85, shadows: 0, terrainSegments: 140, rocks: 320, dust: 350, antialias: false, astronaut: "low" };
    case "medium": return { pixelRatio: Math.min(dpr, 1.35), shadows: 1024, terrainSegments: 200, rocks: 620, dust: 1100, antialias: true, astronaut: "high" };
    case "high": return { pixelRatio: Math.min(dpr, 2), shadows: 2048, terrainSegments: 256, rocks: 900, dust: 2400, antialias: true, astronaut: "high" };
    case "ultra": return { pixelRatio: Math.min(dpr, 2.25), shadows: 3072, terrainSegments: 320, rocks: 1200, dust: 3200, antialias: true, astronaut: "ultra" };
  }
}

/** Initial guess for "auto": phones/tablets start low, desktops medium. */
export function autoPreset(env: { coarsePointer: boolean; cores: number; width: number }): Exclude<QualityPreset, "auto"> {
  if (env.coarsePointer || env.width < 760) return "low";
  if (env.cores >= 12 && env.width >= 1800) return "ultra";
  if (env.cores >= 8 && env.width >= 1400) return "high";
  return "medium";
}
