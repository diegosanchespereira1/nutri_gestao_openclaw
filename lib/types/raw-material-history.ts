// Histórico de alterações de preço/nome (e demais campos) de uma
// matéria-prima. Persistido em `application_activity_log` — sem tabela
// própria — mesmo mecanismo já usado pelo histórico de responsável do
// paciente (lib/actions/patient-responsible-history.ts).

export type RawMaterialChangeSource =
  | "manual_edit"
  | "bulk_price_import"
  | "bulk_create_import";

export type RawMaterialChangedField = "name" | "price_unit" | "unit_price_brl" | "notes";

export type RawMaterialFieldDiff<T> = { old: T; new: T };

export type RawMaterialChangeFields = {
  name?: RawMaterialFieldDiff<string>;
  price_unit?: RawMaterialFieldDiff<string>;
  unit_price_brl?: RawMaterialFieldDiff<number>;
  notes?: RawMaterialFieldDiff<string | null>;
};

export type RawMaterialChangeEvent = {
  id: string;
  occurred_at: string;
  actor_user_id: string;
  actor_full_name: string | null;
  source: RawMaterialChangeSource;
  fields: RawMaterialChangeFields;
  summary: string;
};
