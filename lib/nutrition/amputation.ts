/**
 * Correção do Peso Estimado para membros amputados.
 *
 * Quando parte do corpo está amputada, o peso estimado calculado pelas
 * equações padrão subestima o peso "completo" do indivíduo. A correção
 * divide o PE calculado pelo complemento da fração amputada:
 *
 *   PE corrigido = PE × 100 / (100 − % amputado)
 *
 * Valores típicos de % amputado por segmento (tabela de Osterkamp, 1995):
 *   - Pé:         1,8%
 *   - Perna + pé: 5,9%
 *   - Coxa:       10,0%
 *   - Mão:        0,8%
 *   - Antebraço + mão: 2,3%
 *   - Braço:      6,5%
 *
 * @param peKg    Peso Estimado calculado pelas equações padrão (kg).
 * @param ampPct  Percentual do segmento amputado (0–99,9).
 * @returns Peso corrigido em kg. Se ampPct for 0 ou negativo, retorna peKg sem alteração.
 */
export function correcaoAmputacao(peKg: number, ampPct: number): number {
  if (ampPct <= 0) return peKg;
  return (peKg * 100) / (100 - ampPct);
}

/**
 * Correção do IMC para membro amputado.
 *
 * IMC corrigido = IMC calculado com PE × (1 − ampPct/100)
 *
 * Equivale a remover a contribuição da massa faltante do numerador
 * sem alterar a altura estimada.
 *
 * @param imc    IMC calculado com o PE já corrigido (kg/m²).
 * @param ampPct Percentual amputado.
 * @returns IMC corrigido, ou imc sem alteração se ampPct ≤ 0.
 */
export function correcaoImcAmputacao(imc: number, ampPct: number): number {
  if (ampPct <= 0) return imc;
  return imc * (1 - ampPct / 100);
}
