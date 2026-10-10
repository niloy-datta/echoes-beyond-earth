/**
 * ChapterClip — the short animated "story clip" for one chapter.
 *
 * Four beats (arrive → work → silence → echo). The visual state is a pure function of the clip time (`apply`),
 * so seeking, replaying and reduced-motion stills all work; particles and rotor/wheel animation are layered on top.
 *
 * What is dramatised is described by the chapter text; nothing here claims telemetry or sounds. The "echo" beat
 * shows an orbiter passing over the site (orbiters photographed these sites) — not a signal from the object.
 */
import * as THREE from "three";
import type { CatalogObject, Chapter, HardwareKind } from "../core/types.ts";
import { Dust, Flame, Stage, buildWorld, smooth, type Quality, type World } from "./kit.ts";
import { buildHardware, fitModel, loadGlb, type Hardware } from "./hardware.ts";
import { buildBhulu, type Bhulu, type Mood } from "./bhulu.ts";

export interface ClipOptions {
  canvas: HTMLCanvasElement;
  chapter: Chapter;
  object?: CatalogObject | null;
  quality: Quality;
  assetBase: string;
  /** render still frames only (prefers-reduced-motion) */
  reduced?: boolean;
  onBeat?: (index: number) => void;
  onEnd?: () => void;
  onContextLost?: () => void;
}

const THRUSTERS: Partial<Record<HardwareKind, { alt: number; len: number; rad: number }>> = {
  lm: { alt: 70, len: 6.5, rad: 0.7 },
  surveyor: { alt: 45, len: 2.6, rad: 0.2 },
  "nova-c": { alt: 60, len: 4.5, rad: 0.5 },
  viking: { alt: 50, len: 3.2, rad: 0.3 },
  phoenix: { alt: 45, len: 2.8, rad: 0.25 },
  insight: { alt: 45, len: 2.8, rad: 0.25 },
};
const BOUNCERS: HardwareKind[] = ["pathfinder", "mer"];

const polar = (a: number, d: number, y: number, out = new THREE.Vector3()) => out.set(Math.sin(a) * d, y, Math.cos(a) * d);
const lerp = THREE.MathUtils.lerp;

function makeOrbiter(): THREE.Group {
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: 0xc89b3c, metalness: 0.9, roughness: 0.4 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x14203a, metalness: 0.6, roughness: 0.3 });
  const grey = new THREE.MeshStandardMaterial({ color: 0xbfc4ca, metalness: 0.8, roughness: 0.35 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 2.2), gold); g.add(body);
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.06, 1.3), dark); p.position.set(s * 2.4, 0, 0); g.add(p); }
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.8, 18, 8, 0, Math.PI * 2, 0, 0.9), grey); dish.position.set(0, 0.9, -0.9); dish.rotation.x = -0.7; (dish.material as THREE.Material).side = THREE.DoubleSide; g.add(dish);
  const cam = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 14), dark); cam.position.set(0, -0.7, 0.4); g.add(cam);
  return g;
}

export class ChapterClip {
  readonly stage: Stage;
  readonly world: World;
  readonly hardware: Hardware;
  readonly bhulu: Bhulu;
  readonly starts: number[] = [];
  readonly duration: number;
  time = 0;
  playing = false;
  beat = 0;
  ended = false;

  private flames: Flame[] = [];
  private ascFlame: Flame | null = null;
  private dust: Dust;
  private orbiter = makeOrbiter();
  private marker: THREE.Mesh;
  private airbag: THREE.Mesh | null = null;
  private ang0 = 0.6;
  private camAng = 0.85;
  private brokeBlade = false;
  private lastBeat = -1;
  private aspectK = 1;
  private disposed = false;
  private bhuluPos = new THREE.Vector3();
  private tmp = new THREE.Vector3();
  private lookTarget = new THREE.Vector3();
  private lastHeadAng = 0;

  constructor(private o: ClipOptions) {
    const { chapter, quality } = o;
    this.stage = new Stage({ canvas: o.canvas, quality, onContextLost: o.onContextLost });
    this.world = buildWorld(chapter.body, quality, o.assetBase);
    const scene = this.stage.scene;
    scene.add(this.world.root);
    if (chapter.body === "moon") scene.background = new THREE.Color(0x000004);
    scene.fog = (this.world.root.userData.fog as THREE.FogExp2 | undefined) ?? null;

    this.hardware = buildHardware(chapter.hardware);
    scene.add(this.hardware.root);
    this.hardware.upgrade?.(o.assetBase).catch(() => {});

    const th = THRUSTERS[chapter.hardware];
    if (th) {
      for (const n of this.hardware.nozzles) {
        const f = new Flame(th.len, th.rad);
        f.root.position.copy(n);
        this.hardware.root.add(f.root);
        this.flames.push(f);
      }
    }
    const asc = this.hardware.parts.ascent;
    if (asc) { this.ascFlame = new Flame(4.5, 0.55); this.hardware.root.add(this.ascFlame.root); }

    if (BOUNCERS.includes(chapter.hardware)) {
      const r = this.hardware.radius * 0.95;
      const g = new THREE.SphereGeometry(r, 28, 18);
      const p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) { const k = 1 + Math.sin(p.getX(i) * 4) * Math.sin(p.getZ(i) * 4) * 0.06; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); }
      g.computeVertexNormals();
      this.airbag = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xeceae4, transparent: true, opacity: 0.5, roughness: 0.7, side: THREE.DoubleSide, depthWrite: false }));
      this.airbag.position.y = r * 0.9;
      this.hardware.root.add(this.airbag);
    }

    this.dust = new Dust(quality.dust, this.world.gravity, this.world.heightAt, chapter.body === "mars" ? 0xb98660 : 0xa7a49c, chapter.body === "mars" ? 1.6 : 0.4);
    scene.add(this.dust.points);

    this.bhulu = buildBhulu();
    scene.add(this.bhulu.root);

    this.marker = new THREE.Mesh(
      new THREE.RingGeometry(0.96, 1, 72),
      new THREE.MeshBasicMaterial({ color: 0x63e6ef, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }),
    );
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.position.y = 0.1;
    scene.add(this.marker);
    scene.add(this.orbiter);
    this.orbiter.visible = false;
    void this.upgradeOrbiter(o.assetBase, chapter.body);

    let t = 0;
    for (const b of chapter.beats) { this.starts.push(t); t += b.seconds; }
    this.duration = t;

    this.stage.onTick((dt, clock) => this.tick(dt, clock));
    this.stage.resize();
    this.refreshAspect();
    this.seekTime(o.reduced ? this.starts[1] + chapter.beats[1].seconds * 0.55 : 0);
    if (o.reduced) this.stage.renderOnce(0);
  }

  /** NASA's LRO (Moon) / MRO (Mars) model replaces the stand-in orbiter that flies over in the "echo" beat. */
  private async upgradeOrbiter(assetBase: string, body: "moon" | "mars") {
    try {
      const m = await loadGlb(`${assetBase}/models/nasa/${body === "moon" ? "lro" : "mro"}.glb`, `${assetBase}/vendor/draco/`);
      if (this.disposed) return;
      fitModel(m, 7);
      const box = new THREE.Box3().setFromObject(m);
      m.position.sub(box.getCenter(new THREE.Vector3()));
      const holder = new THREE.Group(); holder.add(m);
      this.orbiter.children.forEach((c) => (c.visible = false));
      this.orbiter.add(holder);
    } catch { /* keep the stand-in */ }
  }

  private refreshAspect() {
    const a = this.stage.camera.aspect;
    this.aspectK = a < 1 ? 1 / Math.pow(Math.max(0.35, a), 0.62) : 1;
  }

  // ── controls ──
  play() {
    if (this.o.reduced) return;
    if (this.ended) { this.restart(); return; }
    this.playing = true;
    this.stage.start();
  }
  pause() { this.playing = false; }
  toggle() { if (this.playing) this.pause(); else this.play(); }
  restart() { this.ended = false; this.seekTime(0); this.playing = true; this.stage.start(); }
  seekBeat(i: number) {
    const idx = Math.min(this.o.chapter.beats.length - 1, Math.max(0, i));
    this.ended = false;
    this.seekTime(this.starts[idx] + 0.001);
    if (this.o.reduced || !this.playing) { this.stage.resize(); this.refreshAspect(); this.stage.renderOnce(0); }
  }
  /** Jump to any time and fast-forward the stateful animations so they settle. */
  seekTime(t: number) {
    this.time = Math.min(this.duration, Math.max(0, t));
    this.brokeBlade = false;
    const p = this.state(this.time);
    for (let i = 0; i < 24; i++) this.hardware.update(this.time + i * 0.1, 0.1, p.power);
    this.apply(0);
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.hardware.dispose();
    this.bhulu.dispose();
    this.stage.dispose();
  }

  // ── timeline ──
  private beatAt(t: number) {
    const bs = this.o.chapter.beats;
    let i = 0;
    for (let k = 0; k < bs.length; k++) if (t >= this.starts[k]) i = k;
    const u = Math.min(1, Math.max(0, (t - this.starts[i]) / bs[i].seconds));
    return { i, u, id: bs[i].id, sec: bs[i].seconds };
  }

  private state(t: number) {
    const { chapter, object } = this.o;
    const kind = chapter.hardware;
    const { i, u, id, sec } = this.beatAt(t);
    const alive = object?.status === "active";
    let alt = 0, flame = 0, power = 0, dusk = 0, dust = 0, bag = 0, bagOn = false;
    const th = THRUSTERS[kind];
    if (id === "arrive") {
      if (th) {
        const p = Math.min(1, u / 0.8);
        alt = th.alt * (1 - p) * (1 - p);
        flame = u < 0.8 ? 1 : Math.max(0, 1 - (u - 0.8) / 0.08);
      } else if (BOUNCERS.includes(kind)) {
        bagOn = u < 0.9;
        if (u < 0.5) alt = 32 * (1 - (u / 0.5) ** 2);
        else if (u < 0.7) alt = 5.5 * Math.sin(Math.PI * (u - 0.5) / 0.2);
        else if (u < 0.82) alt = 1.6 * Math.sin(Math.PI * (u - 0.7) / 0.12);
        bag = u < 0.82 ? 1 : 1 - (u - 0.82) / 0.1;
      } else if (kind === "ingenuity") {
        alt = 0;
      }
      power = u > 0.85 ? (u - 0.85) / 0.15 : 0;
      dusk = 0;
      if (kind === "ingenuity") power = 0;
    } else if (id === "work") {
      power = 1; dusk = 0.04 * u; dust = 0;
    } else if (id === "silence") {
      power = alive ? 1 : 1 - smooth(0, 0.7, u);
      dusk = alive ? 0.2 : lerp(0.04, 0.72, smooth(0, 1, u));
      dust = alive ? 0.2 : 0.5 * u;
    } else {
      power = alive ? 1 : 0;
      dusk = alive ? 0.3 : lerp(0.72, 0.82, u);
      dust = alive ? 0.3 : lerp(0.5, 0.95, u);
    }
    // special per-hardware events
    let ascent = 0, ascentFlame = 0, tip = 0;
    if (kind === "lm") {
      if (id === "silence" && u > 0.3) { const tt = (u - 0.3) * sec; ascent = 1.5 * tt * tt; ascentFlame = 1; }
      else if (id === "echo") ascent = -1; // gone
    }
    if (kind === "nova-c") {
      if (id === "work") tip = smooth(0.04, 0.3, u);
      else if (id === "silence" || id === "echo") tip = 1;
    }
    if (kind === "ingenuity" && id === "arrive") power = 0;
    return { i, u, id, sec, alt, flame, power, dusk, dust, bag, bagOn, ascent, ascentFlame, tip };
  }

  private apply(dt: number) {
    const s = this.state(this.time);
    const { chapter } = this.o;
    const kind = chapter.hardware;
    const hw = this.hardware;
    const R = hw.radius, H = hw.height;

    // beat change
    if (s.i !== this.lastBeat) { this.lastBeat = s.i; this.beat = s.i; this.o.onBeat?.(s.i); }

    // world
    this.world.setDusk(s.dusk);
    hw.setDust(s.dust);

    // hardware pose
    hw.root.position.y = this.world.heightAt(0, 0) + s.alt;
    hw.root.rotation.z = s.alt > 0.5 && THRUSTERS[kind] ? Math.sin(this.time * 1.3) * 0.015 * Math.min(1, s.alt / 8) : 0;
    this.flames.forEach((f) => { f.set(s.flame); f.update(this.time); });
    if (this.airbag) {
      this.airbag.visible = s.bagOn && s.bag > 0.02;
      this.airbag.scale.setScalar(Math.max(0.02, s.bag));
    }
    const props = hw.parts.props;
    if (props) props.visible = s.id !== "arrive"; // the astronauts set these up after landing
    const asc = hw.parts.ascent;
    if (asc) {
      asc.visible = s.ascent >= 0;
      asc.position.y = ((asc.userData.baseY as number | undefined) ?? 3.5) + Math.max(0, s.ascent);
      this.ascFlame?.root.position.set(0, asc.position.y + ((asc.userData.nozzleY as number | undefined) ?? 0.1), 0);
      asc.rotation.z = s.ascent > 0 ? Math.min(0.12, s.ascent * 0.002) : 0;
      this.ascFlame?.set(s.ascentFlame && s.ascent >= 0 ? 1 : 0);
      this.ascFlame?.update(this.time * 2);
      if (s.ascent > 0 && s.ascent < 12 && dt > 0) this.dust.emit(this.tmp.set(0, 0.1, 0), 3, 9, 1.2, 1.6);
    }
    const lrv = hw.parts.lrv;
    if (lrv) {
      const on = chapter.id === "apollo-17" && s.id !== "arrive";
      lrv.visible = on;
      if (on) {
        if (s.id === "work") {
          const a = s.u * Math.PI * 1.7 + 0.6;
          lrv.position.set(Math.sin(a) * 11, this.world.heightAt(Math.sin(a) * 11, Math.cos(a) * 11), Math.cos(a) * 11);
          lrv.rotation.y = a + Math.PI / 2;
          (lrv.userData.wheels as THREE.Mesh[]).forEach((w) => (w.rotation.x = this.time * 6));
        } else lrv.position.set(Math.sin(2.2) * 11, 0, Math.cos(2.2) * 11), (lrv.rotation.y = 2.2 + Math.PI / 2);
      }
    }
    const pivot = hw.parts.pivot;
    if (pivot) {
      pivot.rotation.z = s.tip * 0.58;
      if (hw.parts.rock) hw.parts.rock.visible = s.tip > 0.02;
      if (s.tip > 0.02 && s.tip < 0.98 && dt > 0) this.dust.emit(this.tmp.set(-3.2, 0.1, 0), 4, 5, 1.4, 1.4);
    }
    if (kind === "ingenuity" && s.id === "silence" && s.u > 0.15 && !this.brokeBlade) {
      this.brokeBlade = true;
      (hw.parts.breakBlade as (THREE.Object3D & { run?: () => void }) | undefined)?.run?.();
    }
    if (kind === "ingenuity" && s.id !== "silence" && s.id !== "echo") this.brokeBlade = false;

    // touch-down dust
    if (dt > 0) {
      if (THRUSTERS[kind] && s.flame > 0.2 && s.alt < 14) this.dust.emit(this.tmp.set(0, 0, 0), Math.round(3 + (14 - s.alt)), 11 * (1 - s.alt / 16), 1.8, 2.6);
      if (BOUNCERS.includes(kind) && s.bagOn && s.alt < 0.3 && s.u > 0.45) this.dust.emit(this.tmp.set(0, 0, 0), 3, 4, 2, 1.8);
    }

    // marker ring: a pulsing highlight of the site in the echo beat
    const mm = this.marker.material as THREE.MeshBasicMaterial;
    if (s.id === "echo") {
      const ph = (this.time * 0.35) % 1;
      this.marker.scale.setScalar(R * (1.6 + ph * 3.2));
      mm.opacity = (1 - ph) * 0.8 * smooth(0, 0.15, s.u);
      this.marker.visible = true;
    } else this.marker.visible = false;

    // orbiter fly-by in the echo beat (placed in camera space so it is always in frame)
    this.orbiter.visible = s.id === "echo";
    // camera + Bhulu
    this.shots(s, R, H);
    this.hardware.root.updateMatrixWorld();

    // power drives continuous animations
    this.lastPower = s.power;
  }
  private lastPower = 0;

  private shots(s: ReturnType<ChapterClip["state"]>, R: number, H: number) {
    const cam = this.stage.camera;
    const D = (R * 2.7 + 3.2) * this.aspectK;
    const cy = this.world.heightAt(0, 0);
    let ang = this.ang0 + 0.25, dist = D, y = 1.6 + H * 0.45;
    const look = this.lookTarget.set(0, cy + H * 0.42, 0);
    switch (s.id) {
      case "arrive": {
        dist = D * lerp(1.45, 1.0, smooth(0, 1, s.u));
        y = 1.8 + H * 0.5 + (1 - s.u) * 5;
        ang = this.ang0 + 0.4 - s.u * 0.15;
        look.y = cy + s.alt * 0.75 + H * 0.35;
        break;
      }
      case "work": {
        ang = this.ang0 + 0.25 + s.u * 0.9;
        break;
      }
      case "silence": {
        ang = this.ang0 + 1.15 + s.u * 0.25;
        dist = D * (1 + 0.22 * s.u);
        y = lerp(1.6 + H * 0.45, 1.1 + H * 0.28, s.u);
        look.y = cy + H * 0.4 + Math.min(Math.max(0, s.ascent) * 0.18, 9);
        if (s.ascent > 0) y += Math.min(s.ascent * 0.06, 4);
        break;
      }
      case "echo": {
        ang = this.ang0 + 1.4 + s.u * 0.35;
        dist = D * lerp(1.15, 1.4, s.u);
        y = lerp(1.2 + H * 0.3, H * 1.1 + R * 0.9, smooth(0, 1, s.u));
        look.y = cy + H * 0.45 + smooth(0, 1, s.u) * H * 0.9;
        break;
      }
    }
    this.camAng = ang;
    polar(ang, dist, cy + y, cam.position);
    cam.lookAt(look);
    if (s.id === "echo") {
      cam.updateMatrixWorld();
      const fwd = this.tmp.set(0, 0, -1).transformDirection(cam.matrixWorld);
      const right = new THREE.Vector3(1, 0, 0).transformDirection(cam.matrixWorld);
      const up = new THREE.Vector3(0, 1, 0).transformDirection(cam.matrixWorld);
      this.orbiter.position.copy(cam.position).addScaledVector(fwd, 80).addScaledVector(right, lerp(-52, 52, s.u)).addScaledVector(up, 17);
      this.orbiter.rotation.set(0.1, Math.PI / 2 + 0.4, 0.05);
      this.orbiter.scale.setScalar(2.6);
    }

    // Bhulu stays on the left side of the frame, walking around the site while the camera orbits
    const rb = R * 1.18 + 1.1;
    const ba = ang - 0.62;
    this.bhuluPos.set(Math.sin(ba) * rb, this.world.heightAt(Math.sin(ba) * rb, Math.cos(ba) * rb), Math.cos(ba) * rb);
    const b = this.bhulu;
    b.root.position.copy(this.bhuluPos);
    b.root.rotation.y = Math.atan2(-this.bhuluPos.x, -this.bhuluPos.z) + 0.25;
    const moving = s.id === "work" && s.u > 0.02 && s.u < 0.98;
    b.setWalk(moving ? 1 : 0);
    const mood: Mood = s.id === "arrive" ? (s.u < 0.85 ? "point" : "happy") : s.id === "work" ? (moving ? "idle" : "talk") : s.id === "silence" ? "sad" : s.u > 0.5 ? "salute" : "talk";
    b.setMood(s.id === "work" && moving ? "talk" : mood);
    this.tmp.set(0, cy + (s.id === "arrive" ? s.alt + H * 0.4 : H * 0.5), 0);
    b.lookAt(this.tmp);
    // keep the walking direction coherent with the orbit direction
    this.lastHeadAng = ba;
  }

  private tick(dt: number, clock: number) {
    if (this.disposed) return;
    this.refreshAspect();
    if (this.playing) {
      this.time += dt;
      if (this.time >= this.duration) {
        this.time = this.duration;
        this.playing = false;
        this.ended = true;
        this.o.onEnd?.();
      }
    }
    this.apply(dt);
    const power = this.lastPower;
    this.world.update(dt, clock);
    if (this.playing || this.o.reduced) {
      this.hardware.update(clock, dt, power);
    }
    this.bhulu.update(dt, clock);
    this.dust.update(dt);
  }
}
