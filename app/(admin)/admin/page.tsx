import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export default function AdminHomePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Área de administração</h1>
      <p className="text-muted-foreground text-sm">
        Esta área só é acessível a contas com papel <strong className="text-foreground">admin</strong> ou{" "}
        <strong className="text-foreground">super_admin</strong> na tabela{" "}
        <code className="bg-muted rounded px-1 py-0.5 text-xs">profiles</code>. Utilizadores normais
        ficam com <code className="bg-muted rounded px-1 py-0.5 text-xs">user</code>.
      </p>
      <p className="text-muted-foreground text-sm">
        Promova um utilizador no Supabase (SQL Editor):{" "}
        <code className="bg-muted break-all rounded px-1 py-0.5 text-xs">
          update public.profiles set role = &apos;admin&apos; where user_id = &apos;…&apos;;
        </code>
      </p>
      <Link
        href="/inicio"
        className={cn(buttonVariants({ variant: "outline" }), "inline-flex")}
      >
        Voltar à aplicação
      </Link>
    </div>
  );
}
