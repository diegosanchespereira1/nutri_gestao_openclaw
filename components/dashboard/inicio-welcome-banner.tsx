import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { getServerContext } from "@/lib/supabase/get-server-user";
import { countClientsForOwner } from "@/lib/supabase/profile";
import { cn } from "@/lib/utils";

type Props = {
  bemvindo: boolean;
  onboardingMinimal: boolean;
};

type WorkContext = "institutional" | "clinical" | "both";

function parseWorkContext(raw: string | null | undefined): WorkContext | null {
  if (raw === "institutional" || raw === "clinical" || raw === "both") {
    return raw;
  }
  return null;
}

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

  const { data: profile } = workspaceOwnerId
    ? await supabase
        .from("profiles")
        .select("work_context")
        .eq("user_id", workspaceOwnerId)
        .maybeSingle()
    : { data: null };

  const workContext = parseWorkContext(profile?.work_context);

  const { data: firstClient } =
    hasClients && workspaceOwnerId
      ? await supabase
          .from("clients")
          .select("legal_name, kind")
          .eq("owner_user_id", workspaceOwnerId)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle()
      : { data: null };

  const clientName = firstClient?.legal_name?.trim() || null;
  const isClinicalContext =
    workContext === "clinical" ||
    (workContext === null && firstClient?.kind === "pf");

  if (onboardingMinimal || !hasClients) {
    return (
      <div
        className="border-primary/40 bg-primary/5 rounded-xl border p-4"
        role="status"
      >
        <p className="text-foreground text-sm font-medium">
          Bem-vindo(a) ao NutriGestão!
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          Sua conta está configurada. Cadastre seu primeiro cliente quando
          estiver pronto(a) — não há pressa.
        </p>
        <Link
          href="/clientes/novo"
          className={cn(
            buttonVariants({ size: "sm" }),
            "mt-4 inline-flex w-full justify-center sm:w-auto",
          )}
        >
          Novo cliente
        </Link>
      </div>
    );
  }

  if (isClinicalContext) {
    return (
      <div
        className="border-primary/40 bg-primary/5 rounded-xl border p-4"
        role="status"
      >
        <p className="text-foreground text-sm font-medium">
          Bem-vindo(a) ao NutriGestão!
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          Sua conta está ativa.
          {clientName
            ? ` O cliente ${clientName} foi cadastrado`
            : " Seu primeiro cliente foi cadastrado"}
          — explore o painel clínico e registre consultas quando quiser.
        </p>
        <Link
          href="/clientes"
          className={cn(
            buttonVariants({ size: "sm" }),
            "mt-4 inline-flex w-full justify-center sm:w-auto",
          )}
        >
          Ver clientes
        </Link>
      </div>
    );
  }

  return (
    <div
      className="border-primary/40 bg-primary/5 rounded-xl border p-4"
      role="status"
    >
      <p className="text-foreground text-sm font-medium">
        Bem-vindo(a) ao NutriGestão!
      </p>
      <p className="text-muted-foreground mt-1 text-sm">
        Sua conta está ativa.
        {clientName
          ? ` O cliente ${clientName} já está na sua carteira`
          : " Seu primeiro cliente já está na carteira"}
        — agora você pode agendar visitas, preencher checklists e acompanhar
        tudo pelo painel.
      </p>
      <Link
        href="/visitas/nova"
        className={cn(
          buttonVariants({ size: "sm" }),
          "mt-4 inline-flex w-full justify-center sm:w-auto",
        )}
      >
        Agendar primeira visita
      </Link>
    </div>
  );
}
