"use client";

import { cn } from "@/lib/utils";

type Props = {
  description: string;
  isRequired: boolean;
};

export function TemplateItemRow({ description, isRequired }: Props) {
  return (
    <li
      className={cn(
        "border-border/80 flex gap-2 border-b py-2 text-sm last:border-b-0",
      )}
    >
      <span className="text-foreground min-w-0 flex-1">{description}</span>
      {isRequired ? (
        <span
          className="bg-primary/15 text-primary shrink-0 rounded-md px-2 py-0.5 text-xs font-medium"
          title="Item obrigatório segundo o modelo da portaria"
        >
          Obrigatório
        </span>
      ) : null}
    </li>
  );
}
