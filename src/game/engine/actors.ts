/**
 * Characters for the 3D renderer.
 * - Explorer: a generated, rigged astronaut GLB with a procedural fallback.
 * - EKO: an ORIGINAL procedural companion robot with emotion-driven eyes.
 * - Opportunity: NASA/Ames' own GLB (Draco), with a stylized fallback.
 */
import * as THREE from "three";
import type { PlayerState } from "../core/player";
import type { CompanionState, EkoEmotion } from "../core/companion";
import { clamp } from "../core/math";

const capsule = (r: number, len: number) => new THREE.CapsuleGeometry(r, len, 4, 10);

let blobTexture: THREE.CanvasTexture | null = null;
/** Soft contact shadow that keeps characters grounded even with shadow maps off. */
export function blobShadow(radius: number): THREE.Mesh {
  if (!blobTexture) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(0,0,0,0.55)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    blobTexture = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), new THREE.MeshBasicMaterial({ map: blobTexture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 1;
  return m;
}

// ── Explorer ──────────────────────────────────────────────────────────────────
export class Astronaut {
  readonly root = new THREE.Group();
  private hips = new THREE.Group();
  private chest = new THREE.Group();
  private head = new THREE.Group();
  private limbs: Record<"shoulderL" | "shoulderR" | "elbowL" | "elbowR" | "hipL" | "hipR" | "kneeL" | "kneeR", THREE.Group>;
  private accentMat: THREE.MeshStandardMaterial;
  private visorMat: THREE.MeshStandardMaterial;
  private lamp: THREE.Mesh;
  private landSquash = 0;
  private model: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private clips = new Map<string, THREE.AnimationAction>();
  private activeClip = "";

  constructor(accent: string) {
    const suit = new THREE.MeshStandardMaterial({ color: 0xe9e5dc, roughness: 0.62 });
    const joint = new THREE.MeshStandardMaterial({ color: 0x8d8b86, roughness: 0.7 });
    this.accentMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.5 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 0.8 });
    this.visorMat = new THREE.MeshStandardMaterial({ color: 0x1d1a16, metalness: 0.9, roughness: 0.12, emissive: new THREE.Color(0x0b3a40), emissiveIntensity: 0.6 });
    const add = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
    };

    this.root.add(this.hips);
    this.hips.position.y = 0.96;
    add(this.hips, new THREE.BoxGeometry(0.4, 0.2, 0.26), suit, 0, 0.02, 0);
    this.hips.add(this.chest);
    this.chest.position.y = 0.12;
    add(this.chest, capsule(0.24, 0.32), suit, 0, 0.3, 0).scale.set(1.12, 1, 0.82);
    add(this.chest, new THREE.BoxGeometry(0.3, 0.2, 0.06), dark, 0, 0.36, 0.2);
    add(this.chest, new THREE.BoxGeometry(0.31, 0.035, 0.07), this.accentMat, 0, 0.24, 0.205);
    add(this.chest, new THREE.BoxGeometry(0.38, 0.46, 0.18), suit, 0, 0.36, -0.24);
    add(this.chest, new THREE.BoxGeometry(0.4, 0.05, 0.2), this.accentMat, 0, 0.5, -0.24);
    this.lamp = add(this.chest, new THREE.BoxGeometry(0.05, 0.05, 0.02), new THREE.MeshStandardMaterial({ color: 0x63e6ef, emissive: 0x63e6ef, emissiveIntensity: 2 }), 0.1, 0.42, 0.235);

    this.chest.add(this.head);
    this.head.position.y = 0.72;
    add(this.head, new THREE.SphereGeometry(0.235, 24, 16), suit);
    add(this.head, new THREE.SphereGeometry(0.2, 24, 12, -Math.PI * 0.42, Math.PI * 0.84, Math.PI * 0.28, Math.PI * 0.42), this.visorMat, 0, 0.0, 0.05);
    add(this.head, new THREE.TorusGeometry(0.2, 0.025, 8, 24), joint, 0, -0.18, 0).rotation.x = Math.PI / 2;

    const limb = (name: string, parent: THREE.Object3D, x: number, y: number) => { const g = new THREE.Group(); g.name = name; g.position.set(x, y, 0); parent.add(g); return g; };
    const shoulderL = limb("shoulderL", this.chest, 0.33, 0.48), shoulderR = limb("shoulderR", this.chest, -0.33, 0.48);
    const elbowL = limb("elbowL", shoulderL, 0, -0.32), elbowR = limb("elbowR", shoulderR, 0, -0.32);
    const hipL = limb("hipL", this.hips, 0.12, -0.04), hipR = limb("hipR", this.hips, -0.12, -0.04);
    const kneeL = limb("kneeL", hipL, 0, -0.43), kneeR = limb("kneeR", hipR, 0, -0.43);
    for (const s of [shoulderL, shoulderR]) { add(s, new THREE.SphereGeometry(0.1, 12, 10), joint); add(s, capsule(0.075, 0.2), suit, 0, -0.16, 0); }
    for (const e of [elbowL, elbowR]) { add(e, capsule(0.068, 0.18), suit, 0, -0.13, 0); add(e, new THREE.SphereGeometry(0.075, 10, 8), dark, 0, -0.29, 0.01); add(e, new THREE.CylinderGeometry(0.072, 0.072, 0.04, 12), this.accentMat, 0, -0.04, 0); }
    for (const h of [hipL, hipR]) add(h, capsule(0.09, 0.28), suit, 0, -0.21, 0);
    for (const k of [kneeL, kneeR]) {
      add(k, new THREE.SphereGeometry(0.085, 10, 8), joint);
      add(k, capsule(0.08, 0.26), suit, 0, -0.2, 0);
      add(k, new THREE.BoxGeometry(0.16, 0.11, 0.27), dark, 0, -0.43, 0.04);
    }
    this.limbs = { shoulderL, shoulderR, elbowL, elbowR, hipL, hipR, kneeL, kneeR };
  }

  setAccent(color: string) { this.accentMat.color.set(color); }

  /** Load the authored, skinned explorer asset while retaining the procedural fallback. */
  async load(url: string): Promise<boolean> {
    try {
      const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
        import("three/examples/jsm/loaders/GLTFLoader.js"),
        import("three/examples/jsm/libs/meshopt_decoder.module.js"),
      ]);
      const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url);
      const model = gltf.scene;
      model.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) {
          if (material.name === "MarsAmber") (material as THREE.MeshStandardMaterial).color.set(this.accentMat.color);
          if ("envMapIntensity" in material) (material as THREE.MeshStandardMaterial).envMapIntensity = 0.8;
        }
      });
      this.root.traverse((object) => { if ((object as THREE.Mesh).isMesh) object.visible = false; });
      this.root.add(model);
      this.model = model;
      this.mixer = new THREE.AnimationMixer(model);
      this.clips = new Map(gltf.animations.map((clip) => [clip.name, this.mixer!.clipAction(clip)]));
      return true;
    } catch (error) {
      console.warn(`Explorer model unavailable at ${url}; using procedural fallback.`, error);
      return false;
    }
  }

  private playClip(name: string, fade = 0.18) {
    if (!this.mixer || !this.clips.has(name) || this.activeClip === name) return;
    const next = this.clips.get(name)!;
    const previous = this.clips.get(this.activeClip);
    if (previous) previous.fadeOut(fade);
    next.reset().fadeIn(fade).play();
    this.activeClip = name;
  }

  update(p: PlayerState, time: number, dt: number, reducedMotion: boolean) {
    this.root.position.set(p.x, p.y, p.z);
    this.root.rotation.y = p.yaw;
    const L = this.limbs;
    const run = clamp((p.speed - 3.2) / 3, 0, 1);
    const amp = clamp(p.speed / 3.1, 0, 1) * (0.55 + run * 0.35);
    const phase = p.stride * Math.PI * 2 / (1.7 + run * 0.6);
    const s = Math.sin(phase);

    if (p.landed < 0.05) this.landSquash = 1;
    this.landSquash = Math.max(0, this.landSquash - dt * 4);

    if (!p.grounded) {
      L.hipL.rotation.x = -0.55; L.hipR.rotation.x = -0.2;
      L.kneeL.rotation.x = 0.9; L.kneeR.rotation.x = 0.5;
      L.shoulderL.rotation.set(-0.3, 0, -0.5); L.shoulderR.rotation.set(-0.3, 0, 0.5);
      L.elbowL.rotation.x = -0.5; L.elbowR.rotation.x = -0.5;
      this.hips.position.y = 0.96;
      this.hips.rotation.x = 0.05;
    } else {
      L.hipL.rotation.x = s * amp; L.hipR.rotation.x = -s * amp;
      L.kneeL.rotation.x = Math.max(0, -Math.sin(phase - 0.6)) * amp * 1.5;
      L.kneeR.rotation.x = Math.max(0, Math.sin(phase - 0.6)) * amp * 1.5;
      L.shoulderL.rotation.set(-s * amp * 0.85, 0, -0.12); L.shoulderR.rotation.set(s * amp * 0.85, 0, 0.12);
      L.elbowL.rotation.x = -0.25 - run * 0.9; L.elbowR.rotation.x = -0.25 - run * 0.9;
      const bob = reducedMotion ? 0 : Math.abs(Math.cos(phase)) * 0.035 * amp;
      this.hips.position.y = 0.96 + bob - this.landSquash * 0.08;
      this.hips.rotation.x = run * 0.18 + (amp > 0.05 ? 0.03 : 0);
    }
    const breathe = reducedMotion ? 0 : Math.sin(time * 1.7) * 0.012 * (1 - amp);
    this.chest.scale.set(1, 1 + breathe, 1);
    this.head.rotation.y = amp < 0.05 && !reducedMotion ? Math.sin(time * 0.35) * 0.25 : 0;
    (this.lamp.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.4 + Math.sin(time * 3) * 0.6;
    if (this.mixer && this.model) {
      const clip = !p.grounded ? "jump" : p.landed < 0.5 ? "land" : p.speed > 4.5 ? "run" : p.speed > 0.25 ? "walk" : "idle";
      this.playClip(clip, clip === "land" ? 0.08 : 0.18);
      const action = this.clips.get(clip);
      if (action && clip !== "idle" && clip !== "jump" && clip !== "land") action.setEffectiveTimeScale(clip === "run" ? Math.max(0.75, p.speed / 4.3) : Math.max(0.75, p.speed / 1.5));
      this.mixer.update(reducedMotion ? dt * 0.25 : dt);
    }
  }
}

// ── EKO ───────────────────────────────────────────────────────────────────────
const EYE_SHAPES: Record<EkoEmotion, { sx: number; sy: number; tilt: number; color: number; glow: number }> = {
  idle: { sx: 1, sy: 1, tilt: 0, color: 0x63e6ef, glow: 2.2 },
  curious: { sx: 1, sy: 1.18, tilt: 0.18, color: 0x63e6ef, glow: 2.4 },
  discovery: { sx: 1.3, sy: 1.3, tilt: 0, color: 0x9ff6ff, glow: 3.6 },
  excited: { sx: 1.15, sy: 0.55, tilt: 0, color: 0x9ff6ff, glow: 3.2 },
  concerned: { sx: 0.95, sy: 0.7, tilt: -0.22, color: 0xf2c27a, glow: 1.8 },
  sad: { sx: 1, sy: 0.42, tilt: 0.12, color: 0x7fb8d8, glow: 1.2 },
  hopeful: { sx: 1.1, sy: 1.08, tilt: 0.05, color: 0xffd99a, glow: 2.8 },
};

export class EkoBot {
  readonly root = new THREE.Group();
  private body = new THREE.Group();
  private eyes: THREE.Mesh[] = [];
  private eyeMat = new THREE.MeshStandardMaterial({ color: 0x63e6ef, emissive: 0x63e6ef, emissiveIntensity: 2.2 });
  private ring: THREE.Mesh;
  private thruster: THREE.Mesh;
  private antennaTip: THREE.Mesh;
  private blink = 0;
  private nextBlink = 2;
  private spin = 0;
  readonly light: THREE.PointLight;

  constructor() {
    const shell = new THREE.MeshStandardMaterial({ color: 0xf1f3f4, roughness: 0.22, metalness: 0.15 });
    const face = new THREE.MeshStandardMaterial({ color: 0x07131d, roughness: 0.12, metalness: 0.6 });
    const glow = new THREE.MeshStandardMaterial({ color: 0x63e6ef, emissive: 0x63e6ef, emissiveIntensity: 1.6, transparent: true, opacity: 0.9 });
    this.root.add(this.body);
    const shellMesh = new THREE.Mesh(new THREE.SphereGeometry(0.32, 32, 20), shell);
    shellMesh.scale.set(1, 0.9, 0.95); shellMesh.castShadow = true;
    this.body.add(shellMesh);
    const faceMesh = new THREE.Mesh(new THREE.SphereGeometry(0.255, 28, 16, -Math.PI * 0.38, Math.PI * 0.76, Math.PI * 0.26, Math.PI * 0.46), face);
    faceMesh.position.z = 0.06; faceMesh.scale.set(1, 0.92, 1);
    this.body.add(faceMesh);
    for (const x of [-0.085, 0.085]) {
      const eye = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.05, 4, 10), this.eyeMat);
      eye.position.set(x, 0.03, 0.305);
      this.eyes.push(eye); this.body.add(eye);
    }
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.018, 8, 48), glow);
    this.ring.rotation.x = Math.PI / 2;
    this.body.add(this.ring);
    const fins = new THREE.MeshStandardMaterial({ color: 0xc9ced2, roughness: 0.35, metalness: 0.3 });
    for (const x of [-0.33, 0.33]) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.2), fins);
      fin.position.set(x, -0.02, -0.02); fin.castShadow = true; this.body.add(fin);
    }
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.18, 6), fins);
    antenna.position.set(0.06, 0.36, -0.02); antenna.rotation.z = -0.25; this.body.add(antenna);
    this.antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), glow);
    this.antennaTip.position.set(0.085, 0.45, -0.02); this.body.add(this.antennaTip);
    this.thruster = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0x63e6ef, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.thruster.position.y = -0.36; this.thruster.rotation.x = Math.PI;
    this.body.add(this.thruster);
    this.light = new THREE.PointLight(0x63e6ef, 0.9, 5, 2);
    this.light.position.set(0, -0.1, 0.4);
    this.root.add(this.light);
  }

  update(c: CompanionState, time: number, dt: number, reducedMotion: boolean) {
    const bob = reducedMotion ? 0 : Math.sin(c.clock * 2.3) * 0.06;
    this.root.position.set(c.x, c.y + bob, c.z);
    this.root.rotation.y = c.yaw;
    const shape = EYE_SHAPES[c.emotion] ?? EYE_SHAPES.idle;
    // Lean into motion; excited bounces; sad droops.
    const speed = Math.hypot(c.vx, c.vz);
    this.body.rotation.x = clamp(speed * 0.06, 0, 0.35) + (c.emotion === "sad" ? 0.25 : 0);
    this.body.rotation.z = reducedMotion ? 0 : shape.tilt * 0.6;
    if (c.emotion === "excited" && !reducedMotion) this.body.position.y = Math.abs(Math.sin(time * 7)) * 0.08;
    else this.body.position.y *= 0.85;

    this.nextBlink -= dt;
    if (this.nextBlink <= 0) { this.blink = 0.14; this.nextBlink = 2.5 + ((time * 7.3) % 3); }
    this.blink = Math.max(0, this.blink - dt);
    const blinkScale = this.blink > 0 ? 0.12 : 1;
    this.eyes.forEach((eye, i) => {
      eye.scale.set(shape.sx, shape.sy * blinkScale, 1);
      eye.rotation.z = (i === 0 ? 1 : -1) * shape.tilt;
    });
    this.eyeMat.color.lerp(new THREE.Color(shape.color), 0.12);
    this.eyeMat.emissive.copy(this.eyeMat.color);
    this.eyeMat.emissiveIntensity += (shape.glow - this.eyeMat.emissiveIntensity) * 0.1;
    this.light.color.copy(this.eyeMat.color);

    const spinRate = c.emotion === "discovery" ? 6 : c.emotion === "excited" ? 3 : 0.6;
    this.spin += dt * (reducedMotion ? 0.3 : spinRate);
    this.ring.rotation.z = this.spin;
    this.ring.rotation.y = Math.sin(this.spin * 0.5) * 0.25;
    const thrust = 0.25 + clamp(speed * 0.08, 0, 0.4) + (reducedMotion ? 0 : Math.sin(time * 30) * 0.05);
    (this.thruster.material as THREE.MeshBasicMaterial).opacity = thrust;
    this.thruster.scale.y = 0.8 + thrust;
    (this.antennaTip.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2 + Math.sin(time * 4) * 0.8;
  }
}

// ── Opportunity ───────────────────────────────────────────────────────────────
/** Stylized stand-in used only if NASA's GLB or the Draco decoder fails to load. */
export function stylizedRover(): THREE.Group {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0xb8ad9c, roughness: 0.5, metalness: 0.4 });
  const panel = new THREE.MeshStandardMaterial({ color: 0x14233a, roughness: 0.3, metalness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b1918, roughness: 0.8 });
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  add(new THREE.BoxGeometry(1.0, 0.32, 1.2), metal, 0, 0.55, 0);
  add(new THREE.BoxGeometry(2.1, 0.05, 1.5), panel, 0, 0.78, 0);
  for (const x of [-0.75, 0.75]) for (const z of [-0.55, 0, 0.55]) add(new THREE.CylinderGeometry(0.13, 0.13, 0.13, 16), dark, x, 0.13, z).rotation.z = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.75, 8), metal, 0, 1.15, 0.45);
  add(new THREE.BoxGeometry(0.3, 0.12, 0.12), metal, 0, 1.52, 0.45);
  return g;
}

/** Restore the material response of NASA's MER mesh under the Mars sky. */
const MER_SURFACES: Record<string, { metalness: number; roughness: number }> = {
  tex_panels_n: { metalness: .25, roughness: .32 }, tex_panels2_n: { metalness: .25, roughness: .32 },
  tex_instruments: { metalness: .4, roughness: .45 }, tex_body_n: { metalness: .08, roughness: .55 },
  tex_suspension_n: { metalness: .55, roughness: .42 }, Silver: { metalness: .9, roughness: .32 },
  tex_mast: { metalness: .15, roughness: .55 }, foil_silver: { metalness: .95, roughness: .3 },
  tex_arm: { metalness: .45, roughness: .45 },
};

/** Load a NASA rover GLB through same-origin Draco or meshopt decoders. */
export async function loadOpportunity(url: string, decoderPath: string, targetHeight = 1.5): Promise<THREE.Object3D> {
  const [{ GLTFLoader }, { DRACOLoader }, { MeshoptDecoder }] = await Promise.all([
    import("three/examples/jsm/loaders/GLTFLoader.js"),
    import("three/examples/jsm/loaders/DRACOLoader.js"),
    import("three/examples/jsm/libs/meshopt_decoder.module.js"),
  ]);
  const draco = new DRACOLoader();
  draco.setDecoderPath(decoderPath);
  draco.setDecoderConfig({ type: "wasm" });
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  loader.setMeshoptDecoder(MeshoptDecoder);
  try {
    const gltf = await loader.loadAsync(url);
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const scale = targetHeight / Math.max(size.y, 1e-3);
    model.scale.multiplyScalar(scale);
    const fitted = new THREE.Box3().setFromObject(model);
    const center = fitted.getCenter(new THREE.Vector3());
    model.position.x -= center.x; model.position.z -= center.z; model.position.y -= fitted.min.y;
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true; mesh.receiveShadow = true;
        for (const mat of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.MeshStandardMaterial[]) {
          if (!mat || !("roughness" in mat)) continue;
          const surface = MER_SURFACES[mat.name];
          if (surface) { mat.metalness = surface.metalness; mat.roughness = surface.roughness; }
          else mat.roughness = Math.max(mat.roughness, .35);
          mat.envMapIntensity = .9;
        }
      }
    });
    const wrapper = new THREE.Group();
    wrapper.add(model);
    return wrapper;
  } finally {
    draco.dispose();
  }
}
