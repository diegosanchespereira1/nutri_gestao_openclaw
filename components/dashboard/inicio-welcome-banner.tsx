import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { getServerContext } from "@/lib/supabase/get-server-user";
import { countClientsForOwner } from "@/lib/supabase/profile";
import { cn } from "@/lib/utils";

type Props = {
  bemvindo: boolean;
  onboardingMinimal: boolean;
};

export async function InicioWelcomeBanner({
  bemvindo,
  onboardingMinimal,
}: Props) {
  if (!bemvindo) return null;

  const { supabase, workspaceOwnerId } = await getServerContext();
  const clientCount =
    workspaceOwnerId != null
      ? await countClientsForOwner(supabase, workspaceOwnerId)
      : 0;
  const hasClients = clientCount > 0;

  return (
    <div
      className="border-primary/40 bg-primary/5 rounded-xl border p-4"
      role="status"
    >
      {onboardingMinimal || !hasClients ? (
        <>
          <p className="text-foreground text-sm font-medium">Conta configurada</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {hasClients
              ? "Podes explorar a app à vontade."
              : "Ainda não há clientes na carteira — adiciona o primeiro quando for conveniente."}
          </p>
          {!hasClients ? (
            <Link
              href="/clientes/novo"
              className={cn(
                buttonVariants({ size: "sm" }),
                "mt-4 inline-flex w-full justify-center sm:w-auto",
              )}
            >
              Novo cliente
            </Link>
          ) : null}
        </>
      ) : (
        <>
          <p className="text-foreground text-sm font-medium">
            Está tudo pronto para agendar a primeira visita
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            O primeiro cliente já está na tua carteira. Usa o fluxo de visitas
            para marcar quando fores ao terreno.
          </p>
          <Link
            href="/visitas/nova"
            className={cn(
              buttonVariants({ size: "sm" }),
              "mt-4 inline-flex w-full justify-center sm:w-auto",
            )}
          >
            Agendar visita
          </Link>
        </>
      )}
    </div>
  );
}
