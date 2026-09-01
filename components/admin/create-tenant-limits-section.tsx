"use client";

import { useState } from "react";
import { Building2, SlidersHorizontal, UsersRound } from "lucide-react";

import { AdminFormSectionCard } from "@/components/admin/admin-form-section-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_NEW_TENANT_LIMITS,
  MAX_TENANT_LIMIT,
} from "@/lib/admin/tenant-limits-defaults";
import { cn } from "@/lib/utils";

/**
 * Etapa "Limites" do wizard de criação de tenant (T4).
 * Plano: docs/plano-limites-tenant-e-billing.md §6.1
 *
 * Os valores nascem dos defaults da migration (25/25/equipe desabilitada) para
 * que o wizard e o banco não divirjam.
 */
export function CreateTenantLimitsSection() {
  const [clientsEnabled, setClientsEnabled] = useState<boolean>(
    DEFAULT_NEW_TENANT_LIMITS.clients_limit_enabled,
  );
  const [patientsEnabled, setPatientsEnabled] = useState<boolean>(
    DEFAULT_NEW_TENANT_LIMITS.patients_limit_enabled,
  );
  const [teamEnabled, setTeamEnabled] = useState<boolean>(
    DEFAULT_NEW_TENANT_LIMITS.team_members_enabled,
  );
  const [teamUnlimited, setTeamUnlimited] = useState<boolean>(
    DEFAULT_NEW_TENANT_LIMITS.team_members_unlimited,
  );

  return (
    <AdminFormSectionCard
      title="Limites"
      description="Gravados nesta conta especificamente. Não é configuração global — cada tenant tem os seus."
      icon={SlidersHorizontal}
    >
      <div className="space-y-5">
        {/* ─── Clientes ─────────────────────────────────────────────── */}
        <fieldset className="space-y-3 rounded-xl border p-4">
          <legend className="text-foreground flex items-center gap-2 px-1 text-sm font-medium">
            <Building2 className="size-3.5" aria-hidden />
            Clientes
          </legend>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              name="clients_limit_enabled"
              type="checkbox"
              checked={clientsEnabled}
              onChange={(e) => setClientsEnabled(e.target.checked)}
              className="border-input size-4 accent-primary"
            />
            Aplicar limite de clientes
          </label>

          <div className={cn("space-y-2", !clientsEnabled && "opacity-50")}>
            <Label htmlFor="clients_limit" className="text-xs">
              Máximo de clientes
            </Label>
            <Input
              id="clients_limit"
              name="clients_limit"
              type="number"
              min={1}
              max={MAX_TENANT_LIMIT}
              defaultValue={DEFAULT_NEW_TENANT_LIMITS.clients_limit}
              disabled={!clientsEnabled}
              className="w-32"
            />
          </div>
        </fieldset>

        {/* ─── Pacientes ────────────────────────────────────────────── */}
        <fieldset className="space-y-3 rounded-xl border p-4">
          <legend className="text-foreground flex items-center gap-2 px-1 text-sm font-medium">
            <UsersRound className="size-3.5" aria-hidden />
            Pacientes
          </legend>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              name="patients_limit_enabled"
              type="checkbox"
              checked={patientsEnabled}
              onChange={(e) => setPatientsEnabled(e.target.checked)}
              className="border-input size-4 accent-primary"
            />
            Aplicar limite de pacientes
          </label>

          <div className={cn("space-y-2", !patientsEnabled && "opacity-50")}>
            <Label htmlFor="patients_limit" className="text-xs">
              Máximo de pacientes
            </Label>
            <Input
              id="patients_limit"
              name="patients_limit"
              type="number"
              min={1}
              max={MAX_TENANT_LIMIT}
              defaultValue={DEFAULT_NEW_TENANT_LIMITS.patients_limit}
              disabled={!patientsEnabled}
              className="w-32"
            />
          </div>

          <p className="text-muted-foreground text-xs leading-relaxed">
            O limite de pacientes é independente do de clientes.
          </p>
        </fieldset>

        {/* ─── Equipe ───────────────────────────────────────────────── */}
        <fieldset className="space-y-3 rounded-xl border p-4">
          <legend className="text-foreground flex items-center gap-2 px-1 text-sm font-medium">
            <UsersRound className="size-3.5" aria-hidden />
            Equipe
          </legend>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              name="team_members_enabled"
              type="checkbox"
              checked={teamEnabled}
              onChange={(e) => setTeamEnabled(e.target.checked)}
              className="border-input size-4 accent-primary"
            />
            Permitir cadastro de membros de equipe
          </label>

          <div className={cn("space-y-3", !teamEnabled && "opacity-50")}>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                name="team_members_unlimited"
                type="checkbox"
                checked={teamUnlimited}
                onChange={(e) => setTeamUnlimited(e.target.checked)}
                disabled={!teamEnabled}
                className="border-input size-4 accent-primary"
              />
              Assentos ilimitados
            </label>

            <div className={cn("space-y-2", teamUnlimited && "opacity-50")}>
              <Label htmlFor="team_members_limit" className="text-xs">
                Quantidade de assentos
              </Label>
              <Input
                id="team_members_limit"
                name="team_members_limit"
                type="number"
                min={0}
                max={MAX_TENANT_LIMIT}
                defaultValue={DEFAULT_NEW_TENANT_LIMITS.team_members_limit}
                disabled={!teamEnabled || teamUnlimited}
                className="w-32"
              />
            </div>
          </div>

          <p className="text-muted-foreground text-xs leading-relaxed">
            Cada assento adicional é cobrado à parte. Membro desativado não ocupa
            assento.
          </p>
        </fieldset>
      </div>
    </AdminFormSectionCard>
  );
}
