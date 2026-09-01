/**
 * Leitura e validação do formulário de limites do painel super_admin (T4).
 * Plano: docs/plano-limites-tenant-e-billing.md §6.2
 *
 * Pura de propósito: `lib/actions/**` está fora do include do vitest, então a
 * validação vive aqui e é testada.
 */
export type TenantLimitsInput = {
  clients_limit_enabled: boolean;
  clients_limit: number;
  patients_limit_enabled: boolean;
  patients_limit: number;
  team_members_enabled: boolean;
  team_members_unlimited: boolean;
  team_members_limit: number;
  notes: string | null;
};

export type ParsedTenantLimits =
  | { ok: true; value: TenantLimitsInput }
  | { ok: false; error: string };

const MAX_LIMIT = 100_000;

function parseCheckbox(raw: FormDataEntryValue | null): boolean {
  return raw === "on" || raw === "true" || raw === "1";
}

function parseLimit(
  raw: FormDataEntryValue | null,
  rotulo: string,
): { ok: true; value: number } | { ok: false; error: string } {
  const texto = String(raw ?? "").trim();
  if (!texto) return { ok: true, value: 0 };
  if (!/^\d+$/.test(texto)) {
    return { ok: false, error: `${rotulo}: informe um número inteiro.` };
  }
  const n = Number(texto);
  if (n > MAX_LIMIT) {
    return { ok: false, error: `${rotulo}: valor máximo é ${MAX_LIMIT}.` };
  }
  return { ok: true, value: n };
}

export function parseTenantLimitsForm(formData: FormData): ParsedTenantLimits {
  const clientsEnabled = parseCheckbox(formData.get("clients_limit_enabled"));
  const patientsEnabled = parseCheckbox(formData.get("patients_limit_enabled"));
  const teamEnabled = parseCheckbox(formData.get("team_members_enabled"));
  const teamUnlimited = parseCheckbox(formData.get("team_members_unlimited"));

  const clients = parseLimit(formData.get("clients_limit"), "Limite de clientes");
  if (!clients.ok) return clients;

  const patients = parseLimit(formData.get("patients_limit"), "Limite de pacientes");
  if (!patients.ok) return patients;

  const team = parseLimit(formData.get("team_members_limit"), "Assentos de equipe");
  if (!team.ok) return team;

  // Ligar o limite com valor 0 bloqueia o tenant por completo — quase sempre é
  // engano de digitação. Para bloquear de verdade existe o campo de suspensão.
  if (clientsEnabled && clients.value === 0) {
    return {
      ok: false,
      error: "Limite de clientes ligado com valor 0 impediria qualquer cadastro. Use a suspensão da conta para bloquear o tenant.",
    };
  }
  if (patientsEnabled && patients.value === 0) {
    return {
      ok: false,
      error: "Limite de pacientes ligado com valor 0 impediria qualquer cadastro. Use a suspensão da conta para bloquear o tenant.",
    };
  }
  if (teamEnabled && !teamUnlimited && team.value === 0) {
    return {
      ok: false,
      error: "Equipe habilitada com 0 assentos não permite cadastrar ninguém. Marque 'assentos ilimitados' ou informe uma quantidade.",
    };
  }

  const notes = String(formData.get("notes") ?? "").trim();

  return {
    ok: true,
    value: {
      clients_limit_enabled: clientsEnabled,
      clients_limit: clients.value,
      patients_limit_enabled: patientsEnabled,
      patients_limit: patients.value,
      team_members_enabled: teamEnabled,
      team_members_unlimited: teamEnabled && teamUnlimited,
      team_members_limit: team.value,
      notes: notes.length > 0 ? notes.slice(0, 500) : null,
    },
  };
}

/** Aviso (não bloqueio) quando o limite a ligar já é menor que o uso atual. */
export function limitsBelowUsageWarnings(
  value: Omit<TenantLimitsInput, "notes">,
  usage: { clients: number; patients: number; teamMembers: number },
): string[] {
  const avisos: string[] = [];
  if (value.clients_limit_enabled && usage.clients > value.clients_limit) {
    avisos.push(
      `O tenant já tem ${usage.clients} clientes, acima do limite de ${value.clients_limit}. Os existentes continuam; novos cadastros ficam bloqueados.`,
    );
  }
  if (value.patients_limit_enabled && usage.patients > value.patients_limit) {
    avisos.push(
      `O tenant já tem ${usage.patients} pacientes, acima do limite de ${value.patients_limit}. Os existentes continuam; novos cadastros ficam bloqueados.`,
    );
  }
  if (
    value.team_members_enabled &&
    !value.team_members_unlimited &&
    usage.teamMembers > value.team_members_limit
  ) {
    avisos.push(
      `O tenant já tem ${usage.teamMembers} membros ativos, acima de ${value.team_members_limit} assentos. Nenhum é desativado automaticamente.`,
    );
  }
  return avisos;
}
