import type { EstablishmentType } from "@/lib/types/establishments";

export type PopTemplateRow = {
  id: string;
  establishment_type: EstablishmentType;
  name: string;
  description: string | null;
  body: string;
  position: number;
};

export type EstablishmentPopRow = {
  id: string;
  establishment_id: string;
  title: string;
  source_template_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PopVersionRow = {
  id: string;
  pop_id: string;
  version_number: number;
  title: string;
  body: string;
  created_at: string;
};

export type EstablishmentPopListItem = EstablishmentPopRow & {
  latest_version_number: number;
};
