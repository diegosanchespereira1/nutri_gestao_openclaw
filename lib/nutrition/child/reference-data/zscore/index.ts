/**
 * Tabelas de referência por ESCORE-Z — WHO Child Growth Standards.
 *
 * Indicadores existentes (P/I, E/I, IMC/I) continuam indisponíveis em escore-Z
 * até que seus datasets sejam fornecidos.
 *
 * Novos indicadores (CB, PCT, SE, PC) já têm tabelas carregadas.
 * Ver README.md neste diretório para o formato esperado.
 */
import type { PercentileTable } from "../../types";
import { armCircumferenceForAgeFemale } from "./arm-circumference-for-age.female";
import { armCircumferenceForAgeMale } from "./arm-circumference-for-age.male";
import { tricepsSkinfoldForAgeFemale } from "./triceps-skinfold-for-age.female";
import { tricepsSkinfoldForAgeMale } from "./triceps-skinfold-for-age.male";
import { subscapularSkinfoldForAgeFemale } from "./subscapular-skinfold-for-age.female";
import { subscapularSkinfoldForAgeMale } from "./subscapular-skinfold-for-age.male";
import { headCircumferenceForAgeFemale } from "./head-circumference-for-age.female";
import { headCircumferenceForAgeMale } from "./head-circumference-for-age.male";

export const ZSCORE_TABLES: Record<string, PercentileTable> = {
  "arm_circumference_for_age:female": armCircumferenceForAgeFemale,
  "arm_circumference_for_age:male": armCircumferenceForAgeMale,
  "triceps_skinfold_for_age:female": tricepsSkinfoldForAgeFemale,
  "triceps_skinfold_for_age:male": tricepsSkinfoldForAgeMale,
  "subscapular_skinfold_for_age:female": subscapularSkinfoldForAgeFemale,
  "subscapular_skinfold_for_age:male": subscapularSkinfoldForAgeMale,
  "head_circumference_for_age:female": headCircumferenceForAgeFemale,
  "head_circumference_for_age:male": headCircumferenceForAgeMale,
};
