const LOOPBACK_IPS = new Set([
  "127.0.0.1",
  "::1",
  "0:0:0:0:0:0:0:1",
  "localhost",
  "unknown",
  "desconhecido",
]);

/** Indica IP de loopback ou valor ausente — comum em dev local e server actions. */
export function isLoopbackOrMissingIp(ip: string | null | undefined): boolean {
  const trimmed = ip?.trim().toLowerCase() ?? "";
  if (!trimmed) return true;
  if (LOOPBACK_IPS.has(trimmed)) return true;
  if (trimmed.startsWith("127.")) return true;
  return false;
}

/** Valida formato básico de IPv4 ou IPv6 para auditoria. */
export function isValidIpCandidate(ip: string): boolean {
  const trimmed = ip.trim();
  if (!trimmed || trimmed.length > 45) return false;

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(trimmed)) {
    return trimmed.split(".").every((octet) => {
      const n = Number(octet);
      return Number.isInteger(n) && n >= 0 && n <= 255;
    });
  }

  if (/^[0-9a-fA-F:.]+$/.test(trimmed) && trimmed.includes(":")) {
    return true;
  }

  return false;
}

export function normalizeClientIp(ip: string | null | undefined): string | null {
  const trimmed = ip?.trim() ?? "";
  if (!trimmed || !isValidIpCandidate(trimmed)) return null;
  return trimmed;
}

/** Extrai o IP do cliente a partir dos headers HTTP. */
export function getClientIpFromHeaders(headersList: Headers): string {
  const forwarded = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");
  const cfConnecting = headersList.get("cf-connecting-ip");

  return (
    (forwarded ? forwarded.split(",")[0]?.trim() : null) ||
    cfConnecting?.trim() ||
    realIp?.trim() ||
    "desconhecido"
  );
}

/**
 * Prioriza IP confiável dos headers (produção) e, em loopback,
 * usa o IP reportado pelo dispositivo (rede do aparelho).
 */
export function resolveApprovalClientIp(
  headersList: Headers,
  deviceReportedIp?: string | null,
): string {
  const fromHeaders = normalizeClientIp(getClientIpFromHeaders(headersList));
  const fromDevice = normalizeClientIp(deviceReportedIp);

  if (fromHeaders && !isLoopbackOrMissingIp(fromHeaders)) {
    return fromHeaders;
  }
  if (fromDevice && !isLoopbackOrMissingIp(fromDevice)) {
    return fromDevice;
  }
  return fromHeaders ?? fromDevice ?? "desconhecido";
}
