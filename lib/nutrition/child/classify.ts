/**
 * Classificação por percentil — rótulos e pontos de corte conforme o
 * "Procedimento de Avaliação Nutricional" (Saber Nutrir), baseado nas curvas
 * OMS 2006/2007. Compara a medida diretamente com as colunas do documento.
 *
 * Convenção de fronteira do procedimento: o valor igual a um corte cai na faixa
 * SUPERIOR (ex.: ≥ P85 já é Sobrepeso; ≥ P97 já é Obesidade).
 *
 * As sub-faixas extremas que exigem P0,1/P99,9 (ex.: "Peso muito baixo para a
 * idade", < P0,1) só aparecem no critério escore-Z — não há essas colunas nas
 * tabelas de percentil.
 */
import type { ChildColor, ChildIndicator, PercentileRow } from "./types";

export type ClassificationOutcome = {
  classification: string;
  color: ChildColor;
};

// Índices das colunas-chave dentro de PercentileRow (ver PERCENTILE_KEYS).
const P3 = 1;
const P85 = 7;
const P97 = 9;

export function classifyByPercentile(
  indicator: ChildIndicator,
  _ageMonths: number,
  value: number,
  row: PercentileRow,
): ClassificationOutcome {
  const p3 = row[P3];
  const p85 = row[P85];
  const p97 = row[P97];

  switch (indicator) {
    case "bmi_for_age": {
      if (value < p3) return { classification: "Baixo IMC para idade", color: "yellow" };
      if (value < p85) return { classification: "IMC adequado ou eutrófico", color: "green" };
      if (value < p97) return { classification: "Sobrepeso", color: "yellow" };
      return { classification: "Obesidade", color: "red" };
    }

    case "weight_for_age": {
      if (value < p3) return { classification: "Peso baixo para a idade", color: "yellow" };
      if (value < p97) return { classification: "Peso adequado ou eutrófico", color: "green" };
      return { classification: "Peso elevado para a idade", color: "yellow" };
    }

    case "weight_for_height": {
      if (value < p3) return { classification: "Peso baixo para a estatura", color: "yellow" };
      if (value < p97) return { classification: "Peso adequado ou eutrófico", color: "green" };
      return { classification: "Peso elevado para a estatura", color: "yellow" };
    }

    case "height_for_age": {
      if (value < p3) return { classification: "Baixa estatura para a idade", color: "yellow" };
      return { classification: "Estatura adequada para a idade", color: "green" };
    }

    case "arm_circumference_for_age": {
      if (value < p3)  return { classification: "CB baixa para a idade",    color: "yellow" };
      if (value < p97) return { classification: "CB adequada para a idade",  color: "green"  };
      return                 { classification: "CB elevada para a idade",   color: "yellow" };
    }

    case "triceps_skinfold_for_age": {
      if (value < p3)  return { classification: "PCT baixa para a idade",   color: "yellow" };
      if (value < p97) return { classification: "PCT adequada para a idade", color: "green"  };
      return                 { classification: "PCT elevada para a idade",  color: "yellow" };
    }

    case "subscapular_skinfold_for_age": {
      if (value < p3)  return { classification: "SE baixa para a idade",    color: "yellow" };
      if (value < p97) return { classification: "SE adequada para a idade",  color: "green"  };
      return                 { classification: "SE elevada para a idade",   color: "yellow" };
    }

    case "head_circumference_for_age": {
      if (value < p3)  return { classification: "Microcefalia",              color: "red"    };
      if (value < p97) return { classification: "PC adequado para a idade",  color: "green"  };
      return                 { classification: "Macrocefalia",              color: "yellow" };
    }
  }
}
