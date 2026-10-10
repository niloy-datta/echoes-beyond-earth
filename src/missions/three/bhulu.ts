/**
 * Bhulu (ভুলু) — the project's ORIGINAL cartoon dog-astronaut guide. Round, friendly and Doraemon-style in spirit only:
 * a tan puppy in a white-and-orange suit with a big glass helmet. Not based on any existing character.
 * Biped, ~1.3 m tall, built from primitives so it needs no assets and stays light.
 */
import * as THREE from "three";

export type Mood = "idle" | "talk" | "happy" | "sad" | "point" | "wave" | "salute";

export interface Bhulu {
  root: THREE.Group;
  height: number;
  setMood(m: Mood): void;
  /** world-space point the head should turn towards (null = look ahead) */
  lookAt(p: THREE.Vector3 | null): void;
  /** walk speed in m/s along +z of the root; 0 = stand still */
  setWalk(speed: number): void;
  update(dt: number, t: number): void;
  dispose(): void;
}

const M = (color: number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.05, ...o });

export function buildBhulu(): Bhulu {
  const root = new THREE.Group();
  const fur = M(0xd9a05b), furDark = M(0xa8702f), cream = M(0xf6e7c8);
  const suit = M(0xf2f1ee, { roughness: 0.5 }), orange = M(0xf08a3c), steel = M(0x9aa3ad, { metalness: 0.7, roughness: 0.4 });
  const black = M(0x14110f, { roughness: 0.3 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xcfe8ff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.22, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
  const cyan = new THREE.MeshStandardMaterial({ color: 0x0b3a40, emissive: 0x63e6ef, emissiveIntensity: 1.6 });

  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, p: THREE.Object3D, x = 0, y = 0, z = 0) => {
    const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; p.add(o); return o;
  };
  const sph = (r: number) => new THREE.SphereGeometry(r, 24, 16);

  // ── body ──
  const hips = new THREE.Group(); hips.position.y = 0.52; root.add(hips);
  const torso = mesh(sph(0.27), suit, hips, 0, 0.2, 0); torso.scale.set(1, 1.15, 0.9);
  mesh(new THREE.TorusGeometry(0.255, 0.035, 10, 28), orange, hips, 0, 0.02, 0).rotation.x = Math.PI / 2; // belt
  const chest = mesh(new THREE.BoxGeometry(0.22, 0.14, 0.04), steel, hips, 0, 0.32, 0.24);
  mesh(new THREE.BoxGeometry(0.06, 0.06, 0.02), cyan, chest, -0.05, 0, 0.025);
  mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 10), orange, chest, 0.05, 0, 0.025).rotation.x = Math.PI / 2;
  const pack = mesh(new THREE.BoxGeometry(0.34, 0.42, 0.16), steel, hips, 0, 0.3, -0.27);
  mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 10), orange, pack, -0.1, 0.0, -0.1).rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 10), orange, pack, 0.1, 0.0, -0.1).rotation.x = Math.PI / 2;
  // tail (through a slit in the suit)
  const tail = new THREE.Group(); tail.position.set(0, 0.06, -0.24); hips.add(tail);
  const tailMesh = mesh(new THREE.CapsuleGeometry(0.045, 0.3, 6, 12), fur, tail, 0, 0.15, 0);
  tailMesh.rotation.x = -0.9; tailMesh.position.set(0, 0.1, -0.12);
  mesh(sph(0.05), cream, tail, 0, 0.27, -0.26);

  // ── legs ──
  const legs: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(s * 0.12, 0.0, 0);
    mesh(new THREE.CapsuleGeometry(0.075, 0.28, 6, 12), suit, leg, 0, -0.2, 0);
    mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 14), orange, leg, 0, -0.34, 0);
    const boot = mesh(sph(0.1), steel, leg, 0, -0.45, 0.04); boot.scale.set(1, 0.7, 1.45);
    hips.add(leg); legs.push(leg);
  }

  // ── arms ──
  const arms: { g: THREE.Group; fore: THREE.Group }[] = [];
  for (const s of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(s * 0.3, 0.38, 0); hips.add(g);
    mesh(sph(0.075), orange, g);
    mesh(new THREE.CapsuleGeometry(0.058, 0.17, 6, 12), suit, g, 0, -0.14, 0);
    const fore = new THREE.Group(); fore.position.set(0, -0.27, 0); g.add(fore);
    mesh(new THREE.CapsuleGeometry(0.052, 0.14, 6, 12), suit, fore, 0, -0.1, 0);
    mesh(sph(0.075), cream, fore, 0, -0.24, 0.0); // glove (paw)
    arms.push({ g, fore });
  }

  // ── head (inside the helmet) ──
  const neck = new THREE.Group(); neck.position.set(0, 0.5, 0.0); hips.add(neck);
  mesh(new THREE.TorusGeometry(0.2, 0.04, 10, 32), steel, neck, 0, -0.02, 0).rotation.x = Math.PI / 2; // collar ring
  const head = new THREE.Group(); head.position.set(0, 0.22, 0); neck.add(head);
  mesh(sph(0.2), fur, head, 0, 0, 0).scale.set(1, 0.95, 1);
  const muzzle = mesh(sph(0.1), cream, head, 0, -0.06, 0.17); muzzle.scale.set(1.1, 0.8, 1.1);
  mesh(sph(0.032), black, head, 0, -0.025, 0.265).scale.set(1.2, 0.9, 1);
  const mouth = mesh(new THREE.TorusGeometry(0.045, 0.008, 6, 14, Math.PI), black, head, 0, -0.085, 0.25);
  mouth.rotation.z = Math.PI;
  const eyes: THREE.Mesh[] = [];
  for (const s of [-1, 1]) {
    const w = mesh(sph(0.052), M(0xffffff, { roughness: 0.2 }), head, s * 0.082, 0.045, 0.165);
    const p = mesh(sph(0.03), black, w, 0, 0, 0.032);
    mesh(sph(0.009), M(0xffffff, { roughness: 0.1 }), p, 0.01, 0.012, 0.022);
    eyes.push(w);
    const brow = mesh(new THREE.CapsuleGeometry(0.01, 0.05, 4, 8), furDark, head, s * 0.082, 0.12, 0.17);
    brow.rotation.z = Math.PI / 2;
    // patch around one eye gives a distinctive look
  }
  mesh(sph(0.065), furDark, head, -0.085, 0.045, 0.14).scale.set(1, 1.05, 0.5);
  const ears: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * 0.15, 0.1, -0.02); head.add(e);
    const lobe = mesh(sph(0.075), furDark, e, s * 0.06, -0.09, 0); lobe.scale.set(0.7, 1.7, 0.6);
    ears.push(e);
  }
  // helmet bubble + rim + antenna
  mesh(new THREE.SphereGeometry(0.33, 36, 24), glass, neck, 0, 0.22, 0.0);
  mesh(new THREE.TorusGeometry(0.24, 0.025, 8, 36), orange, neck, 0, 0.02, 0).rotation.x = Math.PI / 2;
  const ant = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 6), steel, neck, 0.2, 0.45, -0.1); ant.rotation.z = -0.4;
  const antTip = mesh(sph(0.024), cyan, neck, 0.245, 0.55, -0.1);

  // ── animation state ──
  let mood: Mood = "idle", moodT = 0, walk = 0, phase = 0;
  let look: THREE.Vector3 | null = null;
  const tmp = new THREE.Vector3(), target = new THREE.Euler();
  let headYaw = 0, headPitch = 0;
  let blink = 0, nextBlink = 2.5;

  const ease = (cur: number, to: number, k: number) => cur + (to - cur) * Math.min(1, k);

  return {
    root,
    height: 1.35,
    setMood(m) { if (m !== mood) { mood = m; moodT = 0; } },
    lookAt(p) { look = p ? p.clone() : null; },
    setWalk(s) { walk = s; },
    update(dt, t) {
      moodT += dt;
      phase += dt * (walk > 0.02 ? 7 : 0);
      const w = walk > 0.02 ? 1 : 0;
      const talk = mood === "talk" ? 1 : 0;
      // breathing + bob
      const breath = Math.sin(t * 2.0) * 0.008;
      hips.position.y = 0.52 + breath + Math.abs(Math.sin(phase)) * 0.03 * w + (mood === "happy" ? Math.abs(Math.sin(moodT * 7)) * 0.16 : 0);
      legs[0].rotation.x = Math.sin(phase) * 0.7 * w;
      legs[1].rotation.x = -Math.sin(phase) * 0.7 * w;
      // arms by mood
      let a0x = 0, a0z = 0.05, a1x = 0, a1z = -0.05, f0 = 0, f1 = 0;
      if (w) { a0x = -Math.sin(phase) * 0.6; a1x = Math.sin(phase) * 0.6; f0 = f1 = -0.25; }
      switch (mood) {
        case "wave": a1x = -2.6; a1z = -0.3 + Math.sin(moodT * 9) * 0.2; f1 = -0.5; break;
        case "point": a1x = -1.5; a1z = -0.15; f1 = 0; break;
        case "salute": a1x = -2.2; a1z = 0.3; f1 = -2.0; break;
        case "happy": a0x = -2.8; a1x = -2.8; a0z = 0.4 + Math.sin(moodT * 8) * 0.15; a1z = -a0z; break;
        case "sad": a0x = 0.1; a1x = 0.1; a0z = 0.0; a1z = 0.0; f0 = f1 = -0.1; break;
        case "talk": a0x = -0.5 + Math.sin(t * 3.1) * 0.25; f0 = -0.7; a1x = -0.3 + Math.sin(t * 2.3 + 1) * 0.15; break;
      }
      const k = dt * 9;
      arms[0].g.rotation.x = ease(arms[0].g.rotation.x, a0x, k); arms[0].g.rotation.z = ease(arms[0].g.rotation.z, a0z, k);
      arms[1].g.rotation.x = ease(arms[1].g.rotation.x, a1x, k); arms[1].g.rotation.z = ease(arms[1].g.rotation.z, a1z, k);
      arms[0].fore.rotation.x = ease(arms[0].fore.rotation.x, f0, k); arms[1].fore.rotation.x = ease(arms[1].fore.rotation.x, f1, k);
      // tail wag: fast when happy, slow when idle, drooped when sad
      const wag = mood === "happy" ? 0.7 : mood === "sad" ? 0.04 : 0.25;
      tail.rotation.y = Math.sin(t * (mood === "happy" ? 16 : 6)) * wag;
      tail.rotation.x = mood === "sad" ? 0.6 : 0;
      // ears
      const drop = mood === "sad" ? 0.55 : 0;
      ears.forEach((e, i) => { const s = i === 0 ? -1 : 1; e.rotation.z = ease(e.rotation.z, s * (0.1 + drop * 0.6) + Math.sin(t * 1.4 + i) * 0.03, dt * 6); e.rotation.x = ease(e.rotation.x, drop * 0.3 + (w ? Math.sin(phase * 2) * 0.1 : 0), dt * 6); });
      // head: look at a point, otherwise sway slightly
      let yaw = Math.sin(t * 0.6) * 0.08, pitch = mood === "sad" ? 0.28 : Math.sin(t * 0.5) * 0.03;
      if (look) {
        head.updateWorldMatrix(true, false);
        tmp.copy(look); root.worldToLocal(tmp);
        yaw = THREE.MathUtils.clamp(Math.atan2(tmp.x, tmp.z), -1.0, 1.0);
        pitch = THREE.MathUtils.clamp(-Math.atan2(tmp.y - 1.1, Math.hypot(tmp.x, tmp.z)), -0.5, 0.5);
      }
      if (mood === "talk") { pitch += Math.sin(t * 8) * 0.03; yaw += Math.sin(t * 2.2) * 0.1; }
      headYaw = ease(headYaw, yaw, dt * 6); headPitch = ease(headPitch, pitch, dt * 6);
      target.set(headPitch, headYaw, mood === "idle" ? Math.sin(t * 0.7) * 0.05 : 0);
      neck.rotation.copy(target);
      // mouth and blinking
      mouth.scale.y = mood === "talk" ? 0.5 + Math.abs(Math.sin(t * 11)) * 1.6 : mood === "happy" ? 1.4 : mood === "sad" ? -0.8 : 1;
      blink -= dt;
      if (blink <= 0 && t > nextBlink) { blink = 0.12; nextBlink = t + 2 + Math.random() * 3; }
      const lid = blink > 0 ? 0.1 : mood === "happy" ? 0.55 : 1;
      eyes.forEach((e) => (e.scale.y = ease(e.scale.y, lid, dt * 30)));
      antTip.visible = true;
      (antTip.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2 + Math.sin(t * 3) * 0.8;
      // moving forward is the caller's job; we only animate limbs
      void talk;
    },
    dispose() { root.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); }); },
  };
}
