/** Gerado por scripts/reference/build_child_growth_tables.py — não editar à mão. */
import { bmiForAgeFemale } from "./bmi-for-age.female";
import { bmiForAgeMale } from "./bmi-for-age.male";
import { weightForAgeFemale } from "./weight-for-age.female";
import { weightForAgeMale } from "./weight-for-age.male";
import { heightForAgeFemale } from "./height-for-age.female";
import { heightForAgeMale } from "./height-for-age.male";
import type { PercentileTable } from "../../types";

export const PERCENTILE_TABLES: Record<string, PercentileTable> = {
  "bmi_for_age:female": bmiForAgeFemale,
  "bmi_for_age:male": bmiForAgeMale,
  "weight_for_age:female": weightForAgeFemale,
  "weight_for_age:male": weightForAgeMale,
  "height_for_age:female": heightForAgeFemale,
  "height_for_age:male": heightForAgeMale,
};
