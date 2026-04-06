"use client";

import { useEffect, useId, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const MAX_CENTS = 999_999_999_99;

function digitsToCents(digits: string): number {
  const only = digits.replace(/\D/g, "");
  if (!only) return 0;
  const n = Number.parseInt(only, 10);
  if (!Number.isFinite(n)) return 0;
  return Math.min(n, MAX_CENTS);
}

function centsToBRLDisplay(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Props = {
  id?: string;
  name: string;
  required?: boolean;
  className?: string;
};

/**
 * Campo de valor em reais: o utilizador digita apenas algarismos; os dois últimos
 * são centavos (ex.: 20000 → 200,00). Envia para o servidor `amount` em formato 200.00.
 */
export function FinancialChargeAmountInput({
  id: idProp,
  name,
  required = false,
  className,
}: Props) {
  const reactId = useId();
  const id = idProp ?? `fc-amount-${reactId}`;
  const [cents, setCents] = useState(0);

  const display = centsToBRLDisplay(cents);
  const hiddenValue = cents > 0 ? (cents / 100).toFixed(2) : "";

  useEffect(() => {
    if (!required) return;
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) return;
    el.setCustomValidity(cents > 0 ? "" : "Indique o valor em reais.");
  }, [cents, required, id]);

  return (
    <div className={cn("space-y-1", className)}>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        required={required}
        aria-describedby={`${id}-hint`}
        value={display}
        placeholder="0,00"
        className="w-40 tabular-nums"
        onChange={(e) => {
          const next = digitsToCents(e.target.value);
          setCents(next);
        }}
      />
      <input type="hidden" name={name} value={hiddenValue} />
      <p id={`${id}-hint`} className="text-muted-foreground max-w-xs text-xs">
        Digite só números: os dois últimos dígitos são centavos (ex.:{" "}
        <span className="tabular-nums">20000</span> →{" "}
        <span className="tabular-nums">200,00</span>).
      </p>
    </div>
  );
}
