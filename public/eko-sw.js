/* EKO offline-first educational assets. No cross-origin resources are cached.
   The authentic NASA model viewer loads a Draco decoder online on demand.
   This worker is constrained to its registration scope (works with Pages basePath). */
const VERSION = "eko-2026-10-15-v1";
const MAX_FILES = 110;
const BASE = self.registration.scope;
const OFFLINE_PAGE = new URL("play/", BASE).href;

async function remember(cache, request, response) {
  if (!response || !response.ok || response.type === "opaque") return response;
  await cache.put(request, response.clone());
  const keys = await cache.keys();
  if (keys.length > MAX_FILES) {
    // Keep the EKO offline reading page even as other assets are used.
    const removable = keys.filter(key => key.url !== OFFLINE_PAGE);
    await Promise.all(removable.slice(0, keys.length - MAX_FILES).map(key => cache.delete(key)));
  }
  return response;
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    try {
      const response = await fetch(OFFLINE_PAGE, { cache: "reload" });
      if (!response.ok) throw new Error("Offline entry is unavailable");
      await cache.put(OFFLINE_PAGE, response.clone());
      const html = await response.text();
      // On the first page load, JS/CSS may have arrived before this worker.
      // Warm the exact same-origin app assets embedded in the exported HTML.
      const urls = new Set([
        new URL("models/opportunity-mer-b.glb", BASE).href,
        new URL("images/nasa/pia23178.jpg", BASE).href,
      ]);
      for (const [, relative] of html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)) {
        const candidate = new URL(relative, OFFLINE_PAGE);
        if (candidate.origin !== self.location.origin || !candidate.href.startsWith(BASE)) continue;
        if (/\.(?:js|css|woff2?)(?:\?|$)/i.test(candidate.pathname)) urls.add(candidate.href);
      }
      await Promise.allSettled([...urls].map(async url => {
        const asset = await fetch(url);
        if (asset.ok) await remember(cache, url, asset);
      }));
    } catch {
      // Offline install must never block the main museum.
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith("eko-") && name !== VERSION).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || !url.href.startsWith(BASE)) return;
  // Thousands of globe tiles should not evict the compact EKO offline pack.
  if (url.pathname.includes("/tiles/")) return;
  // Only EKO routes have offline document fallbacks. Never replace the
  // unrelated museum's /archive or /explore pages with /play when offline.
  if (request.mode === "navigate") {
    const isEkoPage = url.pathname.startsWith(new URL("play/", BASE).pathname);
    if (!isEkoPage) return;
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      try {
        const response = await fetch(request);
        return remember(cache, request, response);
      } catch {
        // A cached worksheet remains available by its own URL; otherwise
        // return the offline EKO mission shell.
        return (await cache.match(request)) || (await cache.match(OFFLINE_PAGE)) || Response.error();
      }
    })());
    return;
  }
  if (!/\.(?:js|css|png|svg|jpg|jpeg|webp|woff2?|glb|json)(?:\?|$)/i.test(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const saved = await cache.match(request);
    if (saved) return saved;
    try {
      const response = await fetch(request);
      return remember(cache, request, response);
    } catch { return Response.error(); }
  })());
});
