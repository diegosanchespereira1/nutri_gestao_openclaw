import { notFound } from "next/navigation";
import Link from "next/link";

import { loadTemplateForAdmin } from "@/lib/actions/admin-checklists";
import { updateChecklistTemplateMetaAction } from "@/lib/actions/admin-checklists";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { ChecklistEditor } from "@/components/admin/checklists/checklist-editor";

const OK_MESSAGES: Record<string, string> = {
  meta_saved: "Alterações salvas.",
  section_added: "Seção adicionada.",
  section_saved: "Seção atualizada.",
  section_deleted: "Seção removida do modelo ativo (histórico preservado).",
  item_added: "Item adicionado.",
  item_saved: "Item atualizado.",
  item_deleted: "Item removido do modelo ativo. Checklists já aplicados continuam no histórico.",
};

const ERR_MESSAGES: Record<string, string> = {
  invalid: "Dados inválidos. Verifique os campos e tente novamente.",
  save: "Erro ao guardar. Verifique os campos obrigatórios e tente novamente.",
  item_in_use:
    "Não foi possível remover. O item/seção permanece no histórico dos checklists já aplicados.",
  sem_permissao: "Sem permissão para editar checklists.",
};

export default async function ChecklistEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { template, fillSessionCount } = await loadTemplateForAdmin(id);
  if (!template) notFound();

  const okMsg = sp.ok ? OK_MESSAGES[sp.ok] : null;
  const errMsg = sp.err ? ERR_MESSAGES[sp.err] ?? ERR_MESSAGES.save : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Editar checklist</h1>
          <p className="text-sm text-muted-foreground truncate max-w-sm">
            {template.name}
          </p>
        </div>
        <Link
          href="/admin/checklists"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          ← Checklists
        </Link>
      </div>

      {/* Version + session badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-mono">
          v{template.version}
        </Badge>
        <Badge variant={template.is_active ? "secondary" : "destructive"}>
          {template.is_active ? "Ativo" : "Inativo"}
        </Badge>
        <Badge variant="outline">
          {template.sections.length} seção(ões) · {template.total_item_count} item(s)
        </Badge>
        {fillSessionCount > 0 && (
          <Badge variant="secondary">
            {fillSessionCount} sessão(ões) aplicada(s)
          </Badge>
        )}
      </div>

      {/* Versioning notice */}
      {fillSessionCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">
            Este template já foi aplicado em {fillSessionCount} sessão(ões). Qualquer
            edição criará automaticamente uma nova versão.
          </p>
        </div>
      )}

      {/* Success / error banners */}
      {okMsg && (
        <div
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3"
          role="status"
        >
          <p className="text-sm text-green-800">{okMsg}</p>
        </div>
      )}
      {errMsg && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive">{errMsg}</p>
        </div>
      )}

      {/* Template meta */}
      <Card>
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Detalhes do Template
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <form action={updateChecklistTemplateMetaAction} className="space-y-4">
            <input type="hidden" name="template_id" value={template.id} />

            <div className="space-y-1">
              <Label htmlFor="meta-name">Nome</Label>
              <Input
                id="meta-name"
                name="name"
                defaultValue={template.name}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="meta-portaria">Referência da portaria</Label>
                <Input
                  id="meta-portaria"
                  name="portaria_ref"
                  defaultValue={template.portaria_ref}
                  placeholder="Ex: Portaria 2619/2011"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="meta-uf">UF</Label>
                <Input
                  id="meta-uf"
                  name="uf"
                  defaultValue={template.uf}
                  maxLength={2}
                  placeholder="SP"
                  className="uppercase"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="meta-desc">Descrição</Label>
              <Textarea
                id="meta-desc"
                name="description"
                defaultValue={template.description ?? ""}
                rows={3}
                placeholder="Descrição opcional do checklist…"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="meta-active">Status</Label>
              <select
                id="meta-active"
                name="is_active"
                defaultValue={template.is_active ? "true" : "false"}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>

            <Button type="submit" size="sm">
              Salvar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Sections + items — Client Component manages edit state */}
      <ChecklistEditor
        sections={template.sections}
        templateId={template.id}
      />
    </div>
  );
}
