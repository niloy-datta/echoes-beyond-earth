import type { Metadata, Viewport } from "next";
import { Inter_Tight, Instrument_Serif, JetBrains_Mono, Noto_Sans_Bengali } from "next/font/google";
import { Providers } from "@/components/Providers";
import { SiteHeader } from "@/components/SiteHeader";
import { Starfield } from "@/components/Starfield";
import { assetPath } from "@/lib/asset-path";
import "./globals.css";

const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight", display: "swap" });
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });
const notoBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-noto-bengali",
  display: "swap",
});

// Absolute origin for Open Graph / Twitter images. GitHub Pages sets
// NEXT_PUBLIC_SITE_ORIGIN in CI; Render exposes RENDER_EXTERNAL_URL at build
// time; production builds otherwise default to the Render deployment.
const siteOrigin =
  process.env.NEXT_PUBLIC_SITE_ORIGIN ||
  process.env.RENDER_EXTERNAL_URL ||
  (process.env.NODE_ENV === "production" ? "https://echoes-beyond-earth.onrender.com" : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: "Echoes Beyond Earth — The machines went silent. The knowledge kept traveling.",
    template: "%s · Echoes Beyond Earth",
  },
  description:
    "An interactive museum of the machines NASA left on the Moon and Mars, and the knowledge they sent home. Independent educational project; not affiliated with or endorsed by NASA.",
  openGraph: {
    title: "Echoes Beyond Earth",
    description: "The machines went silent. The knowledge kept traveling.",
    images: [assetPath("/images/nasa/art002e021278.jpg")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Echoes Beyond Earth",
    description: "The machines went silent. The knowledge kept traveling.",
    images: [assetPath("/images/nasa/art002e021278.jpg")],
  },
};

export const viewport: Viewport = {
  themeColor: "#030405",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-lang="en"
      className={`${interTight.variable} ${instrumentSerif.variable} ${jetbrains.variable} ${notoBengali.variable}`}
    >
      <body>
        <Providers>
          <Starfield />
          <SiteHeader />
          <main id="main" tabIndex={-1} className="outline-none">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
