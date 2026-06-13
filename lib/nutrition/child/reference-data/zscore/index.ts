/**
 * Encaixe para as tabelas de referência por ESCORE-Z (a subir depois).
 *
 * Hoje os mapas estão vazios — o critério escore-Z fica indisponível na UI até
 * que estas tabelas sejam carregadas. Quando o usuário fornecer a edição de
 * escore-Z das curvas OMS, popule cada tabela com a mesma chave (idade em meses)
 * e o motor passa a oferecer o critério automaticamente (ver registry.ts).
 *
 * Ver README.md neste diretório para o formato esperado.
 */
import type { PercentileTable } from "../../types";

// Vazio de propósito. Não remover: o registry depende destas chaves.
export const ZSCORE_TABLES: Record<string, PercentileTable> = {};
