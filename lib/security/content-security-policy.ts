import type { NextResponse } from "next/server";

/** Mesma ordem que `readSupabaseUrl()` — alinha CSP com `/runtime-env.js`. */
function pickSupabaseUrlForCsp(): string | undefined {
  for (const key of ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"] as const) {
    const raw = process.env[key]?.trim();
    if (raw) return raw;
  }
  return undefined;
}

function addConnectOriginsFromUrl(raw: string | undefined, parts: Set<string>) {
  if (!raw?.trim()) return;
  try {
    const u = new URL(raw.trim());
    parts.add(u.origin);
    if (u.protocol === "https:") {
      parts.add(`wss://${u.host}`);
    }
  } catch {
    /* ignore */
  }
}

function connectSrcParts(): string[] {
  const parts = new Set<string>(["'self'"]);
  addConnectOriginsFromUrl(pickSupabaseUrlForCsp(), parts);
  const extra = process.env.CSP_CONNECT_SRC_EXTRA?.trim();
  if (extra) {
    for (const token of extra.split(/[\s,]+/)) {
      if (!token) continue;
      try {
        const u = new URL(token);
        parts.add(u.origin);
        if (u.protocol === "https:") {
          parts.add(`wss://${u.host}`);
        }
      } catch {
        if (token.startsWith("https://") || token.startsWith("wss://")) {
          parts.add(token);
        }
      }
    }
  }
  parts.add("https://*.supabase.co");
  parts.add("wss://*.supabase.co");
  // IP público do dispositivo na aprovação do dossiê (fallback quando headers = loopback)
  parts.add("https://api.ipify.org");

  // Capacitor WebView (iOS usa scheme capacitor://, Android usa https://)
  // Necessário para que o app nativo consiga fazer fetch para o servidor.
  const isCapacitorBuild = process.env.NEXT_PUBLIC_IS_CAPACITOR_BUILD === "true";
  if (isCapacitorBuild) {
    parts.add("capacitor://localhost");
    parts.add("ionic://localhost");
  }

  return [...parts];
}

export function buildContentSecurityPolicyValue(): string {
  const isProd = process.env.NODE_ENV === "production";
  const scriptSrc = isProd
    ? "'self' 'unsafe-inline'"
    : "'self' 'unsafe-inline' 'unsafe-eval'";
  const styleSrc = "'self' 'unsafe-inline'";
  const connect = connectSrcParts().join(" ");
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    `connect-src ${connect}`,
    "frame-src 'self' blob:",
    "object-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(isProd ? (["upgrade-insecure-requests"] as const) : []),
    "report-uri /api/security/csp-report",
  ].join("; ");
}

export function applyContentSecurityPolicy(response: NextResponse) {
  response.headers.set(
    "Content-Security-Policy",
    buildContentSecurityPolicyValue(),
  );
}
