import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import { stepAnimation, initialAnimMemory, WALK_CYCLE, CLIP_DURATION } from "../src/game/core/animation.ts";
import { solveTwoBone, plantFeet } from "../src/game/core/ik.ts";
import { GameSession } from "../src/game/core/session.ts";

const input = (o = {}) => ({ speed: 0, grounded: true, landed: 5, yawRate: 0, action: null, idleTime: 0, stride: 0, ...o });
const run = (mem, inp, seconds, dt = 1 / 30) => { let out; for (let t = 0; t < seconds; t += dt) ({ mem, out } = stepAnimation(mem, inp, dt)); return { mem, out }; };

test("animation: locomotion blends idle → walk → run with distance-driven phase", () => {
  let { out } = run(initialAnimMemory(), input(), 0.5);
  assert.equal(out.state, "idle");
  assert.equal(out.weights.idle, 1);
  ({ out } = run(initialAnimMemory(), input({ speed: 1.6, stride: 0.75 }), 0.2));
  assert.equal(out.state, "locomotion");
  assert.ok(out.weights.walk > 0.9 && out.weights.run === 0);
  assert.equal(out.walkPhase, 0.75 / WALK_CYCLE);
  ({ out } = run(initialAnimMemory(), input({ speed: 5.5 }), 0.2));
  assert.ok(out.weights.run > 0.9);
  const sum = out.weights.idle + out.weights.walk + out.weights.run;
  assert.ok(Math.abs(sum - 1) < 1e-9);
});

test("animation: air, landing, turning, look-around and one-shot actions", () => {
  let r = run(initialAnimMemory(), input({ grounded: false }), 0.3);
  assert.equal(r.out.state, "air");
  r = run(r.mem, input({ landed: 0.1 }), 1 / 30);
  assert.equal(r.out.state, "land");
  assert.equal(r.out.oneShot.clip, "land");
  r = run(r.mem, input({ landed: 1 }), 1 / 30);
  assert.equal(r.out.state, "idle");
  assert.equal(run(initialAnimMemory(), input({ yawRate: 3 }), 0.1).out.state, "turn");
  assert.equal(run(initialAnimMemory(), input({ idleTime: 10 }), 0.1).out.state, "look");
  r = run(initialAnimMemory(), input({ action: "kneel" }), 1);
  assert.equal(r.out.state, "action");
  assert.ok(r.out.oneShot.progress > 0.3 && r.out.oneShot.progress < 0.4);
  r = run(r.mem, input(), CLIP_DURATION.kneel);
  assert.equal(r.out.state, "idle", "actions end after their clip duration");
  // Cross-fades only on state changes.
  const a = stepAnimation(initialAnimMemory(), input({ speed: 2 }), 1 / 30);
  assert.ok(a.out.fade > 0);
  assert.equal(stepAnimation(a.mem, input({ speed: 2 }), 1 / 30).out.fade, 0);
});

test("ik: two-bone solve reaches the target and clamps when out of reach", () => {
  const a = 0.43, b = 0.41;
  const r = solveTwoBone(a, b, 0.7);
  // Reconstruct the end point: root along +x rotated by rootAngle, knee bends back.
  const kx = a * Math.cos(r.rootAngle), ky = a * Math.sin(r.rootAngle);
  const ang = r.rootAngle - r.midBend;
  const ex = kx + b * Math.cos(ang), ey = ky + b * Math.sin(ang);
  assert.ok(Math.abs(Math.hypot(ex, ey) - 0.7) < 1e-6 && Math.abs(ey) < 1e-6, "end effector lands on the target");
  assert.equal(solveTwoBone(a, b, 2).clamped, true);
  assert.ok(solveTwoBone(a, b, 2).midBend < 0.05, "nearly straight when out of reach");
  const f = plantFeet(-0.05, 0.02);
  assert.equal(f.pelvis, -0.05);
  assert.ok(Math.abs(f.shortenR - 0.07) < 1e-9 && f.shortenL === 0);
});

test("session: interacting plays a physical action and holds movement until it ends", () => {
  const s = new GameSession(null);
  for (let i = 0; i < 40 && !s.cutscene; i++) s.tick(1 / 30, { x: 0, y: 0, sprint: false, jump: false, lookX: 0, lookY: 0, zoom: 0, interact: false });
  s.skipCutscene();
  s.travelTo("ridge");
  s.travelTo("beacon-alpha");
  assert.ok(s.prompt);
  s.interact();
  assert.equal(s.action.clip, "scan");
  assert.ok(s.evidenceCard, "the record is recovered immediately; the UI shows it after the action");
  s.closeEvidence();
  const before = { x: s.player.x, z: s.player.z };
  for (let i = 0; i < 20; i++) s.tick(1 / 30, { x: 0, y: 1, sprint: true, jump: false, lookX: 0, lookY: 0, zoom: 0, interact: false });
  assert.ok(Math.hypot(s.player.x - before.x, s.player.z - before.z) < 1e-6, "explorer holds still during the scan");
  for (let i = 0; i < 90; i++) s.tick(1 / 30, { x: 0, y: 0, sprint: false, jump: false, lookX: 0, lookY: 0, zoom: 0, interact: false });
  assert.equal(s.action, null);
  assert.equal(GameSession.actionFor("comp-wheels", "scan"), "kneel");
  assert.equal(GameSession.actionFor("rover-terminal", "puzzle"), "interact");
  assert.equal(GameSession.actionFor("side-rim", "side"), "examine");
});

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
await MeshoptDecoder.ready;
const model = (n) => new URL(`../public/models/game/${n}.glb`, import.meta.url);

test("assets: explorer GLBs are genuinely rigged and animated", async () => {
  for (const lod of ["high", "low"]) {
    const doc = await io.read(model(`explorer-${lod}`).pathname.replace(/^\/(\w:)/, "$1"));
    const root = doc.getRoot();
    const skins = root.listSkins();
    assert.equal(skins.length, 1);
    assert.ok(skins[0].listJoints().length >= 20, "humanoid skeleton");
    const names = root.listAnimations().map((a) => a.getName());
    for (const clip of ["idle", "walk", "run", "turn", "jump", "land", "interact", "scan", "kneel", "examine", "look_around"]) assert.ok(names.includes(clip), clip);
    const prim = root.listMeshes()[0].listPrimitives()[0];
    assert.ok(prim.getAttribute("JOINTS_0") && prim.getAttribute("WEIGHTS_0"), "skin weights");
    const exts = root.listExtensionsUsed().map((e) => e.extensionName);
    for (const e of ["EXT_meshopt_compression", "EXT_texture_webp", "KHR_materials_clearcoat", "KHR_materials_sheen"]) assert.ok(exts.includes(e), e);
    const bytes = statSync(model(`explorer-${lod}`)).size;
    assert.ok(bytes < (lod === "high" ? 1.2 : 0.8) * 1024 * 1024, `${lod} size budget: ${bytes}`);
  }
});

test("assets: EKO GLB has expression morph targets, clips and a manifest entry", async () => {
  const doc = await io.read(model("eko-high").pathname.replace(/^\/(\w:)/, "$1"));
  const root = doc.getRoot();
  const eyes = root.listMeshes().find((m) => m.getName() === "eyesMesh");
  assert.ok(eyes, "eyes mesh");
  assert.ok(eyes.listPrimitives()[0].listTargets().length >= 6);
  assert.deepEqual(eyes.getExtras().targetNames.slice(0, 3), ["happy", "sad", "concerned"]);
  const clips = root.listAnimations().map((a) => a.getName());
  for (const c of ["hover", "curious", "celebrate", "concern", "scan", "sad"]) assert.ok(clips.includes(c), c);
  const manifest = JSON.parse(readFileSync(new URL("../public/models/game/manifest.json", import.meta.url), "utf8"));
  for (const f of ["models/game/explorer-high.glb", "models/game/eko-high.glb", "textures/game/regolith-base.webp"]) assert.ok(manifest.files[f]?.sha256, f);
});
