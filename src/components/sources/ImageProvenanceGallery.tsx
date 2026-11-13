"use client";

import { useState, useMemo } from "react";
import type { ImageSource } from "@/lib/types";
import { NasaImage } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { formatDate } from "@/lib/dates";

interface ImageProvenanceGalleryProps {
  images: Record<string, ImageSource>;
}

export function ImageProvenanceGallery({ images }: ImageProvenanceGalleryProps) {
  const { t, lang } = useT();
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [centerFilter, setCenterFilter] = useState<string>("all");

  const imageEntries = useMemo(() => Object.entries(images), [images]);

  const centers = useMemo(() => {
    const set = new Set<string>();
    imageEntries.forEach(([, img]) => {
      if (img.center) set.add(img.center);
    });
    return Array.from(set).sort();
  }, [imageEntries]);

  const filteredImages = useMemo(() => {
    return imageEntries.filter(([id, img]) => {
      if (centerFilter !== "all" && img.center !== centerFilter) return false;
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchesId = id.toLowerCase().includes(q);
        const matchesTitle = img.title.toLowerCase().includes(q);
        const matchesCredit = img.credit.toLowerCase().includes(q);
        if (!matchesId && !matchesTitle && !matchesCredit) return false;
      }
      return true;
    });
  }, [imageEntries, centerFilter, searchFilter]);

  const activeImage = selectedImageId ? images[selectedImageId] : null;

  return (
    <div className="space-y-8">
      {/* Intro section */}
      <div className="rounded-2xl border border-hairline bg-void-2/60 p-6 md:p-8 backdrop-blur-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="label text-signal">Visual Archive & Photographic Provenance</h3>
            <p className="mt-1 font-serif text-2xl italic text-lunar md:text-3xl">
              NASA public domain photographic registry ({imageEntries.length} plates)
            </p>
          </div>
          <div className="font-mono text-xs text-dust">
            NASA Media & Usage Guidelines Compliant
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-xs leading-relaxed text-dust sm:text-sm">
          {t("src.usage")} Every photograph was captured by authentic NASA missions (Apollo, Viking, Pathfinder, Spirit, Opportunity, Phoenix, InSight, Curiosity, Perseverance) and is catalogued with official JSC, JPL, or GSFC credit lines. Zero synthetic photographs are used.
        </p>

        {/* Toolbar */}
        <div className="mt-6 flex flex-col gap-3 border-t border-hairline/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <input
              type="search"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search images by mission, ID, or title..."
              className="w-full rounded-xl border border-hairline bg-void-3 px-4 py-2 text-xs text-lunar placeholder:text-dust focus:border-signal focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="center-filter" className="label text-[10px]">
              Center:
            </label>
            <select
              id="center-filter"
              value={centerFilter}
              onChange={(e) => setCenterFilter(e.target.value)}
              className="rounded-lg border border-hairline bg-void-3 px-3 py-1.5 text-xs font-mono text-lunar focus:border-signal focus:outline-none"
            >
              <option value="all">All Centers ({imageEntries.length})</option>
              {centers.map((c) => (
                <option key={c} value={c}>
                  {c} ({imageEntries.filter(([, img]) => img.center === c).length})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Images */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filteredImages.map(([id, img]) => (
          <div
            key={id}
            className="group flex flex-col justify-between overflow-hidden rounded-xl border border-hairline bg-void-2/60 transition-all hover:border-hairline-strong hover:bg-void-3"
          >
            <button
              type="button"
              onClick={() => setSelectedImageId(id)}
              className="relative aspect-[4/3] w-full overflow-hidden bg-void-3 text-left focus:outline-none focus:ring-1 focus:ring-signal"
            >
              <NasaImage
                image={img}
                alt={img.title}
                thumb
                className="h-full w-full"
                imgClassName="transition-transform duration-500 group-hover:scale-105"
              />
              <span className="sr-only">Open details for {img.title}</span>
            </button>

            <div className="p-3">
              <div className="flex items-center justify-between text-[10px] font-mono text-dust">
                <span className="truncate pr-1 uppercase">{id}</span>
                {img.center && (
                  <span className="rounded bg-void-3 px-1.5 py-0.5 border border-hairline/60">
                    {img.center}
                  </span>
                )}
              </div>

              <h4 className="mt-1.5 text-xs font-medium text-lunar leading-snug line-clamp-2 group-hover:text-signal transition-colors">
                {img.title}
              </h4>

              <div className="mt-3 flex items-center justify-between border-t border-hairline/40 pt-2 text-[10px] font-mono text-dust">
                <span>{img.date ? formatDate(img.date, lang) : "Archival Plate"}</span>
                <a
                  href={img.page}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-signal hover:underline inline-flex items-center gap-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>NASA</span>
                  <span aria-hidden>↗</span>
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox / Modal for Selected Image */}
      {selectedImageId && activeImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="image-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-void/90 p-4 backdrop-blur-md"
          onClick={() => setSelectedImageId(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-hairline bg-void-2 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedImageId(null)}
              className="absolute right-4 top-4 rounded-full border border-hairline bg-void-3 p-2 text-dust hover:text-lunar"
              aria-label="Close modal"
            >
              ✕
            </button>

            <div className="space-y-4">
              <div className="overflow-hidden rounded-xl border border-hairline bg-void-3">
                <NasaImage
                  image={activeImage}
                  alt={activeImage.title}
                  thumb={false}
                  className="max-h-[500px] w-full object-contain"
                />
              </div>

              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-signal">
                  {selectedImageId} · {activeImage.center || "NASA"}
                </span>
                <h3 id="image-dialog-title" className="mt-1 text-xl font-bold text-lunar sm:text-2xl">
                  {activeImage.title}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-xl border border-hairline/60 bg-void-3/60 p-4 font-mono text-xs sm:grid-cols-4">
                <div>
                  <span className="block text-[10px] uppercase text-dust">Credit Line</span>
                  <span className="text-lunar font-semibold">{activeImage.credit}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-dust">Capture Date</span>
                  <span className="text-lunar font-semibold">
                    {activeImage.date ? formatDate(activeImage.date, lang) : "Historical record"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-dust">Original Dimensions</span>
                  <span className="text-lunar font-semibold">
                    {activeImage.width} × {activeImage.height} px
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-dust">Official Record</span>
                  <a
                    href={activeImage.page}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-signal hover:underline inline-flex items-center gap-1"
                  >
                    <span>images.nasa.gov</span>
                    <span aria-hidden>↗</span>
                  </a>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <a
                  href={activeImage.page}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 rounded-xl border border-signal bg-signal px-4 py-2 text-xs font-mono font-bold text-void uppercase tracking-wider hover:bg-signal/90"
                >
                  <span>Open on NASA Image & Video Library</span>
                  <span aria-hidden>↗</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
