// Stories 10.5 + 10.6 — CRUD e versionamento de checklists regulatórios
// Admin gerencia templates globais (kind='portaria') e notifica tenants afetados.

import { notifyTenantsAboutPortariaUpdateAction } from "@/lib/actions/admin-platform";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

async function loadGlobalChecklistTemplates() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("checklist_templates")
    .select("id, name, kind, version, is_active, created_at, updated_at")
    .is("owner_user_id", null)   // global templates only
    .order("name", { ascending: true });
  return data ?? [];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default async function AdminChecklistsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { ok, err } = await searchParams;
  const templates = await loadGlobalChecklistTemplates();

  const okMessages: Record<string, string> = {
    notified: "Profissionais notificados e versão incrementada.",
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Checklists regulatórios
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Templates globais de portaria — {templates.length} cadastrado(s).
            Bumpar versão notifica os profissionais que usam este checklist.
          </p>
        </div>
        <Link
          href="/admin"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          ← Admin
        </Link>
      </div>

      {ok && (
        <p
          className="rounded border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-800 dark:text-green-200"
          role="status"
        >
          {okMessages[ok] ?? "Ação concluída."}
        </p>
      )}
      {err && (
        <p className="text-destructive rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">
          Erro ao processar. Verifique os dados e tente novamente.
        </p>
      )}

      {templates.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nenhum template global encontrado. Insira via Supabase ou seeds.
        </p>
      ) : (
        <ul className="space-y-4">
          {templates.map((t) => (
            <li key={t.id}>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start gap-2">
                    <CardTitle className="text-sm font-medium">
                      {t.name}
                    </CardTitle>
                    <Badge variant="outline">v{t.version}</Badge>
                    <Badge variant="secondary">{t.kind}</Badge>
                    {!t.is_active && (
                      <Badge variant="destructive">Inativo</Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs">
                    Criado: {formatDate(t.created_at)} · Atualizado:{" "}
                    {formatDate(t.updated_at)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Story 10.6 — Notificar profissionais */}
                  <form
                    action={notifyTenantsAboutPortariaUpdateAction}
                    className="flex flex-wrap items-end gap-2"
                  >
                    <input type="hidden" name="template_id" value={t.id} />
                    <div className="space-y-1">
                      <Label htmlFor={`msg-${t.id}`} className="text-xs">
                        Mensagem de atualização (Story 10.6)
                      </Label>
                      <Input
                        id={`msg-${t.id}`}
                        name="message"
                        placeholder="Ex: Portaria atualizada conforme Resolução X/2026"
                        className="h-8 text-xs max-w-xs"
                        required
                      />
                    </div>
                    <Button type="submit" size="sm" variant="outline" className="text-xs h-8">
                      Publicar nova versão & notificar
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-xs">
        <p className="font-medium">Story 10.4 — Catálogo de portarias e dados compartilhados</p>
        <p className="mt-1">
          Acesse{" "}
          <Link href="/admin/catalogo-taco" className="text-primary underline-offset-4 hover:underline">
            Catálogo TACO
          </Link>{" "}
          para gerir dados de referência. Templates de checklist são criados
          diretamente via Supabase ou script de seed.
        </p>
      </div>
    </div>
  );
}
