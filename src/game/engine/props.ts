/**
 * Interactive props: memory beacons, science terminals, rover component
 * markers, the holographic archive (with real NASA images on its panels),
 * and the finale's memory lights. Visual state is pushed in every frame from
 * the session so props always reflect quest progress.
 */
import * as THREE from "three";
import { heightAt } from "../core/terrain";
import { ARCHIVE_PILLARS, ARCHIVE_POSITION, POIS, ROVER_POSITION, ROVER_PARTS, roverToWorld, type Poi } from "../content/world";

export type PropState = "hidden" | "dormant" | "active" | "done" | "side";

const CYAN = new THREE.Color(0x63e6ef);
const AMBER = new THREE.Color(0xe7a94f);
const GREEN = new THREE.Color(0x7fe3a5);

function beamMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: CYAN.clone() }, uOpacity: { value: 0.5 }, uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; varying float vDist; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vDist = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; uniform float uTime; varying vec2 vUv; varying float vDist;
      void main(){ float a = pow(1.0 - vUv.y, 1.6) * uOpacity; a *= 0.75 + 0.25 * sin(vUv.y * 40.0 - uTime * 3.0);
      a *= smoothstep(1.5, 16.0, vDist); // fade when the camera is close so the beam never blinds the player
      gl_FragColor = vec4(uColor, a); }`,
  });
}

export class Beacon {
  readonly group = new THREE.Group();
  private crystal: THREE.Mesh;
  private ring: THREE.Mesh;
  private beam: THREE.Mesh;
  private glowMat: THREE.MeshStandardMaterial;
  private beamMat: THREE.ShaderMaterial;
  state: PropState = "hidden";

  constructor(readonly poi: Poi, small = false) {
    const base = new THREE.MeshStandardMaterial({ color: 0x3b3430, roughness: 0.6, metalness: 0.5 });
    this.glowMat = new THREE.MeshStandardMaterial({ color: CYAN, emissive: CYAN, emissiveIntensity: 2, roughness: 0.2 });
    const y = heightAt(poi.position.x, poi.position.z);
    this.group.position.set(poi.position.x, y, poi.position.z);
    const k = small ? 0.7 : 1;
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.42 * k, 0.55 * k, 0.24, 8), base);
    plinth.position.y = 0.1; plinth.castShadow = true; plinth.receiveShadow = true;
    this.group.add(plinth);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * k, 0.1 * k, 1.3 * k, 6), base);
    pillar.position.y = 0.85 * k; pillar.castShadow = true;
    this.group.add(pillar);
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(0.55 * k, 0.03, 8, 40), this.glowMat);
    this.ring.rotation.x = Math.PI / 2; this.ring.position.y = 0.24;
    this.group.add(this.ring);
    this.crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.28 * k, 0), this.glowMat);
    this.crystal.position.y = 1.85 * k; this.crystal.castShadow = true;
    this.group.add(this.crystal);
    this.beamMat = beamMaterial();
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 70, 16, 1, true), this.beamMat);
    this.beam.position.y = 35;
    this.group.add(this.beam);
  }

  update(state: PropState, time: number, reducedMotion: boolean) {
    this.state = state;
    this.group.visible = state !== "hidden";
    if (!this.group.visible) return;
    const color = state === "done" ? GREEN : state === "side" ? AMBER : CYAN;
    this.glowMat.color.copy(color); this.glowMat.emissive.copy(color);
    this.glowMat.emissiveIntensity = state === "active" ? 2.4 + Math.sin(time * 3) * 0.8 : state === "dormant" ? 0.25 : 1.2;
    this.beamMat.uniforms.uColor.value.copy(color);
    this.beamMat.uniforms.uTime.value = time;
    this.beamMat.uniforms.uOpacity.value = state === "active" ? 0.42 : state === "side" ? 0.2 : 0;
    this.beam.visible = state === "active" || state === "side";
    this.crystal.rotation.y = reducedMotion ? 0 : time * 0.9;
    this.crystal.position.y = 1.85 + (reducedMotion ? 0 : Math.sin(time * 1.6 + this.poi.position.x) * 0.12);
    this.ring.scale.setScalar(state === "active" && !reducedMotion ? 1 + (Math.sin(time * 2.4) * 0.5 + 0.5) * 0.25 : 1);
  }
}

/** Field terminal with a glowing screen (puzzle stations). */
export class Terminal {
  readonly group = new THREE.Group();
  private screen: THREE.MeshStandardMaterial;
  private beamMat = beamMaterial();
  private beam: THREE.Mesh;
  constructor(readonly poi: Poi) {
    const body = new THREE.MeshStandardMaterial({ color: 0xd9d4ca, roughness: 0.45, metalness: 0.3 });
    this.screen = new THREE.MeshStandardMaterial({ color: CYAN, emissive: CYAN, emissiveIntensity: 1.4 });
    this.group.position.set(poi.position.x, heightAt(poi.position.x, poi.position.z), poi.position.z);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.9, 0.18), body); post.position.y = 0.45; post.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.48, 0.12), body); head.position.set(0, 1.05, 0); head.rotation.x = -0.35; head.castShadow = true;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.36), this.screen); screen.position.set(0, 1.07, 0.068); screen.rotation.x = -0.35;
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.08, 10), body); foot.position.y = 0.04; foot.receiveShadow = true;
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 50, 12, 1, true), this.beamMat); this.beam.position.y = 25;
    this.group.add(post, head, screen, foot, this.beam);
    this.group.rotation.y = Math.atan2(ROVER_POSITION.x - poi.position.x, ROVER_POSITION.z - poi.position.z) + Math.PI;
  }
  update(state: PropState, time: number) {
    this.group.visible = state !== "hidden";
    const color = state === "done" ? GREEN : CYAN;
    this.screen.color.copy(color); this.screen.emissive.copy(color);
    this.screen.emissiveIntensity = state === "active" ? 1.6 + Math.sin(time * 5) * 0.5 : state === "done" ? 0.8 : 0.15;
    this.beam.visible = state === "active";
    this.beamMat.uniforms.uTime.value = time;
    this.beamMat.uniforms.uOpacity.value = 0.4;
  }
}

/** Floating scan ring around a rover component. */
export class ComponentMarker {
  readonly group = new THREE.Group();
  private mat = new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
  private rings: THREE.Mesh[] = [];
  constructor(readonly poi: Poi) {
    // Rings sit on the actual part of NASA's model, not at the stand point.
    const ring = ROVER_PARTS[poi.id as keyof typeof ROVER_PARTS].ring;
    const at = roverToWorld(ring.x, ring.z);
    this.group.position.set(at.x, heightAt(ROVER_POSITION.x, ROVER_POSITION.z) + ring.y, at.z);
    for (let i = 0; i < 2; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.32 + i * 0.12, 0.012, 6, 40), this.mat);
      r.rotation.x = Math.PI / 2;
      this.rings.push(r); this.group.add(r);
    }
  }
  update(state: PropState, time: number, reducedMotion: boolean) {
    this.group.visible = state === "active" || state === "done";
    this.mat.color.copy(state === "done" ? GREEN : CYAN);
    this.mat.opacity = state === "done" ? 0.35 : 0.85;
    this.rings.forEach((r, i) => {
      r.rotation.y = reducedMotion ? 0 : time * (i ? -1.3 : 1.1);
      r.rotation.x = Math.PI / 2 + (reducedMotion ? 0 : Math.sin(time * 1.5 + i) * 0.35);
    });
  }
}

function textPanel(title: string, sub: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 320;
  const g = c.getContext("2d")!;
  g.fillStyle = "rgba(4,24,30,0.85)"; g.fillRect(0, 0, 512, 320);
  g.strokeStyle = "rgba(99,230,239,0.9)"; g.lineWidth = 4; g.strokeRect(6, 6, 500, 308);
  g.fillStyle = "#63e6ef"; g.font = "600 22px ui-monospace, monospace"; g.fillText("NASA RECORD", 28, 52);
  g.fillStyle = "#ecebe6"; g.font = "600 38px system-ui, sans-serif";
  wrap(g, title, 28, 120, 456, 44);
  g.fillStyle = "#b9b8b2"; g.font = "26px system-ui, sans-serif";
  wrap(g, sub, 28, 236, 456, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, lh: number) {
  const words = text.split(" ");
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (g.measureText(test).width > w && line) { g.fillText(line, x, y); line = word; y += lh; } else line = test;
  }
  g.fillText(line, x, y);
}

export interface PanelSpec { poi: string; image?: string; title: string; sub: string }

/** The fictional holographic archive that displays real NASA records. */
export class Archive {
  readonly group = new THREE.Group();
  private core: THREE.Group;
  private coreMat = new THREE.MeshStandardMaterial({ color: CYAN, emissive: CYAN, emissiveIntensity: 1.5, transparent: true, opacity: 0.85 });
  private floorMat = new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  private panels = new Map<string, { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; pedestal: THREE.MeshStandardMaterial }>();
  private loader = new THREE.TextureLoader();

  constructor(specs: PanelSpec[], assetBase: string) {
    const y = heightAt(ARCHIVE_POSITION.x, ARCHIVE_POSITION.z);
    this.group.position.set(ARCHIVE_POSITION.x, y, ARCHIVE_POSITION.z);
    const stone = new THREE.MeshStandardMaterial({ color: 0x9a8676, roughness: 0.75, metalness: 0.15, emissive: 0x0a2a2e, emissiveIntensity: 0.4 });
    const floor = new THREE.Mesh(new THREE.RingGeometry(6.2, 6.6, 64), this.floorMat);
    floor.rotation.x = -Math.PI / 2; floor.position.y = 0.05;
    const inner = new THREE.Mesh(new THREE.RingGeometry(1.8, 1.95, 48), this.floorMat);
    inner.rotation.x = -Math.PI / 2; inner.position.y = 0.05;
    this.group.add(floor, inner);
    // Four outer monoliths frame the archive (also collision pillars in the session).
    for (const [dx, dz] of ARCHIVE_PILLARS) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.2, 0.5), stone);
      m.position.set(dx, 1.6, dz); m.castShadow = true; m.receiveShadow = true;
      this.group.add(m);
    }
    this.core = new THREE.Group();
    this.core.position.y = 1.6;
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55 + i * 0.22, 0.03, 8, 48), this.coreMat);
      ring.rotation.x = Math.PI / 2 + i * 0.6;
      this.core.add(ring);
    }
    this.core.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 1), this.coreMat));
    this.group.add(this.core);

    for (const spec of specs) {
      const poi = POIS.find((p) => p.id === spec.poi)!;
      const lx = poi.position.x - ARCHIVE_POSITION.x, lz = poi.position.z - ARCHIVE_POSITION.z;
      const pedestalMat = new THREE.MeshStandardMaterial({ color: 0x5b524b, emissive: CYAN, emissiveIntensity: 0.1, roughness: 0.5, metalness: 0.4 });
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 0.9, 10), pedestalMat);
      ped.position.set(lx, 0.45, lz); ped.castShadow = true; ped.receiveShadow = true;
      this.group.add(ped);
      const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, color: 0xbff8ff });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4), mat);
      mesh.position.set(lx * 1.08, 2.0, lz * 1.08);
      mesh.rotation.y = Math.atan2(-lx, -lz);
      this.group.add(mesh);
      this.panels.set(spec.poi, { mesh, mat, pedestal: pedestalMat });
      this.setPanel(spec, assetBase);
    }
  }

  setPanel(spec: PanelSpec, assetBase: string) {
    const panel = this.panels.get(spec.poi);
    if (!panel) return;
    const old = panel.mat.map;
    if (spec.image) {
      this.loader.load(assetBase + spec.image, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        const img = tex.image as HTMLImageElement;
        const aspect = img.width / Math.max(1, img.height);
        panel.mesh.scale.set(2.4 / 2.2, Math.min(1.6, 2.4 / aspect) / 1.4, 1);
        panel.mat.map = tex; panel.mat.needsUpdate = true;
      });
    } else {
      panel.mat.map = textPanel(spec.title, spec.sub);
      panel.mat.needsUpdate = true;
    }
    old?.dispose();
  }

  /** `restored` lists fragment POIs already restored; `awake` turns the site on. */
  update(awake: boolean, states: Map<string, PropState>, coreState: PropState, time: number, reducedMotion: boolean, camera: THREE.Vector3) {
    this.floorMat.opacity = awake ? 0.22 + Math.sin(time * 1.4) * 0.06 : 0.04;
    this.coreMat.emissiveIntensity = coreState === "active" ? 2.4 + Math.sin(time * 4) : coreState === "done" ? 1.8 : awake ? 0.9 : 0.15;
    this.coreMat.color.copy(coreState === "done" ? GREEN : CYAN); this.coreMat.emissive.copy(this.coreMat.color);
    this.core.visible = awake || coreState !== "hidden";
    if (!reducedMotion) this.core.children.forEach((c, i) => { c.rotation.z = time * (0.4 + i * 0.3); c.rotation.y = time * 0.2 * (i % 2 ? -1 : 1); });
    for (const [id, panel] of this.panels) {
      const st = states.get(id) ?? "dormant";
      const target = st === "done" ? 0.92 : st === "active" ? 0.18 + (reducedMotion ? 0 : Math.abs(Math.sin(time * 3)) * 0.2) : 0;
      panel.mat.opacity += (target - panel.mat.opacity) * 0.08;
      panel.mesh.visible = panel.mat.opacity > 0.01;
      panel.pedestal.emissiveIntensity = st === "active" ? 0.9 + Math.sin(time * 3) * 0.4 : st === "done" ? 0.5 : awake ? 0.15 : 0.02;
      panel.pedestal.emissive.copy(st === "done" ? GREEN : CYAN);
      if (!reducedMotion) panel.mesh.position.y = 2.0 + Math.sin(time * 1.2 + panel.mesh.position.x) * 0.06;
      // Billboard toward the viewer so records never read mirrored.
      panel.mesh.rotation.y = Math.atan2(camera.x - (this.group.position.x + panel.mesh.position.x), camera.z - (this.group.position.z + panel.mesh.position.z));
    }
  }
}

/** Four memory lights that orbit Opportunity once the evidence is assembled. */
export class MemoryLights {
  readonly group = new THREE.Group();
  private orbs: THREE.Mesh[] = [];
  private beam: THREE.Mesh;
  private beamMat = beamMaterial();
  private level = 0;
  constructor() {
    const y = heightAt(ROVER_POSITION.x, ROVER_POSITION.z);
    this.group.position.set(ROVER_POSITION.x, y, ROVER_POSITION.z);
    const colors = [0x63e6ef, 0xffd99a, 0x7fe3a5, 0xf2a46b];
    for (const c of colors) {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshBasicMaterial({ color: c }));
      this.orbs.push(orb); this.group.add(orb);
    }
    this.beamMat.uniforms.uColor.value.set(0xffe2b0);
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 120, 24, 1, true), this.beamMat);
    this.beam.position.y = 60;
    this.group.add(this.beam);
  }
  /** `assembled` 0..1 (orbs), `finale` 0..1 (light beam). */
  update(assembled: boolean, finale: number, time: number, reducedMotion: boolean) {
    this.level += ((assembled ? 1 : 0) - this.level) * 0.03;
    this.group.visible = this.level > 0.01;
    this.orbs.forEach((orb, i) => {
      const a = (reducedMotion ? 0 : time * 0.6) + (i / 4) * Math.PI * 2;
      const r = 1.9 * this.level;
      orb.position.set(Math.cos(a) * r, 1.3 + (reducedMotion ? 0 : Math.sin(time * 1.3 + i) * 0.15), Math.sin(a) * r);
      orb.scale.setScalar(this.level);
    });
    this.beamMat.uniforms.uOpacity.value = finale * 0.45;
    this.beamMat.uniforms.uTime.value = time;
    this.beam.visible = finale > 0.01;
  }
}
