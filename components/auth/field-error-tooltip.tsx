"use client";

import { cn } from "@/lib/utils";

/**
 * Balão de erro ancorado ao campo (tooltip/popover de validação).
 *
 * Substitui a mensagem fixa no topo do formulário: com o aviso longe do campo, o
 * utilizador lia o problema sem saber onde corrigi-lo — e num formulário com
 * nome, e-mail, telefone, documento e duas senhas, "já existe uma conta com este
 * CPF" no topo não diz qual dos seis campos está errado.
 *
 * Posicionado em absolute de propósito: aparecer e desaparecer não pode empurrar
 * os campos de baixo, senão o formulário salta enquanto a pessoa digita.
 * O contentor precisa de `relative`.
 */
export function FieldErrorTooltip({
  id,
  message,
  className,
}: {
  id?: string;
  message: string;
  className?: string;
}) {
  return (
    <div
      id={id}
      role="alert"
      className={cn(
        "bg-destructive text-destructive-foreground absolute top-full left-0 z-20 mt-1.5",
        "max-w-full rounded-md px-3 py-2 text-xs leading-snug font-medium shadow-lg",
        "animate-in fade-in-0 zoom-in-95 duration-150",
        className,
      )}
    >
      {/* Seta: quadrado rodado, encostado na borda de cima. */}
      <span
        aria-hidden="true"
        className="bg-destructive absolute -top-1 left-4 size-2 rotate-45 rounded-[2px]"
      />
      {message}
    </div>
  );
}

/** Contorno do campo em erro — o "circulado" que acompanha o balão. */
export const FIELD_ERROR_RING =
  "border-destructive ring-destructive/25 ring-2 focus-visible:ring-destructive/40";
