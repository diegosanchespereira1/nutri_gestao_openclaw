/**
 * NutriGestão — alvos de toque (touch targets)
 *
 * Em `@media (pointer: coarse)` (toque / trackpad não preciso) ou em viewports `max-lg`
 * (telefone, tablet estreito, janelas estreitas), controlos interativos primários devem ter
 * pelo menos ~44×44 CSS px (Apple HIG / WCAG 2.5.5 orientação), implementados em Tailwind
 * como `min-h-11` e, quando o controlo é quadrado ou só ícone, `min-w-11`.
 *
 * O design system aplica estas classes em `components/ui/*`; componentes específicos não
 * devem forçar `h-6`/`h-7` em ações primárias sem rever esta regra.
 */

/** Altura mínima confortável para toque (ícones e botões com largura já ampla). */
export const touchMinHeight =
  "[@media(pointer:coarse)]:min-h-11 max-lg:min-h-11" as const;

/** Altura e largura mínimas (botões só ícone, checkboxes com área expandida). */
export const touchMinTarget =
  "[@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 max-lg:min-h-11 max-lg:min-w-11" as const;
