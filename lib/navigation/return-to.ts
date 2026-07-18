import { APP_DASHBOARD_PATH, LEGACY_INICIO_PATH } from "@/lib/routes";

export const RETURN_TO_PARAM = "returnTo" as const;

export type BackNavigation = {
  href: string;
  label: string;
};

type SearchParamsLike =
  | URLSearchParams
  | ReadonlyURLSearchParams
  | Record<string, string | string[] | undefined>
  | null
  | undefined;

/** Subconjunto tipado de next/navigation ReadonlyURLSearchParams. */
type ReadonlyURLSearchParams = {
  get(name: string): string | null;
};

/** Reescreve `/inicio` (e query/hash) para a rota actual do dashboard. */
function normalizeLegacyDashboardPath(trimmed: string, pathOnly: string): string {
  if (pathOnly !== LEGACY_INICIO_PATH) return trimmed;
  return `${APP_DASHBOARD_PATH}${trimmed.slice(pathOnly.length)}`;
}

/**
 * Valida um destino interno para `returnTo`.
 * Devolve `null` se ausente ou inseguro (não cai no dashboard por omissão).
 */
export function trySafeReturnPath(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const pathOnly = trimmed.split(/[?#]/, 1)[0] ?? "";
  if (!pathOnly.startsWith("/") || pathOnly.startsWith("//")) {
    return null;
  }
  if (pathOnly.includes(":") || pathOnly.includes("\\")) {
    return null;
  }

  return normalizeLegacyDashboardPath(trimmed, pathOnly);
}

/** Path sem query/hash, para comparações. */
function pathOnly(url: string): string {
  return url.split(/[?#]/, 1)[0] ?? url;
}

/**
 * Lê `returnTo` de searchParams (URLSearchParams ou record do App Router).
 */
export function getReturnToParam(searchParams: SearchParamsLike): string | null {
  if (searchParams == null) return null;
  if (typeof (searchParams as URLSearchParams).get === "function") {
    return (searchParams as URLSearchParams).get(RETURN_TO_PARAM);
  }
  const record = searchParams as Record<string, string | string[] | undefined>;
  const value = record[RETURN_TO_PARAM];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/**
 * Monta path+query actuais para passar como origem noutro link.
 */
export function buildCurrentUrl(
  pathname: string,
  searchParams?: SearchParamsLike,
): string {
  const base = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (searchParams == null) return base;

  let params: URLSearchParams;
  if (typeof (searchParams as URLSearchParams).get === "function") {
    params = new URLSearchParams(searchParams as URLSearchParams);
  } else {
    params = new URLSearchParams();
    const record = searchParams as Record<string, string | string[] | undefined>;
    for (const [key, value] of Object.entries(record)) {
      if (value == null) continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          params.append(key, item);
        }
      } else {
        params.set(key, value);
      }
    }
  }

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Acrescenta `returnTo` a um destino interno.
 * Não altera o href se a origem for inválida, vazia ou igual ao destino.
 */
export function withReturnTo(href: string, currentUrl: string): string {
  const origin = trySafeReturnPath(currentUrl);
  if (!origin) return href;

  const targetSafe = trySafeReturnPath(href) ?? href;
  if (pathOnly(origin) === pathOnly(targetSafe)) {
    return href;
  }

  const hashIndex = href.indexOf("#");
  const beforeHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";

  const qIndex = beforeHash.indexOf("?");
  const path = qIndex >= 0 ? beforeHash.slice(0, qIndex) : beforeHash;
  const existing = qIndex >= 0 ? beforeHash.slice(qIndex + 1) : "";
  const params = new URLSearchParams(existing);
  params.set(RETURN_TO_PARAM, origin);

  const qs = params.toString();
  return qs ? `${path}?${qs}${hash}` : `${path}${hash}`;
}

/**
 * Acrescenta `returnTo` a um destino se a origem for válida (útil em `redirect()`).
 */
export function hrefWithOptionalReturnTo(
  href: string,
  returnTo: string | null | undefined,
): string {
  const origin = trySafeReturnPath(returnTo);
  if (!origin) return href;
  return withReturnTo(href, origin);
}

/** Lê `returnTo` de um FormData (campo hidden nos forms). */
export function getReturnToFromFormData(formData: FormData): string | null {
  const raw = formData.get(RETURN_TO_PARAM);
  return typeof raw === "string" ? raw : null;
}

/**
 * Resolve o botão voltar: `returnTo` seguro tem prioridade; senão usa fallback hierárquico.
 */
export function resolveBackNavigation(options: {
  returnTo?: string | null;
  fallbackHref: string;
  fallbackLabel: string;
  /** Label quando há origem válida (default: "Voltar"). */
  returnLabel?: string;
  /** Path actual — se `returnTo` apontar para cá, usa fallback. */
  currentPath?: string | null;
}): BackNavigation {
  const {
    returnTo,
    fallbackHref,
    fallbackLabel,
    returnLabel = "Voltar",
    currentPath,
  } = options;

  const safe = trySafeReturnPath(returnTo);
  if (!safe) {
    return { href: fallbackHref, label: fallbackLabel };
  }

  if (currentPath && pathOnly(safe) === pathOnly(currentPath)) {
    return { href: fallbackHref, label: fallbackLabel };
  }

  return { href: safe, label: returnLabel };
}
