"use client";

import { createElement, useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { assetPath } from "@/lib/asset-path";

// Pin the official <model-viewer> module. It loads Google's open-source Draco
// decoder only when this user-initiated authentic NASA GLB viewer is opened.
// The prototype's original procedural scene has no external script dependency.
const VIEWER_URL = "https://ajax.googleapis.com/ajax/libs/model-viewer/4.4.0/model-viewer.min.js";
const MODEL_LOCAL = "/models/opportunity-mer-b.glb";
const SOURCE = "https://science.nasa.gov/3d-resources/mars-exploration-rover-opportunity-mer-b/";
let loader: Promise<void> | null = null;

function ensureModelViewer(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Viewer requires a browser"));
  if (customElements.get("model-viewer")) return Promise.resolve();
  if (loader) return loader;
  loader = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = VIEWER_URL;
    script.crossOrigin = "anonymous";
    let finished = false;
    const complete = (error?: Error) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      if (error) {
        loader = null;
        script.remove();
        reject(error);
      } else resolve();
    };
    const timeout = window.setTimeout(
      () => complete(new Error("Viewer registration timed out")),
      25000,
    );
    // A loaded module is not necessarily an initialized custom element.
    script.onload = () => {
      customElements.whenDefined("model-viewer")
        .then(() => complete())
        .catch(() => complete(new Error("Viewer registration failed")));
    };
    script.onerror = () => complete(new Error("Viewer script unavailable (perhaps offline)"));
    document.head.append(script);
  });
  return loader;
}

export function EkoAuthenticRover() {
  const { lang } = useT();
  const bn = lang === "bn";
  const [status, setStatus] = useState<"closed" | "loading" | "ready" | "error">("closed");
  const [modelFailed, setModelFailed] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const modelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (status !== "loading") return;
    let valid = true;
    ensureModelViewer().then(() => { if (valid) setStatus("ready"); }).catch(() => { if (valid) setStatus("error"); });
    return () => { valid = false; };
  }, [status]);

  useEffect(() => {
    if (status !== "ready" || modelFailed) return;
    const model = modelRef.current;
    if (!model) return;
    const loaded = () => setModelReady(true);
    const failed = () => {
      setModelReady(false);
      setModelFailed(true);
    };
    model.addEventListener("load", loaded);
    model.addEventListener("error", failed);
    // Draco decoder downloads may hang on restricted or offline connections.
    const timeout = window.setTimeout(failed, 35000);
    const settle = () => window.clearTimeout(timeout);
    model.addEventListener("load", settle);
    model.addEventListener("error", settle);
    return () => {
      window.clearTimeout(timeout);
      model.removeEventListener("load", loaded);
      model.removeEventListener("error", failed);
      model.removeEventListener("load", settle);
      model.removeEventListener("error", settle);
    };
  }, [status, modelFailed]);

  const open = () => { setModelReady(false); setModelFailed(false); setStatus("loading"); };
  return (
    <section aria-labelledby="eko-rover-viewer" className="mt-10 border border-hairline-strong bg-void-2 p-5 md:p-7">
      <p className="label text-signal">{bn ? "NASA-র 3D মডেল" : "AUTHENTIC NASA 3D ASSET"}</p>
      <h2 id="eko-rover-viewer" className="mt-2 font-serif text-3xl italic">{bn ? "আসল Opportunity দেখো" : "Meet the actual Opportunity model"}</h2>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-lunar-2">
        {bn
          ? "এই মডেলটি NASA/Ames Research Center-এর প্রকাশিত আসল 3D resource; উপরের game-এর সহজ রোভারটি আলাদা, কল্পনানির্ভর। মডেলটি এই সাইটেই সংরক্ষিত। Draco decoder-এর জন্য internet লাগতে পারে।"
          : "This is the original 3D model published by NASA/Ames Research Center, different from the game's simple illustrative rover. The GLB is hosted locally. Its Draco decoder may require an internet connection."}
      </p>
      {status === "closed" && (
        <button type="button" className="btn-signal mt-6" onClick={open}>
          {bn ? "আসল 3D মডেল খুলে দেখো" : "Explore the authentic 3D rover"} ↗
        </button>
      )}
      {status === "loading" && <p role="status" className="mt-7 text-sm text-lunar-2">{bn ? "3D মডেল লোড হচ্ছে…" : "Loading 3D viewer…"}</p>}
      {status === "ready" && !modelFailed && (
        <div className="mt-6 overflow-hidden border border-hairline bg-[#131721]">
          {!modelReady && <p role="status" className="p-4 text-xs text-lunar-2">
            {bn ? "NASA 3D জ্যামিতি ও Draco decoder লোড হচ্ছে…" : "Loading NASA rover geometry and Draco decoder…"}
          </p>}
          {createElement("model-viewer", {
            ref: modelRef,
            src: assetPath(MODEL_LOCAL),
            alt: bn ? "NASA Ames এর আসল Opportunity rover 3D মডেল, ঘুরিয়ে দেখা যায়" : "NASA Ames authentic Mars Opportunity rover 3D model, rotatable",
            "camera-controls": true,
            "interaction-prompt": "auto",
            "shadow-intensity": "1",
            "exposure": "1.2",
            style: { display: "block", width: "100%", height: "min(60vw, 480px)", minHeight: 300, background: "#151923" },
            onError: () => setModelFailed(true),
          })}
          <p className="border-t border-hairline px-4 py-3 text-xs text-lunar-2">
            {bn ? "মাউস দিয়ে ঘোরাও; স্পর্শ করে ঘোরানো যায়।" : "Drag to rotate · Pinch or scroll to zoom"}
          </p>
        </div>
      )}
      {(status === "error" || modelFailed) && (
        <div role="alert" className="mt-5 border border-hairline p-4 text-sm text-lunar-2">
          {bn
            ? "এই browser-এ 3D viewer লোড হয়নি। NASA-র আসল model-এর উৎস নিচে দেয়া আছে।"
            : "The optional 3D viewer could not load in this browser or network. The NASA original remains available from its source page."}
          <button type="button" className="btn-ghost ml-3" onClick={() => { setModelReady(false); setModelFailed(false); setStatus("loading"); }}>
            {bn ? "আবার চেষ্টা" : "Retry"}
          </button>
        </div>
      )}
      <div className="mt-5 flex flex-wrap gap-5 text-xs">
        <a href={SOURCE} target="_blank" rel="noopener noreferrer" className="text-signal underline underline-offset-4">
          NASA/Ames Research Center — GLB source ↗
        </a>
        <a href={assetPath(MODEL_LOCAL)} download="nasa-opportunity-mer-b.glb" className="text-lunar-2 underline underline-offset-4">
          {bn ? "স্থানীয় GLB ফাইল" : "Download original GLB"}
        </a>
      </div>
      <p className="mt-4 text-xs text-dust">{bn ? "NASA-এর সমর্থন বা অনুমোদন দাবি করা হচ্ছে না।" : "NASA source attribution; no NASA endorsement implied."}</p>
    </section>
  );
}
