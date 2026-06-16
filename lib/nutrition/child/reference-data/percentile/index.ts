/** Gerado por scripts/reference/build_child_growth_tables.py — não editar à mão. */
import { bmiForAgeFemale } from "./bmi-for-age.female";
import { bmiForAgeMale } from "./bmi-for-age.male";
import { weightForAgeFemale } from "./weight-for-age.female";
import { weightForAgeMale } from "./weight-for-age.male";
import { heightForAgeFemale } from "./height-for-age.female";
import { heightForAgeMale } from "./height-for-age.male";
import { armCircumferenceForAgeFemale } from "./arm-circumference-for-age.female";
import { armCircumferenceForAgeMale } from "./arm-circumference-for-age.male";
import { tricepsSkinfoldForAgeFemale } from "./triceps-skinfold-for-age.female";
import { tricepsSkinfoldForAgeMale } from "./triceps-skinfold-for-age.male";
import { subscapularSkinfoldForAgeFemale } from "./subscapular-skinfold-for-age.female";
import { subscapularSkinfoldForAgeMale } from "./subscapular-skinfold-for-age.male";
import { headCircumferenceForAgeFemale } from "./head-circumference-for-age.female";
import { headCircumferenceForAgeMale } from "./head-circumference-for-age.male";
import type { PercentileTable } from "../../types";

export const PERCENTILE_TABLES: Record<string, PercentileTable> = {
  "bmi_for_age:female": bmiForAgeFemale,
  "bmi_for_age:male": bmiForAgeMale,
  "weight_for_age:female": weightForAgeFemale,
  "weight_for_age:male": weightForAgeMale,
  "height_for_age:female": heightForAgeFemale,
  "height_for_age:male": heightForAgeMale,
  "arm_circumference_for_age:female": armCircumferenceForAgeFemale,
  "arm_circumference_for_age:male": armCircumferenceForAgeMale,
  "triceps_skinfold_for_age:female": tricepsSkinfoldForAgeFemale,
  "triceps_skinfold_for_age:male": tricepsSkinfoldForAgeMale,
  "subscapular_skinfold_for_age:female": subscapularSkinfoldForAgeFemale,
  "subscapular_skinfold_for_age:male": subscapularSkinfoldForAgeMale,
  "head_circumference_for_age:female": headCircumferenceForAgeFemale,
  "head_circumference_for_age:male": headCircumferenceForAgeMale,
};
