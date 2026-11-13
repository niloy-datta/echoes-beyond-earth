import type { MuseumData } from "./data";
import type { Passport } from "./passport";
import type { Body, Localized } from "./types";

/**
 * Explorer progress, derived only from what the visitor actually did (passport) and what the
 * museum actually contains (data). XP and levels are game mechanics, stated openly on the page.
 */
export const XP = { discover: 10, capsule: 20, signal: 15, lens: 15, ripple: 15, path: 50 } as const;
export const LEVEL_SIZE = 100;

export interface Progress {
  xp: number;
  level: number;
  levelXp: number;
  worlds: { key: "moon" | "mars" | "signal" | "legacy"; done: number; total: number }[];
  pathsDone: number;
  achievements: Achievement[];
  next: NextMission[];
  journey: JourneyStep[];
  stamps: { id: string; collected: boolean }[];
}

export interface Achievement {
  id: string;
  icon: "signal" | "rover" | "moon" | "archive" | "legacy" | "path" | "lens" | "guardian";
  done: number;
  goal: number;
}

export interface NextMission {
  id: string;
  kind: "path" | "signal" | "legacy" | "lens" | "discover";
  body: Body | null;
  /** object or image id used for the thumbnail */
  image: string | null;
  title: { key: "nm.path" | "nm.signal" | "nm.legacy" | "nm.lens" | "nm.discover"; name: Localized };
  note: Localized | null;
  href: string | null;
  capsule?: { objectId: string; pathId?: string };
  xp: number;
}

export interface JourneyStep {
  key: "joined" | "firstStamp" | "moon" | "mars" | "signal" | "path" | "next";
  done: boolean;
  detail: Localized | string | null;
}

const connectedIds = (data: MuseumData) => new Set(data.stories.ripples.flatMap((r) => [r.from, ...r.rings.map((g) => g.to)]));

export function computeProgress(data: MuseumData, p: Passport): Progress {
  const objects = data.objects;
  const has = (list: string[], id: string) => list.includes(id);
  const onBody = (b: Body) => objects.filter((o) => o.properties.body === b);
  const silent = objects.filter((o) => o.properties.status !== "active");
  const connected = connectedIds(data);
  const pathsDone = data.stories.paths.filter((path) => path.steps.every((s) => (p.pathSteps[path.id] ?? []).includes(s.object))).length;

  const xp =
    p.discovered.length * XP.discover +
    p.capsules.length * XP.capsule +
    p.signals.length * XP.signal +
    p.lenses.length * XP.lens +
    p.ripples.length * XP.ripple +
    pathsDone * XP.path;

  const moonDone = onBody("moon").filter((o) => has(p.discovered, o.id)).length;
  const marsDone = onBody("mars").filter((o) => has(p.discovered, o.id)).length;
  const legacyDone = [...connected].filter((id) => has(p.ripples, id)).length;

  const achievements: Achievement[] = [
    { id: "signal", icon: "signal", done: Math.min(p.signals.length, 1), goal: 1 },
    { id: "mars", icon: "rover", done: Math.min(marsDone, 3), goal: 3 },
    { id: "moon", icon: "moon", done: Math.min(moonDone, 5), goal: 5 },
    { id: "archive", icon: "archive", done: Math.min(p.capsules.length, 10), goal: 10 },
    { id: "legacy", icon: "legacy", done: Math.min(legacyDone, 3), goal: 3 },
    { id: "path", icon: "path", done: Math.min(pathsDone, 1), goal: 1 },
    { id: "lens", icon: "lens", done: p.lenses.length, goal: data.stories.lens.length },
    { id: "guardian", icon: "guardian", done: p.discovered.filter((id) => data.byId.has(id)).length, goal: objects.length },
  ];

  // Next missions: one of each kind, drawn from what this visitor hasn't done yet.
  const next: NextMission[] = [];
  const openPath = data.stories.paths.find((path) => path.steps.some((s) => !(p.pathSteps[path.id] ?? []).includes(s.object)));
  if (openPath) {
    const step = openPath.steps.find((s) => !(p.pathSteps[openPath.id] ?? []).includes(s.object))!;
    const o = data.byId.get(step.object);
    next.push({
      id: `path-${openPath.id}`,
      kind: "path",
      body: o?.properties.body ?? null,
      image: o?.properties.image ?? null,
      title: { key: "nm.path", name: openPath.title },
      note: step.note,
      href: null,
      capsule: { objectId: step.object, pathId: openPath.id },
      xp: XP.capsule,
    });
  }
  const signalTarget = [...silent]
    .filter((o) => data.storyFor(o.id) && !has(p.signals, o.id))
    .sort((a, b) => (b.properties.end?.date ?? "").localeCompare(a.properties.end?.date ?? ""))[0];
  if (signalTarget)
    next.push({
      id: `signal-${signalTarget.id}`,
      kind: "signal",
      body: signalTarget.properties.body,
      image: signalTarget.properties.image,
      title: { key: "nm.signal", name: signalTarget.properties.name },
      note: data.storyFor(signalTarget.id)?.dek ?? null,
      href: `/last-signal/?m=${signalTarget.id}`,
      xp: XP.signal,
    });
  const legacyTarget = objects.find((o) => connected.has(o.id) && !has(p.ripples, o.id) && o.id !== signalTarget?.id);
  if (legacyTarget)
    next.push({
      id: `legacy-${legacyTarget.id}`,
      kind: "legacy",
      body: legacyTarget.properties.body,
      image: legacyTarget.properties.image,
      title: { key: "nm.legacy", name: legacyTarget.properties.name },
      note: null,
      href: `/legacy/?m=${legacyTarget.id}`,
      xp: XP.ripple,
    });
  const lens = data.stories.lens.find((x) => !has(p.lenses, x.id));
  if (lens)
    next.push({ id: `lens-${lens.id}`, kind: "lens", body: null, image: lens.now.image, title: { key: "nm.lens", name: lens.title }, note: lens.caption, href: "/lens/", xp: XP.lens });
  const undiscovered = objects.find((o) => !has(p.discovered, o.id) && o.geometry);
  if (undiscovered && next.length < 4)
    next.push({
      id: `discover-${undiscovered.id}`,
      kind: "discover",
      body: undiscovered.properties.body,
      image: undiscovered.properties.image,
      title: { key: "nm.discover", name: undiscovered.properties.name },
      note: undiscovered.properties.site,
      href: `/explore/?body=${undiscovered.properties.body}&focus=${undiscovered.id}`,
      xp: XP.discover,
    });

  const firstStamp = p.discovered.map((id) => data.byId.get(id)).find(Boolean);
  const firstSignal = p.signals.map((id) => data.byId.get(id)).find(Boolean);
  const journey: JourneyStep[] = [
    { key: "joined", done: !!p.firstVisit, detail: p.firstVisit },
    { key: "firstStamp", done: !!firstStamp, detail: firstStamp?.properties.name ?? null },
    { key: "moon", done: moonDone > 0, detail: null },
    { key: "mars", done: marsDone > 0, detail: null },
    { key: "signal", done: !!firstSignal, detail: firstSignal?.properties.name ?? null },
    { key: "path", done: pathsDone > 0, detail: null },
    { key: "next", done: false, detail: next[0]?.title.name ?? null },
  ];

  const stamps = [...objects]
    .sort((a, b) => a.properties.arrived.date.localeCompare(b.properties.arrived.date))
    .map((o) => ({ id: o.id, collected: has(p.discovered, o.id) }));

  return {
    xp,
    level: Math.floor(xp / LEVEL_SIZE) + 1,
    levelXp: xp % LEVEL_SIZE,
    worlds: [
      { key: "moon", done: moonDone, total: onBody("moon").length },
      { key: "mars", done: marsDone, total: onBody("mars").length },
      { key: "signal", done: silent.filter((o) => has(p.signals, o.id)).length, total: silent.length },
      { key: "legacy", done: legacyDone, total: connected.size },
    ],
    pathsDone,
    achievements,
    next: next.slice(0, 4),
    journey,
    stamps,
  };
}
