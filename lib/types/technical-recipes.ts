import type { RecipeLineUnit } from "@/lib/constants/recipe-line-units";
import type { RawMaterialRow } from "@/lib/types/raw-materials";
import type { TacoReferenceFoodRow } from "@/lib/types/taco-reference-foods";

export type TechnicalRecipeStatus = "draft" | "published";

/** FR-REC-001: Contexto explícito de armazenamento da receita. */
export type RecipeContext = "ESTABELECIMENTO" | "REPOSITORIO";

export type TechnicalRecipeRow = {
  id: string;
  /** FR-REC-001: Contexto da receita. ESTABELECIMENTO = vinculada a um local; REPOSITORIO = genérica e reutilizável. */
  contexto: RecipeContext;
  /** Obrigatório quando contexto = ESTABELECIMENTO. Null quando contexto = REPOSITORIO. */
  establishment_id: string | null;
  /** Cliente PJ dono da receita (obrigatório na BD). */
  client_id: string;
  /** FR-REC-001: ID da receita do Repositório usada como origem. Null se criada do zero. */
  repository_origin_id: string | null;
  name: string;
  status: TechnicalRecipeStatus;
  /** Número de porções que a receita rende (preço e nutrição por porção). */
  portions_yield: number;
  /** Margem de venda sobre o custo (%). */
  margin_percent: number;
  /** Impostos incidentes sobre o preço sugerido (%). */
  tax_percent: number;
  /** Classificação do prato (bebida, entrada, prato-principal, sobremesa). */
  classification?: string | null;
  /** Setor/departamento onde a receita é preparada. */
  sector?: string | null;
  /** Custo dos Materiais Vendidos (%). Padrão: 25%. */
  cmv_percent?: number;
  /** Flag para indicar se é um template reutilizável. */
  is_template: boolean;
  created_at: string;
  updated_at: string;
};

export type TechnicalRecipeLineRow = {
  id: string;
  recipe_id: string;
  sort_order: number;
  ingredient_name: string;
  quantity: number;
  unit: RecipeLineUnit;
  notes: string | null;
  taco_food_id: string | null;
  /** Preenchido quando a linha vem do servidor com join TACO. */
  taco_food: TacoReferenceFoodRow | null;
  raw_material_id: string | null;
  /** Join `professional_raw_materials` quando salvo. */
  raw_material: RawMaterialRow | null;
  /** Multiplicador na quantidade para custo de matéria-prima (perdas / limpeza). */
  correction_factor: number;
  /** Multiplicador na quantidade para nutrição TACO (ajuste de estado / cocção). */
  cooking_factor: number;
};

export type TechnicalRecipeWithLines = TechnicalRecipeRow & {
  lines: TechnicalRecipeLineRow[];
};

export type TechnicalRecipeListItem = TechnicalRecipeRow & {
  establishments: {
    name: string;
    client_id: string;
    clients: { legal_name: string; trade_name: string | null } | null;
  } | null;
  /** Join opcional quando `establishment_id` é null (catálogo do cliente). */
  recipe_scope_client?: {
    legal_name: string;
    trade_name: string | null;
  } | null;
  /** Favorito do template ao nível do cliente PJ (partilhado entre estabelecimentos do mesmo cliente). */
  is_template_favorite?: boolean;
};
