"use client";

import { useState } from "react";

import {
  inviteExternalUserAction,
  revokeExternalUserAction,
} from "@/lib/actions/external-portal";
import type { ExternalPortalUser } from "@/lib/types/external-portal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PlusIcon, ShieldOffIcon } from "lucide-react";

const ROLE_LABELS = {
  viewer: "Visualizador",
  guardian: "Responsável",
} as const;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

type Props = {
  users: ExternalPortalUser[];
  portalErr?: string;
  portalOk?: string;
};

export function ExternalPortalSection({ users, portalErr, portalOk }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);

  const errMessages: Record<string, string> = {
    invalid: "Preencha nome, e-mail e perfil corretamente.",
    patient: "Paciente inválido ou sem permissão.",
    save: "Não foi possível guardar. Tente novamente.",
    unauthorized: "Sem permissão para esta ação.",
  };

  const errorMsg = portalErr
    ? (errMessages[portalErr] ?? errMessages.save)
    : undefined;

  const activeUsers = users.filter((u) => u.is_active);
  const revokedUsers = users.filter((u) => !u.is_active);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold">
              Acesso externo (portal)
            </CardTitle>
            <CardDescription>
              Convide familiares, médicos ou pacientes para ver informações
              controladas — sem acesso ao painel profissional.
            </CardDescription>
          </div>
          {!showForm && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(true)}
              aria-label="Convidar utilizador externo"
            >
              <PlusIcon className="mr-1 h-4 w-4" />
              Convidar
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {portalOk === "invited" && (
          <p
            className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-800 dark:text-green-200"
            role="status"
          >
            Convite enviado com sucesso.
          </p>
        )}
        {portalOk === "permissions" && (
          <p
            className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-800 dark:text-green-200"
            role="status"
          >
            Permissões atualizadas.
          </p>
        )}

        {showForm && (
          <div className="rounded-md border p-4">
            <p className="text-muted-foreground mb-3 text-sm font-medium">
              Novo acesso externo
            </p>
            {errorMsg && (
              <p className="text-destructive mb-3 rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">
                {errorMsg}
              </p>
            )}
            <form
              action={async (fd) => {
                setPending(true);
                await inviteExternalUserAction(fd);
                setPending(false);
                setShowForm(false);
              }}
              className="space-y-3"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ext-full-name">Nome completo</Label>
                  <Input
                    id="ext-full-name"
                    name="full_name"
                    placeholder="Ana Souza"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ext-email">E-mail</Label>
                  <Input
                    id="ext-email"
                    name="email"
                    type="email"
                    placeholder="ana@email.com"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ext-role">Perfil de acesso</Label>
                <Select name="role" defaultValue="viewer">
                  <SelectTrigger id="ext-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">
                      Visualizador — ver relatórios e dados autorizados
                    </SelectItem>
                    <SelectItem value="guardian">
                      Responsável — responsável legal do paciente menor
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={pending}>
                  {pending ? "A enviar…" : "Convidar"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        )}

        {activeUsers.length === 0 && !showForm && (
          <p className="text-muted-foreground text-sm">
            Nenhum utilizador externo ativo. Clique em &ldquo;Convidar&rdquo;
            para adicionar.
          </p>
        )}

        {activeUsers.length > 0 && (
          <ul
            className="divide-border border-border divide-y overflow-hidden rounded-lg border"
            aria-label="Utilizadores externos ativos"
          >
            {activeUsers.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center gap-2 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-sm font-medium">
                    {u.full_name}
                  </p>
                  <p className="text-muted-foreground text-xs">{u.email}</p>
                  {u.last_access_at && (
                    <p className="text-muted-foreground text-xs">
                      Último acesso: {formatDate(u.last_access_at)}
                    </p>
                  )}
                </div>
                <Badge variant="secondary">
                  {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role}
                </Badge>
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        aria-label={`Revogar acesso de ${u.full_name}`}
                      >
                        <ShieldOffIcon className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revogar acesso?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {u.full_name} ({u.email}) perderá acesso ao portal
                        imediatamente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <form action={revokeExternalUserAction}>
                        <input
                          type="hidden"
                          name="external_user_id"
                          value={u.id}
                        />
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90 inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium">
                          Revogar
                        </AlertDialogAction>
                      </form>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
            ))}
          </ul>
        )}

        {revokedUsers.length > 0 && (
          <>
            <Separator />
            <details className="text-muted-foreground text-sm">
              <summary className="cursor-pointer select-none">
                {revokedUsers.length} acesso(s) revogado(s)
              </summary>
              <ul className="mt-2 space-y-1">
                {revokedUsers.map((u) => (
                  <li key={u.id} className="text-xs">
                    {u.full_name} ({u.email})
                  </li>
                ))}
              </ul>
            </details>
          </>
        )}
      </CardContent>
    </Card>
  );
}
