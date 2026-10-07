import type { NextConfig } from "next";

// Fully static, backend-free build: `next build` emits ./out
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
};

export default nextConfig;
