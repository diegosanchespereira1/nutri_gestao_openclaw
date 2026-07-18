"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { RETURN_TO_PARAM } from "@/lib/navigation/return-to";

function ReturnToHiddenFieldInner() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get(RETURN_TO_PARAM);
  if (!returnTo) return null;
  return <input type="hidden" name={RETURN_TO_PARAM} value={returnTo} />;
}

/** Campo hidden com o `returnTo` da URL actual (para redirects pós-submit). */
export function ReturnToHiddenField() {
  return (
    <Suspense fallback={null}>
      <ReturnToHiddenFieldInner />
    </Suspense>
  );
}
