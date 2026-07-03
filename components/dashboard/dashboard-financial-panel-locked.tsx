"use client";

import { Lock } from "lucide-react";

import { DashboardFocusPanel } from "@/components/dashboard/dashboard-focus-panel";
import { useModuleGate } from "@/components/modules/module-gate-provider";
import { Button } from "@/components/ui/button";

export function DashboardFinancialPanelLocked() {
  const { openDisabledModule } = useModuleGate();

  return (
    <DashboardFocusPanel
      labelledById="dashboard-financial-heading"
      tone="financial"
      title="Financeiro"
      description="Cobranças, contratos e alertas de renovação."
    >
      <div
        className="border-border bg-muted/30 flex flex-col items-start gap-3 rounded-lg border border-dashed px-4 py-5 text-sm"
        aria-disabled="true"
      >
        <div className="text-muted-foreground flex items-center gap-2">
          <Lock className="size-4 shrink-0" aria-hidden />
          <p className="text-foreground font-medium">
            Módulo financeiro não ativo
          </p>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Este painel fica visível na home, mas o acesso à área financeira está
          desativado na sua conta.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => openDisabledModule("financeiro")}
        >
          Saiba mais
        </Button>
      </div>
    </DashboardFocusPanel>
  );
}
