"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MLMap, Marker as MLMarker, StyleSpecification } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { stateInYear } from "@/lib/timeline";
import { assetPath } from "@/lib/asset-path";
import type { Body, MissionFeature } from "@/lib/types";

// Basemaps are NASA Trek mosaics, re-projected and tiled locally by scripts/build_tiles.py.
const ATTRIBUTION: Record<Body, string> = {
  moon: "NASA/GSFC/ASU · LRO WAC Global Mosaic via NASA Moon Trek",
  mars: "NASA/JPL-Caltech/USGS · Viking MDIM 2.1 via NASA Mars Trek",
};

function styleFor(body: Body): StyleSpecification {
  return {
    version: 8,
    projection: { type: "globe" },
    sources: {
      moon: { type: "raster", tiles: [assetPath("/tiles/moon/{z}/{x}/{y}.jpg")], tileSize: 256, maxzoom: 4, attribution: ATTRIBUTION.moon },
      mars: { type: "raster", tiles: [assetPath("/tiles/mars/{z}/{x}/{y}.jpg")], tileSize: 256, maxzoom: 4, attribution: ATTRIBUTION.mars },
    },
    layers: [
      { id: "space", type: "background", paint: { "background-color": "#030405" } },
      {
        id: "moon",
        type: "raster",
        source: "moon",
        layout: { visibility: body === "moon" ? "visible" : "none" },
        paint: { "raster-contrast": 0.08, "raster-fade-duration": 400 },
      },
      {
        id: "mars",
        type: "raster",
        source: "mars",
        layout: { visibility: body === "mars" ? "visible" : "none" },
        paint: { "raster-saturation": -0.12, "raster-fade-duration": 400 },
      },
    ],
    // The Moon has no atmosphere to draw; Mars gets a thin halo.
    sky: body === "moon" ? { "atmosphere-blend": 0 } : { "atmosphere-blend": 0.25 },
  };
}

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export type MapStatus = "loading" | "ready" | "unsupported" | "error";

export function PlanetMap({
  body,
  features,
  year,
  selectedId,
  onSelect,
  reducedMotion,
  onStatus,
}: {
  body: Body;
  features: MissionFeature[];
  year: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  reducedMotion: boolean;
  onStatus: (s: MapStatus) => void;
}) {
  const { t, l } = useT();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markers = useRef(new Map<string, { marker: MLMarker; el: HTMLButtonElement }>());
  const lib = useRef<typeof import("maplibre-gl") | null>(null);
  const [ready, setReady] = useState(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const initialBody = useRef(body);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    if (!webglAvailable()) {
      onStatus("unsupported");
      return;
    }
    onStatus("loading");
    (async () => {
      try {
        const ml = await import("maplibre-gl");
        if (cancelled || !container.current) return;
        ml.setWorkerUrl(new URL(assetPath("/vendor/maplibre/maplibre-gl-worker.mjs"), window.location.origin).href);
        lib.current = ml;
        const small = window.innerWidth < 768;
        const map = new ml.Map({
          container: container.current,
          style: styleFor(initialBody.current),
          center: [0, 8],
          zoom: small ? 0.95 : 1.75,
          minZoom: 0.3,
          maxZoom: 6.5,
          attributionControl: { compact: true },
          renderWorldCopies: false,
          canvasContextAttributes: { antialias: true },
        });
        map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
        map.on("load", () => {
          if (cancelled) return;
          setReady(true);
          onStatus("ready");
        });
        map.on("error", (e) => {
          // Tile hiccups are recoverable; only a failed style is fatal.
          if (!map.isStyleLoaded() && !cancelled) onStatus("error");
          console.warn("[explorer]", e.error?.message ?? e);
        });
        mapRef.current = map;
      } catch (err) {
        console.error(err);
        if (!cancelled) onStatus("error");
      }
    })();
    const markerMap = markers.current;
    return () => {
      cancelled = true;
      markerMap.forEach(({ marker }) => marker.remove());
      markerMap.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch worlds: swap visible layer + halo, rebuild markers, return to a whole-globe view.
  useEffect(() => {
    const map = mapRef.current;
    const ml = lib.current;
    if (!map || !ml || !ready) return;
    map.setLayoutProperty("moon", "visibility", body === "moon" ? "visible" : "none");
    map.setLayoutProperty("mars", "visibility", body === "mars" ? "visible" : "none");
    map.setSky(body === "moon" ? { "atmosphere-blend": 0 } : { "atmosphere-blend": 0.25 });

    markers.current.forEach(({ marker }) => marker.remove());
    markers.current.clear();
    for (const f of features) {
      if (!f.geometry) continue;
      const el = document.createElement("button");
      el.type = "button";
      el.className = "tls-marker";
      el.innerHTML = '<span class="tls-ring"></span><span class="tls-core"></span>';
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectRef.current(f.id);
      });
      const marker = new ml.Marker({ element: el, opacityWhenCovered: 0 }).setLngLat(f.geometry.coordinates).addTo(map);
      markers.current.set(f.id, { marker, el });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, features, ready]);

  // Time Machine + selection → marker state and accessible names.
  useEffect(() => {
    for (const f of features) {
      const m = markers.current.get(f.id);
      if (!m) continue;
      const state = stateInYear(f.properties, year);
      m.el.dataset.state = state;
      m.el.dataset.selected = String(f.id === selectedId);
      m.el.hidden = state === "future";
      m.el.tabIndex = state === "future" ? -1 : 0;
      const stateLabel =
        state === "transmitting" ? t("explore.legendActive", { year }) : state === "silent" ? t("explore.legendSilent", { year }) : t("common.status.silent");
      m.el.setAttribute("aria-label", `${l(f.properties.name)} — ${stateLabel}`);
      m.el.setAttribute("aria-pressed", String(f.id === selectedId));
    }
  }, [features, year, selectedId, ready, body, t, l]);

  // Fly to the selected machine.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !selectedId) return;
    const f = features.find((x) => x.id === selectedId);
    if (!f?.geometry) return;
    const small = window.innerWidth < 640;
    // Keep the machine visible beside (desktop) or above (mobile) the record card.
    const offset: [number, number] = small ? [0, -window.innerHeight * 0.24] : [Math.min(200, window.innerWidth * 0.12), 0];
    const target = { center: f.geometry.coordinates, zoom: Math.max(map.getZoom(), small ? 2.2 : 3), offset };
    if (reducedMotion) map.easeTo({ ...target, duration: 0 }); // jumpTo ignores offset
    else map.flyTo({ ...target, duration: 2400, curve: 1.6, essential: true });
  }, [selectedId, features, ready, reducedMotion]);

  return (
    // MapLibre forces position:relative on its container, so the sizing lives on a wrapper.
    <div className="absolute inset-0">
      <div
        ref={container}
        role="region"
        aria-label={t("explore.mapLabel", { body: t(`common.body.${body}` as const) })}
        className="h-full w-full"
      />
    </div>
  );
}
