import type { ClientLifecycleStatus } from "@/lib/types/clients";

export type EstablishmentType =
  | "escola"
  | "hospital"
  | "clinica"
  | "lar_idosos"
  | "empresa";

export type EstablishmentRow = {
  id: string;
  client_id: string;
  name: string;
  establishment_type: EstablishmentType;
  address_line1: string;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  created_at: string;
  updated_at: string;
};

/** Estabelecimento com dados do cliente PJ para rótulos na UI (ex.: checklists). */
export type EstablishmentWithClientNames = EstablishmentRow & {
  clients: {
    legal_name: string;
    trade_name: string | null;
    lifecycle_status: ClientLifecycleStatus;
  };
};

/** Estabelecimento simples para listas (ex.: seletor em modais). */
export type EstablishmentListItem = EstablishmentRow;

/** Opção pronta para picker/busca de estabelecimento na UI. */
export type EstablishmentPickerOption = {
  id: string;
  label: string;
  state: string | null;
  establishment_type: EstablishmentType;
};
