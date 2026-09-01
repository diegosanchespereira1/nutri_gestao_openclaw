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

/**
 * Remove a porta de um endereço, SEM estragar IPv6.
 *
 * O erro clássico é aplicar /:\d+$/ a qualquer entrada: em IPv6 o sufixo
 * `:<dígitos>` faz parte do endereço, e `::1` vira `":"` — que o Postgres
 * rejeita ao gravar numa coluna `inet` (22P02).
 *
 * Só remove a porta em dois formatos inequívocos:
 *   - IPv4 com porta      → `201.43.104.66:443`  → `201.43.104.66`
 *   - IPv6 entre colchetes → `[2001:db8::1]:443` → `2001:db8::1`
 * Qualquer outra coisa volta intacta.
 */
export function stripPortFromIp(raw: string): string {
  const trimmed = raw.trim();

  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(trimmed);
  if (bracketed) return bracketed[1]!;

  const ipv4WithPort = /^((?:\d{1,3}\.){3}\d{1,3}):\d+$/.exec(trimmed);
  if (ipv4WithPort) return ipv4WithPort[1]!;

  return trimmed;
}

/**
 * IP pronto para uma coluna `inet`: valor válido ou **null**.
 *
 * Nunca devolve "unknown"/"desconhecido" — esses textos fazem o INSERT explodir
 * com 22P02 e derrubam a operação inteira (o registro de consentimento, o log de
 * auditoria). Numa coluna nullable, `null` é a resposta correta para "não sei".
 */
export function clientIpForInet(headersList: Headers): string | null {
  const raw = getClientIpFromHeaders(headersList);
  return normalizeClientIp(stripPortFromIp(raw));
}

/** Extrai o IP do cliente a partir dos headers HTTP. */
export function getClientIpFromHeaders(headersList: Headers): string {
  const forwarded = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");
  const cfConnecting = headersList.get("cf-connecting-ip");

  const candidato =
    (forwarded ? forwarded.split(",")[0]?.trim() : null) ||
    cfConnecting?.trim() ||
    realIp?.trim();

  return candidato ? stripPortFromIp(candidato) : "desconhecido";
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
