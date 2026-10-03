/**
 * Deterministic, dependency-free EKO mission mechanics. No NASA telemetry is simulated.
 * The position system exists ONLY for wayfinding in an invented educational scene.
 */
export const EKO_START = Object.freeze({ x: 0, z: 4.1 });
export const EKO_STEP = 0.75;
export const EKO_BOUNDARY = Object.freeze({ xmin: -7.5, xmax: 7.5, zmin: -6, zmax: 7.5 });
export const EKO_SCAN_RADIUS = 2.1;

export type EkoDirection = "forward" | "back" | "left" | "right";
export type EkoPosition = { x: number; z: number };
export type EkoWaypoint = { id: string; position: EkoPosition };

export function moveEko(current: EkoPosition, direction: EkoDirection): EkoPosition {
  const dx = direction === "left" ? -EKO_STEP : direction === "right" ? EKO_STEP : 0;
  const dz = direction === "forward" ? -EKO_STEP : direction === "back" ? EKO_STEP : 0;
  return {
    x: Math.max(EKO_BOUNDARY.xmin, Math.min(EKO_BOUNDARY.xmax, current.x + dx)),
    z: Math.max(EKO_BOUNDARY.zmin, Math.min(EKO_BOUNDARY.zmax, current.z + dz)),
  };
}

export function nearestEkoStop<T extends EkoWaypoint>(current: EkoPosition, stops: readonly T[], radius = EKO_SCAN_RADIUS): T | null {
  if (!Number.isFinite(current.x) || !Number.isFinite(current.z)) return null;
  let best: T | null = null;
  let min = radius;
  for (const stop of stops) {
    const d = Math.hypot(stop.position.x - current.x, stop.position.z - current.z);
    if (d <= min) { best = stop; min = d; }
  }
  return best;
}

export function sanitizeEkoProgress<T extends string>(raw: unknown, validIds: readonly T[]): T[] {
  if (!Array.isArray(raw)) return [];
  const accepted = new Set<string>(validIds);
  return [...new Set(raw.filter((id): id is T => typeof id === "string" && accepted.has(id)))];
}

export function ekoProgressCount(ids: readonly string[], total: number): number {
  return Math.max(0, Math.min(total, new Set(ids).size));
}
