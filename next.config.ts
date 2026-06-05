import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { NextConfig } from "next";

import { buildContentSecurityPolicyValue } from "@/lib/security/content-security-policy";

function readPackageVersion(): string {
  try {
    const raw = readFileSync(join(process.cwd(), "package.json"), "utf8");
    const pkg = JSON.parse(raw) as { version?: string };
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const appVersion =
  process.env.NEXT_PUBLIC_APP_VERSION?.trim() || readPackageVersion();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "210mb",
    },
  },
  async headers() {
    const base: { key: string; value: string }[] = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(self), microphone=(), geolocation=(self)",
      },
    ];

    if (process.env.NODE_ENV === "production") {
      base.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
      });
    }

    base.push({
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicyValue(),
    });

    const noStoreHtml = {
      key: "Cache-Control",
      // no-store + Pragma: no-cache garante que o Android WebView (Capacitor)
      // não sirva versão em cache das páginas HTML
      value: "no-store, no-cache, must-revalidate, proxy-revalidate",
    };

    const pragmaNoCache = {
      key: "Pragma",
      value: "no-cache",
    };

    const expires = {
      key: "Expires",
      value: "0",
    };

    return [
      { source: "/:path*", headers: base },
      {
        source:
          "/((?!_next/static|_next/image|favicon.ico|runtime-env.js|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|woff2?)$).*)",
        headers: [noStoreHtml, pragmaNoCache, expires],
      },
    ];
  },
};

export default nextConfig;
