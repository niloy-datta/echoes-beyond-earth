/**
 * Analytic two-bone IK in a 2D sagittal plane, used to plant the explorer's
 * feet on uneven terrain. Pure and allocation-free.
 */
export interface TwoBoneResult {
  /** Interior angle at the root joint (hip) relative to the target direction. */
  rootAngle: number;
  /** Bend at the middle joint (knee), 0 = straight. */
  midBend: number;
  /** True if the target was out of reach and the chain is fully extended. */
  clamped: boolean;
}

/**
 * Given bone lengths a (upper) and b (lower) and the distance d from the root
 * to the target, returns the angles that make the chain end exactly at the
 * target (law of cosines).
 */
export function solveTwoBone(a: number, b: number, d: number): TwoBoneResult {
  const max = a + b - 1e-4, min = Math.abs(a - b) + 1e-4;
  const clamped = d >= max || d <= min;
  const dist = Math.min(max, Math.max(min, d));
  const cosRoot = (a * a + dist * dist - b * b) / (2 * a * dist);
  const cosMid = (a * a + b * b - dist * dist) / (2 * a * b);
  const rootAngle = Math.acos(Math.max(-1, Math.min(1, cosRoot)));
  const midBend = Math.PI - Math.acos(Math.max(-1, Math.min(1, cosMid)));
  return { rootAngle, midBend, clamped };
}

/**
 * Foot-planting offsets for a pair of legs. Given the ground height under each
 * foot relative to the character root, returns how far to lower the pelvis
 * and how much extra each leg must shorten (positive = bend more).
 */
export function plantFeet(groundL: number, groundR: number, maxDrop = 0.25): { pelvis: number; shortenL: number; shortenR: number } {
  const low = Math.min(groundL, groundR, 0);
  const pelvis = Math.max(-maxDrop, low);
  return { pelvis, shortenL: Math.max(0, groundL - pelvis), shortenR: Math.max(0, groundR - pelvis) };
}
