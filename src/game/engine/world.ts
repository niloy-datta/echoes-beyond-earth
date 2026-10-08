/**
 * Environment construction for the 3D renderer: sky dome, terrain, rim
 * mountains, instanced rocks, drifting dust and rover tracks. Everything is
 * procedural (no texture downloads) and sized by the active quality profile.
 * The landscape is ARTISTIC; it is not Martian survey data.
 */
import * as THREE from "three";
import { fbm, seeded, smoothstep } from "../core/math";
import { heightAt, slopeAt, type Rock } from "../core/terrain";
import { WORLD_RADIUS } from "../content/world";

export const SUN_DIR = new THREE.Vector3(-0.55, 0.52, -0.42).normalize();

// ── Sky ───────────────────────────────────────────────────────────────────────
export function createSky() {
  const uniforms = {
    uSun: { value: SUN_DIR.clone() },
    uStorm: { value: 0 },
    uTime: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * p;
        gl_Position.z = gl_Position.w; // keep at the far plane
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSun; uniform float uStorm; uniform float uTime;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y, -0.2, 1.0);
        // Butterscotch daytime sky with a cool halo around the sun.
        vec3 zenith = vec3(0.50, 0.34, 0.24);
        vec3 horizon = vec3(0.86, 0.62, 0.44);
        vec3 col = mix(horizon, zenith, pow(max(h, 0.0), 0.55));
        float sd = max(dot(d, normalize(uSun)), 0.0);
        vec3 halo = vec3(0.62, 0.72, 0.86);
        col = mix(col, halo, pow(sd, 18.0) * 0.55 * (1.0 - uStorm));
        col += vec3(1.0, 0.95, 0.88) * pow(sd, 900.0) * 3.0 * (1.0 - uStorm);
        // Storm: dense, dim, brown and nearly uniform.
        vec3 storm = mix(vec3(0.36, 0.22, 0.13), vec3(0.22, 0.13, 0.08), pow(max(h, 0.0), 0.7));
        storm += vec3(0.25, 0.15, 0.08) * pow(sd, 3.0) * 0.6;
        col = mix(col, storm, smoothstep(0.0, 1.0, uStorm));
        col = mix(col, horizon * (1.0 - uStorm * 0.6), smoothstep(0.02, -0.2, d.y));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return { mesh, uniforms };
}

/** Fog/horizon colour for a storm level (kept in sync with the sky shader). */
export function horizonColor(storm: number, out: THREE.Color): THREE.Color {
  const clear = new THREE.Color(0.80, 0.56, 0.40);
  const dusty = new THREE.Color(0.33, 0.20, 0.12);
  return out.copy(clear).lerp(dusty, smoothstep(0, 1, storm));
}

// ── Terrain ───────────────────────────────────────────────────────────────────
function detailTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const rand = seeded(7);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const n = fbm(x * 0.06, y * 0.06, 3) * 0.6 + rand() * 0.4;
    const v = 170 + n * 85;
    const i = (y * size + x) * 4;
    img.data[i] = v; img.data[i + 1] = v * 0.97; img.data[i + 2] = v * 0.94; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Square terrain with vertices packed toward the centre (dense where the
 * explorer walks, sparse at the mountain rim) to keep the vertex count low.
 */
export function createTerrain(segments: number, extent = 300, assetBase = "") {
  const n = segments + 1;
  const positions = new Float32Array(n * n * 3);
  const colors = new Float32Array(n * n * 3);
  const uvs = new Float32Array(n * n * 2);
  const warp = (u: number) => Math.sign(u) * Math.pow(Math.abs(u), 1.55) * extent;
  const rust = new THREE.Color(0.56, 0.29, 0.17);
  const basalt = new THREE.Color(0.30, 0.17, 0.12);
  const dust = new THREE.Color(0.74, 0.47, 0.31);
  const c = new THREE.Color();
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = warp((i / segments) * 2 - 1);
    const z = warp((j / segments) * 2 - 1);
    const y = heightAt(x, z);
    const k = j * n + i;
    positions[k * 3] = x; positions[k * 3 + 1] = y; positions[k * 3 + 2] = z;
    uvs[k * 2] = x / 6; uvs[k * 2 + 1] = z / 6;
    const slope = Math.min(1, slopeAt(x, z) * 0.9);
    const patches = fbm(x * 0.035 + 11, z * 0.035 - 4, 3);
    c.copy(rust).lerp(dust, smoothstep(0.45, 0.75, patches) * 0.75);
    c.lerp(basalt, Math.max(slope * 0.85, smoothstep(0.62, 0.8, fbm(x * 0.09, z * 0.09, 2)) * 0.5));
    const lowland = smoothstep(1.5, -2.5, y) * 0.25;
    c.lerp(dust, lowland);
    colors[k * 3] = c.r; colors[k * 3 + 1] = c.g; colors[k * 3 + 2] = c.b;
  }
  const index: number[] = [];
  for (let j = 0; j < segments; j++) for (let i = 0; i < segments; i++) {
    const a = j * n + i, b = a + 1, d = a + n, e = d + 1;
    index.push(a, d, b, b, d, e);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  const loader = new THREE.TextureLoader();
  const map = loader.load(`${assetBase}/textures/game/regolith-base.webp`);
  const normalMap = loader.load(`${assetBase}/textures/game/regolith-normal.webp`);
  const orm = loader.load(`${assetBase}/textures/game/regolith-orm.webp`);
  for (const texture of [map, normalMap, orm]) { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(24, 24); texture.anisotropy = 8; }
  map.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, map, normalMap, roughnessMap: orm, roughness: 0.96, metalness: 0, normalScale: new THREE.Vector2(0.32, 0.32) });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

/** Distant mesas beyond the crater rim, purely for the skyline. */
export function createMesas() {
  const group = new THREE.Group();
  const rand = seeded(91);
  const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.42, 0.24, 0.16), roughness: 1, flatShading: true });
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + rand() * 0.2;
    const r = 330 + rand() * 160;
    const h = 22 + rand() * 60;
    const geo = new THREE.CylinderGeometry(18 + rand() * 30, 40 + rand() * 50, h, 7, 1);
    const m = new THREE.Mesh(geo, material);
    m.position.set(Math.cos(a) * r, h / 2 - 6 + heightAt(Math.cos(a) * 120, Math.sin(a) * 120) * 0.5, Math.sin(a) * r);
    m.rotation.y = rand() * Math.PI;
    group.add(m);
  }
  return group;
}

// ── Rocks ─────────────────────────────────────────────────────────────────────
export function createRocks(rocks: readonly Rock[], visible: number, assetBase = "") {
  const geometry = new THREE.IcosahedronGeometry(1, 1);
  // Deform the base rock so instances look less like spheres.
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = 0.72 + fbm(v.x * 1.7 + 3, v.z * 1.7 + v.y * 2.1, 2) * 0.55;
    v.multiplyScalar(k);
    if (v.y < 0) v.y *= 0.35;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.computeVertexNormals();
  const loader = new THREE.TextureLoader();
  const map = loader.load(`${assetBase}/textures/game/rock-base.webp`); map.colorSpace = THREE.SRGBColorSpace;
  const normalMap = loader.load(`${assetBase}/textures/game/rock-normal.webp`);
  const orm = loader.load(`${assetBase}/textures/game/rock-orm.webp`);
  for (const texture of [map, normalMap, orm]) { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(2.5, 2.5); texture.anisotropy = 4; }
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, map, normalMap, roughnessMap: orm, roughness: 0.92, flatShading: true, normalScale: new THREE.Vector2(0.45, 0.45) });
  const mesh = new THREE.InstancedMesh(geometry, material, rocks.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const color = new THREE.Color();
  // Draw big rocks first so lowering `count` drops pebbles, not boulders.
  const order = [...rocks].sort((a, b) => b.size - a.size);
  order.forEach((r, i) => {
    q.setFromEuler(new THREE.Euler(0, r.rotation, 0));
    s.set(r.size * 1.1, r.size * r.squash, r.size);
    p.set(r.x, heightAt(r.x, r.z) - r.size * 0.12, r.z);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
    const shade = 0.32 + (Math.abs(Math.sin(r.x * 12.9 + r.z * 78.2)) * 0.2);
    color.setRGB(shade * 1.25, shade * 0.72, shade * 0.52);
    mesh.setColorAt(i, color);
  });
  mesh.count = Math.min(visible, rocks.length);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// ── Dust particles ────────────────────────────────────────────────────────────
export function createDust(max: number) {
  const positions = new Float32Array(max * 3);
  const seeds = new Float32Array(max);
  const rand = seeded(3);
  for (let i = 0; i < max; i++) {
    positions[i * 3] = rand() * 70 - 35;
    positions[i * 3 + 1] = rand() * 14;
    positions[i * 3 + 2] = rand() * 70 - 35;
    seeds[i] = rand();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("seed", new THREE.BufferAttribute(seeds, 1));
  const uniforms = {
    uTime: { value: 0 }, uStorm: { value: 0 }, uCenter: { value: new THREE.Vector3() },
    uWind: { value: new THREE.Vector2(1.2, 0.5) }, uPixel: { value: 1 }, uColor: { value: new THREE.Color(0.85, 0.6, 0.42) },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    vertexShader: /* glsl */ `
      attribute float seed;
      uniform float uTime; uniform float uStorm; uniform vec3 uCenter; uniform vec2 uWind; uniform float uPixel;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        float speed = 0.6 + seed * 0.8 + uStorm * 5.0;
        p.x += uWind.x * uTime * speed;
        p.z += uWind.y * uTime * speed;
        p.y += sin(uTime * (0.4 + seed) + seed * 40.0) * (0.4 + uStorm);
        // Wrap the particle box around the camera.
        p.xz = mod(p.xz - uCenter.xz + 35.0, 70.0) - 35.0 + uCenter.xz;
        p.y = mod(p.y - uCenter.y + 4.0, 14.0) + uCenter.y - 4.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float size = (0.05 + seed * 0.08 + uStorm * 0.22);
        gl_PointSize = size * uPixel * 600.0 / -mv.z;
        float fade = smoothstep(34.0, 18.0, length(p.xz - uCenter.xz));
        vAlpha = fade * (0.22 + uStorm * 0.55) * (0.5 + seed * 0.5);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; varying float vAlpha;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float a = smoothstep(0.5, 0.0, length(c)) * vAlpha;
        if (a < 0.01) discard;
        gl_FragColor = vec4(uColor, a);
      }`,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return { points, uniforms, setCount: (n: number) => geometry.setDrawRange(0, Math.min(max, n)) };
}

// ── Rover tracks (environmental storytelling, artistic) ──────────────────────
export function createTracks() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-7, 0, 30), new THREE.Vector3(-1, 0, 24), new THREE.Vector3(5, 0, 18),
    new THREE.Vector3(9.5, 0, 11), new THREE.Vector3(13.5, 0, 5.5), new THREE.Vector3(16.6, 0, 1.6),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = 16; canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(40,18,10,0.55)"; ctx.fillRect(0, 0, 16, 64);
  ctx.fillStyle = "rgba(25,10,6,0.85)";
  for (let y = 0; y < 64; y += 8) ctx.fillRect(0, y, 16, 3);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const material = new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });
  const group = new THREE.Group();
  const samples = 120;
  const length = curve.getLength();
  for (const offset of [-0.62, 0.62]) {
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const p = curve.getPointAt(t);
      const tan = curve.getTangentAt(t);
      const nx = -tan.z, nz = tan.x;
      for (const side of [-0.14, 0.14]) {
        const x = p.x + nx * (offset + side), z = p.z + nz * (offset + side);
        pos.push(x, heightAt(x, z) + 0.035, z);
        uv.push(side < 0 ? 0 : 1, (t * length) / 0.6);
      }
      if (i < samples) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const strip = new THREE.Mesh(geo, material);
    strip.receiveShadow = true;
    group.add(strip);
  }
  return group;
}

export const BOUNDARY_RADIUS = WORLD_RADIUS;
