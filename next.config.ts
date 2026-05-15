import type { NextConfig } from "next";

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

    // Content-Security-Policy (connect-src): definida em proxy.ts com o mesmo URL
    // runtime que `/runtime-env.js` (SUPABASE_URL → NEXT_PUBLIC_SUPABASE_URL), para
    // não bloquear Supabase em domínio próprio quando o build não embute NEXT_PUBLIC_*.

    return [{ source: "/:path*", headers: base }];
  },
};

export default nextConfig;
