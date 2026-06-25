"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { useModuleGate } from "@/components/modules/module-gate-provider";
import { MODULE_BLOCKED_QUERY_PARAM } from "@/lib/modules/module-path-access";
import { ENABLED_MODULE_KEYS, type EnabledModuleKey } from "@/lib/types/modules";

function parseBlockedModule(raw: string | null): EnabledModuleKey | null {
  if (!raw) return null;
  return (ENABLED_MODULE_KEYS as readonly string[]).includes(raw)
    ? (raw as EnabledModuleKey)
    : null;
}

/** Abre o diálogo quando o middleware redireciona com `?modulo_bloqueado=`. */
export function ModuleBlockedUrlHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { openDisabledModule } = useModuleGate();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    const blocked = parseBlockedModule(
      searchParams.get(MODULE_BLOCKED_QUERY_PARAM),
    );
    if (!blocked) return;

    const signature = `${blocked}:${searchParams.toString()}`;
    if (handledRef.current === signature) return;
    handledRef.current = signature;

    openDisabledModule(blocked);

    const next = new URLSearchParams(searchParams.toString());
    next.delete(MODULE_BLOCKED_QUERY_PARAM);
    const query = next.toString();
    router.replace(query ? `/inicio?${query}` : "/inicio", { scroll: false });
  }, [openDisabledModule, router, searchParams]);

  return null;
}
