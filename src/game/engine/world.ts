/**
 * Environment construction for the 3D renderer: sky dome, terrain, rim
 * mountains, instanced rocks, drifting dust and rover tracks. Everything is
 * procedural (no texture downloads) and sized by the active quality profile.
 * The landscape is ARTISTIC; it is not Martian survey data.
 */
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { fbm, seeded, smoothstep } from "../core/math";
import { heightAt, type Rock } from "../core/terrain";
import { WORLD_RADIUS } from "../content/world";

export const SUN_DIR = new THREE.Vector3(-0.55, 0.52, -0.42).normalize();

// ── Atmosphere & grade (global shader chunks) ────────────────────────────────
let atmosphereInstalled = false;
/**
 * Replaces three's exp² fog with Martian aerial perspective: dust haze that
 * thins with altitude (hilltops stay crisper than their bases) and brightens
 * toward the sun by forward scattering. Also installs a subtle filmic grade
 * (ACES + gentle desaturation, warm highlights, dust-brown shadows) used
 * through THREE.CustomToneMapping. Idempotent.
 */
export function installAtmosphere() {
  if (atmosphereInstalled) return;
  atmosphereInstalled = true;
  const C = THREE.ShaderChunk as unknown as Record<string, string>;
  const sun = `vec3(${SUN_DIR.x.toFixed(4)}, ${SUN_DIR.y.toFixed(4)}, ${SUN_DIR.z.toFixed(4)})`;
  C.fog_pars_vertex = "#ifdef USE_FOG\n varying float vFogDepth;\n varying vec3 vFogRel;\n#endif";
  // World-space offset from the camera (transpose of the view rotation).
  C.fog_vertex = "#ifdef USE_FOG\n vFogDepth = - mvPosition.z;\n vFogRel = (vec4(mvPosition.xyz, 0.0) * viewMatrix).xyz;\n#endif";
  C.fog_pars_fragment = C.fog_pars_fragment.replace("varying float vFogDepth;", "varying float vFogDepth;\n varying vec3 vFogRel;");
  C.fog_fragment = /* glsl */ `
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogDist = length(vFogRel);
    vec3 fogDir = vFogRel / max(fogDist, 1e-4);
    // Exponential height falloff, evaluated at the ray's mid-height.
    float fogMid = cameraPosition.y + vFogRel.y * 0.5;
    float fogHk = clamp(exp(-max(fogMid + 2.0, 0.0) * 0.022), 0.35, 1.0);
    float fogFactor = 1.0 - exp(-fogDensity * fogDensity * fogDist * fogDist * fogHk);
    // Forward scattering: brighter, warmer haze toward the sun; cooler away.
    float fogLum = dot(fogColor, vec3(0.3, 0.59, 0.11));
    float fogClear = smoothstep(0.3, 0.55, fogLum);
    float fogSun = max(dot(fogDir, ${sun}), 0.0);
    vec3 fogCol = fogColor * (1.0 + fogClear * (pow(fogSun, 6.0) * vec3(0.42, 0.36, 0.26) - (1.0 - fogSun) * 0.05));
  #else
    float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
    vec3 fogCol = fogColor;
  #endif
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogCol, fogFactor);
#endif
`;
  C.tonemapping_pars_fragment = C.tonemapping_pars_fragment.replace(
    "vec3 CustomToneMapping( vec3 color ) { return color; }",
    /* glsl */ `vec3 CustomToneMapping( vec3 color ) {
      vec3 c = ACESFilmicToneMapping( color );
      float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
      c = mix( vec3( l ), c, 0.9 );
      // Split tone: dust-brown shadows, slightly warm highlights.
      c += ( 1.0 - smoothstep( 0.0, 0.45, l ) ) * vec3( 0.012, 0.006, 0.0 );
      c *= mix( vec3( 1.0 ), vec3( 1.02, 1.0, 0.97 ), smoothstep( 0.4, 1.0, l ) );
      return clamp( c, 0.0, 1.0 );
    }`,
  );
}

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
        vec3 zenith = vec3(0.47, 0.34, 0.26);
        vec3 horizon = vec3(0.80, 0.61, 0.46);
        vec3 col = mix(horizon, zenith, pow(max(h, 0.0), 0.55));
        float sd = max(dot(d, normalize(uSun)), 0.0);
        vec3 halo = vec3(0.62, 0.72, 0.86);
        col = mix(col, halo, pow(sd, 18.0) * 0.55 * (1.0 - uStorm));
        col += vec3(1.0, 0.95, 0.88) * pow(sd, 900.0) * 3.0 * (1.0 - uStorm);
        // Same forward-scatter brightening the fog uses, so terrain melts into the sky.
        float hz = 1.0 - smoothstep(0.0, 0.35, h);
        col *= 1.0 + hz * (1.0 - uStorm) * (pow(sd, 6.0) * vec3(0.42, 0.36, 0.26) - (1.0 - sd) * 0.05);
        // Storm: dense, dim, brown and nearly uniform.
        vec3 storm = mix(vec3(0.36, 0.22, 0.13), vec3(0.22, 0.13, 0.08), pow(max(h, 0.0), 0.7));
        storm += vec3(0.25, 0.15, 0.08) * pow(sd, 3.0) * 0.6;
        col = mix(col, storm, smoothstep(0.0, 1.0, uStorm));
        col = mix(col, horizon * (1.0 - uStorm * 0.6), smoothstep(0.02, -0.2, d.y));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 64, 32), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return { mesh, uniforms };
}

/** Fog/horizon colour for a storm level (kept in sync with the sky shader). */
export function horizonColor(storm: number, out: THREE.Color): THREE.Color {
  const clear = new THREE.Color(0.76, 0.58, 0.44);
  const dusty = new THREE.Color(0.33, 0.20, 0.12);
  return out.copy(clear).lerp(dusty, smoothstep(0, 1, storm));
}

// ── Image-based lighting ──────────────────────────────────────────────────────
/**
 * Pre-filtered environment map rendered from the sky dome plus a dim ground
 * hemisphere, so suits, visor and rover metals reflect the actual Mars sky.
 */
export function createEnvironment(renderer: THREE.WebGLRenderer, sky: THREE.Mesh): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const skyClone = new THREE.Mesh(sky.geometry, sky.material);
  skyClone.scale.setScalar(0.05);
  envScene.add(skyClone);
  const ground = new THREE.Mesh(
    new THREE.SphereGeometry(30, 32, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.30, 0.17, 0.10), side: THREE.BackSide, fog: false }),
  );
  envScene.add(ground);
  const target = pmrem.fromScene(envScene, 0.02, 0.1, 100);
  ground.geometry.dispose(); (ground.material as THREE.Material).dispose();
  pmrem.dispose();
  return target.texture;
}

// ── Terrain ───────────────────────────────────────────────────────────────────
function loadTexture(loader: THREE.TextureLoader, url: string, srgb: boolean, anisotropy: number) {
  const texture = loader.load(url);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = anisotropy;
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Height above `heightAt` for the unwalkable surroundings only: rolling outer
 * plains, then a distant eroded crater rim with terraced, layered benches.
 * Kept low and far so the horizon reads like an open plain seen by a rover.
 */
export function rimDetail(x: number, z: number): number {
  const r = Math.hypot(x, z);
  if (r < WORLD_RADIUS + 8) return 0;
  const plains = smoothstep(WORLD_RADIUS + 8, WORLD_RADIUS + 70, r) * (fbm(x * 0.011 - 5, z * 0.011 + 9, 3) - 0.42) * 8;
  const band = smoothstep(150, 250, r);
  if (band <= 0) return plains;
  const ridged = 1 - Math.abs(fbm(x * 0.0085 + 40, z * 0.0085 - 13, 5) * 2 - 1);
  const massif = fbm(x * 0.0042 + 3, z * 0.0042 - 7, 3);
  const raw = band * (ridged * ridged * 17 + Math.max(0, massif - 0.35) * 30);
  // Terraces: sedimentary benches with eroded risers.
  const step = 3.4, t = raw / step, f = t - Math.floor(t);
  const terraced = (Math.floor(t) + smoothstep(0.3, 0.7, f)) * step;
  return plains + terraced * 0.55 + raw * 0.45;
}

/**
 * Square terrain with vertices packed toward the centre (dense where the
 * explorer walks, sparse at the mountain rim) to keep the vertex count low.
 * Surface layers (regolith, wind-blown dust, layered outcrop, dark basaltic
 * sand) are blended per pixel from CC0 photo-scanned materials graded to
 * Mars albedo; vertex colour carries the layer weights.
 */
export function createTerrain(segments: number, extent = 440, assetBase = "", low = false) {
  const n = segments + 1;
  const positions = new Float32Array(n * n * 3);
  const splat = new Float32Array(n * n * 3);
  const uvs = new Float32Array(n * n * 2);
  const warp = (u: number) => Math.sign(u) * Math.pow(Math.abs(u), 1.55) * extent;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = warp((i / segments) * 2 - 1);
    const z = warp((j / segments) * 2 - 1);
    const y = heightAt(x, z) + rimDetail(x, z);
    const k = j * n + i;
    positions[k * 3] = x; positions[k * 3 + 1] = y; positions[k * 3 + 2] = z;
    // World-space metres; the shader picks per-layer scales.
    uvs[k * 2] = x; uvs[k * 2 + 1] = z;
    const e = 0.8;
    const sx = (heightAt(x + e, z) + rimDetail(x + e, z) - heightAt(x - e, z) - rimDetail(x - e, z)) / (2 * e);
    const sz = (heightAt(x, z + e) + rimDetail(x, z + e) - heightAt(x, z - e) - rimDetail(x, z - e)) / (2 * e);
    const slope = Math.hypot(sx, sz);
    const patches = fbm(x * 0.035 + 11, z * 0.035 - 4, 3);
    const grit = fbm(x * 0.11 - 7, z * 0.11 + 3, 2);
    const sheets = fbm(x * 0.02 - 7, z * 0.02 + 3, 3);
    const lowland = smoothstep(1.2, -2.8, y);
    const rock = smoothstep(0.3, 0.6, slope);
    // Flat, fractured bedrock pavement poking through the sand (Meridiani-style outcrop).
    const pavement = smoothstep(0.6, 0.7, fbm(x * 0.045 + 31, z * 0.045 - 17, 4)) * (1 - smoothstep(0.12, 0.3, slope));
    const outcrop = Math.max(rock, pavement * 0.9);
    splat[k * 3] = Math.min(1, smoothstep(0.52, 0.8, patches) * 0.8 + lowland * 0.4) * (1 - outcrop);       // dust
    splat[k * 3 + 1] = outcrop;                                                                            // outcrop
    splat[k * 3 + 2] = Math.min(1, smoothstep(0.58, 0.8, grit) * 0.5 + smoothstep(0.5, 0.72, sheets) * 0.45) * (1 - outcrop); // basalt sand
  }
  const index: number[] = [];
  for (let j = 0; j < segments; j++) for (let i = 0; i < segments; i++) {
    const a = j * n + i, b = a + 1, d = a + n, e = d + 1;
    index.push(a, d, b, b, d, e);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("splat", new THREE.BufferAttribute(splat, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();

  const loader = new THREE.TextureLoader();
  const tex = (name: string, srgb: boolean) => loadTexture(loader, `${assetBase}/textures/game/${name}.webp`, srgb, low ? 4 : 8);
  const map = tex("mars-regolith-base", true);
  const normalMap = tex("mars-regolith-normal", false);
  const roughnessMap = tex("mars-regolith-orm", false);
  const uniforms = {
    tDust: { value: tex("mars-dust-base", true) },
    tOutcrop: { value: tex("mars-outcrop-base", true) },
    tOutcropN: { value: tex("mars-outcrop-normal", false) },
    tBasalt: { value: tex("mars-basalt-base", true) },
  };
  const material = new THREE.MeshStandardMaterial({ map, normalMap, roughnessMap, roughness: 1, metalness: 0, normalScale: new THREE.Vector2(0.9, 0.9), envMapIntensity: 0.35 });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    if (low) shader.defines = { ...shader.defines, TERRAIN_LOW: "" };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec3 splat;\nvarying vec3 vSplat;\nvarying float vViewDist;\nvarying vec3 vWorldPos;\nvarying vec3 vWorldNrm;")
      .replace("#include <fog_vertex>", "#include <fog_vertex>\nvSplat = splat;\nvViewDist = -mvPosition.z;\nvWorldPos = position;\nvWorldNrm = normal;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", /* glsl */ `#include <common>
        uniform sampler2D tDust; uniform sampler2D tOutcrop; uniform sampler2D tOutcropN; uniform sampler2D tBasalt;
        varying vec3 vSplat; varying float vViewDist; varying vec3 vWorldPos; varying vec3 vWorldNrm;
        // Triplanar sampling for cliffs so steep faces are not stretched.
        vec4 tTriplanar(sampler2D t, vec3 p, vec3 n, float scale) {
          vec3 b = pow(abs(normalize(n)), vec3(4.0)); b /= (b.x + b.y + b.z);
          return texture2D(t, p.zy / scale) * b.x + texture2D(t, p.xz / scale) * b.y + texture2D(t, p.xy / scale) * b.z;
        }
        // Seam-free macro variation (hash value noise shows cell seams on some GPUs).
        float tNoise(vec2 p) {
          float a = sin(p.x * 1.7 + sin(p.y * 1.3) * 1.9) + sin(p.y * 1.9 + sin(p.x * 1.1) * 2.3);
          return 0.5 + 0.25 * a;
        }
        // Aeolian ripple height in [0,1]; asymmetric profile, slowly bending crests.
        float tRipple(vec2 p) {
          float bend = tNoise(p * 0.09) * 5.0 + tNoise(p * 0.31 + 4.0) * 1.3;
          float ph = dot(p, vec2(0.8, 0.6)) * 3.7 + bend;
          return 0.5 + 0.5 * sin(ph + 0.45 * sin(ph));
        }
        // Two rotated scales blended by macro noise hide texture repetition.
        vec4 tSample(sampler2D t, vec2 uv, float n) {
          vec4 a = texture2D(t, uv);
          #ifdef TERRAIN_LOW
            return a;
          #else
            vec2 uv2 = mat2(0.8, -0.6, 0.6, 0.8) * uv * 0.37 + vec2(0.31, 0.17);
            return mix(a, texture2D(t, uv2), smoothstep(0.3, 0.7, n) * 0.6);
          #endif
        }
`)
      .replace("#include <map_fragment>", /* glsl */ `
        vec2 wp = vMapUv;
        float macro = tNoise(wp * 0.045) * 0.65 + tNoise(wp * 0.17) * 0.35;
        vec4 cReg = tSample(map, wp / 3.2, macro);
        vec4 cDust = tSample(tDust, wp / 5.5, 1.0 - macro);
        vec4 cOut = tTriplanar(tOutcrop, vWorldPos, vWorldNrm, 6.0);
        vec4 cBas = tSample(tBasalt, wp / 2.6, macro);
        // Outcrop reads as pale, dust-coated sandstone, not dark rock.
        cOut.rgb = mix(vec3(dot(cOut.rgb, vec3(0.333))), cOut.rgb, 0.75) * vec3(1.2, 1.12, 1.04);
        // Height-aware blending: brighter grains poke through the dust first.
        // Clamp: MSAA edge samples extrapolate varyings, and pow() of a negative weight is NaN.
        vec3 sp = clamp(vSplat, 0.0, 1.0);
        vec4 w = vec4(max(0.0, 1.0 - sp.x - sp.y - sp.z), sp);
        w *= vec4(0.6 + dot(cReg.rgb, vec3(0.6)), 0.8, 0.5 + dot(cOut.rgb, vec3(0.9)), 0.7 + (1.0 - dot(cBas.rgb, vec3(0.5))));
        w = pow(max(w, vec4(0.0)), vec4(2.2)); w /= max(dot(w, vec4(1.0)), 1e-4);
        // Steep faces: triplanar outcrop only (planar layers would stretch).
        float steep = smoothstep(0.86, 0.62, normalize(vWorldNrm).y);
        w = mix(w, vec4(0.0, 0.0, 1.0, 0.0), steep);
        vec3 albedo = cReg.rgb * w.x + cDust.rgb * w.y + cOut.rgb * w.z + cBas.rgb * w.w;
        // Wind ripples: ~1.7 m wavelength, skewed crests, bent by noise.
        float rippleFade = 1.0 - smoothstep(40.0, 110.0, vViewDist);
        float rippleMask = smoothstep(0.46, 0.74, tNoise(wp * 0.021 + 2.0)) * smoothstep(0.25, 0.6, tNoise(wp * 0.083 - 3.0)) * (1.0 - w.z) * (1.0 - steep) * (1.0 - w.y * 0.5);
        vec2 rgrad = vec2(0.0);
        #ifndef TERRAIN_LOW
        if (rippleMask * rippleFade > 0.01) {
          float rh = tRipple(wp);
          rgrad = vec2(tRipple(wp + vec2(0.06, 0.0)) - rh, tRipple(wp + vec2(0.0, 0.06)) - rh) / 0.06;
          rgrad *= 0.04 * rippleMask * rippleFade;
          // Crests: coarse dark basaltic grains; troughs: bright fine dust.
          float crest = smoothstep(0.55, 0.95, rh), trough = smoothstep(0.45, 0.05, rh);
          albedo = mix(albedo, albedo * vec3(0.84, 0.83, 0.85), crest * rippleMask * rippleFade * 0.5);
          albedo = mix(albedo, cDust.rgb * 1.04, trough * rippleMask * rippleFade * 0.2);
        }
        #endif
        // Layered strata on steep faces and the distant rim.
        float strata = 0.5 + 0.5 * sin(vWorldPos.y * 2.3 + tNoise(wp * 0.05) * 3.0);
        albedo *= mix(1.0, 0.84 + 0.26 * strata, clamp(steep * 0.85 + w.z * 0.25, 0.0, 1.0));
        // Distance: blend toward the textures' mean colour so tiling never shows.
        float farK = smoothstep(55.0, 240.0, vViewDist);
        vec3 avgCol = texture2D(map, wp / 3.2, 9.0).rgb * w.x + texture2D(tDust, wp / 5.5, 9.0).rgb * w.y + cOut.rgb * w.z + texture2D(tBasalt, wp / 2.6, 9.0).rgb * w.w;
        albedo = mix(albedo, avgCol * (0.88 + 0.24 * tNoise(wp * 0.03 + 5.0)), farK * 0.7);
        // Regional albedo: darker sand sheets vs. bright dust mantles, kept subtle.
        float region = tNoise(wp * 0.0065 + 11.0);
        albedo *= mix(vec3(0.84, 0.84, 0.87), vec3(1.06, 1.02, 0.97), region);
        float tone = tNoise(wp * 0.012 + 3.0);
        albedo *= mix(vec3(0.94, 0.94, 0.95), vec3(1.04, 1.02, 0.99), tone);
        // Desaturate toward NASA true-colour panoramas (butterscotch, not orange).
        albedo = mix(vec3(dot(albedo, vec3(0.299, 0.587, 0.114))), albedo, 0.72);
        diffuseColor.rgb *= albedo;`)
      .replace("#include <roughnessmap_fragment>", /* glsl */ `
        float roughnessFactor = roughness;
        vec4 texelRoughness = texture2D(roughnessMap, vRoughnessMapUv / 3.2);
        roughnessFactor *= clamp(texelRoughness.g * w.x + 0.97 * w.y + 0.9 * w.z + 0.86 * w.w, 0.82, 1.0);
        float terrainAO = mix(1.0, texelRoughness.r, w.x * 0.8);`)
      .replace("#include <normal_fragment_maps>", /* glsl */ `
        vec3 nReg = texture2D(normalMap, vNormalMapUv / 3.2).xyz * 2.0 - 1.0;
        vec3 nOut = texture2D(tOutcropN, vNormalMapUv / 7.0).xyz * 2.0 - 1.0;
        vec3 mapN = normalize(mix(nReg, nOut, w.z));
        // Dust smooths the surface; detail fades with distance to avoid shimmer.
        mapN.xy *= normalScale * (1.0 - w.y * 0.55) * (1.0 - steep) * mix(1.0, 0.35, smoothstep(25.0, 140.0, vViewDist));
        // Analytic tangent frame (uv = world xz). Derivative-based frames break
        // along triangle edges under MSAA and show up as dashed lines.
        vec3 tT = normalize((viewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
        vec3 tB = normalize((viewMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz);
        tT = normalize(tT - normal * dot(normal, tT));
        tB = normalize(tB - normal * dot(normal, tB) - tT * dot(tT, tB));
        normal = normalize(mat3(tT, tB, normal) * mapN);
        normal = normalize(normal - tT * rgrad.x - tB * rgrad.y);`)
      .replace("#include <aomap_fragment>", "#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= terrainAO;");
  };
  material.customProgramCacheKey = () => (low ? "mars-terrain-low" : "mars-terrain");
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Distant stratified mesas beyond the crater rim: noise-eroded flanks with
 * horizontal sedimentary banding, merged into a single draw call.
 */
export function createMesas(assetBase = "") {
  const rand = seeded(91);
  const positions: number[] = [], colors: number[] = [], uvs: number[] = [], indices: number[] = [];
  const radial = 40, rings = 12;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + rand() * 0.25;
    const dist = 360 + rand() * 90;
    const height = 12 + rand() * 24;
    const r0 = 40 + rand() * 50;
    const cx = Math.cos(a) * dist, cz = Math.sin(a) * dist;
    const base = heightAt(cx, cz) + rimDetail(cx, cz) - 6;
    const seed = rand() * 100;
    const start = positions.length / 3;
    for (let ring = 0; ring <= rings; ring++) {
      const t = ring / rings;
      // Butte profile: wide talus apron, near-vertical cliff, flat caprock.
      const apron = 0.3;
      const profile = t < apron ? 1.45 - (t / apron) * 0.45 : 1 - (t - apron) * 0.14;
      const rise = t < apron ? Math.pow(t / apron, 1.6) * 0.32 : 0.32 + ((t - apron) / (1 - apron)) * 0.68;
      for (let s = 0; s <= radial; s++) {
        const ang = (s / radial) * Math.PI * 2;
        // Irregular plan outline plus gullies cut into the cliff band.
        const outline = 0.62 + fbm(Math.cos(ang) * 1.6 + seed, Math.sin(ang) * 1.6 - seed, 4) * 0.8;
        const gully = 1 - 0.16 * Math.pow(fbm(Math.cos(ang) * 6 + seed, Math.sin(ang) * 6 + t * 3, 2), 2) * (t > apron ? 1 : 0.3);
        const rr = r0 * profile * outline * gully;
        const y = base + rise * height + (t >= 1 ? (fbm(seed + Math.cos(ang), Math.sin(ang), 2) - 0.5) * 2 : 0);
        positions.push(cx + Math.cos(ang) * rr, y, cz + Math.sin(ang) * rr);
        uvs.push((ang * r0) / 9, y / 7);
        const band = 0.86 + Math.sin(y * 0.9 + seed) * 0.08 + fbm(y * 0.4, seed, 2) * 0.12;
        colors.push(band, band * 0.97, band * 0.95);
      }
    }
    for (let ring = 0; ring < rings; ring++) for (let s = 0; s < radial; s++) {
      const p = start + ring * (radial + 1) + s, q = p + radial + 1;
      indices.push(p, q, p + 1, p + 1, q, q + 1);
    }
    const top = positions.length / 3;
    positions.push(cx, base + height, cz); uvs.push(0, 0); colors.push(0.95, 0.93, 0.9);
    const lastRing = start + rings * (radial + 1);
    for (let s = 0; s < radial; s++) indices.push(lastRing + s, top, lastRing + s + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeTangents();
  const loader = new THREE.TextureLoader();
  const material = new THREE.MeshStandardMaterial({
    map: loadTexture(loader, `${assetBase}/textures/game/mars-outcrop-base.webp`, true, 4),
    normalMap: loadTexture(loader, `${assetBase}/textures/game/mars-outcrop-normal.webp`, false, 4),
    vertexColors: true, roughness: 0.95, metalness: 0, envMapIntensity: 0.3,
  });
  return new THREE.Mesh(geometry, material);
}

// ── Rocks ─────────────────────────────────────────────────────────────────────
/** Fractured, non-spherical rock: noise-displaced icosphere cut by planes. */
function fracturedRock(seed: number, detail: number): THREE.BufferGeometry {
  let geometry: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, detail);
  geometry.deleteAttribute("normal"); geometry.deleteAttribute("uv");
  geometry = mergeVertices(geometry);
  const rand = seeded(seed);
  const planes = Array.from({ length: 9 + Math.floor(rand() * 7) }, () => {
    const nrm = new THREE.Vector3(rand() * 2 - 1, rand() * 1.4 - 0.4, rand() * 2 - 1).normalize();
    return { nrm, d: 0.42 + rand() * 0.34 };
  });
  const keep = 0.93 + rand() * 0.07;
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const bump = (fbm(v.x * 1.6 + seed, v.y * 1.6 + v.z * 1.1, 3) - 0.5) * 0.45 + (fbm(v.x * 6 - seed, v.z * 6 + v.y * 4, 3) - 0.5) * 0.16;
    v.multiplyScalar(1 + bump);
    for (const p of planes) { const d = v.dot(p.nrm) - p.d; if (d > 0) v.addScaledVector(p.nrm, -d * keep); }
    // Roughen the cut faces so fractures read as weathered stone, not cut gems.
    v.multiplyScalar(1 + (fbm(v.x * 4.2 + seed, v.z * 4.2 - v.y * 3.1, 3) - 0.5) * 0.14);
    if (v.y < -0.36) v.y = -0.36 + (v.y + 0.36) * 0.15;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.computeVertexNormals();
  const nrm = geometry.attributes.normal as THREE.BufferAttribute;
  const uv = new Float32Array(pos.count * 2);
  const nv = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i); nv.fromBufferAttribute(nrm, i);
    const ax = Math.abs(nv.x), ay = Math.abs(nv.y), az = Math.abs(nv.z);
    const [a, b] = ay >= ax && ay >= az ? [v.x, v.z] : ax >= az ? [v.z, v.y] : [v.x, v.y];
    uv[i * 2] = a * 1.6; uv[i * 2 + 1] = b * 1.6;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geometry.computeTangents();
  return geometry;
}

export interface RockField { group: THREE.Group; setCount(n: number): void }

/**
 * Rock field in four instanced variants. Instances are sorted by size so a
 * lower `setCount` (quality presets) drops pebbles before boulders.
 */
function rockMaterial(assetBase: string) {
  const loader = new THREE.TextureLoader();
  const material = new THREE.MeshStandardMaterial({
    map: loadTexture(loader, `${assetBase}/textures/game/mars-boulder-base.webp`, true, 4),
    normalMap: loadTexture(loader, `${assetBase}/textures/game/mars-boulder-normal.webp`, false, 4),
    roughnessMap: loadTexture(loader, `${assetBase}/textures/game/mars-boulder-orm.webp`, false, 4),
    roughness: 1, metalness: 0, normalScale: new THREE.Vector2(1.25, 1.25), envMapIntensity: 0.4,
  });
  // Wind-blown dust settles on up-facing surfaces; flanks stay dark basalt.
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <map_fragment>", /* glsl */ `#include <map_fragment>
        diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114))), diffuseColor.rgb, 0.75) * vec3(1.02, 0.97, 0.93);`)
      .replace("#include <normal_fragment_maps>", /* glsl */ `#include <normal_fragment_maps>
        float rockUp = inverseTransformDirection(normal, viewMatrix).y;
        float dustCap = smoothstep(0.25, 0.8, rockUp) * (0.6 + 0.25 * sin(vMapUv.x * 9.0 + vMapUv.y * 7.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.34, 0.2, 0.115), clamp(dustCap, 0.0, 0.7));
        roughnessFactor = mix(roughnessFactor, 1.0, dustCap);`);
  };
  material.customProgramCacheKey = () => "mars-rock";
  return material;
}

/**
 * Rock field in six instanced variants. Instances are sorted by size so a
 * lower `setCount` (quality presets) drops pebbles before boulders.
 */
export function createRocks(rocks: readonly Rock[], visible: number, assetBase = "", detail = 3): RockField {
  const VARIANTS = 6;
  const material = rockMaterial(assetBase);
  const order = [...rocks].sort((a, b) => b.size - a.size);
  const group = new THREE.Group();
  const meshes = Array.from({ length: VARIANTS }, (_, v) => {
    const capacity = Math.ceil((order.length - v) / VARIANTS);
    const mesh = new THREE.InstancedMesh(fracturedRock(101 + v * 37, detail), material, Math.max(1, capacity));
    mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const e = new THREE.Euler(), color = new THREE.Color();
  order.forEach((r, i) => {
    const h = Math.sin(r.x * 12.9898 + r.z * 78.233) * 43758.5453;
    const rnd = h - Math.floor(h);
    e.set((rnd - 0.5) * 0.35, r.rotation, (rnd * 7 % 1 - 0.5) * 0.35);
    q.setFromEuler(e);
    // Taller, more angular than the collision footprint suggests: Mars clasts are rarely loaf-shaped.
    const tall = Math.min(0.95, r.squash * 1.1 + 0.1);
    s.set(r.size * (0.9 + rnd * 0.5), r.size * tall, r.size * (0.95 + (rnd * 3 % 1) * 0.3));
    // Seat each rock in the regolith (no floating rocks).
    p.set(r.x, heightAt(r.x, r.z) - r.size * tall * (0.22 + rnd * 0.15), r.z);
    m.compose(p, q, s);
    const mesh = meshes[i % VARIANTS];
    const slot = Math.floor(i / VARIANTS);
    mesh.setMatrixAt(slot, m);
    // Dark grey basalt to dust-coated tan.
    const shade = 0.68 + rnd * 0.42;
    color.setRGB(shade, shade * (0.93 + rnd * 0.05), shade * (0.88 + rnd * 0.08));
    mesh.setColorAt(slot, color);
  });
  const setCount = (n: number) => {
    const total = Math.min(n, order.length);
    meshes.forEach((mesh, v) => { mesh.count = Math.max(0, Math.ceil((total - v) / VARIANTS)); });
  };
  setCount(visible);
  return { group, setCount };
}

/**
 * Gravel and small clasts (3–18 cm) scattered in drifts across the plain:
 * visual only (no collision), no shadow casting, one draw call per variant.
 * Placement is clustered by noise so the ground shows lag-gravel patches
 * and clean sand rather than an even sprinkle.
 */
export function createPebbles(max: number, assetBase = "") {
  const VARIANTS = 3;
  const material = rockMaterial(assetBase);
  const rand = seeded(777);
  const group = new THREE.Group();
  const meshes = Array.from({ length: VARIANTS }, (_, v) => {
    const mesh = new THREE.InstancedMesh(fracturedRock(500 + v * 13, 1), material, Math.ceil(max / VARIANTS));
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    group.add(mesh);
    return mesh;
  });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  const e = new THREE.Euler(), color = new THREE.Color();
  let placed = 0, guard = 0;
  while (placed < max && guard++ < max * 12) {
    const ang = rand() * Math.PI * 2;
    const rad = Math.sqrt(rand()) * (WORLD_RADIUS + 30);
    const x = Math.cos(ang) * rad, z = Math.sin(ang) * rad;
    const cluster = fbm(x * 0.06 + 3, z * 0.06 - 8, 3);
    if (rand() > smoothstep(0.42, 0.68, cluster) * 0.9 + 0.08) continue;
    const size = 0.03 + Math.pow(rand(), 3) * 0.15;
    e.set(rand() * 0.6, rand() * Math.PI * 2, rand() * 0.6);
    q.setFromEuler(e);
    sc.set(size * (0.8 + rand() * 0.5), size * (0.45 + rand() * 0.4), size);
    p.set(x, heightAt(x, z) - size * 0.18, z);
    m.compose(p, q, sc);
    const mesh = meshes[placed % VARIANTS];
    const slot = Math.floor(placed / VARIANTS);
    mesh.setMatrixAt(slot, m);
    const shade = 0.55 + rand() * 0.45;
    color.setRGB(shade, shade * 0.95, shade * 0.92);
    mesh.setColorAt(slot, color);
    placed++;
  }
  const setCount = (n: number) => {
    const total = Math.min(n, placed);
    meshes.forEach((mesh, v) => { mesh.count = Math.max(0, Math.ceil((total - v) / VARIANTS)); });
  };
  setCount(max);
  return { group, setCount };
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
