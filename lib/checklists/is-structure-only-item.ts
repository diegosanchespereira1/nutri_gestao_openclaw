/**
 * Item de modelo usado só como agrupador visual (subseção), sem resposta Sim/Não/NA,
 * sem fotos e fora do cálculo de score.
 *
 * **Padrão do projeto** (novos checklists com estrutura tipo Anexo II / RDC-275):
 * persistir `is_structure_only = true` nas tabelas de itens; `is_required = false`;
 * descrição `N[.N…] — Título`; itens avaliáveis com descrição iniciando em `[n.m.k]`.
 * Documentação: `.claude/skills/nutrigestao-dev/SKILL.md` → secção «Checklists — Subseções só indicador».
 *
 * Usa a coluna `is_structure_only` quando `true`. Em bases legadas sem valor, aplica
 * fallback conservador: item opcional, descrição sem `[` e padrão numérico com travessão.
 */
export function isStructureOnlyItem(item: {
  is_structure_only?: boolean;
  is_required?: boolean;
  description?: string;
}): boolean {
  if (Boolean(item.is_structure_only)) return true;
  if (item.is_required !== false) return false;
  const d = (item.description ?? "").trim();
  if (!d || d.startsWith("[")) return false;
  return /^\d+(?:\.\d+)*\s*[—–-]\s*\S/.test(d);
}
