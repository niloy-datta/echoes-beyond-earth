/**
 * Third-person explorer kinematics: camera-relative movement, smooth
 * acceleration, sprint, low-gravity jump, terrain following and collision.
 */
import { WORLD_RADIUS } from "../content/world.ts";
import { clamp, damp, lerpAngle, type Vec2 } from "./math.ts";
import { heightAt, resolveCircles, slopeAt, type CollisionGrid } from "./terrain.ts";

export const WALK_SPEED = 3.1;
export const SPRINT_SPEED = 6.2;
/** Mars surface gravity, m/s². The jump is deliberately floaty. */
export const MARS_GRAVITY = 3.71;
export const JUMP_VELOCITY = 3.0;
export const PLAYER_RADIUS = 0.42;

export interface PlayerState {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  /** Facing angle; the model looks along (sin(yaw), cos(yaw)). */
  yaw: number;
  grounded: boolean;
  /** Horizontal speed, m/s. */
  speed: number;
  /** Walk-cycle phase, advanced by distance travelled. */
  stride: number;
  /** Metres walked (for stats/achievements). */
  travelled: number;
  /** Seconds since last landing (drives landing squash). */
  landed: number;
}

export interface MoveInput {
  /** Strafe axis, -1 (left) .. 1 (right). */
  x: number;
  /** Forward axis, -1 (back) .. 1 (forward). */
  y: number;
  sprint: boolean;
  jump: boolean;
}

export function createPlayer(at: Vec2, yaw = Math.PI): PlayerState {
  return {
    x: at.x, z: at.z, y: heightAt(at.x, at.z),
    vx: 0, vy: 0, vz: 0, yaw, grounded: true, speed: 0, stride: 0, travelled: 0, landed: 1,
  };
}

/**
 * Advance the explorer by `dt` seconds. `cameraYaw` is the orbit angle of the
 * camera around the player, so "forward" always means "away from the camera".
 */
export function stepPlayer(p: PlayerState, input: MoveInput, dt: number, cameraYaw: number, grid: CollisionGrid | null): PlayerState {
  dt = Number.isFinite(dt) ? clamp(dt, 0, 0.1) : 0;
  let mx = Number.isNaN(input.x) ? 0 : clamp(input.x, -1, 1);
  let my = Number.isNaN(input.y) ? 0 : clamp(input.y, -1, 1);
  const mag = Math.hypot(mx, my);
  if (mag > 1) { mx /= mag; my /= mag; }

  const fx = -Math.sin(cameraYaw), fz = -Math.cos(cameraYaw);
  const rx = Math.cos(cameraYaw), rz = -Math.sin(cameraYaw);
  const dirX = fx * my + rx * mx;
  const dirZ = fz * my + rz * mx;
  const target = input.sprint ? SPRINT_SPEED : WALK_SPEED;

  let tvx = dirX * target, tvz = dirZ * target;
  // Steep slopes slow the explorer instead of letting them climb walls.
  if (mag > 0.01) {
    const aheadX = p.x + dirX * 0.6, aheadZ = p.z + dirZ * 0.6;
    const rise = heightAt(aheadX, aheadZ) - heightAt(p.x, p.z);
    const steep = clamp((rise / 0.6 - 0.55) / 0.5, 0, 0.92);
    tvx *= 1 - steep; tvz *= 1 - steep;
  }

  const accel = mag > 0.01 ? (p.grounded ? 9 : 2.5) : (p.grounded ? 11 : 1.2);
  const k = damp(accel, dt);
  const vx = p.vx + (tvx - p.vx) * k;
  const vz = p.vz + (tvz - p.vz) * k;

  let nx = p.x + vx * dt, nz = p.z + vz * dt;
  if (grid) ({ x: nx, z: nz } = resolveCircles({ x: nx, z: nz }, PLAYER_RADIUS, grid));
  const r = Math.hypot(nx, nz);
  if (r > WORLD_RADIUS) { nx *= WORLD_RADIUS / r; nz *= WORLD_RADIUS / r; }

  const ground = heightAt(nx, nz);
  let vy = p.vy, y = p.y, grounded = p.grounded, landed = p.landed + dt;
  if (grounded && input.jump) { vy = JUMP_VELOCITY; grounded = false; }
  if (!grounded) {
    vy -= MARS_GRAVITY * dt;
    y += vy * dt;
    if (y <= ground) { y = ground; vy = 0; grounded = true; landed = 0; }
  } else {
    // Stick to the ground, but ease small steps so the camera does not jitter.
    y = ground;
    if (slopeAt(nx, nz) > 2.5) y = Math.max(ground, p.y - 0.2);
  }

  const moved = Math.hypot(nx - p.x, nz - p.z);
  const speed = Math.hypot(vx, vz);
  const yaw = speed > 0.25 ? lerpAngle(p.yaw, Math.atan2(vx, vz), damp(12, dt)) : p.yaw;
  return {
    x: nx, y, z: nz, vx, vy, vz, yaw, grounded, speed,
    stride: p.stride + (grounded ? moved : 0),
    travelled: p.travelled + moved,
    landed,
  };
}
