/**
 * Sinaliza que a próxima saída da página é intencional (navegação programática).
 * Evita o diálogo nativo do browser ("Quer sair deste site?") do useNavigationGuard.
 */
let suspended = false;

export function suspendNavigationGuardOnce(): void {
  suspended = true;
}

export function isNavigationGuardSuspended(): boolean {
  return suspended;
}
