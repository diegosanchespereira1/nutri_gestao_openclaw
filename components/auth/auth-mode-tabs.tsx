"use client";

import { cn } from "@/lib/utils";

export type AuthMode = "entrar" | "cadastro";

type Props = {
  value: AuthMode;
  onChange: (mode: AuthMode) => void;
};

export function AuthModeTabs({ value, onChange }: Props) {
  return (
    <div className="border-border flex gap-6 border-b">
      <TabButton
        selected={value === "entrar"}
        onSelect={() => onChange("entrar")}
      >
        Entrar
      </TabButton>
      <TabButton
        selected={value === "cadastro"}
        onSelect={() => onChange("cadastro")}
      >
        Cadastre-se
      </TabButton>
    </div>
  );
}

function TabButton({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected ? "true" : "false"}
      className={cn(
        "-mb-px border-b-2 pb-3 text-2xl font-semibold tracking-tight transition-colors",
        selected
          ? "text-foreground border-foreground"
          : "text-muted-foreground/50 hover:text-muted-foreground border-transparent",
      )}
    >
      {children}
    </button>
  );
}
