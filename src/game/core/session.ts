/**
 * GameSession: the single source of truth for a play session.
 *
 * It owns simulation (player, camera rig, EKO), the quest/progression state,
 * dialogue, cutscene timing, interaction prompts and autosave requests. It has
 * no DOM or WebGL dependency: the Three.js renderer and the 2D console both
 * drive `tick()` and read state from it, so both modes play identically.
 */
import { CHAPTERS, OBJECTIVE_BY_ID, SIDE_DISCOVERIES, type Objective } from "../content/chapters.ts";
import { CUTSCENE_BY_ID, cutsceneDuration, type Line } from "../content/cutscenes.ts";
import { ARCHIVE_PILLARS, ARCHIVE_POSITION, POI_BY_ID, ROVER_POSITION } from "../content/world.ts";
import { CLIP_DURATION, type ActionClip } from "./animation.ts";
import { applyLook, applyZoom, createRig, stepRig, type CameraPose, type CameraRig } from "./camera.ts";
import { createCompanion, emote, stepCompanion, type CompanionState, type EkoEmotion } from "./companion.ts";
import { clamp } from "./math.ts";
import { createPlayer, stepPlayer, type MoveInput, type PlayerState } from "./player.ts";
import {
  activeObjectives, addStats, attemptPuzzle, completeObjective, discoverSide, newProgress, spawnFor, startChapter,
  stormLevel, type GameProgress, type ProgressEvent,
} from "./progress.ts";
import { CollisionGrid, generateRocks, resolveCircles, type Circle } from "./terrain.ts";

export type Cue = "step" | "step-sprint" | "jump" | "land" | "scan" | "objective" | "evidence" | "achievement" | "level"
  | "eko" | "puzzle" | "wrong" | "chapter" | "cutscene" | "complete";

export interface Prompt {
  kind: "scan" | "puzzle" | "side";
  /** Objective id, or side discovery id. */
  id: string;
  target: string;
}

export interface Toast { key: number; kind: "objective" | "evidence" | "achievement" | "level" | "side" | "chapter"; id: string; xp?: number }

export interface Subtitle { key: number; line: Line }

export interface SessionInput extends MoveInput {
  lookX: number;
  lookY: number;
  zoom: number;
  interact: boolean;
}

export interface SessionOptions {
  sensitivity: number;
  invertY: boolean;
  autoCamera: boolean;
  reducedMotion: boolean;
}

export const ROCK_COUNT = 900;
/** Largest simulation step (s); keeps collision and jumps stable. */
export const MAX_STEP = 1 / 15;
/** Longest real frame (s) the simulation catches up on; longer stalls are dropped. */
export const MAX_FRAME = 0.25;

let toastKey = 1;

export class GameSession {
  progress: GameProgress;
  player: PlayerState;
  rig: CameraRig;
  pose: CameraPose = { position: [0, 3, 6], target: [0, 1.5, 0] };
  eko: CompanionState;
  readonly rocks = generateRocks(ROCK_COUNT);
  readonly grid: CollisionGrid;

  cutscene: { id: string; t: number } | null = null;
  subtitle: Subtitle | null = null;
  prompt: Prompt | null = null;
  puzzle: string | null = null;
  evidenceCard: { evidence: string; restored: boolean } | null = null;
  chapterCard: { chapter: number; t: number } | null = null;
  toasts: Toast[] = [];
  completed = false;
  paused = false;
  /** Physical action the explorer is performing (kneel, scan, …); movement is held meanwhile. */
  action: { clip: ActionClip; t: number; duration: number; target: string } | null = null;
  /** Seconds the player has been standing still (drives EKO scouting). */
  idle = 0;
  storm = 0;
  options: SessionOptions = { sensitivity: 1, invertY: false, autoCamera: true, reducedMotion: false };

  private queue: Line[] = [];
  private lineTime = 0;
  private announced = new Set<string>();
  private noticed = new Set<string>();
  private pendingDistance = 0;
  private pendingSeconds = 0;
  private statTimer = 0;
  private saveTimer = 0;
  private cutsceneDelay = 0;
  private stepMark = 0;
  private version = 0;
  private listeners = new Set<() => void>();
  private cueListeners = new Set<(cue: Cue, detail?: { x: number; z: number }) => void>();
  readonly isDemo: boolean;
  private persist: (p: GameProgress) => void;

  constructor(progress: GameProgress | null, persist: (p: GameProgress) => void = () => {}, isDemo = false) {
    this.progress = progress ?? newProgress();
    this.isDemo = isDemo;
    this.persist = isDemo ? () => {} : persist;
    const colliders: Circle[] = this.rocks.filter((r) => r.collide > 0).map((r) => ({ x: r.x, z: r.z, r: r.collide, h: r.size * r.squash }));
    colliders.push({ x: ROVER_POSITION.x, z: ROVER_POSITION.z, r: 1.55, h: 1.55 });
    for (const [dx, dz] of ARCHIVE_PILLARS) colliders.push({ x: ARCHIVE_POSITION.x + dx, z: ARCHIVE_POSITION.z + dz, r: 0.4, h: 3.2 });
    this.grid = new CollisionGrid(colliders);
    const spawn = spawnFor(this.progress);
    this.player = createPlayer(spawn, spawn.yaw);
    this.rig = createRig(spawn.yaw + Math.PI);
    this.eko = createCompanion(spawn);
    this.eko = { ...this.eko, mood: CHAPTERS[this.progress.chapter].mood };
    this.storm = stormLevel(this.progress);
    this.completed = this.progress.finished && activeObjectives(this.progress).length === 0;
    this.announceActive();
  }

  // ── Subscriptions ───────────────────────────────────────────────────────
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getVersion = () => this.version;
  onCue(fn: (cue: Cue, detail?: { x: number; z: number }) => void) { this.cueListeners.add(fn); return () => { this.cueListeners.delete(fn); }; }
  private changed() { this.version++; for (const fn of this.listeners) fn(); }
  private cue(c: Cue, detail?: { x: number; z: number }) { for (const fn of this.cueListeners) fn(c, detail); }

  // ── Derived ─────────────────────────────────────────────────────────────
  get active(): Objective[] { return activeObjectives(this.progress); }
  get chapter() { return CHAPTERS[this.progress.chapter]; }
  get blocked() { return this.paused || !!this.cutscene || !!this.puzzle || !!this.evidenceCard; }

  /** Location of the nearest active objective target, for markers and EKO. */
  objectiveTarget(): { x: number; z: number; id: string } | null {
    let best: { x: number; z: number; id: string } | null = null, bestD = Infinity;
    for (const o of this.active) {
      if (!o.target) continue;
      const p = POI_BY_ID.get(o.target)!.position;
      const d = Math.hypot(p.x - this.player.x, p.z - this.player.z);
      if (d < bestD) { bestD = d; best = { x: p.x, z: p.z, id: o.target }; }
    }
    return best;
  }

  // ── Main loop ───────────────────────────────────────────────────────────
  /**
   * Advance by real elapsed time. Slow frames are split into substeps of at
   * most MAX_STEP, so the game keeps real-time pace down to ~4 FPS instead of
   * slowing into slow motion (one clamped tick per frame did that below 10 FPS).
   * One-shot input (look, zoom, interact, jump) applies to the first substep only.
   */
  advance(elapsed: number, input: SessionInput) {
    let left = clamp(Number.isFinite(elapsed) ? elapsed : 0, 0, MAX_FRAME);
    let step = input;
    do {
      const dt = Math.min(left, MAX_STEP);
      this.tick(dt, step);
      step = { ...input, lookX: 0, lookY: 0, zoom: 0, interact: false, jump: false };
      left -= dt;
    } while (left > 1e-6);
  }

  tick(dt: number, input: SessionInput) {
    dt = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.1);
    if (this.paused) return;

    if (this.chapterCard) {
      this.chapterCard.t += dt;
      if (this.chapterCard.t > (this.options.reducedMotion ? 2.2 : 3.6)) { this.chapterCard = null; this.changed(); }
    }

    if (this.cutscene) {
      this.tickCutscene(dt);
    } else {
      this.tickDialogue(dt);
      if (this.action) {
        this.action.t += dt;
        if (this.action.t >= this.action.duration) { this.action = null; this.changed(); }
      }
      const frozen = !!this.puzzle || !!this.evidenceCard || !!this.action;
      const move: MoveInput = frozen ? { x: 0, y: 0, sprint: false, jump: false } : input;
      this.rig = applyLook(this.rig, input.lookX, input.lookY, this.options.sensitivity, this.options.invertY);
      if (input.zoom) this.rig = applyZoom(this.rig, input.zoom);
      const before = this.player;
      this.player = stepPlayer(this.player, move, dt, this.rig.yaw, this.grid);
      this.stepCues(before);
      const moved = Math.hypot(this.player.x - before.x, this.player.z - before.z);
      this.idle = moved > 0.002 ? 0 : this.idle + dt;
      this.pendingDistance += moved;

      if (!frozen) {
        this.checkReach();
        this.updatePrompt();
        if (input.interact) this.interact();
        this.autoStartCutscene(dt);
      }
    }

    const { rig, pose } = stepRig(this.rig, this.player, dt, this.options.autoCamera && !this.cutscene, this.grid);
    this.rig = rig; this.pose = pose;
    const target = this.objectiveTarget();
    const inspectPoi = this.prompt ? POI_BY_ID.get(this.prompt.target)?.position ?? null : null;
    this.eko = stepCompanion(this.eko, { player: this.player, playerIdle: this.idle, objective: target, inspect: inspectPoi }, dt);
    this.noticeTargets();

    // Story lighting eases toward its target (cutscenes may override it).
    const cs = this.cutscene ? CUTSCENE_BY_ID.get(this.cutscene.id) : null;
    let targetStorm = stormLevel(this.progress);
    if (cs?.storm) {
      const total = cutsceneDuration(cs);
      targetStorm = cs.storm[0] + (cs.storm[1] - cs.storm[0]) * clamp(this.cutscene!.t / total, 0, 1);
    }
    this.storm += (targetStorm - this.storm) * (1 - Math.exp(-dt * (cs?.storm ? 3 : 0.6)));

    this.pendingSeconds += dt;
    this.statTimer += dt;
    if (this.statTimer > 2) this.flushStats();
    this.saveTimer += dt;
    if (this.saveTimer > 5) this.save();
  }

  private stepCues(before: PlayerState) {
    const p = this.player;
    if (before.grounded && !p.grounded && p.vy > 0) this.cue("jump");
    if (!before.grounded && p.grounded) this.cue("land");
    const stride = p.speed > 4.5 ? 1.25 : 0.95;
    if (p.grounded && p.speed > 0.6 && p.stride - this.stepMark > stride) {
      this.stepMark = p.stride;
      this.cue(p.speed > 4.5 ? "step-sprint" : "step");
    }
  }

  private flushStats() {
    this.statTimer = 0;
    const r = addStats(this.progress, this.pendingDistance, this.pendingSeconds);
    this.pendingDistance = 0; this.pendingSeconds = 0;
    this.apply(r);
  }

  save() {
    this.saveTimer = 0;
    const p = this.player;
    this.progress = {
      ...this.progress,
      player: this.completed || this.cutscene ? this.progress.player : { x: +p.x.toFixed(2), z: +p.z.toFixed(2), yaw: +p.yaw.toFixed(3) },
      savedAt: new Date().toISOString(),
    };
    if (!this.isDemo) {
      this.persist(this.progress);
    }
  }

  // ── Objectives ──────────────────────────────────────────────────────────
  private checkReach() {
    for (const o of this.active) {
      if (o.kind !== "reach" || !o.target) continue;
      const poi = POI_BY_ID.get(o.target)!;
      if (Math.hypot(poi.position.x - this.player.x, poi.position.z - this.player.z) <= poi.radius) {
        this.apply(completeObjective(this.progress, o.id));
      }
    }
  }

  private updatePrompt() {
    let best: Prompt | null = null, bestD = Infinity;
    const consider = (kind: Prompt["kind"], id: string, target: string) => {
      const poi = POI_BY_ID.get(target);
      if (!poi) return;
      const d = Math.hypot(poi.position.x - this.player.x, poi.position.z - this.player.z);
      if (d <= poi.radius && d < bestD) { bestD = d; best = { kind, id, target }; }
    };
    for (const o of this.active) {
      if ((o.kind === "scan" || o.kind === "puzzle") && o.target) consider(o.kind, o.id, o.target);
    }
    for (const s of SIDE_DISCOVERIES) {
      if (!this.progress.sides.includes(s.id) && (this.progress.chapter >= s.fromChapter || this.progress.finished)) consider("side", s.id, s.target);
    }
    const next = best as Prompt | null;
    if (next?.id !== this.prompt?.id) { this.prompt = next; this.changed(); }
  }

  /** EKO reacts the first time the explorer approaches each active target. */
  private noticeTargets() {
    for (const o of this.active) {
      if (!o.target || this.noticed.has(o.id)) continue;
      const poi = POI_BY_ID.get(o.target)!;
      if (Math.hypot(poi.position.x - this.player.x, poi.position.z - this.player.z) < poi.radius + 7) {
        this.noticed.add(o.id);
        this.eko = emote(this.eko, "discovery", 2.4);
        this.cue("eko", { x: this.eko.x, z: this.eko.z });
      }
    }
  }

  /** Which animation the explorer uses to investigate a point of interest. */
  static actionFor(target: string, kind: Prompt["kind"]): ActionClip {
    if (kind === "side") return "examine";
    if (target === "comp-wheels" || target === "storm-record-3") return "kneel";
    if (target.endsWith("terminal") || target === "archive-core" || kind === "puzzle") return "interact";
    return "scan";
  }

  interact() {
    const prompt = this.prompt;
    if (!prompt || this.blocked || this.action) return;
    const poi = POI_BY_ID.get(prompt.target);
    if (poi) {
      // Turn to face what we are investigating, then play the matching action.
      this.player = { ...this.player, yaw: Math.atan2(poi.position.x - this.player.x, poi.position.z - this.player.z), vx: 0, vz: 0, speed: 0 };
      const clip = GameSession.actionFor(prompt.target, prompt.kind);
      this.action = { clip, t: 0, duration: CLIP_DURATION[clip], target: prompt.target };
    }
    if (prompt.kind === "side") {
      const side = SIDE_DISCOVERIES.find((s) => s.id === prompt.id)!;
      const r = discoverSide(this.progress, side.id);
      this.cue("scan");
      this.apply(r);
      this.say([side.line]);
      this.evidenceCard = { evidence: side.evidence, restored: false };
    } else if (prompt.kind === "scan") {
      const objective = OBJECTIVE_BY_ID.get(prompt.id)!;
      this.cue("scan");
      const restored = objective.id.startsWith("c4-frag");
      const r = completeObjective(this.progress, objective.id);
      this.apply(r);
      if (objective.evidence) this.evidenceCard = { evidence: objective.evidence, restored };
    } else {
      this.puzzle = prompt.id;
      this.cue("puzzle");
    }
    this.prompt = null;
    this.changed();
  }

  /** Resolve a puzzle attempt from the UI. Returns whether it was accepted. */
  answerPuzzle(correct: boolean): boolean {
    if (!this.puzzle) return false;
    const r = attemptPuzzle(this.progress, this.puzzle, correct);
    if (!correct) {
      this.progress = r.progress;
      this.cue("wrong");
      this.eko = emote(this.eko, "concerned", 2);
      this.changed();
      return false;
    }
    const objective = OBJECTIVE_BY_ID.get(this.puzzle);
    this.puzzle = null;
    this.apply(r);
    if (objective?.evidence) this.evidenceCard = { evidence: objective.evidence, restored: false };
    this.changed();
    return true;
  }

  closePuzzle() { if (this.puzzle) { this.puzzle = null; this.changed(); } }
  closeEvidence() { if (this.evidenceCard) { this.evidenceCard = null; this.changed(); } }

  private apply(r: { progress: GameProgress; events: ProgressEvent[] }) {
    const prevChapter = this.progress.chapter;
    this.progress = r.progress;
    if (!r.events.length) return;
    for (const e of r.events) {
      switch (e.type) {
        case "objective": {
          const o = OBJECTIVE_BY_ID.get(e.id)!;
          if (o.kind !== "cutscene") { this.toast({ kind: "objective", id: e.id, xp: e.xp }); this.cue("objective"); }
          if (o.onComplete) this.say(o.onComplete);
          this.eko = emote(this.eko, "excited", 2.5);
          break;
        }
        case "evidence": this.toast({ kind: "evidence", id: e.id }); this.cue("evidence"); this.eko = emote(this.eko, "discovery", 3); break;
        case "side": this.toast({ kind: "side", id: e.id, xp: e.xp }); break;
        case "achievement": this.toast({ kind: "achievement", id: e.id }); this.cue("achievement"); break;
        case "level": this.toast({ kind: "level", id: String(e.level) }); this.cue("level"); break;
        case "chapter-complete": this.cue("chapter"); break;
        case "campaign-complete": this.completed = true; this.cue("complete"); break;
      }
    }
    if (this.progress.chapter !== prevChapter) {
      this.eko = { ...this.eko, mood: this.chapter.mood };
      this.chapterCard = { chapter: this.progress.chapter, t: 0 };
      this.toast({ kind: "chapter", id: String(this.progress.chapter) });
    }
    this.announceActive();
    this.save();
    this.changed();
  }

  private announceActive() {
    for (const o of this.active) {
      if (this.announced.has(o.id)) continue;
      this.announced.add(o.id);
      if (o.onStart) this.say(o.onStart);
    }
  }

  private toast(t: Omit<Toast, "key">) {
    this.toasts = [...this.toasts.slice(-4), { ...t, key: toastKey++ }];
  }
  dismissToast(key: number) { this.toasts = this.toasts.filter((t) => t.key !== key); this.changed(); }

  // ── Dialogue ────────────────────────────────────────────────────────────
  say(lines: readonly Line[]) {
    this.queue.push(...lines);
    if (!this.subtitle) this.nextLine();
  }

  requestHint() {
    if (this.cutscene || this.subtitle) return;
    const hints = this.chapter.hints;
    if (!hints || !hints.length) return;
    const line = hints[Math.floor(Math.random() * hints.length)];
    this.say([{ speaker: "eko", emotion: "curious", text: line }]);
  }

  private nextLine() {
    const line = this.queue.shift();
    if (!line) { if (this.subtitle) { this.subtitle = null; this.changed(); } return; }
    this.subtitle = { key: toastKey++, line };
    this.lineTime = clamp(1.6 + line.text.en.length * 0.055, 2.6, 7.5);
    if (line.speaker === "eko") {
      if (line.emotion) this.eko = emote(this.eko, line.emotion as EkoEmotion, this.lineTime);
      this.cue("eko", { x: this.eko.x, z: this.eko.z });
    }
    this.changed();
  }

  private tickDialogue(dt: number) {
    if (!this.subtitle) return;
    this.lineTime -= dt;
    if (this.lineTime <= 0) this.nextLine();
  }

  /** Advance to the next subtitle line now (Enter / tap on the subtitle). */
  advanceDialogue() { if (!this.cutscene && this.subtitle) this.nextLine(); }

  // ── Cutscenes ───────────────────────────────────────────────────────────
  private autoStartCutscene(dt: number) {
    const o = this.active.find((x) => x.kind === "cutscene");
    if (!o || this.chapterCard) { this.cutsceneDelay = 0; return; }
    this.cutsceneDelay += dt;
    if (this.cutsceneDelay < 0.4) return;
    this.cutsceneDelay = 0;
    this.cutscene = { id: o.cutscene!, t: 0 };
    this.queue = [];
    this.subtitle = null;
    this.prompt = null;
    this.cue("cutscene");
    this.changed();
  }

  private tickCutscene(dt: number) {
    const cs = CUTSCENE_BY_ID.get(this.cutscene!.id)!;
    this.cutscene!.t += dt;
    const t = this.cutscene!.t;
    let current: Line | null = null;
    for (const line of cs.lines) if (line.at <= t) current = line;
    if (current && this.subtitle?.line !== current) {
      this.subtitle = { key: toastKey++, line: current };
      if (current.speaker === "eko") {
        if (current.emotion) this.eko = emote(this.eko, current.emotion, 3.5);
        this.cue("eko", { x: this.eko.x, z: this.eko.z });
      }
      this.changed();
    }
    if (t >= cutsceneDuration(cs)) this.endCutscene();
  }

  skipCutscene() { if (this.cutscene) this.endCutscene(); }

  private endCutscene() {
    const id = this.cutscene!.id;
    this.cutscene = null;
    this.subtitle = null;
    const objective = this.active.find((o) => o.kind === "cutscene" && o.cutscene === id);
    if (objective) this.apply(completeObjective(this.progress, objective.id));
    this.changed();
  }

  // ── Session control ─────────────────────────────────────────────────────
  setPaused(paused: boolean) {
    if (this.paused === paused) return;
    this.paused = paused;
    if (paused) { this.flushStats(); this.save(); }
    this.changed();
  }

  /** Restart or replay a chapter from its checkpoint. */
  replayChapter(index: number) {
    this.progress = startChapter(this.progress, index);
    const spawn = spawnFor(this.progress);
    this.player = createPlayer(spawn, spawn.yaw);
    this.rig = createRig(spawn.yaw + Math.PI);
    this.eko = { ...createCompanion(spawn), mood: this.chapter.mood };
    this.cutscene = null; this.puzzle = null; this.evidenceCard = null; this.prompt = null; this.subtitle = null; this.queue = []; this.action = null;
    this.completed = false;
    this.announced.clear(); this.noticed.clear();
    this.chapterCard = { chapter: index, t: 0 };
    this.storm = stormLevel(this.progress);
    this.announceActive();
    this.save();
    this.changed();
  }

  /** Free roam after the campaign: keeps the save, hides the completion screen. */
  freeRoam() { this.completed = false; this.changed(); }

  /** Teleport used by the 2D console's accessible "travel to" action. */
  travelTo(target: string) {
    const poi = POI_BY_ID.get(target);
    if (!poi || this.blocked) return;
    this.action = null;
    const dx = this.player.x - poi.position.x, dz = this.player.z - poi.position.z;
    const stand = Math.max(0.6, Math.min(poi.radius * 0.6, 1.6));
    // Prefer arriving from the current side; rotate the approach until the
    // collision-free spot is still within interaction range of the target.
    const base = Math.atan2(dx, dz);
    let at = { x: poi.position.x, z: poi.position.z };
    for (let i = 0; i < 12; i++) {
      const a = base + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * (Math.PI / 6);
      const candidate = resolveCircles({ x: poi.position.x + Math.sin(a) * stand, z: poi.position.z + Math.cos(a) * stand }, 0.42, this.grid);
      at = candidate;
      if (Math.hypot(candidate.x - poi.position.x, candidate.z - poi.position.z) <= poi.radius * 0.9) break;
    }
    this.pendingDistance += Math.hypot(at.x - this.player.x, at.z - this.player.z);
    this.player = { ...createPlayer(at, Math.atan2(poi.position.x - at.x, poi.position.z - at.z)), travelled: this.player.travelled };
    this.idle = 0;
    this.checkReach();
    this.updatePrompt();
    this.changed();
  }
}
