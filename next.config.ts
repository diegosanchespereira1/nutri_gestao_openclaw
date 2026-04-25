import type { NextConfig } from "next";

const supabaseOrigin = (() => {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!u) return "";
  try {
    return new URL(u).origin;
  } catch {
    return "";
  }
})();

const nextConfig: NextConfig = {
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

    const connectParts = ["'self'"];
    if (supabaseOrigin) connectParts.push(supabaseOrigin);
    connectParts.push("https://*.supabase.co", "wss://*.supabase.co");

    const isProd = process.env.NODE_ENV === "production";
    // Next.js App Router injeta scripts inline (RSC, bootstrap). Em dev, Turbopack/HMR
    // ainda precisa de 'unsafe-eval'. Sem isto, client navigations rebentam (página em branco).
    const scriptSrc = isProd
      ? "'self' 'unsafe-inline'"
      : "'self' 'unsafe-inline' 'unsafe-eval'";
    // Tailwind/shadcn e estilos de runtime usam inline styles.
    const styleSrc = "'self' 'unsafe-inline'";

    const csp = [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      `style-src ${styleSrc}`,
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      `connect-src ${connectParts.join(" ")}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      ...(isProd ? (["upgrade-insecure-requests"] as const) : []),
      "report-uri /api/security/csp-report",
    ].join("; ");

    base.push({ key: "Content-Security-Policy", value: csp });

    return [{ source: "/:path*", headers: base }];
  },
};

export default nextConfig;
