"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { assetPath } from "@/lib/asset-path";

/** Supabase's Site URL may return email links to the homepage. */
export function AuthCallbackRedirect() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.replace(/\/$/, "").endsWith("/login")) return;
    const params = new URLSearchParams(window.location.hash.slice(1));
    if (params.has("access_token") || params.has("error_code") || params.has("error_description")) {
      window.location.replace(`${assetPath("/login/")}${window.location.hash}`);
    }
  }, [pathname]);
  return null;
}
