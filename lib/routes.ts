/** Rota principal da área logada (dashboard). */
export const APP_DASHBOARD_PATH = "/dashboard" as const;

/** Rota legada — redireciona para {@link APP_DASHBOARD_PATH}. */
export const LEGACY_INICIO_PATH = "/inicio" as const;

/** Lista completa de checklists com validade expirada. */
export const CHECKLISTS_VENCIDOS_PATH = "/checklists/vencidos" as const;

/** Lista completa de checklists com validade nos próximos 90 dias. */
export const CHECKLISTS_A_VENCER_PATH = "/checklists/a-vencer" as const;
