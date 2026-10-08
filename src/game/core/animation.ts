/**
 * Deterministic character animation state machine. Pure: given simulation
 * inputs it decides which clip layer should play and with what weights, so
 * the renderer only applies the result to an AnimationMixer.
 *
 * Locomotion uses distance-driven phase (stride / cycle length) instead of
 * time, which keeps the planted foot from sliding at any speed.
 */
export type AnimState = "idle" | "look" | "turn" | "locomotion" | "air" | "land" | "action";
export type ActionClip = "interact" | "scan" | "kneel" | "examine" | "wave";

/** Metres travelled per full walk / run cycle in the authored clips. */
export const WALK_CYCLE = 1.5;
export const RUN_CYCLE = 3.0;
/** Speeds at which the authored clips look natural. */
export const WALK_CLIP_SPEED = 1.5;
export const RUN_CLIP_SPEED = 4.3;

export const CLIP_DURATION: Record<ActionClip | "land", number> = { interact: 1.4, scan: 2.2, kneel: 2.8, examine: 2.0, wave: 1.8, land: 0.45 };

export interface AnimInput {
  speed: number;
  grounded: boolean;
  /** Seconds since the last landing (0 on the landing frame). */
  landed: number;
  /** Absolute yaw rate, rad/s. */
  yawRate: number;
  /** Requested one-shot action, if any. */
  action: ActionClip | null;
  /** Seconds the explorer has been idle. */
  idleTime: number;
  stride: number;
}

export interface AnimOutput {
  state: AnimState;
  /** Locomotion blend (sum ≈ 1 while in locomotion/idle states). */
  weights: { idle: number; walk: number; run: number; turn: number; look: number; air: number };
  /** Normalised phase 0..1 for walk and run cycles. */
  walkPhase: number;
  runPhase: number;
  /** One-shot clip to play (land or an action), with its progress 0..1. */
  oneShot: { clip: ActionClip | "land"; progress: number } | null;
  /** Cross-fade time to use when the state changes, seconds. */
  fade: number;
}

export interface AnimMemory {
  state: AnimState;
  stateTime: number;
  action: ActionClip | null;
  actionTime: number;
}

export const initialAnimMemory = (): AnimMemory => ({ state: "idle", stateTime: 0, action: null, actionTime: 0 });

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const frac = (v: number) => v - Math.floor(v);

export function stepAnimation(mem: AnimMemory, input: AnimInput, dt: number): { mem: AnimMemory; out: AnimOutput } {
  let { state, stateTime, action, actionTime } = mem;
  const prev = state;
  // Actions run to completion (the session freezes movement meanwhile).
  if (input.action && action !== input.action) { action = input.action; actionTime = 0; }
  if (action) {
    actionTime += dt;
    if (actionTime >= CLIP_DURATION[action]) { action = null; actionTime = 0; }
  }

  if (action) state = "action";
  else if (!input.grounded) state = "air";
  else if (input.landed < CLIP_DURATION.land && (prev === "air" || prev === "land")) state = "land";
  else if (input.speed > 0.35) state = "locomotion";
  else if (input.yawRate > 1.2) state = "turn";
  // After 9 s idle the explorer looks around for 6 s, repeating every 24 s.
  else if (input.idleTime > 9 && (input.idleTime - 9) % 24 < 6) state = "look";
  else state = "idle";
  stateTime = state === prev ? stateTime + dt : 0;

  // Walk ↔ run blend by speed; idle fades in below walking pace.
  const runW = clamp01((input.speed - 2.6) / 1.6);
  const moveW = clamp01((input.speed - 0.1) / 0.6);
  const weights = { idle: 0, walk: 0, run: 0, turn: 0, look: 0, air: 0 };
  if (state === "locomotion" || state === "idle") {
    weights.walk = moveW * (1 - runW);
    weights.run = moveW * runW;
    weights.idle = 1 - moveW;
  } else if (state === "turn") weights.turn = 1;
  else if (state === "look") weights.look = 1;
  else if (state === "air") weights.air = 1;

  const oneShot = state === "action" && action
    ? { clip: action, progress: clamp01(actionTime / CLIP_DURATION[action]) }
    : state === "land" ? { clip: "land" as const, progress: clamp01(input.landed / CLIP_DURATION.land) } : null;

  const fade = state === prev ? 0 : state === "land" ? 0.08 : state === "air" ? 0.15 : state === "action" ? 0.25 : 0.3;
  return {
    mem: { state, stateTime, action, actionTime },
    out: {
      state, weights, oneShot, fade,
      walkPhase: frac(input.stride / WALK_CYCLE),
      runPhase: frac(input.stride / RUN_CYCLE),
    },
  };
}
