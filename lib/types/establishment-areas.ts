export type EstablishmentAreaRow = {
  id: string;
  establishment_id: string;
  owner_user_id: string;
  name: string;
  description: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type EstablishmentAreaInsert = {
  establishment_id: string;
  owner_user_id: string;
  name: string;
  description?: string | null;
  position?: number;
};

export type EstablishmentAreaUpdate = {
  name?: string;
  description?: string | null;
  position?: number;
};

/** Opção leve para selects/pickers na UI. */
export type EstablishmentAreaOption = {
  id: string;
  name: string;
  description: string | null;
  position: number;
};
