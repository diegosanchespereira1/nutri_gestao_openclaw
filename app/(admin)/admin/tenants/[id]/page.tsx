// Super Admin — Cockpit de Tenant
// Visão consolidada de um profissional: plano, histórico, feature overrides, notas CRM.

import Link from "next/link";
import { notFound } from "next/navigation";

import {
  loadTenantCockpitData,
  suspendTenantAction,
  reactivateTenantAction,
  changeTenantPlanAction,
  setTenantFeatureOverrideAction,
  addAdminNoteAction,
  deleteAdminNoteAction,
  recordPaymentEventAction,
} from "@/lib/actions/admin-platform";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardContent,
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const PLAN_SLUGS = ["free", "starter", "pro", "enterprise"] as const;

const EVENT_LABELS: Record<string, string> = {
  plan_changed: "Plano alterado",
  suspended: "Conta suspensa",
  unsuspended: "Conta reativada",
  payment_received: "Pagamento registado",
  trial_started: "Período de degustação iniciado",
  trial_expired: "Degustação expirada",
  feature_override_set: "Feature override definida",
  tenant_created: "Conta criada",
  tenant_blocked_lgpd: "Bloqueio LGPD aplicado",
  tenant_unblocked_lgpd: "Bloqueio LGPD removido",
  account_deleted: "Conta eliminada",
};

const FEATURE_LABELS: Record<string, string> = {
  feature_portal_externo: "Portal externo para pacientes",
  feature_pdf_export: "Exportação de PDF de dossiês",
  feature_csv_import: "Importação de dados via CSV",
  feature_api_access: "Acesso à API / tokens",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; err?: string }>;
};

const OK_MESSAGES: Record<string, string> = {
  suspended: "Tenant suspenso.",
  reactivated: "Tenant reativado.",
  plan_updated: "Plano atualizado.",
  feature_updated: "Feature override aplicada.",
  note_added: "Nota adicionada.",
  note_deleted: "Nota removida.",
  payment_recorded: "Pagamento registado.",
};

const ERR_MESSAGES: Record<string, string> = {
  invalid: "Dados inválidos.",
  save: "Erro ao salvar. Tente novamente.",
};

export default async function TenantCockpitPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { ok, err } = await searchParams;

  const result = await loadTenantCockpitData(id);
  if ("error" in result) notFound();

  const { profile, events, overrides, notes, plans, activityCounts } = result.data;

  const isLgpdBlocked =
    profile.lgpd_blocked_at != null && profile.lgpd_unblocked_at == null;
  const statusBadge = isLgpdBlocked
    ? { label: "LGPD bloqueado", cls: "bg-destructive/10 text-destructive border-destructive/30" }
    : profile.is_suspended
      ? { label: "Suspenso", cls: "bg-destructive/10 text-destructive border-destructive/30" }
      : { label: "Ativo", cls: "bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-300" };

  // Build feature keys to show: union of plan features + overrides + known list
  const knownFeatureKeys = Object.keys(FEATURE_LABELS);

  // Current plan's features
  const currentPlan = plans.find((p) => p.slug === profile.plan_slug);
  const overridesByKey = Object.fromEntries(overrides.map((o) => [o.feature_key, o]));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/admin/tenants"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-muted-foreground -ml-2 mb-1",
            )}
          >
            ← Tenants
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            {profile.full_name ?? "(sem nome)"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                statusBadge.cls,
              )}
            >
              {statusBadge.label}
            </span>
            <Badge variant="secondary">{profile.plan_slug}</Badge>
            {profile.acquisition_source && (
              <Badge variant="outline" className="text-xs">
                {profile.acquisition_source}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            CRN: {profile.crn ?? "—"} · Tel: {profile.phone ?? "—"} · Registado em{" "}
            {formatDate(profile.created_at)}
            {profile.last_active_at &&
              ` · Último acesso ${formatDate(profile.last_active_at)}`}
          </p>
        </div>
      </div>

      {/* ─── Feedback ────────────────────────────────────────────────── */}
      {ok && OK_MESSAGES[ok] ? (
        <p
          className="rounded border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-800 dark:text-green-200"
          role="status"
        >
          {OK_MESSAGES[ok]}
        </p>
      ) : null}
      {err && ERR_MESSAGES[err] ? (
        <p
          className="text-destructive rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm"
          role="alert"
        >
          {ERR_MESSAGES[err]}
        </p>
      ) : null}

      {/* ─── Grid principal ──────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Actividade */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Actividade</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(
                [
                  ["Clientes", activityCounts.clients],
                  ["Estabelecimentos", activityCounts.establishments],
                  ["Visitas", activityCounts.visits],
                  ["Receitas", activityCounts.recipes],
                  ["Tokens API", activityCounts.apiTokens],
                ] as [string, number][]
              ).map(([label, value]) => (
                <div key={label} className="space-y-0.5">
                  <dt className="text-muted-foreground text-xs">{label}</dt>
                  <dd className="text-lg font-semibold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        {/* Plano + datas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Plano atual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Slug: </span>
              <strong>{profile.plan_slug}</strong>
              {currentPlan && ` — ${currentPlan.name}`}
            </p>
            {currentPlan && (
              <p>
                <span className="text-muted-foreground">Preço: </span>
                {formatCents(currentPlan.price_monthly_cents)}/mês
              </p>
            )}
            {profile.plan_expires_at && (
              <p>
                <span className="text-muted-foreground">Expira: </span>
                {formatDate(profile.plan_expires_at)}
              </p>
            )}
            {profile.trial_started_at && (
              <p>
                <span className="text-muted-foreground">Degustação iniciada: </span>
                {formatDate(profile.trial_started_at)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Ações rápidas ───────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Ações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Alterar plano */}
          <form action={changeTenantPlanAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="tenant_id" value={profile.id} />
            <div className="space-y-1">
              <Label htmlFor="plan_slug_cockpit" className="text-xs">
                Alterar plano
              </Label>
              <Select name="plan_slug" defaultValue={profile.plan_slug}>
                <SelectTrigger id="plan_slug_cockpit" className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_SLUGS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="plan_expires_at_cockpit" className="text-xs">
                Expira em (opcional)
              </Label>
              <Input
                id="plan_expires_at_cockpit"
                name="plan_expires_at"
                type="date"
                className="h-8 w-40 text-xs"
                defaultValue={
                  profile.plan_expires_at
                    ? profile.plan_expires_at.slice(0, 10)
                    : ""
                }
              />
            </div>
            <Button type="submit" size="sm" variant="outline" className="h-8 text-xs">
              Salvar plano
            </Button>
          </form>

          <div className="border-border border-t pt-3">
            {/* Suspender / Reativar */}
            <div className="flex flex-wrap gap-2">
              {profile.is_suspended ? (
                <form action={reactivateTenantAction}>
                  <input type="hidden" name="tenant_id" value={profile.id} />
                  <Button type="submit" size="sm" variant="outline" className="text-xs">
                    Reativar conta
                  </Button>
                </form>
              ) : (
                <form action={suspendTenantAction} className="flex flex-wrap gap-2 items-center">
                  <input type="hidden" name="tenant_id" value={profile.id} />
                  <Input
                    name="reason"
                    placeholder="Motivo da suspensão (opcional)"
                    className="h-8 w-64 text-xs"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="destructive"
                    className="h-8 text-xs"
                  >
                    Suspender conta
                  </Button>
                </form>
              )}
            </div>
          </div>

          {/* Registar pagamento manual */}
          <div className="border-border border-t pt-3">
            <p className="text-muted-foreground mb-2 text-xs font-medium">
              Registar pagamento manual
            </p>
            <form action={recordPaymentEventAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="tenant_user_id" value={profile.user_id} />
              <input type="hidden" name="profile_id" value={profile.id} />
              <div className="space-y-1">
                <Label htmlFor="amount_cents" className="text-xs">
                  Valor (centavos)
                </Label>
                <Input
                  id="amount_cents"
                  name="amount_cents"
                  type="number"
                  min="1"
                  placeholder="4900"
                  className="h-8 w-28 text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="payment_notes" className="text-xs">
                  Observação
                </Label>
                <Input
                  id="payment_notes"
                  name="notes"
                  placeholder="ex: PIX manual"
                  className="h-8 w-48 text-xs"
                />
              </div>
              <Button type="submit" size="sm" variant="secondary" className="h-8 text-xs">
                Registar
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* ─── Feature Overrides ───────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Feature overrides</CardTitle>
          <p className="text-muted-foreground text-xs">
            Overrides têm precedência sobre o plano. Deixe sem override para
            usar o padrão do plano.
          </p>
        </CardHeader>
        <CardContent>
          <ul className="divide-border divide-y text-sm">
            {knownFeatureKeys.map((key) => {
              const override = overridesByKey[key];
              const planDefault =
                currentPlan?.[key as keyof typeof currentPlan] ?? false;
              const effectiveValue =
                override !== undefined ? override.enabled : Boolean(planDefault);

              return (
                <li key={key} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">
                      {FEATURE_LABELS[key] ?? key}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Plano base:{" "}
                      <span className={planDefault ? "text-green-600" : "text-muted-foreground"}>
                        {planDefault ? "ativo" : "inativo"}
                      </span>
                      {override !== undefined && (
                        <>
                          {" "}· Override:{" "}
                          <span className={override.enabled ? "text-green-600" : "text-destructive"}>
                            {override.enabled ? "ativado" : "desativado"}
                          </span>
                          {override.reason && ` (${override.reason})`}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <form action={setTenantFeatureOverrideAction}>
                      <input type="hidden" name="tenant_user_id" value={profile.user_id} />
                      <input type="hidden" name="profile_id" value={profile.id} />
                      <input type="hidden" name="feature_key" value={key} />
                      <input type="hidden" name="enabled" value="true" />
                      <Button
                        type="submit"
                        size="sm"
                        variant={effectiveValue ? "default" : "outline"}
                        className="h-7 text-xs"
                      >
                        Ativar
                      </Button>
                    </form>
                    <form action={setTenantFeatureOverrideAction}>
                      <input type="hidden" name="tenant_user_id" value={profile.user_id} />
                      <input type="hidden" name="profile_id" value={profile.id} />
                      <input type="hidden" name="feature_key" value={key} />
                      <input type="hidden" name="enabled" value="false" />
                      <Button
                        type="submit"
                        size="sm"
                        variant={!effectiveValue ? "destructive" : "outline"}
                        className="h-7 text-xs"
                      >
                        Desativar
                      </Button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {/* ─── Notas CRM ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Notas CRM</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add note */}
          <form action={addAdminNoteAction} className="space-y-2">
            <input type="hidden" name="tenant_user_id" value={profile.user_id} />
            <input type="hidden" name="profile_id" value={profile.id} />
            <Textarea
              name="body"
              placeholder="Adicionar nota interna sobre este tenant…"
              className="min-h-[72px] text-sm"
              required
            />
            <Button type="submit" size="sm" variant="outline" className="text-xs">
              + Adicionar nota
            </Button>
          </form>

          {/* Notes list */}
          {notes.length === 0 ? (
            <p className="text-muted-foreground text-xs">Sem notas.</p>
          ) : (
            <ul className="divide-border divide-y">
              {notes.map((note) => (
                <li key={note.id} className="flex items-start gap-3 py-3">
                  <div className="flex-1 space-y-0.5">
                    <p className="text-sm leading-snug">{note.body}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatDateTime(note.created_at)}
                    </p>
                  </div>
                  <form action={deleteAdminNoteAction}>
                    <input type="hidden" name="note_id" value={note.id} />
                    <input type="hidden" name="profile_id" value={profile.id} />
                    <button
                      type="submit"
                      className="text-muted-foreground hover:text-destructive mt-0.5 text-xs transition-colors"
                      aria-label="Apagar nota"
                    >
                      ✕
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ─── Histórico de eventos ────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Histórico de subscrição</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-muted-foreground text-xs">Sem eventos.</p>
          ) : (
            <ol className="relative ml-2 border-l border-border space-y-4 pl-5">
              {events.map((ev) => {
                const isPayment = ev.event_type === "payment_received";
                const isSuspend =
                  ev.event_type === "suspended" ||
                  ev.event_type === "tenant_blocked_lgpd";
                const isGood =
                  ev.event_type === "unsuspended" ||
                  ev.event_type === "tenant_unblocked_lgpd" ||
                  ev.event_type === "payment_received" ||
                  ev.event_type === "tenant_created";

                return (
                  <li key={ev.id} className="relative">
                    {/* Timeline dot */}
                    <span
                      className={cn(
                        "absolute -left-[1.3rem] top-1 h-2.5 w-2.5 rounded-full border-2 border-background",
                        isSuspend
                          ? "bg-destructive"
                          : isGood
                            ? "bg-green-500"
                            : "bg-muted-foreground",
                      )}
                      aria-hidden
                    />
                    <p className="text-sm font-medium leading-none">
                      {EVENT_LABELS[ev.event_type] ?? ev.event_type}
                    </p>
                    {(ev.old_value || ev.new_value) && (
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {ev.old_value && `${ev.old_value} → `}
                        {ev.new_value}
                        {isPayment &&
                          ` (${formatCents(Number(ev.new_value))})`}
                      </p>
                    )}
                    {ev.metadata &&
                      typeof ev.metadata === "object" &&
                      "notes" in ev.metadata &&
                      ev.metadata.notes ? (
                      <p className="text-muted-foreground mt-0.5 text-xs italic">
                        {String(ev.metadata.notes)}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {formatDateTime(ev.created_at)}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
