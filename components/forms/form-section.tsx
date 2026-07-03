import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Título de seção — legível e com destaque no tema claro e escuro (DS). */
export const formSectionLegendClass =
  "mb-2 block w-full text-sm font-semibold uppercase tracking-wide text-foreground";

/** Espaçamento padrão label + controlo. */
export const formFieldClass = "space-y-2";

/** Grelha responsiva para campos numéricos / selects curtos. */
export const formGridClass = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

/** <select> nativo alinhado visualmente com Input / Select do DS. */
export const nativeSelectClass =
  "border-input bg-background text-foreground flex h-9 w-full touch-manipulation rounded-md border px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50";

export function nativeSelectValueClass(value: string, className?: string) {
  return cn(nativeSelectClass, value === "" && "text-muted-foreground", className);
}

type FormSectionProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export function FormSection({ title, children, className }: FormSectionProps) {
  return (
    <fieldset className={cn("min-w-0 space-y-4 border-0 p-0", className)}>
      <legend className={formSectionLegendClass}>{title}</legend>
      {children}
    </fieldset>
  );
}

export function FormSectionDivider() {
  return <div className="border-t border-border" role="presentation" />;
}
