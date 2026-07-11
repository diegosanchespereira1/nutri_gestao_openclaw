import type { RecipeLineUnit } from "@/lib/constants/recipe-line-units";
import type { RecipeContext } from "@/lib/types/technical-recipes";

export type RawMaterialRow = {
  id: string;
  owner_user_id: string;
  name: string;
  price_unit: RecipeLineUnit;
  unit_price_brl: number;
  notes: string | null;
  /** Cliente dono do item. NULL = ainda não migrado (legado, ver plano de isolamento por cliente). */
  client_id: string | null;
  /** Preenchido quando contexto = ESTABELECIMENTO. */
  establishment_id: string | null;
  /**
   * ESTABELECIMENTO = vinculada a um estabelecimento específico.
   * REPOSITORIO = padrão do cliente, reutilizável em todos os estabelecimentos
   * DESTE cliente (nunca de outros clientes do tenant).
   * NULL = legado, ainda não migrado.
   */
  contexto: RecipeContext | null;
  created_at: string;
  updated_at: string;
};
