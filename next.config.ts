import type { NextConfig } from "next";

/** Origens connect-src derivadas do Supabase (HTTP + WSS no mesmo host). */
function supabaseConnectOrigins(): string[] {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const out: string[] = [];
  if (raw) {
    try {
      const u = new URL(raw);
      out.push(u.origin);
      if (u.protocol === "https:") {
        out.push(`wss://${u.host}`);
      }
    } catch {
      /* ignore */
    }
  }
  const extra = process.env.CSP_CONNECT_SRC_EXTRA?.trim();
  if (extra) {
    for (const part of extra.split(/[\s,]+/)) {
      if (!part) continue;
      try {
        const u = new URL(part);
        out.push(u.origin);
        if (u.protocol === "https:") {
          out.push(`wss://${u.host}`);
        }
      } catch {
        if (part.startsWith("https://") || part.startsWith("wss://")) {
          out.push(part);
        }
      }
    }
  }
  return [...new Set(out)];
}

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

    const connectParts = ["'self'", ...supabaseConnectOrigins()];
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
