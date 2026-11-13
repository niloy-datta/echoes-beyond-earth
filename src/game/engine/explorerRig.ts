/**
 * Motion layer for the skinned explorer GLB. On top of the authored clips it
 * adds what makes a suited astronaut feel heavy and grounded:
 *  - blended locomotion (idle / walk / run weighted together) driven by the
 *    tested `stepAnimation` state machine, with distance-driven phase so the
 *    planted boot never slides;
 *  - turn, look-around, jump, landing and mission action clips (scan, kneel…);
 *  - two-bone leg IK that plants each boot on sloping ground and drops the
 *    pelvis onto the lower foot;
 *  - momentum: lean into acceleration, bank into turns, breathing, landing
 *    compression;
 *  - boot prints pressed into the regolith and dust kicked up at each step.
 * Presentation only — the simulation in core/ is untouched.
 */
import * as THREE from "three";
import { initialAnimMemory, stepAnimation, WALK_CYCLE, RUN_CYCLE, type ActionClip, type AnimMemory } from "../core/animation";
import { clamp, damp } from "../core/math";
import type { PlayerState } from "../core/player";
import { heightAt } from "../core/terrain";

const LOOP_CLIPS = ["idle", "walk", "run", "turn", "look_around", "jump"] as const;
const ONE_SHOTS = ["land", "interact", "scan", "kneel", "examine", "wave"] as const;

const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpC = new THREE.Vector3(), tmpT = new THREE.Vector3();
const qA = new THREE.Quaternion(), qB = new THREE.Quaternion(), qC = new THREE.Quaternion(), qD = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

interface Leg { hip: THREE.Bone; knee: THREE.Bone; foot: THREE.Bone; planted: boolean; ankle: number }

/** Rotate `bone` so that its world rotation becomes `delta * world` (delta in world space). */
function applyWorldDelta(bone: THREE.Object3D, delta: THREE.Quaternion) {
  bone.getWorldQuaternion(qA);
  qB.copy(qA).invert().multiply(delta).multiply(qA);
  bone.quaternion.multiply(qB);
  bone.updateMatrixWorld(true);
}

/** Analytic two-bone IK (axis-agnostic, works in world space). */
function solveLeg(leg: Leg, target: THREE.Vector3, weight: number) {
  const a = leg.hip.getWorldPosition(tmpA);
  const b = leg.knee.getWorldPosition(tmpB);
  const c = leg.foot.getWorldPosition(tmpC);
  const lab = a.distanceTo(b), lcb = b.distanceTo(c);
  const t = tmpT.copy(c).lerp(target, weight);
  const lat = clamp(t.distanceTo(a), 0.01, lab + lcb - 0.01);
  const acN = c.clone().sub(a).normalize(), abN = b.clone().sub(a).normalize();
  const baN = a.clone().sub(b).normalize(), bcN = c.clone().sub(b).normalize();
  const atN = t.clone().sub(a).normalize();
  const ac_ab0 = Math.acos(clamp(acN.dot(abN), -1, 1));
  const ba_bc0 = Math.acos(clamp(baN.dot(bcN), -1, 1));
  const ac_at0 = Math.acos(clamp(acN.dot(atN), -1, 1));
  const ac_ab1 = Math.acos(clamp((lcb * lcb - lab * lab - lat * lat) / (-2 * lab * lat), -1, 1));
  const ba_bc1 = Math.acos(clamp((lat * lat - lab * lab - lcb * lcb) / (-2 * lab * lcb), -1, 1));
  const axis0 = acN.clone().cross(abN);
  if (axis0.lengthSq() < 1e-8) return;
  axis0.normalize();
  const axis1 = acN.clone().cross(atN);
  const r0 = qC.setFromAxisAngle(axis0, ac_ab1 - ac_ab0);
  const r1 = new THREE.Quaternion().setFromAxisAngle(axis0, ba_bc1 - ba_bc0);
  const r2 = axis1.lengthSq() > 1e-10 ? qD.setFromAxisAngle(axis1.normalize(), ac_at0) : qD.identity();
  applyWorldDelta(leg.hip, new THREE.Quaternion().multiplyQuaternions(r2, r0));
  applyWorldDelta(leg.knee, r1);
}

// ── Boot prints and kicked-up dust ──────────────────────────────────────────
function bootPrintTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 128;
  const g = c.getContext("2d")!;
  const sole = (y: number, h: number, w: number) => {
    const grad = g.createRadialGradient(32, y, 2, 32, y, w);
    grad.addColorStop(0, "rgba(255,255,255,0.95)");
    grad.addColorStop(0.75, "rgba(255,255,255,0.75)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.beginPath(); g.ellipse(32, y, w, h, 0, 0, Math.PI * 2); g.fill();
  };
  sole(40, 34, 24); sole(98, 24, 20);
  // Tread lugs.
  g.globalCompositeOperation = "destination-out";
  g.fillStyle = "rgba(0,0,0,0.45)";
  for (let y = 14; y < 122; y += 9) g.fillRect(10, y, 44, 3);
  return new THREE.CanvasTexture(c);
}

export class StepEffects {
  readonly group = new THREE.Group();
  private prints: THREE.InstancedMesh;
  private next = 0;
  private dust: THREE.Points;
  private dustData: Float32Array; // x, y, z, vx, vy, vz, age, life
  private dustNext = 0;
  private static readonly MAX_PRINTS = 180;
  private static readonly MAX_DUST = 240;

  constructor() {
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.2, 0.11, 0.07), alphaMap: bootPrintTexture(), transparent: true, opacity: 0.8,
      depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -3,
    });
    const plane = new THREE.PlaneGeometry(0.15, 0.33);
    plane.rotateX(-Math.PI / 2);
    this.prints = new THREE.InstancedMesh(plane, material, StepEffects.MAX_PRINTS);
    this.prints.count = 0;
    this.prints.receiveShadow = true;
    this.prints.frustumCulled = false;
    this.group.add(this.prints);

    const max = StepEffects.MAX_DUST;
    this.dustData = new Float32Array(max * 8);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(max * 3), 3));
    geometry.setAttribute("alpha", new THREE.BufferAttribute(new Float32Array(max), 1));
    geometry.setAttribute("size", new THREE.BufferAttribute(new Float32Array(max), 1));
    this.dust = new THREE.Points(geometry, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color(0.78, 0.56, 0.4) } },
      vertexShader: /* glsl */ `
        attribute float alpha; attribute float size; varying float vAlpha;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = size * 900.0 / -mv.z;
          vAlpha = alpha;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.05, d) * vAlpha;
          if (a < 0.004) discard;
          gl_FragColor = vec4(uColor, a);
          #include <colorspace_fragment>
        }`,
    }));
    this.dust.frustumCulled = false;
    this.group.add(this.dust);
  }

  get printCount() { return this.prints.count; }

  /** Press a boot print into the ground at `pos`, facing `yaw`. */
  print(pos: THREE.Vector3, yaw: number, left: boolean) {
    const ground = heightAt(pos.x, pos.z);
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(pos.x, ground + 0.012, pos.z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw + (left ? 0.06 : -0.06), 0)),
      new THREE.Vector3(1, 1, 1),
    );
    this.prints.setMatrixAt(this.next, m);
    this.prints.instanceMatrix.needsUpdate = true;
    this.next = (this.next + 1) % StepEffects.MAX_PRINTS;
    this.prints.count = Math.min(StepEffects.MAX_PRINTS, this.prints.count + 1);
  }

  /** Kick up a small, slow-settling dust puff (low gravity, thin air). */
  puff(pos: THREE.Vector3, vx: number, vz: number, strength: number) {
    const n = Math.round(3 + strength * 6);
    for (let i = 0; i < n; i++) {
      const k = this.dustNext * 8;
      const a = Math.random() * Math.PI * 2;
      const s = (0.15 + Math.random() * 0.45) * strength;
      this.dustData.set([pos.x, heightAt(pos.x, pos.z) + 0.04, pos.z,
        Math.cos(a) * s + vx * 0.25, 0.15 + Math.random() * 0.4 * strength, Math.sin(a) * s + vz * 0.25,
        0, 1.4 + Math.random() * 1.4], k);
      this.dustNext = (this.dustNext + 1) % StepEffects.MAX_DUST;
    }
  }

  update(dt: number) {
    const pos = this.dust.geometry.attributes.position as THREE.BufferAttribute;
    const alpha = this.dust.geometry.attributes.alpha as THREE.BufferAttribute;
    const size = this.dust.geometry.attributes.size as THREE.BufferAttribute;
    const d = this.dustData;
    const drag = Math.exp(-1.6 * dt);
    for (let i = 0; i < StepEffects.MAX_DUST; i++) {
      const k = i * 8;
      if (d[k + 7] <= 0 || d[k + 6] >= d[k + 7]) { alpha.setX(i, 0); continue; }
      d[k + 6] += dt;
      d[k + 3] = d[k + 3] * drag + 0.12 * dt; // light wind drift
      d[k + 5] *= drag;
      d[k + 4] = d[k + 4] * drag - 0.6 * dt;
      d[k] += d[k + 3] * dt; d[k + 1] = Math.max(d[k + 1] + d[k + 4] * dt, heightAt(d[k], d[k + 2]) + 0.02); d[k + 2] += d[k + 5] * dt;
      const life = d[k + 6] / d[k + 7];
      pos.setXYZ(i, d[k], d[k + 1], d[k + 2]);
      alpha.setX(i, Math.sin(Math.min(1, life * 4) * Math.PI * 0.5) * (1 - life) * 0.32);
      size.setX(i, 0.1 + life * 0.35);
    }
    pos.needsUpdate = true; alpha.needsUpdate = true; size.needsUpdate = true;
  }
}

// ── Explorer rig ─────────────────────────────────────────────────────────────
export class ExplorerRig {
  private actions = new Map<string, THREE.AnimationAction>();
  private weights = new Map<string, number>();
  private mem: AnimMemory = initialAnimMemory();
  private bones = new Map<string, THREE.Bone>();
  private legs: Leg[] = [];
  private lastYaw: number | null = null;
  private yawRate = 0;
  private idleTime = 0;
  private prevSpeed = 0;
  private lean = 0;
  private bank = 0;
  private pelvis = 0;
  private landing = 0;
  private lastAction: string | null = null;
  private signedYawRate = 0;
  private bind: { bone: THREE.Bone; p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3 }[] = [];

  constructor(private mixer: THREE.AnimationMixer, clips: THREE.AnimationClip[], model: THREE.Object3D, private effects: StepEffects | null) {
    for (const clip of clips) {
      const action = mixer.clipAction(clip);
      const loop = (LOOP_CLIPS as readonly string[]).includes(clip.name);
      action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
      action.clampWhenFinished = true;
      action.enabled = true;
      action.setEffectiveWeight(clip.name === "idle" ? 1 : 0);
      action.play();
      action.paused = true; // time is driven explicitly below
      this.actions.set(clip.name, action);
      this.weights.set(clip.name, clip.name === "idle" ? 1 : 0);
    }
    model.traverse((o) => {
      const bone = o as THREE.Bone;
      if (!bone.isBone) return;
      this.bones.set(bone.name, bone);
      this.bind.push({ bone, p: bone.position.clone(), q: bone.quaternion.clone(), s: bone.scale.clone() });
    });
    for (const side of ["L", "R"]) {
      const hip = this.bones.get(`upperLeg_${side}`), knee = this.bones.get(`lowerLeg_${side}`), foot = this.bones.get(`foot_${side}`);
      if (!hip || !knee || !foot) continue;
      // Ankle height above the sole in the bind pose (the foot bone sits at the ankle).
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const ankle = Math.max(0.02, foot.getWorldPosition(new THREE.Vector3()).y - box.min.y);
      this.legs.push({ hip, knee, foot, planted: true, ankle });
    }
  }

  update(p: PlayerState, action: { clip: ActionClip; t: number; duration: number } | null, time: number, dt: number, reduced: boolean) {
    if (dt <= 0) return;
    // Inputs for the state machine.
    if (this.lastYaw !== null) {
      let dy = p.yaw - this.lastYaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      this.yawRate += (Math.abs(dy) / dt - this.yawRate) * damp(10, dt);
      this.signedYawRate += (dy / dt - this.signedYawRate) * damp(6, dt);
    }
    this.lastYaw = p.yaw;
    this.idleTime = p.speed < 0.2 && p.grounded && !action ? this.idleTime + dt : 0;
    const requested = action ? action.clip : null;
    const { mem, out } = stepAnimation(this.mem, {
      speed: p.speed, grounded: p.grounded, landed: p.landed, yawRate: this.yawRate,
      action: requested, idleTime: this.idleTime, stride: p.stride,
    }, dt);
    this.mem = mem;

    // Target weights per clip.
    const target = new Map<string, number>();
    const w = out.weights;
    const oneShotWeight = out.oneShot ? 1 : 0;
    target.set("idle", w.idle * (1 - oneShotWeight));
    target.set("walk", w.walk * (1 - oneShotWeight));
    target.set("run", w.run * (1 - oneShotWeight));
    target.set("turn", w.turn);
    target.set("look_around", w.look);
    target.set("jump", w.air);
    for (const name of ONE_SHOTS) target.set(name, out.oneShot?.clip === name ? 1 : 0);

    // Smooth cross-fades; one-shots blend in quickly, locomotion blends softly.
    for (const [name, act] of this.actions) {
      const goal = target.get(name) ?? 0;
      const rate = (ONE_SHOTS as readonly string[]).includes(name) ? 14 : out.state === "land" ? 18 : 7;
      const cur = this.weights.get(name)! + (goal - this.weights.get(name)!) * damp(rate, dt);
      this.weights.set(name, cur);
      act.setEffectiveWeight(cur);
    }

    // Clip times. Locomotion phase follows distance travelled (no foot sliding).
    const set = (name: string, t: number) => { const a = this.actions.get(name); if (a) a.time = t; };
    const dur = (name: string) => this.actions.get(name)?.getClip().duration ?? 1;
    set("walk", out.walkPhase * dur("walk"));
    set("run", out.runPhase * dur("run"));
    set("idle", (time * (reduced ? 0.25 : 1)) % dur("idle"));
    set("look_around", Math.max(0, this.idleTime - 9) % dur("look_around"));
    set("turn", (time * 1.2) % dur("turn"));
    // Jump: rise into apex pose, hold while airborne.
    set("jump", clamp(p.vy > 0 ? (1 - p.vy / 3) * 0.45 : 0.45 + Math.min(0.5, -p.vy * 0.18), 0, 0.98) * dur("jump"));
    if (out.oneShot) set(out.oneShot.clip, out.oneShot.progress * dur(out.oneShot.clip));
    if (out.oneShot?.clip !== this.lastAction && out.oneShot && out.oneShot.clip !== "land") this.weights.set(out.oneShot.clip, Math.max(0.2, this.weights.get(out.oneShot.clip)!));
    this.lastAction = out.oneShot?.clip ?? null;

    // Restore the bind pose so procedural offsets never accumulate on bones
    // the clips do not key, then let the mixer write the blended pose.
    for (const b of this.bind) { b.bone.position.copy(b.p); b.bone.quaternion.copy(b.q); b.bone.scale.copy(b.s); }
    this.mixer.update(0);
    this.applyProcedural(p, out.state, time, dt, reduced);
  }

  private applyProcedural(p: PlayerState, state: string, time: number, dt: number, reduced: boolean) {
    const hips = this.bones.get("hips"), spine = this.bones.get("spine"), chest = this.bones.get("chest"), head = this.bones.get("head");
    if (!hips) return;
    const accel = (p.speed - this.prevSpeed) / dt;
    this.prevSpeed = p.speed;
    // Momentum: lean forward when accelerating / at speed, back when braking.
    const leanGoal = reduced ? 0 : clamp(p.speed * 0.022 + accel * 0.035, -0.12, 0.2);
    this.lean += (leanGoal - this.lean) * damp(5, dt);
    // Bank into turns proportional to centripetal load.
    const bankGoal = reduced ? 0 : clamp(this.signedYawRate * p.speed * 0.025, -0.14, 0.14);
    this.bank += (bankGoal - this.bank) * damp(4, dt);
    if (p.landed < 0.05) this.landing = 1;
    this.landing = Math.max(0, this.landing - dt * 3.2);

    spine?.rotateX(this.lean * 0.6);
    chest?.rotateX(this.lean * 0.4 + (reduced ? 0 : Math.sin(time * 1.6) * 0.012 * (state === "idle" ? 1 : 0.3)));
    hips.rotateZ(-this.bank);
    head?.rotateX(-this.lean * 0.7); // keep the gaze level

    if (!p.grounded) { this.pelvis += (0 - this.pelvis) * damp(8, dt); hips.position.y += this.pelvis; return; }

    // Foot planting: drop the pelvis to the lower foot, IK the other leg up.
    hips.parent?.updateMatrixWorld(true);
    hips.updateMatrixWorld(true);
    const ground = this.legs.map((leg) => {
      const f = leg.foot.getWorldPosition(new THREE.Vector3());
      return heightAt(f.x, f.z) - p.y;
    });
    const low = Math.max(-0.28, Math.min(0, ...ground));
    const compress = this.landing * this.landing * 0.09;
    this.pelvis += (low - compress - this.pelvis) * damp(14, dt);
    hips.position.y += this.pelvis;
    hips.updateMatrixWorld(true);

    const swing = clamp(1 - p.speed / 7, 0.35, 1);
    this.legs.forEach((leg, i) => {
      const foot = leg.foot.getWorldPosition(new THREE.Vector3());
      const lift = ground[i] - this.pelvis;
      if (lift > 0.002) solveLeg(leg, foot.clone().add(new THREE.Vector3(0, lift, 0)), swing);
      // Boot sole follows the terrain slope while weight is on it.
      const e = 0.18;
      const gx = heightAt(foot.x + e, foot.z) - heightAt(foot.x - e, foot.z);
      const gz = heightAt(foot.x, foot.z + e) - heightAt(foot.x, foot.z - e);
      const normal = new THREE.Vector3(-gx / (2 * e), 1, -gz / (2 * e)).normalize();
      const clear = leg.foot.getWorldPosition(new THREE.Vector3()).y - heightAt(foot.x, foot.z) - leg.ankle;
      const contact = clamp(1 - (clear - 0.03) / 0.08, 0, 1);
      if (contact > 0) applyWorldDelta(leg.foot, new THREE.Quaternion().setFromUnitVectors(UP, normal).slerp(new THREE.Quaternion(), 1 - contact));
      // Step events: boot print + dust when a foot comes down while moving.
      const planted = clear < 0.035;
      if (planted && !leg.planted && p.speed > 0.5 && this.effects) {
        const at = leg.foot.getWorldPosition(new THREE.Vector3());
        this.effects.print(at, p.yaw, i === 0);
        this.effects.puff(at, p.vx, p.vz, clamp(p.speed / 6.2, 0.25, 1));
      }
      if (this.landing > 0.97 && this.effects) {
        const at = leg.foot.getWorldPosition(new THREE.Vector3());
        this.effects.puff(at, p.vx, p.vz, 1.4);
        this.effects.print(at, p.yaw, i === 0);
      }
      leg.planted = planted;
    });
    if (this.landing > 0.97) this.landing = 0.96;
  }
}
