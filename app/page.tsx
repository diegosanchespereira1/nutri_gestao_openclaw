import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { ThemeShowcase } from "@/components/theme-showcase";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export default async function Home() {
  const missingEnv =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (missingEnv) {
    return (
      <main className="bg-background text-foreground flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">NutriGestão</h1>
          <p className="text-muted-foreground mt-3 text-sm">
            Configure{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
              NEXT_PUBLIC_SUPABASE_URL
            </code>{" "}
            e{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>{" "}
            em{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 text-xs">.env.local</code> (ver{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 text-xs">.env.example</code>).
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "default" }), "inline-flex")}
            >
              Entrar
            </Link>
            <Link
              href="/inicio"
              className={cn(buttonVariants({ variant: "secondary" }), "inline-flex")}
            >
              Área logada (já autenticado)
            </Link>
          </div>
          <p className="text-muted-foreground mt-4 text-sm">
            <Link
              href="/forgot-password"
              className="text-primary font-medium underline-offset-4 hover:underline focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
            >
              Recuperar palavra-passe
            </Link>
          </p>
        </div>
        <ThemeShowcase />
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="bg-background text-foreground flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="max-w-lg text-center">
        <h1 className="text-2xl font-semibold">NutriGestão</h1>
        <p className="text-muted-foreground mt-2">
          Sessão Supabase (cookie):{" "}
          <span className="text-foreground font-medium">
            {user ? `Autenticado (${user.email ?? user.id})` : "Visitante"}
          </span>
        </p>
        <p className="text-muted-foreground mt-3 text-sm">
          Cliente servidor usa apenas a chave <strong className="text-foreground">anon</strong>; a{" "}
          <strong className="text-foreground">service role</strong> não entra no bundle do browser.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "default" }), "inline-flex")}
          >
            Entrar
          </Link>
          <Link
            href="/inicio"
            className={cn(buttonVariants({ variant: "secondary" }), "inline-flex")}
          >
            Área logada (já autenticado)
          </Link>
        </div>
        <p className="text-muted-foreground mt-4 text-sm">
          <Link
            href="/forgot-password"
            className="text-primary font-medium underline-offset-4 hover:underline focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
          >
            Recuperar palavra-passe
          </Link>
        </p>
      </div>
      <ThemeShowcase />
    </main>
  );
}
