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
  async headers() {
    const base: { key: string; value: string }[] = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
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

    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      `connect-src ${connectParts.join(" ")}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; ");

    base.push({ key: "Content-Security-Policy", value: csp });

    return [{ source: "/:path*", headers: base }];
  },
};

export default nextConfig;
