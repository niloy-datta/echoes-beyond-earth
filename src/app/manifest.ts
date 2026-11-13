import type { MetadataRoute } from "next";

// Required for static HTML export in Next.js 16.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  const prefix = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return {
    id: `${prefix}/`,
    name: "Echoes Beyond Earth — EKO Explorer",
    short_name: "EKO Explorer",
    description: "An interactive, evidence-based space-science museum with a Mars adventure.",
    start_url: `${prefix}/play/`,
    scope: `${prefix}/`,
    display: "standalone",
    background_color: "#030405",
    theme_color: "#030405",
    icons: [
      { src: `${prefix}/icon.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
