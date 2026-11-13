import { yearOf } from "./dates";
import type { MissionProperties } from "./types";

export const YEAR_MIN = 1960;
export const YEAR_MAX = 2026;

/**
 * What a machine was doing in a given year, using only recorded dates:
 *  - "future"        not yet arrived
 *  - "transmitting"  arrived, and no recorded end before this year
 *  - "silent"        its recorded end date has passed
 *  - "unrecorded"    silent today, but the date it fell silent is not in the dataset —
 *                    shown neutrally rather than guessing when it stopped
 */
export type YearState = "future" | "transmitting" | "silent" | "unrecorded";

export function stateInYear(p: MissionProperties, year: number): YearState {
  const arrived = yearOf(p.arrived.date) ?? YEAR_MAX;
  if (year < arrived) return "future";
  if (year >= YEAR_MAX) {
    if (p.status === "active") return "transmitting";
    return p.end ? "silent" : "unrecorded";
  }
  const ended = yearOf(p.end?.date ?? null);
  if (ended != null) return year > ended || (p.kind === "impactor" && year >= ended) ? "silent" : "transmitting";
  return p.status === "active" ? "transmitting" : "unrecorded";
}
