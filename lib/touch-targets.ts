/**
 * NutriGestão — alvos de toque (touch targets)
 *
 * Controlos interativos primários usam pelo menos ~44×44 CSS px (Apple HIG / WCAG 2.5.5),
 * implementados em Tailwind como `min-h-11` e, quando o controlo é quadrado ou só ícone,
 * `min-w-11`, em todas as larguras de ecrã.
 *
 * O design system aplica estas classes em `components/ui/*`; componentes específicos não
 * devem forçar `h-6`/`h-7` em ações primárias sem rever esta regra.
 */

/** Altura mínima confortável para toque (ícones e botões com largura já ampla). */
export const touchMinHeight = "min-h-11" as const;

/** Altura e largura mínimas (botões só ícone, checkboxes com área expandida). */
export const touchMinTarget = "min-h-11 min-w-11" as const;
