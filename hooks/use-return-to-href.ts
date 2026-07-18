"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { buildCurrentUrl, withReturnTo } from "@/lib/navigation/return-to";

/** Acrescenta `returnTo` (URL actual) a um href de destino. */
export function useReturnToHref(targetHref: string): string {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = buildCurrentUrl(pathname, searchParams);
  return withReturnTo(targetHref, current);
}
