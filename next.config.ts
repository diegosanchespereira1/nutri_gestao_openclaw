import type { NextConfig } from "next";

import { readPackageVersion } from "@/lib/app-version-package";
import { buildContentSecurityPolicyValue } from "@/lib/security/content-security-policy";

const appVersion =
  process.env.NEXT_PUBLIC_APP_VERSION?.trim() || readPackageVersion();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
  output: "standalone",
  experimental: {
    serverActions: {
      // Auditoria 2026-07: era 210mb — com 512M–2G de RAM no container, um
      // único upload grande era bufferizado inteiro em memória e derrubava o
      // processo (OOM). Com a compressão de imagem no CLIENTE
      // (lib/images/prepare-image-upload.ts), fotos chegam com ~300–800KB;
      // 50mb cobre lotes de exames em PDF com folga.
      bodySizeLimit: "50mb",
    },
  },
  async redirects() {
    return [
      {
        source: "/inicio",
        destination: "/dashboard",
        permanent: true,
      },
    ];
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

    // Cache dos HTML (auditoria 2026-07):
    // - padrão: no-store — o Android WebView (Capacitor) nunca guarda nada
    //   (comportamento histórico; evita servir versão velha após deploy).
    // - HTML_CACHE_RELAXED=1: "private, no-cache" — browser/WebView PODE
    //   guardar a resposta, mas é obrigado a revalidar no servidor antes de
    //   reutilizar (não serve página velha após deploy; melhora back/forward
    //   e reduz re-renders). ATIVAR PRIMEIRO EM DEV e validar no app Android
    //   real antes de habilitar em produção.
    const relaxedHtmlCache = process.env.HTML_CACHE_RELAXED === "1";
    const noStoreHtml = {
      key: "Cache-Control",
      value: relaxedHtmlCache
        ? "private, no-cache, must-revalidate"
        : "no-store, no-cache, must-revalidate, proxy-revalidate",
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
      {
        source: "/api/ficha-tecnica/:id/pdf",
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
    ];
  },
};

export default nextConfig;
