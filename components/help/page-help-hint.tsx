"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import { CircleHelp } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  /** Nome acessível do botão (deve resumir o conteúdo para leitores de ecrã). */
  ariaLabel: string;
  children: React.ReactNode;
  className?: string;
};

/**
 * Ícone «?» com texto longo ao pairar (tooltip). Em dispositivos só toque o hover
 * pode não estar disponível; o botão mantém `aria-label` para acessibilidade.
 */
export function PageHelpHint({ ariaLabel, children, className }: Props) {
  return (
    <Tooltip.Provider delay={250} closeDelay={100}>
      <Tooltip.Root>
        <Tooltip.Trigger
          type="button"
          aria-label={ariaLabel}
          className={cn(
            "text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex shrink-0 rounded-full p-0.5 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
            className,
          )}
        >
          <CircleHelp className="size-5" aria-hidden />
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner side="bottom" align="start" sideOffset={8}>
            <Tooltip.Popup
              className={cn(
                "border-border bg-popover text-popover-foreground z-50 max-w-[min(22rem,calc(100vw-2rem))] rounded-lg border px-3 py-2.5 text-sm shadow-md",
                "data-ending-style:opacity-0 data-starting-style:opacity-0 data-ending-style:transition-opacity data-starting-style:transition-opacity",
                "duration-150",
              )}
            >
              <div className="text-muted-foreground space-y-2 [&_strong]:text-foreground">
                {children}
              </div>
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
