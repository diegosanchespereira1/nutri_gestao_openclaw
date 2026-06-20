import { isLoopbackOrMissingIp } from "@/lib/ip/client-ip-utils";

const IPIFY_URL = "https://api.ipify.org?format=json";

async function fetchJsonIp(
  url: string,
  timeoutMs: number,
): Promise<string | null> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ip?: string };
    const ip = data.ip?.trim();
    return ip && !isLoopbackOrMissingIp(ip) ? ip : null;
  } catch {
    return null;
  }
}

/**
 * Resolve o IP do dispositivo no momento da aprovação do dossiê.
 *
 * 1. `/api/client-ip` — headers do pedido (produção atrás de proxy/CDN)
 * 2. ipify — IP público da rede do aparelho (dev local, app Capacitor, etc.)
 */
export async function resolveDeviceIpForDossierApproval(): Promise<string | null> {
  const fromApi = await fetchJsonIp("/api/client-ip", 2500);
  if (fromApi) return fromApi;

  return fetchJsonIp(IPIFY_URL, 4000);
}
