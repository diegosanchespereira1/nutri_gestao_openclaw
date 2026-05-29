import type { NextConfig } from "next";

import { buildContentSecurityPolicyValue } from "@/lib/security/content-security-policy";

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

    base.push({
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicyValue(),
    });

    return [{ source: "/:path*", headers: base }];
  },
};

export default nextConfig;
