/**
 * Encaixe para a tabela de PESO POR ESTATURA (P/E) — a subir depois.
 *
 * Diferente dos demais indicadores, o P/E é indexado pela ESTATURA (não pela
 * idade). A chave é a estatura em MILÍMETROS (inteiro) para evitar chaves
 * decimais; ex.: 1200 = 120,0 cm. O valor é a linha de percentis (mesma ordem
 * de PERCENTILE_KEYS).
 *
 * Hoje os mapas estão vazios — o indicador P/E só é exibido quando a tabela OMS
 * de peso-por-estatura/comprimento for carregada. Ver README.md.
 */
import type { PercentileTable } from "../../types";

// key = sexo ("female" | "male"); tabela key = estatura em mm.
export const WEIGHT_FOR_HEIGHT_TABLES: Record<string, PercentileTable> = {};
