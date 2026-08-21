"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";

/**
 * Navegação de busca/filtro: mantém o chrome visível e marca `isPending`
 * para a zona de resultados mostrar skeleton.
 */
export function useFilterNavigation() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = useCallback(
    (href: string) => {
      startTransition(() => {
        router.push(href, { scroll: false });
      });
    },
    [router],
  );

  return { isPending, navigate };
}
