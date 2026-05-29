"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

const SLOW_THRESHOLD_MS = 3500;

function Overlay() {
  const { pending } = useFormStatus();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!pending) {
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), SLOW_THRESHOLD_MS);
    return () => clearTimeout(t);
  }, [pending]);

  if (!pending) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={slow ? "Ainda a guardar, quase pronto" : "A guardar"}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
    >
      <div className="mx-4 flex w-full max-w-xs flex-col items-center gap-4 rounded-2xl border border-border bg-card px-8 py-7 shadow-2xl">
        <div className="relative flex items-center justify-center">
          <Loader2 className="size-11 animate-spin text-primary" aria-hidden />
        </div>

        <div className="space-y-1.5 text-center">
          <p className="text-sm font-semibold text-foreground">
            {slow ? "Quase lá…" : "A guardar"}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {slow
              ? "Está demorando mais do que o normal, mas já está acabando."
              : "Por favor, aguarde um momento."}
          </p>
        </div>

        {/* Progress bar indeterminada */}
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{
              animation: slow
                ? "progress-pulse 1.2s ease-in-out infinite"
                : "progress-slide 1.6s ease-in-out infinite",
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes progress-slide {
          0%   { width: 0%;   margin-left: 0%; }
          50%  { width: 60%;  margin-left: 20%; }
          100% { width: 0%;   margin-left: 100%; }
        }
        @keyframes progress-pulse {
          0%, 100% { width: 40%; margin-left: 30%; opacity: 0.6; }
          50%       { width: 70%; margin-left: 15%; opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/**
 * Coloque este componente **dentro** do elemento <form>.
 * Usa useFormStatus internamente para detectar quando o formulário está a submeter.
 */
export function SubmitLoadingOverlay() {
  return <Overlay />;
}
