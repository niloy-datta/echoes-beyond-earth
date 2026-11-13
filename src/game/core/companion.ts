/**
 * EKO companion behaviour: a hovering follower that shadows the explorer,
 * scouts toward the current objective when the player hesitates, inspects
 * nearby discoveries and carries an emotion state for animation and dialogue.
 * EKO is a fictional character; nothing it does represents NASA data.
 */
import { clamp, damp, lerpAngle, type Vec2 } from "./math.ts";
import { heightAt } from "./terrain.ts";

export type EkoEmotion = "idle" | "curious" | "discovery" | "excited" | "concerned" | "sad" | "hopeful";
export type EkoMode = "follow" | "guide" | "inspect";

export interface CompanionState {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  yaw: number;
  mode: EkoMode;
  emotion: EkoEmotion;
  /** Seconds remaining for a transient emotion before returning to the mood. */
  emotionTime: number;
  /** Baseline mood set by the story (e.g. concerned during the storm). */
  mood: EkoEmotion;
  /** Accumulated time used for idle animation. */
  clock: number;
}

export function createCompanion(at: Vec2): CompanionState {
  return {
    x: at.x + 1.2, y: heightAt(at.x, at.z) + 1.6, z: at.z + 1,
    vx: 0, vy: 0, vz: 0, yaw: Math.PI, mode: "follow", emotion: "idle", emotionTime: 0, mood: "idle", clock: 0,
  };
}

export function emote(c: CompanionState, emotion: EkoEmotion, seconds = 3.2): CompanionState {
  return { ...c, emotion, emotionTime: seconds };
}

export interface CompanionContext {
  player: { x: number; y: number; z: number; yaw: number; speed: number };
  /** Seconds the player has been standing still. */
  playerIdle: number;
  /** Current objective location, if any. */
  objective: Vec2 | null;
  /** A discovery close to the player that EKO should hover beside. */
  inspect: Vec2 | null;
}

const MAX_SPEED = 9;

export function stepCompanion(c: CompanionState, ctx: CompanionContext, dt: number): CompanionState {
  dt = clamp(dt, 0, 0.1);
  const { player } = ctx;
  let mode: EkoMode = "follow";
  // Default slot: beside the explorer and slightly ahead, so it stays in view
  // of the third-person camera instead of floating between camera and player.
  const side = player.yaw - Math.PI * 0.32;
  let tx = player.x + Math.sin(side) * 1.5;
  let tz = player.z + Math.cos(side) * 1.5;
  let lookX = player.x, lookZ = player.z;

  if (ctx.inspect && Math.hypot(ctx.inspect.x - player.x, ctx.inspect.z - player.z) < 6) {
    mode = "inspect";
    // Hover just past the target, offset sideways: visible beyond the discovery.
    const ax = ctx.inspect.x - player.x, az = ctx.inspect.z - player.z;
    const len = Math.hypot(ax, az) || 1;
    tx = ctx.inspect.x + (ax / len) * 0.9 + (-az / len) * 1.1;
    tz = ctx.inspect.z + (az / len) * 0.9 + (ax / len) * 1.1;
    lookX = ctx.inspect.x; lookZ = ctx.inspect.z;
  } else if (ctx.objective && ctx.playerIdle > 6) {
    const dx = ctx.objective.x - player.x, dz = ctx.objective.z - player.z;
    const d = Math.hypot(dx, dz);
    if (d > 8) {
      // Scout a few metres toward the goal as a gentle wayfinding hint.
      mode = "guide";
      const reach = Math.min(4.5, d * 0.5);
      tx = player.x + (dx / d) * reach;
      tz = player.z + (dz / d) * reach;
      lookX = ctx.objective.x; lookZ = ctx.objective.z;
    }
  }

  const emotionTime = Math.max(0, c.emotionTime - dt);
  c = { ...c, clock: c.clock + dt, emotionTime };
  const emotion = emotionTime > 0 ? c.emotion : c.mood;
  const hover = emotion === "concerned" || emotion === "sad" ? 1.25 : emotion === "excited" ? 1.95 : 1.6;
  const ty = Math.max(heightAt(tx, tz), player.y) + hover;

  // Critically damped spring toward the slot.
  const stiffness = mode === "guide" ? 3.2 : 5.5;
  const k = damp(stiffness, dt);
  let vx = c.vx + ((tx - c.x) * stiffness - c.vx) * k;
  let vz = c.vz + ((tz - c.z) * stiffness - c.vz) * k;
  const vy = c.vy + ((ty - c.y) * 4 - c.vy) * damp(4, dt);
  const sp = Math.hypot(vx, vz);
  if (sp > MAX_SPEED) { vx *= MAX_SPEED / sp; vz *= MAX_SPEED / sp; }

  let x = c.x + vx * dt, z = c.z + vz * dt;
  // Keep a polite distance so EKO never overlaps the explorer.
  const px = x - player.x, pz = z - player.z;
  const pd = Math.hypot(px, pz);
  if (pd < 0.9) { x = player.x + (px / (pd || 1)) * 0.9; z = player.z + (pz / (pd || 1)) * 0.9; }
  const y = Math.max(c.y + vy * dt, heightAt(x, z) + 0.7);

  const faceTarget = Math.atan2(lookX - x, lookZ - z);
  const moving = Math.hypot(vx, vz) > 1.6;
  const yaw = lerpAngle(c.yaw, moving ? Math.atan2(vx, vz) : faceTarget, damp(5, dt));

  return {
    ...c, x, y, z, vx, vy, vz, yaw, mode,
    emotion,
  };
}
