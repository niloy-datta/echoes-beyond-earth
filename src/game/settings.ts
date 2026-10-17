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

export type QualityTier = Exclude<QualityPreset, "auto">;
export const QUALITY_LADDER: readonly QualityTier[] = ["low", "medium", "high", "ultra"];
/** Render-resolution steps tried before geometry/shadow quality drops. */
export const RESOLUTION_STEPS: readonly number[] = [1, 0.85, 0.72];

export interface AdaptiveState {
  tier: QualityTier;
  /** Index into RESOLUTION_STEPS. */
  res: number;
  /** Highest tier auto may climb back to (the initial auto guess). */
  ceiling: QualityTier;
  lowWindows: number;
  goodWindows: number;
  /** How often each tier has been abandoned for low frame rate. */
  drops: Partial<Record<QualityTier, number>>;
}

export function createAdaptive(tier: QualityTier): AdaptiveState {
  return { tier, res: 0, ceiling: tier, lowWindows: 0, goodWindows: 0, drops: {} };
}

/**
 * Auto quality, evaluated once per measurement window (~2.5 s).
 *
 * Down: two consecutive slow windows lower render resolution first (cheap, no
 * shader recompile), then the full tier: Ultra → High → Medium → Low.
 * Up (hysteresis): eight consecutive windows with clear headroom restore
 * resolution, then one tier, never above the initial guess, and never back to
 * a tier that has already been abandoned twice, so it cannot oscillate.
 */
export function adaptQuality(s: AdaptiveState, fps: number, coarse: boolean): AdaptiveState {
  const slow = coarse ? 26 : 42;
  const smooth = coarse ? 45 : 57;
  if (!Number.isFinite(fps) || fps <= 0) return s;
  const i = QUALITY_LADDER.indexOf(s.tier);
  if (fps < slow) {
    const lowWindows = s.lowWindows + 1;
    if (lowWindows < 2) return { ...s, lowWindows, goodWindows: 0 };
    if (s.res < RESOLUTION_STEPS.length - 1) return { ...s, res: s.res + 1, lowWindows: 0, goodWindows: 0 };
    if (i === 0) return { ...s, lowWindows: 0, goodWindows: 0 };
    return { ...s, tier: QUALITY_LADDER[i - 1], res: 0, lowWindows: 0, goodWindows: 0, drops: { ...s.drops, [s.tier]: (s.drops[s.tier] ?? 0) + 1 } };
  }
  if (fps < smooth) return { ...s, lowWindows: 0, goodWindows: 0 };
  const goodWindows = s.goodWindows + 1;
  if (goodWindows < 8) return { ...s, lowWindows: 0, goodWindows };
  if (s.res > 0) return { ...s, res: s.res - 1, lowWindows: 0, goodWindows: 0 };
  const up = QUALITY_LADDER[i + 1];
  if (up && i < QUALITY_LADDER.indexOf(s.ceiling) && (s.drops[up] ?? 0) < 2) {
    return { ...s, tier: up, res: RESOLUTION_STEPS.length - 1, lowWindows: 0, goodWindows: 0 };
  }
  return { ...s, lowWindows: 0, goodWindows: 0 };
}
