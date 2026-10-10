/**
 * VR Mission Park — a walkable ring of life-size spacecraft models on the Moon or Mars.
 *
 * - Works as a normal 3D page (mouse/touch look, WASD/arrow keys, on-screen walk buttons, tap an orb for its file),
 *   and as a WebXR "immersive-vr" session (controller ray + trigger: select an orb, or teleport to the ground point).
 * - Honest default: the spacecraft are shown SILENT (as they are). A toggle lets viewers imagine them awake.
 * - NOT tested on a physical headset in this project's environment (only in a headless browser).
 */
import * as THREE from "three";
import type { Body, Chapter } from "../core/types.ts";
import { Dust, Stage, buildWorld, canvasTexture, type Quality, type World } from "./kit.ts";
import { buildHardware, type Hardware } from "./hardware.ts";
import { buildBhulu, type Bhulu } from "./bhulu.ts";

export interface PanelInfo { title: string; lines: string[]; footer: string }
export interface ParkOptions {
  canvas: HTMLCanvasElement;
  body: Body;
  chapters: Chapter[];
  quality: Quality;
  assetBase: string;
  getInfo: (chapterId: string) => PanelInfo;
  getLabel: (chapterId: string) => string;
  onSelect?: (chapterId: string | null) => void;
  onXR?: (active: boolean) => void;
  onContextLost?: () => void;
}

interface Station { chapter: Chapter; hw: Hardware; orb: THREE.Mesh; hit: THREE.Mesh; label: THREE.Sprite; pos: THREE.Vector3 }

export async function xrSupported(): Promise<boolean> {
  try {
    const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
    if (!xr || !window.isSecureContext) return false;
    return await xr.isSessionSupported("immersive-vr");
  } catch { return false; }
}

function fontFamily() {
  try { return getComputedStyle(document.body).fontFamily || "sans-serif"; } catch { return "sans-serif"; }
}

function labelSprite(text: string): THREE.Sprite {
  const tex = canvasTexture(512, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = "rgba(3,4,5,0.72)";
    g.beginPath(); g.roundRect(4, 14, w - 8, h - 28, 20); g.fill();
    g.strokeStyle = "rgba(99,230,239,0.7)"; g.lineWidth = 3; g.stroke();
    g.fillStyle = "#ecebe6"; g.textAlign = "center"; g.textBaseline = "middle";
    let size = 46;
    g.font = `500 ${size}px ${fontFamily()}`;
    while (g.measureText(text).width > w - 50 && size > 22) { size -= 2; g.font = `500 ${size}px ${fontFamily()}`; }
    g.fillText(text, w / 2, h / 2 + 2);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
  s.scale.set(3.6, 0.9, 1);
  return s;
}

function panelTexture(info: PanelInfo): THREE.CanvasTexture {
  return canvasTexture(1024, 640, (g, w, h) => {
    g.fillStyle = "rgba(6,9,12,0.94)"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(99,230,239,0.85)"; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
    const ff = fontFamily();
    g.fillStyle = "#63e6ef"; g.font = `600 44px ${ff}`; g.textBaseline = "top";
    const wrap = (text: string, x: number, y: number, maxW: number, lh: number, font: string, color: string) => {
      g.font = font; g.fillStyle = color;
      let line = "";
      for (const word of text.split(/(\s+)/)) {
        const test = line + word;
        if (g.measureText(test).width > maxW && line) { g.fillText(line.trimEnd(), x, y); y += lh; line = word.trimStart(); } else line = test;
      }
      if (line.trim()) { g.fillText(line.trimEnd(), x, y); y += lh; }
      return y;
    };
    let y = wrap(info.title, 44, 36, w - 88, 54, `600 44px ${ff}`, "#63e6ef") + 10;
    for (const ln of info.lines) y = wrap(ln, 44, y, w - 88, 40, `400 31px ${ff}`, "#ecebe6") + 6;
    wrap(info.footer, 44, h - 60, w - 88, 28, `400 22px ${ff}`, "#8c8b86");
  });
}

export class VrPark {
  readonly stage: Stage;
  readonly world: World;
  readonly rig = new THREE.Group();
  readonly bhulu: Bhulu;
  private stations: Station[] = [];
  private raycaster = new THREE.Raycaster();
  private panel: THREE.Mesh | null = null;
  private selected: string | null = null;
  private teleportMark: THREE.Mesh;
  private controllers: THREE.Group[] = [];
  private xrSession: XRSession | null = null;
  private yaw = 0;
  private pitch = 0;
  private keys = new Set<string>();
  private moveF = 0;
  private moveS = 0;
  private alive = false;
  private dust: Dust;
  private cleanup: Array<() => void> = [];
  private disposed = false;
  private pointer = { down: false, x: 0, y: 0, moved: 0 };
  private tmpV = new THREE.Vector3();
  private tmpDir = new THREE.Vector3();
  private t = 0;

  constructor(private o: ParkOptions) {
    this.stage = new Stage({ canvas: o.canvas, quality: o.quality, onContextLost: o.onContextLost, xr: true });
    const r = this.stage.renderer;
    r.xr.enabled = true;
    try { r.xr.setReferenceSpaceType("local-floor"); } catch { /* ignore */ }
    const scene = this.stage.scene;
    this.world = buildWorld(o.body, o.quality, o.assetBase);
    scene.add(this.world.root);
    if (o.body === "moon") scene.background = new THREE.Color(0x000004);
    scene.fog = (this.world.root.userData.fog as THREE.FogExp2 | undefined) ?? null;
    this.world.setDusk(0.55);

    scene.add(this.rig);
    this.rig.add(this.stage.camera);
    this.stage.camera.position.set(0, 1.62, 0);
    this.stage.camera.near = 0.05;

    this.dust = new Dust(Math.min(400, o.quality.dust), this.world.gravity, this.world.heightAt, o.body === "mars" ? 0xb98660 : 0xa7a49c, 1);
    scene.add(this.dust.points);

    // stations on a ring
    const n = o.chapters.length;
    const ringR = 17;
    o.chapters.forEach((ch, i) => {
      const hw = buildHardware(ch.hardware);
      const a = (i / n) * Math.PI * 2 + Math.PI; // first station straight ahead (−z)
      const x = Math.sin(a) * (ringR + hw.radius * 0.5), z = Math.cos(a) * (ringR + hw.radius * 0.5);
      const y = this.world.heightAt(x, z);
      hw.root.position.set(x, y, z);
      hw.root.rotation.y = Math.atan2(-x, -z) + 0.4; // front faces the middle
      this.freeze(hw, ch);
      hw.upgrade?.(o.assetBase).then(() => { this.freeze(hw, ch); if (this.alive) hw.update(0, 0.1, 1); }).catch(() => {});
      scene.add(hw.root);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), new THREE.MeshStandardMaterial({ color: 0x0b3a40, emissive: 0x63e6ef, emissiveIntensity: 2.2, roughness: 0.3 }));
      orb.position.set(x, y + hw.height + 1.0, z);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.46, 16, 10), new THREE.MeshBasicMaterial({ color: 0x63e6ef, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      orb.add(halo);
      const hit = new THREE.Mesh(new THREE.SphereGeometry(1.0, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.copy(orb.position);
      hit.userData.id = ch.id;
      const label = labelSprite(o.getLabel(ch.id));
      label.position.set(x, y + hw.height + 2.0, z);
      scene.add(orb, hit, label);
      this.stations.push({ chapter: ch, hw, orb, hit, label, pos: new THREE.Vector3(x, y, z) });
    });

    this.bhulu = buildBhulu();
    this.bhulu.root.position.set(2.4, this.world.heightAt(2.4, -5.2), -5.2);
    this.bhulu.setMood("wave");
    scene.add(this.bhulu.root);

    this.teleportMark = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.32, 32), new THREE.MeshBasicMaterial({ color: 0x63e6ef, side: THREE.DoubleSide, transparent: true, opacity: 0.85, fog: false }));
    this.teleportMark.rotation.x = -Math.PI / 2;
    this.teleportMark.visible = false;
    scene.add(this.teleportMark);

    this.setupInput();
    this.setupControllers();
    this.stage.onTick((dt, t) => this.tick(dt, t));
    this.stage.resize();
  }

  /** Static "as they are today" poses. */
  private freeze(hw: Hardware, ch: Chapter) {
    hw.setDust(0.55);
    const asc = hw.parts.ascent; if (asc) asc.visible = false; // the ascent stage left in 1969/1972
    if (hw.parts.pivot) { hw.parts.pivot.rotation.z = 0.58; if (hw.parts.rock) hw.parts.rock.visible = true; }
    if (ch.hardware === "ingenuity") (hw.parts.breakBlade as (THREE.Object3D & { run?: () => void }) | undefined)?.run?.();
    for (let i = 0; i < 24; i++) hw.update(i * 0.1, 0.1, 0);
  }

  setAlive(on: boolean) {
    this.alive = on;
    this.world.setDusk(on ? 0.05 : 0.55);
    this.stations.forEach((s) => s.hw.setDust(on ? 0.1 : 0.55));
  }
  get isAlive() { return this.alive; }

  // ── input (desktop + touch) ──
  private setupInput() {
    const c = this.o.canvas;
    const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement | Window | Document, ev: string, fn: (e: never) => void) => {
      el.addEventListener(ev, fn as EventListener);
      this.cleanup.push(() => el.removeEventListener(ev, fn as EventListener));
    };
    on(c, "pointerdown", (e: PointerEvent) => { this.pointer = { down: true, x: e.clientX, y: e.clientY, moved: 0 }; try { c.setPointerCapture(e.pointerId); } catch { /* ignore */ } });
    on(c, "pointermove", (e: PointerEvent) => {
      if (!this.pointer.down) return;
      const dx = e.clientX - this.pointer.x, dy = e.clientY - this.pointer.y;
      this.pointer.x = e.clientX; this.pointer.y = e.clientY; this.pointer.moved += Math.abs(dx) + Math.abs(dy);
      this.yaw -= dx * 0.005;
      this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch - dy * 0.005));
    });
    on(c, "pointerup", (e: PointerEvent) => {
      const wasTap = this.pointer.down && this.pointer.moved < 8;
      this.pointer.down = false;
      if (wasTap) this.pick(e.clientX, e.clientY);
    });
    on(window, "keydown", (e: KeyboardEvent) => { if (!(e.target instanceof HTMLInputElement)) this.keys.add(e.key.toLowerCase()); });
    on(window, "keyup", (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase()));
    on(window, "blur", () => this.keys.clear());
  }

  setMove(forward: number, strafe: number) { this.moveF = forward; this.moveS = strafe; }

  private pick(cx: number, cy: number) {
    const rect = this.o.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.stage.camera);
    this.handleRay(false);
  }

  /** Returns true if something was hit. In XR, ground hits teleport. */
  private handleRay(allowTeleport: boolean): boolean {
    if (this.panel) {
      const hp = this.raycaster.intersectObject(this.panel, false);
      if (hp.length) { this.select(null); return true; }
    }
    const hits = this.raycaster.intersectObjects(this.stations.map((s) => s.hit), false);
    if (hits.length) { this.select(hits[0].object.userData.id as string); return true; }
    if (allowTeleport) {
      const ray = this.raycaster.ray;
      if (ray.direction.y < -0.05) {
        const t = (this.rig.position.y - ray.origin.y) / ray.direction.y;
        const p = ray.at(t, new THREE.Vector3());
        if (Math.hypot(p.x, p.z) < 60) { this.rig.position.set(p.x, this.world.heightAt(p.x, p.z), p.z); return true; }
      }
    }
    return false;
  }

  select(id: string | null) {
    this.selected = id;
    this.o.onSelect?.(id);
    if (this.panel) { this.stage.scene.remove(this.panel); (this.panel.material as THREE.MeshBasicMaterial).map?.dispose(); (this.panel.material as THREE.Material).dispose(); this.panel.geometry.dispose(); this.panel = null; }
    this.bhulu.setMood(id ? "talk" : "wave");
    if (id && this.xrSession) this.showXrPanel(id);
  }
  /** Refresh the floating XR panel (e.g. after a language change). */
  refresh() {
    this.stations.forEach((s) => { const sp = labelSprite(this.o.getLabel(s.chapter.id)); (s.label.material as THREE.SpriteMaterial).map?.dispose(); (s.label.material as THREE.SpriteMaterial).map = (sp.material as THREE.SpriteMaterial).map; });
    if (this.selected && this.xrSession) this.select(this.selected);
  }

  private showXrPanel(id: string) {
    const info = this.o.getInfo(id);
    const mat = new THREE.MeshBasicMaterial({ map: panelTexture(info), transparent: true, side: THREE.DoubleSide, fog: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), mat);
    const cam = this.stage.camera;
    cam.getWorldPosition(this.tmpV);
    cam.getWorldDirection(this.tmpDir);
    this.tmpDir.y = 0; this.tmpDir.normalize();
    mesh.position.copy(this.tmpV).addScaledVector(this.tmpDir, 1.9); mesh.position.y = this.tmpV.y - 0.1;
    mesh.lookAt(this.tmpV.x, mesh.position.y, this.tmpV.z);
    this.stage.scene.add(mesh);
    this.panel = mesh;
  }

  // ── WebXR ──
  private setupControllers() {
    const r = this.stage.renderer;
    for (let i = 0; i < 2; i++) {
      const ctl = r.xr.getController(i);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -6)]), new THREE.LineBasicMaterial({ color: 0x63e6ef, transparent: true, opacity: 0.8, fog: false }));
      ctl.add(line);
      const onSelect = () => {
        const m4 = new THREE.Matrix4().identity().extractRotation(ctl.matrixWorld);
        this.raycaster.ray.origin.setFromMatrixPosition(ctl.matrixWorld);
        this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(m4);
        this.handleRay(true);
      };
      ctl.addEventListener("selectstart", onSelect);
      this.rig.add(ctl);
      this.controllers.push(ctl);
    }
  }

  async enterXR(): Promise<boolean> {
    const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
    if (!xr) return false;
    try {
      const session = await xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor", "bounded-floor"] });
      this.xrSession = session;
      await this.stage.renderer.xr.setSession(session);
      this.stage.startXR((dt) => this.step(dt));
      session.addEventListener("end", () => {
        this.xrSession = null;
        this.stage.stopXR();
        this.stage.camera.position.set(0, 1.62, 0);
        this.stage.resize();
        this.stage.start();
        this.o.onXR?.(false);
      });
      this.o.onXR?.(true);
      return true;
    } catch {
      this.xrSession = null;
      return false;
    }
  }
  exitXR() { void this.xrSession?.end(); }

  // ── frame ──
  private step(dt: number) {
    this.t += dt;
    // desktop locomotion
    if (!this.xrSession) {
      const k = this.keys;
      const f = (k.has("w") || k.has("arrowup") ? 1 : 0) - (k.has("s") || k.has("arrowdown") ? 1 : 0) + this.moveF;
      const sd = (k.has("d") ? 1 : 0) - (k.has("a") ? 1 : 0) + this.moveS;
      const turn = (k.has("arrowleft") ? 1 : 0) - (k.has("arrowright") ? 1 : 0);
      this.yaw += turn * dt * 1.6;
      const speed = (k.has("shift") ? 6 : 3) * dt;
      const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
      const dx = (-sin * f + cos * sd) * speed, dz = (-cos * f - sin * sd) * speed;
      const nx = this.rig.position.x + dx, nz = this.rig.position.z + dz;
      if (Math.hypot(nx, nz) < 60) { this.rig.position.x = nx; this.rig.position.z = nz; }
      this.rig.position.y = this.world.heightAt(this.rig.position.x, this.rig.position.z);
      this.rig.rotation.y = this.yaw;
      this.stage.camera.rotation.x = this.pitch;
    }
    // orbs bob; hardware animates only when "awake"
    this.stations.forEach((s, i) => {
      s.orb.position.y = s.pos.y + s.hw.height + 1.0 + Math.sin(this.t * 1.6 + i) * 0.08;
      s.hit.position.y = s.orb.position.y;
      (s.orb.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.6 + Math.sin(this.t * 3 + i) * 0.7;
      s.label.quaternion.copy(this.stage.camera.getWorldQuaternion(new THREE.Quaternion()));
      if (this.alive) s.hw.update(this.t, dt, 1);
    });
    // Bhulu turns to the visitor
    this.stage.camera.getWorldPosition(this.tmpV);
    this.bhulu.lookAt(this.tmpV);
    const bp = this.bhulu.root.position;
    this.bhulu.root.rotation.y = Math.atan2(this.tmpV.x - bp.x, this.tmpV.z - bp.z);
    this.bhulu.update(dt, this.t);
    this.world.update(dt, this.t);
    this.dust.update(dt);
    // teleport marker follows the first controller's ground intersection
    this.teleportMark.visible = false;
    if (this.xrSession && this.controllers[0]) {
      const ctl = this.controllers[0];
      const m4 = new THREE.Matrix4().extractRotation(ctl.matrixWorld);
      const o = new THREE.Vector3().setFromMatrixPosition(ctl.matrixWorld);
      const d = new THREE.Vector3(0, 0, -1).applyMatrix4(m4);
      if (d.y < -0.05) {
        const t = (this.rig.position.y - o.y) / d.y;
        const p = o.addScaledVector(d, t);
        if (Math.hypot(p.x, p.z) < 60) { this.teleportMark.position.set(p.x, this.rig.position.y + 0.03, p.z); this.teleportMark.visible = true; }
      }
    }
  }

  private tick(dt: number, _t: number) {
    if (this.disposed || this.xrSession) return; // XR loop calls step() itself
    this.step(dt);
  }

  start() { this.stage.start(); }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.cleanup.forEach((f) => f());
    this.exitXR();
    this.stations.forEach((s) => s.hw.dispose());
    this.bhulu.dispose();
    this.stage.dispose();
  }
}
