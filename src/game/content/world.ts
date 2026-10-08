/**
 * Layout of the playable stage. These coordinates are GAME-SPACE metres in an
 * artistic landscape. They are NOT Martian coordinates and the stage is not a
 * reconstruction of Meridiani Planum, Eagle crater or Endeavour crater.
 */
import type { Vec2 } from "../core/math.ts";

export type PoiKind = "beacon" | "rover" | "component" | "record" | "archive" | "pedestal" | "side" | "waypoint";

export interface Poi {
  id: string;
  kind: PoiKind;
  position: Vec2;
  /** Distance at which the explorer can interact with (or "reach") the point. */
  radius: number;
}

/** Walkable disc. Beyond it the land rises into the rim mountains. */
export const WORLD_RADIUS = 104;
export const WORLD_SEED = 20180610;

export const ROVER_POSITION: Vec2 = { x: 18, z: 0 };
export const ROVER_HEADING = -0.55;

/** Rover-local (x, z) → world, matching the renderer's rotation.y = ROVER_HEADING. */
export function roverToWorld(lx: number, lz: number): Vec2 {
  const c = Math.cos(ROVER_HEADING), s = Math.sin(ROVER_HEADING);
  return { x: ROVER_POSITION.x + lx * c + lz * s, z: ROVER_POSITION.z - lx * s + lz * c };
}

/**
 * Where each component is scanned from (stand) and where its marker ring sits
 * (ring, y = metres above the rover's base), measured against NASA's GLB once
 * it is scaled to ~1.5 m tall: wheels along local x ≈ ±0.7, solar deck over
 * z ∈ [-1.3, 0], Pancam mast near the deck centre, arm toward +z (the front).
 * Each part is approached from a different side so prompts never compete.
 */
export const ROVER_PARTS = {
  "comp-wheels": { stand: { x: -1.05, z: -0.55 }, ring: { x: -0.82, y: 0.28, z: -0.55 } },
  "comp-solar": { stand: { x: 0.05, z: -1.45 }, ring: { x: 0, y: 0.95, z: -0.85 } },
  "comp-mast": { stand: { x: 1.05, z: 0.15 }, ring: { x: 0.1, y: 1.5, z: -0.12 } },
} as const;
export const ARCHIVE_POSITION: Vec2 = { x: -38, z: -30 };
/** Archive monolith offsets from its centre (rendered and used as colliders). */
export const ARCHIVE_PILLARS: readonly (readonly [number, number])[] = [[-8.6, 0], [8.6, 0], [0, -8.6], [0, 8.6]];

export const POIS: readonly Poi[] = [
  { id: "spawn", kind: "waypoint", position: { x: 0, z: 70 }, radius: 3 },
  { id: "ridge", kind: "waypoint", position: { x: 5, z: 52 }, radius: 4.5 },
  { id: "beacon-alpha", kind: "beacon", position: { x: -11, z: 36 }, radius: 3.2 },
  { id: "rover-site", kind: "rover", position: { x: 18, z: 7 }, radius: 7 },
  { id: "comp-wheels", kind: "component", position: roverToWorld(ROVER_PARTS["comp-wheels"].stand.x, ROVER_PARTS["comp-wheels"].stand.z), radius: 1.7 },
  { id: "comp-solar", kind: "component", position: roverToWorld(ROVER_PARTS["comp-solar"].stand.x, ROVER_PARTS["comp-solar"].stand.z), radius: 1.7 },
  { id: "comp-mast", kind: "component", position: roverToWorld(ROVER_PARTS["comp-mast"].stand.x, ROVER_PARTS["comp-mast"].stand.z), radius: 1.7 },
  { id: "rover-terminal", kind: "component", position: roverToWorld(-1.6, 2.9), radius: 2.2 },
  { id: "storm-record-1", kind: "record", position: { x: 2, z: -26 }, radius: 3.2 },
  { id: "storm-terminal", kind: "record", position: { x: -9, z: -38 }, radius: 3.2 },
  { id: "storm-record-2", kind: "record", position: { x: 14, z: -48 }, radius: 3.2 },
  { id: "storm-record-3", kind: "record", position: { x: -16, z: -58 }, radius: 3.2 },
  { id: "archive", kind: "archive", position: { ...ARCHIVE_POSITION }, radius: 9 },
  { id: "frag-traverse", kind: "pedestal", position: { x: ARCHIVE_POSITION.x - 5, z: ARCHIVE_POSITION.z }, radius: 2.1 },
  { id: "frag-pan", kind: "pedestal", position: { x: ARCHIVE_POSITION.x, z: ARCHIVE_POSITION.z - 5 }, radius: 2.1 },
  { id: "frag-storm", kind: "pedestal", position: { x: ARCHIVE_POSITION.x + 5, z: ARCHIVE_POSITION.z }, radius: 2.1 },
  { id: "frag-image", kind: "pedestal", position: { x: ARCHIVE_POSITION.x, z: ARCHIVE_POSITION.z + 5 }, radius: 2.1 },
  { id: "archive-core", kind: "archive", position: { ...ARCHIVE_POSITION }, radius: 2.4 },
  { id: "rover-return", kind: "rover", position: { x: 18, z: 5.5 }, radius: 4.5 },
  { id: "side-twin", kind: "side", position: { x: -36, z: 8 }, radius: 3 },
  { id: "side-rim", kind: "side", position: { x: 54, z: 26 }, radius: 3 },
  { id: "side-sol", kind: "side", position: { x: 40, z: -28 }, radius: 3 },
] as const;

export const POI_BY_ID: ReadonlyMap<string, Poi> = new Map(POIS.map((p) => [p.id, p]));

export function poi(id: string): Poi {
  const found = POI_BY_ID.get(id);
  if (!found) throw new Error(`Unknown point of interest: ${id}`);
  return found;
}

/** Flattened landing pads so the rover, archive and spawn sit on believable ground. */
export const FLAT_PADS: readonly { center: Vec2; radius: number }[] = [
  { center: { x: 0, z: 70 }, radius: 7 },
  { center: ROVER_POSITION, radius: 9 },
  { center: ARCHIVE_POSITION, radius: 11 },
];

/** Artistic craters (not mapped to any real crater). */
export const CRATERS: readonly { x: number; z: number; r: number; depth: number }[] = [
  { x: -30, z: 50, r: 11, depth: 2.6 },
  { x: 45, z: 55, r: 7, depth: 1.6 },
  { x: 58, z: -8, r: 16, depth: 3.2 },
  { x: -62, z: -6, r: 9, depth: 2.0 },
  { x: 30, z: -72, r: 12, depth: 2.4 },
  { x: -50, z: -70, r: 6, depth: 1.2 },
  { x: -8, z: 12, r: 4.5, depth: 0.9 },
];
