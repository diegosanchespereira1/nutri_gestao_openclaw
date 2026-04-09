import type { ClientLifecycleStatus } from "@/lib/types/clients";

export type PatientSex = "female" | "male" | "other";

export type PatientRow = {
  id: string;
  /** Tenant directo. Sempre populado. */
  user_id: string;
  /** Nullable — paciente pode ser independente (sem cliente associado). */
  client_id: string | null;
  establishment_id: string | null;
  full_name: string;
  birth_date: string | null;
  document_id: string | null;
  sex: PatientSex | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/** Resposta de listagem com joins (PostgREST). */
export type PatientWithContext = PatientRow & {
  clients: {
    legal_name: string;
    kind: string;
    lifecycle_status: ClientLifecycleStatus;
  } | null;
  establishments: { name: string } | null;
};
