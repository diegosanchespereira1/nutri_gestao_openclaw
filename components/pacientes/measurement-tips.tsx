"use client";

import { useId, useState } from "react";
import { Info, X } from "lucide-react";

/**
 * Ícone de dica (info) que revela um passo a passo de como realizar a medição.
 * Conteúdo conforme "Procedimento de Av. Nutricional" (Saber Nutrir).
 */
export function MeasurementTips({
  title,
  tips,
}: {
  title: string;
  tips: string[];
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <span className="inline-flex align-middle">
      <button
        type="button"
        aria-label={`Como medir: ${title}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>

      {open && (
        <>
          {/* backdrop para fechar ao clicar fora (mobile-friendly) */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          {/* Ancorado à largura do campo (pai relativo) — nunca estoura o layout */}
          <div
            id={panelId}
            role="dialog"
            aria-label={`Como medir: ${title}`}
            className="absolute inset-x-0 top-full z-50 mt-1 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg"
          >
            <div className="mb-1.5 flex items-start justify-between gap-2">
              <p className="text-xs font-semibold text-foreground">{title}</p>
              <button
                type="button"
                aria-label="Fechar dica"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
            <ul className="space-y-1.5 text-xs leading-snug text-muted-foreground">
              {tips.map((tip, i) => (
                <li key={i} className="flex gap-1.5">
                  <span aria-hidden className="mt-1 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </span>
  );
}

/** Dicas de medição conforme o procedimento (reutilizáveis). */
export const HEIGHT_MEASUREMENT_TIPS = [
  "Retire sapatos, roupas volumosas e enfeites de cabelo que atrapalhem a medição.",
  "Meça num piso liso e de superfície plana.",
  "Criança de pés juntos, de costas para a parede, com pernas e braços estendidos ao lado do corpo.",
  "Cabeça, nádegas e calcanhares encostados na parede.",
  "Registre a altura em centímetros, com precisão.",
];

export const WEIGHT_MEASUREMENT_TIPS = [
  "Use uma balança digital.",
  "Coloque a balança em piso firme (cerâmica ou madeira), nunca sobre tapete.",
  "Criança com o mínimo de roupa possível.",
  "Os dois pés no centro da balança.",
  "Registre a fração decimal mais próxima (ex.: 25,1 kg).",
];
