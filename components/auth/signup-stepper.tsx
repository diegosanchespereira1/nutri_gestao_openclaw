"use client";

import { cn } from "@/lib/utils";

const STEPS = ["Dados para cadastro", "Plano", "Pagamento"] as const;

export function SignupStepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="flex items-start justify-between gap-2" aria-label="Etapas do cadastro">
      {STEPS.map((label, index) => {
        const step = (index + 1) as 1 | 2 | 3;
        const done = step < current;
        const active = step === current;
        return (
          <li key={label} className="flex flex-1 flex-col items-center gap-2 text-center">
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-full border-2 text-sm font-semibold",
                active && "border-primary bg-primary text-primary-foreground",
                done && "border-primary bg-primary/15 text-primary",
                !active && !done && "border-muted-foreground/30 text-muted-foreground/60",
              )}
              aria-current={active ? "step" : undefined}
            >
              {step}
            </span>
            <span
              className={cn(
                "text-xs leading-tight",
                active ? "text-foreground font-medium" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
