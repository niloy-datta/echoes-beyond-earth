/**
 * Orbit follow camera with terrain/boulder collision avoidance.
 * Pure math: the 3D renderer copies the result into a THREE.PerspectiveCamera.
 */
import { clamp, damp, lerpAngle, wrapAngle } from "./math.ts";
import { heightAt, type CollisionGrid } from "./terrain.ts";

export interface CameraRig {
  yaw: number;
  pitch: number;
  /** Desired orbit distance (mouse wheel / pinch). */
  distance: number;
  /** Actual, collision-limited distance. */
  current: number;
  /** Seconds since the player last moved the camera manually. */
  idle: number;
}

export const PITCH_MIN = -0.25;
export const PITCH_MAX = 1.15;
export const DISTANCE_MIN = 2.6;
export const DISTANCE_MAX = 10;
const TARGET_HEIGHT = 1.55;

export function createRig(yaw = 0): CameraRig {
  return { yaw, pitch: 0.32, distance: 5.6, current: 5.6, idle: 10 };
}

export function applyLook(rig: CameraRig, dx: number, dy: number, sensitivity: number, invertY: boolean): CameraRig {
  if (dx === 0 && dy === 0) return rig;
  const s = 0.0042 * sensitivity;
  return {
    ...rig,
    yaw: wrapAngle(rig.yaw - dx * s),
    pitch: clamp(rig.pitch + (invertY ? -dy : dy) * s, PITCH_MIN, PITCH_MAX),
    idle: 0,
  };
}

export function applyZoom(rig: CameraRig, delta: number): CameraRig {
  return { ...rig, distance: clamp(rig.distance + delta, DISTANCE_MIN, DISTANCE_MAX) };
}

export interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
}

/**
 * Step the rig and resolve the collision-safe pose. `facing` is the player's
 * yaw; when `autoFollow` is on and the player is moving, the rig slowly swings
 * behind them after a short pause in manual input.
 */
export function stepRig(
  rig: CameraRig,
  player: { x: number; y: number; z: number; yaw: number; speed: number },
  dt: number,
  autoFollow: boolean,
  grid: CollisionGrid | null,
): { rig: CameraRig; pose: CameraPose } {
  let yaw = rig.yaw;
  const idle = rig.idle + dt;
  if (autoFollow && idle > 1.6 && player.speed > 1) {
    // Camera yaw that places the camera behind the player's facing direction.
    const behind = wrapAngle(player.yaw + Math.PI);
    yaw = lerpAngle(yaw, behind, damp(0.9, dt) * clamp(player.speed / 4, 0, 1));
  }

  const tx = player.x, ty = player.y + TARGET_HEIGHT, tz = player.z;
  const cp = Math.cos(rig.pitch), sp = Math.sin(rig.pitch);
  const dirX = Math.sin(yaw) * cp, dirY = sp, dirZ = Math.cos(yaw) * cp;

  // March along the boom and stop before terrain or a boulder would block the view.
  let allowed = rig.distance;
  const steps = 14;
  for (let i = 1; i <= steps; i++) {
    const d = (rig.distance * i) / steps;
    const px = tx + dirX * d, py = ty + dirY * d, pz = tz + dirZ * d;
    let blocked = py < heightAt(px, pz) + 0.35;
    if (!blocked && grid) {
      for (const c of grid.near(px, pz)) {
        if (Math.hypot(px - c.x, pz - c.z) < c.r + 0.25 && py < heightAt(c.x, c.z) + (c.h ?? c.r * 1.4)) { blocked = true; break; }
      }
    }
    // Never collapse inside the explorer's helmet; a short boom reads better than a clipped one.
    if (blocked) { allowed = Math.max(1.6, (rig.distance * (i - 1)) / steps); break; }
  }
  // Pull in quickly to avoid clipping, ease back out slowly to avoid popping.
  const current = allowed < rig.current
    ? rig.current + (allowed - rig.current) * damp(18, dt)
    : rig.current + (allowed - rig.current) * damp(2.5, dt);

  const position: [number, number, number] = [tx + dirX * current, ty + dirY * current, tz + dirZ * current];
  const floor = heightAt(position[0], position[2]) + 0.3;
  if (position[1] < floor) position[1] = floor;
  return {
    rig: { ...rig, yaw, idle, current },
    pose: { position, target: [tx, ty, tz] },
  };
}
