import test from "node:test";
import assert from "node:assert/strict";
import { CHAPTERS, SIDE_DISCOVERIES, ACHIEVEMENTS, ALL_OBJECTIVES, OBJECTIVE_BY_ID } from "../src/game/content/chapters.ts";
import { EVIDENCE, EVIDENCE_BY_ID } from "../src/game/content/evidence.ts";
import { PUZZLES, PUZZLE_BY_ID, checkMatch, checkOrder, checkPower, checkQuiz, shuffledOrder, illustrativeLight } from "../src/game/content/puzzles.ts";
import { CUTSCENES, CUTSCENE_BY_ID, cutsceneDuration } from "../src/game/content/cutscenes.ts";
import { POIS, POI_BY_ID, WORLD_RADIUS } from "../src/game/content/world.ts";
import { heightAt, generateRocks, CollisionGrid, resolveCircles } from "../src/game/core/terrain.ts";
import { createPlayer, stepPlayer, WALK_SPEED, SPRINT_SPEED } from "../src/game/core/player.ts";
import { createRig, stepRig, applyLook, PITCH_MAX } from "../src/game/core/camera.ts";
import { createCompanion, stepCompanion, emote } from "../src/game/core/companion.ts";
import {
  newProgress, sanitizeProgress, activeObjectives, completeObjective, attemptPuzzle, discoverSide, startChapter,
  xpOf, levelOf, levelXp, evidenceOf, unlockedChapters, stormLevel, addStats, MAX_XP, SAVE_VERSION,
} from "../src/game/core/progress.ts";
import { wrapAngle } from "../src/game/core/math.ts";

const isNasa = (url) => { const h = new URL(url).hostname; return h === "nasa.gov" || h.endsWith(".nasa.gov"); };
const bilingual = (l) => typeof l?.en === "string" && l.en.trim() && typeof l?.bn === "string" && l.bn.trim();

test("content: five chapters, bilingual, every reference resolves", () => {
  assert.equal(CHAPTERS.length, 5);
  const ids = new Set();
  for (const chapter of CHAPTERS) {
    assert.ok(bilingual(chapter.title) && bilingual(chapter.dek));
    assert.ok(Math.hypot(chapter.spawn.x, chapter.spawn.z) < WORLD_RADIUS);
    for (const step of chapter.steps) {
      assert.ok(step.length > 0);
      for (const o of step) {
        assert.ok(!ids.has(o.id), `duplicate objective ${o.id}`); ids.add(o.id);
        assert.ok(bilingual(o.text), o.id);
        if (o.kind === "reach" || o.kind === "scan") assert.ok(POI_BY_ID.has(o.target), `${o.id} target`);
        if (o.kind === "cutscene") assert.ok(CUTSCENE_BY_ID.has(o.cutscene), `${o.id} cutscene`);
        if (o.kind === "puzzle") assert.ok(PUZZLE_BY_ID.has(o.puzzle), `${o.id} puzzle`);
        if (o.evidence) assert.ok(EVIDENCE_BY_ID.has(o.evidence), `${o.id} evidence`);
        for (const line of [...(o.onStart ?? []), ...(o.onComplete ?? [])]) assert.ok(bilingual(line.text));
      }
    }
  }
  for (const side of SIDE_DISCOVERIES) { assert.ok(POI_BY_ID.has(side.target)); assert.ok(EVIDENCE_BY_ID.has(side.evidence)); }
  for (const a of ACHIEVEMENTS) assert.ok(bilingual(a.title) && bilingual(a.description));
});

test("content: every evidence record is bilingual with an HTTPS NASA source", () => {
  for (const e of EVIDENCE) {
    assert.ok(bilingual(e.title) && bilingual(e.fact), e.id);
    assert.equal(new URL(e.source.url).protocol, "https:");
    assert.ok(isNasa(e.source.url), `${e.id} must cite NASA`);
    if (e.image) assert.ok(e.image.src.startsWith("/images/nasa/") && bilingual(e.image.alt));
  }
  // Honesty guard: no fabricated transmissions or quotes in the game's NASA facts.
  const all = EVIDENCE.map((e) => e.fact.en).join(" ");
  assert.doesNotMatch(all, /my battery is low|it'?s getting dark/i);
});

test("content: cutscenes are bilingual, finite and ordered", () => {
  for (const c of CUTSCENES) {
    const total = cutsceneDuration(c);
    assert.ok(total > 2 && total < 30, c.id);
    let last = -1;
    for (const line of c.lines) { assert.ok(bilingual(line.text)); assert.ok(line.at >= last && line.at < total); last = line.at; }
    if (c.label) assert.ok(bilingual(c.label));
  }
  // Storm and finale reconstructions must be labelled as artistic.
  for (const id of ["intro", "ch3-intro", "finale"]) assert.ok(CUTSCENE_BY_ID.get(id).label, id);
});

test("puzzles: validators accept only the right answers", () => {
  const match = PUZZLE_BY_ID.get("component-id");
  const right = Object.fromEntries(match.clues.map((c) => [c.id, c.answer]));
  assert.ok(checkMatch(match, right));
  assert.ok(!checkMatch(match, { ...right, c1: "wheels" }));

  const order = PUZZLE_BY_ID.get("timeline");
  const ids = order.events.map((e) => e.id);
  assert.ok(checkOrder(order, ids));
  const shuffled = shuffledOrder(ids);
  assert.ok(!checkOrder(order, shuffled), "presented order must not already be solved");
  assert.deepEqual([...shuffled].sort(), [...ids].sort());

  const power = PUZZLE_BY_ID.get("storm-power");
  assert.ok(checkPower(power, power.correct, 1));
  assert.ok(!checkPower(power, power.correct, 0.2), "must explore the dust slider first");
  assert.ok(!checkPower(power, (power.correct + 1) % 3, 1));
  assert.ok(illustrativeLight(1) < illustrativeLight(0));

  const quiz = PUZZLE_BY_ID.get("final-assembly");
  assert.ok(checkQuiz(quiz, quiz.questions.map((q) => q.correct)));
  assert.ok(!checkQuiz(quiz, quiz.questions.map(() => 99)));
  for (const q of quiz.questions) assert.ok(EVIDENCE_BY_ID.has(q.evidence));
  assert.equal(PUZZLES.length, 4);
});

test("terrain: deterministic, finite, POIs are walkable and rock-free", () => {
  assert.equal(heightAt(12.3, -4.5), heightAt(12.3, -4.5));
  const rocks = generateRocks(600);
  assert.deepEqual(rocks.slice(0, 5), generateRocks(600).slice(0, 5));
  for (const p of POIS) {
    assert.ok(Number.isFinite(heightAt(p.position.x, p.position.z)));
    assert.ok(Math.hypot(p.position.x, p.position.z) < WORLD_RADIUS, p.id);
    for (const r of rocks) if (r.collide) assert.ok(Math.hypot(r.x - p.position.x, r.z - p.position.z) > p.radius + r.collide * 0.5, `${p.id} blocked`);
  }
});

test("player: camera-relative movement, sprint, Mars jump, boundary and collision", () => {
  const still = { x: 0, y: 0, sprint: false, jump: false };
  let p = createPlayer({ x: 0, z: 60 });
  // Camera yaw 0 sits on +z; forward is -z.
  for (let i = 0; i < 60; i++) p = stepPlayer(p, { ...still, y: 1 }, 1 / 60, 0, null);
  assert.ok(p.z < 59 && Math.abs(p.x) < 0.05);
  assert.ok(p.speed > WALK_SPEED * 0.8 && p.speed <= WALK_SPEED + 1e-6);
  for (let i = 0; i < 60; i++) p = stepPlayer(p, { ...still, y: 1, sprint: true }, 1 / 60, 0, null);
  assert.ok(p.speed > WALK_SPEED && p.speed <= SPRINT_SPEED + 1e-6);
  // Camera rotated 90°: forward becomes -x.
  let q = createPlayer({ x: 0, z: 60 });
  for (let i = 0; i < 30; i++) q = stepPlayer(q, { ...still, y: 1 }, 1 / 60, Math.PI / 2, null);
  assert.ok(q.x < -0.5 && Math.abs(q.z - 60) < 0.05);
  // Deceleration
  for (let i = 0; i < 120; i++) q = stepPlayer(q, still, 1 / 60, 0, null);
  assert.ok(q.speed < 0.05);
  // Jump and land under Mars gravity
  let j = stepPlayer(q, { ...still, jump: true }, 1 / 60, 0, null);
  assert.equal(j.grounded, false);
  let peak = j.y;
  for (let i = 0; i < 300 && !j.grounded; i++) { j = stepPlayer(j, still, 1 / 60, 0, null); peak = Math.max(peak, j.y); }
  assert.ok(j.grounded && peak - q.y > 0.9);
  // Boundary
  let b = createPlayer({ x: 0, z: 90 });
  for (let i = 0; i < 1200; i++) b = stepPlayer(b, { ...still, y: -1, sprint: true }, 1 / 30, 0, null);
  assert.ok(Math.hypot(b.x, b.z) <= WORLD_RADIUS + 1e-6);
  // Circle collision
  const grid = new CollisionGrid([{ x: 0, z: 50, r: 1 }]);
  const out = resolveCircles({ x: 0.2, z: 50.1 }, 0.4, grid);
  assert.ok(Math.hypot(out.x, out.z - 50) >= 1.4 - 1e-9);
  // Garbage input never produces NaN.
  const n = stepPlayer(createPlayer({ x: 1, z: 1 }), { x: NaN, y: Infinity, sprint: false, jump: false }, 1 / 60, 0, null);
  assert.ok(Number.isFinite(n.x) && Number.isFinite(n.z) && Number.isFinite(n.y));
});

test("camera: pitch clamp, stays above terrain, auto-follow swings behind", () => {
  let rig = applyLook(createRig(0), 0, 100000, 1, false);
  assert.equal(rig.pitch, PITCH_MAX);
  const player = { x: 0, y: heightAt(0, 60), z: 60, yaw: Math.PI / 2, speed: 4 };
  let state = { rig: { ...createRig(0), idle: 5 }, pose: null };
  for (let i = 0; i < 400; i++) state = stepRig(state.rig, player, 1 / 30, true, null);
  const [x, y, z] = state.pose.position;
  assert.ok(y > heightAt(x, z));
  // Behind a player facing +x the camera ends up on -x.
  assert.ok(x < player.x);
  assert.ok(Math.abs(wrapAngle(state.rig.yaw - (Math.PI / 2 + Math.PI))) < 0.3);
});

test("companion: follows, keeps distance, scouts toward objectives, emotes", () => {
  let c = createCompanion({ x: 0, z: 60 });
  const player = { x: 10, y: heightAt(10, 60), z: 60, yaw: 0, speed: 0 };
  for (let i = 0; i < 300; i++) c = stepCompanion(c, { player, playerIdle: 0, objective: null, inspect: null }, 1 / 30);
  const d = Math.hypot(c.x - player.x, c.z - player.z);
  assert.ok(d > 0.85 && d < 3, `follow distance ${d}`);
  assert.equal(c.mode, "follow");
  for (let i = 0; i < 300; i++) c = stepCompanion(c, { player, playerIdle: 10, objective: { x: 10, z: 20 }, inspect: null }, 1 / 30);
  assert.equal(c.mode, "guide");
  assert.ok(c.z < player.z - 2, "EKO scouts toward the objective");
  c = emote(c, "discovery", 1);
  c = stepCompanion(c, { player, playerIdle: 0, objective: null, inspect: null }, 0.5);
  assert.equal(c.emotion, "discovery");
  for (let i = 0; i < 10; i++) c = stepCompanion(c, { player, playerIdle: 0, objective: null, inspect: null }, 0.1);
  assert.equal(c.emotion, c.mood);
});

function playThrough(progress, upTo = Infinity) {
  let guard = 0;
  while (guard++ < 200) {
    const active = activeObjectives(progress);
    if (!active.length || progress.chapter > upTo) break;
    for (const o of active) {
      const r = o.kind === "puzzle" ? attemptPuzzle(progress, o.id, true) : completeObjective(progress, o.id);
      progress = r.progress;
      if (progress.chapter > upTo) return progress;
    }
  }
  return progress;
}

test("quest engine: steps unlock in order, chapters advance, campaign completes", () => {
  let p = newProgress();
  assert.deepEqual(activeObjectives(p).map((o) => o.id), ["c1-intro"]);
  // Cannot complete an objective that is not active yet.
  assert.deepEqual(completeObjective(p, "c1-beacon").events, []);
  const r = completeObjective(p, "c1-intro");
  assert.deepEqual(activeObjectives(r.progress).map((o) => o.id), ["c1-move"]);
  p = playThrough(newProgress());
  assert.equal(p.finished, true);
  assert.equal(p.done.length, ALL_OBJECTIVES.length);
  assert.ok(p.achievements.includes("last-light") && p.achievements.includes("archivist"));
  assert.ok(p.achievements.includes("sharp-mind"), "four first-try puzzles");
  assert.deepEqual(unlockedChapters(p), [0, 1, 2, 3, 4]);
  assert.ok(evidenceOf(p).length >= 8);
  assert.ok(xpOf(p) <= MAX_XP);
});

test("quest engine: multi-objective steps accept any order", () => {
  let p = playThrough(newProgress(), 0);
  assert.equal(p.chapter, 1);
  p = completeObjective(p, "c2-reach").progress;
  p = completeObjective(p, "c2-intro").progress;
  assert.equal(activeObjectives(p).length, 3);
  p = completeObjective(p, "c2-mast").progress;
  p = completeObjective(p, "c2-wheels").progress;
  assert.deepEqual(activeObjectives(p).map((o) => o.id), ["c2-solar"]);
  p = completeObjective(p, "c2-solar").progress;
  assert.deepEqual(activeObjectives(p).map((o) => o.id), ["c2-puzzle"]);
});

test("puzzles: wrong attempts cost the first-try bonus, never the objective", () => {
  let p = playThrough(newProgress(), 0);
  for (const id of ["c2-reach", "c2-intro", "c2-wheels", "c2-solar", "c2-mast"]) p = completeObjective(p, id).progress;
  const before = xpOf(p);
  p = attemptPuzzle(p, "c2-puzzle", false).progress;
  assert.ok(activeObjectives(p).some((o) => o.id === "c2-puzzle"));
  p = attemptPuzzle(p, "c2-puzzle", true).progress;
  assert.ok(!p.firstTry.includes("component-id"));
  assert.equal(xpOf(p), before + OBJECTIVE_BY_ID.get("c2-puzzle").xp);
});

test("side discoveries, XP, levels and storm intensity", () => {
  let p = playThrough(newProgress(), 0);
  const r = discoverSide(p, "side-twin");
  assert.ok(r.events.some((e) => e.type === "side"));
  assert.equal(discoverSide(r.progress, "side-twin").events.length, 0, "no double reward");
  p = discoverSide(discoverSide(r.progress, "side-rim").progress, "side-sol").progress;
  assert.ok(p.achievements.includes("wanderer"));
  assert.equal(levelOf(0).level, 0);
  assert.ok(levelOf(MAX_XP).next === null);
  // Storm rises through chapter 3.
  let s = playThrough(newProgress(), 1);
  assert.equal(s.chapter, 2);
  const early = stormLevel(s);
  s = completeObjective(s, "c3-intro").progress;
  s = completeObjective(s, "c3-record1").progress;
  assert.ok(stormLevel(s) > early);
  // Distance achievement
  assert.ok(addStats(newProgress(), 1200, 10).progress.achievements.includes("long-walk"));
});

test("save system: round trip, corrupt data, tampering and replay", () => {
  const finished = playThrough(newProgress());
  const json = JSON.parse(JSON.stringify({ ...finished, player: { x: 3, z: 4, yaw: 1 } }));
  const loaded = sanitizeProgress(json);
  assert.equal(loaded.finished, true);
  assert.deepEqual(loaded.player, { x: 3, z: 4, yaw: 1 });
  assert.equal(loaded.done.length, finished.done.length);

  for (const bad of [null, 42, "x", [], { v: 999 }, { v: SAVE_VERSION, done: "nope", chapter: "7" }]) {
    const s = sanitizeProgress(bad);
    assert.equal(s.chapter, 0); assert.deepEqual(s.done, []);
  }
  // Skipping ahead is rejected: a late objective without its prerequisites is dropped.
  const forged = sanitizeProgress({ v: SAVE_VERSION, chapter: 4, done: ["c5-finale", "c1-intro"], finished: true, achievements: ["nope"], bestXp: 1e9 });
  assert.deepEqual(forged.done, ["c1-intro"]);
  assert.equal(forged.chapter, 0);
  assert.equal(forged.finished, false);
  assert.ok(forged.bestXp <= MAX_XP);
  // Out-of-world positions fall back to the chapter checkpoint.
  assert.equal(sanitizeProgress({ ...json, player: { x: 1e6, z: 0, yaw: 0 } }).player, null);

  // Replay keeps achievements and level, clears the replayed chapters.
  const replay = startChapter(finished, 2);
  assert.equal(replay.chapter, 2);
  assert.ok(replay.finished && replay.achievements.includes("last-light"));
  assert.ok(activeObjectives(replay).some((o) => o.id === "c3-intro"));
  assert.ok(levelXp(replay) >= xpOf(finished));
  // Locked chapters cannot be started on a fresh save.
  assert.equal(startChapter(newProgress(), 3).chapter, 0);
});

import { GameSession } from "../src/game/core/session.ts";
import { PUZZLE_BY_ID as PZ } from "../src/game/content/puzzles.ts";

const idle = { x: 0, y: 0, sprint: false, jump: false, lookX: 0, lookY: 0, zoom: 0, interact: false };
function run(session, seconds, input = idle) { for (let t = 0; t < seconds; t += 1 / 30) session.tick(1 / 30, input); }

/** Drive the real session the way the 2D console does, through every chapter. */
function playSession(session, { stopAtChapter = Infinity } = {}) {
  let guard = 0;
  while (!session.completed && guard++ < 400) {
    if (session.progress.chapter >= stopAtChapter) return;
    if (session.chapterCard) { run(session, 4); continue; }
    if (session.cutscene) { session.skipCutscene(); continue; }
    if (session.evidenceCard) { session.closeEvidence(); continue; }
    if (session.puzzle) { assert.equal(session.answerPuzzle(true), true); continue; }
    const o = session.active[0];
    if (!o) break;
    if (o.kind === "cutscene") { run(session, 0.6); continue; }
    session.travelTo(o.target);
    if (o.kind !== "reach") { assert.ok(session.prompt, `prompt near ${o.target}`); session.interact(); }
  }
}

test("session: the whole campaign is completable through the session API", () => {
  const saves = [];
  const session = new GameSession(null, (p) => saves.push(JSON.parse(JSON.stringify(p))));
  run(session, 1);
  assert.ok(session.cutscene, "intro cinematic starts automatically");
  session.skipCutscene();
  assert.equal(session.active[0].id, "c1-move");
  playSession(session);
  assert.equal(session.completed, true);
  assert.equal(session.progress.finished, true);
  assert.ok(saves.length > 10, "autosaves on progress");
  assert.equal(saves.at(-1).finished, true);
});

test("session: walking with keys reaches the tutorial marker", () => {
  const session = new GameSession(null);
  run(session, 1); session.skipCutscene();
  // Spawn faces -z (yaw PI) with the camera behind; holding forward walks toward the ridge.
  for (let i = 0; i < 30 * 12 && session.active[0]?.id === "c1-move"; i++) {
    const t = { x: 0, z: 52 };
    const dx = 5 - session.player.x, dz = t.z - session.player.z;
    // steer: rotate camera so forward points at the ridge
    session.rig = { ...session.rig, yaw: Math.atan2(-dx, -dz), idle: 0 };
    session.tick(1 / 30, { ...idle, y: 1, sprint: true });
  }
  assert.equal(session.active[0].id, "c1-beacon");
  assert.ok(session.progress.stats.distance > 0 || session.player.travelled > 10);
});

test("session: wrong puzzle answers keep the puzzle open, resume restores chapter", () => {
  let stored = null;
  const session = new GameSession(null, (p) => { stored = JSON.parse(JSON.stringify(p)); });
  playSession(session, { stopAtChapter: 1 });
  assert.equal(session.progress.chapter, 1);
  // Fresh session from the saved JSON resumes in chapter 2.
  const resumed = new GameSession(sanitizeProgress(stored));
  assert.equal(resumed.progress.chapter, 1);
  playSession(resumed, { stopAtChapter: 2 });
  assert.equal(resumed.progress.chapter, 2);
  // Puzzle failure path
  const s3 = new GameSession(sanitizeProgress(stored));
  for (let i = 0; i < 40 && !s3.puzzle; i++) {
    if (s3.chapterCard) { run(s3, 4); continue; }
    if (s3.cutscene) { s3.skipCutscene(); continue; }
    if (s3.evidenceCard) { s3.closeEvidence(); continue; }
    const o = s3.active[0];
    if (o.kind === "cutscene") { run(s3, 0.6); continue; }
    s3.travelTo(o.target); if (o.kind !== "reach") s3.interact();
  }
  assert.ok(s3.puzzle && PZ.has("component-id"));
  assert.equal(s3.answerPuzzle(false), false);
  assert.ok(s3.puzzle, "puzzle stays open after a wrong answer");
  assert.equal(s3.answerPuzzle(true), true);
  assert.ok(!s3.progress.firstTry.includes("component-id"));
});

test("session: replay chapter and storm lighting", () => {
  const session = new GameSession(null);
  playSession(session);
  session.replayChapter(2);
  assert.equal(session.progress.chapter, 2);
  assert.equal(session.completed, false);
  assert.ok(session.progress.finished, "completion is remembered");
  run(session, 5); session.skipCutscene();
  const calm = session.storm;
  playSession(session, { stopAtChapter: 3 });
  assert.ok(session.storm > calm || session.progress.chapter === 3);
});

import { MAX_FRAME } from "../src/game/core/session.ts";
import { adaptQuality, createAdaptive, QUALITY_LADDER, RESOLUTION_STEPS } from "../src/game/settings.ts";

/** Steer like a player: aim the camera at the goal and hold W + Shift, sidestepping when stuck. */
function walkSession(session, goal, until, maxSeconds = 60, fps = 30) {
  let stuck = 0, last = { x: session.player.x, z: session.player.z };
  for (let t = 0; t < maxSeconds && !until(); t += 1 / fps) {
    const dx = goal.x - session.player.x, dz = goal.z - session.player.z;
    session.rig = { ...session.rig, yaw: Math.atan2(-dx, -dz), idle: 0 };
    const side = stuck > 0.6 ? 1 : 0;
    session.advance(1 / fps, { ...idle, y: 1, x: side, sprint: true });
    const moved = Math.hypot(session.player.x - last.x, session.player.z - last.z);
    stuck = moved < 0.01 ? stuck + 1 / fps : Math.max(0, stuck - 2 / fps);
    last = { x: session.player.x, z: session.player.z };
  }
  return until();
}

/** Play up to (not into) the first objective with the given id. */
function playUntilActive(session, id) {
  let guard = 0;
  while (!session.active.some((o) => o.id === id) && guard++ < 400) {
    if (session.chapterCard) { run(session, 4); continue; }
    if (session.cutscene) { session.skipCutscene(); continue; }
    if (session.evidenceCard) { session.closeEvidence(); continue; }
    if (session.puzzle) { session.answerPuzzle(true); continue; }
    const o = session.active[0];
    if (o.kind === "cutscene") { run(session, 0.6); continue; }
    session.travelTo(o.target);
    if (o.kind !== "reach") session.interact();
  }
  assert.ok(session.active.some((o) => o.id === id), `${id} becomes active`);
}

test("session: advance() keeps real-time pace at low frame rates (CI regression)", () => {
  // At 4 FPS one clamped tick per frame ran the game at 40% speed; substeps keep it real time.
  const session = new GameSession(null);
  run(session, 1); session.skipCutscene();
  playUntilActive(session, "c4-reach");
  // Leaving chapter 3 shows the chapter-4 card (3.6 s). At 4 FPS it must clear within ~3.6 s of wall time.
  assert.ok(session.chapterCard, "chapter card is showing");
  let wall = 0;
  while (session.chapterCard && wall < 20) { session.advance(0.25, idle); wall += 0.25; }
  assert.ok(wall <= 4, `chapter card cleared after ${wall}s of wall time at 4 FPS`);
  // A stalled frame (tab switch, GC pause) is capped, and garbage time is ignored.
  const card = { chapter: 3, t: 0 };
  session.chapterCard = card;
  session.advance(1e9, idle);
  assert.ok(Math.abs(card.t - MAX_FRAME) < 1e-9, "catch-up is capped at MAX_FRAME");
  session.advance(Number.NaN, idle);
  assert.ok(Number.isFinite(session.player.x) && Number.isFinite(session.player.z));
});

test("session: chapter 4 archive is reachable on foot at 30 and 4 FPS (c4-reach regression)", () => {
  for (const fps of [30, 4]) {
    const session = new GameSession(null);
    run(session, 1); session.skipCutscene();
    playUntilActive(session, "c4-reach");
    while (session.chapterCard) session.advance(1 / fps, idle);
    // Player stands where chapter 3 ended (storm-record-3), ~37 m from the archive, rocks in between.
    const start = { x: session.player.x, z: session.player.z };
    const archive = POI_BY_ID.get("archive").position;
    assert.ok(Math.hypot(archive.x - start.x, archive.z - start.z) > 20, "real distance to cover");
    const reached = walkSession(session, archive, () => session.progress.done.includes("c4-reach"), 60, fps);
    assert.ok(reached, `walked into the archive at ${fps} FPS: player ${session.player.x.toFixed(1)},${session.player.z.toFixed(1)}`);
    // Every pedestal and the core are reachable through the travel action and give a prompt.
    run(session, 0.5);
    if (session.cutscene) session.skipCutscene();
    for (const o of session.active) {
      session.travelTo(o.target);
      assert.equal(session.prompt?.id, o.id, `prompt for ${o.id}`);
    }
  }
});

test("settings: adaptive quality ladder Ultra → High → Medium → Low with hysteresis", () => {
  let s = createAdaptive("ultra");
  const slowWindow = () => { s = adaptQuality(s, 20, false); };
  const tiers = [];
  for (let i = 0; i < 40; i++) { slowWindow(); if (tiers.at(-1) !== s.tier) tiers.push(s.tier); }
  assert.deepEqual(tiers, ["ultra", "high", "medium", "low"], "steps through every tier, including Ultra → High");
  assert.equal(s.res, RESOLUTION_STEPS.length - 1, "lowest tier also lowers resolution");
  // Resolution drops before the tier does.
  let r = createAdaptive("high");
  r = adaptQuality(r, 30, false); assert.equal(r.tier, "high"); assert.equal(r.res, 0, "one slow window is tolerated");
  r = adaptQuality(r, 30, false); assert.equal(r.tier, "high"); assert.equal(r.res, 1, "second slow window lowers resolution first");
  // A single good window between slow ones resets the strike counter.
  r = adaptQuality(r, 30, false); r = adaptQuality(r, 50, false); r = adaptQuality(r, 30, false);
  assert.equal(r.res, 1);
  // Touch devices use a lower threshold.
  assert.equal(adaptQuality(adaptQuality(createAdaptive("low"), 28, true), 28, true).res, 0);
  // Recovery: needs 8 smooth windows per step; never above the initial ceiling.
  let u = { ...createAdaptive("high"), tier: "medium", res: 0 };
  for (let i = 0; i < 7; i++) u = adaptQuality(u, 60, false);
  assert.equal(u.tier, "medium", "no upgrade before 8 smooth windows");
  u = adaptQuality(u, 60, false);
  assert.equal(u.tier, "high", "climbs back after sustained headroom");
  for (let i = 0; i < 80; i++) u = adaptQuality(u, 60, false);
  assert.equal(u.tier, "high", "never exceeds the initial auto guess");
  assert.equal(u.res, 0);
  // No oscillation: a tier abandoned twice is not retried.
  let o = createAdaptive("high");
  for (let cycle = 0; cycle < 4; cycle++) {
    while (o.tier === "high") o = adaptQuality(o, 30, false);
    for (let i = 0; i < 40; i++) o = adaptQuality(o, 60, false);
  }
  assert.equal(o.tier, "medium");
  assert.equal(o.drops.high, 2);
  // Garbage measurements are ignored.
  assert.deepEqual(adaptQuality(createAdaptive("ultra"), Number.NaN, false), createAdaptive("ultra"));
  assert.deepEqual(QUALITY_LADDER, ["low", "medium", "high", "ultra"]);
});

import { InputController } from "../src/game/input.ts";

test("input: movement keys still work while a HUD button has focus (pause → resume regression)", () => {
  const actions = [];
  const input = new InputController((a) => actions.push(a));
  const key = (code, tagName, extra = {}) => {
    let prevented = false;
    input.keyDown({ code, target: { tagName }, repeat: false, ctrlKey: false, metaKey: false, altKey: false, preventDefault: () => { prevented = true; }, ...extra });
    return prevented;
  };
  key("KeyW", "BUTTON"); key("ShiftLeft", "BUTTON");
  let out = input.consume();
  assert.equal(out.y, 1, "W moves although the pause button is focused");
  assert.equal(out.sprint, true);
  // The focused button keeps Space (its native activation), so no jump is queued.
  assert.equal(key("Space", "BUTTON"), false);
  assert.equal(input.consume().jump, false);
  key("KeyE", "A");
  assert.equal(input.consume().interact, true, "E interacts with a link focused");
  // Typing in a form field never moves the explorer.
  input.reset();
  key("KeyW", "INPUT");
  assert.equal(input.consume().y, 0);
  key("Escape", "INPUT");
  assert.deepEqual(actions, ["pause"]);
});

import { comparePrediction, directBeam, modelOutcome, TAU_USUAL, TAU_RECHARGE, TAU_STORM_PEAK } from "../src/game/content/puzzles.ts";

test("storm lab: Beer–Lambert model, prediction comparison and explanatory hints", () => {
  // SIMULATED model: e^−τ, monotonic, bounded, safe on bad input.
  assert.equal(directBeam(0), 1);
  assert.ok(Math.abs(directBeam(1) - Math.exp(-1)) < 1e-12);
  assert.ok(directBeam(TAU_STORM_PEAK) < directBeam(TAU_RECHARGE) && directBeam(TAU_RECHARGE) < directBeam(TAU_USUAL));
  assert.equal(directBeam(-3), 1); assert.equal(directBeam(Number.NaN), 1);
  // OBSERVED anchors stay the JPL-published estimates.
  assert.deepEqual([TAU_USUAL, TAU_RECHARGE, TAU_STORM_PEAK], [0.5, 2, 10.8]);
  // Outcome classification.
  assert.equal(modelOutcome(0.5, 0.6), "same");
  assert.equal(modelOutcome(0.5, 1.2), "half");
  assert.equal(modelOutcome(0.5, 10.8), "nearly-none");
  // Prediction comparison is informative, never a gate.
  const right = comparePrediction("nearly-none"), wrong = comparePrediction("half");
  assert.equal(right.matches, true); assert.equal(wrong.matches, false);
  assert.equal(wrong.outcome, "nearly-none");
  assert.ok(right.ratio > 0 && right.ratio < 1e-4, "storm peak leaves ~0.003% of the usual direct beam");
  // Every wrong option explains itself bilingually; the right one has no hint.
  const power = PUZZLE_BY_ID.get("storm-power");
  assert.equal(power.hints.length, power.options.length);
  power.hints.forEach((h, i) => (i === power.correct ? assert.equal(h, null) : assert.ok(bilingual(h))));
  assert.deepEqual(power.prediction.options.map((o) => o.id).sort(), ["half", "nearly-none", "same"]);
  power.prediction.options.forEach((o) => assert.ok(bilingual(o.label)));
  assert.ok(bilingual(power.prediction.question));
});
