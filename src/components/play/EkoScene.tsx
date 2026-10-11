"use client";

import { useEffect, useRef } from "react";
import { EKO_STOPS, type EkoStopId } from "@/lib/eko-mission";

type Vec3 = [number, number, number];
type Mesh = { vertices: Float32Array; count: number; buffer: WebGLBuffer };
type Player = { x: number; z: number };

export interface EkoSceneProps {
  player: Player;
  scanned: readonly EkoStopId[];
  reducedMotion: boolean;
  onUnsupported: () => void;
}

const normalize = ([x, y, z]: Vec3): Vec3 => {
  const len = Math.hypot(x, y, z) || 1;
  return [x / len, y / len, z / len];
};
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function perspective(aspect: number): Float32Array {
  const f = 1 / Math.tan((56 * Math.PI) / 360);
  const near = 0.1;
  const far = 95;
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ]);
}

function lookAt(eye: Vec3, target: Vec3): Float32Array {
  const z = normalize([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]]);
  const x = normalize(cross([0, 1, 0], z));
  const y = cross(z, x);
  return new Float32Array([
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -dot(x, eye), -dot(y, eye), -dot(z, eye), 1,
  ]);
}

function mul(a: Float32Array, b: Float32Array): Float32Array {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o;
}

function model(p: Vec3, s: Vec3, turn = 0): Float32Array {
  const c = Math.cos(turn), n = Math.sin(turn);
  return new Float32Array([
    c * s[0], 0, -n * s[0], 0,
    0, s[1], 0, 0,
    n * s[2], 0, c * s[2], 0,
    p[0], p[1], p[2], 1,
  ]);
}

function cube(): number[] {
  const faces: { n: Vec3; corners: Vec3[] }[] = [
    { n: [0, 0, 1], corners: [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]] },
    { n: [0, 0, -1], corners: [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]] },
    { n: [1, 0, 0], corners: [[0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5]] },
    { n: [-1, 0, 0], corners: [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5]] },
    { n: [0, 1, 0], corners: [[-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5]] },
    { n: [0, -1, 0], corners: [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]] },
  ];
  const vertices: number[] = [];
  for (const face of faces) {
    for (const i of [0, 1, 2, 0, 2, 3]) {
      vertices.push(...face.corners[i], ...face.n);
    }
  }
  return vertices;
}

function sphere(rows = 10, cols = 16): number[] {
  const vertices: number[] = [];
  const at = (v: number, u: number): Vec3 => {
    const a = v * Math.PI, b = u * Math.PI * 2;
    return [Math.sin(a) * Math.cos(b) * 0.5, Math.cos(a) * 0.5, Math.sin(a) * Math.sin(b) * 0.5];
  };
  const push = (p: Vec3) => vertices.push(...p, ...normalize(p));
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const a = at(y / rows, x / cols);
    const b = at((y + 1) / rows, x / cols);
    const c = at((y + 1) / rows, (x + 1) / cols);
    const d = at(y / rows, (x + 1) / cols);
    push(a); push(c); push(b); push(a); push(d); push(c);
  }
  return vertices;
}

function shader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const s = gl.createShader(type);
  if (!s) throw new Error("Cannot create shader");
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "Shader compile failed");
  return s;
}

function makeMesh(gl: WebGLRenderingContext, data: number[]): Mesh {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error("Could not create geometry");
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
  return { vertices: new Float32Array(data), count: data.length / 6, buffer };
}

/**
 * Small procedural WebGL scene, intentionally dependency-free. This is an
 * ARTISTIC reconstruction: no NASA geometry, coordinates or telemetry are
 * being represented by the rover or landscape.
 */
export function EkoScene({ player, scanned, reducedMotion, onUnsupported }: EkoSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef(player);
  const scanRef = useRef(scanned);
  const motionRef = useRef(reducedMotion);
  const yawRef = useRef(0);
  const pointerRef = useRef<{ x: number; id: number } | null>(null);

  playerRef.current = player;
  scanRef.current = scanned;
  motionRef.current = reducedMotion;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let raf = 0;
    let cleanupResources = () => {};
    const onContextLost = (event: Event) => {
      event.preventDefault();
      onUnsupported();
    };
    canvas.addEventListener("webglcontextlost", onContextLost);
    try {
      const gl = canvas.getContext("webgl", { antialias: true, alpha: false, powerPreference: "low-power" });
      if (!gl) { canvas.removeEventListener("webglcontextlost", onContextLost); onUnsupported(); return; }

      const vsh = shader(gl, gl.VERTEX_SHADER, `
        attribute vec3 aPosition;
        attribute vec3 aNormal;
        uniform mat4 uMVP;
        uniform mat4 uModel;
        varying vec3 vNormal;
        varying vec3 vWorld;
        void main() {
          vec4 world = uModel * vec4(aPosition, 1.0);
          vWorld = world.xyz;
          vNormal = normalize(mat3(uModel) * aNormal);
          gl_Position = uMVP * vec4(aPosition, 1.0);
        }
      `);
      const fsh = shader(gl, gl.FRAGMENT_SHADER, `
        precision mediump float;
        uniform vec3 uColor;
        uniform vec3 uEye;
        uniform float uGlow;
        varying vec3 vNormal;
        varying vec3 vWorld;
        void main() {
          float lambert = max(dot(normalize(vNormal), normalize(vec3(0.4, 0.85, 0.35))), 0.0);
          vec3 color = uColor * (0.30 + 0.70 * lambert) + uColor * uGlow * 0.32;
          float haze = clamp(distance(vWorld, uEye) / 32.0, 0.0, 0.60);
          color = mix(color, vec3(0.29, 0.12, 0.10), haze);
          gl_FragColor = vec4(color, 1.0);
        }
      `);
      const program = gl.createProgram();
      if (!program) throw new Error("Cannot create WebGL program");
      gl.attachShader(program, vsh);
      gl.attachShader(program, fsh);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "Shader link failed");
      gl.useProgram(program);
      const loc = {
        pos: gl.getAttribLocation(program, "aPosition"),
        normal: gl.getAttribLocation(program, "aNormal"),
        mvp: gl.getUniformLocation(program, "uMVP"),
        model: gl.getUniformLocation(program, "uModel"),
        color: gl.getUniformLocation(program, "uColor"),
        eye: gl.getUniformLocation(program, "uEye"),
        glow: gl.getUniformLocation(program, "uGlow"),
      };
      const box = makeMesh(gl, cube());
      const ball = makeMesh(gl, sphere());
      const meshes = [box, ball];
      const rocks = Array.from({ length: 38 }, (_, i) => {
        const a = i * 2.39996323;
        const radius = 4.2 + Math.sqrt(i / 38) * 19;
        return { x: Math.cos(a) * radius, z: Math.sin(a) * radius, size: 0.12 + (i % 7) * 0.065 };
      });
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);
      gl.clearColor(0.20, 0.095, 0.075, 1.0);
      cleanupResources = () => {
        for (const mesh of meshes) gl.deleteBuffer(mesh.buffer);
        gl.deleteShader(vsh); gl.deleteShader(fsh); gl.deleteProgram(program);
      };

      let pv: Float32Array = new Float32Array(16);
      let eye: Vec3 = [0, 0, 0];
      const draw = (mesh: Mesh, p: Vec3, s: Vec3, color: Vec3, glow = 0, turn = 0) => {
        const m = model(p, s, turn);
        gl.uniformMatrix4fv(loc.mvp, false, mul(pv, m));
        gl.uniformMatrix4fv(loc.model, false, m);
        gl.uniform3fv(loc.color, color);
        gl.uniform3fv(loc.eye, eye);
        gl.uniform1f(loc.glow, glow);
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
        gl.enableVertexAttribArray(loc.pos);
        gl.vertexAttribPointer(loc.pos, 3, gl.FLOAT, false, 24, 0);
        gl.enableVertexAttribArray(loc.normal);
        gl.vertexAttribPointer(loc.normal, 3, gl.FLOAT, false, 24, 12);
        gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
      };
      const ivory: Vec3 = [0.82, 0.87, 0.91];
      const midnight: Vec3 = [0.025, 0.065, 0.12];
      const cyan: Vec3 = [0.17, 0.94, 1.0];
      const metal: Vec3 = [0.65, 0.60, 0.54];
      const panel: Vec3 = [0.035, 0.16, 0.30];

      let lastFrame = -1000;
      const drawFrame = (time: number) => {
        // Save CPU/GPU cycles, especially on mobile and in reduced-motion mode.
        const frameGap = motionRef.current ? 100 : 33;
        if (document.hidden || time - lastFrame < frameGap) {
          raf = requestAnimationFrame(drawFrame);
          return;
        }
        lastFrame = time;
        const { x, z } = playerRef.current;
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
        const w = Math.max(1, Math.round(canvas.clientWidth * pixelRatio));
        const h = Math.max(1, Math.round(canvas.clientHeight * pixelRatio));
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        gl.viewport(0, 0, w, h);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        const yaw = yawRef.current;
        eye = [x + Math.sin(yaw) * 7, 4.1, z + Math.cos(yaw) * 7.7];
        pv = mul(perspective(w / h), lookAt(eye, [x, 0.65, z - 1.1]));

        // Illustrated surface, not geographically accurate Martian terrain.
        draw(box, [0, -0.54, -2], [90, 0.45, 90], [0.37, 0.19, 0.13]);
        for (const rock of rocks) {
          draw(ball, [rock.x, -0.20, rock.z - 2], [rock.size * 1.8, rock.size, rock.size * 1.2], [0.49, 0.25, 0.17]);
        }

        // Stylized Opportunity-inspired six-wheel rover. NASA GLB is not embedded.
        const rz = -1.65;
        draw(box, [0, 0.62, rz], [1.55, 0.36, 2.0], metal);
        draw(box, [0, 0.97, rz], [1.3, 0.12, 1.4], ivory);
        for (const xx of [-1.1, 1.1]) for (const zz of [-0.75, 0, 0.75]) {
          draw(ball, [xx, 0.11, rz + zz], [0.48, 0.58, 0.48], [0.09, 0.08, 0.08]);
          draw(box, [xx * 0.58, 0.3, rz + zz], [0.75, 0.09, 0.09], metal);
        }
        for (const xx of [-1.28, 1.28]) {
          draw(box, [xx, 1.12, rz], [1.88, 0.10, 2.46], panel);
          for (let i = -2; i <= 2; i++) draw(box, [xx + i * 0.36, 1.19, rz], [0.025, 0.014, 2.35], [0.18, 0.48, 0.62]);
          for (let i = -2; i <= 2; i++) draw(box, [xx, 1.19, rz + i * 0.43], [1.75, 0.014, 0.025], [0.18, 0.48, 0.62]);
        }
        draw(box, [0, 1.65, rz - 0.7], [0.13, 1.05, 0.13], metal);
        draw(box, [0, 2.22, rz - 0.70], [0.60, 0.32, 0.28], ivory);
        draw(ball, [-0.16, 2.22, rz - 0.87], [0.14, 0.14, 0.14], midnight);
        draw(ball, [0.16, 2.22, rz - 0.87], [0.14, 0.14, 0.14], midnight);

        // EKO: original low-poly companion, with glowing cyan eyes and core.
        const bob = motionRef.current ? 0 : Math.sin(time * 0.0018) * 0.04;
        draw(ball, [x, 0.78 + bob, z], [0.72, 0.83, 0.57], ivory);
        draw(ball, [x, 1.48 + bob, z], [0.94, 0.83, 0.77], ivory);
        draw(box, [x, 1.48 + bob, z - 0.355], [0.70, 0.33, 0.06], midnight);
        for (const dx of [-0.19, 0.19]) draw(ball, [x + dx, 1.50 + bob, z - 0.398], [0.20, 0.12, 0.06], cyan, 2.2);
        draw(ball, [x, 0.83 + bob, z - 0.30], [0.25, 0.25, 0.08], cyan, 2.0);
        draw(ball, [x - 0.48, 0.79 + bob, z], [0.24, 0.55, 0.27], ivory);
        draw(ball, [x + 0.48, 0.79 + bob, z], [0.24, 0.55, 0.27], ivory);
        draw(box, [x - 0.21, 0.20, z], [0.22, 0.40, 0.28], midnight);
        draw(box, [x + 0.21, 0.20, z], [0.22, 0.40, 0.28], midnight);
        draw(box, [x, 1.96 + bob, z], [0.06, 0.26, 0.06], ivory);
        draw(ball, [x + 0.12, 2.10 + bob, z], [0.28, 0.20, 0.12], cyan, 1.4);

        // Evidence beacons encode interaction positions only, not geographic data.
        EKO_STOPS.forEach((stop, i) => {
          const found = scanRef.current.includes(stop.id);
          const proximity = Math.hypot(x - stop.position.x, z - stop.position.z) < 2.1;
          const y = motionRef.current ? 0 : Math.sin(time * 0.002 + i) * 0.13;
          draw(ball, [stop.position.x, 0.45 + y, stop.position.z], [0.38, 0.38, 0.38], found ? [0.40, 0.84, 0.57] : cyan, proximity ? 3 : 1.0);
          draw(box, [stop.position.x, 0.13, stop.position.z], [0.05, 0.25, 0.05], found ? [0.40, 0.84, 0.57] : cyan, 1.0);
        });
        raf = requestAnimationFrame(drawFrame);
      };
      raf = requestAnimationFrame(drawFrame);
    } catch (error) {
      console.error("EKO WebGL unavailable; falling back to accessible story mode.", error);
      onUnsupported();
    }

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      cleanupResources();
    };
  }, [onUnsupported]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full cursor-grab touch-pan-y active:cursor-grabbing"
      aria-hidden="true"
      onPointerDown={(e) => {
        pointerRef.current = { x: e.clientX, id: e.pointerId };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (pointerRef.current?.id !== e.pointerId) return;
        const delta = e.clientX - pointerRef.current.x;
        if (!motionRef.current) yawRef.current = Math.max(-1.5, Math.min(1.5, yawRef.current - delta * 0.007));
        pointerRef.current.x = e.clientX;
      }}
      onPointerUp={() => { pointerRef.current = null; }}
      onPointerCancel={() => { pointerRef.current = null; }}
    />
  );
}
