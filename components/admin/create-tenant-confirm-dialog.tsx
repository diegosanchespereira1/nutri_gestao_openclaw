"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CreateTenantSummary } from "@/lib/admin/build-create-tenant-summary";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: CreateTenantSummary | null;
  onConfirm: () => void;
};

function SummaryBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
        {title}
      </h3>
      <div className="bg-muted/30 space-y-2 rounded-lg p-3 ring-1 ring-foreground/5">
        {children}
      </div>
    </section>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground text-right font-medium">{value}</span>
    </div>
  );
}

export function CreateTenantConfirmDialog({
  open,
  onOpenChange,
  summary,
  onConfirm,
}: Props) {
  if (!summary) return null;

  const enabledModules = summary.modules.filter((m) => m.enabled);
  const disabledModules = summary.modules.filter((m) => !m.enabled);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,720px)] max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-border border-b px-6 py-4">
          <DialogTitle>Confirmar criação do tenant</DialogTitle>
          <DialogDescription>
            Revise o resumo abaixo. Ao confirmar, a conta será criada com estas
            configurações.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[min(60vh,480px)] space-y-5 overflow-y-auto px-6 py-5">
          <SummaryBlock title="Identificação">
            <SummaryRow label="Empresa" value={summary.fullName} />
            <SummaryRow label="Email" value={summary.email} />
            <SummaryRow
              label="Senha inicial"
              value={
                summary.passwordMode === "defined"
                  ? "Definida pelo admin"
                  : "Gerada automaticamente"
              }
            />
          </SummaryBlock>

          <SummaryBlock title="Módulos e funcionalidades">
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs">Ativos</p>
              {enabledModules.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {enabledModules.map((m) => (
                    <Badge
                      key={m.label}
                      variant="outline"
                      className="border-green-500/30 bg-green-500/10 text-green-800 dark:text-green-200"
                    >
                      {m.label}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Nenhum</p>
              )}
            </div>
            {disabledModules.length > 0 ? (
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs">Desativados</p>
                <div className="flex flex-wrap gap-1.5">
                  {disabledModules.map((m) => (
                    <Badge key={m.label} variant="secondary">
                      {m.label}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </SummaryBlock>

          <SummaryBlock title="Plano">
            <SummaryRow label="Plano" value={summary.planName} />
            <SummaryRow label="Valor" value={summary.planPrice} />
          </SummaryBlock>

          <SummaryBlock title="Features do plano">
            <ul className="space-y-2">
              {summary.features.map((feature) => (
                <li
                  key={feature.label}
                  className="flex flex-col gap-0.5 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-foreground font-medium">
                    {feature.label}
                  </span>
                  <span
                    className={cn(
                      "text-muted-foreground text-xs sm:text-right",
                      feature.status.includes("override") &&
                        "text-foreground font-medium",
                    )}
                  >
                    {feature.status}
                  </span>
                </li>
              ))}
            </ul>
          </SummaryBlock>

          <SummaryBlock title="Acesso inicial">
            <SummaryRow
              label="Email de confirmação"
              value={summary.sendConfirmationEmail ? "Enviar" : "Não enviar"}
            />
          </SummaryBlock>
        </div>

        <DialogFooter className="border-border border-t bg-muted/30 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Voltar e editar
          </Button>
          <Button type="button" onClick={onConfirm}>
            Confirmar e criar conta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
