/**
 * Three.js renderer for THE LAST LIGHT. The engine owns the frame loop: each
 * frame it reads input, advances the shared GameSession, mirrors simulation
 * state into the scene graph and renders. Gameplay rules live in the session;
 * this file is presentation only.
 */
import * as THREE from "three";
import { CHAPTERS, OBJECTIVE_BY_ID, SIDE_DISCOVERIES, chapterOfObjective } from "../content/chapters";
import { CUTSCENE_BY_ID, type Anchor } from "../content/cutscenes";
import { EVIDENCE_BY_ID } from "../content/evidence";
import { POIS, POI_BY_ID, ROVER_HEADING, ROVER_PARTS, ROVER_POSITION } from "../content/world";
import { clamp, smoothstep } from "../core/math";
import type { GameSession } from "../core/session";
import { heightAt } from "../core/terrain";
import type { InputController } from "../input";
import { adaptQuality, createAdaptive, qualityProfile, RESOLUTION_STEPS, type AdaptiveState, type QualityProfile, type QualityPreset } from "../settings";
import { Astronaut, EkoBot, blobShadow, loadOpportunity, stylizedRover } from "./actors";
import { Archive, Beacon, ComponentMarker, MemoryLights, Terminal, type PanelSpec, type PropState } from "./props";
import { createDust, createMesas, createRocks, createSky, createTerrain, createTracks, horizonColor, SUN_DIR } from "./world";

export interface EngineView {
  marker: { x: number; y: number; visible: boolean; onScreen: boolean; distance: number };
  heading: number;
  ekoPan: number;
  fps: number;
  frameMs: number;
  quality: Exclude<QualityPreset, "auto">;
  listener: { x: number; y: number; z: number; fx: number; fz: number };
  beacon: { x: number; y: number; z: number } | null;
}

export interface EngineOptions {
  preset: QualityPreset;
  initialQuality: Exclude<QualityPreset, "auto">;
  suit: string;
  reducedMotion: boolean;
  lang: "en" | "bn";
  assetBase: string;
  /** Freeze simulation (attract mode behind the main menu). */
  attract: boolean;
  onContextLost: () => void;
  onQualityChange: (q: Exclude<QualityPreset, "auto">) => void;
  onFrame?: (view: EngineView) => void;
}


const anchorVec = (a: Anchor, out: THREE.Vector3) => out.set(a.x, heightAt(a.x, a.z) + a.h, a.z);

export class Engine {
  readonly view: EngineView = {
    marker: { x: 0, y: 0, visible: false, onScreen: false, distance: 0 }, heading: 0, ekoPan: 0, fps: 0, frameMs: 0,
    quality: "medium", listener: { x: 0, y: 0, z: 0, fx: 0, fz: -1 }, beacon: null,
  };
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1400);
  private sun: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private sky = createSky();
  private fog = new THREE.FogExp2(0xc08a64, 0.006);
  private dust: ReturnType<typeof createDust>;
  private rocks: THREE.InstancedMesh;
  private astronaut: Astronaut;
  private eko = new EkoBot();
  private rover = new THREE.Group();
  private beacons = new Map<string, Beacon>();
  private terminals = new Map<string, Terminal>();
  private components = new Map<string, ComponentMarker>();
  private archive: Archive;
  private memory = new MemoryLights();
  private playerBlob = blobShadow(0.55);
  private ekoBlob = blobShadow(0.4);
  private profile: QualityProfile;
  private raf = 0;
  private last = 0;
  private clock = 0;
  private running = false;
  private disposed = false;
  private frames: number[] = [];
  private perfTimer = 0;
  private adaptive: AdaptiveState;
  private resizeObserver: ResizeObserver;
  private tmpA = new THREE.Vector3();
  private tmpB = new THREE.Vector3();
  private tmpC = new THREE.Vector3();
  private fogColor = new THREE.Color();
  private lostHandler = (e: Event) => { e.preventDefault(); this.stop(); this.options.onContextLost(); };

  constructor(private canvas: HTMLCanvasElement, private session: GameSession, private input: InputController, private options: EngineOptions) {
    this.view.quality = options.initialQuality;
    this.adaptive = createAdaptive(options.initialQuality);
    this.profile = qualityProfile(options.initialQuality, window.devicePixelRatio || 1);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.profile.antialias, powerPreference: "high-performance", alpha: false, stencil: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    canvas.addEventListener("webglcontextlost", this.lostHandler);

    const scene = this.scene;
    scene.fog = this.fog;
    scene.add(this.sky.mesh);
    this.hemi = new THREE.HemisphereLight(0xffe2c4, 0x5a3020, 1.15);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff1de, 2.7);
    this.sun.shadow.camera.left = -24; this.sun.shadow.camera.right = 24;
    this.sun.shadow.camera.top = 24; this.sun.shadow.camera.bottom = -24;
    this.sun.shadow.camera.near = 1; this.sun.shadow.camera.far = 160;
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.03;
    scene.add(this.sun, this.sun.target);

    scene.add(createTerrain(this.profile.terrainSegments, 300, options.assetBase));
    scene.add(createMesas());
    scene.add(createTracks());
    this.rocks = createRocks(session.rocks, this.profile.rocks, options.assetBase);
    scene.add(this.rocks);
    this.dust = createDust(2400);
    this.dust.setCount(this.profile.dust);
    scene.add(this.dust.points);

    this.astronaut = new Astronaut(options.suit);
    scene.add(this.astronaut.root, this.eko.root, this.playerBlob, this.ekoBlob);
    this.loadAstronaut(this.profile.astronaut);

    // Opportunity: NASA's own model where possible.
    this.rover.position.set(ROVER_POSITION.x, heightAt(ROVER_POSITION.x, ROVER_POSITION.z), ROVER_POSITION.z);
    this.rover.rotation.y = ROVER_HEADING;
    scene.add(this.rover);
    loadOpportunity(options.assetBase + "/models/opportunity-mer-b.glb", options.assetBase + "/vendor/draco/")
      .then((model) => { if (!this.disposed) { this.rover.add(model); this.rover.userData.source = "nasa"; } })
      .catch((error) => {
        console.warn("NASA rover GLB unavailable; using stylized stand-in.", error);
        if (!this.disposed) { this.rover.add(stylizedRover()); this.rover.userData.source = "fallback"; }
      });

    for (const poi of POIS) {
      if (poi.kind === "beacon" || poi.kind === "side" || (poi.kind === "record" && poi.id.startsWith("storm-record")) || poi.id === "ridge") {
        const b = new Beacon(poi, poi.kind === "side" || poi.id === "ridge");
        this.beacons.set(poi.id, b); scene.add(b.group);
      } else if (poi.id === "rover-terminal" || poi.id === "storm-terminal") {
        const t = new Terminal(poi); this.terminals.set(poi.id, t); scene.add(t.group);
      } else if (poi.id in ROVER_PARTS) {
        const c = new ComponentMarker(poi); this.components.set(poi.id, c); scene.add(c.group);
      }
    }
    this.archive = new Archive(this.panelSpecs(options.lang), options.assetBase);
    scene.add(this.archive.group, this.memory.group);

    this.applyProfile();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement ?? canvas);
    this.resize();
    this.renderer.compile(scene, this.camera);
  }

  private loadAstronaut(lod: "low" | "high" | "ultra") {
    const asset = `${this.options.assetBase}/models/game/explorer-${lod}.glb`;
    this.astronaut.load(asset).catch(() => undefined);
  }

  private panelSpecs(lang: "en" | "bn"): PanelSpec[] {
    const e = (id: string) => EVIDENCE_BY_ID.get(id)!;
    return [
      { poi: "frag-traverse", image: e("traverse").image?.src, title: e("traverse").title[lang], sub: "PIA23178" },
      { poi: "frag-pan", image: e("pancam").image?.src, title: e("pancam").title[lang], sub: "PIA22909" },
      { poi: "frag-storm", title: e("storm").title[lang], sub: lang === "bn" ? "জুন ২০১৮ · NASA" : "June 2018 · NASA" },
      { poi: "frag-image", title: e("last-image").title[lang], sub: lang === "bn" ? "১০ জুন ২০১৮ · PIA22929" : "June 10, 2018 · PIA22929" },
    ];
  }

  setLang(lang: "en" | "bn") {
    for (const spec of this.panelSpecs(lang)) if (!spec.image) this.archive.setPanel(spec, this.options.assetBase);
  }
  setSuit(color: string) { this.astronaut.setAccent(color); }
  setSession(session: GameSession) { this.session = session; }
  setReducedMotion(v: boolean) { this.options.reducedMotion = v; }
  setAttract(v: boolean) { this.options.attract = v; }
  /** First-person inspection view (camera at the helmet, body hidden). */
  firstPerson = false;

  setPreset(preset: QualityPreset) {
    this.options.preset = preset;
    if (preset !== "auto") this.setQuality(preset);
    this.adaptive = createAdaptive(this.view.quality);
    this.applyResolution();
  }

  private setQuality(q: Exclude<QualityPreset, "auto">) {
    if (q === this.view.quality) return;
    this.view.quality = q;
    this.profile = qualityProfile(q, window.devicePixelRatio || 1);
    this.applyProfile();
    this.options.onQualityChange(q);
  }

  /** Render resolution = tier pixel ratio × the adaptive resolution step. */
  private applyResolution() {
    const ratio = this.profile.pixelRatio * (this.options.preset === "auto" ? RESOLUTION_STEPS[this.adaptive.res] : 1);
    if (Math.abs(this.renderer.getPixelRatio() - ratio) > 1e-3) { this.renderer.setPixelRatio(ratio); this.resize(); }
    this.dust.uniforms.uPixel.value = ratio;
  }

  private applyProfile() {
    const p = this.profile;
    this.applyResolution();
    this.renderer.shadowMap.enabled = p.shadows > 0;
    this.sun.castShadow = p.shadows > 0;
    if (p.shadows > 0 && this.sun.shadow.mapSize.x !== p.shadows) {
      this.sun.shadow.mapSize.set(p.shadows, p.shadows);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    this.rocks.count = Math.min(p.rocks, this.session.rocks.length);
    this.dust.setCount(p.dust);
    this.eko.light.visible = p.shadows >= 1024;
    this.scene.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.Material | undefined; if (m) m.needsUpdate = true; });
    this.resize();
  }

  private resize() {
    const parent = this.canvas.parentElement ?? this.canvas;
    const w = Math.max(1, parent.clientWidth), h = Math.max(1, parent.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const real = (now - this.last) / 1000;
      const dt = Math.min(0.1, real);
      this.last = now;
      if (document.hidden) return;
      this.frame(dt, real);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() { this.running = false; cancelAnimationFrame(this.raf); }

  private frame(dt: number, real: number) {
    const t0 = performance.now();
    const s = this.session;
    const reduced = this.options.reducedMotion;
    this.clock += dt;
    const time = this.clock;

    if (!this.options.attract) s.advance(real, this.input.consume());
    else this.input.consume();

    // ── Camera: cutscene, attract orbit, or gameplay rig ─────────────────
    const cs = s.cutscene ? CUTSCENE_BY_ID.get(s.cutscene.id) : null;
    if (this.options.attract) {
      const a = time * (reduced ? 0 : 0.035) + 0.6;
      this.camera.position.set(ROVER_POSITION.x + Math.sin(a) * 26, heightAt(ROVER_POSITION.x, ROVER_POSITION.z) + 9, ROVER_POSITION.z + Math.cos(a) * 26);
      this.camera.lookAt(ROVER_POSITION.x, heightAt(ROVER_POSITION.x, ROVER_POSITION.z) + 1.5, ROVER_POSITION.z);
    } else if (cs && s.cutscene) {
      let t = s.cutscene.t;
      let shot = cs.shots[cs.shots.length - 1];
      for (const candidate of cs.shots) { if (t <= candidate.duration) { shot = candidate; break; } t -= candidate.duration; }
      // Reduced motion: hold each shot's final framing instead of moving the camera.
      const u = reduced ? 1 : smoothstep(0, 1, clamp(t / shot.duration, 0, 1));
      anchorVec(shot.from, this.tmpA); anchorVec(shot.to, this.tmpB);
      this.camera.position.lerpVectors(this.tmpA, this.tmpB, u);
      anchorVec(shot.lookFrom, this.tmpA); anchorVec(shot.lookTo, this.tmpB);
      this.tmpC.lerpVectors(this.tmpA, this.tmpB, u);
      this.camera.lookAt(this.tmpC);
    } else if (this.firstPerson) {
      const r = s.rig, cp = Math.cos(r.pitch);
      this.camera.position.set(s.player.x, s.player.y + 1.62, s.player.z);
      this.camera.lookAt(s.player.x - Math.sin(r.yaw) * cp, s.player.y + 1.62 - Math.sin(r.pitch), s.player.z - Math.cos(r.yaw) * cp);
    } else {
      const [px, py, pz] = s.pose.position;
      this.camera.position.set(px, py, pz);
      this.camera.lookAt(s.pose.target[0], s.pose.target[1], s.pose.target[2]);
    }
    const sprinting = s.player.speed > 4.5 && !reduced && !cs;
    const fov = sprinting ? 59 : 55;
    if (Math.abs(this.camera.fov - fov) > 0.05) { this.camera.fov += (fov - this.camera.fov) * Math.min(1, dt * 4); this.camera.updateProjectionMatrix(); }

    // ── Actors ───────────────────────────────────────────────────────────
    this.astronaut.update(s.player, time, dt, reduced);
    this.astronaut.root.visible = !(this.firstPerson && !cs && !this.options.attract);
    this.playerBlob.visible = this.astronaut.root.visible;
    this.eko.update(s.eko, time, dt, reduced);
    const groundP = heightAt(s.player.x, s.player.z);
    this.playerBlob.position.set(s.player.x, groundP + 0.03, s.player.z);
    this.playerBlob.scale.setScalar(clamp(1 - (s.player.y - groundP) * 0.35, 0.4, 1));
    const groundE = heightAt(s.eko.x, s.eko.z);
    this.ekoBlob.position.set(s.eko.x, groundE + 0.03, s.eko.z);
    (this.ekoBlob.material as THREE.MeshBasicMaterial).opacity = clamp(1.6 - (s.eko.y - groundE) * 0.5, 0.2, 0.8);

    // ── Atmosphere ───────────────────────────────────────────────────────
    const storm = clamp(s.storm, 0, 1);
    this.sky.uniforms.uStorm.value = storm;
    this.sky.uniforms.uTime.value = time;
    this.sky.mesh.position.copy(this.camera.position);
    horizonColor(storm, this.fogColor);
    this.fog.color.copy(this.fogColor);
    this.fog.density = 0.0042 + storm * storm * 0.052;
    this.sun.intensity = 2.7 * (1 - storm * 0.82);
    this.hemi.intensity = 1.15 - storm * 0.45;
    this.hemi.color.setRGB(1, 0.88 - storm * 0.2, 0.77 - storm * 0.3);
    this.renderer.setClearColor(this.fogColor);
    this.sun.position.set(s.player.x + SUN_DIR.x * 70, s.player.y + SUN_DIR.y * 70, s.player.z + SUN_DIR.z * 70);
    this.sun.target.position.set(s.player.x, s.player.y, s.player.z);
    this.dust.uniforms.uTime.value = reduced ? this.dust.uniforms.uTime.value + dt * 0.25 : time;
    this.dust.uniforms.uStorm.value = storm;
    this.dust.uniforms.uCenter.value.copy(this.camera.position);
    this.dust.uniforms.uColor.value.copy(this.fogColor).lerp(new THREE.Color(0.92, 0.7, 0.5), 0.4);

    this.updateProps(time, reduced, cs?.id ?? null);
    this.updateMarker();

    this.renderer.render(this.scene, this.camera);

    // ── Measurement & adaptive quality ───────────────────────────────────
    const ms = performance.now() - t0;
    this.frames.push(real);
    this.perfTimer += real;
    if (this.perfTimer > 2.5) {
      const avg = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
      this.view.fps = Math.round(1 / Math.max(avg, 1e-3));
      this.view.frameMs = Math.round(ms * 10) / 10;
      this.frames = [];
      this.perfTimer = 0;
      if (this.options.preset === "auto" && !this.options.attract) {
        const coarse = !!window.matchMedia?.("(pointer: coarse)").matches;
        const next = adaptQuality(this.adaptive, this.view.fps, coarse);
        const tierChanged = next.tier !== this.adaptive.tier, resChanged = next.res !== this.adaptive.res;
        this.adaptive = next;
        if (tierChanged) this.setQuality(next.tier);
        else if (resChanged) this.applyResolution();
      }
    }
    this.options.onFrame?.(this.view);
  }

  private objectiveState(poiId: string): PropState {
    const s = this.session;
    const active = s.active.some((o) => o.target === poiId);
    if (active) return "active";
    const targeting = [...OBJECTIVE_BY_ID.values()].filter((o) => o.target === poiId && o.kind !== "reach");
    if (!targeting.length) return "hidden";
    const done = new Set(s.progress.done);
    if (targeting.every((o) => done.has(o.id))) return "done";
    const ch = Math.min(...targeting.map((o) => chapterOfObjective(o.id)));
    return ch <= s.progress.chapter || s.progress.finished ? "dormant" : "hidden";
  }

  private updateProps(time: number, reduced: boolean, cutscene: string | null) {
    const s = this.session;
    for (const [id, beacon] of this.beacons) {
      const side = SIDE_DISCOVERIES.find((x) => x.target === id);
      let state: PropState;
      if (side) state = s.progress.sides.includes(side.id) ? "done" : s.progress.chapter >= side.fromChapter || s.progress.finished ? "side" : "hidden";
      else if (id === "ridge") state = s.active.some((o) => o.target === "ridge") ? "active" : "hidden";
      else state = this.objectiveState(id);
      beacon.update(state, time, reduced);
    }
    for (const [id, t] of this.terminals) t.update(this.objectiveState(id), time);
    for (const [id, c] of this.components) c.update(this.objectiveState(id), time, reduced);
    const states = new Map<string, PropState>();
    for (const id of ["frag-traverse", "frag-pan", "frag-storm", "frag-image"]) states.set(id, this.objectiveState(id));
    const awake = s.progress.chapter >= 3 || s.progress.finished;
    this.archive.update(awake, states, this.objectiveState("archive-core"), time, reduced, this.camera.position);
    const assembled = s.progress.done.includes("c5-assemble");
    let finale = s.progress.done.includes("c5-finale") ? 1 : 0;
    if (cutscene === "finale" && s.cutscene) finale = clamp(s.cutscene.t / 8 - 0.4, 0, 1);
    this.memory.update(assembled, finale, time, reduced);
  }

  private updateMarker() {
    const s = this.session;
    const target = s.objectiveTarget();
    const cam = this.camera;
    cam.getWorldDirection(this.tmpA);
    this.view.heading = Math.atan2(this.tmpA.x, -this.tmpA.z);
    this.view.listener = { x: cam.position.x, y: cam.position.y, z: cam.position.z, fx: this.tmpA.x, fz: this.tmpA.z };
    // EKO's chirps pan toward EKO's side of the screen.
    this.tmpB.set(s.eko.x, s.eko.y, s.eko.z).project(cam);
    this.view.ekoPan = clamp(this.tmpB.x, -1, 1);
    const m = this.view.marker;
    if (!target || s.cutscene || this.options.attract) { m.visible = false; this.view.beacon = null; return; }
    const y = heightAt(target.x, target.z) + 2.6;
    this.view.beacon = { x: target.x, y, z: target.z };
    m.distance = Math.hypot(target.x - s.player.x, target.z - s.player.z);
    this.tmpB.set(target.x, y, target.z).project(cam);
    const behind = this.tmpB.z > 1;
    let x = behind ? -this.tmpB.x : this.tmpB.x, yy = behind ? -this.tmpB.y : this.tmpB.y;
    const onScreen = !behind && Math.abs(x) < 0.92 && Math.abs(yy) < 0.85;
    if (!onScreen) {
      const k = 1 / Math.max(Math.abs(x) / 0.92, Math.abs(yy) / 0.85, 1e-3);
      x *= Math.min(1, k); yy *= Math.min(1, k);
      if (behind) yy = -0.85;
    }
    m.x = (x * 0.5 + 0.5) * 100; m.y = (1 - (yy * 0.5 + 0.5)) * 100;
    m.onScreen = onScreen; m.visible = true;
  }

  /** Per-material bounds of the loaded rover in rover-local space (diagnostics). */
  roverParts() {
    const out: Record<string, number[]> = {};
    this.rover.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(this.rover.matrixWorld).invert();
    this.rover.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const geo = mesh.geometry;
      const pos = geo.attributes.position as THREE.BufferAttribute;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const groups = geo.groups.length ? geo.groups : [{ start: 0, count: (geo.index?.count ?? pos.count), materialIndex: 0 }];
      const v = new THREE.Vector3();
      for (const g of groups) {
        const name = (mats[g.materialIndex ?? 0] as THREE.Material).name || "mat" + g.materialIndex;
        const b = new THREE.Box3();
        for (let i = g.start; i < g.start + g.count; i++) {
          const idx = geo.index ? geo.index.getX(i) : i;
          v.fromBufferAttribute(pos, idx).applyMatrix4(mesh.matrixWorld).applyMatrix4(inv);
          b.expandByPoint(v);
        }
        out[name] = [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].map((n) => Math.round(n * 100) / 100);
      }
      // Mast head = mean of the highest vertices; histogram of z for deck extent.
      let maxY = -Infinity;
      for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).applyMatrix4(inv); if (v.y > maxY) maxY = v.y; }
      const top = new THREE.Vector3(); let n = 0;
      for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).applyMatrix4(inv); if (v.y > maxY - 0.12) { top.add(v); n++; } }
      top.divideScalar(Math.max(1, n));
      out.mastHead = [top.x, top.y, top.z].map((x) => Math.round(x * 100) / 100);
    });
    return out;
  }

  /** Expose a few debug values for automated browser tests. */
  debugInfo() {
    return { rover: this.rover.userData.source ?? "loading", quality: this.view.quality, resolution: this.renderer.getPixelRatio(), fps: this.view.fps, frameMs: this.view.frameMs, calls: this.renderer.info.render.calls, footprints: this.astronaut.effects.printCount, triangles: this.renderer.info.render.triangles };
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener("webglcontextlost", this.lostHandler);
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose?.();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      for (const m of Array.isArray(mat) ? mat : mat ? [mat] : []) {
        for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
        m.dispose();
      }
    });
    this.renderer.dispose();
  }
}

export const chapterTitle = (i: number, lang: "en" | "bn") => CHAPTERS[i]?.title[lang] ?? "";
export const poiPosition = (id: string) => POI_BY_ID.get(id)?.position ?? null;
