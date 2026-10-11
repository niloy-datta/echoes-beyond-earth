"use client";

import { useEffect, useState } from "react";
import { assetPath } from "@/lib/asset-path";
import { useT } from "@/lib/i18n";

export function EkoOfflineSupport() {
  const { lang } = useT();
  const bn = lang === "bn";
  const [state, setState] = useState<"unknown" | "installing" | "ready" | "unsupported">("unknown");
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) {
      setState("unsupported");
      return;
    }
    let active = true;
    setState("installing");
    navigator.serviceWorker.register(assetPath("/eko-sw.js"), { scope: assetPath("/") })
      .then(() => navigator.serviceWorker.ready)
      .then(async () => {
        // Registration alone does not mean the offline learning page is cached.
        // Only show "ready" if the service worker really saved the entry HTML.
        const cached = await caches.match(assetPath("/play/"));
        if (active) setState(cached ? "ready" : "unsupported");
      })
      .catch(() => { if (active) setState("unsupported"); });
    return () => { active = false; };
  }, []);
  if (state === "unknown" || state === "unsupported") return null;
  return (
    <div className="mt-5 flex items-start gap-3 border border-hairline p-4 text-xs leading-relaxed text-lunar-2" role="status">
      <span aria-hidden="true" className={state === "ready" ? "text-signal" : "text-dust"}>✦</span>
      <span>
        {state === "ready"
          ? bn
            ? "অফলাইন মিশন পেজ সংরক্ষিত। আগে দেখা অ্যাসেট আবার খোলা যেতে পারে; NASA-র আসল 3D viewer-এর decoder-এর জন্য ইন্টারনেট লাগতে পারে।"
            : "Offline mission page cached. Previously loaded game assets may work without a connection; the optional authentic NASA model viewer still needs internet for its decoder."
          : bn ? "অফলাইন প্রস্তুতি চলছে…" : "Preparing offline experience…"}
      </span>
    </div>
  );
}
