"use client";

import { useEffect, useRef, useState } from "react";
import type * as ThreeTypes from "three";
import { assetPath } from "@/lib/asset-path";
import type { RoverDefinition } from "@/game/rovers/registry";

function SojournerReconstruction({ title }: { title: string }) {
  const [rotation, setRotation] = useState(-22);
  const start = useRef<{ x: number; rotation: number } | null>(null);
  return (
    <div className="rover-reconstruction" role="img" aria-label={title} onPointerDown={(event) => { start.current = { x: event.clientX, rotation }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (start.current) setRotation(start.current.rotation + (event.clientX - start.current.x) * 0.65); }} onPointerUp={() => { start.current = null; }}>
      <div className="rover-reconstruction__ground" /><div className="rover-reconstruction__model" style={{ transform: `translateX(-50%) rotateY(${rotation}deg)` }}>
        <div className="sojourner__deck"><i /><i /><i /><i /><span className="sojourner__mast"><b /><b /><b /></span><span className="sojourner__antenna" /></div><div className="sojourner__chassis" /><div className="sojourner__wheels"><i /><i /><i /><i /><i /><i /></div><div className="sojourner__arm" />
      </div><span className="rover-reconstruction__tag">ILLUSTRATIVE RECONSTRUCTION</span><span className="rover-reconstruction__drag">Drag to rotate · 3D geometry reconstructed from NASA descriptions</span>
    </div>
  );
}

type RoverModelProps = { rover: RoverDefinition; lang: "en" | "bn"; part?: string | null; compact?: boolean };

const PART_NAMES: Record<string, string[]> = {
  mobility: ["wheel", "rocker", "bogie", "mobility", "suspension"],
  vision: ["camera", "mastcam", "navcam", "pancam", "hazcam", "mast"],
  power: ["solar", "panel", "array", "battery"],
  science: ["spectrometer", "apxs", "chemcam", "sherloc", "pixl", "science"],
  arm: ["arm", "turret", "shoulder", "elbow", "wrist"],
  sampling: ["drill", "sample", "bit", "caching", "corer"],
};

export function RoverModel({ rover, lang, part = null, compact = false }: RoverModelProps) {
  const host = useRef<HTMLDivElement | null>(null);
  const focusPart = useRef<((id: string | null) => void) | null>(null);
  const selectedPart = useRef(part);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [focusMessage, setFocusMessage] = useState("");
  const [full, setFull] = useState(false);
  const bn = lang === "bn";

  useEffect(() => { selectedPart.current = part; focusPart.current?.(part); }, [part]);
  useEffect(() => {
    const update = () => setFull(Boolean(document.fullscreenElement && host.current?.parentElement?.contains(document.fullscreenElement)));
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  useEffect(() => {
    const modelPath = rover.model.path;
    if (!modelPath || !host.current) return;
    let disposed = false;
    let frame = 0;
    let cleanup: (() => void) | undefined;
    setStatus("loading");
    const mount = async () => {
      try {
        const [THREE, loaderModule, controlsModule, dracoModule] = await Promise.all([
          import("three"), import("three/examples/jsm/loaders/GLTFLoader.js"), import("three/examples/jsm/controls/OrbitControls.js"), import("three/examples/jsm/loaders/DRACOLoader.js"),
        ]);
        if (disposed || !host.current) return;
        const element = host.current;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(34, 1, 0.02, 120);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.22;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setClearColor(0x000000, 0);
        element.appendChild(renderer.domElement);
        renderer.domElement.setAttribute("aria-label", `${rover.name} interactive 3D rover model`);
        renderer.domElement.setAttribute("role", "img");

        scene.add(new THREE.HemisphereLight(0xe3eafa, 0x56372a, 2.0));
        scene.add(new THREE.AmbientLight(0xffffff, .85));
        const key = new THREE.DirectionalLight(0xffd4a4, 4.2);
        key.position.set(-4, 8, 5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0003; scene.add(key);
        const fill = new THREE.DirectionalLight(0x91b6d0, 1.15); fill.position.set(5, 3, -5); scene.add(fill);
        const rim = new THREE.DirectionalLight(0xf18b5f, 1.1); rim.position.set(1, 5, -6); scene.add(rim);

        const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 96), new THREE.MeshStandardMaterial({ color: 0x3d2924, roughness: 1, metalness: 0 }));
        ground.rotation.x = -Math.PI / 2; ground.position.y = -0.025; ground.receiveShadow = true; scene.add(ground);
        const loader = new loaderModule.GLTFLoader();
        const draco = new dracoModule.DRACOLoader();
        draco.setDecoderPath(assetPath("/vendor/draco/")); loader.setDRACOLoader(draco);
        const controls = new controlsModule.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true; controls.dampingFactor = 0.065; controls.enablePan = false; controls.autoRotate = true; controls.autoRotateSpeed = 0.42;
        controls.minDistance = 1.3; controls.maxDistance = 11; controls.minPolarAngle = 0.25; controls.maxPolarAngle = Math.PI * 0.48;

        const resize = () => {
          if (!host.current) return;
          const width = Math.max(1, host.current.clientWidth), height = Math.max(1, host.current.clientHeight);
          camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false);
        };
        const observer = new ResizeObserver(resize); observer.observe(element); resize();
        const tick = () => { if (disposed) return; frame = requestAnimationFrame(tick); controls.update(); renderer.render(scene, camera); };
        frame = requestAnimationFrame(tick);
        loader.load(assetPath(modelPath), (gltf) => {
          if (disposed) { gltf.scene.traverse((node) => { if ((node as ThreeTypes.Mesh).isMesh) { const mesh = node as ThreeTypes.Mesh; mesh.geometry.dispose(); if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose()); else mesh.material.dispose(); } }); return; }
          const model = gltf.scene;
          if (rover.model.upAxis === "z") model.rotation.x = Math.PI / 2;
          const bounds = new THREE.Box3().setFromObject(model);
          const size = bounds.getSize(new THREE.Vector3());
          const center = bounds.getCenter(new THREE.Vector3());
          model.position.sub(center);
          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          model.scale.setScalar(3.05 / maxDim);
          model.position.y += (size.y * 0.5 / maxDim) * 3.05;
          model.traverse((node) => { const mesh = node as ThreeTypes.Mesh; if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; mesh.material = Array.isArray(mesh.material) ? mesh.material.map((material) => { const copy = material.clone(); if ("roughness" in copy && typeof copy.roughness === "number") copy.roughness = Math.max(.42, copy.roughness); if ("metalness" in copy && typeof copy.metalness === "number") copy.metalness = Math.min(.48, copy.metalness); return copy; }) : mesh.material.clone(); } });
          scene.add(model);
          const framedSize = Math.max(size.x, size.y, size.z) * 3.05 / maxDim;
          controls.target.set(0, framedSize * .32, 0);
          camera.position.set(framedSize * 1.15, framedSize * .82, framedSize * 1.55);
          camera.near = Math.max(.01, framedSize / 100); camera.far = framedSize * 30; camera.updateProjectionMatrix();
          controls.minDistance = framedSize * .62; controls.maxDistance = framedSize * 4.2;
          const homePosition = camera.position.clone();
          const homeTarget = controls.target.clone();
          const focus = (id: string | null) => {
            if (!id) {
              camera.position.copy(homePosition); controls.target.copy(homeTarget); controls.autoRotate = true;
              setFocusMessage(""); return;
            }
            controls.autoRotate = false;
            const words = PART_NAMES[id] ?? [id];
            const matches: ThreeTypes.Object3D[] = [];
            model.traverse((node) => { if (node !== model && words.some((word) => node.name.toLowerCase().includes(word))) matches.push(node); });
            const candidates = matches.filter((node) => !matches.some((other) => other !== node && node.parent === other));
            if (!candidates.length) {
              camera.position.copy(homePosition); controls.target.copy(homeTarget);
              setFocusMessage(bn ? "এই NASA মডেলে যন্ত্রাংশগুলো আলাদা জ্যামিতি হিসেবে নেই; ক্যামেরার লক্ষ্য তাই বদলানো হয়নি।" : "This NASA model does not expose separate geometry for that component, so the camera stays on the full rover.");
              return;
            }
            const bounds = new THREE.Box3(); candidates.forEach((node) => bounds.union(new THREE.Box3().setFromObject(node)));
            const center = bounds.getCenter(new THREE.Vector3());
            const extent = bounds.getSize(new THREE.Vector3());
            const radius = Math.max(extent.x, extent.y, extent.z, framedSize * .18);
            const direction = homePosition.clone().sub(homeTarget).normalize();
            controls.target.copy(center);
            camera.position.copy(center).addScaledVector(direction, Math.max(radius * 2.7, framedSize * .72));
            controls.minDistance = Math.max(framedSize * .16, radius * 1.2);
            controls.maxDistance = framedSize * 4.2;
            setFocusMessage("");
          };
          focusPart.current = focus;
          if (selectedPart.current) focus(selectedPart.current);
          setStatus("ready");
        }, undefined, () => { if (!disposed) setStatus("error"); });

        cleanup = () => {
          observer.disconnect(); cancelAnimationFrame(frame); controls.dispose(); draco.dispose(); renderer.dispose();
          scene.traverse((node) => { const mesh = node as ThreeTypes.Mesh; if (mesh.isMesh) { mesh.geometry.dispose(); if (Array.isArray(mesh.material)) mesh.material.forEach((material) => material.dispose()); else mesh.material.dispose(); } });
          renderer.domElement.remove();
        };
      } catch {
        if (!disposed) setStatus("error");
      }
    };
    void mount();
    return () => { disposed = true; focusPart.current = null; cleanup?.(); };
  }, [rover.id, rover.model.path, rover.model.upAxis, rover.name]);

  if (!rover.model.path) return <SojournerReconstruction title={bn ? "সোজার্নার রোভারের পুনর্নির্মাণ" : "Illustrative reconstruction of the Sojourner rover"} />;
  if (status === "error") return <div role="status" className="rover-model-error"><p>{bn ? "এই নেটওয়ার্কে 3D মডেল দেখা যাচ্ছে না। নিচে NASA-এর মূল মডেলের লিংক রয়েছে।" : "The interactive 3D model could not load. NASA's source and the rover facts remain available."}</p><a href={rover.model.source} target="_blank" rel="noreferrer">{rover.model.credit} ↗</a></div>;

  return <div className="rover-three" aria-label={bn ? `${rover.name} ইন্টার‌্যাক্টিভ 3D মডেল` : `Interactive 3D model of ${rover.name}`}>
    <div className="rover-three__canvas" ref={host} />
    {status === "loading" && <div className="rover-model-loading" role="status">{bn ? "NASA 3D মডেল লোড হচ্ছে…" : "Loading NASA 3D model…"}</div>}
    <div className={`rover-three__controls ${compact ? "is-compact" : ""}`}>
      <button type="button" onClick={() => focusPart.current?.(null)} aria-label={bn ? "ক্যামেরা রিসেট" : "Reset camera"}>↺ <span>{bn ? "রিসেট" : "RESET"}</span></button>
      <button type="button" onClick={async () => { const target = host.current?.parentElement; if (!target) return; try { if (document.fullscreenElement) await document.exitFullscreen(); else await target.requestFullscreen(); } catch { setFocusMessage(bn ? "এই ব্রাউজারে পূর্ণপর্দা চালু করা যায়নি।" : "Fullscreen is unavailable in this browser."); } }} aria-label={full ? (bn ? "পূর্ণপর্দা বন্ধ" : "Exit fullscreen") : (bn ? "পূর্ণপর্দা" : "Enter fullscreen")}>{full ? "⤢" : "⛶"}<span>{full ? (bn ? "বন্ধ" : "EXIT") : (bn ? "পূর্ণপর্দা" : "FULLSCREEN")}</span></button>
    </div>
    {focusMessage && <p className="rover-three__notice" role="status">{focusMessage}</p>}
    <div className="rover-three__ground-glow" aria-hidden="true" />
  </div>;
}
