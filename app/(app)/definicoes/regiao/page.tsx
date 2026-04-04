import Link from "next/link";
import { redirect } from "next/navigation";

import { RegiaoFusoForm } from "@/components/definicoes/regiao-fuso-form";
import { buttonVariants } from "@/components/ui/button-variants";
import { createClient } from "@/lib/supabase/server";
import { fetchProfileTimeZone } from "@/lib/supabase/profile";
import { cn } from "@/lib/utils";

/** Leitura do perfil após guardar — evita segmento estático com dados desatualizados. */
export const dynamic = "force-dynamic";

export default async function DefinicoesRegiaoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const timeZone = await fetchProfileTimeZone(supabase, user.id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/definicoes"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-muted-foreground -ml-2 mb-2",
          )}
        >
          ← Definições
        </Link>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Região e fuso horário
        </h1>
        <p className="text-muted-foreground mt-1 max-w-xl text-sm">
          Escolha o fuso onde trabalha para que as visitas e o calendário coincidam com o seu dia
          civil local (incluindo «Iniciar visita» no dia certo).
        </p>
      </div>
      <RegiaoFusoForm defaultTimeZone={timeZone} />
    </div>
  );
}
